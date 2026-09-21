-- Baseline schema of the Brainwave Academy Supabase project.
--
-- Captured from the live database on 2026-09-21 with pg_dump 17 (schema only, the
-- public schema) plus the pieces pg_dump does not cover: the storage buckets and the
-- storage.objects policies. The seed data (classrooms, holidays) is NOT here; see
-- supabase/README.md.
--
-- Before this file the schema lived only in Supabase, changed by hand in the SQL
-- Editor. From now on every schema or policy change is also written as a new numbered
-- file in this folder (see supabase/README.md), so the database can be rebuilt from git.
--
-- Prerequisites on the target project: the default Supabase roles and the auth /
-- storage schemas (any Supabase project has them) and the pgcrypto / uuid-ossp
-- extensions (enabled by default). Run this on an EMPTY project only.

-- =====================================================================
-- 1. public schema (pg_dump)
-- =====================================================================

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';

--
-- Name: account_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_status AS ENUM (
    'active',
    'inactive',
    'blocked'
);

--
-- Name: application_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.application_status AS ENUM (
    'pending_review',
    'needs_correction',
    'approved',
    'rejected'
);

--
-- Name: attendance_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.attendance_status AS ENUM (
    'present',
    'absent',
    'late'
);

--
-- Name: document_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_status AS ENUM (
    'pending',
    'valid',
    'needs_correction'
);

--
-- Name: document_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_type AS ENUM (
    'birth_certificate',
    'id_photo',
    'proof_of_address',
    'guardian_valid_id'
);

--
-- Name: gender_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gender_type AS ENUM (
    'male',
    'female'
);

--
-- Name: milestone_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.milestone_category AS ENUM (
    'physical_health_motor',
    'character_values',
    'language',
    'social_emotional',
    'cognitive',
    'creative'
);

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'overdue',
    'waived',
    'voided'
);

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'parent',
    'teacher',
    'admin'
);

--
-- Name: auth_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auth_email() RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select email from profiles where id = auth.uid()
$$;

--
-- Name: auth_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auth_role() RETURNS public.user_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select role from profiles where id = auth.uid();
$$;

--
-- Name: enforce_application_documents_parent_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_application_documents_parent_lock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if auth_role() = 'admin' then
    return new;
  end if;
  if new.verification_status is distinct from 'pending' then
    raise exception 'A re-uploaded document must be pending review.';
  end if;
  if to_jsonb(new) - 'file_url' - 'verification_status' is distinct from to_jsonb(old) - 'file_url' - 'verification_status' then
    raise exception 'Only file_url and verification_status may be changed here.';
  end if;
  return new;
end;
$$;

--
-- Name: enforce_applications_parent_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_applications_parent_lock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if auth_role() = 'admin' then
    return new;
  end if;
  if to_jsonb(new) - 'hidden_from_parent' is distinct from to_jsonb(old) - 'hidden_from_parent' then
    raise exception 'Only hidden_from_parent may be changed here.';
  end if;
  return new;
end;
$$;

--
-- Name: enforce_notifications_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_notifications_lock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
                          begin
                            if auth.uid() is null then return new; end if;
                              if to_jsonb(new) - 'read_at' is distinct from to_jsonb(old) - 'read_at' then
                                  raise exception 'Only read_at may be changed here.';
                                    end if;
                                      return new;
                                      end;
                                      $$;

--
-- Name: enforce_students_parent_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_students_parent_lock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if auth_role() = 'admin' then
    return new;
  end if;
  if to_jsonb(new) - 'avatar_url' is distinct from to_jsonb(old) - 'avatar_url' then
    raise exception 'Only avatar_url may be changed here.';
  end if;
  return new;
end;
$$;

--
-- Name: enforce_unenrollment_parent_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_unenrollment_parent_lock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
                                                                                                                                      begin
                                                                                                                                        if auth_role() = 'admin' then return new; end if;
                                                                                                                                          if to_jsonb(new) - 'status' is distinct from to_jsonb(old) - 'status' then
                                                                                                                                              raise exception 'Only status may be changed here.';
                                                                                                                                                end if;
                                                                                                                                                  return new;
                                                                                                                                                  end;
                                                                                                                                                  $$;

--
-- Name: generate_account_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_account_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_prefix text;
  current_year int := extract(year from now());
  next_val int;
begin
  if new.role = 'parent' then
    v_prefix := 'PRT';
  elsif new.role = 'teacher' then
    v_prefix := 'TCH';
  else
    return new;
  end if;

  if new.account_id is not null then
    return new;
  end if;

  insert into ref_counters (prefix, year, last_value)
  values (v_prefix, current_year, 1)
  on conflict (prefix, year)
  do update set last_value = ref_counters.last_value + 1
  returning last_value into next_val;

  new.account_id := v_prefix || '-' || current_year || '-' || lpad(next_val::text, 4, '0');
  return new;
end;
$$;

