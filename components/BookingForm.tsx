"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar,
    Users,
    Minus,
    Plus,
    ArrowRight,
    Loader2,
    Info,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    MapPin,
    Clock,
} from "lucide-react";
import { createBooking, getRemainingSlots, getGearAvailableStock } from "@/app/actions/booking";
import { createClient } from "@/lib/supabase/client";
import type { BookingResult } from "@/app/actions/booking";
import type { DiveSite } from "@/lib/supabase";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { formatRupiah, getLocalDateString } from "@/lib/formatters";
import {
    getDistanceTier,
    getDistanceTierDescription,
    getDistanceTierLabel,
    haversineDistanceKm,
    type DistanceTier,
} from "@/lib/geo";

interface BookingFormProps {
    serviceId: string;
    serviceName: string;
    price: number;
    maxCapacity: number;
    initialIsLoggedIn?: boolean;
    isBoat?: boolean;
    isGear?: boolean;
    diveSites?: DiveSite[];
    providerBase?: {
        name: string;
        latitude: number;
        longitude: number;
    } | null;
}

const distanceTierClasses: Record<DistanceTier, string> = {
    near: "bg-emerald-50 border-emerald-200 text-emerald-800",
    medium: "bg-amber-50 border-amber-200 text-amber-800",
    far: "bg-red-50 border-red-200 text-red-800",
};

