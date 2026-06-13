import type { BookingStatus, Hours, Lang } from "@krado/shared";

export interface Artisan {
  id: string;
  handle: string;
  name: string;
  shop_name: string;
  area: string;
  phone: string;
  momo_number: string;
  language: Lang;
  daily_goal: number;
  deposit_pct: number;
  deposit_floor: number;
  susu_mode: "flat" | "pct" | "off";
  susu_value: number;
  hours_json: string;
  accept_manual?: number | boolean;
  bank_details?: string | null;
  telegram_chat_id?: string | null;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration_min: number;
  photo_key: string | null;
  position: number;
  active: number;
}

export interface UpNextBooking {
  id: string;
  service_name: string;
  price: number;
  deposit: number;
  starts_at: string;
  status: BookingStatus;
  client_name: string;
  client_phone: string;
}

export interface BookingRow extends UpNextBooking {
  source?: string;
}

export interface PendingNudge {
  id: string;
  cycle_days: number;
  client_name: string;
  client_phone: string;
}

export interface DashboardPayload {
  artisan: Pick<Artisan, "name" | "shop_name" | "handle" | "language" | "daily_goal" | "susu_mode" | "susu_value">;
  date: string;
  daily_goal: number;
  earned_today: number;
  susu_today: number;
  susu_week: number;
  clients_week: number;
  up_next: UpNextBooking[];
  pending_nudges: PendingNudge[];
  pending_manual_claims: number;
  /** Set client-side when the payload came from the offline cache. */
  offline?: boolean;
}

export interface ManualClaim {
  id: string;
  phone: string;
  method: "momo" | "bank";
  amount: number;
  reference: string;
  status: string;
  created_at: string;
  service_name: string;
  date: string;
  slot: number;
  client_name: string | null;
}

export interface NudgeRow {
  id: string;
  cycle_days: number;
  due_since?: string;
  client_name: string;
  client_phone: string;
  last_visit?: string;
}

export interface OnboardResult {
  handle: string;
  link: string;
  token: string;
  share_message: string;
  telegram_link: string;
}

export interface OnboardPayload {
  name: string;
  shop_name: string;
  area: string;
  phone: string;
  pin: string;
  momo_number?: string;
  services: Array<{ name: string; price: number; duration_min: number }>;
  hours: Hours;
  language?: Lang;
}
