# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two roles, both internal to a health cluster. There is no public or patient-facing surface.

- **central** — the cluster's central infection-prevention administration. Sees and acts across every
  hospital: schedules and archives supervisory visits, issues training templates, manages hospitals and
  coordinator accounts, publishes policies and programmes, reads the cluster-wide audit log.
- **hospital** — one infection-prevention coordinator at one hospital, scoped to that hospital's data
  only. Responds to visit reports, documents training execution and attendance, maintains the
  practitioner and equipment registers, reads published policies and programmes.

Coordinator credentials are issued by central administration; there is no self-registration and no SSO.

**Open:** where coordinators actually work with the portal — desk, ward round on a phone, tablet in the
facility, or leadership screen in a meeting — has not been established, and the answer should steer
layout priorities. Also undetermined: whether the deployment is live with real hospitals, in pilot, or
awaiting rollout.

## Product Purpose

A single cluster-wide record for infection-prevention governance, replacing the spreadsheets and email
threads that otherwise carry it. It covers supervisory visits, mandatory and internal training,
practitioner and equipment registers, the policy, organisational-document and programme libraries,
notifications, compliance dashboards, and an append-only audit trail.

Success is that a cluster can answer, at any moment and from one place, what was inspected, what was
found, what the hospital answered, who was trained, and who did what to the record.

## Positioning

Central supervision and hospital self-documentation meet in one record rather than two. Three mechanisms
carry that and are load-bearing:

- A central training template fans out automatically as a blank copy to every hospital, so the cluster's
  requirement and each hospital's evidence are the same object.
- Scoping is enforced in the query on the server, never by hiding interface elements, so a coordinator
  cannot reach another hospital's data by any route.
- A completed visit archives permanently and refuses every subsequent write, so the supervisory record
  cannot be revised after the fact.

## Operating Context

- Arabic, right-to-left, throughout. There is no second interface language.
- Every screen is a server-rendered page behind an authenticated session; nothing is public.
- Files (visit reports, attachments, policies, programme documents) live on the server's disk under
  `UPLOADS_DIR`, and are served only through an authorised route.
- Exports leave the system as Excel-compatible CSV; printed output is the browser's own print-to-PDF.
- Deployed to a Windows host (SmarterASP.NET) behind IIS from a watched `main` branch, against a
  Neon-hosted PostgreSQL database.

## Capabilities and Constraints

Confirmed capabilities: hospital and coordinator administration; supervisory visits with official
report, field attachments, hospital responses, and permanent archival; central training templates and
hospital-internal trainings, with attendance recorded either as a list of names or as a single headcount,
importable from `.csv`/`.xlsx`; practitioner and equipment registers; policy, organisational-document and
document-centre libraries; a strategic-programme folder tree; in-app notifications; a compliance
dashboard; an audit log with filtered CSV export.

Durable constraints:

- **No delete operation exists anywhere in the product.** Nothing in the interface or the server layer
  removes a record. Any future request to add one is a product decision, not a UI affordance.
- Attendance records a name or a headcount, never both, and never references the practitioner register —
  a name that matches a practitioner is a coincidence, not a link.
- Notification delivery is in-app only; no email or SMS provider exists.
- The audit screen loads the most recent 500 entries.
- List paging is client-side over already-loaded rows; it improves findability, not load time.
- Terminology is fixed by the Arabic SRS: `central` = الإدارة المركزية, `hospital` = منسّق مكافحة العدوى,
  visit = زيارة رقابية, training = تدريب, IPC = مكافحة العدوى.

## Brand Commitments

Confirmed by the owner on 2026-09-28:

- **No external identity is binding.** The visual design is the owner's decision.
- **No Saudi government identity element may be used**: no national emblem, no "official government
  website" trust bar, and no imitation of Ministry of Health or Absher branding. The portal is hosted on
  a private domain, not `.gov.sa`.
- **Do not invent a logo or emblem.** The text wordmark stays until real assets are supplied. No logo or
  colour assets exist today; `public/` is empty.