export default function BookingForm({
    serviceId,
    serviceName,
    price,
    maxCapacity,
    initialIsLoggedIn = false,
    isBoat = false,
    isGear = false,
    diveSites = [],
    providerBase = null,
}: BookingFormProps) {
    const router = useRouter();
    const [guests, setGuests] = useState(1);
    const [date, setDate] = useState("");
    const [rentalDays, setRentalDays] = useState(1);
    const [selectedDiveSiteId, setSelectedDiveSiteId] = useState<string>("");
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<BookingResult | null>(null);
    const [remainingSlots, setRemainingSlots] = useState<number | null>(null);
    const [isCheckingSlots, setIsCheckingSlots] = useState(false);
    // â”€â”€ Auth state: dimulai dari nilai SSR, lalu disinkronkan via client â”€â”€
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(initialIsLoggedIn);

    // â”€â”€ Sinkronisasi Auth: selalu verifikasi via getUser() + pantau perubahan sesi â”€â”€
    useEffect(() => {
        const supabase = createClient();

        // Selalu panggil getUser() untuk memvalidasi token secara kriptografis
        // (lebih aman dari getSession() yang hanya baca localStorage)
        const syncAuthState = async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error) {
                    setIsLoggedIn(false);
                } else {
                    setIsLoggedIn(!!user);
                }
            } catch {
                setIsLoggedIn(false);
            }
        };
        syncAuthState();

        // Pantau perubahan sesi: login/logout di tab lain, token refresh, dll.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event: AuthChangeEvent, session: Session | null) => {
                setIsLoggedIn(!!session?.user);
                if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
                    router.refresh();
                }
            }
        );

        return () => subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch remaining slots / gear stock when date or rental days changes
    useEffect(() => {
        if (!date) {
            setRemainingSlots(null);
            return;
        }

        setIsCheckingSlots(true);
        setResult(null);

        if (isGear) {
            // Gear: cek stok dengan mempertimbangkan overlap tanggal sewa
            getGearAvailableStock(serviceId, date, rentalDays).then((res) => {
                setRemainingSlots(res.available);
                setIsCheckingSlots(false);
                if (res.available > 0 && guests > res.available) {
                    setGuests(Math.min(guests, res.available));
                }
            });
        } else {
            // Boat / Instructor: cek kapasitas per hari
            getRemainingSlots(serviceId, date).then((res) => {
                setRemainingSlots(res.remaining);
                setIsCheckingSlots(false);
                if (res.remaining > 0 && guests > res.remaining) {
                    setGuests(Math.min(guests, res.remaining));
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, serviceId, rentalDays, isGear]);

    const selectedSite = isBoat ? diveSites.find(s => s.id === selectedDiveSiteId) : null;
    const distanceKm =
        isBoat &&
        providerBase &&
        selectedSite?.latitude != null &&
        selectedSite?.longitude != null
            ? haversineDistanceKm(
                providerBase.latitude,
                providerBase.longitude,
                selectedSite.latitude,
                selectedSite.longitude
            )
            : null;
    const distanceTier = distanceKm !== null ? getDistanceTier(distanceKm) : null;
    const surcharge = selectedSite ? selectedSite.surcharge_fee : 0;
    // Untuk gear: totalPrice = harga x durasi (hari); untuk boat/instructor: harga x peserta + biaya spot
    const totalPrice = isGear
        ? price * rentalDays * guests
        : (price * guests) + surcharge;

    // Minimum date = today (in local timezone, safe for WITA UTC+8)
    // Using manual local date construction to avoid UTC conversion issues
    const todayStr = getLocalDateString();

    // Allow booking from today onwards
    const minDate = todayStr;

    const handleBooking = () => {
        // Jika status login belum diketahui (null = sedang load), tunggu sebentar
        if (isLoggedIn === null) return;

        // Jika tidak login, redirect ke halaman login
        if (!isLoggedIn) {
            router.push(`/auth/login?redirectTo=/services/${serviceId}`);
            return;
        }

        if (!date) {
            setResult({
                success: false,
                message: "Pilih tanggal terlebih dahulu.",
            });
            return;
        }

        if (isBoat && !selectedDiveSiteId) {
            setResult({
                success: false,
                message: "Pilih destinasi dive terlebih dahulu.",
            });
            return;
        }

        if (isGear && rentalDays < 1) {
            setResult({
                success: false,
                message: "Durasi sewa minimal 1 hari.",
            });
            return;
        }

        startTransition(async () => {
            try {
                const bookingResult = await createBooking(
                    serviceId,
                    date,
                    guests,
                    isBoat ? selectedDiveSiteId : undefined, // server coalesces to null
                    isGear ? rentalDays : undefined
                );
                
                // Jika server bilang user tidak login padahal client pikir sudah login
                // (cookie stale) â†’ paksa reload untuk sinkron dengan middleware
                if (!bookingResult.success && bookingResult.message.includes("log in") && isLoggedIn) {
                    window.location.reload();
                    return;
                }
                
                setResult(bookingResult);

                if (bookingResult.success) {
                    // Perbarui sisa slot setelah Booking berhasil
                    setRemainingSlots(bookingResult.remainingSlots ?? null);

                    // Redirect ke halaman bookings setelah delay singkat
                    setTimeout(() => {
                        router.push("/dashboard/bookings");
                        router.refresh();
                    }, 2000);
                }
            } catch (error) {
                console.error("Network Error:", error);
                setResult({
                    success: false,
                    message: "Terjadi kesalahan jaringan. Silakan periksa koneksi Anda dan coba lagi.",
                });
            }
        });
    };

    const handleGuestChange = (delta: number) => {
        const newValue = guests + delta;
        const max = remainingSlots !== null ? Math.min(maxCapacity, remainingSlots) : maxCapacity;
        if (newValue >= 1 && newValue <= max) {
            setGuests(newValue);
        }
    };

    // Capacity indicator color
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
        <div className="space-y-6">
            {/* â”€â”€â”€ Success Result â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {result?.success && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-green-800">
                                Booking berhasil
                            </p>
                            <p className="text-sm text-green-700 mt-1">{result.message}</p>
                            {result.remainingSlots !== undefined && (
                                <p className="text-xs text-green-600 mt-2">
                                    Sisa slot: {result.remainingSlots}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* â”€â”€â”€ Error Result â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {result && !result.success && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-red-800">
                                Booking gagal
                            </p>
                            <p className="text-sm text-red-700 mt-1">{result.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* â”€â”€â”€ Destination Picker (Khusus Boat) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {isBoat && (
                <div className="space-y-2">
                    <label className="text-sm font-bold text-[#111827] block">
                        Pilih Destinasi Selam
                    </label>
                    <div className="relative">
                        <MapPin className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                        <select
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-[#111827] font-bold bg-white appearance-none cursor-pointer"
                            value={selectedDiveSiteId}
                            onChange={(e) => setSelectedDiveSiteId(e.target.value)}
                            disabled={isPending}
                        >
                            <option value="" disabled>-- Pilih Spot Selam --</option>
                            {diveSites.map(site => (
                                <option key={site.id} value={site.id} className="text-[#111827] font-medium">
                                    {site.name} {site.surcharge_fee > 0 ? `(+ ${formatRupiah(site.surcharge_fee)})` : "(Tanpa biaya spot)"}
                                </option>
                            ))}
                        </select>
                    </div>
                    {selectedSite && providerBase && distanceKm !== null && distanceTier && (
                        <div className={`rounded-xl border p-3 text-xs font-semibold ${distanceTierClasses[distanceTier]}`}>
                            <div className="flex items-center justify-between gap-3">
                                <span>Jarak dari pangkalan {providerBase.name}</span>
                                <span>{distanceKm.toFixed(1)} km</span>
                            </div>
                            <p className="mt-1 font-medium opacity-80">
                                Kategori: {getDistanceTierLabel(distanceTier)}. {getDistanceTierDescription()}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Durasi Sewa (Khusus Gear/Alat) */}
            {isGear && (
                <div className="space-y-2">
                    <label className="text-sm font-bold text-[#111827] block">
                        Durasi Sewa (Hari)
                    </label>
                    <div className="flex items-center justify-between p-1 rounded-lg border border-gray-200">
                        <button
                            type="button"
                            onClick={() => setRentalDays(d => Math.max(1, d - 1))}
                            disabled={rentalDays <= 1 || isPending}
                            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <div className="text-center">
                            <span className="text-lg font-bold text-deepSea">{rentalDays}</span>
                            <span className="text-xs text-gray-400 block">hari</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setRentalDays(d => Math.min(30, d + 1))}
                            disabled={rentalDays >= 30 || isPending}
                            className="w-10 h-10 flex items-center justify-center text-primary hover:bg-blue-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Harga per hari: {formatRupiah(price)} x {rentalDays} hari x {guests} unit
                    </p>
                </div>
            )}

            {/* â”€â”€â”€ Date Picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-[#111827] block">
                    {isGear ? "Tanggal Mulai Sewa" : "Pilih Tanggal Selam"}
                </label>
                <div className="relative">
                    <Calendar className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                    <input
                        type="date"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-[#111827] font-extrabold bg-white"
                        style={{ colorScheme: "light" }}
                        value={date}
                        min={minDate}
                        onChange={(e) => setDate(e.target.value)}
                        disabled={isPending}
                    />
                </div>
            </div>

            {/* â”€â”€â”€ Remaining Capacity Indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {date && (
                <div
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${getCapacityBg()}`}
                >
                    {isCheckingSlots ? (
                        <>
                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                            <span className="text-sm text-gray-500">
                                Checking availability...
                            </span>
                        </>
                    ) : remainingSlots !== null ? (
                        <>
                            {remainingSlots === 0 ? (
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                            ) : (
                                <Users className={`w-4 h-4 shrink-0 ${getCapacityColor()}`} />
                            )}
                            <div>
                                <span className={`text-sm font-semibold ${getCapacityColor()}`}>
                                    {remainingSlots === 0
                                        ? isGear ? "Stok habis" : "Kapasitas penuh"
                                        : isGear
                                            ? `${remainingSlots} unit tersedia`
                                            : `${remainingSlots} slot tersedia`}
                                </span>
                                <span className="text-xs text-gray-400 block">
                                    {isGear
                                        ? `dari stok maks ${maxCapacity} unit`
                                        : `dari maks ${maxCapacity} penyelam/hari`}
                                </span>
                            </div>
                        </>
                    ) : null}
                </div>
            )}

            {/* â”€â”€â”€ Guest Counter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-[#111827] block">
                    {isGear ? "Jumlah Unit" : "Jumlah Penyelam"}
                </label>
                <div className="flex items-center justify-between p-1 rounded-lg border border-gray-200">
                    <button
                        onClick={() => handleGuestChange(-1)}
                        disabled={guests <= 1 || isPending}
                        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-xl font-extrabold text-[#111827] w-12 text-center">
                        {guests}
                    </span>
                    <button
                        onClick={() => handleGuestChange(1)}
                        disabled={
                            isPending ||
                            (remainingSlots !== null && guests >= remainingSlots) ||
                            guests >= maxCapacity
                        }
                        className="w-10 h-10 flex items-center justify-center text-primary hover:bg-blue-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* â”€â”€â”€ Total Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                {isGear ? (
                    <>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 font-medium">Harga/hari x {rentalDays} hari x {guests} unit</span>
                            <span className="text-[#111827] font-bold">{formatRupiah(price * rentalDays * guests)}</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 font-medium">Subtotal ({guests} pax)</span>
                            <span className="text-[#111827] font-bold">{formatRupiah(price * guests)}</span>
                        </div>
                        {selectedSite && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-600 font-medium">Biaya spot</span>
                                <span className="text-[#111827] font-bold">{surcharge === 0 ? "Gratis" : formatRupiah(surcharge)}</span>
                            </div>
                        )}
                    </>
                )}
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                    <span className="text-[#111827] font-bold">Estimasi Total</span>
                    <span className="text-xl font-extrabold text-primary">
                        {formatRupiah(totalPrice)}
                    </span>
                </div>
            </div>

            {/* â”€â”€â”€ CTA Buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <button
                onClick={handleBooking}
                disabled={
                    isPending ||
                    isLoggedIn === null ||
                    (remainingSlots !== null && remainingSlots === 0) ||
                    result?.success === true ||
                    (isBoat && !selectedDiveSiteId)
                }
                className="w-full btn-primary py-3.5 text-base flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isPending ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Memproses Pesanan...
                    </>
                ) : isLoggedIn === null ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Memverifikasi...
                    </>
                ) : result?.success ? (
                    <>
                        <CheckCircle2 className="w-5 h-5" />
                        Pesanan Berhasil!
                    </>
                ) : !isLoggedIn ? (
                    <>
                        Silakan Login untuk Memesan
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                ) : (
                    <>
                        Pesan Sekarang
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </button>

            <button className="w-full py-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-deepSea font-medium transition-colors text-sm flex items-center justify-center gap-2">
                <Info className="w-4 h-4" />
                Hubungi Support (WA)
            </button>
        </div>
    );
}
