import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Calendar, CreditCard, ChevronLeft, Anchor } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { BookingStatus } from "@/lib/supabase";

export const revalidate = 0; // Don't cache dashboard pages

function getStatusBadge(status: BookingStatus) {
    switch (status) {
        case "completed":
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    Completed
                </span>
            );
        case "upcoming":
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    Upcoming
                </span>
            );
        case "in_progress":
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                    In Progress
                </span>
            );
        case "pending":
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                    Pending
                </span>
            );
        case "cancelled":
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    Cancelled
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    {status}
                </span>
            );
    }
}

export default async function BookingsHistoryPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // If not logged in, redirect to login
    if (!user) {
        redirect("/auth/login");
    }

    // Fetch bookings joined with services table to get service name
    const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
            *,
            service:services (
                name,
                image_url
            )
        `)
        .eq("user_id", user.id)
        .order("booking_date", { ascending: false });

    // Calculate nice strings for dates and currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 bg-neutral-50/50">
            <div className="container mx-auto max-w-4xl">
                {/* Back button & Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-deepSea transition-colors mb-4"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-deepSea">My Diving Trips</h1>
                    <p className="text-gray-500 mt-1">
                        View and manage your booking history.
                    </p>
                </div>

                {/* Booking List */}
                <div className="space-y-6">
                    {/* Error state */}
                    {error ? (
                        <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-center">
                            <p className="text-red-600 font-semibold mb-1">
                                Failed to load bookings.
                            </p>
                            <p className="text-red-500 text-sm">{error.message}</p>
                        </div>
                    ) : bookings && bookings.length > 0 ? (
                        /* Items */
                        bookings.map((booking: any) => (
                            <div
                                key={booking.id}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 hover:shadow-md transition-shadow group flex flex-col md:flex-row gap-6"
                            >
                                {/* Left: Service Image (Optional if service has image) */}
                                <div className="hidden md:block w-32 h-32 rounded-xl bg-gray-100 flex-shrink-0 relative overflow-hidden">
                                    {booking.service?.image_url ? (
                                        <Image
                                            src={booking.service.image_url}
                                            alt={booking.service.name || "Service Image"}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-200">
                                            <Anchor className="w-10 h-10" />
                                        </div>
                                    )}
                                </div>

                                {/* Right: Details */}
                                <div className="flex-1 flex flex-col">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-2">
                                        <div>
                                            {/* Status Badge */}
                                            <div className="mb-2">
                                                {getStatusBadge(booking.status as BookingStatus)}
                                            </div>
                                            <h3 className="text-xl font-bold text-deepSea leading-tight">
                                                {booking.service?.name || "Unknown Service"}
                                            </h3>
                                            <p className="text-sm text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                                                Booking ID: {booking.id.split("-")[0]}
                                            </p>
                                        </div>
                                        
                                        <div className="text-left md:text-right">
                                            <p className="text-sm text-gray-500 font-semibold mb-1">Total Amount</p>
                                            <p className="text-xl font-bold text-primary">
                                                {formatCurrency(booking.total_price)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 gap-4 mt-auto pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                <Calendar className="w-4 h-4 text-blue-500" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-semibold">Dive Date</p>
                                                <p className="text-sm font-semibold text-gray-800">
                                                    {formatDate(booking.booking_date)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                                                <CreditCard className="w-4 h-4 text-green-500" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-semibold">Order Date</p>
                                                <p className="text-sm font-semibold text-gray-800">
                                                    {formatDate(booking.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        /* Empty state */
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                                <Anchor className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-deepSea mb-2">
                                No diving trips yet.
                            </h3>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                You {"haven't"} booked any services. Start exploring our premium muck diving packages!
                            </p>
                            <Link
                                href="/services"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:shadow-lg transition-all"
                            >
                                Explore Packages
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
