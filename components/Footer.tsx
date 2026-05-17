import Link from "next/link";
import { Anchor, Mail, Phone, MapPin, Facebook, Instagram, Twitter } from "lucide-react";
import type { NavbarInitialAuthState } from "@/components/Navbar";

interface FooterProps {
    initialAuthState?: NavbarInitialAuthState;
}

export default function Footer({ initialAuthState }: FooterProps) {
    const role = initialAuthState?.role;

    if (role === "admin" || role === "provider") {
        return null;
    }

    return (
        <footer className="bg-deepSea text-white pt-16 pb-8">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {/* Brand Column */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2 group w-fit">
                            <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                                <Anchor className="w-6 h-6" />
                            </div>
                            <span className="text-2xl font-bold tracking-tight text-white">
                                Sulut<span className="text-cyan-400">Dive</span>
                            </span>
                        </Link>
                        <p className="text-blue-100/80 leading-relaxed text-sm">
                            Platform reservasi eksklusif untuk penyelam makro di Selat Lembeh.
                            Temukan guide terbaik, spot rahasia, dan akomodasi nyaman di Bitung.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 text-cyan-400">Navigasi</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/" className="text-blue-100/80 hover:text-white transition-colors text-sm">Beranda</Link>
                            </li>
                            <li>
                                <Link href="/#services" className="text-blue-100/80 hover:text-white transition-colors text-sm">Paket Selam</Link>
                            </li>
                            <li>
                                <Link href="/#locations" className="text-blue-100/80 hover:text-white transition-colors text-sm">Lokasi & Spot</Link>
                            </li>
                            <li>
                                <Link href="/about" className="text-blue-100/80 hover:text-white transition-colors text-sm">Tentang Kami</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 text-cyan-400">Hubungi Kami</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-blue-100/80 text-sm">
                                <MapPin className="w-5 h-5 shrink-0 text-cyan-400" />
                                <span>Jl. Yos Sudarso No. 12, Bitung, Sulawesi Utara, Indonesia</span>
                            </li>
                            <li className="flex items-center gap-3 text-blue-100/80 text-sm">
                                <Mail className="w-5 h-5 shrink-0 text-cyan-400" />
                                <span>hello@sulutdive.com</span>
                            </li>
                            <li className="flex items-center gap-3 text-blue-100/80 text-sm">
                                <Phone className="w-5 h-5 shrink-0 text-cyan-400" />
                                <span>+62 812 3456 7890</span>
                            </li>
                        </ul>
                    </div>

                    {/* Newsletter / Social */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 text-cyan-400">Ikuti Kami</h3>
                        <div className="flex gap-4 mb-6">
                            <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-cyan-500 hover:text-deepSea transition-all">
                                <Instagram className="w-5 h-5" />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-cyan-500 hover:text-deepSea transition-all">
                                <Facebook className="w-5 h-5" />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-cyan-500 hover:text-deepSea transition-all">
                                <Twitter className="w-5 h-5" />
                            </a>
                        </div>
                        <p className="text-xs text-blue-200/60">
                            Dapatkan info spot terbaru langsung di inbox Anda.
                        </p>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-blue-200/50">
                    <p>&copy; {new Date().getFullYear()} SulutDive Lembeh. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
