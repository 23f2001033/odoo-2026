import { z } from "zod";
import { MaintenancePriority } from "@prisma/client";

export const maintenanceCreateSchema = z.object({
  assetId: z.string().min(1),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().trim().min(1, "Describe the issue").max(1000),
  priority: z.nativeEnum(MaintenancePriority).default("MEDIUM"),
  photoUrl: z.string().trim().max(500).nullish(),
});

export const maintenanceRejectSchema = z.object({
  rejectionReason: z.string().trim().max(300).nullish(),
});

export const maintenanceAssignSchema = z.object({
  technicianName: z.string().trim().min(2, "Technician name is required").max(120),
});

export const maintenanceResolveSchema = z.object({
  resolutionNotes: z.string().trim().max(500).nullish(),
});

export const maintenanceSearchSchema = z.object({
  status: z.string().optional(),
  priority: z.nativeEnum(MaintenancePriority).optional(),
  assetId: z.string().optional(),
});

export type MaintenanceCreateInput = z.infer<typeof maintenanceCreateSchema>;
export type MaintenanceRejectInput = z.infer<typeof maintenanceRejectSchema>;
export type MaintenanceAssignInput = z.infer<typeof maintenanceAssignSchema>;
export type MaintenanceResolveInput = z.infer<typeof maintenanceResolveSchema>;
export type MaintenanceSearchInput = z.infer<typeof maintenanceSearchSchema>;
