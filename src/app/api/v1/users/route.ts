import { apiHandler } from "@/lib/api";
import { listEmployees } from "@/modules/org/service";

export const GET = apiHandler({ permission: "user.list" }, () => listEmployees());
