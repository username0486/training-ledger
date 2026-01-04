# Training Ledger - Complete Project Export for Cursor AI

## Project Overview
Training Ledger is a mobile-first workout logging application focused on speed, clarity, and low cognitive load. The app prioritizes fast logging over planning with a neutral, non-judgmental tone that avoids motivational language.

## Design Philosophy & Language
- **Ledger semantics**: Uses terminology like "Record", "Entry", "Session" instead of "Start", "Complete", "Finish"
- **Neutral tone**: Avoids coaching language like "Performance", "Progress", "Gains", "Optimize", "Crush"
- **Data-focused**: Presents information as factual records (e.g., "Max Weight Logged" not "Best Weight")
- **Non-judgmental**: No motivational messages or achievement-focused language

## Tech Stack
- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS v4.0
- **Backend**: Supabase Edge Functions (Hono web server)
- **Database**: Supabase Postgres with KV store
- **Authentication**: Supabase Auth with email/password
- **State Management**: Local state + localStorage persistence
- **Icons**: lucide-react

## Design System

### Color Tokens & Theme
- Implemented comprehensive light and dark theme system
- Dark mode aesthetic inspired by Apple Health and Linear
- Cool blue accent color (#3B82F6)
- Subtle gradients and rounded corners
- Token-based design in `/src/styles/theme.css`

### UI Components
- **Button variants**: primary (accent), neutral (muted), ghost, danger
- **Cards**: Subtle backgrounds with rounded corners
- **Modals**: Full-screen on mobile with smooth transitions
- **Navigation**: Centered pill-style theme toggle
- **Input fields**: Mobile number pad support (`inputMode="decimal"` for weights, `inputMode="numeric"` for reps)

## Core Features Implemented

### 1. Authentication System
- Email-first authentication flow with server-side validation
- Sign up with email/password (uses Supabase Admin API)
- Sign in with email/password
- Email existence check before signup/signin
- Multi-device sync capabilities
- Automatic token refresh when expired
- Session management with proper JWT validation

**Key Files:**
- `/src/app/utils/auth.ts` - Auth functions with auto-refresh
- `/supabase/functions/server/index.tsx` - Server auth endpoints

### 2. Workout Session Logging
- Create custom workout sessions
- Add multiple exercises to a workout
- Track sets with weight, reps, and rest duration
- Resume incomplete workout sessions
- Complete individual exercises within a workout
- Rest timer functionality
- Workout summaries with "next time" suggestions

**Key Files:**
- `/src/app/screens/WorkoutSessionScreen.tsx`
- `/src/app/screens/WorkoutSummaryScreen.tsx`

### 3. Single Exercise Logging
- Quick exercise logging without creating a workout
- Search-based exercise selection interface
- Display last session data for reference
- Automatic rest timer between sets
- Set tracking with format: "60 kg × 10 reps · 1:45 rest"
- Rest duration automatically recorded for all sets

**Key Files:**
- `/src/app/screens/ExerciseSessionScreen.tsx`
- `/src/app/screens/ExerciseSummaryScreen.tsx`

### 4. Session Persistence & Conflict Management
- localStorage persistence for incomplete sessions
- Rest timer continues running when navigating away
- Session conflict modal when attempting to start new session with incomplete one
- Three conflict resolution options:
  1. Resume existing session
  2. Save & start new
  3. Discard & start new
- Ensures only one workout or exercise session active at a time

**Key Files:**
- `/src/app/components/SessionConflictModal.tsx`
- localStorage keys: `incompleteExerciseSession`, `unfinishedWorkout`, `restTimerData`

### 5. History & Search
- Comprehensive workout history
- Exercise history with stats:
  - Total sessions logged
  - Max weight logged
  - Max volume logged
- Search functionality
- Multi-select for bulk actions
- Delete multiple entries

**Key Files:**
- `/src/app/screens/HistoryScreen.tsx`
- `/src/app/screens/ExerciseHistoryScreen.tsx`

### 6. Home Screen
- Quick resume cards for incomplete sessions (entire card is clickable)
- Recent activity feed
- Quick action buttons to record workouts or exercises

**Key Files:**
- `/src/app/screens/HomeScreen.tsx`

### 7. Templates System
- Save workouts as reusable templates
- Quick start from templates
- Template management

**Key Files:**
- `/src/app/screens/TemplatesScreen.tsx`
- `/src/app/types/templates.ts`

## Backend Architecture

### Three-Tier Architecture
```
Frontend (React) → Server (Hono) → Database (Postgres KV Store)
```

### API Endpoints
**Base URL**: `https://${projectId}.supabase.co/functions/v1/make-server-3d6cf358`

**Auth Endpoints:**
- `POST /auth/signup` - Create new user
- `POST /auth/check-email` - Verify email exists
- `GET /auth/session` - Get current session

**User Data Endpoints:**
- `GET /user/workouts` - Fetch user's workouts
- `POST /user/workouts` - Save workout
- `DELETE /user/workouts` - Delete workouts (bulk)
- `GET /user/templates` - Fetch user's templates
- `POST /user/templates` - Save template
- `DELETE /user/templates/:templateId` - Delete template

### Authentication Flow
1. Client requests use access token from Supabase session
2. Token sent in `Authorization: Bearer ${token}` header
3. Server validates token using `supabase.auth.getUser(accessToken)`
4. Automatic refresh if token expires within 60 seconds
5. User ID extracted for data scoping

### Data Storage
- Uses KV store with prefixed keys: `user:${userId}:workouts:${workoutId}`
- All user data is scoped by user ID
- Templates stored separately: `user:${userId}:templates:${templateId}`

**Key Files:**
- `/supabase/functions/server/index.tsx` - Main server file
- `/supabase/functions/server/kv_store.tsx` - KV utility (PROTECTED - do not modify)
- `/src/app/utils/api.ts` - API client with auto-refresh

## Key Data Types

### Workout
```typescript
interface Workout {
  id: string;
  name: string;
  date: Date;
  exercises: {
    id: string;
    name: string;
    sets: {
      id: string;
      weight: number;
      reps: number;
      restDuration?: number; // seconds
    }[];
  }[];
  duration: number; // seconds
}
```

### Exercise Session
```typescript
interface IncompleteExerciseSession {
  exerciseName: string;
  sets: {
    id: string;
    weight: number;
    reps: number;
    restDuration?: number;
  }[];
  startTime: number;
}
```

### Rest Timer Data
```typescript
interface RestTimerData {
  startTime: number;
  isRunning: boolean;
  sessionType: 'exercise' | 'workout';
  exerciseId?: string;
}
```

## Important UI/UX Details

### Rest Duration Display
- Format: "60 kg × 10 reps · 1:45 rest"
- Rest duration shown in subtle, receded styling (`text-text-muted/60`)
- Displayed in all summary and history views
- Format: `${minutes}:${seconds.padStart(2, '0')} rest`

### Button Hierarchy
- **Primary buttons** (accent): Main logging actions ("Add Set", "Log Set")
- **Neutral buttons** (muted): Secondary actions ("End Exercise", "Done")
- **Ghost buttons**: Tertiary actions
- **Danger buttons**: Destructive actions (delete)

### Modal Behavior
- Exercise complete modal title: "Exercise Recorded"
- Actions: "Done" and "Record Another"
- Edit button in header to modify before saving

### Resume Cards
- Entire card is clickable for quick resume
- Shows incomplete session details
- Visual indicator for in-progress state

## Protected Files (Do Not Modify)
- `/supabase/functions/server/kv_store.tsx`
- `/utils/supabase/info.tsx`
- `/src/app/components/figma/ImageWithFallback.tsx`

## Environment Variables (Already Configured)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

## Current State & Recent Changes

### Latest Updates
1. ✅ Changed all "Complete" buttons to "End Exercise" with neutral variant
2. ✅ Updated exercise history stats: "Best Weight" → "Max Weight Logged", "Peak Volume" → "Max Volume Logged"
3. ✅ Fixed JWT authentication with automatic token refresh
4. ✅ Updated Exercise Complete modal: "Exercise Complete" → "Exercise Recorded"
5. ✅ Made entire resume cards clickable on home screen
6. ✅ Updated all actionable buttons to use ledger semantics

### Known Working Features
- ✅ User authentication with auto-refresh
- ✅ Multi-device sync
- ✅ Session persistence across navigation
- ✅ Rest timer with persistence
- ✅ Comprehensive rest duration logging
- ✅ Session conflict management
- ✅ Search-based exercise selection
- ✅ Mobile number pad support
- ✅ Light/dark theme toggle

## File Structure Overview

```
/src/app/
├── App.tsx                          # Main app component
├── screens/
│   ├── HomeScreen.tsx              # Dashboard with resume cards
│   ├── WorkoutSessionScreen.tsx    # Active workout logging
│   ├── WorkoutSummaryScreen.tsx    # Workout completion summary
│   ├── ExerciseSessionScreen.tsx   # Single exercise logging
│   ├── ExerciseSummaryScreen.tsx   # Exercise completion summary
│   ├── HistoryScreen.tsx           # Workout history
│   ├── ExerciseHistoryScreen.tsx   # Per-exercise history
│   ├── TemplatesScreen.tsx         # Workout templates
│   ├── SettingsScreen.tsx          # App settings
│   └── AuthScreen.tsx              # Login/signup
├── components/
│   ├── Button.tsx                  # Button component
│   ├── Card.tsx                    # Card component
│   ├── Modal.tsx                   # Modal component
│   ├── SessionConflictModal.tsx    # Conflict resolution
│   ├── RestTimer.tsx               # Rest timer component
│   └── ThemeToggle.tsx             # Theme switcher
├── utils/
│   ├── api.ts                      # API client with auth
│   ├── auth.ts                     # Auth utilities
│   └── exercises.ts                # Exercise database
└── types/
    ├── index.ts                    # Core types
    └── templates.ts                # Template types

/supabase/functions/server/
├── index.tsx                        # Hono server
└── kv_store.tsx                    # KV utilities (PROTECTED)

/src/styles/
├── theme.css                        # Design tokens
├── fonts.css                        # Font imports
└── globals.css                      # Global styles
```

## Development Guidelines

### When Adding New Features
1. Use ledger-appropriate language (avoid "complete", "finish", "start")
2. Maintain neutral, non-judgmental tone
3. Keep mobile-first responsive design
4. Use existing components and design tokens
5. Ensure proper authentication on all API calls
6. Add comprehensive error logging
7. Test session persistence and conflict handling

### When Working with Backend
1. Always validate JWT tokens in server endpoints
2. Scope all data by user ID
3. Use structured error responses: `{ code: number, message: string }`
4. Add detailed console.log for debugging
5. Handle expired tokens gracefully with auto-refresh

### When Styling
1. Use Tailwind utility classes only
2. No custom font-size, font-weight, or line-height (use theme.css defaults)
3. Follow existing button variant patterns
4. Maintain consistent spacing and rounded corners
5. Use theme tokens for colors

## Next Steps & Potential Enhancements
- Add exercise analytics and charts
- Implement workout programs/routines
- Add body weight tracking
- Export workout data
- Social sharing features
- Progressive overload tracking
- Custom exercise creation
- Workout notes/comments
- RPE (Rate of Perceived Exertion) tracking
- Exercise form video links

---

**To import this project into Cursor AI:**
1. Share this prompt with Cursor
2. Provide the full codebase
3. Cursor will understand the complete context, architecture, and design decisions
4. Can continue development maintaining the established patterns and philosophy
