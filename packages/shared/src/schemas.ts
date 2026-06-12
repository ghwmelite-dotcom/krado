import { z } from "zod";
import { normalizePhone } from "./phone";
import { SLOT_GRID_MIN } from "./time";
import { BOOKING_STATUSES } from "./bookings";

/** E.164 Ghana phone, normalized in-schema so every ingress point agrees. */
export const Phone = z
  .string()
  .transform((v, ctx) => {
    const normalized = normalizePhone(v);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid Ghana phone number" });
      return z.NEVER;
    }
    return normalized;
  });

/** Integer pesewas. 4000 = GHS 40.00. */
export const Pesewas = z.number().int().nonnegative();

const DayHours = z.tuple([z.number().int().min(0).max(1439), z.number().int().min(1).max(1440)]).nullable();

export const HoursJson = z.object({
  mon: DayHours,
  tue: DayHours,
  wed: DayHours,
  thu: DayHours,
  fri: DayHours,
  sat: DayHours,
  sun: DayHours,
});
export type Hours = z.infer<typeof HoursJson>;

export const ServiceInput = z.object({
  name: z.string().min(1).max(60),
  price: Pesewas.min(100), // at least GHS 1
  duration_min: z.number().int().min(10).max(480),
});

/**
 * The 2-minute onboarding invariant: ≤ 7 required fields, ≤ 3 steps.
 * Required: name, shop_name, area, phone, momo_number, services, hours.
 */
export const OnboardInput = z.object({
  name: z.string().min(1).max(80),
  shop_name: z.string().min(1).max(80),
  area: z.string().min(1).max(80),
  phone: Phone,
  momo_number: Phone,
  services: z.array(ServiceInput).min(2).max(12),
  hours: HoursJson,
  language: z.enum(["en", "tw"]).optional(),
});
export type Onboard = z.infer<typeof OnboardInput>;

export const HoldInput = z.object({
  service_id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z
    .number()
    .int()
    .min(0)
    .max(1439)
    .refine((m) => m % SLOT_GRID_MIN === 0, "Slot must sit on the 30-minute grid"),
  phone: Phone,
  client_name: z.string().max(80).optional(),
});
export type Hold = z.infer<typeof HoldInput>;

export const PayInput = z.object({
  hold_token: z.string().min(1),
});

export const BookingStatusUpdate = z.object({
  status: z.enum(BOOKING_STATUSES),
});

export const NudgeAction = z.object({
  action: z.enum(["send", "dismiss"]),
});

export const OtpRequest = z.object({ phone: Phone });
export const OtpVerify = z.object({ phone: Phone, code: z.string().regex(/^\d{6}$/) });

export const ArtisanPatch = z
  .object({
    shop_name: z.string().min(1).max(80),
    area: z.string().min(1).max(80),
    momo_number: Phone,
    language: z.enum(["en", "tw"]),
    daily_goal: Pesewas.min(100),
    deposit_pct: z.number().int().min(5).max(100),
    deposit_floor: Pesewas.min(500), // GHS 5 floor is a product rule
    susu_mode: z.enum(["flat", "pct", "off"]),
    susu_value: z.number().int().min(0),
    hours: HoursJson,
    accept_manual: z.boolean(),
    bank_details: z.string().max(120).nullable(),
  })
  .partial();
