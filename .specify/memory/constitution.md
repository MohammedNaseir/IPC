# IPC Management Portal Constitution

## Core Principles

### I. Server-Only Data Access

Database access MUST exist only under `src/server/**`, and every module there MUST begin with
`import 'server-only'`. Client components (`'use client'`) MUST reach data exclusively through
Server Actions in `src/server/actions/*` and serializable DTOs in `src/lib/*`; they MUST NOT
import Prisma, a database driver, or any connection string. Secrets MUST be read from
`process.env` on the server only, and no secret may ever sit behind a `NEXT_PUBLIC_` (or any
other client-exposed) prefix.

Rationale: the predecessor SPA shipped the database URL and query code to the browser, which
made every row reachable by any visitor. The import boundary is what prevents a repeat, and it
is mechanically checkable by grepping client files and scanning the production bundle.

### II. Layered Server-Side Authorization

Authorization MUST be enforced on the server at four layers: route gating in `src/proxy.ts`,
page guards (`requirePageUser` / `requirePageCentral` / `requirePageHospital`), hospital-scoped
queries (`hospitalScope(user)`), and per-action guards. Every exported Server Action MUST call
`requireActionUser()` or `requireActionCentral()` before any other work, MUST validate input
with zod, and MUST load target rows scoped to the caller (`{ id, ...hospitalScope(user) }`),
returning a not-found-style error rather than confirming a record exists. Role and hospital MUST
be re-read from the database per request, never trusted from client input. Hiding a control in
the UI is NEVER an access control.

Rationale: a `hospital` coordinator must not read or write another hospital's data even with a
hand-crafted request. Defense at four layers means one missed check is not a breach, and each
layer is testable by replaying crafted requests with a positive control.

### III. No Backdoors, No Fabricated Data

Hardcoded credentials, default passwords, developer superusers, email-only or passwordless
login, and impersonation of another account are FORBIDDEN. A password MUST be accepted only via
bcrypt comparison against a stored hash. The application MUST ship with zero seed, demo, or
sample rows; the first administrator is created by an explicit operator command. The UI MUST NOT
display invented figures: a metric without data renders an explicit empty state (for example
`—`), never a plausible-looking placeholder number.

Rationale: the prior implementation accepted any 4-character password for a hidden admin email
and printed default passwords on the login screen. Fabricated KPI numbers are equally damaging
in a compliance product, because a reviewer cannot distinguish them from measurements.

### IV. Spec-Anchored Scope

The Arabic SRS (`docs/SRS_IPC_Management_Portal_Neon.md`, FR-1…FR-43) is the functional source of
truth, and `prisma/schema.prisma` is the data-model source of truth. Work MUST implement what the
spec defines and MUST NOT add scope the spec excludes (SRS §6: SSO, mobile app, QR, AI, Power BI,
policy read-acknowledgement, multiple accounts per hospital, separate corrective-action entity).
Any deliberate deviation from the spec — including a requirement intentionally not implemented —
MUST be recorded in `docs/CLAUDE_REFERENCE.md` with its reason. Where the older
`docs/OFFICIAL_SYSTEM_SPECIFICATIONS.md` conflicts with this constitution, this constitution
wins; its "Dev Admin" hidden-superuser section MUST NOT be implemented.

Rationale: two overlapping Arabic specs disagree, and one of them mandates a security backdoor.
Naming one spec as authoritative and requiring deviations to be written down keeps drift visible
instead of discovering it during a security review.

### V. Evidence Before Done

Work MUST NOT be reported as complete, fixed, or passing without running the verification and
observing the result. `npm run typecheck`, `npm run lint`, and `npm run build` MUST all pass
before a change is called done. A change to authentication, authorization, or data scoping MUST
additionally be exercised against a running build with a negative test (the disallowed request is
refused) AND a positive control (the equivalent allowed request succeeds), so a refusal cannot be
mistaken for a broken test. Claims MUST state what was verified and what was not.

Rationale: a security rejection that happens for the wrong reason — a malformed request, a typo —
looks identical to a working control. The positive control is what distinguishes enforcement from
an accident, and it has already caught a false pass in this project.

## Security & Data Integrity Constraints

- **Env vars**: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (≥32 chars), `CRON_SECRET`, and
  `UPLOADS_DIR` are server-only and MUST NOT be committed. `.env*` stays git-ignored; only
  `.env.example`, holding placeholders, is tracked.
- **Sessions**: the session cookie MUST be `httpOnly`, `Secure`, `SameSite=Lax`, and carry a
  signed token. Changing a password or email MUST invalidate existing sessions via
  `sessionVersion`, and a coordinator of a disabled hospital MUST lose access.
- **Uploads**: every upload MUST pass the extension allowlist and magic-byte check with a size
  cap. Downloads MUST be served only through the authorized route that re-checks scope; upload
  bytes MUST NOT be exposed by any public static path.
- **Audit trail**: every mutation MUST write an `AuditLog` entry inside the same transaction.
  `AuditLog` is append-only and MUST stay protected at the database level; actor names are stored
  as snapshots so history is never rewritten.
- **Immutability**: a completed (archived) visit MUST reject further writes, including by
  `central`.
- **Arabic/RTL**: all user-facing UI MUST be Arabic with correct RTL layout, including new
  screens, empty states, and error messages.
- **Production data**: schema or data changes against a live database MUST be explicitly approved
  before execution, and any destructive step MUST first verify the affected rows under a
  transaction that aborts if the data is not what was expected.

## Development Workflow & Quality Gates

- **Gates**: typecheck, lint, and a production build MUST pass before merge. There is no
  automated test suite or CI in this repository today; until one exists, Principle V is satisfied
  by scripted or manual verification whose commands and output are reported. When a test
  framework is adopted, security-critical paths get automated regression tests first.
- **Migrations**: any `prisma/schema.prisma` change MUST ship with a committed migration in
  `prisma/migrations/`, and that migration MUST be applied to the target database before the
  code that depends on it is deployed. Code expecting columns the deployed database lacks is a
  release blocker.
- **Secrets hygiene**: before committing, the staged diff MUST be scanned for credentials and
  connection strings. A credential that has been exposed MUST be rotated rather than reused.
- **Deployment**: the app is deployed as a Node standalone build; `npm run build` then
  `npm start`. Runtime configuration lives in the host's environment-variable panel, never in the
  repository.
- **Documentation**: `docs/CLAUDE_REFERENCE.md` is the orientation document for humans and
  agents. A change to architecture, invariants, or known gaps MUST update it in the same change.

## Governance

This constitution supersedes other practices and conventions in this repository. Where a
document, comment, or habit conflicts with it, this file wins.

Amendments MUST be made by editing this file in a reviewable change that states the new version,
the rationale, and the migration impact of any newly binding rule. Versioning follows semantic
versioning: MAJOR for removing or redefining a principle in a backward-incompatible way, MINOR
for adding a principle or materially expanding guidance, PATCH for clarifications and wording
that do not change obligations.

Compliance is verified at review time: every change MUST be checked against Principles I–V and
the constraint sections above, and any added complexity MUST be justified against Principle IV's
scope boundary. A reviewer who cannot see the evidence required by Principle V MUST treat the
change as unverified. Runtime development guidance for agents and contributors lives in
`docs/CLAUDE_REFERENCE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-09-27 | **Last Amended**: 2026-09-27
