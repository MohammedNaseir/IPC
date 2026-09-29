# IPC Management Portal — Reference Doc for Claude

Orientation doc for future sessions. Updated 2026-09-27: attendance decoupled from `Practitioner`
(feature 001) and every record list moved onto one shared table (feature 002). The stack itself dates from
the migration off the Vite client-only SPA to Next.js App Router with a server-side data layer.

Source documents:
- `docs/SRS_IPC_Management_Portal_Neon.md` — Arabic SRS v1.0. **The functional spec** (FR-1…FR-43, data model, NFRs). Requirements deliberately superseded by later decisions are listed in §9 — check it before treating an FR as binding.
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
- **Attendance import**: `importAttendanceNames` accepts `.xlsx`/`.csv`, parses it **in memory via
  `src/server/attendance/import.ts` and discards it** — import files are never written to
  `UPLOADS_DIR` nor recorded in `StoredFile`, so the stored-file allowlist stays untouched. The
  template is served by `GET /api/templates/attendance-names` as UTF-8-BOM CSV, with the header text
  shared through `src/lib/attendance.ts` so writer and parser cannot drift.
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
src/components/table/*            shared record table (DataTable + useTableState + parts)
src/lib/table.ts                  ColumnDef/RowAction/TableState types, Arabic collator + search normalisation
src/app/(portal)/*/loading.tsx    route-transition skeleton (TableSkeleton)
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
- `TrainingAttendance` is a name **xor** a headcount: each row carries either `attendeeName` (free
  text, ≤200 chars) or `headcount`, never both. A CHECK constraint enforces the per-row rule and a
  partial unique index allows at most one headcount row per training; the write path replaces a
  training's whole set inside one transaction, taking `SELECT … FOR UPDATE` on the training so two
  concurrent saves cannot merge. There is **no** link to `Practitioner` (see §9 D-001).
- Programs UI treats Program as a root node and ProgramFolder as child nodes (`listProgramTree`).

## 6. Operations

```
npm install
npx prisma migrate deploy          # needs DIRECT_URL
npm run admin:create -- --email <email> --name "<name>"   # password via ADMIN_PASSWORD or prompt
npm run build && npm start
```
Schedule `GET /api/cron/notifications` (Authorization: Bearer $CRON_SECRET), e.g. hourly.

## 7. Rendering record lists (the convention, feature 002)

Every list of records renders through **`<DataTable />`** in `src/components/table/`. A screen supplies a
`ColumnDef[]` and its already-scoped rows; the table adds sorting, search, paging and the two empty states.
Do **not** write a new card grid or a hand-rolled `<table>` for records — there are none left in
`src/components/views/`, and re-adding one puts that screen back outside the shared behaviour.

- `src/lib/table.ts` holds the types and the two pure helpers: `compareValues` (cached
  `Intl.Collator('ar', { numeric: true, sensitivity: 'base' })`, absent values last in **both** directions)
  and `normalizeForSearch` (trim, lowercase, strip harakat and tatweel, unify `أ إ آ ٱ` → `ا`; it
  deliberately does not fold `ة`→`ه` or `ى`→`ي`).
- **Paging is client-side only.** The screen still receives every row it is allowed to see and the table
  slices one page out of that array. This feature improved findability, **not** load time or memory —
  server-side paging is a deferred follow-up, so do not cite this table as a fix for large-list performance.
- Sorting/filtering 1,000 rows measured 127–160 ms end to end at the default 25-row page. At 100 rows per
  page the same interactions cost ~320–355 ms, because both layouts are rendered and switched by CSS.
- Selection stays in the parent screen (`selectedRowKey` + `onRowSelect`), so a master-detail screen can
  report a selection the current filter excludes instead of showing stale detail.
- Sub-sections (assets, hospitals) need **one table instance each and a distinct React `key`** — two
  `<DataTable/>`s at the same position in the tree otherwise share one instance, and search/sort state
  leaks between the tabs.
