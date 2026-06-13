-- Two demo shops for local dev and livestream demos. Money in pesewas.
-- Run: npm run db:seed
--   Kojo's Cuts  — barber, Madina    — phone 0244123456, PIN 1234
--   Adwoa's Braids — braids, E. Legon — phone 0209876543, PIN 4321
-- Bookings are anchored to "today" with strftime so the dashboard is lively.

-- ─────────────────────────── Kojo's Cuts (barber) ───────────────────────────
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
  ('cl_demo_nana',   '+233240000003', 'Nana');

INSERT OR REPLACE INTO bookings (id, artisan_id, client_id, service_id, service_name, price, duration_min, deposit, starts_at, status, source) VALUES
  ('bk_demo_1','art_demo_kojo','cl_demo_akosua','svc_demo_fade','Low fade',4000,45,1000, strftime('%Y-%m-%dT%H:%M:%S.000Z', date('now')||' 08:30:00'),'completed','link'),
  ('bk_demo_2','art_demo_kojo','cl_demo_kwesi','svc_demo_taper','Taper + beard',5500,60,1375, strftime('%Y-%m-%dT%H:%M:%S.000Z', date('now')||' 10:00:00'),'completed','link'),
  ('bk_demo_3','art_demo_kojo','cl_demo_nana','svc_demo_trim','Quick trim',2500,30,625, strftime('%Y-%m-%dT%H:%M:%S.000Z','now','+2 hours'),'locked','link'),
  ('bk_demo_4','art_demo_kojo','cl_demo_akosua','svc_demo_design','Fade + design',6000,60,1500, strftime('%Y-%m-%dT%H:%M:%S.000Z','now','+4 hours'),'locked','nudge');

INSERT OR REPLACE INTO payments (id, booking_id, provider, reference, kind, amount, channel, status) VALUES
  ('pay_demo_1','bk_demo_1','paystack','demo_d1','deposit',1000,'mtn','success'),
  ('pay_demo_2','bk_demo_2','paystack','demo_d2','deposit',1375,'mtn','success'),
  ('pay_demo_3','bk_demo_3','paystack','demo_d3','deposit',625,'telecel','success'),
  ('pay_demo_4','bk_demo_4','manual','KR-DEMO04','deposit',1500,'momo','success');

INSERT OR REPLACE INTO susu_ledger (id, artisan_id, booking_id, amount, day) VALUES
  ('ssu_demo_1','art_demo_kojo','bk_demo_1',500, date('now')),
  ('ssu_demo_2','art_demo_kojo','bk_demo_2',500, date('now')),
  ('ssu_demo_3','art_demo_kojo',NULL,500, date('now','-2 days')),
  ('ssu_demo_4','art_demo_kojo',NULL,500, date('now','-4 days'));

INSERT OR REPLACE INTO nudges (id, artisan_id, client_id, cycle_days, due_since, status) VALUES
  ('ndg_demo','art_demo_kojo','cl_demo_kwesi',21, date('now','-2 days'),'pending');

INSERT OR REPLACE INTO manual_claims (id, hold_token, artisan_id, phone, method, amount, reference, status, hold_json) VALUES
  ('mcl_demo','hld_demoMC','art_demo_kojo','+233200007777','momo',1000,'KR-WALKIN','pending',
   '{"token":"hld_demoMC","artisan_id":"art_demo_kojo","service_id":"svc_demo_fade","date":"'||date('now','+1 day')||'","slot":840,"phone":"+233200007777","client_name":"Adwoa","price":4000,"duration_min":45,"service_name":"Low fade","deposit":1000,"expires_at":"'||strftime('%Y-%m-%dT%H:%M:%S.000Z','now','+1 hour')||'"}');

-- ───────────────────────── Adwoa's Braids (braids) ─────────────────────────
INSERT OR REPLACE INTO artisans
  (id, handle, name, shop_name, area, phone, momo_number, language, daily_goal,
   deposit_pct, deposit_floor, susu_mode, susu_value, hours_json, accept_manual, bank_details,
   pin_hash, pin_salt)
VALUES
  ('art_demo_adwoa', 'adwoas-braids', 'Adwoa Boateng', 'Adwoa''s Braids', 'East Legon, Accra',
   '+233209876543', '+233209876543', 'en', 50000, 30, 500, 'pct', 10,
   '{"mon":[480,1140],"tue":[480,1140],"wed":[480,1140],"thu":[480,1140],"fri":[480,1200],"sat":[480,1200],"sun":null}',
   1, 'Ecobank - 0123456789 - Adwoa Boateng',
   '1X/oCFCxzBzdMmGws4QzguuBtqPIwODBpShhUbvC08Q=', '7Y5bFnu//VZ8/vrnmsZPhQ==');

