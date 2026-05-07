"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";
import { deleteService } from "@/app/actions/service";

function SubmitButton({ compact = false }: { compact?: boolean }) {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className={
                compact
                    ? "p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                    : "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
            }
            title="Hapus layanan"
        >
            {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Trash2 className="w-4 h-4" />
            )}
            {!compact && <span>{pending ? "Menghapus..." : "Hapus"}</span>}
        </button>
    );
}

export default function DeleteServiceButton({
    serviceId,
    serviceName,
    redirectTo,
    compact = false,
}: {
    serviceId: string;
    serviceName: string;
    redirectTo: string;
    compact?: boolean;
}) {
    return (
        <form
            action={deleteService}
            onSubmit={(event) => {
                const confirmed = window.confirm(`Hapus layanan "${serviceName}"?`);
                if (!confirmed) event.preventDefault();
            }}
        >
            <input type="hidden" name="service_id" value={serviceId} />
            <input type="hidden" name="redirect_to" value={redirectTo} />
            <SubmitButton compact={compact} />
        </form>
    );
}
