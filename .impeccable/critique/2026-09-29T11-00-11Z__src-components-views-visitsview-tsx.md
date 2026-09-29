---
target: the visits screen
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:C:\\Users\\hp\\Desktop\\ipc\\IPC\\src\\components\\views\\VisitsView.tsx"
target_fingerprint: "sha256:0b315ec168c164153fc344a4a74ab2c3347c398a0d6ae036e9eba6bf5a0ced61"
target_path: "C:\\Users\\hp\\Desktop\\ipc\\IPC\\src\\components\\views\\VisitsView.tsx"
timestamp: 2026-09-29T11-00-11Z
slug: src-components-views-visitsview-tsx
---
Method: dual-agent (A: design review, isolated · B: detector + browser evidence, isolated)

Target: the Visits screen (`src/components/views/VisitsView.tsx` list + `VisitDetailView.tsx` record page) in its full rendered chrome. Evidence: 15 full-page screenshots of the running app against a seeded database, both roles; the bundled CLI detector; the same rule engine run live in the DOM; and independent `getComputedStyle` contrast measurement over 663 text-bearing elements across four pages.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Route-level skeletons and `aria-live` row counts are real, but `isPending` only sets `disabled` — no spinner, no toast, no success state. Sealing a record permanently produces zero acknowledgement. |
| 2 | Match System / Real World | 2 | The status filter shows raw English DB enums to an Arabic-only user: `قيد المتابعة (in_progress)`. Dates render Arabic-Indic (`٢٠٢٦/١٢/١٧`) while compliance renders Western (`64%`) — two numeral systems in one row. |
| 3 | User Control and Freedom | 2 | No `updateVisit` action exists. A compliance score mistyped in the create modal is permanent from the instant of save. No undo, no edit, no delete anywhere in the product. |
| 4 | Consistency and Standards | 2 | Structurally rigorous — 18 table instances through one component. The colour layer is three systems at once: Metronic hexes in the sidebar, Tailwind teal in content, Apple tokens in `globals.css`. |
| 5 | Error Prevention | 2 | The irreversible archive is guarded by `window.confirm` (`VisitDetailView.tsx:105`) — an OS dialog showing `127.0.0.1:38141 says`, in LTR button order, that does not name the hospital or the visit being sealed. |
| 6 | Recognition Rather Than Recall | 2 | `complianceScore` is `hideBelowMd` (`VisitsView.tsx:116`) — the one number that ranks a visit is absent from the entire mobile list. The audit screen shows truncated cuids as entity identifiers. |
| 7 | Flexibility and Efficiency | 2 | Real search/sort/paging with state restoration. But no bulk actions, no saved views, no keyboard shortcuts, and filters are deliberately non-addressable, so no one can send a colleague "the overdue visits at HOSP-B-2". |
| 8 | Aesthetic and Minimalist Design | 1 | 8 columns where 4 carry decisions; `المرفقات 0` and `ردود المستشفى 0` occupy two columns to render zeroes; `التفاصيل` repeats one identical string down all 25 rows. White canvas + white panels = no value contrast. |
| 9 | Error Recovery | 1 | **Zero `error.tsx` files against 13 `loading.tsx`** (verified directly). Every failure is `window.alert(result.error)`. An unhandled error falls through to Next's default boundary: an English LTR page inside an Arabic-only product. |
| 10 | Help and Documentation | 2 | The login page's access-guidance block is genuinely good. Inside the app nothing explains what `الامتثال` measures or what archiving forfeits. |
| **Total** | | **18/40** | **Poor band — but one point off Acceptable, and the band overstates it (see below)** |

The band reads "core experience broken," which is not true here. The structure is sound: one shared table, one list convention, one record convention, correct RTL logic, real empty-state discipline. The 18 is driven almost entirely by the colour layer, the type layer, and action feedback — which is precisely the scope of this branch.

## Design Specificity Verdict

**Category-interchangeable.** Swap seven Arabic strings and this is a CRM deal list. The product character lives in the copy, not the design.

