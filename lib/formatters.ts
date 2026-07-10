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

export function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}
