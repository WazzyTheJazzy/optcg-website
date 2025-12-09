# Vercel Deployment Guide

## Prerequisites
- GitHub account with your code pushed
- Vercel account (free tier works great)
- Database provider (choose one below)

## Step 1: Set Up Database

### Option A: Vercel Postgres (Recommended - Easiest)
1. Go to https://vercel.com/dashboard
2. Click "Storage" → "Create Database" → "Postgres"
3. Name it `optcg-database`
4. Copy the connection strings (you'll need both `DATABASE_URL` and `DIRECT_URL`)

### Option B: Supabase (Free tier is generous)
1. Go to https://supabase.com
2. Create new project
3. Go to Settings → Database
4. Copy the connection string (use "Connection Pooling" for `DATABASE_URL`)
5. Copy the direct connection string for `DIRECT_URL`

### Option C: Neon (Serverless Postgres)
1. Go to https://neon.tech
2. Create new project
3. Copy both pooled and direct connection strings

## Step 2: Deploy to Vercel

1. **Import Your Repository**
   - Go to https://vercel.com/new
   - Import your GitHub repository: `WazzyTheJazzy/optcg-website`
   - Click "Import"

2. **Configure Environment Variables**
   Add these in the Vercel dashboard:
   
   ```
   DATABASE_URL=<your-pooled-connection-string>
   DIRECT_URL=<your-direct-connection-string>
   NEXTAUTH_SECRET=<generate-with-command-below>
   NEXTAUTH_URL=https://your-app.vercel.app
   ```

   Generate NEXTAUTH_SECRET:
   ```bash
   openssl rand -base64 32
   ```

3. **Optional: Add OAuth (for user login)**
   ```
   GOOGLE_CLIENT_ID=<from-google-cloud-console>
   GOOGLE_CLIENT_SECRET=<from-google-cloud-console>
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)

## Step 3: Initialize Database

After first deployment:

1. **Run Migrations**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login
   vercel login
   
   # Link to your project
   vercel link
   
   # Run migration
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

2. **Seed Database (Optional)**
   ```bash
   npm run db:seed
   ```

## Step 4: Verify Deployment

1. Visit your Vercel URL (e.g., `https://optcg-website.vercel.app`)
2. Check that the site loads
3. Test database connection by viewing cards

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Ensure all environment variables are set
- Verify DATABASE_URL format

### Database Connection Issues
- Verify connection strings are correct
- Check if database allows connections from Vercel IPs
- For Supabase: Enable "Connection Pooling"

### Images Not Loading
- Ensure card images are in `public/cards/`
- Check Next.js image optimization settings
- Verify image paths are correct

## Continuous Deployment

Once set up, every push to `main` branch automatically deploys to Vercel!

## Custom Domain (Optional)

1. Go to Vercel project settings
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. Update `NEXTAUTH_URL` environment variable

## Performance Optimization

Consider adding these packages for production:

```bash
# Image optimization
npm install sharp

# Monitoring
npm install @vercel/analytics @vercel/speed-insights

# Error tracking
npm install @sentry/nextjs
```

## Cost Estimates

**Free Tier Includes:**
- Unlimited deployments
- 100GB bandwidth/month
- Serverless functions
- Automatic HTTPS
- Preview deployments

**Database Costs:**
- Vercel Postgres: Free tier (256MB), then $20/month
- Supabase: Free tier (500MB), then $25/month
- Neon: Free tier (3GB), then $19/month

For a hobby project, free tiers should be plenty!
