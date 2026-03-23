import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions } from "next-auth"
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Passwort",
      credentials: { password: { label: "Passwort", type: "password" } },
      async authorize(credentials) {
        if (credentials?.password === process.env.FAMILY_PASSWORD) {
          return { id: "1", name: "Familie" }
        }
        return null
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
}
