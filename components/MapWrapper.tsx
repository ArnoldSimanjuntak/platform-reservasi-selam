"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const MapLeaflet = dynamic(() => import("@/components/MapLeaflet"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-blue-50 rounded-2xl flex items-center justify-center">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-[#023E8A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Memuat peta...</p>
            </div>
        </div>
    ),
});

export default function MapWrapper() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        const element = containerRef.current;
        if (!element || shouldLoad) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                setShouldLoad(true);
                observer.disconnect();
            },
            { rootMargin: "320px" }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [shouldLoad]);

    return (
        <div ref={containerRef} className="h-full w-full">
            {shouldLoad ? (
                <MapLeaflet />
            ) : (
                <div className="flex h-full w-full items-center justify-center rounded-2xl bg-blue-50">
                    <div className="text-center">
                        <div className="skeleton mx-auto mb-4 h-10 w-10 rounded-full" />
                        <p className="text-sm font-semibold text-slate-500">Peta akan dimuat saat diperlukan</p>
                    </div>
                </div>
            )}
        </div>
    );
}
