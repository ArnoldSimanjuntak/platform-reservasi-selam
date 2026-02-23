"use client";

import { RefreshCcw } from "lucide-react";

export default function ReloadButton() {
    return (
        <button
            onClick={() => window.location.reload()}
            className="w-full btn-primary flex items-center justify-center gap-2 text-white font-medium py-3 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
        >
            <RefreshCcw className="w-4 h-4" />
            Coba Lagi
        </button>
    );
}