--
-- Name: generate_application_ref(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_application_ref() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  current_year int := extract(year from now());
  next_val int;
begin
  if new.application_ref is not null then
    return new;
  end if;

  insert into ref_counters (prefix, year, last_value)
  values ('APP', current_year, 1)
  on conflict (prefix, year)
  do update set last_value = ref_counters.last_value + 1
  returning last_value into next_val;

  new.application_ref := 'APP-' || current_year || '-' || lpad(next_val::text, 4, '0');
  return new;
end;
$$;

--
-- Name: generate_receipt_ref(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_receipt_ref() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  current_year int := extract(year from now());
  next_val int;
begin
  if new.receipt_ref is not null then
    return new;
  end if;

  insert into ref_counters (prefix, year, last_value)
  values ('RCT', current_year, 1)
  on conflict (prefix, year)
  do update set last_value = ref_counters.last_value + 1
  returning last_value into next_val;

  new.receipt_ref := 'RCT-' || current_year || '-' || lpad(next_val::text, 4, '0');
    return new;
end;
$$;

--
-- Name: generate_student_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_student_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  current_year int := extract(year from now());
  next_val int;
begin
  if new.student_id is not null then
    return new;
  end if;

  insert into ref_counters (prefix, year, last_value)
  values ('STU', current_year, 1)
  on conflict (prefix, year)
  do update set last_value = ref_counters.last_value + 1
  returning last_value into next_val;

  new.student_id := 'STU-' || current_year || '-' || lpad(next_val::text, 4, '0');
  return new;
end;
$$;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    due_date date,
    status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    transaction_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    fee_type text DEFAULT 'tuition'::text NOT NULL,
    description text,
    payment_method text,
    recorded_by uuid,
    classroom_id uuid,
    receipt_ref text,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payments_fee_type_check CHECK ((fee_type = ANY (ARRAY['tuition'::text, 'activity'::text, 'other'::text]))),
    CONSTRAINT payments_payment_method_check CHECK (((payment_method IS NULL) OR (payment_method = ANY (ARRAY['wallet'::text, 'cash'::text, 'check'::text]))))
);

--
-- Name: pay_fee_with_wallet(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pay_fee_with_wallet(p_payment_id uuid) RETURNS public.payments
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_payment public.payments;
    v_caller uuid := auth.uid();
      v_owns boolean;
      begin
        if v_caller is null then raise exception 'NOT_AUTHENTICATED'; end if;

          select * into v_payment from public.payments where id = p_payment_id for update;
            if v_payment.id is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
              if v_payment.status <> 'pending' then raise exception 'PAYMENT_NOT_PENDING'; end if;

                select exists (
                    select 1 from public.parent_student ps
                        where ps.student_id = v_payment.student_id and ps.parent_id = v_caller
                          ) into v_owns;
                            if not v_owns then raise exception 'NOT_AUTHORIZED'; end if;

                              update public.wallets
                                set balance = balance - v_payment.amount, updated_at = now()
                                  where parent_id = v_caller and balance >= v_payment.amount;
                                    if not found then raise exception 'INSUFFICIENT_BALANCE'; end if;

                                      update public.payments
                                        set status = 'paid', payment_method = 'wallet', transaction_date = now(), recorded_by = v_caller
                                          where id = p_payment_id
                                            returning * into v_payment;

                                              return v_payment;
                                              end;
                                              $$;

--
-- Name: reverse_payment(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reverse_payment(p_payment_id uuid, p_reason text) RETURNS public.payments
    LANGUAGE plpgsql
    AS $$
                    declare
                      v_payment public.payments;
                        v_parent uuid;
                          v_count int;
                            v_new numeric;
                            begin
                              if auth_role() is distinct from 'admin' then raise exception 'NOT_ADMIN'; end if;
                                if p_reason is null or char_length(btrim(p_reason)) < 5 then raise exception 'REASON_REQUIRED'; end if;

                                  select * into v_payment from public.payments where id = p_payment_id for update;
                                    if v_payment.id is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
                                      if v_payment.status <> 'paid' then raise exception 'PAYMENT_NOT_PAID'; end if;

                                        if v_payment.payment_method = 'wallet' then
                                            select ps.parent_id into v_parent from public.parent_student ps
                                                  where ps.student_id = v_payment.student_id and ps.parent_id = v_payment.recorded_by limit 1;
                                                      if v_parent is null then
                                                            select count(*) into v_count from public.parent_student where student_id = v_payment.student_id;
                                                                  if v_count = 1 then
                                                                          select parent_id into v_parent from public.parent_student where student_id = v_payment.student_id;
                                                                                else
                                                                                        raise exception 'PAYER_UNKNOWN';
                                                                                              end if;
                                                                                                  end if;

                                                                                                      update public.wallets set balance = balance + v_payment.amount, updated_at = now()
                                                                                                            where parent_id = v_parent returning balance into v_new;
                                                                                                                if v_new is null then raise exception 'WALLET_NOT_FOUND'; end if;

                                                                                                                    insert into public.wallet_transactions (parent_id, amount, balance_after, note, created_by)
                                                                                                                          values (v_parent, v_payment.amount, v_new,
                                                                                                                                        'Refund: payment reversed (' || coalesce(v_payment.receipt_ref, 'no receipt') || '): ' || btrim(p_reason),
                                                                                                                                                      auth.uid());
                                                                                                                                                        end if;

                                                                                                                                                          update public.payments
                                                                                                                                                              set status = 'pending', payment_method = null, transaction_date = null, recorded_by = null
                                                                                                                                                                  where id = p_payment_id returning * into v_payment;

                                                                                                                                                                    insert into public.payment_adjustments (payment_id, action, reason, before, after, created_by)
                                                                                                                                                                        values (p_payment_id, 'reversed', btrim(p_reason),
                                                                                                                                                                                    jsonb_build_object('status','paid'), jsonb_build_object('status','pending'), auth.uid());

                                                                                                                                                                                      return v_payment;
                                                                                                                                                                                      end;
                                                                                                                                                                                      $$;

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

--
-- Name: stored_profile_privileges(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.stored_profile_privileges(target_id uuid) RETURNS TABLE(role public.user_role, is_super_admin boolean, account_status public.account_status, deleted_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select role, is_super_admin, account_status, deleted_at
  from profiles
  where id = target_id
    and (target_id = auth.uid() or auth_role() = 'admin')
$$;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    action text NOT NULL,
    target_table text,
    target_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: album_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.album_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    album_date date DEFAULT (timezone('Asia/Manila'::text, now()))::date NOT NULL,
    storage_path text NOT NULL,
    uploaded_by uuid NOT NULL,
    classroom_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    posted_by uuid,
    target_role text DEFAULT 'all'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    classroom_id uuid
);

--
-- Name: application_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.application_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    document_type public.document_type NOT NULL,
    file_url text NOT NULL,
    verification_status public.document_status DEFAULT 'pending'::public.document_status NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_ref text NOT NULL,
    student_first_name text NOT NULL,
    student_middle_name text,
    student_last_name text NOT NULL,
    student_dob date NOT NULL,
    student_gender public.gender_type NOT NULL,
    parent_first_name text NOT NULL,
    parent_middle_name text,
    parent_last_name text NOT NULL,
    parent_dob date NOT NULL,
    parent_relationship text NOT NULL,
    parent_contact_number text NOT NULL,
    parent_email text NOT NULL,
    status public.application_status DEFAULT 'pending_review'::public.application_status NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_student_id uuid,
    created_parent_id uuid,
    review_notes text,
    parent_gender public.gender_type,
    hidden_from_parent boolean DEFAULT false NOT NULL,
    archived boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    requested_classroom_id uuid,
    requested_program_options text[] DEFAULT '{}'::text[] NOT NULL
);

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    date date NOT NULL,
    status public.attendance_status NOT NULL,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: authorized_pickups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authorized_pickups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    relationship text,
    phone_number text,
    id_type text,
    id_number text,
    photo_path text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    first_name text,
    middle_name text,
    last_name text
);

--
-- Name: classroom_assistants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classroom_assistants (
    classroom_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: classrooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classrooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    min_age_years integer,
    max_age_years integer,
    lead_teacher_id uuid,
    tuition_fee numeric DEFAULT 0 NOT NULL,
    activity_fee numeric DEFAULT 0 NOT NULL,
    tuition_due_date date,
    activity_due_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT classrooms_activity_fee_check CHECK ((activity_fee >= (0)::numeric)),
    CONSTRAINT classrooms_tuition_fee_check CHECK ((tuition_fee >= (0)::numeric))
);

--
-- Name: do_not_release; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.do_not_release (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT do_not_release_first_name_check CHECK (((char_length(btrim(first_name)) >= 2) AND (char_length(btrim(first_name)) <= 100))),
    CONSTRAINT do_not_release_last_name_check CHECK (((char_length(btrim(last_name)) >= 2) AND (char_length(btrim(last_name)) <= 100))),
    CONSTRAINT do_not_release_note_check CHECK ((char_length(note) <= 500))
);

--
-- Name: emergency_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    "position" integer NOT NULL,
    full_name text NOT NULL,
    relationship text NOT NULL,
    phone_number text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT emergency_contacts_full_name_check CHECK (((char_length(btrim(full_name)) >= 2) AND (char_length(btrim(full_name)) <= 100))),
    CONSTRAINT emergency_contacts_phone_number_check CHECK ((char_length(phone_number) <= 30)),
    CONSTRAINT emergency_contacts_position_check CHECK ((("position" >= 1) AND ("position" <= 3))),
    CONSTRAINT emergency_contacts_relationship_check CHECK ((char_length(relationship) <= 50))
);

--
-- Name: event_rsvps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_rsvps (
    event_id uuid NOT NULL,
    parent_id uuid NOT NULL,
    status text DEFAULT 'going'::text NOT NULL,
    responded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_rsvps_status_check CHECK ((status = ANY (ARRAY['going'::text, 'not_going'::text])))
);

--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    event_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    location text,
    event_type text DEFAULT 'event'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT events_type_check CHECK ((event_type = ANY (ARRAY['event'::text, 'holiday'::text])))
);

