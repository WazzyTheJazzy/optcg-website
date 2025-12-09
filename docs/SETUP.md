# Quick Setup Guide

Follow these steps to get your One Piece TCG Trader up and running:

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Environment Variables

Copy the example environment file:

```bash
copy .env.example .env
```

Edit `.env` and update these required variables:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/onepiecetcg"
NEXTAUTH_SECRET="generate-a-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

To generate a secure NEXTAUTH_SECRET, run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 3. Set Up PostgreSQL Database

Make sure PostgreSQL is running, then create the database:

```sql
CREATE DATABASE onepiecetcg;
```

Or use a cloud provider like:
- [Supabase](https://supabase.com/) (Free tier available)
- [Neon](https://neon.tech/) (Free tier available)
- [Railway](https://railway.app/) (Free tier available)

## 4. Push Database Schema

```bash
npm run db:push
```

This creates all the necessary tables in your database.

## 5. Seed Sample Data

```bash
npm run db:seed
```

This adds 15 sample One Piece TCG cards with 30 days of price history for each.

## 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

## Optional: Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Add the credentials to your `.env`:

```env
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check your DATABASE_URL format
- Ensure the database exists

### Port Already in Use
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Prisma Issues
```bash
# Regenerate Prisma Client
npx prisma generate

# Reset database (WARNING: deletes all data)
npx prisma db push --force-reset
```

## Next Steps

- Browse cards at `/cards`
- Sign in at `/auth/signin`
- View your dashboard at `/dashboard`
- Start adding cards to your collection!
- Create trades at `/trades`

## Database Management

View and edit your database with Prisma Studio:

```bash
npm run db:studio
```

This opens a visual database editor at [http://localhost:5555](http://localhost:5555)
