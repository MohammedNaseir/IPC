# T003 — Pre-Change Side-Panel Inventory and Print Baseline

**Captured**: 2026-09-28, from `src/components/views/VisitsView.tsx` and
`src/components/views/TrainingsView.tsx` at commit `a0c903c`, **before** any detail panel was moved.

**Method**: read from source rather than from screenshots. The JSX is the ground truth for what the panel
renders, and `no-print` is a class that can be read directly rather than inferred from a printed PDF.
Every row below cites the condition that governs whether the element appears.

This is the list FR-009 to FR-012 and FR-020 are checked against by T023, T024, T034 and T035.

---

## Visit panel — content

Rendered when a visit is selected. `isCompleted` = `selectedVisit.status === 'completed'`;
`isCentral` = `user.role === 'central'`.

| # | Element | Condition | Prints? |
|---|---|---|---|
| V1 | Status badge — `زيارة مكتملة ومؤرشفة` / `زيارة قيد المتابعة والتنفيذ` | always | yes |
| V2 | Record id, `#{id}`, monospace | always | yes |
| V3 | Hospital name (h3) | always | yes |
| V4 | `تاريخ الزيارة: {formatDate}` with calendar icon | always | yes |
| V5 | `الفريق الزائر: {team}` with users icon | always | yes |
| V6 | `{complianceScore}% امتثال` | `complianceScore !== null` | yes |
| V7 | Archived notice — `هذه الزيارة مكتملة ومؤرشفة نهائياً ولا يمكن إجراء تعديلات أو إضافة ردود عليها.` | `isCompleted` | yes |
| V8 | `تفاصيل وملاحظات الزيارة العامة:` + the details text, whitespace-preserved | always | yes |
| V9 | Official report panel heading `تقرير الزيارة الرسمي` | always | yes |
| V10 | Report file name, size, and download link `تحميل التقرير` | `report !== null` | yes (link text) |
| V11 | Report placeholder — `لم يتم رفع تقرير الزيارة بعد من قِبل الإدارة المركزية` | `report === null` | yes |
| V12 | Attachments heading `الصور والمرفقات الميدانية` | always | yes |
| V13 | Attachment tiles — image thumbnail or file icon, name, `{date} • {size}` | per attachment | yes |
| V14 | Attachments empty state — `لا توجد صور أو مرفقات لهذه الزيارة` | none | yes |
| V15 | Response thread heading `سجل ردود وتحديثات المستشفى` | always | yes |
| V16 | Response entries — respondent name, timestamp, note, optional attachment link | per response | yes |
| V17 | Responses empty state — `لم يتم تسجيل ردود من المستشفى على هذه الزيارة بعد` | none | yes |
| V18 | Audit trail heading `سجل التدقيق والتتبع التلقائي للزيارة` | always | yes |
| V19 | Audit entries — action, `بواسطة: {performedBy}`, timestamp | per entry | yes |
| V20 | Audit empty state — `لا توجد سجلات تدقيق مسجلة للزيارة` | none | yes |
| V21 | No-selection placeholder — `يرجى اختيار زيارة من القائمة لاستعراض التفاصيل الكاملة` | no selection | n/a |
| V22 | Filtered-out notice — `الزيارة المحددة غير مطابقة للفلتر أو البحث الحالي…` | selection filtered out | n/a — **removed by FR-018** |

## Visit panel — actions

| # | Action | Condition | `no-print` |
|---|---|---|---|
| VA1 | `طباعة PDF` → `window.print()` | always | **yes** (container) |
| VA2 | `اعتماد واكتمال الزيارة` → `completeVisit` | `isCentral && !isCompleted` | **yes** (same container) |
| VA3 | `رفع تقرير الزيارة` / `تحديث التقرير` → opens report modal | `isCentral && !isCompleted` | **yes** |
| VA4 | `تحميل التقرير` → file download link | `report !== null` | no |
| VA5 | `إرفاق صورة / ملف` → opens attachment modal | `!isCompleted` | **yes** |
| VA6 | Attachment tile links → file download | per attachment | no |
| VA7 | Response attachment links → file download | per response with attachment | no |
| VA8 | Response form — textarea, file input, `إرسال الرد` → `addVisitResponse` | `!isCompleted` | **yes** (form) |
| VA9 | Attachment modal — file input, `إلغاء`, `إضافة المرفق` → `addVisitAttachment` | modal open | n/a (overlay) |
| VA10 | Report modal — file input, `إلغاء`, `تأكيد ورفع التقرير` → `uploadVisitReport` | modal open | n/a (overlay) |