--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submitted_by uuid,
    subject text,
    message text NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    image_path text,
    category text DEFAULT 'general'::text NOT NULL,
    admin_response text,
    responded_by uuid,
    responded_at timestamp with time zone,
    CONSTRAINT feedback_category_check CHECK ((category = ANY (ARRAY['bug'::text, 'concern'::text, 'suggestion'::text, 'compliment'::text, 'general'::text, 'other'::text])))
);

--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    category public.milestone_category NOT NULL,
    assessment_date date NOT NULL,
    notes text,
    assessed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: notification_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_log (
    dedupe_key text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    body text,
    href text,
    dedupe_key text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: parent_student; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parent_student (
    parent_id uuid NOT NULL,
    student_id uuid NOT NULL,
    relationship text
);

--
-- Name: payment_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    action text NOT NULL,
    reason text NOT NULL,
    before jsonb,
    after jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_adjustments_action_check CHECK ((action = ANY (ARRAY['waived'::text, 'voided'::text, 'edited'::text, 'reversed'::text]))),
    CONSTRAINT payment_adjustments_reason_check CHECK (((char_length(btrim(reason)) >= 5) AND (char_length(btrim(reason)) <= 500)))
);

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    role public.user_role DEFAULT 'parent'::public.user_role NOT NULL,
    account_id text,
    first_name text NOT NULL,
    middle_name text,
    last_name text NOT NULL,
    email text NOT NULL,
    phone_number text,
    date_of_birth date,
    relationship_to_student text,
    account_status public.account_status DEFAULT 'active'::public.account_status NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gender public.gender_type,
    email_notifications_enabled boolean DEFAULT true NOT NULL,
    sms_notifications_enabled boolean DEFAULT true NOT NULL,
    last_seen_at timestamp with time zone,
    is_super_admin boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone
);

--
-- Name: ref_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ref_counters (
    prefix text NOT NULL,
    year integer NOT NULL,
    last_value integer DEFAULT 0 NOT NULL
);

--
-- Name: student_health; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_health (
    student_id uuid NOT NULL,
    allergies text,
    severe_allergy boolean DEFAULT false NOT NULL,
    medical_conditions text,
    medications text,
    doctor_name text,
    doctor_phone text,
    preferred_hospital text,
    notes text,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_health_allergies_check CHECK ((char_length(allergies) <= 500)),
    CONSTRAINT student_health_doctor_name_check CHECK ((char_length(doctor_name) <= 100)),
    CONSTRAINT student_health_doctor_phone_check CHECK ((char_length(doctor_phone) <= 30)),
    CONSTRAINT student_health_medical_conditions_check CHECK ((char_length(medical_conditions) <= 500)),
    CONSTRAINT student_health_medications_check CHECK ((char_length(medications) <= 500)),
    CONSTRAINT student_health_notes_check CHECK ((char_length(notes) <= 500)),
    CONSTRAINT student_health_preferred_hospital_check CHECK ((char_length(preferred_hospital) <= 150))
);

--
-- Name: student_promotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    school_year text NOT NULL,
    action text NOT NULL,
    from_classroom_id uuid,
    to_classroom_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_promotions_action_check CHECK ((action = ANY (ARRAY['promoted'::text, 'stayed'::text, 'graduated'::text]))),
    CONSTRAINT student_promotions_school_year_check CHECK ((school_year ~ '^\d{4}-\d{4}$'::text))
);

--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    first_name text NOT NULL,
    middle_name text,
    last_name text NOT NULL,
    date_of_birth date NOT NULL,
    gender public.gender_type NOT NULL,
    enrollment_status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    student_id text,
    avatar_url text,
    classroom_id uuid,
    program_options text[] DEFAULT '{}'::text[] NOT NULL
);

--
-- Name: unenrollment_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unenrollment_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    reason text NOT NULL,
    last_day date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    review_note text,
    fee_decision text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unenrollment_requests_fee_decision_check CHECK ((fee_decision = ANY (ARRAY['keep'::text, 'waive'::text]))),
    CONSTRAINT unenrollment_requests_reason_check CHECK (((char_length(btrim(reason)) >= 5) AND (char_length(btrim(reason)) <= 1000))),
    CONSTRAINT unenrollment_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'declined'::text, 'cancelled'::text])))
);

--
-- Name: wallet_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid NOT NULL,
    requested_amount numeric NOT NULL,
    note text,
    status text DEFAULT 'pending'::text NOT NULL,
    approved_amount numeric,
    review_note text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_requests_requested_amount_check CHECK ((requested_amount > (0)::numeric)),
    CONSTRAINT wallet_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text])))
);

--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid NOT NULL,
    amount numeric NOT NULL,
    balance_after numeric,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_transactions_amount_check CHECK ((amount <> (0)::numeric))
);

--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    parent_id uuid NOT NULL,
    balance numeric DEFAULT 2500 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallets_balance_check CHECK ((balance >= (0)::numeric))
);

--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);

