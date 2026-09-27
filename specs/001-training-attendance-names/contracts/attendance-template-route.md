# Contract: Attendance Import Template Route

## `GET /api/templates/attendance-names`

Returns the downloadable attendance import template (FR-010).

**Authentication**: a valid session is required. No session → `401`. Both roles may download it;
the template contains no data, so no hospital scoping applies.

**Response**

| Aspect | Value |
|---|---|
| Status | `200` |
| `Content-Type` | `text/csv; charset=utf-8` |
| `Content-Disposition` | `attachment; filename="attendance-template.csv"` plus an RFC 5987 UTF-8 filename, matching the convention used by the existing file and KPI routes |
| `Cache-Control` | `private, no-store` |
| Body | UTF-8 **BOM** (`﻿`) followed by the single header cell `الاسم` and a trailing newline |

**Why CSV**: Excel opens a BOM-prefixed UTF-8 CSV directly and keeps the Arabic header intact, and
the import accepts `.csv` as well as `.xlsx`, so no spreadsheet writer is needed. This mirrors the
existing KPI export, which already emits `﻿`-prefixed CSV for Excel.

**Contract with the parser**: the header cell written here is the exact string the import validates
against. Both must come from one shared constant so they cannot drift apart.
