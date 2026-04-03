-- Run this in your Supabase SQL Editor to set up the traffic incidents table.

CREATE TABLE IF NOT EXISTS traffic_incidents (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type        VARCHAR(100),
    latitude    NUMERIC,
    longitude   NUMERIC,
    message     TEXT UNIQUE,
    recorded_at  TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: run this if the table already exists
-- ALTER TABLE traffic_incidents ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Index for fast date-range filtering
CREATE INDEX IF NOT EXISTS idx_traffic_incidents_recorded_at
    ON traffic_incidents(recorded_at);

-- Index for fast type filtering
CREATE INDEX IF NOT EXISTS idx_traffic_incidents_type
    ON traffic_incidents(type);

-- Enable Row Level Security (recommended)
ALTER TABLE traffic_incidents ENABLE ROW LEVEL SECURITY;

-- Allow public read access (used by the React frontend with the anon key)
CREATE POLICY "Allow public read"
    ON traffic_incidents
    FOR SELECT
    USING (true);
