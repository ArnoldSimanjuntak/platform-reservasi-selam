import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database schema (Multi-Layanan & Carrying Capacity)
export type UserRole = "customer" | "provider" | "admin";
export type ServiceType = "boat" | "instructor" | "gear";
export type DiveSiteCategory = "Muck" | "Coral" | "Wreck";
export type BookingStatus = "pending" | "confirmed" | "upcoming" | "in_progress" | "completed" | "cancelled";
export type ZoneLevel = 1 | 2 | 3;

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    created_at?: string;
    updated_at?: string;
}

export interface Provider {
    id: string;
    owner_user_id?: string | null;
    name: string;
    location?: string;
    contact?: string;
    description?: string;
    image_url?: string;
    is_active?: boolean;
    primary_type?: string;
    latitude?: number | null;
    longitude?: number | null;
    business_license_number?: string | null;
    instructor_scope?: string | null;
    safety_checklist?: Record<string, boolean> | null;
    rejection_reason?: string | null;
    verification_submitted_at?: string | null;
    verified_at?: string | null;
    identity_card_url?: string | null;
    certification_url?: string | null;
    verification_status?: 'pending' | 'verified' | 'rejected';
    verification_documents?: import("@/lib/provider-verification").ProviderVerificationDocument[];
    created_at?: string;
    updated_at?: string;
}

export interface Service {
    id: string;
    name: string;
    type: ServiceType;
    price: number;
    dive_site_category: DiveSiteCategory | null;
    description?: string;
    image_url: string;
    provider_id?: string;
    max_capacity: number;
    is_available?: boolean;
    default_start_time?: string | null;
    estimated_duration_minutes?: number | null;
    meeting_instructions?: string | null;
    created_at?: string;
    updated_at?: string;
    // Joined data (optional)
    provider?: Provider;
}

export type PaymentStatus = "unpaid" | "pending_verification" | "paid" | "expired";

export interface Booking {
    id: string;
    user_id: string;
    service_id: string;
    provider_id?: string;
    dive_site_id?: string;
    booking_date: string;
    total_participants: number;
    status: BookingStatus;
    total_price: number;
    payment_status?: PaymentStatus;
    payment_deadline?: string;
    payment_proof_url?: string;
    notes?: string;
    customer_name?: string | null;
    customer_contact?: string | null;
    meeting_point?: string | null;
    meeting_instructions?: string | null;
    provider_contact?: string | null;
    scheduled_start_at?: string | null;
    scheduled_end_at?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    created_at?: string;
    updated_at?: string;
    // Joined data (optional)
    service?: Service;
}

export interface DiveSite {
    id: string;
    name: string;
    zone_level: ZoneLevel;
    surcharge_fee: number;
    description?: string;
    latitude?: number;
    longitude?: number;
    image_url?: string;
    is_active?: boolean;
    kedalaman_meter?: number;
    waktu_tempuh_kapal_menit?: number;
    habitat?: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Provider yang memiliki koordinat pangkalan keberangkatan.
 * Digunakan untuk marker "Pangkalan" di peta dan Route Planner.
 */
export interface ProviderMapPin {
    id: string;
    name: string;
    location?: string;
    contact?: string;
    latitude: number;
    longitude: number;
    primary_type?: string;
}


/**
 * Fetch all available services with provider info, ordered by newest first.
 */
export async function getServices() {
    const result = await supabase
        .from("services")
        .select("*, provider:providers(id, name, location, verification_status, is_active)")
        .eq("is_available", true)
        .order("created_at", { ascending: false });

    if (result.error || !result.data) return result;

    return {
        ...result,
        data: result.data.filter(
            (service) =>
                !!service.provider_id &&
                service.provider?.verification_status === "verified" &&
                service.provider?.is_active === true
        ),
    };
}

/**
 * Fetch a single service by its UUID, including provider info.
 */
export async function getServiceById(id: string) {
    return supabase
        .from("services")
        .select("*, provider:providers(id, name, location, contact, description, latitude, longitude, primary_type, verification_status, is_active)")
        .eq("is_available", true)
        .eq("id", id)
        .single();
}

/**
 * Fetch all active dive sites, ordered by zone level.
 */
export async function getDiveSites() {
    return supabase
        .from("dive_sites")
        .select("*")
        .order("zone_level", { ascending: true });
}

/**
 * Fetch a single dive site by UUID.
 */
export async function getDiveSiteById(id: string) {
    return supabase
        .from("dive_sites")
        .select("*")
        .eq("id", id)
        .single();
}

/**
 * Fetch all available boat services (for booking page).
 */
export async function getBoatServices() {
    const result = await supabase
        .from("services")
        .select("*, provider:providers(id, name, location, verification_status, is_active)")
        .eq("type", "boat")
        .eq("is_available", true)
        .order("price", { ascending: true });

    if (result.error || !result.data) return result;

    return {
        ...result,
        data: result.data.filter(
            (service) =>
                !!service.provider_id &&
                service.provider?.verification_status === "verified" &&
                service.provider?.is_active === true
        ),
    };
}

// ─── Provider Helpers ────────────────────────────────────────────

/**
 * Fetch all active providers.
 */
export async function getProviders() {
    return supabase
        .from("providers")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });
}

/**
 * Fetch a single provider by UUID, including its services.
 */
export async function getProviderById(id: string) {
    return supabase
        .from("providers")
        .select("*, services(*)")
        .eq("id", id)
        .single();
}

/**
 * Fetch services owned by a specific provider.
 * Used in provider dashboard to list their own services.
 */
export async function getServicesByProvider(providerId: string) {
    return supabase
        .from("services")
        .select("*")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false });
}

// ─── Booking Helpers (Marketplace) ───────────────────────────────

/**
 * Fetch all bookings targeted to a specific provider.
 * Requires the denormalized provider_id column on bookings table.
 * Includes service name + type for display in provider dashboard.
 */
export async function getBookingsByProvider(providerId: string) {
    return supabase
        .from("bookings")
        .select("*, service:services(id, name, type)")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false });
}

/**
 * Fetch all bookings for a specific customer.
 * RLS ensures only own bookings are returned.
 * Includes service + provider info for display.
 */
export async function getBookingsByUser(userId: string) {
    return supabase
        .from("bookings")
        .select("*, service:services(id, name, type, price, provider:providers(id, name))")
        .eq("user_id", userId)
        .order("booking_date", { ascending: false });
}

// ─── Resource Helpers ────────────────────────────────────────────

// ─── Carrying Capacity Helpers ───────────────────────────────────

/**
 * Check if a service has enough capacity for the requested participants
 * on a given date. Calls the DB function `check_carrying_capacity`.
 */
export async function checkCapacity(
    serviceId: string,
    bookingDate: string,
    participants: number
) {
    return supabase.rpc("check_carrying_capacity", {
        p_service_id: serviceId,
        p_booking_date: bookingDate,
        p_participants: participants,
    });
}

/**
 * Get the remaining capacity (available slots) for a service on a given date.
 * Calls the DB function `get_remaining_capacity`.
 */
export async function getRemainingCapacity(
    serviceId: string,
    bookingDate: string
) {
    return supabase.rpc("get_remaining_capacity", {
        p_service_id: serviceId,
        p_booking_date: bookingDate,
    });
}

/**
 * Fetch verified boat providers that have base coordinates.
 * Route distance is only meaningful for boat services in this version.
 */
export async function getMapProviders() {
    return supabase
        .from("providers")
        .select("id, name, location, contact, latitude, longitude, primary_type")
        .eq("is_active", true)
        .eq("verification_status", "verified")
        .eq("primary_type", "boat")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("name", { ascending: true });
}
