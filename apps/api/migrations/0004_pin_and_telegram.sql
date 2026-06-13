-- Auth moves from WhatsApp OTP to phone + 4-digit PIN (hashed, never plaintext).
-- Messaging moves from WhatsApp to Telegram (chat_id captured when the user
-- taps Start on the bot — artisans at onboarding, clients opt-in after booking).

ALTER TABLE artisans ADD COLUMN pin_hash TEXT;          -- PBKDF2 hash (base64)
ALTER TABLE artisans ADD COLUMN pin_salt TEXT;          -- per-artisan salt (base64)
ALTER TABLE artisans ADD COLUMN telegram_chat_id TEXT;  -- set when artisan links the bot

ALTER TABLE clients ADD COLUMN telegram_chat_id TEXT;   -- opt-in, set when client links the bot
