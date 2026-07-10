export const DISTANCE_TIER_LIMITS_KM = {
    near: 5,
    medium: 10,
} as const;

export type DistanceTier = "near" | "medium" | "far";

export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const earthRadiusKm = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getDistanceTier(distanceKm: number): DistanceTier {
    if (distanceKm <= DISTANCE_TIER_LIMITS_KM.near) return "near";
    if (distanceKm <= DISTANCE_TIER_LIMITS_KM.medium) return "medium";
    return "far";
}

export function getDistanceTierLabel(tier: DistanceTier) {
    if (tier === "near") return "Dekat";
    if (tier === "medium") return "Sedang";
    return "Jauh";
}

export function getDistanceTierDescription() {
    return `Patokan: dekat <= ${DISTANCE_TIER_LIMITS_KM.near} km, sedang ${DISTANCE_TIER_LIMITS_KM.near}-${DISTANCE_TIER_LIMITS_KM.medium} km, jauh > ${DISTANCE_TIER_LIMITS_KM.medium} km.`;
}
