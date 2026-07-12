import { z } from "zod";
import { AssetCondition } from "@prisma/client";

// Exactly one of holderUserId / holderDeptId — mirrors the schema comment
// on Allocation (spec: assets are allocated to an employee OR a department).
export const allocationCreateSchema = z
  .object({
    assetId: z.string().min(1),
    holderUserId: z.string().nullish(),
    holderDeptId: z.string().nullish(),
    expectedReturnAt: z.coerce.date().nullish(),
  })
  .refine((v) => Boolean(v.holderUserId) !== Boolean(v.holderDeptId), {
    message: "Select exactly one holder: an employee or a department",
    path: ["holderUserId"],
  });

export const returnSchema = z.object({
  returnCondition: z.nativeEnum(AssetCondition),
  returnNotes: z.string().trim().max(500).nullish(),
});

// Query-string filters for the allocations list/search.
export const allocationSearchSchema = z.object({
  status: z.enum(["ACTIVE", "RETURNED", "OVERDUE"]).optional(),
  assetId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Exactly one of targetUserId / targetDeptId — mirrors allocationCreateSchema.
export const transferRequestSchema = z
  .object({
    allocationId: z.string().min(1),
    targetUserId: z.string().nullish(),
    targetDeptId: z.string().nullish(),
    reason: z.string().trim().max(300).nullish(),
  })
  .refine((v) => Boolean(v.targetUserId) !== Boolean(v.targetDeptId), {
    message: "Select exactly one target: an employee or a department",
    path: ["targetUserId"],
  });

export const transferApproveSchema = z.object({
  expectedReturnAt: z.coerce.date().nullish(),
});

export const transferRejectSchema = z.object({
  decisionNote: z.string().trim().max(300).nullish(),
});

export type AllocationCreateInput = z.infer<typeof allocationCreateSchema>;
export type ReturnInput = z.infer<typeof returnSchema>;
export type AllocationSearchInput = z.infer<typeof allocationSearchSchema>;
export type TransferRequestInput = z.infer<typeof transferRequestSchema>;
export type TransferApproveInput = z.infer<typeof transferApproveSchema>;
export type TransferRejectInput = z.infer<typeof transferRejectSchema>;
