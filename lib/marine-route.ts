import { haversineDistanceKm } from "./geo";

export type MarineCoordinate = [latitude: number, longitude: number];

interface MarineNode {
    id: string;
    coordinate: MarineCoordinate;
}

interface QueueItem {
    id: string;
    distance: number;
}

export interface MarineRouteResult {
    allCoordinates: MarineCoordinate[];
    corridorCoordinates: MarineCoordinate[];
    startAccessCoordinates: MarineCoordinate[];
    endAccessCoordinates: MarineCoordinate[];
    distanceKm: number;
    directDistanceKm: number;
    startAccessDistanceKm: number;
    endAccessDistanceKm: number;
    usesFallback: boolean;
}

/**
 * Jaringan waypoint lokal untuk estimasi perjalanan kapal di perairan Lembeh.
 * Titik-titik ini membentuk koridor Selat Lembeh, akses pelabuhan, lintasan
 * selatan, dan sisi luar Pulau Lembeh. Ini bukan jalur navigasi resmi.
 */
const MARINE_NODES: MarineNode[] = [
    // Koridor utama Selat Lembeh (selatan ke utara)
    { id: "st-00", coordinate: [1.43, 125.207] },
    { id: "st-01", coordinate: [1.438, 125.209] },
    { id: "st-02", coordinate: [1.445, 125.216] },
    { id: "st-03", coordinate: [1.452, 125.224] },
    { id: "st-04", coordinate: [1.46, 125.229] },
    { id: "st-05", coordinate: [1.47, 125.234] },
    { id: "st-06", coordinate: [1.48, 125.239] },
    { id: "st-07", coordinate: [1.49, 125.243] },
    { id: "st-08", coordinate: [1.5, 125.247] },
    { id: "st-09", coordinate: [1.51, 125.253] },
    { id: "st-10", coordinate: [1.52, 125.261] },
    { id: "st-11", coordinate: [1.53, 125.27] },
    { id: "st-12", coordinate: [1.54, 125.28] },
    { id: "st-13", coordinate: [1.552, 125.282] },
    { id: "st-14", coordinate: [1.562, 125.292] },

    // Cabang pangkalan provider di Bitung
    { id: "hb-00", coordinate: [1.436, 125.188] },
    { id: "hb-01", coordinate: [1.435, 125.198] },
    { id: "hb-02", coordinate: [1.437, 125.205] },

    // Cabang barat dan lintasan selatan Pulau Lembeh
    { id: "ws-00", coordinate: [1.435, 125.168] },
    { id: "ws-01", coordinate: [1.425, 125.175] },
    { id: "so-00", coordinate: [1.425, 125.198] },
    { id: "so-01", coordinate: [1.418, 125.188] },
    { id: "so-02", coordinate: [1.405, 125.184] },
    { id: "so-03", coordinate: [1.39, 125.192] },
    { id: "so-04", coordinate: [1.38, 125.21] },
    { id: "so-05", coordinate: [1.38, 125.235] },
    { id: "so-06", coordinate: [1.388, 125.258] },
    { id: "so-07", coordinate: [1.402, 125.274] },

    // Koridor sisi luar Pulau Lembeh
    { id: "ea-00", coordinate: [1.42, 125.282] },
    { id: "ea-01", coordinate: [1.44, 125.286] },
    { id: "ea-02", coordinate: [1.46, 125.29] },
    { id: "ea-03", coordinate: [1.48, 125.294] },
    { id: "ea-04", coordinate: [1.5, 125.3] },
    { id: "ea-05", coordinate: [1.52, 125.307] },
    { id: "ea-06", coordinate: [1.54, 125.312] },
    { id: "ea-07", coordinate: [1.555, 125.307] },
    { id: "ea-08", coordinate: [1.562, 125.292] },
];

const SEQUENTIAL_GROUPS = [
    Array.from({ length: 15 }, (_, index) => `st-${String(index).padStart(2, "0")}`),
    Array.from({ length: 3 }, (_, index) => `hb-${String(index).padStart(2, "0")}`),
    ["ws-00", "ws-01"],
    Array.from({ length: 8 }, (_, index) => `so-${String(index).padStart(2, "0")}`),
    Array.from({ length: 9 }, (_, index) => `ea-${String(index).padStart(2, "0")}`),
] as const;

const CONNECTIONS: Array<[string, string]> = [
    ["hb-02", "st-01"],
    ["hb-00", "so-01"],
    ["ws-01", "so-01"],
    ["so-00", "st-00"],
    ["so-00", "so-01"],
    ["so-07", "ea-00"],
    ["ea-08", "st-14"],
];

const NODE_BY_ID = new Map(MARINE_NODES.map((node) => [node.id, node]));

