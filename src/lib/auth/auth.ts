import NextAuth from "next-auth";
import { buildProviders, TEST_PROVIDER_ID } from "./test-mode";
import { upsertUser } from "@/lib/db/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: buildProviders(),
  session: { strategy: "jwt" },
  // Vercel sets the forwarded host; local `next start` (E2E) needs this too (SPEC D5).
  trustHost: true,
  pages: { signIn: "/" },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        const googleId = account.provider === TEST_PROVIDER_ID ? String(user.id) : account.providerAccountId;
        const email = (user.email ?? "").toLowerCase();
        const name = user.name?.trim() || email.split("@")[0] || "Student";
        token.uid = await upsertUser({ googleId, email, name });
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
});
