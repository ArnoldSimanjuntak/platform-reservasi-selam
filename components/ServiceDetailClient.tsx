"use client";

import Image from "next/image";
import {
    MapPin,
    Star,
    CheckCircle2,
    XCircle,
    Camera,
    Anchor,
    Wifi,
    Utensils,
    Ship,
    Clock,
    Info,
} from "lucide-react";
import type { Service, DiveSite } from "@/lib/supabase";
import BookingForm from "@/components/BookingForm";
import AddToTripButton from "@/components/AddToTripButton";

interface ServiceDetailClientProps {
    service: Service;
    initialIsLoggedIn: boolean;
    userId: string | null;
    diveSites?: DiveSite[];
}

export default function ServiceDetailClient({ service, initialIsLoggedIn, userId, diveSites = [] }: ServiceDetailClientProps) {
    // Dummy features data based on service type
    const features = [
        { icon: Camera, label: "Camera Room", description: "Dedicated room for rinsing & camera setup" },
        { icon: Anchor, label: "Dive Guide", description: "1:4 guide to diver ratio" },
        { icon: Wifi, label: "Free Wi-Fi", description: "Satellite connection on the boat" },
        { icon: Utensils, label: "Lunch", description: "Manadonese buffet lunch" },
        { icon: Ship, label: "Speedboat", description: "Twin engine 200PK" },
        { icon: Clock, label: "Duration", description: "8 Hours (08:00 - 16:00)" },
    ];

    const includes = [
        "Hotel pickup from Bitung area",
        "3x Dives (Tank & Weight)",
        "Lunch & snacks",
        "Clean towels",
        "First Aid & Emergency Oxygen",
    ];

    const excludes = [
        "Gear rental (BCD, Regulator, Wetsuit)",
        "Marine park entry fee",
        "Tips for crew & guide",
        "Photo/video documentation",
    ];

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* 1. Hero Header */}
            <div className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
                <Image
                    src={service.image_url || "https://picsum.photos/seed/lembeh/1920/1080"}
                    alt={service.name}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#023E8A] via-[#03045E]/60 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 pb-12 z-10">
                    <div className="max-w-4xl animate-fade-in-up">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className="bg-accent/20 backdrop-blur-md border border-accent/30 text-accent px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wider">
                                {service.type}
                            </span>
                            <span className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                Bitung, North Sulawesi
                            </span>
                            {service.dive_site_category && (
                                <span className="bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 text-yellow-200 px-3 py-1 rounded-full text-sm font-medium">
                                    {service.dive_site_category} Specialist
                                </span>
                            )}
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg leading-tight">
                            {service.name}
                        </h1>

                        <div className="flex items-center gap-2 text-yellow-400">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} className="w-5 h-5 fill-current" />
                            ))}
                            <span className="text-white ml-2 text-sm font-medium">(24 Reviews)</span>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 -mt-8 relative z-20">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* 2. Left Column (Content) */}
                    <div className="w-full lg:w-[65%] space-y-8">

                        {/* About Section */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold text-deepSea mb-4">About This Service</h2>
                            <p className="text-gray-600 leading-relaxed text-lg">
                                {service.description || "Enjoy the best diving experience in Lembeh Strait with us. This service is specially designed for macro photographers and muck diving enthusiasts looking for comfort and personalized service."}
                            </p>
                            <p className="text-gray-600 leading-relaxed text-lg mt-4">
                                Guided by certified dive masters who know every inch of Lembeh's black sand, you will easily find rare &quot;Critters&quot; like the Blue Ring Octopus, Flamboyant Cuttlefish, and Hairy Frogfish.
                            </p>
                        </div>

                        {/* Facilities */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold text-deepSea mb-6">Facilities & Key Features</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {features.map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors border border-gray-100">
                                        <div className="bg-white p-2.5 rounded-lg shadow-sm text-primary">
                                            <feature.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-deepSea">{feature.label}</h3>
                                            <p className="text-sm text-gray-500">{feature.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Includes / Excludes */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold text-deepSea mb-6">Package Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-semibold text-green-700 mb-4 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        What's Included
                                    </h3>
                                    <ul className="space-y-3">
                                        {includes.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-gray-600">
                                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                                                <span className="text-sm">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
                                        <XCircle className="w-5 h-5" />
                                        What's Excluded
                                    </h3>
                                    <ul className="space-y-3">
                                        {excludes.map((item, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-gray-600">
                                                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />
                                                <span className="text-sm">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* 3. Right Column (Sticky Booking Card) */}
                    <div className="w-full lg:w-[35%] relative">
                        <div className="sticky top-24 space-y-6">
                            <div className="bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-blue-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-primary to-deepSea p-6 text-white text-center">
                                    <p className="text-sm font-medium opacity-90 mb-1">Starting From</p>
                                    <h3 className="text-3xl font-bold">{formatPrice(service.price)}</h3>
                                    <p className="text-xs opacity-75">per pax / day</p>
                                </div>

                                <div className="p-6">
                                    <BookingForm
                                        serviceId={service.id}
                                        serviceName={service.name}
                                        price={service.price}
                                        maxCapacity={service.max_capacity}
                                        initialIsLoggedIn={initialIsLoggedIn}
                                        isBoat={service.type === "boat"}
                                        diveSites={diveSites}
                                    />

                                    <AddToTripButton
                                        serviceId={service.id}
                                        serviceName={service.name}
                                        price={service.price}
                                        imageUrl={service.image_url || ""}
                                        diveSiteCategory={service.dive_site_category}
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3 border border-blue-100">
                                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    <strong>Best Price Guarantee:</strong> If you find a lower price for the same package, we will match it.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

