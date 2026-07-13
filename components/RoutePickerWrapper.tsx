"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamic import — Leaflet requires `window`, so SSR must be disabled
const RouteDistancePicker = dynamic(
    () => import("@/components/RouteDistancePicker"),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-[500px] bg-blue-50 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-[#023E8A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Memuat perencana rute...</p>
                </div>
            </div>
        ),
    }
);

export default function RoutePickerWrapper() {
    return (
        <Suspense fallback={
            <div className="w-full h-[500px] bg-blue-50 rounded-2xl flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#023E8A] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <RouteDistancePicker />
        </Suspense>
    );
}
