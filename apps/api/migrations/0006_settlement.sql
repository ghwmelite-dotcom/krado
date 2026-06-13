-- Settlement & payout engine. Krado collects deposits (Paystack) and owes each
-- artisan their net; this is the ledger of what's owed and what's been paid.
--
-- Entries are accrued per booking (idempotent via booking_id UNIQUE) when it
-- completes or no-shows AND the deposit was collected by Krado (provider
-- 'paystack'). Manual transfers never accrue — the client paid the artisan
-- directly. Unpaid entries (payout_id IS NULL) sum to the artisan's balance.

CREATE TABLE settlement_entries (
  id          TEXT PRIMARY KEY,
  artisan_id  TEXT NOT NULL REFERENCES artisans(id),
  booking_id  TEXT NOT NULL UNIQUE REFERENCES bookings(id),
  gross       INTEGER NOT NULL,            -- deposit Krado holds (pesewas)
  fee         INTEGER NOT NULL,            -- Krado's retained fee (0 on no_show)
  net         INTEGER NOT NULL,            -- owed to artisan = gross - fee
  reason      TEXT NOT NULL,               -- 'completed' | 'no_show'
  payout_id   TEXT REFERENCES payouts(id), -- NULL until included in a payout
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_settlement_unpaid ON settlement_entries(artisan_id, payout_id);

CREATE TABLE payouts (
  id           TEXT PRIMARY KEY,
  artisan_id   TEXT NOT NULL REFERENCES artisans(id),
  amount       INTEGER NOT NULL,           -- pesewas
  momo_number  TEXT NOT NULL,              -- payout destination (E.164)
  provider     TEXT NOT NULL DEFAULT 'paystack',
  reference    TEXT NOT NULL UNIQUE,       -- our payout reference (idempotency)
  status       TEXT NOT NULL DEFAULT 'pending',
    -- 'pending' | 'paid' | 'failed'
  failure      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  settled_at   TEXT
);
CREATE INDEX idx_payouts_artisan ON payouts(artisan_id, status);
