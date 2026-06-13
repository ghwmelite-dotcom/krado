-- Per-booking Krado fee (Phase 1 monetization), absorbed into the deposit.
-- 0 = off; recorded on each locked booking so settlement can split it later.
ALTER TABLE bookings ADD COLUMN krado_fee INTEGER NOT NULL DEFAULT 0;
