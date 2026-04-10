"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar,
    Users,
    Trash2,
    ShoppingBag,
    ArrowRight,
    ChevronLeft,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Minus,
    Plus,
} from "lucide-react";
import { useCartStore, type CartItem } from "@/lib/cart-store";
import { createBooking } from "@/app/actions/booking";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";

// ─── Item checkout status ────────────────────────────────────
type ItemStatus = "idle" | "loading" | "success" | "error";

interface ItemCheckoutState {
    status: ItemStatus;
    message?: string;
}

export default function CartPage() {
    const router = useRouter();
    const items = useCartStore((s) => s.items);
    const removeItem = useCartStore((s) => s.removeItem);
    const updateItem = useCartStore((s) => s.updateItem);
    const clearCart = useCartStore((s) => s.clearCart);
    const getTotal = useCartStore((s) => s.getTotal);

    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [isPending, startTransition] = useTransition();
    const [itemStates, setItemStates] = useState<Record<string, ItemCheckoutState>>({});
    const [checkoutComplete, setCheckoutComplete] = useState(false);
    const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);

    // Hydration guard for Zustand persist
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);

    // Auth check
    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            setIsLoggedIn(!!user);
        });
    }, []);

    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    // Minimum date = tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split("T")[0];

    const handleDateChange = (itemId: string, newDate: string) => {
        const result = updateItem(itemId, { date: newDate });
        if (!result.success) {
            setUpdateFeedback(result.message);
            setTimeout(() => setUpdateFeedback(null), 3000);
        }
    };

    const handleParticipantsChange = (itemId: string, delta: number) => {
        const item = items.find((i) => i.id === itemId);
        if (!item) return;
        const newVal = item.participants + delta;
        if (newVal >= 1 && newVal <= 10) {
            updateItem(itemId, { participants: newVal });
        }
    };

    // ─── Batch Checkout ──────────────────────────────────────
    const handleCheckout = () => {
        if (!isLoggedIn) {
            router.push("/auth/login?redirectTo=/cart");
            return;
        }

        startTransition(async () => {
            const results: Record<string, ItemCheckoutState> = {};
            let allSuccess = true;

            // Process each item sequentially
            for (const item of items) {
                results[item.id] = { status: "loading" };
                setItemStates({ ...results });

                try {
                    const result = await createBooking(
                        item.serviceId,
                        item.date,
                        item.participants
                    );

                    results[item.id] = {
                        status: result.success ? "success" : "error",
                        message: result.message,
                    };

                    if (!result.success) allSuccess = false;
                } catch (err: any) {
                    results[item.id] = {
                        status: "error",
                        message: err.message || "Unexpected error.",
                    };
                    allSuccess = false;
                }

                setItemStates({ ...results });
            }

            if (allSuccess) {
                setCheckoutComplete(true);
                // Clear cart after short delay so user can see success states
                setTimeout(() => {
                    clearCart();
                    router.push("/dashboard/bookings");
                }, 2000);
            }
        });
    };

    // Don't render until hydrated (prevents mismatch)
    if (!hydrated) {
        return (
            <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 bg-neutral-50/50">
            <div className="container mx-auto max-w-5xl">
                {/* Back & Header */}
                <div className="mb-8">
                    <Link
                        href="/services"
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-deepSea transition-colors mb-4"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Continue Browsing
                    </Link>
                    <h1 className="text-3xl font-bold text-deepSea">Checkout</h1>
                    <p className="text-gray-500 mt-1">
                        Review your trip plan and confirm your bookings.
                    </p>
                </div>

                {/* Update feedback toast */}
                {updateFeedback && (
                    <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {updateFeedback}
                    </div>
                )}

                {items.length === 0 && !checkoutComplete ? (
                    /* Empty cart */
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-deepSea mb-2">Your trip cart is empty</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            Add diving packages to your trip and come back here to checkout.
                        </p>
                        <Link
                            href="/services"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:shadow-lg transition-all"
                        >
                            Explore Packages
                        </Link>
                    </div>
                ) : (
                    /* Main layout */
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left: Cart Items */}
                        <div className="flex-1 space-y-4">
                            {items.map((item, index) => {
                                const state = itemStates[item.id];

                                return (
                                    <div
                                        key={item.id}
                                        className={`bg-white rounded-2xl shadow-sm border p-5 md:p-6 transition-all ${
                                            state?.status === "success"
                                                ? "border-green-200 bg-green-50/30"
                                                : state?.status === "error"
                                                ? "border-red-200 bg-red-50/30"
                                                : state?.status === "loading"
                                                ? "border-blue-200 bg-blue-50/30 animate-pulse"
                                                : "border-gray-100"
                                        }`}
                                    >
                                        <div className="flex gap-4">
                                            {/* Image */}
                                            <div className="hidden sm:block w-24 h-24 rounded-xl bg-gray-100 relative overflow-hidden flex-shrink-0">
                                                {item.imageUrl ? (
                                                    <Image
                                                        src={item.imageUrl}
                                                        alt={item.serviceName}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-200">
                                                        <ShoppingBag className="w-8 h-8" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                                                            Activity {index + 1}
                                                        </span>
                                                        <h3 className="text-lg font-bold text-deepSea mt-0.5">
                                                            {item.serviceName}
                                                        </h3>
                                                    </div>
                                                    {!isPending && (
                                                        <button
                                                            onClick={() => removeItem(item.id)}
                                                            className="w-9 h-9 rounded-xl hover:bg-red-50 flex items-center justify-center transition-colors"
                                                            title="Remove"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-400" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Editable fields */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                                    {/* Date */}
                                                    <div>
                                                        <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                                                            Dive Date
                                                        </label>
                                                        <div className="relative">
                                                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                                            <input
                                                                type="date"
                                                                className="w-full pl-8 pr-2 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-50"
                                                                value={item.date}
                                                                min={minDate}
                                                                onChange={(e) => handleDateChange(item.id, e.target.value)}
                                                                disabled={isPending}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Participants */}
                                                    <div>
                                                        <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                                                            Divers
                                                        </label>
                                                        <div className="flex items-center justify-between p-1 rounded-lg border border-gray-200">
                                                            <button
                                                                onClick={() => handleParticipantsChange(item.id, -1)}
                                                                disabled={item.participants <= 1 || isPending}
                                                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30"
                                                            >
                                                                <Minus className="w-3.5 h-3.5" />
                                                            </button>
                                                            <div className="flex items-center gap-1.5">
                                                                <Users className="w-3.5 h-3.5 text-primary" />
                                                                <span className="text-sm font-bold text-deepSea">{item.participants}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleParticipantsChange(item.id, 1)}
                                                                disabled={item.participants >= 10 || isPending}
                                                                className="w-8 h-8 flex items-center justify-center text-primary hover:bg-blue-50 rounded-md transition-colors disabled:opacity-30"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Price */}
                                                <div className="mt-3 text-right">
                                                    <span className="text-sm text-gray-400">
                                                        {formatPrice(item.price)} × {item.participants} =
                                                    </span>{" "}
                                                    <span className="text-lg font-bold text-primary">
                                                        {formatPrice(item.price * item.participants)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Checkout status message per item */}
                                        {state && state.status !== "idle" && (
                                            <div
                                                className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                                                    state.status === "loading"
                                                        ? "bg-blue-50 text-blue-700"
                                                        : state.status === "success"
                                                        ? "bg-green-50 text-green-700"
                                                        : "bg-red-50 text-red-700"
                                                }`}
                                            >
                                                {state.status === "loading" && (
                                                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                                )}
                                                {state.status === "success" && (
                                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                )}
                                                {state.status === "error" && (
                                                    <XCircle className="w-4 h-4 shrink-0" />
                                                )}
                                                <span>{state.message || "Processing..."}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Right: Order Summary */}
                        <div className="w-full lg:w-80 lg:flex-shrink-0">
                            <div className="sticky top-24">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="bg-gradient-to-r from-primary to-deepSea p-6 text-white text-center">
                                        <h3 className="text-lg font-bold">Trip Summary</h3>
                                        <p className="text-sm opacity-75 mt-1">
                                            {items.length} {items.length === 1 ? "activity" : "activities"} planned
                                        </p>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        {/* Per-item breakdown */}
                                        <div className="space-y-3">
                                            {items.map((item) => (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span className="text-gray-600 truncate mr-2">
                                                        {item.serviceName}
                                                    </span>
                                                    <span className="font-semibold text-gray-800 whitespace-nowrap">
                                                        {formatPrice(item.price * item.participants)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Total */}
                                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                            <span className="font-semibold text-gray-700">Total</span>
                                            <span className="text-2xl font-bold text-primary">
                                                {formatPrice(getTotal())}
                                            </span>
                                        </div>

                                        {/* Checkout button */}
                                        <button
                                            onClick={handleCheckout}
                                            disabled={isPending || checkoutComplete || items.length === 0}
                                            className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isPending ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : checkoutComplete ? (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    All Booked!
                                                </>
                                            ) : isLoggedIn === false ? (
                                                <>
                                                    Login to Checkout
                                                    <ArrowRight className="w-5 h-5" />
                                                </>
                                            ) : (
                                                <>
                                                    Confirm & Book All
                                                    <ArrowRight className="w-5 h-5" />
                                                </>
                                            )}
                                        </button>

                                        {checkoutComplete && (
                                            <p className="text-center text-sm text-green-600 font-medium animate-pulse">
                                                Redirecting to your bookings...
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
