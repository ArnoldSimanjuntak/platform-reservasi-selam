import Link from "next/link";
import type { ReactNode } from "react";
import {
    AlertTriangle,
    Anchor,
    BookOpen,
    Compass,
    MapPin,
    Phone,
    Shield,
    WifiOff,
} from "lucide-react";
import ReloadButton from "@/components/ReloadButton";

export const metadata = {
    title: "Offline - SulutDive",
};

const emergencyContacts = [
    { label: "SAR Basarnas Bitung", value: "115" },
    { label: "DAN Emergency Asia", value: "+61-8-8212-9242" },
    { label: "RSUD Bitung", value: "(0438) 21527" },
    { label: "Polres Bitung", value: "110" },
];

const handSignals = [
    { code: "OK", title: "OK", text: "Kondisi baik atau siap naik." },
    { code: "!", title: "Problem", text: "Ada masalah, beri tahu buddy." },
    { code: "STOP", title: "Stop", text: "Berhenti dan perhatikan instruksi." },
    { code: "AIR", title: "Low Air", text: "Udara menipis, mulai prosedur naik." },
];

const lembehInfo = [
    { icon: MapPin, text: "Koordinat area: sekitar 1.44 N, 125.23 E." },
    { icon: Shield, text: "Kedalaman umum: 5-35 meter." },
    { icon: Compass, text: "Arus umumnya lemah sampai sedang." },
    { icon: AlertTriangle, text: "Suhu air rata-rata: 26-29 C." },
];

export default function OfflinePage() {
    return (
        <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#023E8A] via-[#0077B6] to-[#00B4D8]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {[...Array(7)].map((_, index) => (
                    <div
                        key={index}
                        className="absolute rounded-full bg-white/10"
                        style={{
                            width: `${16 + index * 9}px`,
                            height: `${16 + index * 9}px`,
                            left: `${8 + index * 14}%`,
                            bottom: `${8 + index * 11}%`,
                            opacity: 0.16 + index * 0.03,
                        }}
                    />
                ))}
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0">
                <svg viewBox="0 0 1440 260" className="h-56 w-full" preserveAspectRatio="none">
                    <path
                        fill="rgba(255,255,255,0.10)"
                        d="M0,144L60,154.7C120,165,240,187,360,176C480,165,600,123,720,122.7C840,123,960,165,1080,176C1200,187,1320,165,1380,154.7L1440,144L1440,260L0,260Z"
                    />
                    <path
                        fill="rgba(255,255,255,0.07)"
                        d="M0,192L80,181.3C160,171,320,149,480,160C640,171,800,213,960,213.3C1120,213,1280,171,1360,149.3L1440,128L1440,260L0,260Z"
                    />
                </svg>
            </div>

            <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-5 py-16 text-white">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/20 bg-white/12 shadow-2xl backdrop-blur">
                    <WifiOff className="h-11 w-11 text-white" />
                </div>

                <p className="mb-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-50">
                    SulutDive Offline Mode
                </p>
                <h1 className="text-center text-3xl font-black tracking-tight md:text-5xl">
                    Anda Sedang Offline
                </h1>
                <p className="mt-4 max-w-2xl text-center text-base leading-7 text-blue-100 md:text-lg">
                    Koneksi internet sedang tidak tersedia. Halaman ini disiapkan oleh service worker agar informasi penting tetap dapat dibuka saat sinyal hilang.
                </p>

                <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3">
                    <ReloadButton />
                    <Link
                        href="/services"
                        className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                    >
                        <BookOpen className="h-4 w-4" />
                        Katalog
                    </Link>
                </div>

                <div className="mt-10 grid w-full gap-4 md:grid-cols-2">
                    <InfoCard
                        icon={<Phone className="h-5 w-5 text-red-200" />}
                        title="Kontak Darurat"
                    >
                        <ul className="space-y-3 text-sm">
                            {emergencyContacts.map((contact) => (
                                <li key={contact.label} className="flex items-center justify-between gap-4 text-blue-50">
                                    <span>{contact.label}</span>
                                    <span className="font-mono font-bold text-white">{contact.value}</span>
                                </li>
                            ))}
                        </ul>
                    </InfoCard>

                    <InfoCard
                        icon={<AlertTriangle className="h-5 w-5 text-amber-200" />}
                        title="Prosedur Darurat"
                    >
                        <ol className="list-inside list-decimal space-y-2 text-sm leading-6 text-blue-50">
                            <li>Hentikan penyelaman dan beri sinyal ke buddy.</li>
                            <li>Naik perlahan sesuai arahan guide atau instruktur.</li>
                            <li>Lakukan safety stop bila kondisi memungkinkan.</li>
                            <li>Di permukaan, kembangkan SMB dan panggil bantuan.</li>
                            <li>Catat waktu, lokasi, dan gejala jika terjadi insiden.</li>
                        </ol>
                    </InfoCard>

                    <InfoCard
                        icon={<Compass className="h-5 w-5 text-emerald-200" />}
                        title="Sinyal Tangan"
                    >
                        <ul className="space-y-3 text-sm">
                            {handSignals.map((signal) => (
                                <li key={signal.code} className="flex gap-3 text-blue-50">
                                    <span className="flex h-8 min-w-12 items-center justify-center rounded-lg bg-white/15 px-2 text-xs font-black text-white">
                                        {signal.code}
                                    </span>
                                    <span>
                                        <strong className="text-white">{signal.title}</strong> - {signal.text}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </InfoCard>

                    <InfoCard
                        icon={<Anchor className="h-5 w-5 text-sky-200" />}
                        title="Info Selat Lembeh"
                    >
                        <ul className="space-y-3 text-sm">
                            {lembehInfo.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <li key={item.text} className="flex gap-3 text-blue-50">
                                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-200" />
                                        <span>{item.text}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </InfoCard>
                </div>

                <p className="mt-8 max-w-xl text-center text-xs leading-6 text-blue-100/75">
                    Catatan: data transaksi terbaru tetap membutuhkan koneksi internet. Gunakan halaman ini untuk akses dasar sampai jaringan kembali tersedia.
                </p>
            </section>
        </main>
    );
}

function InfoCard({
    icon,
    title,
    children,
}: {
    icon: ReactNode;
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-md">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12">
                    {icon}
                </div>
                <h2 className="text-lg font-black text-white">{title}</h2>
            </div>
            {children}
        </section>
    );
}