function coordinateDistanceKm(a: MarineCoordinate, b: MarineCoordinate) {
    return haversineDistanceKm(a[0], a[1], b[0], b[1]);
}

function buildEdges() {
    const edges: Array<[string, string]> = [...CONNECTIONS];

    for (const group of SEQUENTIAL_GROUPS) {
        for (let index = 0; index < group.length - 1; index += 1) {
            edges.push([group[index], group[index + 1]]);
        }
    }

    return edges;
}

const GRAPH = new Map<string, Array<{ id: string; distance: number }>>();

for (const node of MARINE_NODES) {
    GRAPH.set(node.id, []);
}

for (const [fromId, toId] of buildEdges()) {
    const from = NODE_BY_ID.get(fromId);
    const to = NODE_BY_ID.get(toId);
    if (!from || !to) continue;

    const distance = coordinateDistanceKm(from.coordinate, to.coordinate);
    GRAPH.get(fromId)?.push({ id: toId, distance });
    GRAPH.get(toId)?.push({ id: fromId, distance });
}

function nearestNode(coordinate: MarineCoordinate) {
    let nearest = MARINE_NODES[0];
    let distance = coordinateDistanceKm(coordinate, nearest.coordinate);

    for (const node of MARINE_NODES.slice(1)) {
        const candidateDistance = coordinateDistanceKm(coordinate, node.coordinate);
        if (candidateDistance < distance) {
            nearest = node;
            distance = candidateDistance;
        }
    }

    return { node: nearest, distance };
}

function shortestPath(startId: string, endId: string) {
    const distances = new Map(MARINE_NODES.map((node) => [node.id, Number.POSITIVE_INFINITY]));
    const previous = new Map<string, string>();
    const queue: QueueItem[] = [{ id: startId, distance: 0 }];
    distances.set(startId, 0);

    while (queue.length > 0) {
        queue.sort((a, b) => a.distance - b.distance);
        const current = queue.shift();
        if (!current || current.distance !== distances.get(current.id)) continue;
        if (current.id === endId) break;

        for (const neighbor of GRAPH.get(current.id) ?? []) {
            const nextDistance = current.distance + neighbor.distance;
            if (nextDistance < (distances.get(neighbor.id) ?? Number.POSITIVE_INFINITY)) {
                distances.set(neighbor.id, nextDistance);
                previous.set(neighbor.id, current.id);
                queue.push({ id: neighbor.id, distance: nextDistance });
            }
        }
    }

    if (!Number.isFinite(distances.get(endId))) return null;

    const ids = [endId];
    while (ids[0] !== startId) {
        const parent = previous.get(ids[0]);
        if (!parent) return null;
        ids.unshift(parent);
    }

    return {
        ids,
        distanceKm: distances.get(endId) ?? 0,
    };
}

function removeConsecutiveDuplicates(coordinates: MarineCoordinate[]) {
    return coordinates.filter((coordinate, index) => {
        if (index === 0) return true;
        const previous = coordinates[index - 1];
        return coordinate[0] !== previous[0] || coordinate[1] !== previous[1];
    });
}

export function distanceToMarineNetwork(latitude: number, longitude: number) {
    return nearestNode([latitude, longitude]).distance;
}

export function buildMarineRoute(
    start: MarineCoordinate,
    end: MarineCoordinate
): MarineRouteResult {
    const directDistanceKm = coordinateDistanceKm(start, end);
    const startNearest = nearestNode(start);
    const endNearest = nearestNode(end);
    const graphPath = shortestPath(startNearest.node.id, endNearest.node.id);

    if (!graphPath) {
        return {
            allCoordinates: [start, end],
            corridorCoordinates: [start, end],
            startAccessCoordinates: [],
            endAccessCoordinates: [],
            distanceKm: directDistanceKm,
            directDistanceKm,
            startAccessDistanceKm: 0,
            endAccessDistanceKm: 0,
            usesFallback: true,
        };
    }

    const corridorCoordinates = graphPath.ids
        .map((id) => NODE_BY_ID.get(id)?.coordinate)
        .filter((coordinate): coordinate is MarineCoordinate => Boolean(coordinate));
    const startAccessCoordinates = removeConsecutiveDuplicates([
        start,
        startNearest.node.coordinate,
    ]);
    const endAccessCoordinates = removeConsecutiveDuplicates([
        endNearest.node.coordinate,
        end,
    ]);

    return {
        allCoordinates: removeConsecutiveDuplicates([
            start,
            ...corridorCoordinates,
            end,
        ]),
        corridorCoordinates,
        startAccessCoordinates,
        endAccessCoordinates,
        distanceKm: startNearest.distance + graphPath.distanceKm + endNearest.distance,
        directDistanceKm,
        startAccessDistanceKm: startNearest.distance,
        endAccessDistanceKm: endNearest.distance,
        usesFallback: false,
    };
}
