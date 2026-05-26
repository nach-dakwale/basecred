import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { addPublicGitHubIdentity } from "@/lib/session";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    GitHub({
      clientId:     process.env.AUTH_GITHUB_ID     ?? process.env.GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? process.env.GITHUB_SECRET,
      authorization: { params: { scope: "read:user" } },
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      const githubLogin = (profile as { login?: unknown } | undefined)?.login;
      const githubId = (profile as { id?: unknown } | undefined)?.id;
      if (typeof githubLogin === "string") token.githubLogin = githubLogin;
      if (typeof githubId === "number" || typeof githubId === "string") token.githubId = String(githubId);
      return token;
    },
    async session({ session, token }) {
      return addPublicGitHubIdentity(session, token as unknown as { githubId?: unknown; githubLogin?: unknown });
    },
  },
});
