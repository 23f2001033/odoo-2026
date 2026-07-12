import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no Prisma imports) — middleware runs on this alone.
// The Credentials provider (which needs the DB) is added in src/auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    // Route gating for the middleware.
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage =
        request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/signup");
      if (isAuthPage) {
        // already logged in → bounce to dashboard
        return isLoggedIn
          ? Response.redirect(new URL("/dashboard", request.nextUrl))
          : true;
      }
      return isLoggedIn; // everything else requires a session
    },
    // Copy our domain fields through the JWT into the session.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.departmentId = (user as { departmentId?: string | null }).departmentId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as never;
        session.user.departmentId = (token.departmentId as string | null) ?? null;
      }
      return session;
    },
  },
  providers: [], // filled in src/auth.ts
} satisfies NextAuthConfig;
