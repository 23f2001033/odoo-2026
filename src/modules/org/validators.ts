import { z } from "zod";

// ── departments ──────────────────────────────────────────────────────────
export const departmentCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  headId: z.string().nullish(),
  parentId: z.string().nullish(),
});

export const departmentUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  headId: z.string().nullish(),
  parentId: z.string().nullish(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

// ── categories ───────────────────────────────────────────────────────────
// Custom fields are definitions only — values live on Asset.attributes.
export const fieldDefSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Key must be alphanumeric (camelCase)"),
  label: z.string().trim().min(1).max(60),
  type: z.enum(["text", "number", "date"]),
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).nullish(),
  fieldDefs: z.array(fieldDefSchema).max(10).default([]),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

// ── employee directory ───────────────────────────────────────────────────
// The ONLY place a role can be granted (spec: no self-assigned roles).
export const roleAssignSchema = z.object({
  role: z.enum(["EMPLOYEE", "DEPT_HEAD", "ASSET_MANAGER", "ADMIN"]),
});

export const employeeUpdateSchema = z.object({
  departmentId: z.string().nullish(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type RoleAssignInput = z.infer<typeof roleAssignSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
