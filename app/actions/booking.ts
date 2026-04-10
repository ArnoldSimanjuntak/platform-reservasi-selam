"use server";

import { createClient } from "@/lib/supabase/server";

export interface BookingResult {
    success: boolean;
    message: string;
    bookingId?: string;
    remainingSlots?: number;
}

/**
 * Server Action: Membuat booking baru dengan validasi carrying capacity.
 *
 * Alur:
 * 1. Verifikasi user sudah login (auth session)
 * 2. Validasi input (serviceId, date, participants)
 * 3. Ambil max_capacity dari service
 * 4. Jika ada diveSiteId, ambil surcharge_fee dari dive_sites
 * 5. Hitung sisa kapasitas via get_remaining_capacity RPC
 * 6. Jika slot tidak cukup → return error + sisa slot
 * 7. Jika cukup → INSERT booking → return success
 */
export async function createBooking(
    serviceId: string,
    bookingDate: string,
    totalParticipants: number,
    diveSiteId?: string
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

    // ─── 3. Ambil Data Service (max_capacity & price) ───────────
    const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("id, name, max_capacity, price")
        .eq("id", serviceId)
        .single();

    if (serviceError || !service) {
        return {
            success: false,
            message: "Service not found.",
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

    // ─── 5. Cek Sisa Kapasitas (Carrying Capacity) ─────────────
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
            message: "Failed to check availability. Please try again later.",
        };
    }

    const remaining = remainingCapacity as number;

    // ─── 6. Validasi Carrying Capacity ─────────────────────────
    if (remaining <= 0) {
        return {
            success: false,
            message: `Sorry, capacity for ${bookingDate} is fully booked.`,
            remainingSlots: 0,
        };
    }

    if (totalParticipants > remaining) {
        return {
            success: false,
            message: `Insufficient capacity. Remaining slots available: ${remaining} divers.`,
            remainingSlots: remaining,
        };
    }

    // ─── 7. Hitung Total Harga & INSERT Booking ────────────────
    const totalPrice = service.price * totalParticipants + surcharge;

    const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
            user_id: user.id,
            service_id: serviceId,
            dive_site_id: diveSiteId || null,
            booking_date: bookingDate,
            total_participants: totalParticipants,
            total_price: totalPrice,
            status: "pending",
        })
        .select("id")
        .single();

    if (bookingError) {
        console.error("Booking insert error:", bookingError);
        return {
            success: false,
            message: `Failed to create booking: ${bookingError.message}`,
        };
    }

    return {
        success: true,
        message: `Booking confirmed successfully! ${totalParticipants} diver(s) for ${service.name} on ${bookingDate}.`,
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
