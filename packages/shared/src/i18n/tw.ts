import type { MessageKey } from "./en";

/**
 * Twi strings. Reviewed-by-native-speaker is a release gate (DESIGN_SYSTEM.md)
 * — these are working drafts for the pilot review pass, marked for review.
 */
export const tw: Record<MessageKey, string> = {
  greeting_morning: "Maakye",
  greeting_afternoon: "Maaha",
  greeting_evening: "Maadwo",

  nav_home: "Fie",
  nav_bookings: "Nhyiamu",
  nav_money: "Sika",
  nav_styles: "Styles",

  goal_label: "Ɛnnɛ botae",
  earnings_today: "Ɛnnɛ sika",
  clients_week: "Nnipa saa dapɛn yi",
  susu_label: "Susu a woato",
  susu_week: "Dapɛn yi susu",
  up_next: "Nea edi hɔ",
  no_bookings_today: "Nhyiamu biara nni hɔ ɛnnɛ. Kyɛ wo link no na nnipa mmra.",

  pick_style: "Yi style",
  pick_time: "Yi bere",
  lock_slot: "To wo slot mu",
  step_style: "Style",
  step_time: "Bere",
  step_lock: "To mu",
  pay_deposit: "Tua {amount} deposit",
  deposit_counts: "Deposit no ka wo ka no ho.",
  deposit_no_show: "Woamma a, {artisan} gye no.",
  deposit_refund: "{artisan} twa mu a, wobɛsan agye wo sika.",
  hold_countdown: "Yɛakora slot no simma {minutes} — tua ka na ato mu.",
  slot_locked: "Ato mu. Yɛbɛhyia {time}.",
  balance_at_shop: "{deposit} seesei · {balance} wɔ fie hɔ",

  status_locked: "Ato mu",
  status_hold: "Kora {minutes}m",
  status_completed: "Awie",
  status_no_show: "Wamma",
  status_cancelled: "Watwa mu",

  nudge_due: "{client} taa ba nnafua {days} biara. Ɛyɛ {gone} ni.",
  nudge_send: "Soma nudge",
  nudge_later: "Akyiri yi",

  wa_booking_confirmed_client:
    "Wo slot wɔ {{1}} ato mu ama {{2}}. Yɛagye deposit {{3}} — {{4}} aka wɔ fie hɔ. Yɛbɛhyia!",
  wa_booking_confirmed_artisan: "Nhyiamu foforo: {{1}}, {{2}} — {{3}}. Deposit {{4}} ato mu.",
  wa_reminder_2h: "Nkae: wo {{1}} nhyiamu wɔ {{2}} yɛ {{3}} ɛnnɛ. Wobɛka akyi a, twerɛ ha.",
  wa_rebook_nudge: "Agoo {{1}}, wo bere aso sɛ wobɛtwa wo ti wɔ {{2}}. Book wo slot: {{3}}",
  wa_refund_notice: "{{1}} atwa wo {{2}} nhyiamu no mu. Wo deposit {{3}} resan aba wo MoMo so.",
  wa_otp: "Wo Krado login code ne {{1}}. Ɛbɛsa simma 10 mu.",
  wa_weekly_susu: "Dapɛn yi susu: {{1}} a woato afi nhyiamu {{2}} mu. Kɔ so saa!",

  onboard_title: "Siesie wo fie",
  onboard_step_you: "Wo ne wo fie",
  onboard_step_services: "Wo nnwuma",
  onboard_step_hours: "Wo mmere",
  onboard_done: "Woawie! Kyɛ wo booking link no:",
  onboard_share_message:
    "Book wo ti-twa foforo wɔ {shop} — yi wo style, fa MoMo deposit kakra to wo slot mu. {link}",

  login_title: "Fa wo phone bra mu",
  login_code_sent: "Yɛasoma code 6 akɔ wo WhatsApp so.",
  login_invalid_code: "Code no anyɛ adwuma. San sɔ hwɛ.",

  cancel_booking: "Twa nhyiamu no mu",
  mark_done: "Awie",
  mark_no_show: "Wamma",
  save: "Sie",
  error_generic: "Biribi ankɔ yiye. San sɔ hwɛ.",
};
