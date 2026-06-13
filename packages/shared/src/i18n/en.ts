export const en = {
  // greetings (clock-driven)
  greeting_morning: "Good morning",
  greeting_afternoon: "Good afternoon",
  greeting_evening: "Good evening",

  // navigation
  nav_home: "Home",
  nav_bookings: "Bookings",
  nav_money: "Money",
  nav_styles: "Styles",

  // dashboard
  goal_label: "Today's goal",
  earnings_today: "Earned today",
  clients_week: "Clients this week",
  susu_label: "Susu set-aside",
  susu_week: "This week's susu",
  up_next: "Up next",
  no_bookings_today: "No bookings yet today. Share your link to fill your chairs.",

  // booking page
  pick_style: "Pick a style",
  pick_time: "Pick a time",
  lock_slot: "Lock your slot",
  step_style: "Style",
  step_time: "Time",
  step_lock: "Lock",
  pay_deposit: "Pay {amount} deposit",
  deposit_counts: "Deposit counts toward your cut.",
  deposit_no_show: "No-show? {artisan} keeps it.",
  deposit_refund: "Refunded if {artisan} cancels.",
  hold_countdown: "Slot held for {minutes}m — finish payment to lock it.",
  slot_locked: "Locked. See you at {time}.",
  balance_at_shop: "{deposit} now · {balance} at the shop",

  // statuses
  status_locked: "Locked",
  status_hold: "Hold {minutes}m",
  status_completed: "Done",
  status_no_show: "No-show",
  status_cancelled: "Cancelled",

  // nudges
  nudge_due: "{client} is usually back every {days} days. It's been {gone}.",
  nudge_send: "Send rebook nudge",
  nudge_later: "Later",

  // Telegram messages (free-form text, {named} placeholders)
  tg_booking_confirmed_client:
    "Your slot at {shop} is locked for {time}. Deposit {deposit} received — {balance} due at the shop. See you there!",
  tg_booking_confirmed_artisan: "New booking: {client}, {service} — {time}. Deposit {deposit} locked in.",
  tg_reminder_2h: "Reminder: your {service} at {shop} is at {time} today. See you soon!",
  tg_rebook_nudge: "Hi {client}, it's about time for your next visit at {shop}. Book your slot: {link}",
  tg_refund_notice: "{shop} had to cancel your {service} booking. Your {deposit} deposit is being refunded to your MoMo.",
  tg_weekly_susu: "Susu this week: {amount} set aside across {count} bookings. Keep going!",
  tg_artisan_linked: "You're connected, {name}. New bookings and your daily money will land right here.",
  tg_client_linked: "All set — you'll get your booking reminders for {shop} here.",
  tg_start_help: "Open your Krado booking link to lock a slot, or set up your shop at {base}.",

  // onboarding
  onboard_title: "Set up your shop",
  onboard_step_you: "You & your shop",
  onboard_step_services: "Your services",
  onboard_step_hours: "Your hours",
  onboard_done: "You're live! Share your booking link:",
  onboard_share_message:
    "Book your next cut at {shop} — pick your style, lock your slot with a small MoMo deposit. {link}",

  // auth
  login_title: "Log in",
  login_wrong_pin: "Wrong phone or PIN. Try again.",

  // generic
  cancel_booking: "Cancel booking",
  mark_done: "Mark done",
  mark_no_show: "No-show",
  save: "Save",
  error_generic: "Something went wrong. Try again.",

  // dashboard (artisan PWA)
  goal_of: "{earned} of {goal}",
  duration_price: "{minutes} min · {price}",
  nudge_due_short: "{client} is usually back every {days} days",
  claims_pending: "{count} manual payments waiting for your confirmation",
  offline_cached: "You're offline — showing your last saved dashboard.",
  loading: "Loading…",
  settings: "Settings",
  language_label: "Language",

  // auth (artisan PWA)
  login_phone_label: "Phone number",
  login_pin_label: "4-digit PIN",
  login_verify: "Log in",
  login_new_shop: "New to Krado? Set up your shop",
  field_pin: "Choose a 4-digit PIN",
  field_pin_hint: "You'll use your phone and this PIN to log in. Like your MoMo PIN.",
  field_momo_same: "My MoMo number is the same as my phone",
  field_momo_different: "Use a different MoMo number",

  // onboarding wizard
  field_name: "Your name",
  field_shop_name: "Shop name",
  field_area: "Area",
  field_phone: "Phone number",
  field_momo: "MoMo number",
  service_name: "Service name",
  service_price: "Price (GHS)",
  service_duration: "Duration (minutes)",
  add_service: "Add another service",
  remove_service: "Remove",
  hours_closed: "Closed",
  hours_open_at: "Opens",
  hours_close_at: "Closes",
  day_mon: "Mon",
  day_tue: "Tue",
  day_wed: "Wed",
  day_thu: "Thu",
  day_fri: "Fri",
  day_sat: "Sat",
  day_sun: "Sun",
  next: "Next",
  back: "Back",
  finish_setup: "Go live",
  copy_link: "Copy",
  copied: "Copied",
  go_to_dashboard: "Go to your dashboard",

  // bookings screen
  bookings_title: "Bookings",
  date_label: "Date",
  no_bookings_date: "No bookings on this day.",
  manual_claims_title: "Manual payment claims",
  claim_confirm: "Confirm receipt",
  claim_reject: "Reject",
  cancel_confirm_title: "Cancel this booking?",
  cancel_confirm_body: "The client's deposit will be refunded to their MoMo automatically.",
  confirm_cancel: "Yes, cancel",
  keep_booking: "Keep booking",

  // money screen
  money_title: "Money",
  ledger_title: "This week's earnings",
  ledger_empty: "No completed bookings this week yet.",
  total_label: "Total",

  // styles screen
  styles_title: "Your styles",
  add_style: "Add a style",
  edit: "Edit",
  delete: "Delete",
  upload_photo: "Upload photo",
  no_styles: "No styles yet. Add your first one.",

  // settings screen
  daily_goal_label: "Daily goal (GHS)",
  deposit_pct_label: "Deposit percent",
  deposit_floor_label: "Minimum deposit (GHS)",
  susu_mode_label: "Susu mode",
  susu_mode_off: "Off",
  susu_mode_flat: "Fixed amount",
  susu_mode_pct: "Percent of earnings",
  susu_value_label_flat: "Susu set-aside per booking (GHS)",
  susu_value_label_pct: "Susu percent of each booking",
  accept_manual_label: "Accept manual payments",
  bank_details_label: "Bank or wallet details",
  saved: "Saved",

  // Telegram linking
  tg_connect_title: "Get booking alerts on Telegram",
  tg_connect_artisan: "Connect Telegram so new bookings and your daily money reach you instantly.",
  tg_connect_client: "Get updates on Telegram",
  tg_connect_client_sub: "Tap to get your confirmation and a reminder before your appointment.",
  tg_connect_button: "Open Telegram",
  tg_connected: "Telegram connected",
  slot_locked_title: "Slot locked",
  slot_locked_body: "Your deposit is in and your slot is locked.",
} as const;

export type MessageKey = keyof typeof en;
