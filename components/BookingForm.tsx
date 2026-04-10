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
} from "lucide-react";
import { createBooking, getRemainingSlots } from "@/app/actions/booking";
import { createClient } from "@/lib/supabase/client";
import type { BookingResult } from "@/app/actions/booking";

interface BookingFormProps {
    serviceId: string;
    serviceName: string;
    price: number;
    maxCapacity: number;
}

export default function BookingForm({
    serviceId,
    serviceName,
    price,
    maxCapacity,
}: BookingFormProps) {
    const router = useRouter();
    const [guests, setGuests] = useState(1);
    const [date, setDate] = useState("");
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<BookingResult | null>(null);
    const [remainingSlots, setRemainingSlots] = useState<number | null>(null);
    const [isCheckingSlots, setIsCheckingSlots] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

    // Check auth state on mount and listen to changes
    useEffect(() => {
        const supabase = createClient();
        
        supabase.auth.getUser().then(({ data: { user } }) => {
            setIsLoggedIn(!!user);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setIsLoggedIn(!!session?.user);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Fetch remaining slots when date changes
    useEffect(() => {
        if (!date) {
            setRemainingSlots(null);
            return;
        }

        setIsCheckingSlots(true);
        setResult(null);

        getRemainingSlots(serviceId, date).then((res) => {
            setRemainingSlots(res.remaining);
            setIsCheckingSlots(false);
            // Reset guests if exceeds remaining
            if (res.remaining > 0 && guests > res.remaining) {
                setGuests(Math.min(guests, res.remaining));
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, serviceId]);

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const totalPrice = price * guests;

    // Minimum date = today (in local timezone, safe for WITA UTC+8)
    // Using manual local date construction to avoid UTC conversion issues
    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${localYear}-${localMonth}-${localDay}`;

    // Allow booking from today onwards
    const minDate = todayStr;

    const handleBooking = () => {
        // If not logged in, redirect to login
        if (!isLoggedIn) {
            router.push(`/auth/login?redirectTo=/services/${serviceId}`);
            return;
        }

        if (!date) {
            setResult({
                success: false,
                message: "Please select a dive date first.",
            });
            return;
        }

        startTransition(async () => {
            const bookingResult = await createBooking(serviceId, date, guests);
            setResult(bookingResult);

            if (bookingResult.success) {
                // Update remaining slots after successful booking
                setRemainingSlots(bookingResult.remainingSlots ?? null);

                // Redirect to bookings page after a short delay
                setTimeout(() => {
                    router.push("/dashboard/bookings");
                    router.refresh();
                }, 2000);
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
            {/* ─── Success Result ─────────────────────────────── */}
            {result?.success && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-green-800">
                                Booking Successful! 🎉
                            </p>
                            <p className="text-sm text-green-700 mt-1">{result.message}</p>
                            {result.remainingSlots !== undefined && (
                                <p className="text-xs text-green-600 mt-2">
                                    Remaining slots: {result.remainingSlots}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Error Result ──────────────────────────────── */}
            {result && !result.success && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-red-800">
                                Booking Failed
                            </p>
                            <p className="text-sm text-red-700 mt-1">{result.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Date Picker ───────────────────────────────── */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                    Select Dive Date
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

            {/* ─── Remaining Capacity Indicator ──────────────── */}
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
                                        ? "Fully booked — no slots left"
                                        : `${remainingSlots} slots available`}
                                </span>
                                <span className="text-xs text-gray-400 block">
                                    out of max {maxCapacity} divers/day
                                </span>
                            </div>
                        </>
                    ) : null}
                </div>
            )}

            {/* ─── Guest Counter ─────────────────────────────── */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                    Number of Divers
                </label>
                <div className="flex items-center justify-between p-1 rounded-lg border border-gray-200">
                    <button
                        onClick={() => handleGuestChange(-1)}
                        disabled={guests <= 1 || isPending}
                        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                            (remainingSlots !== null && guests >= remainingSlots) ||
                            guests >= maxCapacity
                        }
                        className="w-10 h-10 flex items-center justify-center text-primary hover:bg-blue-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ─── Total Summary ─────────────────────────────── */}
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-gray-600 font-medium">Estimated Total</span>
                <span className="text-xl font-bold text-primary">
                    {formatPrice(totalPrice)}
                </span>
            </div>

            {/* ─── CTA Buttons ──────────────────────────────── */}
            <button
                onClick={handleBooking}
                disabled={
                    isPending ||
                    (remainingSlots !== null && remainingSlots === 0) ||
                    result?.success === true
                }
                className="w-full btn-primary py-3.5 text-base flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isPending ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing Booking...
                    </>
                ) : result?.success ? (
                    <>
                        <CheckCircle2 className="w-5 h-5" />
                        Booking Successful
                    </>
                ) : !isLoggedIn && isLoggedIn !== null ? (
                    <>
                        Login to Book
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                ) : (
                    <>
                        Book Now
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </button>

            <button className="w-full py-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-deepSea font-medium transition-colors text-sm flex items-center justify-center gap-2">
                <Info className="w-4 h-4" />
                Contact Support (WA)
            </button>
        </div>
    );
}