--
-- Name: album_photos album_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.album_photos
    ADD CONSTRAINT album_photos_pkey PRIMARY KEY (id);

--
-- Name: album_photos album_photos_storage_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.album_photos
    ADD CONSTRAINT album_photos_storage_path_key UNIQUE (storage_path);

--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);

--
-- Name: application_documents application_documents_app_type_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_documents
    ADD CONSTRAINT application_documents_app_type_unique UNIQUE (application_id, document_type);

--
-- Name: application_documents application_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_documents
    ADD CONSTRAINT application_documents_pkey PRIMARY KEY (id);

--
-- Name: applications applications_application_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_application_ref_key UNIQUE (application_ref);

--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);

--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);

--
-- Name: attendance attendance_student_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_student_id_date_key UNIQUE (student_id, date);

--
-- Name: authorized_pickups authorized_pickups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorized_pickups
    ADD CONSTRAINT authorized_pickups_pkey PRIMARY KEY (id);

--
-- Name: classroom_assistants classroom_assistants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_assistants
    ADD CONSTRAINT classroom_assistants_pkey PRIMARY KEY (classroom_id, teacher_id);

--
-- Name: classrooms classrooms_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_name_key UNIQUE (name);

--
-- Name: classrooms classrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_pkey PRIMARY KEY (id);

--
-- Name: classrooms classrooms_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_slug_key UNIQUE (slug);

--
-- Name: do_not_release do_not_release_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.do_not_release
    ADD CONSTRAINT do_not_release_pkey PRIMARY KEY (id);

--
-- Name: emergency_contacts emergency_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_contacts
    ADD CONSTRAINT emergency_contacts_pkey PRIMARY KEY (id);

--
-- Name: emergency_contacts emergency_contacts_student_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_contacts
    ADD CONSTRAINT emergency_contacts_student_id_position_key UNIQUE (student_id, "position");

--
-- Name: event_rsvps event_rsvps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_rsvps
    ADD CONSTRAINT event_rsvps_pkey PRIMARY KEY (event_id, parent_id);

--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);

--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);

--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);

--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);

--
-- Name: notification_log notification_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_pkey PRIMARY KEY (dedupe_key);

--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

--
-- Name: notifications notifications_user_id_dedupe_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_dedupe_key_key UNIQUE (user_id, dedupe_key);

--
-- Name: parent_student parent_student_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_student
    ADD CONSTRAINT parent_student_pkey PRIMARY KEY (parent_id, student_id);

--
-- Name: payment_adjustments payment_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_adjustments
    ADD CONSTRAINT payment_adjustments_pkey PRIMARY KEY (id);

--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

--
-- Name: profiles profiles_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_account_id_key UNIQUE (account_id);

--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);

--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

--
-- Name: ref_counters ref_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ref_counters
    ADD CONSTRAINT ref_counters_pkey PRIMARY KEY (prefix, year);

--
-- Name: student_health student_health_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_health
    ADD CONSTRAINT student_health_pkey PRIMARY KEY (student_id);

--
-- Name: student_promotions student_promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_promotions
    ADD CONSTRAINT student_promotions_pkey PRIMARY KEY (id);

--
-- Name: student_promotions student_promotions_student_id_school_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_promotions
    ADD CONSTRAINT student_promotions_student_id_school_year_key UNIQUE (student_id, school_year);

--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);

--
-- Name: students students_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_id_key UNIQUE (student_id);

--
-- Name: unenrollment_requests unenrollment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unenrollment_requests
    ADD CONSTRAINT unenrollment_requests_pkey PRIMARY KEY (id);

--
-- Name: wallet_requests wallet_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_requests
    ADD CONSTRAINT wallet_requests_pkey PRIMARY KEY (id);

--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);

--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (parent_id);

--
-- Name: album_photos_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX album_photos_date_idx ON public.album_photos USING btree (album_date DESC, created_at DESC);

--
-- Name: classrooms_lead_teacher_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX classrooms_lead_teacher_unique ON public.classrooms USING btree (lead_teacher_id) WHERE (lead_teacher_id IS NOT NULL);

--
-- Name: do_not_release_student_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX do_not_release_student_idx ON public.do_not_release USING btree (student_id);

--
-- Name: login_attempts_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX login_attempts_email_idx ON public.login_attempts USING btree (email, attempted_at DESC);

--
-- Name: notifications_unread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_unread_idx ON public.notifications USING btree (user_id) WHERE (read_at IS NULL);

--
-- Name: notifications_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_idx ON public.notifications USING btree (user_id, created_at DESC);

--
-- Name: payment_adjustments_payment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_adjustments_payment_idx ON public.payment_adjustments USING btree (payment_id, created_at DESC);

--
-- Name: student_promotions_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_promotions_year_idx ON public.student_promotions USING btree (school_year);

--
-- Name: unenrollment_one_pending_per_student; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unenrollment_one_pending_per_student ON public.unenrollment_requests USING btree (student_id) WHERE (status = 'pending'::text);

--
-- Name: unenrollment_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX unenrollment_requests_status_idx ON public.unenrollment_requests USING btree (status, created_at DESC);

--
-- Name: wallet_transactions_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wallet_transactions_created_at_idx ON public.wallet_transactions USING btree (created_at DESC);

--
-- Name: application_documents application_documents_parent_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER application_documents_parent_lock BEFORE UPDATE ON public.application_documents FOR EACH ROW EXECUTE FUNCTION public.enforce_application_documents_parent_lock();

--
-- Name: applications applications_parent_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER applications_parent_lock BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.enforce_applications_parent_lock();

--
-- Name: notifications notifications_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notifications_lock BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.enforce_notifications_lock();

--
-- Name: students students_parent_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER students_parent_lock BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.enforce_students_parent_lock();

--
-- Name: profiles trg_generate_account_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generate_account_id BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.generate_account_id();

--
-- Name: applications trg_generate_application_ref; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generate_application_ref BEFORE INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.generate_application_ref();

--
-- Name: payments trg_generate_receipt_ref; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generate_receipt_ref BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.generate_receipt_ref();

--
-- Name: students trg_generate_student_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generate_student_id BEFORE INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION public.generate_student_id();

--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: unenrollment_requests unenrollment_parent_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER unenrollment_parent_lock BEFORE UPDATE ON public.unenrollment_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_unenrollment_parent_lock();

--
-- Name: activity_log activity_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id);

--
-- Name: album_photos album_photos_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.album_photos
    ADD CONSTRAINT album_photos_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE SET NULL;

--
-- Name: album_photos album_photos_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.album_photos
    ADD CONSTRAINT album_photos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id);

--
-- Name: announcements announcements_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id);

