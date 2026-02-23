import Image from "next/image";
import { Search, Aperture, Anchor, Fish, ArrowRight } from "lucide-react";

export default function HeroSection() {
    return (
        <section className="relative w-full h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden pt-32 md:pt-0">
            {/* Background Image - Lembeh Style (Darker, Muck) */}
            <div className="absolute inset-0 z-0 bg-neutral-900">
                <div className="absolute inset-0 bg-gradient-to-b from-[#023E8A]/50 via-[#03045E]/40 to-[#F8F9FA] z-10" />
                {/* Placeholder for Lembeh Critter/Muck image */}
                <div className="w-full h-full relative opacity-60">
                    <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/lembeh/1920/1080')] bg-cover bg-center" />
                </div>
            </div>

            {/* Content */}
            <div className="relative z-20 container mx-auto px-4 text-center">
                <div className="animate-fade-in-up space-y-6 max-w-5xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-white text-sm font-medium mb-4">
                        <Fish className="w-4 h-4 text-accent" />
                        <span>The World Capital of Muck Diving</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight text-white drop-shadow-2xl">
                        Jelajahi Keajaiban Makro <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-secondary">
                            Selat Lembeh
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-100 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
                        Temukan spesies unik yang tidak ada di tempat lain.
                        Reservasi dive trip, guide spesialis makro, dan akomodasi dalam satu aplikasi.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
                        <button className="group btn-primary px-8 py-4 text-lg rounded-full flex items-center gap-2 bg-gradient-to-r from-primary to-secondary hover:shadow-[0_0_40px_-5px_rgba(2,62,138,0.6)] border border-primary/20">
                            Cari Spot Diving
                            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </button>
                        <button className="px-8 py-4 text-lg rounded-full bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20 transition-all text-white flex items-center gap-2 group">
                            <Aperture className="w-5 h-5 text-accent group-hover:rotate-45 transition-transform" />
                            Galeri Makro
                        </button>
                    </div>

                    {/* Stats / Features specific to Lembeh */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20">
                        {[
                            { label: "Dive Sites", value: "30+", icon: Anchor },
                            { label: "Critter Species", value: "1000+", icon: Fish },
                            { label: "Macro Guides", value: "Top Tier", icon: Search },
                            { label: "Water Temp", value: "26-29°C", icon: ArrowRight }, // ArrowRight just as placeholder if thermom is missing
                        ].map((stat, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-deepSea/40 backdrop-blur-sm border border-white/10 hover:bg-deepSea/60 transition-colors">
                                <stat.icon className="w-6 h-6 text-accent mx-auto mb-2" />
                                <div className="text-2xl font-bold text-white">{stat.value}</div>
                                <div className="text-sm text-gray-300">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