## Print baseline for a visit (FR-020)

Governed by `src/app/globals.css`:

```css
@media print {
  aside, header, footer, .no-print { display: none !important; }
}
```

**What printed before the change**: V1–V20 — the entire record body, including both empty states and the
archived notice — with the portal sidebar, header and footer hidden, and VA1, VA2, VA3, VA5 and VA8
hidden by their `no-print` classes. The download links (VA4, VA6, VA7) printed as text, because they
carry no `no-print`.

**What also polluted the printed output before the change**, and should be absent afterwards: the list
column was **not** marked `no-print` in the detail-panel branch — the list's own wrapper carries
`no-print` (`lg:col-span-5 space-y-3 no-print` on VisitsView), so the list itself was already excluded.
The page banner (`العمليات الرقابية / وحدة الزيارات…`) was **not** excluded and printed above the record.

**After the change**, the acceptance is: V1–V20 still print; VA1–VA3, VA5, VA8 and the new back control
do not; and no list, toolbar or pagination markup is in the document at all.

---

## Training panel — content

Rendered when a training is selected. `status` is the derived status.

| # | Element | Condition | Prints? |
|---|---|---|---|
| T1 | Status badge — `مكتمل وموثق` / `متأخر (تجاوز الموعد)` / `معلّق بالانتظار` | always | yes |
| T2 | Kind badge — `برنامج داخلي مستقل` / `قالب تدريبي مركزي` | always | yes |
| T3 | Title (h3) | always | yes |
| T4 | `المستشفى المعني: {hospitalName}` | always | yes |
| T5 | Description text | always | yes |
| T6 | Summary tiles — execution date (`لم يحدد بعد` when null), `deliveredBy` (`غير محدد` when null), `{attendeeCount} حاضر` with `مسجل بالأسماء` / `إجمالي العدد بدون أسماء`, due date (`مفتوح` when null) | always | yes |
| T7 | Attachments grid — evidence photos with name and date | `attachments.length > 0` | yes |
| T8 | `ExecutionForm`, keyed by training id | always | yes |
| T9 | No-selection placeholder — `يرجى اختيار دورة تدريبية من القائمة` | no selection | n/a |
| T10 | Filtered-out notice — `الدورة المحددة غير مطابقة للفلتر أو البحث الحالي…` | selection filtered out | n/a — **removed by FR-018** |

## Training panel — actions (all inside `ExecutionForm`)

| # | Action | Condition |
|---|---|---|
| TA1 | Execution date input | always |
| TA2 | `deliveredBy` input | always |
| TA3 | Notes textarea | always |
| TA4 | Evidence photo file input | always |
| TA5 | Mode toggle `names` ⇄ `headcount`, each with its `window.confirm` when data would be lost | always |
| TA6 | Name draft input + add-name control, enforcing `MAX_ATTENDEE_NAMES` with an alert | mode = names |
| TA7 | Name chips with per-name remove control | mode = names, per name |
| TA8 | Headcount number input | mode = headcount |
| TA9 | Import dialog opener, file input, submit → `importAttendanceNames` | mode = names |
| TA10 | Import summary — imported count, skipped count, and the skipped reasons including `tooLong` row numbers | after an import |
| TA11 | Attendance template download → `/api/templates/attendance-names` | always |
| TA12 | Save → `recordTrainingExecution` | always |

**Print**: trainings carry no `no-print` markings inside the panel and printing a training is not a named
requirement. The acceptance for T035 is only that printing produces no broken output.

---

## How this inventory is used

- **T023** walks V1–V22 and VA1–VA10 against the visit record page, for one open and one archived visit.
  On the archived visit, enumerate interactive elements rather than searching page text: V11's prose
  `لم يتم رفع تقرير الزيارة بعد…` contains VA3's wording and produces a false positive.
- **T034** walks T1–T10 and TA1–TA12 against the training record page.
- **T024** compares the printed output against the print baseline above.
- Rows marked **removed by FR-018** are expected to be absent afterwards; their absence is the
  requirement, not a regression.
