import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database schema (Revised for Lembeh)
export type UserRole = "customer" | "provider";
export type ServiceType = "boat" | "instructor" | "gear";
export type DiveSiteCategory = "Muck" | "Coral" | "Wreck";
export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface Service {
    id: string;
    name: string;
    type: ServiceType;
    price: number;
    dive_site_category: DiveSiteCategory; // New field
    description?: string;
    image_url: string;
}

export interface Booking {
    id: string;
    user_id: string;
    service_id: string;
    booking_date: string;
    status: BookingStatus;
    total_price: number;
}
