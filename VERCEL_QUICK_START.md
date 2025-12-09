# 🚀 Vercel Deployment - Quick Start

## 1. Set Up Database (Choose One)

### ⭐ Vercel Postgres (Easiest)
```
1. Go to: https://vercel.com/dashboard
2. Click: Storage → Create Database → Postgres
3. Name: optcg-database
4. Copy both connection strings
```

### 🟢 Supabase (Free & Generous)
```
1. Go to: https://supabase.com
2. Create new project
3. Settings → Database → Copy connection strings
```

## 2. Deploy to Vercel

```
1. Visit: https://vercel.com/new
2. Import: WazzyTheJazzy/optcg-website
3. Add Environment Variables:
```

### Required Environment Variables:
```bash
DATABASE_URL=postgresql://...  # From your database provider
DIRECT_URL=postgresql://...    # Direct connection (no pooling)
NEXTAUTH_SECRET=               # Generate: openssl rand -base64 32
NEXTAUTH_URL=https://your-app.vercel.app
```

### Optional (for Google Login):
```bash
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
```

## 3. Click Deploy! 🎉

That's it! Vercel will:
- Install dependencies
- Generate Prisma client
- Build your Next.js app
- Deploy to global CDN

## 4. After First Deploy

Run migrations to set up database tables:

```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Pull environment variables
vercel env pull .env.local

# Run migrations
npx prisma migrate deploy

# Optional: Seed with card data
npm run db:seed
```

## 🎮 Your App is Live!

Visit: `https://your-project.vercel.app`

## 📊 Monitoring

Vercel dashboard shows:
- Analytics (page views, visitors)
- Speed Insights (performance)
- Build logs
- Function logs

## 🔄 Continuous Deployment

Every push to `main` branch = automatic deployment!

## 💡 Pro Tips

1. **Preview Deployments**: Every PR gets its own URL
2. **Environment Variables**: Can be different per environment (dev/preview/prod)
3. **Custom Domain**: Add in Vercel dashboard → Domains
4. **Database Backups**: Enable in your database provider settings

## 🆘 Need Help?

Check `DEPLOYMENT.md` for detailed troubleshooting!
