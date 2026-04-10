import Link from "next/link";
import {
    WifiOff,
    RefreshCcw,
    Phone,
    AlertTriangle,
    Compass,
    Anchor,
    Shield,
    MapPin,
    BookOpen,
} from "lucide-react";
import ReloadButton from "@/components/ReloadButton";

export const metadata = {
    title: "Offline - SulutDive",
};

export default function OfflinePage() {
    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#023E8A] via-[#0077B6] to-[#00B4D8]">
            {/* ─── Animated Ocean Waves SVG ──────────────────── */}
            <div className="absolute bottom-0 left-0 right-0 z-0">
                <svg
                    viewBox="0 0 1440 320"
                    className="w-full"
                    preserveAspectRatio="none"
                >
                    <path
                        fill="rgba(255,255,255,0.08)"
                        d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,234.7C672,245,768,235,864,208C960,181,1056,139,1152,138.7C1248,139,1344,181,1392,202.7L1440,224L1440,320L0,320Z"
                    >
                        <animate
                            attributeName="d"
                            dur="8s"
                            repeatCount="indefinite"
                            values="
                                M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,234.7C672,245,768,235,864,208C960,181,1056,139,1152,138.7C1248,139,1344,181,1392,202.7L1440,224L1440,320L0,320Z;
                                M0,192L48,208C96,224,192,256,288,250.7C384,245,480,203,576,186.7C672,171,768,181,864,197.3C960,213,1056,235,1152,229.3C1248,224,1344,192,1392,176L1440,160L1440,320L0,320Z;
                                M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,234.7C672,245,768,235,864,208C960,181,1056,139,1152,138.7C1248,139,1344,181,1392,202.7L1440,224L1440,320L0,320Z
                            "
                        />
                    </path>
                    <path
                        fill="rgba(255,255,255,0.05)"
                        d="M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,240C672,235,768,245,864,256C960,267,1056,277,1152,272C1248,267,1344,245,1392,234.7L1440,224L1440,320L0,320Z"
                    >
                        <animate
                            attributeName="d"
                            dur="6s"
                            repeatCount="indefinite"
                            values="
                                M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,240C672,235,768,245,864,256C960,267,1056,277,1152,272C1248,267,1344,245,1392,234.7L1440,224L1440,320L0,320Z;
                                M0,288L48,277.3C96,267,192,245,288,240C384,235,480,245,576,261.3C672,277,768,299,864,293.3C960,288,1056,256,1152,240C1248,224,1344,224,1392,224L1440,224L1440,320L0,320Z;
                                M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,240C672,235,768,245,864,256C960,267,1056,277,1152,272C1248,267,1344,245,1392,234.7L1440,224L1440,320L0,320Z
                            "
                        />
                    </path>
                </svg>
            </div>

            {/* ─── Floating Bubbles ──────────────────────────── */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-white/5 animate-pulse"
                        style={{
                            width: `${12 + i * 8}px`,
                            height: `${12 + i * 8}px`,
                            left: `${15 + i * 15}%`,
                            bottom: `${10 + i * 12}%`,
                            animationDelay: `${i * 0.5}s`,
                            animationDuration: `${3 + i}s`,
                        }}
                    />
                ))}
            </div>

            {/* ─── Main Content ──────────────────────────────── */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 pt-24 pb-20">
                {/* Offline Icon */}
                <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6 border border-white/20">
                    <WifiOff className="w-12 h-12 text-white/80" />
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">
                    Anda Sedang Offline
                </h1>
                <p className="text-blue-200 text-center max-w-md mb-8 leading-relaxed">
                    Tidak ada koneksi internet. Jangan khawatir — informasi penting
                    untuk penyelaman Anda tersedia di bawah ini.
                </p>

                {/* ─── Action Buttons ────────────────────────── */}
                <div className="flex gap-3 mb-10 w-full max-w-sm">
                    <ReloadButton />
                    <Link
                        href="/services"
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium hover:bg-white/20 transition-all text-sm"
                    >
                        <BookOpen className="w-4 h-4" />
                        Katalog
                    </Link>
                </div>

                {/* ─── Emergency & Dive Info Cards ───────────── */}
                <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Kontak Darurat */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                                <Phone className="w-4 h-4 text-red-300" />
                            </div>
                            <h3 className="text-white font-bold">Kontak Darurat</h3>
                        </div>
                        <ul className="space-y-2.5 text-sm">
                            <li className="flex justify-between items-center text-blue-100">
                                <span>SAR Basarnas Bitung</span>
                                <span className="font-mono font-bold text-white">115</span>
                            </li>
                            <li className="flex justify-between items-center text-blue-100">
                                <span>DAN Emergency (Asia)</span>
                                <span className="font-mono font-bold text-white">+61-8-8212-9242</span>
                            </li>
                            <li className="flex justify-between items-center text-blue-100">
                                <span>RSUD Bitung</span>
                                <span className="font-mono font-bold text-white">(0438) 21527</span>
                            </li>
                            <li className="flex justify-between items-center text-blue-100">
                                <span>Polres Bitung</span>
                                <span className="font-mono font-bold text-white">110</span>
                            </li>
                        </ul>
                    </div>

                    {/* Prosedur Darurat Penyelaman */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-4 h-4 text-amber-300" />
                            </div>
                            <h3 className="text-white font-bold">Prosedur Darurat</h3>
                        </div>
                        <ol className="space-y-2 text-sm text-blue-100 list-decimal list-inside">
                            <li>Hentikan dive, berikan sinyal ke buddy</li>
                            <li>Naik perlahan (maks. 9m/menit)</li>
                            <li>Safety stop 3 menit di 5 meter</li>
                            <li>Di permukaan, kembangkan SMB</li>
                            <li>Jangan terbang 24 jam setelah dive</li>
                        </ol>
                    </div>

                    {/* Sinyal Tangan Penting */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                                <Compass className="w-4 h-4 text-green-300" />
                            </div>
                            <h3 className="text-white font-bold">Sinyal Tangan</h3>
                        </div>
                        <ul className="space-y-2 text-sm text-blue-100">
                            <li className="flex items-start gap-2">
                                <span className="text-lg leading-none">👍</span>
                                <span><strong className="text-white">OK</strong> — Semua baik / naik ke atas</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-lg leading-none">👎</span>
                                <span><strong className="text-white">Problem</strong> — Ada masalah</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-lg leading-none">✊</span>
                                <span><strong className="text-white">Stop</strong> — Berhenti, perhatikan</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-lg leading-none">🤙</span>
                                <span><strong className="text-white">Low Air</strong> — Udara tinggal 50 bar</span>
                            </li>
                        </ul>
                    </div>

                    {/* Info Lembeh */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-blue-400/20 flex items-center justify-center">
                                <Anchor className="w-4 h-4 text-blue-300" />
                            </div>
                            <h3 className="text-white font-bold">Info Selat Lembeh</h3>
                        </div>
                        <ul className="space-y-2 text-sm text-blue-100">
                            <li className="flex items-start gap-2">
                                <MapPin className="w-3.5 h-3.5 text-blue-300 mt-0.5 shrink-0" />
                                <span>Koordinat: 1.44°N, 125.23°E</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Shield className="w-3.5 h-3.5 text-blue-300 mt-0.5 shrink-0" />
                                <span>Kedalaman maks: 5–35 meter</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Compass className="w-3.5 h-3.5 text-blue-300 mt-0.5 shrink-0" />
                                <span>Arus: umumnya lemah–sedang</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-blue-300 mt-0.5 shrink-0" />
                                <span>Suhu air: 26–29°C sepanjang tahun</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Footer note */}
                <p className="mt-8 text-blue-300/60 text-xs text-center max-w-md">
                    Halaman ini tersedia secara offline melalui Service Worker.
                    Data yang pernah Anda akses sebelumnya juga di-cache secara otomatis.
                </p>
            </div>
        </div>
    );
}
