import { buildMarineRoute } from "../lib/marine-route";

const samples = [
    {
        name: "Pangkalan Arnold ke Nudi Falls",
        start: [1.44381651, 125.20216895] as [number, number],
        end: [1.4606494, 125.2270824] as [number, number],
    },
    {
        name: "Pangkalan Arnold ke Batu Kapal",
        start: [1.44381651, 125.20216895] as [number, number],
        end: [1.5231969, 125.2770809] as [number, number],
    },
    {
        name: "Lintasan selatan ke sisi luar Lembeh",
        start: [1.39, 125.19] as [number, number],
        end: [1.5, 125.3] as [number, number],
    },
];

for (const sample of samples) {
    const route = buildMarineRoute(sample.start, sample.end);

    if (route.usesFallback) {
        throw new Error(`${sample.name}: jaringan tidak terhubung`);
    }
    if (route.corridorCoordinates.length < 2) {
        throw new Error(`${sample.name}: jumlah waypoint tidak cukup`);
    }
    if (route.distanceKm + 0.001 < route.directDistanceKm) {
        throw new Error(`${sample.name}: jarak rute lebih pendek dari garis lurus`);
    }
    if (!Number.isFinite(route.distanceKm) || route.distanceKm <= 0) {
        throw new Error(`${sample.name}: jarak rute tidak valid`);
    }

    console.log(
        `${sample.name}: ${route.distanceKm.toFixed(2)} km, ` +
            `${route.corridorCoordinates.length} waypoint`
    );
}
