"use client";

import { Calendar, Users, Search, MapPin, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HeroBooking() {
    const router = useRouter();
    const [pax, setPax] = useState(1);
    const [date, setDate] = useState("");
    const [activity, setActivity] = useState("Fun Dive");

    const handleSearch = () => {
        // Build the query string if needed, currently just pushing to /services
        // router.push(`/services?activity=${activity}&date=${date}&pax=${pax}`);
        router.push("/services");
    };

    return (
        <section className="relative w-full min-h-[100vh] flex items-center justify-center pt-24 bg-neutral-900">
            {/* Background Image & Gradient Overlay */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <Image 
                    src="https://picsum.photos/seed/lembeh-ocean/1920/1080" 
                    alt="Lembeh Strait" 
                    fill 
                    className="object-cover opacity-80"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#023E8A]/60 via-[#000000]/30 to-[#F8F9FA] z-10" />
            </div>

            {/* Hero Main Content */}
            <div className="relative z-20 container mx-auto px-4 mt-[-10vh] pb-32 md:pb-48 text-center flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium mb-6 uppercase tracking-widest">
                    <MapPin className="w-4 h-4 text-accent" />
                    <span>Lembeh Strait, North Sulawesi</span>
                </div>
                
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-tight text-white drop-shadow-2xl font-serif">
                    Muck Diving <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-white font-sans font-bold">
                        Redefined
                    </span>
                </h1>
                
                <p className="mt-6 text-lg md:text-2xl text-gray-200 max-w-2xl font-light drop-shadow-md">
                    Experience the ultimate underwater macro photography journey in the critter capital of the world.
                </p>
            </div>

            {/* Floating Booking Bar (Overlaps next section) */}
            <div className="absolute bottom-0 left-0 right-0 z-30 px-4 translate-y-1/2">
                <div className="container mx-auto max-w-5xl">
                    <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-4 md:p-6 shadow-2xl border border-gray-100 flex flex-col lg:flex-row items-center gap-4 lg:gap-6 transform hover:scale-[1.01] transition-transform duration-500">
                        
                        {/* Tipe Aktivitas */}
                        <div className="flex-1 w-full flex flex-col items-start bg-white/60 rounded-2xl p-3 md:p-4 border border-white/50 hover:bg-white/80 transition-colors">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 w-full text-left">Tipe Aktivitas</label>
                            <div className="relative w-full text-deepSea font-semibold">
                                <select 
                                    className="w-full bg-transparent border-none outline-none appearance-none cursor-pointer"
                                    value={activity}
                                    onChange={(e) => setActivity(e.target.value)}
                                >
                                    <option value="Fun Dive">Fun Dive</option>
                                    <option value="Course">Course (PADI/SSI)</option>
                                    <option value="Snorkeling">Snorkeling</option>
                                </select>
                                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden lg:block w-px h-12 bg-gray-300" />

                        {/* Tanggal Dive */}
                        <div className="flex-1 w-full flex flex-col items-start bg-white/60 rounded-2xl p-3 md:p-4 border border-white/50 hover:bg-white/80 transition-colors cursor-pointer">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 w-full text-left">Tanggal Dive</label>
                            <div className="flex items-center gap-3 text-deepSea font-semibold w-full relative">
                                <Calendar className="w-5 h-5 text-primary absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input 
                                    type="date" 
                                    className="w-full bg-transparent border-none outline-none pl-8 text-deepSea cursor-pointer font-sans"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden lg:block w-px h-12 bg-gray-300" />

                        {/* Jumlah Penyelam */}
                        <div className="flex-1 w-full bg-white/60 rounded-2xl p-3 md:p-4 border border-white/50 flex flex-col justify-center">
                             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 text-left">Jumlah Penyelam</label>
                             <div className="flex items-center justify-between text-deepSea font-semibold">
                                <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-primary" />
                                    <span>{pax} Divers</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setPax(Math.max(1, pax - 1))} 
                                        className="w-7 h-7 rounded-md bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-100 transition-colors"
                                    >
                                        -
                                    </button>
                                    <button 
                                        onClick={() => setPax(pax + 1)} 
                                        className="w-7 h-7 rounded-md bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-100 transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                             </div>
                        </div>

                        {/* CTA Button */}
                        <button 
                            onClick={handleSearch}
                            className="w-full lg:w-auto bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2 h-full whitespace-nowrap lg:min-h-[56px]"
                        >
                            <Search className="w-5 h-5" />
                            Cari Layanan
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