INSERT OR REPLACE INTO services (id, artisan_id, name, price, duration_min, position) VALUES
  ('svc_adw_knotless','art_demo_adwoa','Knotless braids',25000,180,0),
  ('svc_adw_cornrows','art_demo_adwoa','Cornrows',8000,90,1),
  ('svc_adw_twist',   'art_demo_adwoa','Twist out',12000,120,2),
  ('svc_adw_wash',    'art_demo_adwoa','Wash & blow-dry',6000,60,3);

INSERT OR REPLACE INTO clients (id, phone, name) VALUES
  ('cl_adw_ama',   '+233201110001', 'Ama Owusu'),
  ('cl_adw_efua',  '+233201110002', 'Efua Sarpong'),
  ('cl_adw_yaa',   '+233201110003', 'Yaa Asantewaa'),
  ('cl_adw_abena', '+233201110004', 'Abena Mensah');

INSERT OR REPLACE INTO bookings (id, artisan_id, client_id, service_id, service_name, price, duration_min, deposit, starts_at, status, source) VALUES
  ('bk_adw1','art_demo_adwoa','cl_adw_ama','svc_adw_knotless','Knotless braids',25000,180,7500, strftime('%Y-%m-%dT%H:%M:%S.000Z', date('now')||' 08:00:00'),'completed','link'),
  ('bk_adw2','art_demo_adwoa','cl_adw_efua','svc_adw_cornrows','Cornrows',8000,90,2400, strftime('%Y-%m-%dT%H:%M:%S.000Z', date('now')||' 11:30:00'),'completed','link'),
  ('bk_adw3','art_demo_adwoa','cl_adw_yaa','svc_adw_twist','Twist out',12000,120,3600, strftime('%Y-%m-%dT%H:%M:%S.000Z','now','+3 hours'),'locked','link'),
  ('bk_adw4','art_demo_adwoa','cl_adw_abena','svc_adw_wash','Wash & blow-dry',6000,60,1800, strftime('%Y-%m-%dT%H:%M:%S.000Z','now','+5 hours'),'locked','nudge');

INSERT OR REPLACE INTO payments (id, booking_id, provider, reference, kind, amount, channel, status) VALUES
  ('pay_adw1','bk_adw1','paystack','demo_adw1','deposit',7500,'mtn','success'),
  ('pay_adw2','bk_adw2','paystack','demo_adw2','deposit',2400,'telecel','success'),
  ('pay_adw3','bk_adw3','paystack','demo_adw3','deposit',3600,'mtn','success'),
  ('pay_adw4','bk_adw4','manual','KR-ADW04','deposit',1800,'momo','success');

INSERT OR REPLACE INTO susu_ledger (id, artisan_id, booking_id, amount, day) VALUES
  ('ssu_adw1','art_demo_adwoa','bk_adw1',2500, date('now')),
  ('ssu_adw2','art_demo_adwoa','bk_adw2',800, date('now')),
  ('ssu_adw3','art_demo_adwoa',NULL,1200, date('now','-2 days')),
  ('ssu_adw4','art_demo_adwoa',NULL,900, date('now','-5 days'));

INSERT OR REPLACE INTO nudges (id, artisan_id, client_id, cycle_days, due_since, status) VALUES
  ('ndg_adw','art_demo_adwoa','cl_adw_ama',28, date('now','-3 days'),'pending');

INSERT OR REPLACE INTO manual_claims (id, hold_token, artisan_id, phone, method, amount, reference, status, hold_json) VALUES
  ('mcl_adw','hld_adwMC','art_demo_adwoa','+233201119999','bank',3600,'KR-WALKADW','pending',
   '{"token":"hld_adwMC","artisan_id":"art_demo_adwoa","service_id":"svc_adw_twist","date":"'||date('now','+1 day')||'","slot":600,"phone":"+233201119999","client_name":"Akua","price":12000,"duration_min":120,"service_name":"Twist out","deposit":3600,"expires_at":"'||strftime('%Y-%m-%dT%H:%M:%S.000Z','now','+1 hour')||'"}');