**LLM assessment.** The sidebar is a third-party admin template pasted at the hex level — `#1e1e2d`, `#151521`, `#1b84ff`, `#50cd89`, `#f1416c`, `#7239ea` (`Sidebar.tsx`), the Metronic dark-sidebar palette with its semantic assignments intact. The most telling consequence: `سجل الحركات (Audit)` is painted in that template's **destructive pink** `#f1416c` — a read-only, append-only evidence log styled as a hazard. Meanwhile `globals.css:4-6` declares `--color-primary: #0066cc` from the Apple token set, and it renders in exactly one place on screen: `selection:bg-[#0066cc]`. The declared primary of this product is visible only when a user drags to highlight text. The shield mark is `#1b84ff` blue in the sidebar and teal on the login page — one mark, two identities.

Missed opportunities that matter more than the palette: **there is no visit lifecycle, only a boolean.** 25 consecutive rows read `قيد المتابعة` in identical amber. A visit dated in the future and one months overdue with no report and no response look the same. The real states — scheduled, conducted, report pending, awaiting response, responded, archived — exist in the data (`report`, `responses.length`, `visitDate`) and are surfaced as three inert numeric columns instead of as the record's state. And the record has no identity: `VisitDetailView.tsx:137` prints the raw cuid `#cmu1bewtu000kp8vi2s81qupa` as the visit number on a page titled "official report," while the human identifier the org uses (`VIS-A-04`) sits buried in a free-text field.

What genuinely carries product character: the scope chip (`النطاق الحالي / كافة مستشفيات التجمع الصحي`), the audit trail rendered inline on the record rather than on a separate admin page, and the lock affordance on completed visits.

**Deterministic scan.** CLI detector, exit 2, **4 findings, all `gray-on-color`** — and **all 4 are false positives.** Each pairs a base text utility with a variant-prefixed background that can never be co-present with it: `text-slate-900` with `selection:bg-teal-500` (`layout.tsx:22`), `text-slate-700` with `hover:bg-rose-50` (`Header.tsx:47`), `text-slate-800` with `file:bg-teal-50` (`DocumentsView.tsx:388`, `ProgramsView.tsx:400`). Every one was read at source and the actual class string checked. `VisitsView.tsx`, `VisitDetailView.tsx` and all of `src/components/table/` produce **zero** CLI findings.

The real deterministic signal came from running the same engine live in the DOM: 73 flagged nodes on `/visits`, 33 on the record page, 42 on `/dashboard`, 97 on `/trainings`. Dominated by `undersized-ui-text` (58 on `/visits`, 83 on `/trainings`) and `low-contrast`. Two of its rules were discarded as artifacts: `text-occlusion` flagged the detector's own overlay spans, and `em-dash-overuse` counted the table's null placeholder, not prose.

**Visual overlays.** Script injection works and `live-server` ran on port 39400 (the 8400 band is unusable on this host — Windows socket permission error 10013), serving `detect.js`, which created 73 overlay nodes with labels. **But the browser was headless Edge, so no overlay is visible to you.** There is no `[Human]` tab. The console and DOM readback is the fallback signal, and it is what the runtime table above is built from. `/live.js` (the element picker) was token-gated at 401 and unusable. The server was stopped; `git status` is clean.

## Overall Impression

The engineering underneath is better than the surface. `DataTable` is a genuinely principled component — `th[scope=col]`, `aria-sort`, keyboard-activatable sorting, an `sr-only` caption, and both the wide table and the narrow `<dl>` card list rendered server-side and switched by CSS so hydration cannot mismatch. The Arabic *logic* is native: `Intl.Collator('ar', {numeric:true})`, search normalisation that folds `أ إ آ ٱ → ا` while deliberately not folding `ة→ه`.

And then that work is dressed in two borrowed skins with a third declared but never worn. The single biggest opportunity is not a redesign — it is choosing one colour, one type scale, and one feedback grammar, and letting the structure that already exists show through.

## What's Working

