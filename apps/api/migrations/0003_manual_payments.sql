-- Manual deposits: client pays the artisan's MoMo or bank account directly,
-- artisan confirms receipt in the app to lock the slot.
ALTER TABLE artisans ADD COLUMN accept_manual INTEGER NOT NULL DEFAULT 0;
ALTER TABLE artisans ADD COLUMN bank_details TEXT;  -- e.g. 'GCB · 1234567890 · Kojo Mensah'

CREATE TABLE manual_claims (
  id          TEXT PRIMARY KEY,
  hold_token  TEXT NOT NULL UNIQUE,
  artisan_id  TEXT NOT NULL REFERENCES artisans(id),
  phone       TEXT NOT NULL,                 -- payer, E.164
  method      TEXT NOT NULL,                 -- 'momo' | 'bank'
  amount      INTEGER NOT NULL,              -- pesewas (the deposit)
  reference   TEXT NOT NULL UNIQUE,          -- short code the client quotes in the transfer
  status      TEXT NOT NULL DEFAULT 'pending',
    -- 'pending' | 'confirmed' | 'rejected'
  hold_json   TEXT NOT NULL,                 -- HoldRecord snapshot (outlives KV TTL)
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_manual_claims_artisan ON manual_claims(artisan_id, status);
