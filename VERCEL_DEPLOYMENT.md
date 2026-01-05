# Vercel Deployment Guide for Training Ledger PWA

This guide will help you deploy your Training Ledger PWA to Vercel with full SPA routing and offline PWA support.

## Prerequisites

1. A GitHub account
2. A Vercel account (sign up at https://vercel.com)
3. Your Training Ledger repository pushed to GitHub
4. Icon files (`icon-192x192.png` and `icon-512x512.png`) in the `public` directory

## Deployment Steps

### 1. Prepare Your Repository

Ensure your repository has:
- ✅ `vercel.json` (already created)
- ✅ `package.json` with build scripts
- ✅ `vite.config.ts` configured
- ✅ `public/manifest.json`
- ✅ `public/sw.js`
- ✅ `public/icon-192x192.png`
- ✅ `public/icon-512x512.png`

### 2. Push to GitHub

If you haven't already, push your code to GitHub:

```bash
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

### 3. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect the settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)
5. Click **"Deploy"**

#### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

### 4. Verify Deployment

After deployment, verify:

1. **SPA Routing**: Visit `https://your-domain.vercel.app` and navigate to different routes. They should work without 404 errors.

2. **PWA Installation**: 
   - On mobile: Open the site, tap the browser menu, and select "Add to Home Screen"
   - On desktop: Look for the install prompt in the address bar (Chrome/Edge)

3. **Offline Functionality**:
   - Open DevTools → Application → Service Workers
   - Verify the service worker is registered
   - Go offline (Network tab → Offline)
   - Refresh the page - it should still work

4. **Manifest**:
   - Visit `https://your-domain.vercel.app/manifest.json`
   - Should return valid JSON

5. **Service Worker**:
   - Visit `https://your-domain.vercel.app/sw.js`
   - Should return the service worker JavaScript

## Configuration Details

### vercel.json

The `vercel.json` file includes:

- **Rewrites**: All routes (`/*`) rewrite to `/index.html` for SPA routing
- **Headers**: 
  - Service worker gets no-cache headers (for updates)
  - Static assets get long-term caching
  - Manifest gets short-term caching

### Build Process

1. Vite builds your app to the `dist` directory
2. Public folder assets (manifest, service worker, icons) are copied to `dist/`
3. Vercel serves from `dist/` with the configured rewrites

## Troubleshooting

### Issue: 404 errors on direct route access

**Solution**: Ensure `vercel.json` has the rewrite rule:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Issue: Service worker not registering

**Solution**: 
- Check that `public/sw.js` exists
- Verify service worker registration in `src/main.tsx`
- Check browser console for errors
- Ensure HTTPS (Vercel provides this automatically)

### Issue: Icons not showing

**Solution**:
- Verify `icon-192x192.png` and `icon-512x512.png` exist in `public/`
- Check that files are committed to Git
- Verify manifest.json has correct icon paths (`/icon-192x192.png`)

### Issue: Build fails

**Solution**:
- Check build logs in Vercel dashboard
- Run `npm run build` locally to test
- Ensure all dependencies are in `package.json`
- Check Node.js version (Vercel uses Node 18+ by default)

## Environment Variables

If you need environment variables (e.g., for Supabase):

1. Go to your project in Vercel dashboard
2. Settings → Environment Variables
3. Add your variables
4. Redeploy

## Custom Domain

To use a custom domain:

1. Go to your project in Vercel dashboard
2. Settings → Domains
3. Add your domain
4. Follow DNS configuration instructions

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Every push to `main` branch
- **Preview**: Every push to other branches (creates preview URLs)

## Performance Optimization

The current setup includes:
- ✅ Asset caching (long-term for static assets)
- ✅ Service worker caching (offline support)
- ✅ SPA routing (no server-side rendering needed)
- ✅ Automatic HTTPS
- ✅ CDN distribution

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Test SPA routing
3. ✅ Test PWA installation
4. ✅ Test offline functionality
5. ✅ Set up custom domain (optional)
6. ✅ Configure environment variables (if needed)

## Support

- Vercel Docs: https://vercel.com/docs
- Vite Deployment: https://vitejs.dev/guide/static-deploy.html
- PWA Best Practices: https://web.dev/progressive-web-apps/





