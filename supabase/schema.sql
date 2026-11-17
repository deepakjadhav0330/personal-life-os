-- ═══════════════════════════════════════════════════════════════
-- Life OS — Supabase Database Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'suspended')),
  registered_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at         TIMESTAMPTZ,
  last_login_at       TIMESTAMPTZ,
  last_active_at      TIMESTAMPTZ,
  suspended_at        TIMESTAMPTZ,
  suspended_reason    TEXT,
  has_seen_disclosure BOOLEAN NOT NULL DEFAULT false
);

-- ── 2. access_requests ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS access_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID REFERENCES auth.users(id),
  rejection_reason TEXT
);

-- ── 3. user_sessions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_key      TEXT NOT NULL UNIQUE,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  is_estimated_end BOOLEAN NOT NULL DEFAULT false,
  platform         TEXT,
  app_version      TEXT
);

-- ── 4. analytics_events ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name  TEXT NOT NULL,
  session_id  UUID REFERENCES user_sessions(id),
  event_key   TEXT UNIQUE,
  properties  JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. user_analytics_daily ───────────────────────────────────
CREATE TABLE IF NOT EXISTS user_analytics_daily (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                   DATE NOT NULL,
  sessions_count         INTEGER NOT NULL DEFAULT 0,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  events_count           INTEGER NOT NULL DEFAULT 0,
  modules_used           TEXT[] NOT NULL DEFAULT '{}',
  UNIQUE (user_id, date)
);

-- ── Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ae_user_id     ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ae_occurred_at ON analytics_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_ae_event_name  ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_ae_event_key   ON analytics_events(event_key);
CREATE INDEX IF NOT EXISTS idx_us_user_id     ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_us_started_at  ON user_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_ual_user_date  ON user_analytics_daily(user_id, date);
CREATE INDEX IF NOT EXISTS idx_ual_date       ON user_analytics_daily(date);

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics_daily ENABLE ROW LEVEL SECURITY;

-- profiles: user reads own; admin reads/writes all
CREATE POLICY "own_profile"    ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "admin_profiles" ON profiles USING (
  (auth.jwt()->'app_metadata'->>'role') = 'admin'
);

-- access_requests: no direct client access (Edge Functions use service role)
-- analytics_events: user reads own; admin reads all
CREATE POLICY "own_events"    ON analytics_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_events"  ON analytics_events FOR SELECT USING (
  (auth.jwt()->'app_metadata'->>'role') = 'admin'
);

-- user_sessions: user reads own; admin reads all
CREATE POLICY "own_sessions"  ON user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_sessions" ON user_sessions FOR SELECT USING (
  (auth.jwt()->'app_metadata'->>'role') = 'admin'
);

-- user_analytics_daily: admin reads all only
CREATE POLICY "admin_daily"   ON user_analytics_daily FOR SELECT USING (
  (auth.jwt()->'app_metadata'->>'role') = 'admin'
);

-- ── Helper function: count active days ─────────────────────────
-- Used by admin-user-detail Edge Function
CREATE OR REPLACE FUNCTION count_active_days(p_user_id UUID, p_since TIMESTAMPTZ)
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT occurred_at::date)::INTEGER
  FROM analytics_events
  WHERE user_id = p_user_id
    AND occurred_at >= p_since
    AND event_name = 'module_opened';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
