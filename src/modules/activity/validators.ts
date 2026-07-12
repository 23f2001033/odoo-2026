import { z } from "zod";

export const activitySearchSchema = z.object({
  actorId: z.string().optional(),
  entityType: z.string().optional(),
  action: z.string().trim().max(60).optional(), // partial match, e.g. "transfer"
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

export type ActivitySearchInput = z.infer<typeof activitySearchSchema>;
