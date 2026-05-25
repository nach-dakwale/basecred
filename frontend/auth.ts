import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    GitHub({
      clientId:     process.env.AUTH_GITHUB_ID     ?? process.env.GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? process.env.GITHUB_SECRET,
      authorization: { params: { scope: "read:user public_repo" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) token.githubAccessToken = account.access_token;
      return token;
    },
    async session({ session, token }) {
      (session as { githubAccessToken?: string }).githubAccessToken =
        token.githubAccessToken as string | undefined;
      return session;
    },
  },
});
