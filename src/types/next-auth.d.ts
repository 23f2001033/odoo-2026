import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

// Augment Auth.js types with our domain fields so session.user is fully typed.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      departmentId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: Role;
    departmentId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    departmentId?: string | null;
  }
}
