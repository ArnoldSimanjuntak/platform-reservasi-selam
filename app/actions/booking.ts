"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendPushToProvider, sendPushToUsers } from "@/lib/push/server";
import { normalizeWhatsAppNumber } from "@/lib/formatters";

function buildScheduledDate(bookingDate: string, timeValue: string | null | undefined) {
    if (!timeValue) return null;
    const normalizedTime = timeValue.slice(0, 8);
    const parsed = new Date(`${bookingDate}T${normalizedTime}+08:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getMakassarDateString(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Makassar",
    }).format(date);
}

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
    rentalDays?: number,
    customerContact?: string,
    notes?: string
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
            message: "Silakan login terlebih dahulu untuk membuat booking.",
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
            message: "Data booking belum lengkap. Isi tanggal dan jumlah peserta atau unit.",
        };
    }

    if (totalParticipants < 1) {
        return {
            success: false,
            message: "Jumlah minimal adalah 1 peserta atau unit.",
        };
    }

    const normalizedCustomerContact = normalizeWhatsAppNumber(customerContact);
    if (normalizedCustomerContact.length < 10 || normalizedCustomerContact.length > 15) {
        return {
            success: false,
            message: "Nomor WhatsApp pemesan tidak valid.",
        };
    }

    const cleanedNotes = notes?.trim() || null;
    if (cleanedNotes && cleanedNotes.length > 500) {
        return {
            success: false,
            message: "Catatan tambahan maksimal 500 karakter.",
        };
    }

    // Validate booking date is not in the past (timezone-safe)
    // bookingDate is a YYYY-MM-DD string from the client
    // We compare as strings since YYYY-MM-DD format sorts correctly
    const todayStr = getMakassarDateString();

    if (bookingDate < todayStr) {
        return {
            success: false,
            message: "Tanggal booking tidak boleh berada di masa lalu.",
        };
    }

    // ─── 3. Ambil Data Service (max_capacity, price, provider_id, is_available)
    const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("id, name, type, max_capacity, price, provider_id, is_available, default_start_time, estimated_duration_minutes, meeting_instructions, provider:providers(location, contact, verification_status, is_active)")
        .eq("id", serviceId)
        .single();

    if (serviceError || !service) {
        return {
            success: false,
            message: "Layanan tidak ditemukan.",
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

    const providerRelation = service.provider as
        | { location?: string | null; contact?: string | null; verification_status?: string | null; is_active?: boolean | null }
        | Array<{ location?: string | null; contact?: string | null; verification_status?: string | null; is_active?: boolean | null }>
        | null;
    const providerDetails = Array.isArray(providerRelation)
        ? providerRelation[0] ?? null
        : providerRelation;

    if (
        !providerDetails ||
        providerDetails.verification_status !== "verified" ||
        providerDetails.is_active !== true
    ) {
        return {
            success: false,
            message: "Provider layanan ini sedang tidak aktif atau belum terverifikasi.",
        };
    }

    const providerContact = normalizeWhatsAppNumber(providerDetails.contact);
    const meetingPoint = providerDetails.location?.trim() || "";
    if (providerContact.length < 10 || providerContact.length > 15 || !meetingPoint) {
        return {
            success: false,
            message: "Informasi lokasi atau kontak provider belum lengkap. Silakan pilih layanan lain atau hubungi admin.",
        };
    }

    const durationMinutes = Number(service.estimated_duration_minutes || 0);
    const scheduledStart = buildScheduledDate(bookingDate, service.default_start_time);
    if (!scheduledStart || (service.type !== "gear" && durationMinutes < 30)) {
        return {
            success: false,
            message: service.type === "gear"
                ? "Jam pengambilan alat belum dilengkapi provider. Silakan hubungi provider atau pilih layanan lain."
                : "Jadwal layanan belum dilengkapi provider. Silakan hubungi provider atau pilih layanan lain.",
        };
    }

    const bookingCutoffMs = 60 * 60 * 1000;
    if (scheduledStart && scheduledStart.getTime() <= Date.now() + bookingCutoffMs) {
        return {
            success: false,
            message: "Batas pemesanan layanan ini adalah 1 jam sebelum jadwal mulai. Silakan pilih tanggal berikutnya.",
        };
    }
    // ─── 4. Ambil Surcharge dari Dive Site (jika ada) ───────────
    const normalizedDiveSiteId = service.type === "boat" ? diveSiteId : undefined;

    if (service.type === "boat" && !normalizedDiveSiteId) {
        return {
            success: false,
            message: "Pilih destinasi dive terlebih dahulu untuk layanan kapal.",
        };
    }

    if (normalizedDiveSiteId) {
        const { data: diveSite, error: siteError } = await supabase
            .from("dive_sites")
            .select("id")
            .eq("id", normalizedDiveSiteId)
            .eq("is_active", true)
            .single();

        if (siteError || !diveSite) {
            return {
                success: false,
                message: "Lokasi selam tidak ditemukan atau sedang tidak aktif.",
            };
        }
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

    // Durasi efektif hanya digunakan untuk layanan penyewaan alat.
    const effectiveDays = rentalDays && rentalDays > 0 ? rentalDays : 1;

    // ─── 7. Validasi kapasitas dan simpan booking secara atomik ───
    const { data: bookingRows, error: bookingError } = await supabase.rpc(
        "create_booking_atomic",
        {
            p_service_id: serviceId,
            p_booking_date: bookingDate,
            p_total_participants: totalParticipants,
            p_dive_site_id: normalizedDiveSiteId || null,
            p_rental_days: service.type === "gear" ? effectiveDays : null,
            p_customer_contact: normalizedCustomerContact,
            p_notes: cleanedNotes,
        }
    );

    if (bookingError) {
        console.error("Booking insert error:", bookingError);
        const capacityError = bookingError.message.includes("Kapasitas tidak cukup");
        return {
            success: false,
            message: capacityError
                ? bookingError.message
                : `Gagal membuat booking: ${bookingError.message}`,
        };
    }

    const booking = Array.isArray(bookingRows) ? bookingRows[0] : bookingRows;
    if (!booking?.booking_id) {
        return {
            success: false,
            message: "Booking tidak berhasil disimpan. Silakan coba lagi.",
        };
    }

    const successLabel = service.type === "gear"
        ? `${totalParticipants} unit alat selama ${effectiveDays} hari`
        : `${totalParticipants} penyelam`;
    const authoritativeServiceName = booking.service_name || service.name;
    const authoritativeSchedule = booking.scheduled_start_at
        ? new Date(booking.scheduled_start_at)
        : null;
    const scheduleLabel = authoritativeSchedule && !Number.isNaN(authoritativeSchedule.getTime())
        ? new Intl.DateTimeFormat("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Makassar",
        }).format(authoritativeSchedule)
        : null;

    await sendPushToProvider(booking.provider_id, {
        title: "Booking Baru",
        body: `Pesanan ${userRecord.name} untuk ${authoritativeServiceName} pada ${bookingDate}${scheduleLabel ? ` pukul ${scheduleLabel} WITA` : ""}.`,
        url: "/dashboard/provider/orders",
        tag: `booking-created-${booking.booking_id}`,
        urgency: "high",
        ttlSeconds: 24 * 60 * 60,
    });

    // ─── 10. Invalidate cache agar halaman bookings langsung up-to-date ───
    revalidatePath("/dashboard/bookings");
    revalidatePath("/dashboard");
    revalidatePath("/admin/orders");

    return {
        success: true,
        message: `Booking berhasil! ${successLabel} untuk ${authoritativeServiceName} pada ${bookingDate}${scheduleLabel ? ` pukul ${scheduleLabel} WITA` : ""}.`,
        bookingId: booking.booking_id,
        remainingSlots: Number(booking.remaining_slots),
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

export type BookingStatusAction = "upcoming" | "in_progress" | "completed" | "cancelled";

export interface StatusUpdateResult {
    success: boolean;
    message: string;
    changedAt?: string;
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

    // Validasi kepemilikan, transisi, dan waktu dilakukan atomik di database.
    const { data: updateRows, error: updateError } = await supabase.rpc(
        "update_booking_status_secure",
        { p_booking_id: bookingId, p_new_status: newStatus }
    );

    if (updateError) {
        console.error("Status update error:", updateError);

        return {
            success: false,
            message: `Gagal memperbarui status: ${updateError.message}`,
        };
    }

    const statusUpdate = Array.isArray(updateRows) ? updateRows[0] : updateRows;
    if (!statusUpdate?.user_id) {
        return { success: false, message: "Booking tidak ditemukan atau sudah berubah." };
    }
    const statusUpdatedAt = statusUpdate.changed_at || new Date().toISOString();
    const serviceName = statusUpdate.service_name || "layanan Anda";

    // ─── 7. Broadcast Realtime ke wisatawan jika dive dimulai ────
    if (newStatus === "in_progress") {
        try {
            await supabase.channel(`booking-updates-${statusUpdate.user_id}`).send({
                type: "broadcast",
                event: "dive_started",
                payload: {
                    bookingId,
                    serviceName,
                    message: `Aktivitas selam Anda (${serviceName}) telah dimulai.`,
                    startedAt: statusUpdatedAt,
                },
            });
        } catch (broadcastError) {
            // Non-critical — don't fail the status update if broadcast fails
            console.warn("Realtime broadcast failed (non-critical):", broadcastError);
        }
    }

    const statusLabels: Record<string, string> = {
        upcoming: "Dikonfirmasi",
        in_progress: "Berlangsung",
        completed: "Selesai",
        cancelled: "Dibatalkan",
    };

    await sendPushToUsers([statusUpdate.user_id], {
        title: `Booking ${statusLabels[newStatus] || newStatus}`,
        body: `Status ${serviceName} telah diperbarui menjadi ${statusLabels[newStatus] || newStatus}.`,
        url: "/dashboard/bookings",
        tag: `booking-status-${bookingId}`,
        urgency: "high",
        ttlSeconds: 24 * 60 * 60,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/bookings");
    revalidatePath("/dashboard/provider/orders");
    revalidatePath("/admin/orders");

    return {
        success: true,
        message: `Status booking berhasil diubah menjadi "${statusLabels[newStatus] || newStatus}".`,
        changedAt: statusUpdatedAt,
    };
}