--
-- Name: announcements announcements_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.profiles(id);

--
-- Name: application_documents application_documents_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_documents
    ADD CONSTRAINT application_documents_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

--
-- Name: application_documents application_documents_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_documents
    ADD CONSTRAINT application_documents_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);

--
-- Name: applications applications_created_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_created_parent_id_fkey FOREIGN KEY (created_parent_id) REFERENCES public.profiles(id);

--
-- Name: applications applications_requested_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_requested_classroom_id_fkey FOREIGN KEY (requested_classroom_id) REFERENCES public.classrooms(id);

--
-- Name: applications applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);

--
-- Name: attendance attendance_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id);

--
-- Name: attendance attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

--
-- Name: authorized_pickups authorized_pickups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorized_pickups
    ADD CONSTRAINT authorized_pickups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

--
-- Name: authorized_pickups authorized_pickups_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authorized_pickups
    ADD CONSTRAINT authorized_pickups_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

--
-- Name: classroom_assistants classroom_assistants_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_assistants
    ADD CONSTRAINT classroom_assistants_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;

--
-- Name: classroom_assistants classroom_assistants_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_assistants
    ADD CONSTRAINT classroom_assistants_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: classrooms classrooms_lead_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_lead_teacher_id_fkey FOREIGN KEY (lead_teacher_id) REFERENCES public.profiles(id);

--
-- Name: do_not_release do_not_release_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.do_not_release
    ADD CONSTRAINT do_not_release_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

--
-- Name: do_not_release do_not_release_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.do_not_release
    ADD CONSTRAINT do_not_release_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

--
-- Name: emergency_contacts emergency_contacts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_contacts
    ADD CONSTRAINT emergency_contacts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

--
-- Name: event_rsvps event_rsvps_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_rsvps
    ADD CONSTRAINT event_rsvps_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

--
-- Name: event_rsvps event_rsvps_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_rsvps
    ADD CONSTRAINT event_rsvps_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

--
-- Name: feedback feedback_responded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.profiles(id);

--
-- Name: feedback feedback_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id);

--
-- Name: applications fk_applications_created_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT fk_applications_created_student FOREIGN KEY (created_student_id) REFERENCES public.students(id);

--
-- Name: milestones milestones_assessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES public.profiles(id);

--
-- Name: milestones milestones_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: parent_student parent_student_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_student
    ADD CONSTRAINT parent_student_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: parent_student parent_student_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_student
    ADD CONSTRAINT parent_student_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

--
-- Name: payment_adjustments payment_adjustments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_adjustments
    ADD CONSTRAINT payment_adjustments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

--
-- Name: payment_adjustments payment_adjustments_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_adjustments
    ADD CONSTRAINT payment_adjustments_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;

--
-- Name: payments payments_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id);

--
-- Name: payments payments_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id);

--
-- Name: payments payments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

--
-- Name: student_health student_health_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_health
    ADD CONSTRAINT student_health_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

--
-- Name: student_health student_health_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_health
    ADD CONSTRAINT student_health_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);

--
-- Name: student_promotions student_promotions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_promotions
    ADD CONSTRAINT student_promotions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

--
-- Name: student_promotions student_promotions_from_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_promotions
    ADD CONSTRAINT student_promotions_from_classroom_id_fkey FOREIGN KEY (from_classroom_id) REFERENCES public.classrooms(id) ON DELETE SET NULL;

--
-- Name: student_promotions student_promotions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_promotions
    ADD CONSTRAINT student_promotions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

--
-- Name: student_promotions student_promotions_to_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_promotions
    ADD CONSTRAINT student_promotions_to_classroom_id_fkey FOREIGN KEY (to_classroom_id) REFERENCES public.classrooms(id) ON DELETE SET NULL;

--
-- Name: students students_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id);

--
-- Name: students students_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id);

--
-- Name: unenrollment_requests unenrollment_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unenrollment_requests
    ADD CONSTRAINT unenrollment_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id);

--
-- Name: unenrollment_requests unenrollment_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unenrollment_requests
    ADD CONSTRAINT unenrollment_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);

--
-- Name: unenrollment_requests unenrollment_requests_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unenrollment_requests
    ADD CONSTRAINT unenrollment_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

--
-- Name: wallet_requests wallet_requests_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_requests
    ADD CONSTRAINT wallet_requests_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: wallet_requests wallet_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_requests
    ADD CONSTRAINT wallet_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);

--
-- Name: wallet_transactions wallet_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

--
-- Name: wallet_transactions wallet_transactions_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id);

--
-- Name: wallets wallets_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

--
-- Name: activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles admins_delete_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_delete_profiles ON public.profiles FOR DELETE USING ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: profiles admins_insert_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_insert_profiles ON public.profiles FOR INSERT WITH CHECK (((public.auth_role() = 'admin'::public.user_role) AND (is_super_admin = false)));

--
-- Name: wallets admins_insert_wallets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_insert_wallets ON public.wallets FOR INSERT WITH CHECK ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: album_photos admins_manage_album_photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_album_photos ON public.album_photos USING ((public.auth_role() = 'admin'::public.user_role)) WITH CHECK ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: feedback admins_manage_all_feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_all_feedback ON public.feedback USING ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: announcements admins_manage_announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_announcements ON public.announcements USING ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: applications admins_manage_applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_applications ON public.applications USING ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: attendance admins_manage_attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_attendance ON public.attendance USING ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: classroom_assistants admins_manage_classroom_assistants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_classroom_assistants ON public.classroom_assistants USING ((public.auth_role() = 'admin'::public.user_role)) WITH CHECK ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: classrooms admins_manage_classrooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_classrooms ON public.classrooms USING ((public.auth_role() = 'admin'::public.user_role)) WITH CHECK ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: do_not_release admins_manage_do_not_release; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_do_not_release ON public.do_not_release USING ((public.auth_role() = 'admin'::public.user_role)) WITH CHECK ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: application_documents admins_manage_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_documents ON public.application_documents USING ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: emergency_contacts admins_manage_emergency_contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_emergency_contacts ON public.emergency_contacts USING ((public.auth_role() = 'admin'::public.user_role)) WITH CHECK ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: events admins_manage_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_events ON public.events USING ((public.auth_role() = 'admin'::public.user_role)) WITH CHECK ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: milestones admins_manage_milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_milestones ON public.milestones USING ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: parent_student admins_manage_parent_student; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_parent_student ON public.parent_student USING ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: payment_adjustments admins_manage_payment_adjustments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_payment_adjustments ON public.payment_adjustments USING ((public.auth_role() = 'admin'::public.user_role)) WITH CHECK ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: payments admins_manage_payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_payments ON public.payments USING ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: student_health admins_manage_student_health; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_student_health ON public.student_health USING ((public.auth_role() = 'admin'::public.user_role)) WITH CHECK ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: student_promotions admins_manage_student_promotions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_student_promotions ON public.student_promotions USING ((public.auth_role() = 'admin'::public.user_role)) WITH CHECK ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: students admins_manage_students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_students ON public.students USING ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: unenrollment_requests admins_manage_unenrollment_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_unenrollment_requests ON public.unenrollment_requests USING ((public.auth_role() = 'admin'::public.user_role)) WITH CHECK ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: wallet_requests admins_manage_wallet_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_wallet_requests ON public.wallet_requests USING ((public.auth_role() = 'admin'::public.user_role)) WITH CHECK ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: wallet_transactions admins_manage_wallet_transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_manage_wallet_transactions ON public.wallet_transactions USING ((public.auth_role() = 'admin'::public.user_role)) WITH CHECK (((public.auth_role() = 'admin'::public.user_role) AND (created_by = auth.uid())));

