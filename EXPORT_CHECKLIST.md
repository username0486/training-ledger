# Training Ledger Export Checklist

## Files to Export

### Root Files
- [ ] package.json
- [ ] tsconfig.json
- [ ] tailwind.config.js (if exists)
- [ ] vite.config.ts (or similar build config)
- [ ] .gitignore
- [ ] index.html
- [ ] CURSOR_EXPORT_PROMPT.md

### Source Files (/src)
- [ ] /src/main.tsx
- [ ] /src/index.css

### App Files (/src/app)
- [ ] /src/app/App.tsx

### Screens (/src/app/screens)
- [ ] /src/app/screens/HomeScreen.tsx
- [ ] /src/app/screens/AuthScreen.tsx
- [ ] /src/app/screens/WorkoutSessionScreen.tsx
- [ ] /src/app/screens/WorkoutSummaryScreen.tsx
- [ ] /src/app/screens/ExerciseSessionScreen.tsx
- [ ] /src/app/screens/ExerciseSummaryScreen.tsx
- [ ] /src/app/screens/HistoryScreen.tsx
- [ ] /src/app/screens/ExerciseHistoryScreen.tsx
- [ ] /src/app/screens/TemplatesScreen.tsx
- [ ] /src/app/screens/SettingsScreen.tsx

### Components (/src/app/components)
- [ ] /src/app/components/Button.tsx
- [ ] /src/app/components/Card.tsx
- [ ] /src/app/components/Modal.tsx
- [ ] /src/app/components/Input.tsx
- [ ] /src/app/components/SessionConflictModal.tsx
- [ ] /src/app/components/RestTimer.tsx
- [ ] /src/app/components/ThemeToggle.tsx
- [ ] /src/app/components/ExerciseCompleteModal.tsx
- [ ] /src/app/components/LogExerciseModal.tsx
- [ ] /src/app/components/figma/ImageWithFallback.tsx

### Utils (/src/app/utils)
- [ ] /src/app/utils/api.ts
- [ ] /src/app/utils/auth.ts
- [ ] /src/app/utils/exercises.ts

### Types (/src/app/types)
- [ ] /src/app/types/index.ts
- [ ] /src/app/types/templates.ts

### Styles (/src/styles)
- [ ] /src/styles/theme.css
- [ ] /src/styles/fonts.css
- [ ] /src/styles/globals.css

### Supabase Backend (/supabase/functions/server)
- [ ] /supabase/functions/server/index.tsx
- [ ] /supabase/functions/server/kv_store.tsx

### Supabase Utils (/utils/supabase)
- [ ] /utils/supabase/info.tsx

## Step-by-Step Export Process

### Option A: Use Figma Make Export (if available)
1. Click Export/Download button in Figma Make
2. Save the ZIP file
3. Extract to a folder called `training-ledger`

### Option B: Manual File Copy
1. Create local project structure
2. Copy each file from Figma Make
3. Preserve the exact directory structure

## Setting Up in Cursor AI

### 1. Install Dependencies
```bash
npm install
# or
yarn install
```

### 2. Set Up Environment Variables
Create a `.env` file in the root:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Important:** Get these values from your Figma Make environment or Supabase dashboard

### 3. Open in Cursor
```bash
cursor .
# or simply open Cursor and File > Open Folder > select training-ledger
```

### 4. Share Context with Cursor AI
1. Open Cursor AI chat (Cmd/Ctrl + L)
2. Paste the contents of `CURSOR_EXPORT_PROMPT.md`
3. Cursor now has full context of your project

### 5. Verify Setup
```bash
# Test the development server
npm run dev
```

## Environment Setup Notes

### Supabase Configuration
You'll need to either:
1. **Use existing Supabase project**: Copy your project ID and keys from Figma Make
2. **Create new Supabase project**: 
   - Go to https://supabase.com
   - Create new project
   - Deploy the server function from `/supabase/functions/server/`
   - Update environment variables

### Deploy Supabase Edge Function (if needed)
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy function
supabase functions deploy make-server-3d6cf358
```

## Quick Start Commands

```bash
# Development
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Type check
npm run type-check
```

## Cursor AI Chat Prompts to Use

After opening in Cursor, try these prompts:

**Initial Setup:**
> "I've imported the Training Ledger codebase. Please review the CURSOR_EXPORT_PROMPT.md file to understand the project architecture and design philosophy."

**Continue Development:**
> "Following the ledger semantics and neutral tone established in this project, help me add [feature name]"

**Debugging:**
> "There's an error with [specific issue]. Please help debug while maintaining the existing code patterns and authentication flow."

**Refactoring:**
> "Help me refactor [component name] while preserving the design system tokens and mobile-first approach."

## Important Reminders

- ✅ Maintain ledger semantics (Record, Entry, Session)
- ✅ Avoid motivational language
- ✅ Keep mobile-first responsive design
- ✅ Use existing design tokens from theme.css
- ✅ Don't modify protected files (kv_store.tsx, info.tsx)
- ✅ Always validate authentication in backend endpoints
- ✅ Test session persistence after changes
