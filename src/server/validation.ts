import 'server-only';
import { z } from 'zod';

export const idSchema = z.string().trim().min(1, 'معرّف غير صالح.').max(64, 'معرّف غير صالح.');

export function requiredText(label: string, max = 500) {
  return z
    .string({ error: `${label} مطلوب.` })
    .trim()
    .min(1, `${label} مطلوب.`)
    .max(max, `${label} طويل جداً.`);
}

export function optionalText(max = 500) {
  return z
    .string()
    .trim()
    .max(max, 'النص المدخل طويل جداً.')
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));
}

export const emailSchema = z
  .string({ error: 'البريد الإلكتروني مطلوب.' })
  .trim()
  .toLowerCase()
  .pipe(z.email('البريد الإلكتروني غير صالح.').max(254, 'البريد الإلكتروني غير صالح.'));

// Accepts YYYY-MM-DD (from <input type="date">) or a full ISO timestamp.
export function dateSchema(label: string) {
  return z
    .string({ error: `${label} مطلوب.` })
    .trim()
    .min(1, `${label} مطلوب.`)
    .transform((value, ctx) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({ code: 'custom', message: `${label} غير صالح.` });
        return z.NEVER;
      }
      return date;
    });
}

export function optionalDateSchema(label: string) {
  return z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value, ctx) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({ code: 'custom', message: `${label} غير صالح.` });
        return z.NEVER;
      }
      return date;
    });
}

export function formString(formData: FormData, field: string): string | undefined {
  const value = formData.get(field);
  return typeof value === 'string' ? value : undefined;
}
