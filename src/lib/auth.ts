// lib/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  events: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.id && user.name) {
        await db.user
          .update({
            where: { id: user.id },
            data: { name: user.name },
          })
          .catch(() => {});
      }
    },
  },
});

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Requires the current session user to be an admin (site owner).
 * `isAdmin` is a DB-only flag — there's no self-serve UI to grant it,
 * so it must be set directly (e.g. via `npx prisma studio`).
 */
export async function requireAdmin() {
  const user = await requireAuth();
  if (!user.id) throw new Error("Forbidden");

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { isAdmin: true },
  });

  if (!dbUser?.isAdmin) {
    throw new Error("Forbidden");
  }

  return user;
}

/**
 * Fresh DB lookup (never cached in the JWT) so premium status reflects
 * immediately after a successful payment. Admins always have full access.
 */
export async function isPremiumActive(userId: string): Promise<boolean> {
  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: { premiumUntil: true, isAdmin: true },
  });
  if (!dbUser) return false;
  if (dbUser.isAdmin) return true;
  return Boolean(dbUser.premiumUntil && dbUser.premiumUntil.getTime() > Date.now());
}