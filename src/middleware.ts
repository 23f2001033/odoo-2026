import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Edge middleware — uses only the DB-free authConfig (the `authorized`
// callback does the route gating; see src/auth.config.ts).
export default NextAuth(authConfig).auth;

export const config = {
  // Protect everything except Next internals, static files, and public APIs
  // (auth endpoints + cron jobs, which carry their own CRON_SECRET check).
  matcher: ["/((?!api/auth|api/v1/auth|api/jobs|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
