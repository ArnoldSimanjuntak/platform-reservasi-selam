"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    MapPin,
    Navigation,
    Ship,
    Calendar,
    Users,
    Minus,
    Plus,
    ArrowRight,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Anchor,
    Info,
} from "lucide-react";
import { createBooking, getRemainingSlots } from "@/app/actions/booking";
import { createClient } from "@/lib/supabase/client";
import type { BookingResult } from "@/app/actions/booking";
import type { DiveSite, Service } from "@/lib/supabase";

interface BookingPageClientProps {
    diveSite: DiveSite;
    services: Service[];
    initialIsLoggedIn: boolean;
}

export default function BookingPageClient({
    diveSite,
    services,
    initialIsLoggedIn,
}: BookingPageClientProps) {
    const router = useRouter();
    const [selectedServiceId, setSelectedServiceId] = useState<string>(
        services.length > 0 ? services[0].id : ""
    );
    const [guests, setGuests] = useState(1);
    const [date, setDate] = useState("");
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<BookingResult | null>(null);
    const [remainingSlots, setRemainingSlots] = useState<number | null>(null);
    const [isCheckingSlots, setIsCheckingSlots] = useState(false);
    // Use server-provided auth state (reliable, from httpOnly cookies via middleware)
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(initialIsLoggedIn);

    const selectedService = services.find((s) => s.id === selectedServiceId);

    // ─── Auth: Listen for runtime changes (logout, token refresh, etc.) ──
    useEffect(() => {
        const supabase = createClient();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setIsLoggedIn(!!session?.user);
                if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
                    router.refresh();
                }
            }
        );

        return () => subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch remaining slots when date or service changes
    useEffect(() => {
        if (!date || !selectedServiceId) {
            setRemainingSlots(null);
            return;
        }

        setIsCheckingSlots(true);
        setResult(null);

        getRemainingSlots(selectedServiceId, date).then((res) => {
            setRemainingSlots(res.remaining);
            setIsCheckingSlots(false);
            if (res.remaining > 0 && guests > res.remaining) {
                setGuests(Math.min(guests, res.remaining));
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, selectedServiceId]);

    const formatPrice = (amount: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);

    const servicePrice = selectedService ? selectedService.price * guests : 0;
    const surcharge = diveSite.surcharge_fee;
    const totalPrice = servicePrice + surcharge;
    const maxCapacity = selectedService?.max_capacity || 10;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split("T")[0];

    const handleBooking = () => {
        if (!isLoggedIn) {
            router.push(`/auth/login?redirectTo=/booking?dive_site=${diveSite.id}`);
            return;
        }

        if (!date) {
            setResult({ success: false, message: "Silakan pilih tanggal dive terlebih dahulu." });
            return;
        }

        if (!selectedServiceId) {
            setResult({ success: false, message: "Silakan pilih layanan kapal." });
            return;
        }

        startTransition(async () => {
            const bookingResult = await createBooking(
                selectedServiceId,
                date,
                guests,
                diveSite.id
            );
            
            // If server says not logged in but client thinks we are,
            // force reload to resync middleware cookies
            if (!bookingResult.success && bookingResult.message.includes("log in") && isLoggedIn) {
                window.location.reload();
                return;
            }
            
            setResult(bookingResult);

            if (bookingResult.success) {
                setRemainingSlots(bookingResult.remainingSlots ?? null);
            }
        });
    };

    const handleGuestChange = (delta: number) => {
        const newValue = guests + delta;
        const max =
            remainingSlots !== null
                ? Math.min(maxCapacity, remainingSlots)
                : maxCapacity;
        if (newValue >= 1 && newValue <= max) {
            setGuests(newValue);
        }
    };

    const getCapacityColor = () => {
        if (remainingSlots === null) return "text-gray-400";
        if (remainingSlots === 0) return "text-red-500";
        if (remainingSlots <= 3) return "text-amber-500";
        return "text-green-500";
    };

    const getCapacityBg = () => {
        if (remainingSlots === null) return "bg-gray-50";
        if (remainingSlots === 0) return "bg-red-50 border-red-200";
        if (remainingSlots <= 3) return "bg-amber-50 border-amber-200";
        return "bg-green-50 border-green-200";
    };

    return (
        <main className="min-h-screen pt-24 pb-12 bg-gray-50">
            <div className="container mx-auto px-4 max-w-4xl">
                {/* Back Button */}
                <Link
                    href="/lokasi"
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Peta
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* ─── Left: Dive Site Info + Form ────────────── */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Dive Site Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div
                                className="p-6"
                                style={{
                                    background: "linear-gradient(135deg, #023E8A 0%, #0077B6 100%)",
                                }}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="w-5 h-5 text-cyan-300" />
                                            <span className="text-cyan-200 text-sm font-medium">
                                                Tujuan Dive
                                            </span>
                                        </div>
                                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                                            {diveSite.name}
                                        </h1>
                                        <div className="flex items-center gap-2 mt-2 text-blue-200 text-sm">
                                            <Navigation className="w-4 h-4" />
                                            Zona {diveSite.zone_level}
                                            {diveSite.zone_level === 1 && " — Dekat Pelabuhan"}
                                            {diveSite.zone_level === 2 && " — Menengah"}
                                            {diveSite.zone_level === 3 && " — Ujung Selat"}
                                        </div>
                                    </div>
                                    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                                        <span className="text-xs text-blue-200 block">
                                            Surcharge
                                        </span>
                                        <span className="text-white font-bold">
                                            {surcharge === 0
                                                ? "Gratis"
                                                : formatPrice(surcharge)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {diveSite.description && (
                                <div className="p-6 border-t border-gray-100">
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        {diveSite.description}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Service Selection */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-deepSea mb-4 flex items-center gap-2">
                                <Ship className="w-5 h-5 text-primary" />
                                Pilih Layanan Kapal
                            </h2>

                            {services.length === 0 ? (
                                <div className="text-center py-8">
                                    <Ship className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">
                                        Belum ada layanan kapal tersedia.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {services.map((service) => (
                                        <button
                                            key={service.id}
                                            onClick={() => {
                                                setSelectedServiceId(service.id);
                                                setResult(null);
                                            }}
                                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedServiceId === service.id
                                                    ? "border-primary bg-blue-50/50 shadow-sm"
                                                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedServiceId === service.id
                                                                ? "bg-primary text-white"
                                                                : "bg-gray-100 text-gray-400"
                                                            }`}
                                                    >
                                                        <Anchor className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-deepSea text-sm">
                                                            {service.name}
                                                        </h3>
                                                        <p className="text-xs text-primary/70 mt-0.5">
                                                            Disediakan oleh: {service.provider?.name || "—"}
                                                        </p>
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            Maks. {service.max_capacity} peserta/hari
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-primary text-sm whitespace-nowrap">
                                                    {formatPrice(service.price)}
                                                    <span className="text-xs text-gray-400 font-normal block text-right">
                                                        /pax
                                                    </span>
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Booking Form */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                            <h2 className="text-lg font-bold text-deepSea mb-2">
                                Detail Booking
                            </h2>

                            {/* Success Result */}
                            {result?.success && (
                                <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-green-800">
                                                Booking Berhasil! 🎉
                                            </p>
                                            <p className="text-sm text-green-700 mt-1">
                                                {result.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error Result */}
                            {result && !result.success && (
                                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                                    <div className="flex items-start gap-3">
                                        <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-red-800">
                                                Booking Gagal
                                            </p>
                                            <p className="text-sm text-red-700 mt-1">
                                                {result.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Date Picker */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 block">
                                    Pilih Tanggal Dive
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                                    <input
                                        type="date"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-gray-600 font-medium"
                                        value={date}
                                        min={minDate}
                                        onChange={(e) => setDate(e.target.value)}
                                        disabled={isPending}
                                    />
                                </div>
                            </div>

                            {/* Capacity Indicator */}
                            {date && (
                                <div
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${getCapacityBg()}`}
                                >
                                    {isCheckingSlots ? (
                                        <>
                                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                            <span className="text-sm text-gray-500">
                                                Memeriksa ketersediaan...
                                            </span>
                                        </>
                                    ) : remainingSlots !== null ? (
                                        <>
                                            {remainingSlots === 0 ? (
                                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                            ) : (
                                                <Users
                                                    className={`w-4 h-4 shrink-0 ${getCapacityColor()}`}
                                                />
                                            )}
                                            <div>
                                                <span
                                                    className={`text-sm font-semibold ${getCapacityColor()}`}
                                                >
                                                    {remainingSlots === 0
                                                        ? "Penuh — tidak ada slot tersisa"
                                                        : `${remainingSlots} slot tersedia`}
                                                </span>
                                                <span className="text-xs text-gray-400 block">
                                                    dari maks. {maxCapacity} peserta/hari
                                                </span>
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            )}

                            {/* Guest Counter */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 block">
                                    Jumlah Divers
                                </label>
                                <div className="flex items-center justify-between p-1 rounded-lg border border-gray-200">
                                    <button
                                        onClick={() => handleGuestChange(-1)}
                                        disabled={guests <= 1 || isPending}
                                        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="text-lg font-bold text-deepSea w-12 text-center">
                                        {guests}
                                    </span>
                                    <button
                                        onClick={() => handleGuestChange(1)}
                                        disabled={
                                            isPending ||
                                            (remainingSlots !== null &&
                                                guests >= remainingSlots) ||
                                            guests >= maxCapacity
                                        }
                                        className="w-10 h-10 flex items-center justify-center text-primary hover:bg-blue-50 rounded-md transition-colors disabled:opacity-30"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Right: Sticky Price Summary ────────────── */}
                    <div className="lg:col-span-2">
                        <div className="sticky top-24 space-y-4">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-primary to-deepSea p-5 text-white text-center">
                                    <p className="text-xs font-medium opacity-90 mb-1">
                                        Total Biaya
                                    </p>
                                    <h3 className="text-3xl font-bold">
                                        {formatPrice(totalPrice)}
                                    </h3>
                                </div>

                                <div className="p-5 space-y-3">
                                    {/* Price Breakdown */}
                                    <div className="space-y-2 text-sm">
                                        {selectedService && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">
                                                    {selectedService.name} × {guests}
                                                </span>
                                                <span className="font-medium text-gray-700">
                                                    {formatPrice(servicePrice)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">
                                                Surcharge ({diveSite.name})
                                            </span>
                                            <span className="font-medium text-gray-700">
                                                {surcharge === 0
                                                    ? "Gratis"
                                                    : formatPrice(surcharge)}
                                            </span>
                                        </div>
                                        <div className="border-t border-gray-100 pt-2 flex justify-between">
                                            <span className="font-semibold text-deepSea">
                                                Total
                                            </span>
                                            <span className="font-bold text-primary">
                                                {formatPrice(totalPrice)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    {/* Client-side validation feedback */}
                                    {!date && !result?.success && (
                                        <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                            Pilih tanggal untuk mengaktifkan tombol booking.
                                        </p>
                                    )}
                                    {date && guests > maxCapacity && (
                                        <p className="text-xs text-red-600 flex items-center gap-1 mt-2">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                            Jumlah peserta melebihi kapasitas maksimum ({maxCapacity}).
                                        </p>
                                    )}

                                    <button
                                        onClick={handleBooking}
                                        disabled={
                                            isPending ||
                                            !date ||
                                            guests < 1 ||
                                            guests > maxCapacity ||
                                            (remainingSlots !== null &&
                                                remainingSlots === 0) ||
                                            (remainingSlots !== null &&
                                                guests > remainingSlots) ||
                                            result?.success === true ||
                                            !selectedServiceId
                                        }
                                        className="w-full btn-primary py-3.5 text-base flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Memproses...
                                            </>
                                        ) : result?.success ? (
                                            <>
                                                <CheckCircle2 className="w-5 h-5" />
                                                Booking Berhasil
                                            </>
                                        ) : !isLoggedIn && isLoggedIn !== null ? (
                                            <>
                                                Login untuk Memesan
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        ) : (
                                            <>
                                                Konfirmasi Booking
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3 border border-blue-100">
                                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    <strong>Carrying Capacity:</strong> Kami
                                    membatasi jumlah penyelam per hari untuk
                                    menjaga kelestarian ekosistem Selat Lembeh.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
