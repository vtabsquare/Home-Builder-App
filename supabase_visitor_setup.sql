-- ============================================================
-- GBTI Home Builder — Visitor Session & OTP Setup
-- Run this in your Supabase Dashboard SQL Editor
-- ============================================================

-- Enable pgcrypto if not already
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Temporary OTP storage for visitor email verification
CREATE TABLE IF NOT EXISTS visitor_otps (
  email TEXT PRIMARY KEY,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE visitor_otps DISABLE ROW LEVEL SECURITY;

-- Permanent store for verified visitor sessions
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE visitor_sessions DISABLE ROW LEVEL SECURITY;

-- ─── RPC Functions ───────────────────────────────────────────

-- Generate and store a 6-digit OTP for a visitor email
CREATE OR REPLACE FUNCTION send_visitor_otp(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
BEGIN
  v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  INSERT INTO visitor_otps (email, otp_code, expires_at)
  VALUES (LOWER(TRIM(p_email)), v_code, NOW() + INTERVAL '10 minutes')
  ON CONFLICT (email) DO UPDATE SET
    otp_code = v_code,
    expires_at = NOW() + INTERVAL '10 minutes',
    created_at = NOW();

  RETURN v_code;
END;
$$;

-- Verify visitor OTP
CREATE OR REPLACE FUNCTION verify_visitor_otp(p_email TEXT, p_otp TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_valid BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM visitor_otps
    WHERE email = LOWER(TRIM(p_email))
      AND otp_code = p_otp
      AND expires_at > NOW()
  ) INTO v_valid;

  IF v_valid THEN
    DELETE FROM visitor_otps WHERE email = LOWER(TRIM(p_email));
  END IF;

  RETURN v_valid;
END;
$$;

-- Store verified visitor session with device info
CREATE OR REPLACE FUNCTION store_visitor_session(
  p_email TEXT,
  p_device_type TEXT,
  p_browser TEXT,
  p_os TEXT,
  p_screen_width INTEGER,
  p_screen_height INTEGER,
  p_user_agent TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO visitor_sessions (email, device_type, browser, os, screen_width, screen_height, user_agent)
  VALUES (LOWER(TRIM(p_email)), p_device_type, p_browser, p_os, p_screen_width, p_screen_height, p_user_agent)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ============================================================
-- DONE! visitor_otps and visitor_sessions tables are ready.
-- ============================================================
