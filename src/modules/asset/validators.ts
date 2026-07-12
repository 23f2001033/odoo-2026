import { z } from "zod";
import { AssetCondition, AssetStatus } from "@prisma/client";

// Category custom-field values arrive as raw form strings; the service
// coerces them against Category.fieldDefs (see coerceAttributes in service.ts).
const attributesSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));

export const assetCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  categoryId: z.string().min(1, "Category is required"),
  serialNumber: z.string().trim().max(80).nullish(),
  acquisitionDate: z.coerce.date().nullish(),
  acquisitionCost: z.coerce.number().nonnegative().nullish(),
  condition: z.nativeEnum(AssetCondition).default("GOOD"),
  location: z.string().trim().max(120).nullish(),
  isBookable: z.boolean().default(false),
  photoUrl: z.string().trim().max(500).nullish(),
  attributes: attributesSchema.default({}),
});

export const assetUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  serialNumber: z.string().trim().max(80).nullish(),
  acquisitionDate: z.coerce.date().nullish(),
  acquisitionCost: z.coerce.number().nonnegative().nullish(),
  condition: z.nativeEnum(AssetCondition).optional(),
  location: z.string().trim().max(120).nullish(),
  isBookable: z.boolean().optional(),
  photoUrl: z.string().trim().max(500).nullish(),
  attributes: attributesSchema.optional(),
});

// Query-string params always arrive as strings — normalized in the route
// handler before this schema sees them (z.coerce.boolean() would otherwise
// treat the literal string "false" as truthy).
export const assetSearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoryId: z.string().optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  departmentId: z.string().optional(),
  location: z.string().trim().max(120).optional(),
  bookable: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type AssetCreateInput = z.infer<typeof assetCreateSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;
export type AssetSearchInput = z.infer<typeof assetSearchSchema>;
