-- =============================================================
-- MIGRATION: Operational details for services and bookings
-- Adds an agreed schedule, customer/provider contact snapshots,
-- meeting instructions, and actual start/completion timestamps.
-- Safe to run more than once in the Supabase SQL Editor.
-- =============================================================

BEGIN;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS default_start_time TIME,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS meeting_instructions TEXT;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS provider_id UUID,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_contact VARCHAR(30),
  ADD COLUMN IF NOT EXISTS meeting_point TEXT,
  ADD COLUMN IF NOT EXISTS meeting_instructions TEXT,
  ADD COLUMN IF NOT EXISTS provider_contact VARCHAR(30),
  ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE public.bookings b
SET provider_id = s.provider_id
FROM public.services s
WHERE b.service_id = s.id
  AND b.provider_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.services'::regclass
      AND conname = 'services_estimated_duration_minutes_check'
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_estimated_duration_minutes_check
      CHECK (
        estimated_duration_minutes IS NULL
        OR estimated_duration_minutes BETWEEN 30 AND 1440
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND conname = 'bookings_scheduled_time_order_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_scheduled_time_order_check
      CHECK (
        scheduled_start_at IS NULL
        OR scheduled_end_at IS NULL
        OR scheduled_end_at >= scheduled_start_at
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND conname = 'bookings_actual_time_order_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_actual_time_order_check
      CHECK (
        started_at IS NULL
        OR completed_at IS NULL
        OR completed_at >= started_at
      );
  END IF;
END
$$;

-- Fase transisi masih menerima status lama "confirmed" sampai hardening dijalankan.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'upcoming', 'in_progress', 'completed', 'cancelled'));

UPDATE public.bookings b
SET customer_name = u.name
FROM public.users u
WHERE b.user_id = u.id
  AND (b.customer_name IS NULL OR BTRIM(b.customer_name) = '');

UPDATE public.bookings b
SET meeting_point = COALESCE(NULLIF(BTRIM(b.meeting_point), ''), p.location),
    meeting_instructions = COALESCE(
      NULLIF(BTRIM(b.meeting_instructions), ''),
      s.meeting_instructions
    ),
    provider_contact = COALESCE(
      NULLIF(BTRIM(b.provider_contact), ''),
      p.contact
    )
FROM public.services s
JOIN public.providers p ON p.id = s.provider_id
WHERE b.service_id = s.id;

UPDATE public.bookings b
SET scheduled_start_at =
      (b.booking_date + s.default_start_time) AT TIME ZONE 'Asia/Makassar',
    scheduled_end_at = CASE
      WHEN s.type <> 'gear' AND COALESCE(s.estimated_duration_minutes, 0) >= 30
      THEN (
        (b.booking_date + s.default_start_time) AT TIME ZONE 'Asia/Makassar'
      ) + MAKE_INTERVAL(mins => s.estimated_duration_minutes)
      ELSE NULL
    END
