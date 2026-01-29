# Quick Start: Deploy to Vercel

## One-Time Setup

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add Vercel deployment config"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Click "Deploy" (settings auto-detected)

## What's Configured

✅ **SPA Routing**: All routes rewrite to `index.html`  
✅ **PWA Support**: Service worker and manifest configured  
✅ **Build Settings**: Vite builds to `dist/`  
✅ **Caching**: Optimized headers for assets and service worker  
✅ **HTTPS**: Automatic (Vercel default)

## Files Created/Modified

- `vercel.json` - Vercel deployment configuration
- `vite.config.ts` - Updated build settings
- `.gitignore` - Added `dist/` and `.vercel/`

## Verify After Deployment

1. Visit your deployed URL
2. Test SPA routing (navigate to different routes)
3. Check PWA installation (mobile: "Add to Home Screen")
4. Test offline (DevTools → Network → Offline)

## Need Help?

See `VERCEL_DEPLOYMENT.md` for detailed instructions and troubleshooting.






