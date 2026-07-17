-- Web Push subscriptions for SulutDive.
-- One browser endpoint belongs to exactly one authenticated account at a time.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    expiration_time BIGINT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ
);

-- Aman dijalankan ulang apabila tabel versi awal sudah pernah dibuat.
ALTER TABLE public.push_subscriptions
    ADD COLUMN IF NOT EXISTS expiration_time BIGINT,
    ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
    ON public.push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_updated_at
    ON public.push_subscriptions(updated_at);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own push subscriptions"
    ON public.push_subscriptions;
CREATE POLICY "Users can read own push subscriptions"
    ON public.push_subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push subscriptions"
    ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
    ON public.push_subscriptions
    FOR DELETE
    USING (auth.uid() = user_id);

-- INSERT and UPDATE are intentionally performed by authenticated Server Actions
-- through the service-role client. This allows an endpoint to be safely moved
-- to the currently signed-in account without exposing that ability to browsers.
