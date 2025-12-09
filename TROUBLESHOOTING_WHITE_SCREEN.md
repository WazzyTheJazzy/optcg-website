# Troubleshooting White Screen Issue

If you're seeing a white screen when visiting `/game`, follow these steps:

## Step 1: Check if the Dev Server is Running

Make sure your development server is running:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

The server should be running on `http://localhost:3000`

## Step 2: Check Browser Console for Errors

1. Open your browser's developer tools (Press `F12` or `Ctrl+Shift+I`)
2. Go to the **Console** tab
3. Look for any red error messages
4. Common errors and solutions:

### Error: "Cannot find module '@react-three/fiber'"

**Solution:** Install missing dependencies:
```bash
npm install three @react-three/fiber @react-three/drei
```

### Error: "Module not found: Can't resolve '@/components/game/GameBoard'"

**Solution:** The file path is correct. Try restarting the dev server:
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Error: "Hydration failed" or "Text content does not match"

**Solution:** Clear your browser cache and reload:
```bash
# In browser: Ctrl+Shift+R (hard reload)
# Or clear cache in DevTools → Application → Clear storage
```

## Step 3: Check Network Tab

1. In DevTools, go to the **Network** tab
2. Reload the page
3. Look for failed requests (red status codes)
4. Common issues:

### 404 on `/api/game/cards`

**Solution:** The API route exists. Make sure your database is seeded:
```bash
npx prisma db push
npx prisma db seed
```

### 500 Internal Server Error

**Solution:** Check the terminal where your dev server is running for error messages

## Step 4: Verify File Structure

Make sure these files exist:
- `app/game/page.tsx` ✓
- `components/game/GameBoard.tsx` ✓
- `components/game/GameScene.tsx` ✓
- `components/game/CardMesh.tsx` ✓
- `components/game/ActionPanel.tsx` ✓
- `lib/game-engine/core/GameEngine.ts` ✓

## Step 5: Check for TypeScript Errors

Run TypeScript check:
```bash
npx tsc --noEmit
```

If there are errors, they need to be fixed before the app will run.

## Step 6: Try the Debug Page

Visit `http://localhost:3000/debug` to see if the basic game engine works without the 3D rendering.

## Step 7: Clear Next.js Cache

Sometimes Next.js cache can cause issues:

```bash
# Stop the dev server
# Delete the .next folder
rm -rf .next
# Or on Windows:
# rmdir /s .next

# Restart the dev server
npm run dev
```

## Step 8: Check for Missing Environment Variables

Make sure you have a `.env` file with database connection:

```env
DATABASE_URL="your-database-url"
```

## Common Solutions Summary

### Quick Fix Checklist:
1. ✓ Dev server is running (`npm run dev`)
2. ✓ Browser console shows no errors (F12)
3. ✓ Database is seeded (`npx prisma db seed`)
4. ✓ Dependencies installed (`npm install`)
5. ✓ Cache cleared (Ctrl+Shift+R)
6. ✓ `.next` folder deleted and rebuilt

### If Still White Screen:

**Check the browser console** - This is the most important step. The console will tell you exactly what's wrong.

Common console errors:
- **"Cannot read property of undefined"** → Check the game initialization in `app/game/page.tsx`
- **"WebGL not supported"** → Your browser/device doesn't support 3D rendering
- **"Failed to fetch"** → API endpoint issue, check `/api/game/cards/route.ts`

### Nuclear Option (Full Reset):

```bash
# Stop dev server
# Delete all build artifacts
rm -rf .next node_modules
# Reinstall everything
npm install
# Rebuild
npm run dev
```

## Getting More Help

If none of these work, please provide:
1. The exact error message from the browser console
2. The terminal output from the dev server
3. Your Node.js version (`node --version`)
4. Your npm version (`npm --version`)

## Known Issues

### Issue: Three.js Canvas Not Rendering

**Symptoms:** White screen, no errors in console

**Solution:** Check if WebGL is enabled in your browser:
- Visit `chrome://gpu` (Chrome) or `about:support` (Firefox)
- Look for "WebGL" status
- If disabled, enable it in browser settings

### Issue: Cards Not Loading

**Symptoms:** Game loads but no cards visible

**Solution:** 
1. Check `/api/game/cards` endpoint works: `http://localhost:3000/api/game/cards?limit=10`
2. If it returns empty array, seed the database
3. If it returns 404, check the API route file exists

### Issue: Performance Issues

**Symptoms:** Game loads but is very slow/laggy

**Solution:**
1. Close other browser tabs
2. Reduce the number of cards in the deck (edit `app/game/page.tsx`)
3. Disable shadows in `GameScene.tsx` (change `shadows` prop to `false`)

## Still Need Help?

The game should work if:
- ✓ Dev server is running
- ✓ No console errors
- ✓ Database is seeded
- ✓ All dependencies installed

If you're still seeing a white screen with no console errors, it's likely a browser compatibility issue. Try:
1. Different browser (Chrome, Firefox, Edge)
2. Incognito/Private mode
3. Different device

The most common cause is **missing dependencies** or **dev server not running**. Start there!
