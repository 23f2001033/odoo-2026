import { z } from "zod";

// Scope is either a department, a location, or neither (org-wide) — never
// both at once, mirroring the XOR pattern used for allocation/transfer
// holder-or-target fields elsewhere in the app.
export const auditCycleCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    scopeDeptId: z.string().nullish(),
    scopeLocation: z.string().trim().max(120).nullish(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    auditorUserIds: z.array(z.string().min(1)).min(1, "Assign at least one auditor"),
  })
  .refine((v) => v.endsAt > v.startsAt, { message: "End date must be after start date", path: ["endsAt"] })
  .refine((v) => !(v.scopeDeptId && v.scopeLocation), {
    message: "Choose either a department or a location, not both",
    path: ["scopeLocation"],
  });

export const auditItemCheckSchema = z.object({
  result: z.enum(["VERIFIED", "MISSING", "DAMAGED"]),
  notes: z.string().trim().max(500).nullish(),
});

export type AuditCycleCreateInput = z.infer<typeof auditCycleCreateSchema>;
export type AuditItemCheckInput = z.infer<typeof auditItemCheckSchema>;
