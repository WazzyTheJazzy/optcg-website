import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (!user) {
          const newUser = await prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.email.split('@')[0]
            }
          })
          return newUser
        }
        
        return user
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
      }
      return session
    }
  }
}
