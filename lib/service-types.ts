export const SERVICE_TYPES = ["boat", "instructor", "gear"] as const;

export type ServiceTypeValue = (typeof SERVICE_TYPES)[number];

export const serviceTypeLabels: Record<ServiceTypeValue, string> = {
    boat: "Kapal",
    instructor: "Guide / Instruktur Selam",
    gear: "Penyewaan Alat Selam",
};

export const serviceTypeDescriptions: Record<ServiceTypeValue, string> = {
    boat: "Layanan kapal untuk perjalanan ke spot selam.",
    instructor: "Layanan pendamping atau instruktur selam.",
    gear: "Layanan penyewaan alat selam berdasarkan stok unit.",
};

export const serviceTypeShortLabels: Record<ServiceTypeValue, string> = {
    boat: "Kapal",
    instructor: "Guide",
    gear: "Alat Selam",
};

export function isServiceType(value: unknown): value is ServiceTypeValue {
    return typeof value === "string" && SERVICE_TYPES.includes(value as ServiceTypeValue);
}

export function getServiceTypeLabel(value?: string | null) {
    return isServiceType(value) ? serviceTypeLabels[value] : "Layanan";
}

export function getServiceTypeDescription(value?: string | null) {
    return isServiceType(value) ? serviceTypeDescriptions[value] : "Layanan wisata selam.";
}

export function getServiceTypeShortLabel(value?: string | null) {
    return isServiceType(value) ? serviceTypeShortLabels[value] : "Layanan";
}