FROM public.services s
WHERE b.service_id = s.id
  AND s.default_start_time IS NOT NULL
  AND b.scheduled_start_at IS NULL
  AND b.status IN ('pending', 'confirmed', 'upcoming');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.bookings b
    LEFT JOIN public.users u ON u.id = b.user_id
    WHERE u.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Migration dibatalkan: terdapat bookings.user_id yang tidak ditemukan pada public.users.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'public.bookings'::regclass
      AND c.confrelid = 'public.users'::regclass
      AND c.contype = 'f'
      AND a.attname = 'user_id'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_user_id_users_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'public.bookings'::regclass
      AND c.confrelid = 'public.providers'::regclass
      AND c.contype = 'f'
      AND a.attname = 'provider_id'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_provider_id_providers_fkey
      FOREIGN KEY (provider_id)
      REFERENCES public.providers(id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_start_at
  ON public.bookings(scheduled_start_at);

CREATE INDEX IF NOT EXISTS idx_bookings_provider_id
  ON public.bookings(provider_id);

-- Status aktivitas hanya berubah saat provider menekan tombol mulai/selesai.
-- Fungsi berkala ini kini hanya membatalkan booking pending yang tanggalnya lewat.
CREATE OR REPLACE FUNCTION public.update_booking_statuses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER := 0;
  v_count INTEGER := 0;
BEGIN
  UPDATE public.bookings
  SET payment_status = 'expired', status = 'cancelled', updated_at = NOW()
  WHERE status = 'pending'
    AND payment_status = 'unpaid'
    AND payment_deadline IS NOT NULL
    AND payment_deadline < NOW();

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  UPDATE public.bookings
  SET payment_status = 'expired', status = 'cancelled', updated_at = NOW()
  WHERE status = 'pending'
    AND payment_status IN ('unpaid', 'pending_verification')
    AND booking_date < ((NOW() AT TIME ZONE 'Asia/Makassar')::date);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_updated := v_updated + v_count;
  RETURN v_updated;
END;
$$;

-- Booking yang telah selesai tetap memakai kapasitas pada tanggal bookingnya.
-- Hanya booking cancelled yang mengembalikan slot.
CREATE OR REPLACE FUNCTION public.check_carrying_capacity(
  p_service_id UUID,
  p_booking_date DATE,
  p_participants INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_capacity INTEGER;
  v_current_total INTEGER;
BEGIN
  IF p_participants IS NULL OR p_participants < 1 THEN
    RETURN FALSE;
  END IF;

  SELECT max_capacity INTO v_max_capacity
  FROM public.services
  WHERE id = p_service_id;

  IF v_max_capacity IS NULL THEN
    RAISE EXCEPTION 'Service tidak ditemukan';
  END IF;

  SELECT COALESCE(SUM(total_participants), 0) INTO v_current_total
  FROM public.bookings
  WHERE service_id = p_service_id
    AND booking_date = p_booking_date
    AND status <> 'cancelled'
    AND NOT (
      status = 'pending'
      AND payment_status = 'unpaid'
      AND payment_deadline IS NOT NULL
      AND payment_deadline < NOW()
    );

  RETURN (v_current_total + p_participants) <= v_max_capacity;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_remaining_capacity(
  p_service_id UUID,
  p_booking_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_capacity INTEGER;
  v_current_total INTEGER;
BEGIN
  SELECT max_capacity INTO v_max_capacity
  FROM public.services
  WHERE id = p_service_id;

  IF v_max_capacity IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(total_participants), 0) INTO v_current_total
  FROM public.bookings
  WHERE service_id = p_service_id
    AND booking_date = p_booking_date
    AND status <> 'cancelled'
    AND NOT (
      status = 'pending'
      AND payment_status = 'unpaid'
      AND payment_deadline IS NOT NULL
      AND payment_deadline < NOW()
    );

  RETURN GREATEST(v_max_capacity - v_current_total, 0);
END;
$$;

-- Pemeriksaan kapasitas dan INSERT dilakukan dalam satu transaksi.
-- Lock pada baris service mencegah dua booking bersamaan memakai slot yang sama.
-- DROP diperlukan apabila draft fungsi lama memiliki bentuk RETURNS TABLE berbeda.
DROP FUNCTION IF EXISTS public.create_booking_atomic(
  UUID, DATE, INTEGER, UUID, INTEGER, VARCHAR, TEXT
);

CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_service_id UUID,
  p_booking_date DATE,
  p_total_participants INTEGER,
  p_dive_site_id UUID,
  p_rental_days INTEGER,
  p_customer_contact VARCHAR,
  p_notes TEXT
)
RETURNS TABLE(
  booking_id UUID,
  remaining_slots INTEGER,
  total_price NUMERIC,
  scheduled_start_at TIMESTAMPTZ,
  scheduled_end_at TIMESTAMPTZ,
  payment_deadline TIMESTAMPTZ,
  provider_id UUID,
  service_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_type VARCHAR;
  v_service_name TEXT;
  v_provider_id UUID;
  v_max_capacity INTEGER;
  v_price NUMERIC;
  v_default_start_time TIME;
  v_duration_minutes INTEGER;
  v_meeting_instructions TEXT;
  v_meeting_point TEXT;
  v_provider_contact VARCHAR;
  v_customer_contact VARCHAR;
  v_customer_name TEXT;
  v_surcharge NUMERIC := 0;
  v_total_price NUMERIC;
  v_scheduled_start TIMESTAMPTZ;
  v_scheduled_end TIMESTAMPTZ;
  v_payment_deadline TIMESTAMPTZ;
  v_current_total INTEGER := 0;
  v_booking_id UUID;
  v_rental_days INTEGER := GREATEST(COALESCE(p_rental_days, 1), 1);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Pengguna belum login';
  END IF;

  IF p_total_participants IS NULL OR p_total_participants < 1 THEN
    RAISE EXCEPTION 'Jumlah peserta atau unit tidak valid';
  END IF;

  IF p_booking_date IS NULL THEN
    RAISE EXCEPTION 'Tanggal booking wajib diisi';
  END IF;

  IF p_booking_date < ((NOW() AT TIME ZONE 'Asia/Makassar')::date) THEN
    RAISE EXCEPTION 'Tanggal booking sudah lewat';
  END IF;

  IF v_rental_days > 30 THEN
    RAISE EXCEPTION 'Durasi sewa maksimal 30 hari';
  END IF;

  SELECT
    s.type,
    s.name,
    s.provider_id,
    s.max_capacity,
    s.price,
    s.default_start_time,
    s.estimated_duration_minutes,
    s.meeting_instructions,
    p.location,
    p.contact
  INTO
    v_service_type,
    v_service_name,
    v_provider_id,
    v_max_capacity,
    v_price,
    v_default_start_time,
    v_duration_minutes,
    v_meeting_instructions,
    v_meeting_point,
    v_provider_contact
  FROM public.services s
  JOIN public.providers p ON p.id = s.provider_id
  WHERE s.id = p_service_id
    AND s.is_available = TRUE
    AND p.is_active = TRUE
    AND p.verification_status = 'verified'
  FOR UPDATE OF s, p;

  IF v_service_type IS NULL OR v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Layanan tidak tersedia';
  END IF;

  IF COALESCE(v_max_capacity, 0) < 1 OR v_price IS NULL OR v_price < 0 THEN
    RAISE EXCEPTION 'Kapasitas atau harga layanan tidak valid';
  END IF;

  SELECT COALESCE(NULLIF(BTRIM(name), ''), 'Customer')
  INTO v_customer_name
  FROM public.users
  WHERE id = auth.uid()
    AND role = 'customer';

  IF v_customer_name IS NULL THEN
    RAISE EXCEPTION 'Hanya akun customer yang dapat membuat booking';
  END IF;

  v_customer_contact := REGEXP_REPLACE(COALESCE(p_customer_contact, ''), '[^0-9]', '', 'g');
  IF LEFT(v_customer_contact, 1) = '0' THEN
    v_customer_contact := '62' || SUBSTRING(v_customer_contact FROM 2);
  ELSIF LEFT(v_customer_contact, 1) = '8' THEN
    v_customer_contact := '62' || v_customer_contact;
  END IF;

  IF LENGTH(v_customer_contact) < 10 OR LENGTH(v_customer_contact) > 15 THEN
    RAISE EXCEPTION 'Nomor WhatsApp customer tidak valid';
  END IF;

  v_provider_contact := REGEXP_REPLACE(COALESCE(v_provider_contact, ''), '[^0-9]', '', 'g');
  IF LEFT(v_provider_contact, 1) = '0' THEN
    v_provider_contact := '62' || SUBSTRING(v_provider_contact FROM 2);
  ELSIF LEFT(v_provider_contact, 1) = '8' THEN
    v_provider_contact := '62' || v_provider_contact;
  END IF;

  IF LENGTH(v_provider_contact) < 10 OR LENGTH(v_provider_contact) > 15
     OR NULLIF(BTRIM(v_meeting_point), '') IS NULL THEN
    RAISE EXCEPTION 'Lokasi atau kontak provider belum lengkap';
  END IF;

  IF p_notes IS NOT NULL AND LENGTH(BTRIM(p_notes)) > 500 THEN
    RAISE EXCEPTION 'Catatan maksimal 500 karakter';
  END IF;

  IF v_service_type = 'boat' THEN
    IF p_dive_site_id IS NULL THEN
      RAISE EXCEPTION 'Destinasi selam wajib dipilih';
    END IF;

    SELECT surcharge_fee INTO v_surcharge
    FROM public.dive_sites
    WHERE id = p_dive_site_id AND is_active = TRUE
    FOR UPDATE;

    IF v_surcharge IS NULL THEN
      RAISE EXCEPTION 'Destinasi selam tidak tersedia';
    END IF;
  END IF;

  IF v_default_start_time IS NULL THEN
    RAISE EXCEPTION 'Jam mulai atau pengambilan belum dilengkapi provider';
  END IF;

  v_scheduled_start :=
    (p_booking_date + v_default_start_time) AT TIME ZONE 'Asia/Makassar';

  IF v_service_type <> 'gear' THEN
    IF COALESCE(v_duration_minutes, 0) < 30 THEN
      RAISE EXCEPTION 'Durasi layanan belum dilengkapi provider';
    END IF;

    v_scheduled_end :=
      v_scheduled_start + MAKE_INTERVAL(mins => v_duration_minutes);
  END IF;

  IF v_scheduled_start <= NOW() + INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'Batas pemesanan adalah 1 jam sebelum jadwal mulai';
  END IF;

  v_total_price := CASE
    WHEN v_service_type = 'gear'
      THEN v_price * p_total_participants * v_rental_days
    WHEN v_service_type = 'boat'
      THEN v_price * p_total_participants + v_surcharge
    ELSE v_price * p_total_participants
  END;

  v_payment_deadline := NOW() + INTERVAL '24 hours';
  IF v_scheduled_start IS NOT NULL THEN
    v_payment_deadline := LEAST(
      v_payment_deadline,
      v_scheduled_start - INTERVAL '1 hour'
    );
  END IF;

  UPDATE public.bookings AS b
  SET payment_status = 'expired', status = 'cancelled', updated_at = NOW()
  WHERE b.service_id = p_service_id
    AND b.status = 'pending'
    AND b.payment_status = 'unpaid'
    AND b.payment_deadline IS NOT NULL
    AND b.payment_deadline < NOW();

  IF v_service_type = 'gear' THEN
    SELECT COALESCE(SUM(total_participants), 0)
    INTO v_current_total
    FROM public.bookings
    WHERE service_id = p_service_id
      AND status <> 'cancelled'
      AND daterange(
            booking_date,
            booking_date + GREATEST(COALESCE(rental_days, 1) - 1, 0),
            '[]'
          ) && daterange(
            p_booking_date,
            p_booking_date + (v_rental_days - 1),
            '[]'
          );
  ELSE
    SELECT COALESCE(SUM(total_participants), 0)
    INTO v_current_total
    FROM public.bookings
    WHERE service_id = p_service_id
      AND booking_date = p_booking_date
      AND status <> 'cancelled';
  END IF;

  IF v_current_total + p_total_participants > v_max_capacity THEN
    RAISE EXCEPTION 'Kapasitas tidak cukup. Sisa slot: %',
      GREATEST(v_max_capacity - v_current_total, 0);
  END IF;

  INSERT INTO public.bookings (
    user_id,
    service_id,
    provider_id,
    dive_site_id,
    booking_date,
    total_participants,
    rental_days,
    total_price,
    status,
    payment_status,
    payment_deadline,
    customer_name,
    customer_contact,
    meeting_point,
    meeting_instructions,
    provider_contact,
    scheduled_start_at,
    scheduled_end_at,
    notes
  ) VALUES (
    auth.uid(),
    p_service_id,
    v_provider_id,
    CASE WHEN v_service_type = 'boat' THEN p_dive_site_id ELSE NULL END,
    p_booking_date,
    p_total_participants,
    CASE WHEN v_service_type = 'gear' THEN v_rental_days ELSE NULL END,
    v_total_price,
    'pending',
    'unpaid',
    v_payment_deadline,
    v_customer_name,
    v_customer_contact,
    BTRIM(v_meeting_point),
    NULLIF(BTRIM(v_meeting_instructions), ''),
    v_provider_contact,
    v_scheduled_start,
    v_scheduled_end,
    NULLIF(BTRIM(p_notes), '')
  )
  RETURNING id INTO v_booking_id;

  RETURN QUERY
  SELECT
    v_booking_id,
    v_max_capacity - v_current_total - p_total_participants,
    v_total_price,
    v_scheduled_start,
    v_scheduled_end,
    v_payment_deadline,
    v_provider_id,
    v_service_name;
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking_atomic(
  UUID, DATE, INTEGER, UUID, INTEGER, VARCHAR, TEXT
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_booking_atomic(
  UUID, DATE, INTEGER, UUID, INTEGER, VARCHAR, TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_payment_proof_secure(
  p_booking_id UUID,
  p_payment_proof_url TEXT
)
RETURNS TABLE(provider_id UUID, result_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Pengguna belum login';
  END IF;

  IF p_payment_proof_url IS NULL
     OR LENGTH(p_payment_proof_url) > 2048
     OR p_payment_proof_url !~ (
       '^https://[A-Za-z0-9.-]+\.supabase\.co/storage/v1/object/(public/)?payment-receipts/'
       || auth.uid()::TEXT
       || '/'
       || p_booking_id::TEXT
       || '_[^/?#]+$'
     )
  THEN
    RAISE EXCEPTION 'URL bukti pembayaran tidak valid';
  END IF;

  SELECT b.* INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id
    AND b.user_id = auth.uid()
  FOR UPDATE;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking tidak ditemukan atau bukan milik pengguna';
  END IF;

  IF v_booking.payment_status = 'paid' THEN
    RETURN QUERY SELECT v_booking.provider_id, 'paid'::TEXT;
    RETURN;
  END IF;

  IF v_booking.payment_status = 'pending_verification' THEN
    RETURN QUERY SELECT v_booking.provider_id, 'already_submitted'::TEXT;
    RETURN;
  END IF;

  IF v_booking.status <> 'pending'
     OR v_booking.payment_status <> 'unpaid'
     OR (v_booking.payment_deadline IS NOT NULL AND v_booking.payment_deadline < NOW())
  THEN
    UPDATE public.bookings AS b
    SET payment_status = 'expired', status = 'cancelled', updated_at = NOW()
    WHERE b.id = p_booking_id
      AND b.status = 'pending'
      AND b.payment_status = 'unpaid';

    RETURN QUERY SELECT v_booking.provider_id, 'expired'::TEXT;
    RETURN;
  END IF;

  UPDATE public.bookings AS b
  SET payment_proof_url = p_payment_proof_url,
      payment_status = 'pending_verification',
      updated_at = NOW()
  WHERE b.id = p_booking_id;

  RETURN QUERY SELECT v_booking.provider_id, 'submitted'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_payment_secure(
  p_booking_id UUID,
  p_action TEXT
)
RETURNS TABLE(user_id UUID, result_code TEXT, booking_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_new_deadline TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL OR p_action IS NULL OR p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Aksi verifikasi tidak valid';
  END IF;

  SELECT b.*
  INTO v_booking
  FROM public.bookings b
  JOIN public.providers p ON p.id = b.provider_id
  WHERE b.id = p_booking_id
    AND p.owner_user_id = auth.uid()
    AND p.verification_status = 'verified'
    AND p.is_active = TRUE
  FOR UPDATE OF b;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking tidak ditemukan atau bukan milik provider';
  END IF;

  IF v_booking.payment_status <> 'pending_verification' OR v_booking.status <> 'pending' THEN
    RAISE EXCEPTION 'Pembayaran tidak lagi menunggu verifikasi';
  END IF;

  IF p_action = 'approve'
     AND (
       v_booking.booking_date < ((NOW() AT TIME ZONE 'Asia/Makassar')::date)
       OR (
         v_booking.scheduled_start_at IS NOT NULL
         AND v_booking.scheduled_start_at <= NOW()
       )
     )
  THEN
    UPDATE public.bookings AS b
    SET payment_status = 'expired', status = 'cancelled', updated_at = NOW()
    WHERE b.id = p_booking_id;

    RETURN QUERY SELECT v_booking.user_id, 'approval_expired'::TEXT, 'cancelled'::TEXT;
    RETURN;
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.bookings AS b
    SET payment_status = 'paid', status = 'upcoming', updated_at = NOW()
    WHERE b.id = p_booking_id;

    RETURN QUERY SELECT v_booking.user_id, 'approved'::TEXT, 'upcoming'::TEXT;
    RETURN;
  END IF;

  v_new_deadline := NOW() + INTERVAL '24 hours';
  IF v_booking.scheduled_start_at IS NOT NULL THEN
    v_new_deadline := LEAST(
      v_new_deadline,
      v_booking.scheduled_start_at - INTERVAL '1 hour'
    );
  ELSE
    v_new_deadline := LEAST(
      v_new_deadline,
      ((v_booking.booking_date + TIME '23:59') AT TIME ZONE 'Asia/Makassar')
    );
  END IF;

  IF v_new_deadline <= NOW() THEN
    UPDATE public.bookings AS b
    SET payment_status = 'expired',
        status = 'cancelled',
        payment_proof_url = NULL,
        updated_at = NOW()
    WHERE b.id = p_booking_id;

    RETURN QUERY SELECT v_booking.user_id, 'rejected_expired'::TEXT, 'cancelled'::TEXT;
    RETURN;
  END IF;

  UPDATE public.bookings AS b
  SET payment_status = 'unpaid',
      status = 'pending',
      payment_proof_url = NULL,
      payment_deadline = v_new_deadline,
      updated_at = NOW()
  WHERE b.id = p_booking_id;

  RETURN QUERY SELECT v_booking.user_id, 'rejected_retry'::TEXT, 'pending'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_booking_status_secure(
  p_booking_id UUID,
  p_new_status TEXT
)
RETURNS TABLE(
  user_id UUID,
  service_name TEXT,
  booking_status TEXT,
  changed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_service_name TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_today DATE := ((NOW() AT TIME ZONE 'Asia/Makassar')::date);
BEGIN
  IF auth.uid() IS NULL
     OR p_new_status IS NULL
     OR p_new_status NOT IN ('upcoming', 'in_progress', 'completed', 'cancelled')
  THEN
    RAISE EXCEPTION 'Status booking tidak valid';
  END IF;

  SELECT b.*
  INTO v_booking
  FROM public.bookings b
  JOIN public.providers p ON p.id = b.provider_id
  WHERE b.id = p_booking_id
    AND p.owner_user_id = auth.uid()
    AND p.verification_status = 'verified'
    AND p.is_active = TRUE
  FOR UPDATE OF b;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking tidak ditemukan atau bukan milik provider';
  END IF;

  SELECT s.name INTO v_service_name
  FROM public.services s
  WHERE s.id = v_booking.service_id;

  IF NOT (
    (v_booking.status = 'pending' AND p_new_status IN ('upcoming', 'cancelled'))
    OR (v_booking.status IN ('confirmed', 'upcoming') AND p_new_status IN ('in_progress', 'cancelled'))
    OR (v_booking.status = 'in_progress' AND p_new_status IN ('completed', 'cancelled'))
  ) THEN
    RAISE EXCEPTION 'Transisi status booking tidak diizinkan';
  END IF;

  IF p_new_status = 'upcoming' AND v_booking.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'Booking hanya dapat dikonfirmasi setelah pembayaran lunas';
  END IF;

  IF p_new_status = 'in_progress' THEN
    IF v_booking.payment_status <> 'paid' THEN
      RAISE EXCEPTION 'Aktivitas hanya dapat dimulai setelah pembayaran lunas';
    END IF;

    IF v_booking.booking_date <> v_today THEN
      RAISE EXCEPTION 'Aktivitas hanya dapat dimulai pada tanggal booking';
    END IF;

    IF v_booking.scheduled_start_at IS NOT NULL AND v_now < v_booking.scheduled_start_at THEN
      RAISE EXCEPTION 'Aktivitas belum dapat dimulai sebelum jadwal';
    END IF;
  END IF;

  UPDATE public.bookings AS b
  SET status = p_new_status,
      started_at = CASE
        WHEN p_new_status = 'in_progress' THEN v_now
        ELSE b.started_at
      END,
      completed_at = CASE
        WHEN p_new_status = 'completed' THEN v_now
        ELSE b.completed_at
      END,
      updated_at = v_now
  WHERE b.id = p_booking_id;

  RETURN QUERY SELECT v_booking.user_id, v_service_name, p_new_status, v_now;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_payment_proof_secure(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_payment_secure(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_booking_status_secure(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_payment_proof_secure(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_payment_secure(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_booking_status_secure(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.update_booking_statuses() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_booking_statuses() TO service_role;

CREATE OR REPLACE FUNCTION public.get_gear_available_stock(
  p_service_id UUID,
  p_start_date DATE,
  p_rental_days INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_capacity INTEGER;
  v_booked_units INTEGER;
  v_end_date DATE;
BEGIN
  SELECT max_capacity INTO v_max_capacity
  FROM public.services
  WHERE id = p_service_id AND type = 'gear';

  IF v_max_capacity IS NULL THEN
    RETURN 0;
  END IF;

  v_end_date := p_start_date + (
    LEAST(GREATEST(COALESCE(p_rental_days, 1), 1), 30) - 1
  );

  SELECT COALESCE(SUM(total_participants), 0) INTO v_booked_units
  FROM public.bookings
  WHERE service_id = p_service_id
    AND status <> 'cancelled'
    AND NOT (
      status = 'pending'
      AND payment_status = 'unpaid'
      AND payment_deadline IS NOT NULL
      AND payment_deadline < NOW()
    )
    AND booking_date <= v_end_date
    AND (booking_date + COALESCE(rental_days, 1) - 1) >= p_start_date;

  RETURN GREATEST(v_max_capacity - v_booked_units, 0);
END;
$$;

COMMIT;
