// Shared attendance rules. The import parser and the template writer BOTH read the header from
// here so the file they produce and the file they accept can never drift apart.

export const ATTENDANCE_TEMPLATE_HEADER = 'الاسم';

export const ATTENDEE_NAME_MAX_LENGTH = 200;
export const MAX_ATTENDEE_NAMES = 1000;

export const HEADCOUNT_MIN = 1;
export const HEADCOUNT_MAX = 100_000;

export type AttendanceMode = 'names' | 'headcount';

export interface ImportSummary {
  imported: number;
  skipped: number;
  skippedReasons: {
    blank: number;
    tooLong: { row: number }[];
  };
  /** Worksheet actually read, for .xlsx sources only, so the summary can say only the first sheet was used. */
  sheetName?: string;
}
