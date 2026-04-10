"use client";

import { useEffect } from "react";
import { X, Trash2, ShoppingBag, ArrowRight, Calendar, Users } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import Image from "next/image";
import Link from "next/link";

export default function CartSidebar() {
    const isOpen = useCartStore((s) => s.isOpen);
    const items = useCartStore((s) => s.items);
    const removeItem = useCartStore((s) => s.removeItem);
    const closeSidebar = useCartStore((s) => s.closeSidebar);
    const getTotal = useCartStore((s) => s.getTotal);
    const clearCart = useCartStore((s) => s.clearCart);

    // Prevent body scroll when sidebar is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

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
        });
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity"
                onClick={closeSidebar}
            />

            {/* Sidebar Panel */}
            <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-deepSea">My Trip</h2>
                            <p className="text-xs text-gray-400">
                                {items.length} {items.length === 1 ? "activity" : "activities"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={closeSidebar}
                        className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                <ShoppingBag className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-700 mb-2">
                                Your trip is empty
                            </h3>
                            <p className="text-sm text-gray-400 max-w-xs">
                                Browse our dive packages and add activities to plan your perfect Lembeh trip.
                            </p>
                            <Link
                                href="/services"
                                onClick={closeSidebar}
                                className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
                            >
                                Browse Packages
                            </Link>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className="group flex gap-4 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                            >
                                {/* Image */}
                                <div className="w-20 h-20 rounded-lg bg-gray-100 relative overflow-hidden flex-shrink-0">
                                    {item.imageUrl ? (
                                        <Image
                                            src={item.imageUrl}
                                            alt={item.serviceName}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-200">
                                            <ShoppingBag className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-deepSea truncate">
                                        {item.serviceName}
                                    </h4>

                                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(item.date)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {item.participants} {item.participants === 1 ? "diver" : "divers"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-sm font-bold text-primary">
                                            {formatPrice(item.price * item.participants)}
                                        </span>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-all"
                                            title="Remove from trip"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t border-gray-100 px-6 py-5 space-y-4 bg-gray-50/50">
                        {/* Total */}
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Estimated Total</span>
                            <span className="text-xl font-bold text-primary">
                                {formatPrice(getTotal())}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={clearCart}
                                className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 font-medium text-sm transition-colors"
                            >
                                Clear
                            </button>
                            <Link
                                href="/cart"
                                onClick={closeSidebar}
                                className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
                            >
                                Checkout
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
