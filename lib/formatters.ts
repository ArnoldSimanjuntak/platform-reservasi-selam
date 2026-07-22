export function formatRupiah(amount: number | string | null | undefined) {
    const value = Number(amount ?? 0);

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number.isFinite(value) ? value : 0);
}

export function formatNumberId(value: number | string | null | undefined) {
    const amount = Number(value ?? 0);
    return new Intl.NumberFormat("id-ID").format(Number.isFinite(amount) ? amount : 0);
}

export function formatDateId(value: string | Date | null | undefined) {
    if (!value) return "-";

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
}

export function formatDateTimeId(value: string | Date | null | undefined) {
    if (!value) return "-";

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Makassar",
        timeZoneName: "short",
    }).format(date);
}

export function formatTimeId(value: string | Date | null | undefined) {
    if (!value) return "-";

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Makassar",
    }).format(date);
}

export function normalizeWhatsAppNumber(value: string | null | undefined) {
    const digits = String(value ?? "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("0")) return `62${digits.slice(1)}`;
    if (digits.startsWith("62")) return digits;
    if (digits.startsWith("8")) return `62${digits}`;
    return digits;
}

export function buildWhatsAppUrl(
    contact: string | null | undefined,
    message?: string
) {
    const number = normalizeWhatsAppNumber(contact);
    if (number.length < 10 || number.length > 15) return null;

    const query = message ? `?text=${encodeURIComponent(message)}` : "";
    return `https://wa.me/${number}${query}`;
}

export function getLocalDateString(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Makassar",
    }).format(date);
}