- **The palette is settled (2026-09-29): ink navy, hue 254.** It replaced a mix of two borrowed systems
  (an Apple-derived teal content area over a dark admin-template sidebar carrying that template's
  blue/green/red/purple accents). The register is "official record": paper surfaces, chrome that
  recedes, colour that is earned. Three meanings carry colour and nothing else does — navy for action,
  selection, wayfinding and the sealed record; ochre for a record awaiting someone; red for failure,
  error and the one irreversible act. **The green family is deliberately unused**: Saudi MoH and the
  national identity are green, and an institutional green here would edge toward the borrowed authority
  the constraint above forbids. Ramps and semantic roles live in `src/app/globals.css`.
- **Arabic RTL only, formal Arabic copy, Tajawal stays.**

Name in use: منصة إدارة مكافحة العدوى — IPC Cluster Portal. Voice is formal institutional Arabic.

**Open — flagged for the owner, not to be changed without their decision:** two strings claim official
approval of the platform itself — the header badge `المنصة الرسمية المعتمدة`
(`src/components/shell/Header.tsx:68`) and the footer line `النسخة الرسمية المعتمدة v1.0`
(`src/components/shell/PortalShell.tsx:37`). Separately, and in a different category, the interface uses
`معتمد` widely to describe *records* as the approved record (`سجل معتمد`, `دليل معتمد`, `مستودع معتمد`,
`مؤشرات معتمدة`, `تقرير الزيارة الرسمي`); that is ordinary domain language, not a claim of external
endorsement, and is not flagged.

## Evidence on Hand

- `docs/SRS_IPC_Management_Portal_Neon.md` — the Arabic functional specification (FR-1…FR-43, data model,
  NFRs). The binding requirements document. Deviations from it are recorded in
  `docs/CLAUDE_REFERENCE.md` §9, not by editing the SRS.
- `docs/OFFICIAL_SYSTEM_SPECIFICATIONS.md` — an earlier Arabic "production spec". Its **Dev Admin**
  section (hardcoded email, hidden superuser) is a security backdoor and is deliberately not implemented.
  It must not be reintroduced.
- `docs/DESIGN-apple.md` — an analysis of Apple.com design tokens, present as a style reference only. It
  is not a commitment and does not bind future work.
- `docs/CLAUDE_REFERENCE.md` — the engineering orientation document, including the record-list rendering
  convention and recorded SRS deviations.
- `.specify/memory/constitution.md` — the ratified project constitution (v1.0.0).
- **No brand assets exist**: no logo, no emblem, no colour specification, no photography.
- **No seed, sample or demonstration data ships.** The database starts empty and a single central account
  is created by `scripts/create-admin.ts`. There are no customers, testimonials, benchmarks, pricing or
  certifications on record — none may be fabricated for any surface.

## Product Principles

1. **The record is evidence, not a draft.** Every sensitive change is audited, and an archived visit is
   permanently read-only. Nothing in a future design may imply a record can be quietly revised.
2. **Authorisation lives on the server.** Hiding an element is never access control; a coordinator's
   scope is enforced in the query. Client-side filtering, sorting and paging are presentation only.
3. **Never fabricate.** No sample rows, no invented metrics, no placeholder testimonials, no backdoor
   accounts. An absent value renders as an absent value.
4. **Claim only what is true.** The portal is a private cluster system on a private domain; it must not
   borrow the visual authority of the Saudi government.
5. **Arabic is the design language, not a translation layer.** RTL, formal register, and Arabic-aware
   sorting and search are the baseline, not an adaptation applied afterwards.

## Accessibility & Inclusion

Required by the SRS (NFR 5.3): the entire interface in Arabic and fully RTL, a consistent list-and-detail
pattern across modules, and responsive behaviour across screen sizes.

Established in the current build: real table semantics with `th[scope="col"]` and `aria-sort`, keyboard
reach and activation for sort controls, row actions and row selection, and a stacked-card layout below
the small-screen breakpoint that keeps every value bound to its label.

**Open:** no formal accessibility standard (WCAG level, or a government conformance requirement) has been
established for this product, and no specific user need has been recorded.