--
-- Name: profiles admins_update_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_update_profiles ON public.profiles FOR UPDATE USING ((public.auth_role() = 'admin'::public.user_role)) WITH CHECK (((public.auth_role() = 'admin'::public.user_role) AND (NOT (is_super_admin IS DISTINCT FROM ( SELECT stored_profile_privileges.is_super_admin
   FROM public.stored_profile_privileges(profiles.id) stored_profile_privileges(role, is_super_admin, account_status, deleted_at))))));

--
-- Name: wallets admins_update_wallets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_update_wallets ON public.wallets FOR UPDATE USING ((public.auth_role() = 'admin'::public.user_role)) WITH CHECK ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: activity_log admins_view_activity_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_view_activity_log ON public.activity_log FOR SELECT USING ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: profiles admins_view_all_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_view_all_profiles ON public.profiles FOR SELECT USING ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: event_rsvps admins_view_all_rsvps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_view_all_rsvps ON public.event_rsvps FOR SELECT USING ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: wallets admins_view_all_wallets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_view_all_wallets ON public.wallets FOR SELECT USING ((public.auth_role() = 'admin'::public.user_role));

--
-- Name: album_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: classrooms anon_can_view_classrooms_for_enrollment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_can_view_classrooms_for_enrollment ON public.classrooms FOR SELECT TO anon USING (true);

--
-- Name: applications anyone_can_submit_application; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anyone_can_submit_application ON public.applications FOR INSERT WITH CHECK (((status = 'pending_review'::public.application_status) AND (created_parent_id IS NULL) AND (created_student_id IS NULL) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL) AND (hidden_from_parent = false) AND (archived = false) AND (deleted_at IS NULL)));

--
-- Name: application_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: events authenticated_view_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_view_events ON public.events FOR SELECT USING ((auth.uid() IS NOT NULL));

--
-- Name: authorized_pickups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.authorized_pickups ENABLE ROW LEVEL SECURITY;

--
-- Name: classroom_assistants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.classroom_assistants ENABLE ROW LEVEL SECURITY;

--
-- Name: classrooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

--
-- Name: do_not_release; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.do_not_release ENABLE ROW LEVEL SECURITY;

--
-- Name: emergency_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: event_rsvps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements logged_in_users_view_announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY logged_in_users_view_announcements ON public.announcements FOR SELECT USING ((auth.uid() IS NOT NULL));

--
-- Name: classrooms logged_in_users_view_classrooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY logged_in_users_view_classrooms ON public.classrooms FOR SELECT USING ((auth.uid() IS NOT NULL));

--
-- Name: login_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: parent_student; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parent_student ENABLE ROW LEVEL SECURITY;

--
-- Name: applications parent_view_own_applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parent_view_own_applications ON public.applications FOR SELECT USING ((parent_email = ( SELECT profiles.email
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

--
-- Name: unenrollment_requests parents_cancel_own_unenrollment_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_cancel_own_unenrollment_requests ON public.unenrollment_requests FOR UPDATE USING (((public.auth_role() = 'parent'::public.user_role) AND (requested_by = auth.uid()) AND (status = 'pending'::text))) WITH CHECK (((requested_by = auth.uid()) AND (status = 'cancelled'::text)));

--
-- Name: applications parents_hide_own_rejected_applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_hide_own_rejected_applications ON public.applications FOR UPDATE USING (((status = 'rejected'::public.application_status) AND (parent_email = public.auth_email()))) WITH CHECK (((status = 'rejected'::public.application_status) AND (parent_email = public.auth_email())));

--
-- Name: application_documents parents_insert_own_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_insert_own_documents ON public.application_documents FOR INSERT WITH CHECK (((verification_status = 'pending'::public.document_status) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL) AND (EXISTS ( SELECT 1
   FROM public.applications a
  WHERE ((a.id = application_documents.application_id) AND (a.created_parent_id = auth.uid()))))));

--
-- Name: wallet_requests parents_insert_own_wallet_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_insert_own_wallet_requests ON public.wallet_requests FOR INSERT WITH CHECK (((parent_id = auth.uid()) AND (status = 'pending'::text) AND (approved_amount IS NULL) AND (review_note IS NULL) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL)));

--
-- Name: unenrollment_requests parents_insert_unenrollment_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_insert_unenrollment_requests ON public.unenrollment_requests FOR INSERT WITH CHECK (((public.auth_role() = 'parent'::public.user_role) AND (requested_by = auth.uid()) AND (status = 'pending'::text) AND (review_note IS NULL) AND (fee_decision IS NULL) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL) AND (EXISTS ( SELECT 1
   FROM public.parent_student ps
  WHERE ((ps.parent_id = auth.uid()) AND (ps.student_id = unenrollment_requests.student_id))))));

