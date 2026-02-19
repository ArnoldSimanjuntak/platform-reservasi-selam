"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Anchor } from "lucide-react";

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { name: "Beranda", href: "/" },
        { name: "Paket Selam", href: "#services" },
        { name: "Lokasi", href: "#locations" },
        { name: "Tentang Kami", href: "#about" },
    ];

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled || isMobileMenuOpen
                    ? "bg-white/80 backdrop-blur-md shadow-sm py-4"
                    : "bg-transparent py-6"
                }`}
        >
            <div className="container mx-auto px-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="bg-gradient-to-br from-primary to-secondary p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                        <Anchor className="w-6 h-6" />
                    </div>
                    <span className={`text-xl font-bold tracking-tight ${isScrolled || isMobileMenuOpen ? "text-deepSea" : "text-white"
                        }`}>
                        Sulut<span className="text-secondary">Dive</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`text-sm font-medium hover:text-secondary transition-colors ${isScrolled ? "text-gray-600" : "text-gray-200"
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <button className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${isScrolled
                            ? "bg-primary text-white hover:bg-secondary"
                            : "bg-white text-primary hover:bg-gray-100"
                        }`}>
                        Masuk
                    </button>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden p-2 text-gray-600"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? (
                        <X className={isScrolled ? "text-deepSea" : "text-white"} />
                    ) : (
                        <Menu className={isScrolled ? "text-deepSea" : "text-white"} />
                    )}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-lg p-4 flex flex-col gap-4 animate-in slide-in-from-top-5">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-gray-600 hover:text-primary font-medium py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <button className="w-full bg-primary text-white py-3 rounded-xl font-semibold">
                        Masuk / Daftar
                    </button>
                </div>
            )}
        </nav>
    );
}
