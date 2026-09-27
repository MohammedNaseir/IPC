import 'server-only';
import readXlsxFile, { type Sheet } from 'read-excel-file/node';
import { ValidationError } from '@/server/errors';
import {
  ATTENDANCE_TEMPLATE_HEADER,
  ATTENDEE_NAME_MAX_LENGTH,
  MAX_ATTENDEE_NAMES,
  type ImportSummary,
} from '@/lib/attendance';

export interface ParsedAttendanceSheet {
  names: string[];
  summary: ImportSummary;
}

const ACCEPTED_EXTENSIONS = ['xlsx', 'csv'] as const;

function extensionOf(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? '';
  return base.includes('.') ? base.split('.').pop()!.toLowerCase() : '';
}

// Single-column CSV reader. A one-column sheet never needs full RFC 4180 handling: strip the BOM,
// split lines, and unwrap one level of quoting so a name containing a comma still reads correctly.
function readCsvFirstColumn(text: string): string[] {
  const cells = text
    .replace(/^﻿/, '')
    .split(/\r\n|\n|\r/)
    .map((line) => {
      const quoted = line.match(/^\s*"((?:[^"]|"")*)"/);
      if (quoted) return quoted[1].replace(/""/g, '"');
      return line.split(',')[0] ?? '';
    });

  // A file-terminating newline is not a row. Counting it would report one more skipped row than the
  // sheet actually contains, so trailing empties are dropped; blank rows *between* names are kept
  // and still counted as skipped (FR-012).
  while (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();
  return cells;
}

function cellToText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Reads attendee names from an uploaded sheet. Only the first worksheet and the first column are
 * read; other worksheets and columns are ignored. Blank rows are skipped, over-long names are
 * reported as skipped, and an unusable file is refused without touching stored attendance.
 */
export async function parseAttendanceSheet(file: File): Promise<ParsedAttendanceSheet> {
  const extension = extensionOf(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(extension as (typeof ACCEPTED_EXTENSIONS)[number])) {
    throw new ValidationError('نوع الملف غير مدعوم. الأنواع المسموحة: xlsx أو csv. يرجى استخدام القالب المتاح للتنزيل.');
  }

  let rows: string[];
  let sheetName: string | undefined;

  if (extension === 'csv') {
    rows = readCsvFirstColumn(Buffer.from(await file.arrayBuffer()).toString('utf8'));
  } else {
    // The default export returns every worksheet as { sheet, data }; only the first is used.
    let sheets: Sheet[];
    try {
      sheets = await readXlsxFile(Buffer.from(await file.arrayBuffer()));
    } catch {
      throw new ValidationError('تعذر قراءة الملف. تأكد من أنه ملف Excel صالح غير تالف.');
    }
    const firstSheet = sheets[0];
    if (!firstSheet) throw new ValidationError('الملف لا يحتوي على أي ورقة عمل.');
    sheetName = firstSheet.sheet;
    rows = firstSheet.data.map((row) => cellToText(row?.[0]));
  }

  const nonEmptyRows = rows.filter((cell) => cell.trim().length > 0);
  if (nonEmptyRows.length === 0) {
    throw new ValidationError('الملف فارغ. يرجى استخدام القالب وإضافة الأسماء تحت عمود "الاسم".');
  }

  const header = nonEmptyRows[0].trim();
  if (header !== ATTENDANCE_TEMPLATE_HEADER) {
    throw new ValidationError(
      `صف العنوان غير صحيح. يجب أن يكون العمود الأول بعنوان "${ATTENDANCE_TEMPLATE_HEADER}". يرجى تنزيل القالب واستخدامه.`,
    );
  }

  // Row 1 is the header, so data starts at sheet row 2.
  const dataRows = rows.slice(1);
  const names: string[] = [];
  let blank = 0;
  const tooLong: { row: number }[] = [];

  dataRows.forEach((cell, index) => {
    const sheetRow = index + 2;
    const name = cell.trim();
    if (!name) {
      blank += 1;
      return;
    }
    if (name.length > ATTENDEE_NAME_MAX_LENGTH) {
      tooLong.push({ row: sheetRow });
      return;
    }
    names.push(name);
  });

  if (names.length === 0) {
    throw new ValidationError('لم يتم العثور على أي اسم في الملف. يرجى إضافة الأسماء تحت عمود "الاسم".');
  }
  if (names.length > MAX_ATTENDEE_NAMES) {
    throw new ValidationError(
      `الملف يحتوي على ${names.length} اسماً ويتجاوز الحد المسموح (${MAX_ATTENDEE_NAMES} اسماً). يمكن تسجيل إجمالي العدد بدل الأسماء.`,
    );
  }

  return {
    names,
    summary: {
      imported: names.length,
      skipped: blank + tooLong.length,
      skippedReasons: { blank, tooLong },
      sheetName,
    },
  };
}