--
-- Name: emergency_contacts parents_manage_own_emergency_contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_manage_own_emergency_contacts ON public.emergency_contacts USING ((EXISTS ( SELECT 1
   FROM public.parent_student ps
  WHERE ((ps.parent_id = auth.uid()) AND (ps.student_id = emergency_contacts.student_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.parent_student ps
  WHERE ((ps.parent_id = auth.uid()) AND (ps.student_id = emergency_contacts.student_id)))));

--
-- Name: event_rsvps parents_manage_own_rsvps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_manage_own_rsvps ON public.event_rsvps USING ((parent_id = auth.uid())) WITH CHECK ((parent_id = auth.uid()));

--
-- Name: student_health parents_manage_own_student_health; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_manage_own_student_health ON public.student_health USING ((EXISTS ( SELECT 1
   FROM public.parent_student ps
  WHERE ((ps.parent_id = auth.uid()) AND (ps.student_id = student_health.student_id))))) WITH CHECK (((updated_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.parent_student ps
  WHERE ((ps.parent_id = auth.uid()) AND (ps.student_id = student_health.student_id))))));

--
-- Name: authorized_pickups parents_manage_own_students_pickups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_manage_own_students_pickups ON public.authorized_pickups USING ((EXISTS ( SELECT 1
   FROM public.parent_student ps
  WHERE ((ps.student_id = authorized_pickups.student_id) AND (ps.parent_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.parent_student ps
  WHERE ((ps.student_id = authorized_pickups.student_id) AND (ps.parent_id = auth.uid())))));

--
-- Name: students parents_update_own_children_avatar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_update_own_children_avatar ON public.students FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.parent_student ps
  WHERE ((ps.student_id = students.id) AND (ps.parent_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.parent_student ps
  WHERE ((ps.student_id = students.id) AND (ps.parent_id = auth.uid())))));

--
-- Name: application_documents parents_update_own_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_update_own_documents ON public.application_documents FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.applications a
  WHERE ((a.id = application_documents.application_id) AND (a.created_parent_id = auth.uid())))));

--
-- Name: album_photos parents_view_album_photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_view_album_photos ON public.album_photos FOR SELECT USING (((public.auth_role() = 'parent'::public.user_role) AND (classroom_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.parent_student ps
     JOIN public.students s ON ((s.id = ps.student_id)))
  WHERE ((ps.parent_id = auth.uid()) AND (s.classroom_id = album_photos.classroom_id) AND (s.enrollment_status = 'active'::text))))));

--
-- Name: attendance parents_view_child_attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_view_child_attendance ON public.attendance FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.parent_student ps
  WHERE ((ps.student_id = attendance.student_id) AND (ps.parent_id = auth.uid())))));

--
-- Name: milestones parents_view_child_milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_view_child_milestones ON public.milestones FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.parent_student ps
  WHERE ((ps.student_id = milestones.student_id) AND (ps.parent_id = auth.uid())))));

--
-- Name: payments parents_view_child_payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_view_child_payments ON public.payments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.parent_student ps
  WHERE ((ps.student_id = payments.student_id) AND (ps.parent_id = auth.uid())))));

--
-- Name: students parents_view_own_children; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_view_own_children ON public.students FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.parent_student ps
  WHERE ((ps.student_id = students.id) AND (ps.parent_id = auth.uid())))));

--
-- Name: application_documents parents_view_own_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_view_own_documents ON public.application_documents FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.applications a
  WHERE ((a.id = application_documents.application_id) AND (a.created_parent_id = auth.uid())))));

--
-- Name: parent_student parents_view_own_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_view_own_links ON public.parent_student FOR SELECT USING ((parent_id = auth.uid()));

--
-- Name: unenrollment_requests parents_view_own_unenrollment_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_view_own_unenrollment_requests ON public.unenrollment_requests FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.parent_student ps
  WHERE ((ps.parent_id = auth.uid()) AND (ps.student_id = unenrollment_requests.student_id)))));

--
-- Name: wallets parents_view_own_wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_view_own_wallet ON public.wallets FOR SELECT USING ((parent_id = auth.uid()));

--
-- Name: wallet_requests parents_view_own_wallet_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parents_view_own_wallet_requests ON public.wallet_requests FOR SELECT USING ((parent_id = auth.uid()));

--
-- Name: payment_adjustments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_adjustments ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: ref_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ref_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: authorized_pickups staff_view_all_pickups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_view_all_pickups ON public.authorized_pickups FOR SELECT USING ((public.auth_role() = ANY (ARRAY['teacher'::public.user_role, 'admin'::public.user_role])));

--
-- Name: student_health; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_health ENABLE ROW LEVEL SECURITY;

--
-- Name: student_promotions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_promotions ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_log system_can_insert_activity_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_can_insert_activity_log ON public.activity_log FOR INSERT WITH CHECK (((actor_id = auth.uid()) OR (actor_id IS NULL)));

--
-- Name: album_photos teachers_delete_own_album_photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_delete_own_album_photos ON public.album_photos FOR DELETE USING (((public.auth_role() = 'teacher'::public.user_role) AND (uploaded_by = auth.uid())));

--
-- Name: album_photos teachers_insert_album_photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_insert_album_photos ON public.album_photos FOR INSERT WITH CHECK (((public.auth_role() = 'teacher'::public.user_role) AND (uploaded_by = auth.uid()) AND (album_date = (timezone('Asia/Manila'::text, now()))::date) AND (classroom_id IS NOT NULL) AND ((EXISTS ( SELECT 1
   FROM public.classrooms c
  WHERE ((c.id = album_photos.classroom_id) AND (c.lead_teacher_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.classroom_assistants a
  WHERE ((a.classroom_id = album_photos.classroom_id) AND (a.teacher_id = auth.uid())))))));

--
-- Name: attendance teachers_manage_attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_manage_attendance ON public.attendance USING ((public.auth_role() = 'teacher'::public.user_role));

--
-- Name: milestones teachers_manage_milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_manage_milestones ON public.milestones USING ((public.auth_role() = 'teacher'::public.user_role));

--
-- Name: announcements teachers_post_announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_post_announcements ON public.announcements FOR INSERT WITH CHECK (((public.auth_role() = 'teacher'::public.user_role) AND (posted_by = auth.uid())));

--
-- Name: album_photos teachers_view_album_photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_view_album_photos ON public.album_photos FOR SELECT USING ((public.auth_role() = 'teacher'::public.user_role));

--
-- Name: do_not_release teachers_view_do_not_release; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_view_do_not_release ON public.do_not_release FOR SELECT USING ((public.auth_role() = 'teacher'::public.user_role));

--
-- Name: emergency_contacts teachers_view_emergency_contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_view_emergency_contacts ON public.emergency_contacts FOR SELECT USING ((public.auth_role() = 'teacher'::public.user_role));

--
-- Name: classroom_assistants teachers_view_own_classroom_assistant_rows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_view_own_classroom_assistant_rows ON public.classroom_assistants FOR SELECT USING ((teacher_id = auth.uid()));

--
-- Name: profiles teachers_view_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_view_profiles ON public.profiles FOR SELECT USING ((public.auth_role() = 'teacher'::public.user_role));

--
-- Name: student_health teachers_view_student_health; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_view_student_health ON public.student_health FOR SELECT USING ((public.auth_role() = 'teacher'::public.user_role));

--
-- Name: students teachers_view_students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_view_students ON public.students FOR SELECT USING ((public.auth_role() = 'teacher'::public.user_role));

--
-- Name: unenrollment_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.unenrollment_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles update_own_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY update_own_profile ON public.profiles FOR UPDATE USING ((id = auth.uid())) WITH CHECK (((id = auth.uid()) AND (role = ( SELECT stored_profile_privileges.role
   FROM public.stored_profile_privileges(auth.uid()) stored_profile_privileges(role, is_super_admin, account_status, deleted_at))) AND (NOT (is_super_admin IS DISTINCT FROM ( SELECT stored_profile_privileges.is_super_admin
   FROM public.stored_profile_privileges(auth.uid()) stored_profile_privileges(role, is_super_admin, account_status, deleted_at)))) AND (account_status = ( SELECT stored_profile_privileges.account_status
   FROM public.stored_profile_privileges(auth.uid()) stored_profile_privileges(role, is_super_admin, account_status, deleted_at))) AND (NOT (deleted_at IS DISTINCT FROM ( SELECT stored_profile_privileges.deleted_at
   FROM public.stored_profile_privileges(auth.uid()) stored_profile_privileges(role, is_super_admin, account_status, deleted_at))))));

--
-- Name: feedback users_insert_own_feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_own_feedback ON public.feedback FOR INSERT WITH CHECK (((submitted_by = auth.uid()) AND (resolved = false) AND (admin_response IS NULL) AND (responded_by IS NULL) AND (responded_at IS NULL)));

--
-- Name: notifications users_mark_own_notifications_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_mark_own_notifications_read ON public.notifications FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

--
-- Name: feedback users_view_own_feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_view_own_feedback ON public.feedback FOR SELECT USING ((submitted_by = auth.uid()));

--
-- Name: notifications users_view_own_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_view_own_notifications ON public.notifications FOR SELECT USING ((user_id = auth.uid()));

--
-- Name: profiles view_announcement_posters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY view_announcement_posters ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.announcements a
  WHERE (a.posted_by = profiles.id))));

