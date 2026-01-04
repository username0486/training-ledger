# Refactoring Plan: Remove Authentication

## Overview
Convert the app to run in fully local, unauthenticated mode while preserving all workout/exercise functionality.

## Steps Required

### 1. Restore Source Files
- Files appear to be missing from the working directory
- Need to restore from git or backup before proceeding

### 2. Remove Authentication Components
- **Delete**: `src/app/screens/AuthScreen.tsx` (if exists)
- **Remove**: Auth initialization logic from `App.tsx`
- **Remove**: User state management (`useState<User | null>`)
- **Remove**: Auth guards and conditional rendering based on user

### 3. Update App.tsx
- Remove `user` state
- Remove `setUser` calls
- Remove auth initialization `useEffect`
- Change initial screen from `'auth'` to `'home'`
- Remove all `user` prop passing to child components
- Remove auth-related imports (Supabase auth, etc.)

### 4. Update AppHeader Component
- Remove profile/avatar button
- Add theme toggle (Light/Dark mode)
- Store theme preference in localStorage
- Default to system theme if no preference
- Keep toggle visually subtle

### 5. Update HomeScreen
- Remove personalized greetings (user names)
- Remove user-specific stats
- Keep functional content: resume workout, log exercise, saved workouts
- Remove `user` prop if present

### 6. Update All Screens
- Remove `user` prop from:
  - `HistoryScreen`
  - `ProfileScreen` (may need to remove entirely or repurpose)
  - Any other screens that receive user prop
- Remove user-specific conditional rendering

### 7. Remove Auth Utilities
- **Delete or comment out**: `src/app/utils/auth.ts` (or remove auth functions)
- Remove Supabase auth imports where not needed
- Keep API utilities if they're used for other purposes

### 8. Update Navigation
- Ensure app always starts at home screen
- Remove any auth redirects
- Remove protected route logic

### 9. Theme Toggle Implementation
- Add theme state management in App.tsx
- Use system preference as default
- Store in localStorage as `'workout-app-theme'`
- Pass theme toggle function to AppHeader
- Apply theme class to document root

## Files to Modify

1. `src/app/App.tsx` - Main app component
2. `src/app/components/AppHeader.tsx` - Header with theme toggle
3. `src/app/screens/HomeScreen.tsx` - Remove personalization
4. `src/app/screens/HistoryScreen.tsx` - Remove user prop
5. `src/app/screens/ProfileScreen.tsx` - Remove or repurpose
6. `src/app/utils/auth.ts` - Remove or strip auth functions

## Files to Delete (if they exist)

1. `src/app/screens/AuthScreen.tsx`
2. Auth-related utility files

## Testing Checklist

- [ ] App boots directly to home screen
- [ ] No login screen appears
- [ ] Theme toggle works (Light/Dark)
- [ ] Theme preference persists across sessions
- [ ] All workout functionality works
- [ ] Exercise logging works
- [ ] History screen works
- [ ] No console errors about user/auth
- [ ] Local storage still works for workouts/exercises



