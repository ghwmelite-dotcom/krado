-- Krado v1 — D1 migration 0001 (starter schema)
-- Money: integer pesewas. Time: UTC ISO-8601 strings. Phones: E.164.

CREATE TABLE artisans (
  id            TEXT PRIMARY KEY,            -- nanoid
  handle        TEXT NOT NULL UNIQUE,        -- krado.app/{handle}
  name          TEXT NOT NULL,
  shop_name     TEXT NOT NULL,
  area          TEXT NOT NULL,               -- e.g. 'Madina, Accra'
  phone         TEXT NOT NULL UNIQUE,        -- E.164, also login identity
  momo_number   TEXT NOT NULL,               -- payout destination (Paystack subaccount/recipient)
  language      TEXT NOT NULL DEFAULT 'en',  -- 'en' | 'tw'
  daily_goal    INTEGER NOT NULL DEFAULT 20000,  -- pesewas (GHS 200)
  deposit_pct   INTEGER NOT NULL DEFAULT 25,     -- percent
  deposit_floor INTEGER NOT NULL DEFAULT 500,    -- pesewas (GHS 5)
  susu_mode     TEXT NOT NULL DEFAULT 'flat',    -- 'flat' | 'pct' | 'off'
  susu_value    INTEGER NOT NULL DEFAULT 500,    -- pesewas or percent
  hours_json    TEXT NOT NULL,               -- {"mon":[480,1080],...} minutes from midnight, null=closed
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  status        TEXT NOT NULL DEFAULT 'active'   -- 'active' | 'paused'
);

CREATE TABLE services (
  id          TEXT PRIMARY KEY,
  artisan_id  TEXT NOT NULL REFERENCES artisans(id),
  name        TEXT NOT NULL,                 -- 'Low fade'
  price       INTEGER NOT NULL,              -- pesewas
  duration_min INTEGER NOT NULL,
  photo_key   TEXT,                          -- R2 object key
  position    INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE clients (
  id         TEXT PRIMARY KEY,
  phone      TEXT NOT NULL UNIQUE,           -- E.164 — the identity
  name       TEXT,                           -- optional, back-filled
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE bookings (
  id           TEXT PRIMARY KEY,
  artisan_id   TEXT NOT NULL REFERENCES artisans(id),
  client_id    TEXT NOT NULL REFERENCES clients(id),
  service_id   TEXT NOT NULL REFERENCES services(id),
  service_name TEXT NOT NULL,                -- denormalized at booking time
  price        INTEGER NOT NULL,             -- denormalized, pesewas
  duration_min INTEGER NOT NULL,             -- denormalized
  deposit      INTEGER NOT NULL,             -- pesewas
  starts_at    TEXT NOT NULL,                -- UTC ISO
  status       TEXT NOT NULL DEFAULT 'locked',
    -- 'locked' | 'completed' | 'no_show' | 'cancelled_by_client' | 'cancelled_by_artisan'
  source       TEXT NOT NULL DEFAULT 'link', -- 'link' | 'nudge' | 'manual'
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_bookings_artisan_day ON bookings(artisan_id, starts_at);
CREATE INDEX idx_bookings_client ON bookings(client_id, starts_at);

CREATE TABLE payments (
  id            TEXT PRIMARY KEY,
  booking_id    TEXT NOT NULL REFERENCES bookings(id),
  provider      TEXT NOT NULL DEFAULT 'paystack',
  reference     TEXT NOT NULL UNIQUE,        -- Paystack reference
  kind          TEXT NOT NULL,               -- 'deposit' | 'refund'
  amount        INTEGER NOT NULL,            -- pesewas
  channel       TEXT,                        -- 'mtn' | 'telecel' | 'at'
  status        TEXT NOT NULL,               -- 'success' | 'failed' | 'reversed'
  raw_json      TEXT,                        -- verify response snapshot
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE susu_ledger (
  id          TEXT PRIMARY KEY,
  artisan_id  TEXT NOT NULL REFERENCES artisans(id),
  booking_id  TEXT REFERENCES bookings(id),
  amount      INTEGER NOT NULL,              -- pesewas (virtual set-aside)
  day         TEXT NOT NULL,                 -- 'YYYY-MM-DD' Accra-local
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_susu_artisan_day ON susu_ledger(artisan_id, day);

CREATE TABLE nudges (
  id          TEXT PRIMARY KEY,
  artisan_id  TEXT NOT NULL REFERENCES artisans(id),
  client_id   TEXT NOT NULL REFERENCES clients(id),
  cycle_days  INTEGER NOT NULL,              -- computed median gap
  due_since   TEXT NOT NULL,                 -- 'YYYY-MM-DD'
  status      TEXT NOT NULL DEFAULT 'pending',
    -- 'pending' | 'sent' | 'dismissed' | 'converted'
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_nudges_unique ON nudges(artisan_id, client_id, due_since);

CREATE TABLE webhook_events (
  provider   TEXT NOT NULL,                  -- 'paystack' | 'whatsapp'
  event_id   TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (provider, event_id)           -- idempotency gate
);

CREATE TABLE message_log (
  id          TEXT PRIMARY KEY,
  recipient   TEXT NOT NULL,                 -- E.164
  template    TEXT NOT NULL,
  language    TEXT NOT NULL DEFAULT 'en',
  booking_id  TEXT,
  wa_message_id TEXT,
  status      TEXT NOT NULL DEFAULT 'queued',
    -- 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_msglog_booking ON message_log(booking_id);
