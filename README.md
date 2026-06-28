# CollabDocs — Local-First Collaborative Document Editor

A production-grade collaborative document editor built with Next.js 16, React 19, TypeScript, PostgreSQL, and IndexedDB. Works fully offline and syncs automatically when connectivity is restored.

---

## Features

- **Offline-First** — IndexedDB is the primary database; the server is a backup
- **Auto-sync** — Background sync engine with exponential backoff and conflict resolution
- **Conflict Resolution** — Optimistic concurrency with revision-based detection
- **Real-time Collaboration** — WebSocket support (Phase 3)
- **Version History / Time Travel** — Snapshot any state, restore any version
- **AI Writing Tools** — Summarize, improve, translate, rewrite, and more
- **Authentication** — NextAuth v5 with credentials (email + hashed password)
- **Authorization** — Role-based (OWNER / EDITOR / VIEWER) enforced on both client and server
- **Secure APIs** — Zod validation, CSRF protection, rate limiting, row-level authorization

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | Next.js 16 App Router, React 19, TypeScript     |
| Styling    | Tailwind CSS v4, shadcn-style components        |
| Forms      | React Hook Form + Zod                          |
| Server state | TanStack Query v5                             |
| Auth       | NextAuth v5 (Auth.js) + Prisma Adapter          |
| Database   | PostgreSQL via Prisma ORM                       |
| Local DB   | IndexedDB via Dexie.js                          |
| AI         | Anthropic Claude API                            |
| Deployment | Vercel + Neon PostgreSQL                        |

---

## Folder Structure

```
houseof_edtech/
├── app/
│   ├── (auth)/          # Login, Register pages
│   ├── (dashboard)/     # Dashboard, Documents, Editor, History, Profile, Settings
│   └── api/             # REST API routes
│       ├── auth/        # NextAuth handler
│       ├── documents/   # CRUD + members + versions + restore
│       ├── sync/        # Offline operation sync endpoint
│       ├── ai/          # AI writing tools
│       └── register/    # User registration
├── components/
│   ├── ui/              # Button, Input, Card, Badge, Avatar, Toaster, Spinner
│   ├── layout/          # Sidebar, SyncIndicator
│   └── providers.tsx    # TanStack Query + Session providers
├── features/
│   ├── auth/            # LoginForm, RegisterForm
│   ├── documents/       # DocumentEditor, MembersPanel
│   ├── ai/              # AIPanel
│   └── sync/            # SyncEngine (background sync worker)
├── hooks/
│   ├── use-documents.ts # TanStack Query hooks for documents
│   ├── use-ai.ts        # AI action hook
│   └── use-sync-status.ts
├── lib/
│   ├── auth/auth.ts     # NextAuth configuration
│   ├── db/prisma.ts     # Prisma singleton
│   ├── db/local.ts      # Dexie (IndexedDB) helpers
│   ├── validations/     # Zod schemas
│   └── utils/           # cn, format, api helpers
├── repositories/
│   └── document.repository.ts   # All DB access (no Prisma in route handlers)
├── types/
│   └── index.ts         # Shared TypeScript types
├── prisma/
│   └── schema.prisma    # Database schema
└── middleware.ts         # Route protection
```

---

## Database Design

### Tables
- **users** — Auth accounts (password hashed with bcrypt, cost 12)
- **accounts** — OAuth accounts (NextAuth)
- **sessions** — JWT sessions (NextAuth)
- **documents** — Collaborative documents with soft-delete and revision counter
- **document_members** — Role-based access (OWNER/EDITOR/VIEWER), unique per (doc, user)
- **operations** — Offline operation log with idempotency key, device ID, revision
- **versions** — Document snapshots; never overwritten
- **sync_logs** — Audit log of sync events (success/conflict/error)

---

## Sync Engine

The `SyncEngine` (`features/sync/sync-engine.ts`) runs in the background:

1. Polls IndexedDB every 5 seconds for `PENDING` operations
2. Groups operations by document and deduplicates (collapses multiple `UPDATE_CONTENT` ops into one — the latest wins)
3. POSTs batches to `/api/sync`
4. Handles three outcomes per operation:
   - **synced** — marks as `SYNCED`, updates local revision
   - **conflict** — marks as `CONFLICT`, applies server's authoritative state locally
   - **error** — increments `retryCount`, retries with exponential backoff (max 3 attempts)
5. Listens for `online`/`offline` browser events to pause/resume automatically

---

## Conflict Resolution

Strategy: **Revision-based optimistic concurrency + last-write-wins with conflict logging**

- Every document has an integer `revision` that increments atomically on every write
- Clients include the `revision` they based their change on in every operation
- If `operation.revision === server.revision` → fast path, apply immediately
- If `operation.revision < server.revision` → conflict detected; server applies the change anyway (LWW) but returns `conflictData` so the client can notify the user
- Full conflict history is written to `sync_logs`

**Why not CRDT?**
CRDTs are ideal but require significant complexity (vector clocks, merge functions). For a rich-text collaborative editor at this scope, LWW per document with clear user notification provides a pragmatic tradeoff between correctness and implementation complexity.

---

## API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Create user account |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth session endpoints |
| GET | `/api/documents` | List user's documents |
| POST | `/api/documents` | Create document |
| GET | `/api/documents/:id` | Get document (with members) |
| PATCH | `/api/documents/:id` | Update title/content |
| DELETE | `/api/documents/:id` | Soft-delete (owner only) |
| GET | `/api/documents/:id/versions` | List snapshots |
| POST | `/api/documents/:id/versions` | Create snapshot |
| POST | `/api/documents/:id/versions/:versionId/restore` | Restore version |
| GET | `/api/documents/:id/members` | List members |
| POST | `/api/documents/:id/members` | Add member |
| DELETE | `/api/documents/:id/members` | Remove member |
| POST | `/api/sync` | Batch sync offline operations |
| POST | `/api/ai` | AI writing tools |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
DATABASE_URL="postgresql://..."      # Neon or Supabase connection string
AUTH_SECRET="..."                    # Random 32-byte string (openssl rand -base64 32)
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="..."              # Claude API key for AI features
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Fill in DATABASE_URL, AUTH_SECRET, ANTHROPIC_API_KEY

# 3. Generate Prisma client and push schema
npm run db:generate
npm run db:push

# 4. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment (Vercel + Neon)

1. Push to GitHub
2. Import repo in Vercel
3. Add environment variables in Vercel dashboard
4. Vercel auto-deploys on every push to `main`

---

## Tradeoffs

| Decision | Reason |
|----------|--------|
| LWW conflict resolution instead of CRDT | Simpler to implement correctly; CRDT adds significant complexity for rich text |
| Polling sync (5s) instead of push | Works without WebSocket infra; WebSocket layer added in Phase 3 |
| IndexedDB as primary DB | Instant UI — no spinners; works offline by default |
| JWT sessions instead of DB sessions | Required for Next.js Edge middleware; no DB round-trip per request |
| Soft delete | Prevents accidental data loss; simplifies restore operations |

---

## Future Improvements

- [ ] WebSocket real-time cursors and presence
- [ ] CRDT (Yjs) for true concurrent editing without conflicts
- [ ] Rich text editor (Tiptap/ProseMirror) instead of plain textarea
- [ ] File attachments
- [ ] Document templates
- [ ] Export to PDF / Markdown
- [ ] Email invitations for members
- [ ] Rate limiting middleware (Redis-backed)
- [ ] End-to-end tests (Playwright)
- [ ] Unit tests for sync engine and conflict resolution
