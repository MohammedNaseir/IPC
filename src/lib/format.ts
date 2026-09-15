export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('ar-SA') : '—';
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString('ar-SA') : '—';
}

// Converts a <input type="date"> value (YYYY-MM-DD) for display defaults.
export function todayInputValue(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

export function averageCompliance(scores: Array<number | null>): number | null {
  const values = scores.filter((s): s is number => typeof s === 'number');
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, s) => sum + s, 0) / values.length);
}
