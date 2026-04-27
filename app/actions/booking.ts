"use server";

import { createClient } from "@/lib/supabase/server";

export interface BookingResult {
    success: boolean;
    message: string;
    bookingId?: string;
    remainingSlots?: number;
}

/**
 * Server Action: Cek stok gear yang tersedia untuk rentang tanggal tertentu.
 * Menggunakan RPC get_gear_available_stock yang memperhitungkan overlap sewa.
 */
export async function getGearAvailableStock(
    serviceId: string,
    startDate: string,
    rentalDays: number = 1
): Promise<{ available: number; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_gear_available_stock", {
        p_service_id: serviceId,
        p_start_date: startDate,
        p_rental_days: rentalDays,
    });

    if (error) {
        console.error("Gear stock check error:", error);
        return { available: 0, error: error.message };
    }

    return { available: data as number };
}

/**
 * Server Action: Membuat booking baru dengan validasi marketplace.
 *
 * Alur:
 * 1. Verifikasi user sudah login (auth session)
 * 2. Validasi input (serviceId, date, participants, tanggal tidak lampau)
 * 3. Ambil data service (max_capacity, price, provider_id, is_available)
 *    3a. Validasi layanan masih tersedia (is_available)
 *    3b. Validasi layanan memiliki provider (provider_id)
 * 4. Jika ada diveSiteId, ambil surcharge_fee dari dive_sites
 * 5. Hitung stok/kapasitas berdasarkan tipe (gear vs boat/instructor)
 * 6. Jika stok/slot tidak cukup → return error + sisa slot
 * 7. Hitung total_price berdasarkan tipe layanan
 * 8. INSERT booking → return success
 */