--
-- Name: profiles view_own_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY view_own_profile ON public.profiles FOR SELECT USING ((id = auth.uid()));

--
-- Name: wallet_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

-- pg_dump ends with an empty search_path; the storage policies below use unqualified
-- names (auth_role(), user_role), so put the normal one back.
set search_path = public, extensions;

-- =====================================================================
-- 2. Storage buckets
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('album-photos', 'album-photos', false, 5242880, string_to_array('image/jpeg,image/png,image/webp', ','))
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2000000, string_to_array('image/jpeg,image/png,image/gif,image/webp', ','))
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bug-reports', 'bug-reports', false, 5242880, string_to_array('image/jpeg,image/png,image/webp,image/gif', ','))
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, string_to_array('image/jpeg,image/png,image/webp,application/pdf', ','))
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pickup-photos', 'pickup-photos', false, 2000000, string_to_array('image/jpeg,image/png,image/webp', ','))
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- =====================================================================
-- 3. storage.objects policies
-- =====================================================================

create policy "admins_manage_any_avatar" on storage.objects as permissive for all to public
  using (((bucket_id = 'avatars'::text) AND (auth_role() = 'admin'::user_role)))
  with check (((bucket_id = 'avatars'::text) AND (auth_role() = 'admin'::user_role)));

create policy "parents_delete_own_pickup_photos" on storage.objects as permissive for delete to public
  using (((bucket_id = 'pickup-photos'::text) AND (EXISTS ( SELECT 1
   FROM parent_student ps
  WHERE ((ps.parent_id = auth.uid()) AND ((ps.student_id)::text = (storage.foldername(objects.name))[1]))))));

create policy "parents_insert_own_pickup_photos" on storage.objects as permissive for insert to public
  with check (((bucket_id = 'pickup-photos'::text) AND (EXISTS ( SELECT 1
   FROM parent_student ps
  WHERE ((ps.parent_id = auth.uid()) AND ((ps.student_id)::text = (storage.foldername(objects.name))[1]))))));

create policy "parents_manage_own_children_avatar_storage" on storage.objects as permissive for all to public
  using (((bucket_id = 'avatars'::text) AND (EXISTS ( SELECT 1
   FROM parent_student ps
  WHERE ((ps.parent_id = auth.uid()) AND ((storage.foldername(objects.name))[1] = ('student-'::text || (ps.student_id)::text)))))))
  with check (((bucket_id = 'avatars'::text) AND (EXISTS ( SELECT 1
   FROM parent_student ps
  WHERE ((ps.parent_id = auth.uid()) AND ((storage.foldername(objects.name))[1] = ('student-'::text || (ps.student_id)::text)))))));

create policy "parents_replace_own_documents" on storage.objects as permissive for update to public
  using (((bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1
   FROM applications a
  WHERE (((a.id)::text = (storage.foldername(objects.name))[1]) AND (a.created_parent_id = auth.uid()))))));

create policy "parents_select_own_pickup_photos" on storage.objects as permissive for select to public
  using (((bucket_id = 'pickup-photos'::text) AND (EXISTS ( SELECT 1
   FROM parent_student ps
  WHERE ((ps.parent_id = auth.uid()) AND ((ps.student_id)::text = (storage.foldername(objects.name))[1]))))));

create policy "parents_update_own_pickup_photos" on storage.objects as permissive for update to public
  using (((bucket_id = 'pickup-photos'::text) AND (EXISTS ( SELECT 1
   FROM parent_student ps
  WHERE ((ps.parent_id = auth.uid()) AND ((ps.student_id)::text = (storage.foldername(objects.name))[1]))))));

create policy "parents_upload_own_documents" on storage.objects as permissive for insert to public
  with check (((bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1
   FROM applications a
  WHERE (((a.id)::text = (storage.foldername(objects.name))[1]) AND (a.created_parent_id = auth.uid()))))));

create policy "parents_view_own_documents_storage" on storage.objects as permissive for select to public
  using (((bucket_id = 'documents'::text) AND (EXISTS ( SELECT 1
   FROM applications a
  WHERE (((a.id)::text = (storage.foldername(objects.name))[1]) AND (a.created_parent_id = auth.uid()))))));

create policy "teachers_delete_own_album_files" on storage.objects as permissive for delete to public
  using (((bucket_id = 'album-photos'::text) AND (auth_role() = 'teacher'::user_role) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

create policy "teachers_insert_album_files" on storage.objects as permissive for insert to public
  with check (((bucket_id = 'album-photos'::text) AND (auth_role() = 'teacher'::user_role) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

create policy "users_manage_own_avatar" on storage.objects as permissive for all to public
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

create policy "users_upload_own_bug_report_images" on storage.objects as permissive for insert to public
  with check (((bucket_id = 'bug-reports'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
