# IPC Management Portal — Reference Doc for Claude

Orientation doc for future sessions. Updated 2026-09-15 after the migration from the
Vite client-only SPA to Next.js App Router with a server-side data layer.

Source documents:
- `docs/SRS_IPC_Management_Portal_Neon.md` — Arabic SRS v1.0. **The functional spec** (FR-1…FR-43, data model, NFRs).
- `docs/OFFICIAL_SYSTEM_SPECIFICATIONS.md` — Arabic "production spec". Its **Dev Admin** section (hardcoded email, hidden superuser) and "Neon modal" deployment steps are **intentionally not implemented** — they were a security backdoor. Do not reintroduce them.
- `docs/DESIGN-apple.md` — Apple.com design-token analysis; a style reference only.
- There is no PRD in the repo.

## 1. Product

Arabic/RTL portal for infection prevention & control across a health cluster.
- `central` — full access to all modules and hospitals.
- `hospital` — one coordinator account per hospital (`User.hospitalId` is unique), scoped to that hospital only.

Out of scope (SRS §6): SSO, mobile app, QR, AI, Power BI, policy read-acknowledgement, multiple accounts per hospital, separate corrective-action entity.

## 2. Stack

Next.js 16 (App Router, Turbopack) · React 19 · Prisma 7 (`prisma-client` generator → `src/generated/prisma`, `@prisma/adapter-pg`) · PostgreSQL on Neon · Tailwind v4 · zod · jose (HS256 session JWT) · bcryptjs (cost 12).

Next 16 renamed `middleware.ts` → **`src/proxy.ts`** (same feature, Node runtime).
Prisma 7: no `url` in `schema.prisma`; CLI datasource lives in `prisma.config.ts` (uses `DIRECT_URL`), runtime uses pooled `DATABASE_URL` via the adapter in `src/server/db.ts`.

## 3. Security architecture (keep these invariants)

- **Prisma is only imported under `src/server/**`**, every module there starts with `import 'server-only'`. Client components (`'use client'`) import only Server Actions from `src/server/actions/*` and types from `src/lib/*`.
- **No `NEXT_PUBLIC_` or `VITE_` env vars.** All env vars are server-only: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (≥32 chars), `CRON_SECRET`, `UPLOADS_DIR`.
- **Auth** (`src/server/auth/`): login verifies bcrypt against `User.passwordHash` (dummy hash compare for unknown emails). Session = httpOnly/Secure/SameSite=Lax cookie `ipc_session` (8h) holding a signed JWT `{sub, role, hid, sv}`. `getCurrentUser()` re-reads the user from the DB on every request, rejects if `sessionVersion` changed (password/email change) or the coordinator's hospital is disabled. There is **no** passwordless login, impersonation, default password or superuser.
- **Authorization is layered**:
  1. `src/proxy.ts` — no session → `/login` (401 for `/api/*`); `/hospitals`, `/audit`, `/api/reports` central-only; `/hospital-profile` hospital-only.
  2. Pages — `requirePageUser/Central/Hospital()`.
  3. Queries (`src/server/queries/*`) — hospital-owned rows filtered with `hospitalScope(user)`.
  4. Server Actions (`src/server/actions/*`) — every export starts with `requireActionUser()`/`requireActionCentral()`, validates input with zod, loads target rows with `{ id, ...hospitalScope(user) }` (404-style error on miss), and wraps work in `runAction()` (user-facing errors only, calls `refresh()`).
- **Files**: uploads go through `storeUpload()` (extension allowlist + magic-byte check, 8 MB, written to disk under `UPLOADS_DIR`; `StoredFile` holds only metadata + `path`). `StoredFile.hospitalId` scopes access (null = library visible to all signed-in users). Download only via `GET /api/files/[id]`, which re-checks scope and streams the file off disk (returns 404 across hospitals, or if the file is missing on disk).
- **Audit**: every mutation calls `logAudit()` inside its transaction. A DB trigger (in the init migration) blocks UPDATE/DELETE on `AuditLog`.
- Completed visits are immutable (`loadOpenVisit` rejects writes).

## 4. Layout

```
src/proxy.ts                      route gate
src/app/login                     LoginView (useActionState → actions/auth.login)
src/app/(portal)/layout.tsx       requirePageUser + notifications → PortalShell (Sidebar/Header)
src/app/(portal)/<screen>/page.tsx   server component: guard + scoped queries → client view
src/app/api/files/[id]            authorized downloads
src/app/api/reports/kpis          FR-43 central CSV export (?from&to)
src/app/api/cron/notifications    FR-35/36 reminders, Bearer CRON_SECRET, idempotent
src/components/views/*View.tsx    client screens (list + detail), mutations via useActionRunner
src/server/{db,auth,queries,actions,files,audit,notify,validation,run-action}.ts
prisma/schema.prisma, prisma/migrations/, prisma.config.ts
scripts/create-admin.ts           bootstrap first central user (no seed data exists)
```

Screens → routes: dashboard, visits, trainings, hospitals (central) / hospital-profile (hospital), assets, policies, org-docs, doc-center, programs, audit (central).

## 5. Data model

19 SRS entities + `StoredFile`. Deliberate differences from the SRS tables:
- File-bearing entities reference `StoredFile` via `fileId` FKs instead of free-text `fileUrl`; DTOs expose `file.url = /api/files/<id>`.
- `Hospital` has no coordinator name/email columns — the coordinator is the `User` with that `hospitalId`.
- Added: `User.name`, `User.sessionVersion`, `Visit.complianceScore` (nullable, feeds FR-41 KPIs), `Training.notes`, `Practitioner.licenseNumber/email/phone`, `Equipment.serialNumber/status/lastMaintenance`, `Policy.version`, `ProgramFolder.description`, `Notification.link/entityId`, `AuditLog.performedByName` snapshot.
- `Training.status` persists pending/completed; `late` is derived (`deriveTrainingStatus`).
- Programs UI treats Program as a root node and ProgramFolder as child nodes (`listProgramTree`).

## 6. Operations

```
npm install
npx prisma migrate deploy          # needs DIRECT_URL
npm run admin:create -- --email <email> --name "<name>"   # password via ADMIN_PASSWORD or prompt
npm run build && npm start
```
Schedule `GET /api/cron/notifications` (Authorization: Bearer $CRON_SECRET), e.g. hourly.

## 7. Known gaps (not implemented)

- FR-35 **email** delivery (in-app notifications only; no mail provider in the spec).
- FR-42 PDF export is browser print (`window.print()`), not server-generated PDFs.
- FR-43 export is Excel-compatible CSV, not native `.xlsx`.
- No login rate limiting / lockout; no password self-service reset (central resets coordinator passwords).
- Audit screen shows latest 500 entries (no pagination).
- File bytes live on local disk under `UPLOADS_DIR`, not in Postgres. On a failed upload transaction the written file is not cleaned up (harmless orphan, no automated sweep yet).