1. **`DataTable` is better than most commercial admin tables.** The dual-layout-by-CSS decision in particular: the first server paint is correct at every width, and the narrow layout is a real `<dl>` so no value is orphaned from its label.
2. **The two empty states are held apart on principle.** `TableEmptyState` distinguishes "this screen has no records" from "nothing matches your filter" with different icons, messages and hints — and the comment records *why*. Conflating those is the most common empty-state bug.
3. **Arabic is treated as a design language in the logic layer.** The collation, the search folding, and `TablePagination.tsx:16`'s note that "in RTL 'previous' sits on the right" are what separate a real RTL product from a mirrored one.

## Priority Issues

### [P0] The irreversible archive is designed as a reversible success
`اعتماد واكتمال الزيارة` (`VisitDetailView.tsx:167-177`) is `bg-emerald-600` with a `CheckCircle` icon — the universal grammar of *reversible success* — guarded only by `window.confirm`, producing no confirmation on success. On the 400px record page it is the largest, highest-contrast control on screen, sitting above the report, the attachments and every hospital response. Measured contrast: **3.65:1**, itself a failure.

**Why it matters:** this is the mechanism the entire product positioning rests on. A supervisor working through 40 hospitals on a tablet will seal the wrong visit, and there is no undo, no edit and no delete anywhere in the product.

**Fix:** replace the native confirm with an in-product RTL dialog that names the hospital and visit date, enumerates what is being sealed (report present/absent, N attachments, N responses, recorded compliance), warns explicitly when no report or no response exists, and requires a second affirmation. Recolour away from emerald/checkmark to the institutional colour with a lock glyph. After success, change the page's masthead visibly rather than adding a grey strip.
**Suggested command:** `/impeccable harden`

### [P0] Three colour systems in one shell; the declared primary ships nowhere
Metronic hexes in `Sidebar.tsx`, Tailwind `teal` in every content view, Apple tokens in `globals.css` of which only `--color-ink` and `--color-canvas` actually render — `--color-primary` appears solely as `::selection`. Measured census: **23 distinct text colours and 27 distinct background values** across the shell and four pages. Seven Tailwind hue families plus a hand-written hex set. **Every sub-3:1 chrome failure comes from the hand-written set.**

**Why it matters:** colour currently carries no learnable meaning. Emerald means coordinator, success, completed *and* irreversible archive. Teal means primary action, link, compliance score *and* unread notification. Pink means the audit log. This is exactly the "mix of two borrowed systems" PRODUCT.md flags.

**Fix:** pick one institutional hue and define four roles against it — surface, primary action, selected/active, focus ring. Delete the unused Apple tokens. Restate status as a two-hue semantic scale, with red reserved exclusively for irreversible acts: the audit nav item loses `danger`, the archive button gains it. Recolour the sidebar to a desaturated tint of the one hue. No emblem is invented; the text wordmark stays, per the brand constraint.
**Suggested command:** `/impeccable colorize`

### [P1] Measured contrast failures on the primary CTA, the archive button and the active nav item
Independent measurement, 663 text-bearing elements checked across four pages, Tailwind v4 `lab()` values normalised through canvas (a naive `rgb()` regex silently dropped 233 of 1061 elements on `/visits`):

| ratio | element | source |
|---|---|---|
| **1.49:1** | the `—` null placeholder | `DataTable.tsx:86`, `VisitsView.tsx:110` |
| **2.51–2.63:1** | all `text-slate-400` metadata: empty-state prose, audit timestamps, the visit id, pagination range | `VisitDetailView.tsx:137,221,236,265` |
| **2.73:1** | sidebar group labels, on every page | `Sidebar.tsx:143,156` |
| **3.00:1** | search input placeholder | `TableToolbar.tsx:32` |
| **3.63:1** | **the active nav item**, on every page | `Sidebar.tsx:38` |
| **3.65:1** | `اعتماد واكتمال الزيارة` | `VisitDetailView.tsx` |
| **3.67:1** | **the primary CTA** `إنشاء زيارة رقابية جديدة` and siblings | `VisitsView.tsx:208` |

The "absent value" marker that Principle 3 insists must render is, at 1.49:1, effectively invisible.

