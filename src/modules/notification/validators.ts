import { z } from "zod";

// Normalized manually by the route handler before parsing — z.coerce.boolean()
// would treat the literal string "false" as truthy (docs/04, same pitfall
// already avoided in modules/asset's search schema).
export const notificationListSchema = z.object({
  unread: z.boolean().optional(),
});

export type NotificationListInput = z.infer<typeof notificationListSchema>;
