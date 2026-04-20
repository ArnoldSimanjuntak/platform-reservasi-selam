import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database schema (Multi-Layanan & Carrying Capacity)
export type UserRole = "customer" | "provider";
export type ServiceType = "boat" | "instructor" | "gear";
export type DiveSiteCategory = "Muck" | "Coral" | "Wreck";
export type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
export type ZoneLevel = 1 | 2 | 3;
export type ResourceType = "instructor" | "boat" | "gear";
export type ResourceStatus = "available" | "in_use" | "maintenance";

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
    name: string;
    location?: string;
    contact?: string;
    description?: string;
    image_url?: string;
    is_active?: boolean;
    primary_type?: string;
    identity_card_url?: string;
    certification_url?: string;
    verification_status?: 'pending' | 'verified' | 'rejected';
    created_at?: string;
    updated_at?: string;
}

export interface Service {
    id: string;
    name: string;
    type: ServiceType;
    price: number;
    dive_site_category: DiveSiteCategory;
    description?: string;
    image_url: string;
    provider_id?: string;
    max_capacity: number;
    is_available?: boolean;
    created_at?: string;
    updated_at?: string;
    // Joined data (optional)
    provider?: Provider;
}

export interface Resource {
    id: string;
    provider_id: string;
    type: ResourceType;
    name: string;
    status: ResourceStatus;
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

// ─── Data Fetching Helpers (for Server Components) ───────────────

/**
 * Fetch all available services with provider info, ordered by newest first.
 */
export async function getServices() {
    return supabase
        .from("services")
        .select("*, provider:providers!inner(id, name, location)")
        .eq("provider.verification_status", "verified")
        .order("created_at", { ascending: false });
}

/**
 * Fetch a single service by its UUID, including provider info.
 */
export async function getServiceById(id: string) {
    return supabase
        .from("services")
        .select("*, provider:providers(id, name, location, contact, description)")
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
    return supabase
        .from("services")
        .select("*, provider:providers!inner(id, name, location)")
        .eq("type", "boat")
        .eq("is_available", true)
        .eq("provider.verification_status", "verified")
        .order("price", { ascending: true });
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
 * Fetch a single provider by UUID, including its services and resources.
 */
export async function getProviderById(id: string) {
    return supabase
        .from("providers")
        .select("*, services(*), resources(*)")
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

/**
 * Fetch resources for a specific provider, optionally filtered by type.
 */
export async function getResources(providerId: string, type?: ResourceType) {
    let query = supabase
        .from("resources")
        .select("*")
        .eq("provider_id", providerId);

    if (type) {
        query = query.eq("type", type);
    }

    return query.order("name", { ascending: true });
}

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

