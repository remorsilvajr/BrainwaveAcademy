-- PayMongo test-mode payment gateway support.
--
-- 1. Widens payments.payment_method to allow 'paymongo' alongside the
--    existing wallet | cash | check values.
-- 2. Adds payment_gateway_sessions, a service-role-only audit/idempotency
--    table (RLS on, zero policies, same pattern as notification_log and
--    ref_counters): lets the webhook handler check "have I already
--    processed this checkout session" independent of payments.status, and
--    gives a debugging trail without an admin UI in v1.
--
-- Run this whole block in the Supabase SQL Editor. It is additive and does
-- not touch any existing row.

ALTER TABLE public.payments
  DROP CONSTRAINT payments_payment_method_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IS NULL OR payment_method = ANY (ARRAY['wallet'::text, 'cash'::text, 'check'::text, 'paymongo'::text]));

CREATE TABLE public.payment_gateway_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id uuid NOT NULL REFERENCES public.payments(id),
    provider text DEFAULT 'paymongo'::text NOT NULL,
    provider_session_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    parent_id uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_gateway_sessions_status_check CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text])),
    CONSTRAINT payment_gateway_sessions_provider_session_id_key UNIQUE (provider_session_id)
);

ALTER TABLE public.payment_gateway_sessions ENABLE ROW LEVEL SECURITY;
-- Intentionally zero policies: only the service-role client (the Server
-- Action that creates a checkout session, and the webhook handler) ever
-- reads or writes this table. No admin UI reads it in v1.
