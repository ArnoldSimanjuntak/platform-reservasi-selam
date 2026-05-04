-- =============================================
-- SUPABASE DATABASE SCHEMA (LEMBEH REVISED)
-- Platform Reservasi Selam Kawasan Lembeh
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'provider')),
  wants_provider BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_wants_provider ON users(wants_provider);

-- =============================================
-- 2. SERVICES TABLE (REVISED)
-- =============================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('boat', 'instructor', 'gear')),
  price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
  dive_site_category VARCHAR(20) CHECK (dive_site_category IN ('Muck', 'Coral', 'Wreck')),
  image_url TEXT,
  provider_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_services_type ON services(type);
CREATE INDEX idx_services_category ON services(dive_site_category);
CREATE INDEX idx_services_provider ON services(provider_id);

-- =============================================
-- 3. BOOKINGS TABLE
-- =============================================
-- NOTE: user_id has NO FK to custom users table.
-- It stores auth.uid() from Supabase Auth (auth.users).
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  dive_site_id UUID,
  booking_date DATE NOT NULL,
  total_participants INTEGER NOT NULL DEFAULT 1 CHECK (total_participants > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'upcoming', 'in_progress', 'completed', 'cancelled')),
  total_price DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_service ON bookings(service_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- =============================================
-- 4. RLS POLICIES (Standard)
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Services
CREATE POLICY "Public view available services" ON services FOR SELECT USING (is_available = true);
CREATE POLICY "Providers manage own services" ON services FOR ALL USING (auth.uid() = provider_id);

-- Bookings
CREATE POLICY "Users view own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Providers view service bookings" ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM services WHERE id = bookings.service_id AND provider_id = auth.uid())
);