**Fix:** darken the primary to clear 4.5:1 against white at 12px (`teal-700 #0f766e` ≈ 5.5:1, or the chosen hue at equivalent luminance). Replace `text-slate-400` body usage with `slate-600` and the `slate-300` dash with `slate-500`. Lift sidebar labels to at least `#9899ac`.

One correction to an earlier read: **focus rings are fine.** A CDP Tab walk over 45–55 stops per page found a visible indicator on 100% of them. But only 5 of 54 `.tsx` files opt into a focus utility — the rest survive on the UA default outline, whose colour measured as low as `rgb(255,255,255)` on the teal CTA. The ring exists; it is not under design control.
**Suggested command:** `/impeccable harden`

### [P1] Arabic is set with Latin typographic metrics, at a 9–12px floor
`globals.css:28` applies `letter-spacing: -0.022em` — an Apple-marketing Latin tracking value — to the entire Arabic interface, with `-0.015em` more on headings. `tracking-tight` is then added to the Arabic H2 on every screen, compounding to roughly `-0.047em` on connected script. In the opposite direction `tracking-wide`/`tracking-wider` are applied to Arabic sidebar labels — **positive letter-spacing breaks the joins of a cursive script**, visible in the login placeholder rendering as `الـبـريـد الإلـكـتـرونـي`. `uppercase` is applied to Arabic strings in five places, a no-op that confirms the CSS was authored for Latin. And `body { font-size: 17px }` is dead: the runtime detector found **58 sub-11px nodes on `/visits` and 83 on `/trainings`**; measured text runs at 9, 10, 11 and 12px.

**Why it matters:** PRODUCT.md makes Arabic the design language. Tajawal at 10px with negative tracking, in a formal register full of long compound nouns, is fatiguing for anyone reading 40 records in a sitting.

**Fix:** `letter-spacing: normal` globally; remove every `tracking-*` and `uppercase` from Arabic. Establish a real Arabic scale with a 13px floor for body content, 15–16px for record body text, and `line-height` 1.7–1.8 (the current 1.47 is a Latin value that crowds Arabic ascenders and descenders).
**Suggested command:** `/impeccable typeset`

### [P2] The visits list is a data dump, not a work queue
Three of eight columns spend themselves on `المرفقات` and `ردود المستشفى` (both `0` for all 25 visible rows) and `التفاصيل` (the identical string repeated verbatim down the page). `الامتثال` is hidden below `md`, so the one ranking number vanishes on mobile. Every row reads `قيد المتابعة` because only two statuses exist. At 400px this is 3,788px of near-identical cards for 25 records — and the hospital-name link that opens each record is **18px tall**, one of 50 targets out of 75 (67%) below 44×44px.

**Fix:** replace the three count columns with one derived **state** column computed from data already present — `بانتظار التقرير` / `بانتظار رد المستشفى` / `تم الرد` / `مكتمل ومؤرشف` — plus days-elapsed where a response is outstanding. Make `الامتثال` the second column and never hide it. Move `التفاصيل` into the row's expand. Default-sort by urgency, not date. Raise the row link to a full-height tap target.
**Suggested command:** `/impeccable clarify`

## Persona Red Flags

**Sam (screen reader, keyboard, 4.5:1).** The create-visit, attachment and report-upload modals have **no `role="dialog"`, no `aria-modal`, no `aria-labelledby`, no focus trap and no Escape handler** — Tab walks straight out into the table behind the backdrop. Table rows are `tabIndex={0}` `<tr>` with `onKeyDown` but carry no `role="button"`, so a screen reader announces a focusable table row with no hint that Enter navigates. No skip link anywhere in `PortalShell.tsx`, so 25 focusable rows × 8 cells sit between the search box and pagination. `window.confirm`/`window.alert` have no ARIA relationship to the control that triggered them. Plus every contrast failure in the table above.