export async function createBooking(
    serviceId: string,
    bookingDate: string,
    totalParticipants: number,
    diveSiteId?: string,
    rentalDays?: number
): Promise<BookingResult> {
    const supabase = await createClient();

    // ─── 1. Verifikasi Auth Session ─────────────────────────────
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            success: false,
            message: "Please log in first to make a booking.",
        };
    }

    // ─── 1b. Role Constraint: Hanya 'customer' yang boleh booking ────
    // Query dari tabel users (ground truth) — jangan andalkan user_metadata saja.
    const { data: userRecord } = await supabase
        .from("users")
        .select("role, name")
        .eq("id", user.id)
        .single();
    
    // Tolak jika user tidak terdaftar di tabel users (ghost auth user)
    if (!userRecord) {
        return {
            success: false,
            message: "Akun Anda belum terdaftar lengkap. Silakan hubungi admin.",
        };
    }

    // Fallback: jika kolom role kosong di DB, cek user_metadata
    const role = userRecord.role || user?.user_metadata?.role;

    if (role !== "customer") {
        const roleLabel: Record<string, string> = {
            admin: "Admin",
            provider: "Provider",
        };
        return {
            success: false,
            message: `Pemesanan hanya diperbolehkan untuk wisatawan. Akun ${roleLabel[role] || role} tidak dapat melakukan booking.`,
        };
    }

    // ─── 2. Validasi Input ──────────────────────────────────────
    if (!serviceId || !bookingDate || !totalParticipants) {
        return {
            success: false,
            message: "Incomplete booking data. Please provide date and number of participants.",
        };
    }

    if (totalParticipants < 1) {
        return {
            success: false,
            message: "Minimum of 1 participant is required.",
        };
    }

    // Validate booking date is not in the past (timezone-safe)
    // bookingDate is a YYYY-MM-DD string from the client
    // We compare as strings since YYYY-MM-DD format sorts correctly
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (bookingDate < todayStr) {
        return {
            success: false,
            message: "Booking date cannot be in the past.",
        };
    }

    // ─── 3. Ambil Data Service (max_capacity, price, provider_id, is_available)
    const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("id, name, max_capacity, price, provider_id, is_available")
        .eq("id", serviceId)
        .single();

    if (serviceError || !service) {
        return {
            success: false,
            message: "Service not found.",
        };
    }

    // ─── 3a. Validasi: Layanan harus tersedia ───────────────────
    if (service.is_available === false) {
        return {
            success: false,
            message: `Layanan "${service.name}" sedang tidak tersedia saat ini. Silakan pilih layanan lain.`,
        };
    }

    // ─── 3b. Validasi: Layanan harus memiliki provider ──────────
    if (!service.provider_id) {
        console.error(`Service ${serviceId} has no provider_id assigned.`);
        return {
            success: false,
            message: "Layanan ini belum terhubung ke penyedia jasa. Silakan hubungi admin.",
        };
    }

    // ─── 4. Ambil Surcharge dari Dive Site (jika ada) ───────────
    let surcharge = 0;
    if (diveSiteId) {
        const { data: diveSite, error: siteError } = await supabase
            .from("dive_sites")
            .select("id, surcharge_fee")
            .eq("id", diveSiteId)
            .single();

        if (siteError || !diveSite) {
            return {
                success: false,
                message: "Dive site not found.",
            };
        }
        surcharge = diveSite.surcharge_fee;
    }

    // ─── 5. Validasi Stok / Kapasitas berdasarkan tipe layanan ────
    let remaining = 0;

    if (service.type === "gear") {
        // Gear: validasi berdasarkan stok unit dengan overlap tanggal sewa.
        // Gunakan RPC get_gear_available_stock untuk akurasi.
        const { data: gearStock, error: gearError } = await supabase.rpc(
            "get_gear_available_stock",
            {
                p_service_id: serviceId,
                p_start_date: bookingDate,
                p_rental_days: rentalDays && rentalDays > 0 ? rentalDays : 1,
            }
        );

        if (gearError) {
            console.error("Gear stock check error:", gearError);
            return {
                success: false,
                message: "Gagal memeriksa ketersediaan stok. Silakan coba lagi.",
            };
        }

        remaining = gearStock as number;

        // ─── 6a. Validasi stok gear ───────────────────────────────
        if (remaining <= 0) {
            return {
                success: false,
                message: "Stok alat habis untuk periode sewa yang Anda pilih. Coba tanggal lain.",
                remainingSlots: 0,
            };
        }

        if (totalParticipants > remaining) {
            return {
                success: false,
                message: `Stok tidak cukup. Tersedia: ${remaining} unit untuk periode ini.`,
                remainingSlots: remaining,
            };
        }
    } else {
        // Boat / Instructor: validasi berdasarkan carrying capacity per hari.
        const { data: remainingCapacity, error: capacityError } = await supabase.rpc(
            "get_remaining_capacity",
            {
                p_service_id: serviceId,
                p_booking_date: bookingDate,
            }
        );

        if (capacityError) {
            console.error("Capacity check error:", capacityError);
            return {
                success: false,
                message: "Gagal memeriksa ketersediaan. Silakan coba lagi.",
            };
        }

        remaining = remainingCapacity as number;

        // ─── 6b. Validasi carrying capacity ──────────────────────
        if (remaining <= 0) {
            return {
                success: false,
                message: `Maaf, kapasitas tanggal ${bookingDate} sudah penuh.`,
                remainingSlots: 0,
            };
        }

        if (totalParticipants > remaining) {
            return {
                success: false,
                message: `Kapasitas tidak cukup. Sisa slot tersedia: ${remaining} penyelam.`,
                remainingSlots: remaining,
            };
        }
    }

    // ─── 7. Hitung Total Harga ───────────────────────────────────
    // Gear: harga × jumlah unit × durasi sewa (hari)
    // Boat: harga × jumlah penyelam + surcharge jarak ke lokasi
    // Instructor: harga × jumlah penyelam (per hari, tanpa surcharge)
    const effectiveDays = rentalDays && rentalDays > 0 ? rentalDays : 1;
    let totalPrice: number;

    if (service.type === "gear") {
        // Gear: price per unit per day × quantity × days
        totalPrice = service.price * totalParticipants * effectiveDays;
    } else if (diveSiteId && surcharge > 0) {
        // Boat dengan surcharge jarak ke dive site
        totalPrice = service.price * totalParticipants + surcharge;
    } else {
        // Instructor atau boat tanpa surcharge
        totalPrice = service.price * totalParticipants;
    }

    // ─── 8. Hitung Payment Deadline (24 jam dari sekarang) ────────
    const paymentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // ─── 9. INSERT Booking dengan semua field yang benar ─────────
    const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
            user_id: user.id,
            service_id: serviceId,
            provider_id: service.provider_id || null,
            dive_site_id: diveSiteId || null,
            booking_date: bookingDate,
            total_participants: totalParticipants,   // jumlah penyelam ATAU jumlah unit gear
            rental_days: service.type === "gear" ? effectiveDays : null,  // hanya untuk gear
            total_price: totalPrice,
            status: "pending",
            payment_status: "unpaid",
            payment_deadline: paymentDeadline,
        })
        .select("id")
        .single();

    if (bookingError) {
        console.error("Booking insert error:", bookingError);
        return {
            success: false,
            message: `Gagal membuat booking: ${bookingError.message}`,
        };
    }

    const successLabel = service.type === "gear"
        ? `${totalParticipants} unit alat selama ${effectiveDays} hari`
        : `${totalParticipants} penyelam`;

    return {
        success: true,
        message: `Booking berhasil! ${successLabel} untuk ${service.name} mulai ${bookingDate}.`,
        bookingId: booking.id,
        remainingSlots: remaining - totalParticipants,
    };
}

