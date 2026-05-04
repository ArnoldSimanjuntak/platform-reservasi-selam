"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Calendar, Users, Minus, Plus, ShoppingBag, Check, AlertCircle } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { createClient } from "@/lib/supabase/client";

interface AddToTripButtonProps {
    serviceId: string;
    serviceName: string;
    price: number;
    imageUrl: string;
    diveSiteCategory?: string;
    initialIsLoggedIn: boolean;
}

export default function AddToTripButton({
    serviceId,
    serviceName,
    price,
    imageUrl,
    diveSiteCategory,
    initialIsLoggedIn,
}: AddToTripButtonProps) {
    const [date, setDate] = useState("");
    const [participants, setParticipants] = useState(1);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const addItem = useCartStore((s) => s.addItem);
    const openSidebar = useCartStore((s) => s.openSidebar);
    const router = useRouter();
    const pathname = usePathname();
    const [isCheckingAuth, setIsCheckingAuth] = useState(false);

    // Minimum date = tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split("T")[0];

    const handleAdd = () => {
        if (!date) {
            setFeedback({ type: "error", message: "Please select a dive date first." });
            return;
        }

        const result = addItem({
            serviceId,
            serviceName,
            price,
            imageUrl,
            diveSiteCategory,
            date,
            participants,
        });

        setFeedback({ type: result.success ? "success" : "error", message: result.message });

        if (result.success) {
            // Reset form
            setDate("");
            setParticipants(1);
            setIsExpanded(false);

            // Open sidebar to show the added item
            setTimeout(() => openSidebar(), 300);

            // Clear feedback after 3 seconds
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const ensureLoggedIn = async () => {
        if (initialIsLoggedIn) return true;
        setIsCheckingAuth(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) return true;
            router.push(`/auth/login?redirectTo=${encodeURIComponent(pathname)}`);
            return false;
        } finally {
            setIsCheckingAuth(false);
        }
    };

    const handleExpand = async () => {
        const ok = await ensureLoggedIn();
        if (!ok) return;
        setIsExpanded(true);
    };

    return (
        <div className="space-y-3">
            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">or plan a trip</span>
                <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Collapsed state */}
            {!isExpanded ? (
                <button
                    onClick={handleExpand}
                    disabled={isCheckingAuth}
                    className="w-full py-3 rounded-lg border-2 border-dashed border-primary/30 text-primary hover:border-primary hover:bg-primary/5 font-semibold transition-all text-sm flex items-center justify-center gap-2 group"
                >
                    <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    {isCheckingAuth ? "Checking..." : "Add to Trip"}
                </button>
            ) : (
                /* Expanded: date + participants + confirm */
                <div className="space-y-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Date */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                            Dive Date
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="date"
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-gray-700 font-medium bg-white"
                                value={date}
                                min={minDate}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    setFeedback(null);
                                }}
                            />
                        </div>
                    </div>

                    {/* Participants */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                            Divers
                        </label>
                        <div className="flex items-center justify-between p-1 rounded-lg border border-gray-200 bg-white">
                            <button
                                onClick={() => setParticipants(Math.max(1, participants - 1))}
                                disabled={participants <= 1}
                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                <span className="text-sm font-bold text-deepSea">{participants}</span>
                            </div>
                            <button
                                onClick={() => setParticipants(participants + 1)}
                                disabled={participants >= 10}
                                className="w-8 h-8 flex items-center justify-center text-primary hover:bg-blue-50 rounded-md transition-colors disabled:opacity-30"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setIsExpanded(false);
                                setFeedback(null);
                            }}
                            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium text-sm transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            className="flex-1 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            Add
                        </button>
                    </div>
                </div>
            )}

            {/* Feedback message */}
            {feedback && (
                <div
                    className={`flex items-start gap-2 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-2 ${
                        feedback.type === "success"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                >
                    {feedback.type === "success" ? (
                        <Check className="w-4 h-4 mt-0.5 shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    )}
                    <span>{feedback.message}</span>
                </div>
            )}
        </div>
    );
}
