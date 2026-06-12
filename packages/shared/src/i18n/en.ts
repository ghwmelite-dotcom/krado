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

  // WhatsApp template bodies (submitted to Meta; placeholders = {{n}})
  wa_booking_confirmed_client:
    "Your slot at {{1}} is locked for {{2}}. Deposit {{3}} received — {{4}} due at the shop. See you there!",
  wa_booking_confirmed_artisan: "New booking: {{1}}, {{2}} — {{3}}. Deposit {{4}} locked in.",
  wa_reminder_2h: "Reminder: your {{1}} appointment at {{2}} is at {{3}} today. Running late? Reply here.",
  wa_rebook_nudge: "Hi {{1}}, it's about time for your next cut at {{2}}. Book your slot: {{3}}",
  wa_refund_notice: "{{1}} had to cancel your {{2}} booking. Your {{3}} deposit is being refunded to your MoMo.",
  wa_otp: "Your Krado login code is {{1}}. It expires in 10 minutes.",
  wa_weekly_susu: "Susu this week: {{1}} set aside across {{2}} bookings. Keep going!",

  // onboarding
  onboard_title: "Set up your shop",
  onboard_step_you: "You & your shop",
  onboard_step_services: "Your services",
  onboard_step_hours: "Your hours",
  onboard_done: "You're live! Share your booking link:",
  onboard_share_message:
    "Book your next cut at {shop} — pick your style, lock your slot with a small MoMo deposit. {link}",

  // auth
  login_title: "Log in with your phone",
  login_code_sent: "We sent a 6-digit code to your WhatsApp.",
  login_invalid_code: "That code didn't match. Try again.",

  // generic
  cancel_booking: "Cancel booking",
  mark_done: "Mark done",
  mark_no_show: "No-show",
  save: "Save",
  error_generic: "Something went wrong. Try again.",
} as const;

export type MessageKey = keyof typeof en;
