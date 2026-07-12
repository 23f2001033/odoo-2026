import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { loginSchema } from "./modules/auth/validators";
import { verifyCredentials } from "./modules/auth/service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        try {
          const user = await verifyCredentials(parsed.data.email, parsed.data.password);
          return user;
        } catch {
          return null; // Auth.js turns null into a generic CredentialsSignin error
        }
      },
    }),
  ],
});
