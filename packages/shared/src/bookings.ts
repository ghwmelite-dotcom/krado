/**
 * Booking state machine. `held` lives only in KV (TTL 900s) — a D1 row is
 * created at `locked`, after payment is confirmed by the Paystack webhook.
 * Every status change anywhere in the system goes through assertTransition.
 */

export const BOOKING_STATUSES = [
  "locked",
  "completed",
  "no_show",
  "cancelled_by_client",
  "cancelled_by_artisan",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  locked: ["completed", "no_show", "cancelled_by_client", "cancelled_by_artisan"],
  completed: [],
  no_show: [],
  cancelled_by_client: [],
  cancelled_by_artisan: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal booking transition: ${from} → ${to}`);
  }
}
