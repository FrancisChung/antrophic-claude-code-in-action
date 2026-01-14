# UIGen - Claude Code Instructions

AI-powered React component generator with live preview.

## Quick Reference

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run test         # Run tests with Vitest
npm run lint         # ESLint
npm run setup        # Install deps + Prisma generate + migrate
npm run db:reset     # Reset database
```

## Project Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router + Turbopack
- **UI**: React 19, Tailwind CSS v4, Radix UI primitives
- **Database**: Prisma with SQLite (`prisma/dev.db`)
- **AI**: Anthropic Claude via Vercel AI SDK (`@ai-sdk/anthropic`)
- **Testing**: Vitest + Testing Library

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/chat/route.ts   # AI chat streaming endpoint
│   ├── [projectId]/page.tsx # Project-specific page
│   └── page.tsx            # Home page (redirects authenticated users)
├── actions/                # Server actions (create/get projects)
├── components/
│   ├── auth/               # SignIn/SignUp forms, AuthDialog
│   ├── chat/               # ChatInterface, MessageList, MessageInput
│   ├── editor/             # CodeEditor (Monaco), FileTree
│   ├── preview/            # PreviewFrame (iframe-based live preview)
│   └── ui/                 # Radix-based UI primitives (shadcn/ui style)
├── lib/
│   ├── contexts/           # React contexts (FileSystem, Chat)
│   ├── tools/              # AI tools (str_replace_editor, file_manager)
│   ├── transform/          # JSX transformer for preview
│   ├── prompts/generation.tsx # System prompt for AI
│   ├── auth.ts             # JWT session management (jose)
│   ├── file-system.ts      # VirtualFileSystem class
│   ├── prisma.ts           # Prisma client singleton
│   └── provider.ts         # AI model provider (Anthropic or mock)
└── generated/prisma/       # Generated Prisma client
```

## Key Concepts

### Virtual File System
The app uses a `VirtualFileSystem` class (`src/lib/file-system.ts`) to manage files in memory. No files are written to disk - everything lives in this virtual FS and is serialized to the database for persistence.

### AI Tools
The AI has access to two tools for code generation:
1. **str_replace_editor** (`src/lib/tools/str-replace.ts`) - View, create, and edit files
2. **file_manager** (`src/lib/tools/file-manager.ts`) - Rename and delete files

### Preview System
- Generated React components are transformed via `jsx-transformer.ts`
- Preview renders in a sandboxed iframe using blob URLs and import maps
- Entry point is `/App.jsx` (or similar patterns)

### Authentication

**Flow**: `AuthDialog` (UI) → `useAuth` (hook) → Server Actions → `lib/auth.ts` (JWT)

**Layers**:

1. **`lib/auth.ts`** - JWT session management using `jose`
   - Sessions stored in HTTP-only cookie (`auth-token`), 7-day expiration
   - `createSession(userId, email)` - Signs JWT, sets cookie
   - `getSession()` - Reads cookie, verifies JWT, returns payload
   - `deleteSession()` - Clears cookie

2. **`actions/index.ts`** - Server actions
   - `signUp`: Validates → checks existing → hashes password (bcrypt) → creates user → `createSession()`
   - `signIn`: Validates → finds user → verifies password → `createSession()`
   - `signOut`: `deleteSession()` → redirect to `/`

3. **`hooks/use-auth.ts`** - Client hook
   - Wraps server actions with loading state
   - `handlePostSignIn()`: Migrates anonymous work to project, redirects to most recent project

4. **`components/auth/AuthDialog.tsx`** - Modal toggling between SignIn/SignUp forms

**Anonymous → Authenticated Migration**: When signing in, `useAuth` checks for anonymous work via `getAnonWorkData()`, creates a project with that data, then redirects

## Database Schema

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String    # bcrypt hashed
  projects  Project[]
}

model Project {
  id        String   @id @default(cuid())
  name      String
  userId    String?  # nullable for anonymous
  messages  String   @default("[]")  # JSON array
  data      String   @default("{}")  # JSON - serialized VirtualFileSystem
}
```

## Code Patterns

### Comments
Use comments sparingly. Only comment complex code.

### Path Alias
Use `@/*` for imports from `src/`:
```typescript
import { Button } from "@/components/ui/button";
import { VirtualFileSystem } from "@/lib/file-system";
```

### Server Components vs Client Components
- Pages are server components by default
- Interactive components use `"use client"` directive
- Server actions in `src/actions/` for database operations

### UI Components
Based on shadcn/ui patterns with Radix primitives. Located in `src/components/ui/`.

## Testing

Tests are colocated with source files in `__tests__/` directories:
```
src/components/chat/__tests__/ChatInterface.test.tsx
src/lib/__tests__/file-system.test.ts
```

Run tests:
```bash
npm test              # Watch mode
npm test -- --run     # Single run
```

## Environment Variables

```env
ANTHROPIC_API_KEY=    # Optional - uses mock provider if not set
JWT_SECRET=           # Optional - defaults to "development-secret-key"
```

## Common Tasks

### Adding a new UI component
1. Create in `src/components/ui/`
2. Follow existing patterns (Radix + CVA + Tailwind)

### Modifying AI behavior
- System prompt: `src/lib/prompts/generation.tsx`
- AI tools: `src/lib/tools/`
- Streaming logic: `src/app/api/chat/route.ts`

### Adding database fields
1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev`
3. Prisma client regenerates to `src/generated/prisma/`