- Client-side filtering is not access control. Rows must already be role-scoped by the server query.
- Below the `md` breakpoint the table renders as stacked cards (a `<dl>` per record); columns marked
  `hideBelowMd` are omitted there. The card layout carries its own sort control, since there are no headers
  to activate.
- Arabic collation note: ICU treats `آ` as a distinct letter from `أ`/`ا`, so `آ`-initial names sort before
  the others. Search normalisation unifies all three; sorting does not.

### Per-record pages (feature 003)

Visits and trainings each have their own page — `/visits/[id]` and `/trainings/[id]` — instead of a detail
panel beside the list. The list screens keep the shared table; activating a row navigates.

**The rule that matters, and the one to copy for any future per-record address:** a record reached by id
is resolved with the caller's scope **inside the query's `where` clause**
(`findFirst({ where: { id, ...hospitalScope(user) } })`), the fetcher returns `null` for "does not exist"
and "not yours" alike, and the page calls `notFound()` before rendering anything. There is deliberately
no branch between the two cases, because a page that 404s for a fabricated id but behaves differently for
a real foreign record is an oracle for whether another hospital's record exists. Never fetch unscoped and
compare afterwards — that is authorization after the fact, which Principle II forbids.

Two more conventions from that feature:

- **List state is restored, not addressable.** A list's URL stays constant as the user searches, sorts and
  pages; returning from a record page restores the place from a client-side store keyed per table
  (`src/components/table/listStateStore.ts`, opted into with `stateKey`). This was a deliberate product
  decision — do not "fix" it by adding query parameters. The store is client-only: module state on the
  server is shared across requests, so writing it there would leak one user's view state into another's
  page. It resets on a hard reload, which is accepted.
- **Row navigation is a real link plus row activation.** The primary cell carries an `<a>` so the
  destination is announced as a navigation and supports middle-click and open-in-new-tab; the row stays
  clickable and keyboard-activatable to the same address.

## 8. Known gaps (not implemented)

- FR-35 **email** delivery (in-app notifications only; no mail provider in the spec).
- FR-42 PDF export is browser print (`window.print()`), not server-generated PDFs.
- FR-43 export is Excel-compatible CSV, not native `.xlsx`.
- No login rate limiting / lockout; no password self-service reset (central resets coordinator passwords).
- Audit screen loads the latest 500 entries; they are paged client-side by the shared table, and its CSV
  export emits the filtered-and-sorted set the user is looking at.
- File bytes live on local disk under `UPLOADS_DIR`, not in Postgres. On a failed upload transaction the written file is not cleaned up (harmless orphan, no automated sweep yet).

## 9. Recorded deviations from the SRS (constitution Principle IV)

Deviations are recorded here, not by editing the SRS. Each entry names what is superseded, by
what, and whether the SRS document itself still needs a manual update.

### D-001 — Training attendance is not linked to Practitioner (2026-09-27)

- **Superseded**: SRS **FR-21** ("attendance recorded two ways: names linked to the practitioner
  database, or a total headcount") and SRS **FR-26** ("the practitioner database is used as the
  reference for linking attendance names in the training module").
- **Superseded by**: `specs/001-training-attendance-names/spec.md`.
- **Reason**: `Practitioner` records represent the hospital's IPC committee members only — a
  narrow, specific group. Training attendees are a different and much broader population
  (nurses, cleaners, visiting staff). Linking attendance to practitioners misrepresented who
  actually attended. An attendee whose name happens to match a registered practitioner is a
  coincidence, never a link.
- **New rule**: a training's attendance is exactly one of a bare headcount, or a list of named
  attendees stored as free text (manual entry or Excel import). Attendance carries no reference
  to `Practitioner`, and the practitioner-linked mode and its schema field are removed.
- **Status**: recorded exception, **not** a spec amendment. The formal SRS document has **not**
  been edited; FR-21 and FR-26 still read the old way and need a manual update by the product
  owner. Until that happens, this entry governs.
- **Still true**: `Practitioner` keeps its own screens and purpose (IPC committee roster,
  SRS FR-24/FR-25); only its use as an attendance reference is withdrawn.