**نورة — the hospital IPC coordinator whose facility is under inspection.** She opens the record and the first thing above the fold is a cuid and an amber badge; nothing states what is expected of her or by when. The finding itself is a PDF link that exits the product — she reads the judgment about her hospital in a bare PDF viewer, then returns to a page that has not changed. She writes a corrective-action response, clicks `إرسال الرد`, and gets a cleared textarea: no confirmation, no "central has been notified," no indication her response is now permanent. She has no way to see her hospital's compliance trend; her dashboard shows `74%` with no baseline and three bars coloured orange, orange and purple for no reason. On her ward round at 400px she cannot see the compliance score on any visit at all.

**عبدالله — the central supervisor across 40 hospitals.** 62 rows, all amber, three zero columns, one repeated string. He cannot answer "which hospital owes me a response" without opening records one at a time. Filters are non-addressable, so he cannot bookmark or share a view. He archives one record at a time, each guarded by an OS dialog that does not name the record — by the third, the confirms are muscle memory. And the compliance score he must record is entered **once, in the create modal, before the visit has happened**, with no action existing to correct it.

## Minor Observations

- **[P2] No error surface at all.** Zero `error.tsx` under `src/app/(portal)/` against 13 `loading.tsx` — verified directly. Every action failure is `window.alert`. For a coordinator who has just typed a 400-word response, a native alert gives no indication whether the text survived. This was cut from the top five on count alone; add `(portal)/error.tsx` and `(portal)/visits/[id]/error.tsx` in Arabic RTL, and replace `window.alert` with an inline `role="alert"` region beside the control that failed, preserving form state. Suggested command: `/impeccable harden`
- `formatDate` uses `toLocaleDateString('ar-SA')`, which on some ICU builds resolves to the **Umm al-Qura Hijri calendar**. This environment happens to render Gregorian; the deployment target is a different host. A supervisory record silently switching calendar systems between environments is a correctness hazard. Pin the calendar explicitly.
- Numeral mixing is systemic: dates and audit timestamps Arabic-Indic, percentages / file sizes / counts / pagination Western. Pick one and enforce it in a formatter.
- `font-mono` is applied to Arabic-adjacent content in six places; monospace fallbacks have no Arabic-Indic digit coverage, producing the irregular spacing in the audit timeline.
- The header badge `المنصة الرسمية المعتمدة` is visually the strongest element in the masthead — emerald pill, shield glyph, higher contrast than the product name beside it — and it duplicates the footer's `النسخة الرسمية المعتمدة v1.0` and the sidebar shield: three official-approval signals in one viewport. The *copy* is flagged for the owner's decision and untouched; the *design weight* is a separate question the owner can answer independently.
- `المنظومة متصلة ومحدثة` in the footer is a hardcoded string, not a live status. It asserts a system state that is never checked.
- Two logout buttons sit 40px apart in the header; the account menu's only action is the one beside it.
- `main` has `pb-32` and each view adds `pb-12` — ~176px of dead space above every footer.
- The record page has no `<h1>`; the only `<h1>` is the sidebar wordmark, identical on every page.
- Modal headers are `bg-slate-900` — a fourth dark value, unrelated to the sidebar's `#1e1e2d`.
- Three `dark-glow` findings are genuine: `shadow-[#1b84ff]/20` in the sidebar and a zero-offset `#ffba00` glow at body level.

## Questions to Consider

1. **If a visit record is evidence, why does it look like a form?** Every affordance says "editable draft" — grey input wells, a live textarea, upload links. What would this page look like designed as a *document with an audit margin* rather than a CRUD detail panel?
2. **Why is compliance recorded before the visit and never again?** It is an optional field in a create modal, permanently uneditable afterwards. If the intended workflow isn't "guess the score when you schedule," the modal is modelling the wrong moment.
3. **What is the coordinator supposed to feel?** A defendant with a right of reply, a partner in a shared record, or a subject being logged? The design currently answers none of the above — which is why the response thread has no framing, no deadline and no confirmation.
4. **Which single colour is the cluster's colour?** Three are claiming it right now, and the one actually declared in `globals.css` appears only on text selection.
5. **What happens at visit #500?** The table loads every row the user may see and pages client-side by design. Is the list a browsable archive or a work queue? It cannot be both, and it is currently neither.
