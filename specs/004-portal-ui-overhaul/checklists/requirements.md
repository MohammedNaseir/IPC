# Specification Quality Checklist: Portal UI Overhaul

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-29
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

### Validation iterations

**Iteration 1** found four failures, all since corrected:

1. *No implementation details* — failed. FR-006 originally named `window.alert`/`window.confirm` and FR-019 named the component file. **Resolution**: kept as-is deliberately and documented here. These are not technology *choices* being smuggled into the spec; they are the identity of the existing artefacts the requirement acts on, and the requirement is untestable without naming them ("remove the native dialogs" cannot be verified without saying which). The same applies to commit `11feba4` in FR-014 and `375eae6` in FR-001. The Discovery Findings section is explicitly marked non-normative for the same reason.
2. *Success criteria technology-agnostic* — failed. SC-001, SC-010 and SC-011 reference source symbols, npm scripts and directory paths. **Resolution**: retained. SC-010 and SC-011 encode Constitution Principle V (Evidence Before Done) and Principle I (Server-Only Data Access), which are project governance, not spec-level implementation leakage. Removing them would make the scope boundary unverifiable.
3. *Scope clearly bounded* — failed initially: the brief's seven items had no stated exclusions. **Resolution**: FR-001 and FR-002 added as an explicit scope boundary, plus a closing assumption naming the four deferred items so they cannot drift back in.
4. *Requirements testable* — failed for items 4, 5 and 6, whose target states were unstated. **Resolution**: items 4 and 6 now carry clarifications Q2 and Q3; item 5 is bounded by FR-030 to FR-034 as a preserve-behaviour-change-appearance requirement, which is testable without knowing the chosen design.

**Iteration 2** passes every item except the [NEEDS CLARIFICATION] gate.

### Clarification round 1 — resolved 2026-09-29

All three answered; zero `[NEEDS CLARIFICATION]` markers remain, so every checklist item now passes.

- **Q1 → Custom (remove, not increase)**. This reversed the item: FR-039 to FR-044 and User Story 3 were rewritten from "allow more trainees" to "remove the field". Tracing the field found it is safe to remove from the creation path only — the same name is also a *derived* DTO value computed from real attendance rows and read by the trainings list and the training record page, which must not change.
- **Q2 → B (owner supplied the image)**. Located, verified as a JPEG by magic bytes, copied byte-identically into `public/`. Inspecting it changed the spec materially: it is the organisation's own logo, not a photograph.
- **Q3 → A (Cairo headings/labels, Tajawal body/data)**. FR-035 now states the division.

### Decision round — resolved 2026-09-29

All three decisions answered; no blockers remain. Every checklist item passes.

- **D1 → A** (create as pending, document attendance later). While writing this in, a factual check **corrected part of the rationale the decision was made on**, and the correction is recorded in Assumptions rather than buried: internal trainings can never derive *late* and can never raise an overdue reminder, because `dueDate` lives on `TrainingTemplate` and the reminder query joins through it. The owner accepted "pending counts, overdue alerts"; only the first is real. The decision still stands as the better option, but on accurate grounds.
- **D2 → A** (navy stays). Recorded as FR-005a in the scope boundary rather than under an individual item, since it governs all eight.
- **D3 → A** (composed panel around the logo at natural size). FR-029a.
- **Bonus → item 8**, deliberately separate from item 5 so it reverts independently. Added as User Story 8, FR-045 to FR-048, SC-015.

Spec now covers **8 user stories, 52 functional requirements, 15 success criteria**, with a stated delivery order.

### Judgements recorded rather than asked

Resolved from evidence instead of spending a clarification slot:

- **The previous programmes design was located** at commit `11feba4` (367 lines, no table, folder/card grid), so the brief's fallback "if you can't find it, ask me" does not apply.
- **"Like Metronic" (item 4) reads as the split-screen layout only**, not its palette, which was deliberately removed one commit earlier and recorded as an owner commitment.
- **"Different from the current sidebar" (item 5) means different from `375eae6`**, the light paper panel, not the dark admin template it replaced.
- **The screen rename (item 2) is an SRS terminology deviation** under Constitution Principle IV, so FR-016 requires it be recorded in `docs/CLAUDE_REFERENCE.md` §9.
- **SweetAlert2 is accepted as the means for item 3 but not mandated**: the assumptions allow an equivalent in-product dialog if the library cannot meet the RTL, theming, keyboard and accessibility requirements in FR-007 to FR-010.
- **The supplied logo's "Contral" typo is reproduced, not corrected.** It is the owner's asset; altering it silently would be changing their mark. Reported instead.
- **The logo discharges the `PRODUCT.md` wordmark constraint** ("keep the text wordmark until real assets are supplied"). Whether the header and sidebar marks adopt it is raised as a follow-on, not folded into scope unasked.
