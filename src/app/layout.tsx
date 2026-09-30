import type { Metadata } from 'next';
import { Cairo, Tajawal } from 'next/font/google';
import './globals.css';

// Cairo for headings and interface labels, Tajawal for body text and data (item 6, owner decision
// Q3). Weights are the actual usage in src/ (Phase 2's T011 inventory: 500, 600, 700, 800 --
// font-medium through font-extrabold -- plus the 400 body default), not the six weights Tajawal
// loaded before, of which 300 and 900 were never referenced anywhere.
//
// Tajawal has no 600 (semibold) weight file at all -- confirmed against next/font/google's types
// (a build-time type error) and directly against Google's own font API, which silently omits 600
// from its response even when explicitly requested. The 9 font-semibold sites rendering in Tajawal
// (body/data text) will keep synthesizing between 500 and 700, exactly as before this feature --
// that gap cannot be closed within this family, so it is left as-is rather than worked around.
// Cairo genuinely has 600, so the same class on a heading now gets a true semibold.
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
});

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-tajawal',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'منصة إدارة مكافحة العدوى - IPC Cluster Portal',
  description:
    'منصة رقمية موحدة لإدارة وحوكمة أنشطة مكافحة العدوى والصحة العامة على مستوى المنشآت الصحية والتجمع الصحي.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${cairo.variable}`}>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased selection:bg-navy-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
