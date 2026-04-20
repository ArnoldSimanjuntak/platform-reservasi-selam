import { Anchor, Shield, Users, BarChart3, Waves, MapPin, Ship, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tentang SulutDive — Platform Reservasi Selam Lembeh",
    description:
        "SulutDive adalah marketplace & aggregator reservasi selam di Selat Lembeh, Bitung, Sulawesi Utara. Menghubungkan wisatawan dengan penyedia jasa selam lokal sambil menjaga kelestarian laut melalui fitur Carrying Capacity.",
};

const features = [
    {
        icon: MapPin,
        title: "65+ Dive Sites",
        description: "Peta interaktif seluruh titik selam di Selat Lembeh, lengkap dengan kedalaman, zona, dan habitat.",
        color: "text-blue-600",
        bg: "bg-blue-50",
    },
    {
        icon: Ship,
        title: "Multi-Provider Marketplace",
        description: "Beragam penyedia jasa — dari kapal nelayan lokal hingga resort selam premium — dalam satu platform.",
        color: "text-emerald-600",
        bg: "bg-emerald-50",
    },
    {
        icon: Shield,
        title: "Carrying Capacity",
        description: "Sistem daya tampung otomatis yang membatasi jumlah penyelam per hari untuk menjaga kelestarian terumbu.",
        color: "text-amber-600",
        bg: "bg-amber-50",
    },
    {
        icon: BarChart3,
        title: "Real-time Dashboard",
        description: "Provider mendapatkan dashboard bisnis lengkap dengan pesanan real-time, statistik, dan manajemen armada.",
        color: "text-blue-600",
        bg: "bg-blue-50",
    },
];

