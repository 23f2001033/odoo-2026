import { z } from "zod";

// A short grace window (not exactly "now") avoids false rejections from
// client/server clock skew or the few seconds it takes to submit the form.
const NOT_IN_PAST = (v: { startsAt: Date }) => v.startsAt.getTime() > Date.now() - 5 * 60 * 1000;

export const bookingCreateSchema = z
  .object({
    assetId: z.string().min(1),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    forDeptId: z.string().nullish(),
    purpose: z.string().trim().max(300).nullish(),
  })
  .refine((v) => v.endsAt > v.startsAt, { message: "End time must be after start time", path: ["endsAt"] })
  .refine(NOT_IN_PAST, { message: "Cannot book a time slot in the past", path: ["startsAt"] });

export const bookingRescheduleSchema = z
  .object({
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((v) => v.endsAt > v.startsAt, { message: "End time must be after start time", path: ["endsAt"] })
  .refine(NOT_IN_PAST, { message: "Cannot book a time slot in the past", path: ["startsAt"] });

export const bookingListSchema = z.object({
  assetId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type BookingRescheduleInput = z.infer<typeof bookingRescheduleSchema>;
export type BookingListInput = z.infer<typeof bookingListSchema>;
