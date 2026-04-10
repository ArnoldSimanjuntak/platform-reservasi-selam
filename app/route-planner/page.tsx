import RoutePickerWrapper from "@/components/RoutePickerWrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Route Planner - SulutDive Lembeh",
    description:
        "Plan your dive trip route from port or resort to dive spots in Lembeh Strait. See estimated distance and travel time.",
};

export default function RoutePlannerPage() {
    return (
        <main className="min-h-screen pt-24 pb-12 bg-gray-50">
            <div className="container mx-auto px-4 max-w-5xl">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-deepSea mb-3">
                        Route & Distance Planner
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Select your departure point and dive destination to visualize the
                        route and estimate travel distance across Lembeh Strait.
                    </p>
                </div>

                {/* Route Picker */}
                <RoutePickerWrapper />

                {/* Zone Legend */}
                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-center">
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                        <span className="font-bold text-green-600 block mb-1">
                            Zone 1 (Nearby)
                        </span>
                        <span className="text-gray-500">0–3 km · No surcharge</span>
                    </div>
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                        <span className="font-bold text-amber-600 block mb-1">
                            Zone 2 (Medium)
                        </span>
                        <span className="text-gray-500">3–7 km · + Rp 150,000/trip</span>
                    </div>
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                        <span className="font-bold text-red-600 block mb-1">
                            Zone 3 (Far)
                        </span>
                        <span className="text-gray-500">7+ km · + Rp 300,000/trip</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
