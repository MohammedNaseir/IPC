import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center" dir="rtl">
      <h1 className="text-xl font-bold text-slate-900">الصفحة غير موجودة</h1>
      <p className="text-sm text-slate-500">الصفحة المطلوبة غير موجودة أو لا تملك صلاحية الوصول إليها.</p>
      <Link href="/dashboard" className="text-sm font-bold text-teal-700 hover:underline">
        العودة إلى الداشبورد
      </Link>
    </div>
  );
}
