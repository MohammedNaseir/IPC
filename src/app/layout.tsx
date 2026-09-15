import type { Metadata } from 'next';
import { Tajawal } from 'next/font/google';
import './globals.css';

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800', '900'],
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
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="bg-slate-50 text-slate-900 font-sans antialiased selection:bg-teal-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
