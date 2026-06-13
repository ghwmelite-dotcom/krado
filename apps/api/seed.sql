-- Demo artisan "Kojo's Cuts" (Madina) for local dev and livestream demos.
-- Money in pesewas. Run: npm run db:seed
-- Login: phone 0244123456, PIN 1234 (hash below is PBKDF2-SHA256, 100k iters).

INSERT OR REPLACE INTO artisans
  (id, handle, name, shop_name, area, phone, momo_number, language, daily_goal,
   deposit_pct, deposit_floor, susu_mode, susu_value, hours_json, accept_manual, bank_details,
   pin_hash, pin_salt)
VALUES
  ('art_demo_kojo', 'kojo', 'Kojo Mensah', 'Kojo''s Cuts', 'Madina, Accra',
   '+233244123456', '+233244123456', 'en', 20000, 25, 500, 'flat', 500,
   '{"mon":[540,1080],"tue":[540,1080],"wed":[540,1080],"thu":[540,1080],"fri":[540,1140],"sat":[480,1140],"sun":null}',
   1, 'GCB · 1234567890 · Kojo Mensah',
   'Rv7Re9EJpFpw5fMvAuko010TDVVznlWJ6bz/izIXrYE=', '8AI415Qndm1n3xnrpTDqug==');

INSERT OR REPLACE INTO services (id, artisan_id, name, price, duration_min, position) VALUES
  ('svc_demo_fade',   'art_demo_kojo', 'Low fade',        4000, 45, 0),
  ('svc_demo_taper',  'art_demo_kojo', 'Taper + beard',   5500, 60, 1),
  ('svc_demo_trim',   'art_demo_kojo', 'Quick trim',      2500, 30, 2),
  ('svc_demo_design', 'art_demo_kojo', 'Fade + design',   6000, 60, 3);

INSERT OR REPLACE INTO clients (id, phone, name) VALUES
  ('cl_demo_akosua', '+233240000001', 'Akosua'),
  ('cl_demo_kwesi',  '+233240000002', 'Kwesi'),
  ('cl_demo_nana',   '+233240000003', NULL);

-- A little history so the dashboard, money tab and nudge engine have data:
-- Akosua visits every ~21 days, last seen 24 days ago (nudge-due).
INSERT OR REPLACE INTO bookings
  (id, artisan_id, client_id, service_id, service_name, price, duration_min, deposit, starts_at, status, source)
VALUES
  ('bk_demo_1', 'art_demo_kojo', 'cl_demo_akosua', 'svc_demo_fade', 'Low fade', 4000, 45, 1000,
   datetime('now', '-66 days'), 'completed', 'link'),
  ('bk_demo_2', 'art_demo_kojo', 'cl_demo_akosua', 'svc_demo_fade', 'Low fade', 4000, 45, 1000,
   datetime('now', '-45 days'), 'completed', 'link'),
  ('bk_demo_3', 'art_demo_kojo', 'cl_demo_akosua', 'svc_demo_fade', 'Low fade', 4000, 45, 1000,
   datetime('now', '-24 days'), 'completed', 'nudge'),
  ('bk_demo_4', 'art_demo_kojo', 'cl_demo_kwesi', 'svc_demo_taper', 'Taper + beard', 5500, 60, 1375,
   datetime('now', '-2 days'), 'completed', 'link'),
  ('bk_demo_5', 'art_demo_kojo', 'cl_demo_kwesi', 'svc_demo_taper', 'Taper + beard', 5500, 60, 1375,
   datetime('now', '+3 hours'), 'locked', 'link'),
  ('bk_demo_6', 'art_demo_kojo', 'cl_demo_nana', 'svc_demo_trim', 'Quick trim', 2500, 30, 625,
   datetime('now', '+5 hours'), 'locked', 'link');

INSERT OR REPLACE INTO payments (id, booking_id, provider, reference, kind, amount, channel, status) VALUES
  ('pay_demo_5', 'bk_demo_5', 'paystack', 'demo_ref_5', 'deposit', 1375, 'mtn', 'success'),
  ('pay_demo_6', 'bk_demo_6', 'manual',   'KR-DEMO01',  'deposit',  625, 'momo', 'success');

INSERT OR REPLACE INTO susu_ledger (id, artisan_id, booking_id, amount, day) VALUES
  ('ssu_demo_4', 'art_demo_kojo', 'bk_demo_4', 500, date('now', '-2 days'));