/**
 * Server Action: Ambil sisa kapasitas untuk tanggal tertentu.
 * Digunakan oleh BookingForm untuk menampilkan availability secara real-time.
 */
export async function getRemainingSlots(
    serviceId: string,
    bookingDate: string
): Promise<{ remaining: number; error?: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_remaining_capacity", {
        p_service_id: serviceId,
        p_booking_date: bookingDate,
    });

    if (error) {
        return { remaining: 0, error: error.message };
    }

    return { remaining: data as number };
}

// ─── Status Management ──────────────────────────────────────────

export type BookingStatusAction = "confirmed" | "in_progress" | "completed" | "cancelled";

export interface StatusUpdateResult {
    success: boolean;
    message: string;
}

/**
 * Server Action: Update status booking.
 * Hanya pemilik layanan (provider) yang sah yang bisa mengubah status.
 *
 * Alur:
 * 1. Verifikasi auth session
 * 2. Ambil data booking + service + provider
 * 3. Verifikasi bahwa user adalah owner dari provider yang memiliki service tersebut
 * 4. Validasi transisi status yang diizinkan
 * 5. Untuk in_progress: validasi tanggal = hari ini
 * 6. Update status booking
 * 7. Broadcast notifikasi realtime ke wisatawan jika dive dimulai
 */
export async function updateBookingStatus(
    bookingId: string,
    newStatus: BookingStatusAction
): Promise<StatusUpdateResult> {
    const supabase = await createClient();

    // ─── 1. Verifikasi Auth ─────────────────────────────────────
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, message: "Silakan login terlebih dahulu." };
    }

    // ─── 2. Ambil booking beserta relasi ─────────────────────────
    const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, status, service_id, provider_id, user_id, booking_date, service:services(id, name)")
        .eq("id", bookingId)
        .single();

    if (bookingError || !booking) {
        return { success: false, message: "Booking tidak ditemukan." };
    }

    // ─── 3. Verifikasi Kepemilikan Provider ─────────────────────
    const { data: provider, error: providerError } = await supabase
        .from("providers")
        .select("id")
        .eq("id", booking.provider_id)
        .eq("owner_user_id", user.id)
        .single();

    if (providerError || !provider) {
        return {
            success: false,
            message: "Anda tidak memiliki izin untuk mengubah status booking ini.",
        };
    }

    // ─── 4. Validasi Transisi Status ────────────────────────────
    const allowedTransitions: Record<string, string[]> = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["in_progress", "cancelled"],
        in_progress: ["completed", "cancelled"],
    };

    const currentStatus = booking.status;
    const allowed = allowedTransitions[currentStatus];

    if (!allowed || !allowed.includes(newStatus)) {
        return {
            success: false,
            message: `Tidak bisa mengubah status dari "${currentStatus}" ke "${newStatus}".`,
        };
    }

    // ─── 5. Untuk in_progress: validasi tanggal = hari ini ──────
    if (newStatus === "in_progress") {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        if (booking.booking_date !== todayStr) {
            return {
                success: false,
                message: `Dive hanya bisa dimulai pada tanggal booking (${booking.booking_date}). Hari ini: ${todayStr}.`,
            };
        }
    }

    // ─── 6. Update Status ────────────────────────────────────────
    const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", bookingId);

    if (updateError) {
        console.error("Status update error:", updateError);

        // Handle specific RLS / permission errors
        if (updateError.code === "42501" || updateError.message.includes("policy")) {
            return {
                success: false,
                message: "Gagal memperbarui: Anda tidak memiliki izin (kebijakan RLS). Hubungi admin.",
            };
        }

        return {
            success: false,
            message: `Gagal memperbarui status: ${updateError.message}`,
        };
    }

    // ─── 7. Broadcast Realtime ke wisatawan jika dive dimulai ────
    if (newStatus === "in_progress") {
        try {
            const serviceName = (booking.service as { name?: string })?.name || "Layanan";
            await supabase.channel(`booking-updates-${booking.user_id}`).send({
                type: "broadcast",
                event: "dive_started",
                payload: {
                    bookingId,
                    serviceName,
                    message: `Aktivitas selam Anda (${serviceName}) telah dimulai! 🤿`,
                    startedAt: new Date().toISOString(),
                },
            });
        } catch (broadcastError) {
            // Non-critical — don't fail the status update if broadcast fails
            console.warn("Realtime broadcast failed (non-critical):", broadcastError);
        }
    }

    const statusLabels: Record<string, string> = {
        confirmed: "Dikonfirmasi",
        in_progress: "Berlangsung",
        completed: "Selesai",
        cancelled: "Dibatalkan",
    };

    return {
        success: true,
        message: `Status booking berhasil diubah menjadi "${statusLabels[newStatus] || newStatus}".`,
    };
}
