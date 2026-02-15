# Release Checklist - Training Ledger v0.0.2

This checklist covers the steps required to build and deploy a production-ready release of Training Ledger.

## Pre-Release Configuration

### ✅ Version & Build Number
- [x] Version updated to `0.0.2` in `package.json`
- [ ] Build number/version verified in built artifacts
- [ ] Version displayed correctly in app (if About screen exists)

### ✅ Dev-Only Features
- [x] Seed data buttons gated with `import.meta.env.DEV` (HomeScreen)
- [x] Dev seed functions check `import.meta.env.PROD`
- [x] Console logs minimized/removed in production
- [ ] All dev-only UI elements hidden in production build

### ✅ Build Configuration
- [x] Vite configured for production (minify, no sourcemaps)
- [ ] Production build tested locally
- [ ] Bundle size verified (should be reasonable for PWA)

## Build Steps

### 1. Clean Previous Builds
```bash
rm -rf dist
```

### 2. Production Build
```bash
npm run build
```

Expected output:
- `dist/` directory with production assets
- `dist/index.html` - main entry point
- `dist/assets/` - JS/CSS bundles
- `dist/manifest.json` - PWA manifest
- `dist/icon-*.png` - App icons
- `dist/exercises/systemExercises.json` - Exercise database

### 3. Verify Build Output
```bash
# Check build output
ls -la dist/
ls -la dist/assets/

# Verify no dev files included
grep -r "import.meta.env.DEV" dist/ || echo "No dev code found (good)"
```

### 4. Test Production Build Locally
```bash
# Serve production build locally
npx serve dist

# Or use Python
python3 -m http.server 8080 -d dist
```

Test in browser:
- [ ] App loads without errors
- [ ] No dev seed buttons visible
- [ ] No console spam
- [ ] PWA installable (manifest works)
- [ ] Icons display correctly

## QA Testing (Critical Flows)

### Workout Flow
- [ ] Start workout → Log sets → Complete workout → Appears in History
- [ ] Repeat workout → Creates NEW session (not historical data)
- [ ] Repeat exercise → Creates NEW session (not historical data)

### Session Management
- [ ] In-progress session modal: Resume vs Start new
- [ ] Save vs discard rules work correctly
- [ ] Empty sessions discarded, meaningful work saved

### History
- [ ] History filters: All / Workouts / Exercise only
- [ ] History selection + bulk delete
- [ ] Single-entry delete from summary page
- [ ] Jump to date modal:
  - [ ] Year arrows: left=past, right=future
  - [ ] Month grid disables months without data
  - [ ] Jump expands target month

### Settings
- [ ] Settings page (gear icon): kg/lb toggle
- [ ] Light/dark theme toggle
- [ ] Preferences persist across app restarts
- [ ] Unit changes apply globally (all weight displays)

### Search & Exercise Creation
- [ ] Search defaults: recents ≤7, no full list
- [ ] Create exercise works (name-only)
- [ ] Search is responsive with 800+ exercises

### Data Persistence
- [ ] Workouts persist across app restarts
- [ ] Exercise-only logs persist
- [ ] Templates persist
- [ ] Preferences persist
- [ ] No data loss on refresh

## Performance & Stability

- [ ] No crashes during normal use
- [ ] Search performance acceptable (800+ exercises)
- [ ] No memory leaks (test extended session)
- [ ] Smooth scrolling in History
- [ ] No console errors in production build

## PWA Configuration

### Manifest
- [x] `manifest.json` present and valid
- [x] App name: "Training Ledger"
- [x] Icons: 192x192 and 512x512 present
- [ ] Theme color matches app design
- [ ] Display mode: "standalone"

### Service Worker
- [ ] Service worker registered (if applicable)
- [ ] Offline functionality works
- [ ] Cache strategy appropriate

## Deployment

### Static Hosting (Vercel/Netlify/GitHub Pages)
1. Build production bundle: `npm run build`
2. Deploy `dist/` directory
3. Configure:
   - SPA routing (all routes → index.html)
   - HTTPS enabled
   - Cache headers for assets

### Deployment Commands
```bash
# Build
npm run build

# Deploy to Vercel (if configured)
vercel --prod

# Or deploy dist/ to your hosting provider
```

## Post-Deployment Verification

- [ ] App accessible at production URL
- [ ] PWA installable on mobile devices
- [ ] All critical flows work in production
- [ ] No console errors
- [ ] Performance acceptable on real devices

## Known Issues / Notes

- None currently

## Store Readiness (Future - if converting to native app)

### iOS App Store
- [ ] Bundle identifier configured
- [ ] App icons (all required sizes)
- [ ] Privacy policy URL
- [ ] App Store description
- [ ] Screenshots (various device sizes)
- [ ] TestFlight build tested

### Google Play Store
- [ ] Package name configured
- [ ] App icons (all required sizes)
- [ ] Privacy policy URL
- [ ] Store listing description
- [ ] Screenshots (various device sizes)
- [ ] Signed AAB/APK generated

## Rollback Plan

If issues found post-deployment:
1. Revert to previous version
2. Document issue
3. Fix in development
4. Re-test and redeploy

---

**Release Date:** TBD  
**Version:** 0.0.2  
**Build:** Production

