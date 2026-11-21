import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Trim keys: values pasted into Vercel often carry a trailing newline,
// which makes Google reject the client ID ("invalid_client").
const clean = (v: string | undefined) => v?.trim() || undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: clean(process.env.AUTH_GOOGLE_ID),
      clientSecret: clean(process.env.AUTH_GOOGLE_SECRET),
    }),
  ],
  secret: clean(process.env.AUTH_SECRET),
  trustHost: true,
});