export default function AboutPage() {
    return (
        <div className="min-h-screen">
            {/* ═══ Hero Section ═══ */}
            <section
                className="relative pt-32 pb-20 px-4 overflow-hidden"
                style={{ background: "linear-gradient(135deg, #03045E 0%, #023E8A 40%, #0077B6 100%)" }}
            >
                {/* Decorative circles */}
                <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl" />

                <div className="container mx-auto max-w-4xl relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm font-medium mb-6">
                        <Waves className="w-4 h-4" />
                        Platform Reservasi Selam #1 di Sulawesi Utara
                    </div>

                    <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-6">
                        Menyelam Lebih Mudah,{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-200">
                            Laut Tetap Lestari
                        </span>
                    </h1>

                    <p className="text-lg text-blue-100/90 max-w-2xl mx-auto leading-relaxed mb-8">
                        SulutDive adalah <strong className="text-white">marketplace & aggregator reservasi selam</strong> di Selat Lembeh,
                        Bitung. Kami menghubungkan wisatawan dengan penyedia jasa selam lokal sambil menjaga keseimbangan ekosistem laut
                        melalui teknologi <strong className="text-white">Carrying Capacity</strong>.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/services"
                            className="px-8 py-3.5 rounded-xl text-base font-bold text-deepSea bg-white hover:bg-gray-100 transition-all shadow-lg"
                        >
                            Jelajahi Paket Selam
                        </Link>
                        <Link
                            href="/lokasi"
                            className="px-8 py-3.5 rounded-xl text-base font-bold text-white border-2 border-white/30 hover:bg-white/10 transition-all"
                        >
                            Lihat Peta Dive Sites
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══ Mission Section ═══ */}
            <section className="py-20 px-4 bg-white">
                <div className="container mx-auto max-w-4xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div>
                            <span className="text-sm font-bold text-primary uppercase tracking-wider">Misi Kami</span>
                            <h2 className="text-3xl font-extrabold text-slate-900 mt-2 mb-4 leading-tight">
                                Memberdayakan Penyedia Jasa Lokal di Bitung
                            </h2>
                            <p className="text-slate-600 leading-relaxed mb-4">
                                Selat Lembeh adalah surga muck diving kelas dunia. Namun, banyak pemilik kapal dan pemandu lokal kesulitan
                                menjangkau wisatawan internasional. SulutDive hadir sebagai jembatan digital yang mempermudah akses bagi
                                kedua pihak.
                            </p>
                            <p className="text-slate-600 leading-relaxed">
                                Bagi <strong className="text-slate-900">wisatawan</strong>, kami menyediakan cara termudah untuk menemukan,
                                membandingkan, dan memesan layanan selam. Bagi <strong className="text-slate-900">penyedia jasa</strong>, kami
                                memberikan platform manajemen bisnis lengkap — dari penerimaan pesanan hingga pelacakan armada.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 rounded-2xl p-6 text-center">
                                <p className="text-3xl font-extrabold text-primary mb-1">65+</p>
                                <p className="text-sm text-slate-600 font-medium">Titik Selam</p>
                            </div>
                            <div className="bg-emerald-50 rounded-2xl p-6 text-center">
                                <p className="text-3xl font-extrabold text-emerald-600 mb-1">3</p>
                                <p className="text-sm text-slate-600 font-medium">Zona Selam</p>
                            </div>
                            <div className="bg-amber-50 rounded-2xl p-6 text-center">
                                <p className="text-3xl font-extrabold text-amber-600 mb-1">PWA</p>
                                <p className="text-sm text-slate-600 font-medium">Mobile-First</p>
                            </div>
                            <div className="bg-blue-50 rounded-2xl p-6 text-center">
                                <p className="text-3xl font-extrabold text-blue-600 mb-1">24/7</p>
                                <p className="text-sm font-bold text-slate-700">Dukungan</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ Features Section ═══ */}
            <section className="py-20 px-4" style={{ background: "linear-gradient(180deg, #f0f7ff 0%, #f9fafb 100%)" }}>
                <div className="container mx-auto max-w-4xl">
                    <div className="text-center mb-12">
                        <span className="text-sm font-bold text-primary uppercase tracking-wider">Fitur Unggulan</span>
                        <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
                            Teknologi untuk Laut yang Lebih Baik
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {features.map((f) => {
                            const Icon = f.icon;
                            return (
                                <div
                                    key={f.title}
                                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                                >
                                    <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                                        <Icon className={`w-6 h-6 ${f.color}`} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">{f.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══ Carrying Capacity Deep Dive ═══ */}
            <section className="py-20 px-4 bg-white">
                <div className="container mx-auto max-w-3xl">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-8 sm:p-12 border border-blue-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                                <Shield className="w-7 h-7 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-extrabold text-slate-900">Carrying Capacity</h2>
                                <p className="text-sm text-slate-500 font-medium">Keunggulan Teknologi Konservasi</p>
                            </div>
                        </div>

                        <p className="text-slate-700 leading-relaxed mb-4">
                            Setiap titik selam di Selat Lembeh memiliki batas daya tampung ekosistem. Terlalu banyak penyelam dalam satu hari
                            dapat merusak terumbu karang, mengganggu habitat makro, dan menurunkan kualitas pengalaman selam.
                        </p>

                        <p className="text-slate-700 leading-relaxed mb-6">
                            SulutDive menerapkan sistem <strong className="text-slate-900">Carrying Capacity otomatis</strong> yang:
                        </p>

                        <div className="space-y-3 mb-6">
                            {[
                                "Membatasi jumlah peserta per layanan per hari berdasarkan kapasitas maksimal",
                                "Menampilkan sisa slot secara real-time kepada wisatawan sebelum booking",
                                "Menolak otomatis booking yang melebihi daya tampung — tanpa intervensi manual",
                                "Menerapkan surcharge fee berbasis zona untuk mendistribusikan wisatawan secara merata",
                            ].map((item) => (
                                <div key={item} className="flex items-start gap-3">
                                    <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                    <p className="text-sm text-slate-700">{item}</p>
                                </div>
                            ))}
                        </div>

                        <p className="text-sm text-slate-500 italic">
                            Dengan pendekatan ini, SulutDive bukan sekadar platform pemesanan — melainkan alat konservasi digital yang turut
                            menjaga kelestarian Selat Lembeh untuk generasi mendatang.
                        </p>
                    </div>
                </div>
            </section>

            {/* ═══ CTA Section ═══ */}
            <section
                className="py-16 px-4"
                style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
            >
                <div className="container mx-auto max-w-3xl text-center">
                    <Anchor className="w-10 h-10 text-white/40 mx-auto mb-4" />
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
                        Siap Menjelajahi Selat Lembeh?
                    </h2>
                    <p className="text-blue-100/80 mb-8 max-w-lg mx-auto">
                        Mulai petualangan muck diving Anda atau daftarkan usaha selam Anda di SulutDive hari ini.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/services"
                            className="px-8 py-3.5 rounded-xl text-base font-bold text-deepSea bg-white hover:bg-gray-100 transition-all shadow-lg"
                        >
                            Cari Paket Selam
                        </Link>
                        <Link
                            href="/auth/register"
                            className="px-8 py-3.5 rounded-xl text-base font-bold text-white border-2 border-white/30 hover:bg-white/10 transition-all"
                        >
                            Daftar sebagai Provider
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
