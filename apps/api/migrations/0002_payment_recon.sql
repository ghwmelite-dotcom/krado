-- Payments that arrived without a usable hold (expired hold, amount mismatch).
-- Surfaced in the pilot reconciliation view; resolved manually.
CREATE TABLE payment_recon (
  id          TEXT PRIMARY KEY,
  reference   TEXT NOT NULL UNIQUE,          -- Paystack reference
  amount      INTEGER NOT NULL,              -- pesewas actually paid
  phone       TEXT,                          -- E.164 payer if known
  artisan_id  TEXT,                          -- if recoverable from the hold/metadata
  reason      TEXT NOT NULL,                 -- 'hold_expired' | 'amount_mismatch'
  raw_json    TEXT,                          -- verify response snapshot
  resolved    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
