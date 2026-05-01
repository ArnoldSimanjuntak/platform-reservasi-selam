import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Calendar, CreditCard, ChevronLeft, Anchor, Users, Package, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { BookingStatus } from "@/lib/supabase";
import PaymentUploaderCard from "@/components/PaymentUploaderCard";

export const revalidate = 0;

function getStatusBadge(status: BookingStatus) {
    const badges: Record<string, { label: string; bg: string; text: string }> = {
        completed: { label: "Selesai", bg: "bg-green-50 border-green-200", text: "text-green-700" },
        confirmed: { label: "Dikonfirmasi", bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
        in_progress: { label: "Berlangsung", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
        pending: { label: "Menunggu", bg: "bg-gray-100 border-gray-200", text: "text-gray-700" },
        cancelled: { label: "Dibatalkan", bg: "bg-red-50 border-red-200", text: "text-red-600" },
    };
    const b = badges[status] || { label: status, bg: "bg-gray-100 border-gray-200", text: "text-gray-600" };
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${b.bg} ${b.text}`}>
            {b.label}
        </span>
    );
}

export default async function BookingsHistoryPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
            id,
            status,
            booking_date,
            total_participants,
            rental_days,
            total_price,
            payment_status,
            payment_deadline,
            created_at,
            service:services (
                name,
                type,
                image_url
            )
        `)
        .eq("user_id", user.id)
        .order("booking_date", { ascending: false });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString("id-ID", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
        });

    return (
        <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: "linear-gradient(180deg, #f0f7ff 0%, #f9fafb 40%)" }}>
            <div className="container mx-auto max-w-3xl">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary transition-colors mb-3"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Kembali ke Dashboard
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900">Riwayat Perjalanan Selam</h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">
                        Kelola dan lihat semua booking Anda.
                    </p>
                </div>

                {/* Booking List */}
                <div className="space-y-4">
                    {error ? (
                        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center">
                            <p className="text-red-700 font-semibold mb-1">Gagal memuat riwayat booking.</p>
                            <p className="text-red-500 text-sm">{error.message}</p>
                        </div>
                    ) : bookings && bookings.length > 0 ? (
                        bookings.map((booking: any) => (
                            <div
                                key={booking.id}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-4"
                            >
                                {/* Image */}
                                <div className="hidden sm:block w-28 h-28 rounded-xl bg-blue-50 flex-shrink-0 relative overflow-hidden">
                                    {booking.service?.image_url ? (
                                        <Image
                                            src={booking.service.image_url}
                                            alt={booking.service.name || "Service"}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Anchor className="w-8 h-8 text-blue-200" />
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 flex flex-col">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                                        <div>
                                            <div className="mb-1.5">{getStatusBadge(booking.status as BookingStatus)}</div>
                                            <h3 className="text-lg font-bold text-slate-900 leading-tight">
                                                {booking.service?.name || "Layanan Tidak Diketahui"}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">
                                                ID: {booking.id.split("-")[0]}
                                            </p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-xs text-slate-400 font-semibold mb-0.5">Total</p>
                                            <p className="text-lg font-bold text-primary">
                                                {formatCurrency(booking.total_price)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Meta Row — kontekstual berdasarkan tipe layanan */}
                                    {(() => {
                                        const isGearBooking = booking.service?.type === "gear";
                                        return (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-auto pt-3 border-t border-gray-100">
                                                {/* Kolom 1: Tanggal */}
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                        <Calendar className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">
                                                            {isGearBooking ? "Mulai Sewa" : "Tanggal Selam"}
                                                        </p>
                                                        <p className="text-sm font-semibold text-slate-800">{formatDate(booking.booking_date)}</p>
                                                    </div>
                                                </div>

                                                {/* Kolom 2: Unit × Hari (gear) atau Penyelam (boat) */}
                                                {isGearBooking ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                                                            <Package className="w-4 h-4 text-teal-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 uppercase font-semibold">Unit × Durasi</p>
                                                            <p className="text-sm font-semibold text-slate-800">
                                                                {booking.total_participants} unit × {booking.rental_days ?? 1} hari
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                                                            <Users className="w-4 h-4 text-green-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 uppercase font-semibold">Penyelam</p>
                                                            <p className="text-sm font-semibold text-slate-800">{booking.total_participants} orang</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Kolom 3: Tanggal selesai sewa (gear) atau Tanggal pesan (boat) */}
                                                {isGearBooking && booking.rental_days ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                            <Clock className="w-4 h-4 text-blue-500" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 uppercase font-semibold">Selesai Sewa</p>
                                                            <p className="text-sm font-semibold text-slate-800">
                                                                {formatDate(
                                                                    new Date(
                                                                        new Date(booking.booking_date).getTime() +
                                                                        (booking.rental_days - 1) * 86400000
                                                                    ).toISOString().split("T")[0]
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                                                            <CreditCard className="w-4 h-4 text-amber-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 uppercase font-semibold">Dipesan</p>
                                                            <p className="text-sm font-semibold text-slate-800">{formatDate(booking.created_at)}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    
                                    {/* Payment Upload Component (Conditionally Injected) */}
                                    {(booking.payment_status === "unpaid" || booking.payment_status === "pending_verification") && booking.status === "pending" && (
                                        <PaymentUploaderCard 
                                            bookingId={booking.id}
                                            paymentDeadline={booking.payment_deadline}
                                            initialStatus={booking.payment_status}
                                        />
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                                <Anchor className="w-10 h-10 text-blue-200" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                                Belum ada perjalanan.
                            </h3>
                            <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm leading-relaxed">
                                Anda belum pernah memesan layanan. Jelajahi paket selam premium muck diving di Selat Lembeh!
                            </p>
                            <Link
                                href="/services"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg"
                                style={{ background: "linear-gradient(135deg, #023E8A, #0077B6)" }}
                            >
                                Jelajahi Paket Selam
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
