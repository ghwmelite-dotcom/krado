-- Daily funnel counters. Holds live only in KV (they vanish on expiry or
-- conversion), so we can't derive hold→lock conversion after the fact —
-- we count the events as they happen. Keyed (day, name); incremented via UPSERT.
CREATE TABLE metric_counters (
  day    TEXT NOT NULL,            -- 'YYYY-MM-DD' Accra-local
  name   TEXT NOT NULL,            -- 'holds_created' | 'holds_locked'
  count  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, name)
);
