'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Award,
  ArrowUpRight,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import type { HospitalDTO, SessionUser, TrainingDTO, VisitDTO } from '@/lib/types';
import { averageCompliance, formatDate, todayInputValue } from '@/lib/format';

interface DashboardViewProps {
  user: SessionUser;
  hospitals: HospitalDTO[];
  visits: VisitDTO[];
  trainings: TrainingDTO[];
}

function scoreBarColor(score: number): string {
  return score >= 85 ? 'bg-teal-600' : score >= 75 ? 'bg-indigo-600' : 'bg-amber-500';
}

export function DashboardView({ user, hospitals, visits, trainings }: DashboardViewProps) {
  const isCentral = user.role === 'central';
  const currentHospital = isCentral ? undefined : hospitals.find((h) => h.id === user.hospitalId);

  // FR-41: KPIs derived directly from completed visits
  const completedVisits = visits.filter((v) => v.status === 'completed');
  const inProgressVisits = visits.filter((v) => v.status === 'in_progress');
  const avgCompliance = averageCompliance(completedVisits.map((v) => v.complianceScore));

  const completedTrainings = trainings.filter((t) => t.status === 'completed');
  const lateTrainings = trainings.filter((t) => t.status === 'late');
  const pendingTrainings = trainings.filter((t) => t.status === 'pending');
  const trainingCompletionRate =
    trainings.length > 0 ? Math.round((completedTrainings.length / trainings.length) * 100) : null;

  const chartData: Array<{ key: string; name: string; score: number }> = isCentral
    ? hospitals.flatMap((h) => {
        const score = averageCompliance(
          visits.filter((v) => v.hospitalId === h.id && v.status === 'completed').map((v) => v.complianceScore),
        );
        return score === null ? [] : [{ key: h.id, name: h.name.replace('مستشفى ', ''), score }];
      })
    : completedVisits
        .filter((v): v is VisitDTO & { complianceScore: number } => typeof v.complianceScore === 'number')
        .slice(0, 6)
        .map((v) => ({ key: v.id, name: formatDate(v.visitDate), score: Math.round(v.complianceScore) }));

  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFrom, setExportFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [exportTo, setExportTo] = useState(todayInputValue());

  const handleExportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exportFrom || !exportTo || exportFrom > exportTo) {
      window.alert('يرجى تحديد فترة زمنية صحيحة (تاريخ البداية قبل تاريخ النهاية).');
      return;
    }
    const params = new URLSearchParams({ from: exportFrom, to: exportTo });
    // File download from a Route Handler, not a page navigation.
    const link = document.createElement('a');
    link.href = `/api/reports/kpis?${params.toString()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  const completedAngle = trainings.length > 0 ? (completedTrainings.length / trainings.length) * 100 : 0;

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      {/* Top Banner / Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>الرئيسية</span>
            <span>/</span>
            <span className="text-teal-700 font-medium">لوحة القيادة والمؤشرات</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            {isCentral
              ? 'الداشبورد الموحد لمكافحة العدوى بالتجمع'
              : `داشبورد مؤشرات: ${currentHospital?.name ?? user.hospitalName ?? 'المستشفى'}`}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
              مؤشرات معتمدة
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCentral
              ? 'نظرة شمولية على أداء كافة المستشفيات والزيارات الرقابية وحالة التدريب'
              : 'متابعة مباشرة لمؤشرات الامتثال، الزيارات الميدانية، وسجلات تدريب الكادر الصحي'}
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
            title="تصدير تقرير PDF قابل للطباعة"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>طباعة / PDF</span>
          </button>

          {isCentral && (
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              title="تصدير تحليل مؤشرات الأداء بصيغة Excel/CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel (KPIs)</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-amber-900">تنبيه التدريبات المتأخرة والمعلقة</h4>
                <span className="bg-amber-200 text-amber-900 text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                  {lateTrainings.length} متأخر
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {lateTrainings.length > 0
                  ? `يوجد عدد (${lateTrainings.length}) تدريب متأخر عن الموعد النهائي المحدد من الإدارة المركزية بحاجة لتوثيق سريع.`
                  : trainings.length > 0
                    ? 'كافة التدريبات المطلوبة منجزة أو ضمن الموعد المتاح بانتظام.'
                    : 'لا توجد تدريبات مسجلة حالياً.'}
              </p>
            </div>
          </div>
          <Link
            href="/trainings"
            className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-0.5 shrink-0"
          >
            <span>استعراض</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-300 flex items-center justify-center text-sky-700 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-sky-900">الزيارات الرقابية القادمة والجارية</h4>
                <span className="bg-sky-200 text-sky-900 text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                  {inProgressVisits.length} زيارة
                </span>
              </div>
              <p className="text-xs text-sky-800 mt-1 leading-relaxed">
                {inProgressVisits.length > 0
                  ? `هناك (${inProgressVisits.length}) زيارة ميدانية قيد التنفيذ والمتابعة لتقييم معايير مكافحة العدوى.`
                  : 'لا توجد زيارات رقابية معلقة حالياً.'}
              </p>
            </div>
          </div>
          <Link
            href="/visits"
            className="text-xs font-bold text-sky-800 hover:text-sky-950 flex items-center gap-0.5 shrink-0"
          >
            <span>متابعة</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Average Compliance (FR-41) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">متوسط معدل الامتثال (KPI)</span>
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {avgCompliance === null ? '—' : `${avgCompliance}%`}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-500" />
            {avgCompliance === null
              ? 'لا توجد زيارات مكتملة بنسبة امتثال مسجلة بعد'
              : 'مشتق تلقائياً من نتائج الزيارات المكتملة'}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${avgCompliance ?? 0}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Completed Visits */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">الزيارات الميدانية المنجزة</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {completedVisits.length}
            </span>
            <span className="text-xs text-slate-400">من أصل {visits.length} زيارة</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {inProgressVisits.length} زيارة قيد المتابعة والردود الميدانية
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full"
              style={{ width: `${visits.length > 0 ? (completedVisits.length / visits.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Training Completion */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">نسبة إنجاز التدريب الإلزامي</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {trainingCompletionRate === null ? '—' : `${trainingCompletionRate}%`}
            </span>
            <span className="text-xs text-slate-400">
              ({completedTrainings.length}/{trainings.length})
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {trainings.length === 0
              ? 'لا توجد تدريبات مسجلة بعد'
              : lateTrainings.length > 0
                ? `${lateTrainings.length} تدريب متأخر يتطلب تدخل`
                : 'جميع الدورات منجزة أو ضمن موعدها'}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full"
              style={{ width: `${trainingCompletionRate ?? 0}%` }}
            />
          </div>
        </div>

        {/* KPI 4: Active Hospitals (central) / In-progress visits (hospital) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">
              {isCentral ? 'المستشفيات النشطة بالتجمع' : 'الزيارات قيد المتابعة'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {isCentral ? hospitals.filter((h) => h.isActive).length : inProgressVisits.length}
            </span>
            <span className="text-xs text-slate-400">
              {isCentral ? `من إجمالي ${hospitals.length}` : `من أصل ${visits.length} زيارة`}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {isCentral ? 'المنشآت المفعلة ضمن نطاق الرقابة' : 'زيارات بانتظار الردود أو الاعتماد النهائي'}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-slate-700 h-full rounded-full"
              style={{
                width: `${
                  isCentral
                    ? hospitals.length > 0
                      ? (hospitals.filter((h) => h.isActive).length / hospitals.length) * 100
                      : 0
                    : visits.length > 0
                      ? (inProgressVisits.length / visits.length) * 100
                      : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Bar Chart (FR-39) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                {isCentral
                  ? 'مقارنة نسب الامتثال بين المستشفيات'
                  : `مؤشرات الامتثال في الزيارات المكتملة (${currentHospital?.name ?? user.hospitalName ?? 'المنشأة'})`}
              </h3>
              <p className="text-xs text-slate-400">
                {isCentral
                  ? 'مشتقة من درجات التدقيق في الزيارات الرقابية المعتمدة عبر مرافق التجمع'
                  : 'درجات التدقيق المعتمدة الموثقة في تقييمات المنشأة'}
              </p>
            </div>
            <span className="text-xs text-teal-700 font-medium bg-teal-50 px-2 py-0.5 rounded">تحديث فوري</span>
          </div>

          {chartData.length === 0 ? (
            <div className="h-64 w-full flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              لا توجد زيارات مكتملة بنسبة امتثال مسجلة لعرض المقارنة
            </div>
          ) : (
            <div className="h-64 w-full flex flex-col justify-end pt-6">
              <div className="flex-1 flex items-end justify-around gap-2 px-2 pb-2 border-b border-slate-200">
                {chartData.map((item, idx) => {
                  const heightPercent = Math.max(4, item.score);
                  const isHovered = hoveredBar === idx;

                  return (
                    <div
                      key={item.key}
                      className="flex-1 h-full flex flex-col justify-end items-center gap-1 group relative cursor-pointer"
                      onMouseEnter={() => setHoveredBar(idx)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      <div
                        className={`absolute -top-8 px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-mono z-10 transition-opacity pointer-events-none whitespace-nowrap ${
                          isHovered ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        {item.name}: {item.score}% امتثال
                      </div>

                      <span className="text-[10px] font-bold text-slate-600 font-mono">{item.score}%</span>

                      <div
                        className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 ${scoreBarColor(item.score)} ${
                          isHovered ? 'brightness-110 shadow-md scale-y-105 origin-bottom' : 'opacity-90'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-around gap-2 px-2 pt-2 text-[11px] text-slate-600 font-medium">
                {chartData.map((item) => (
                  <div key={item.key} className="flex-1 text-center truncate" title={item.name}>
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Training Status Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800">توزيع حالة التدريبات المطلوبة</h3>
            <p className="text-xs text-slate-400">حالة القوالب التدريبية (معلّق / متأخر / مكتمل)</p>
          </div>

          <div className="py-4 flex items-center justify-center">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {completedAngle > 0 && (
                  <path
                    className="text-teal-600"
                    strokeDasharray={`${completedAngle}, 100`}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
              </svg>
              <div className="absolute text-center">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {trainings.length === 0 ? '—' : `${Math.round(completedAngle)}%`}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">مكتمل</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                مكتمل وموثق
              </span>
              <span className="font-mono font-bold text-slate-800">{completedTrainings.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                معلق بانتظار التوثيق
              </span>
              <span className="font-mono font-bold text-slate-800">{pendingTrainings.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                متأخر عن الموعد
              </span>
              <span className="font-mono font-bold text-rose-600">{lateTrainings.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* FR-39: Comparative Hospitals Table (Central) */}
      {isCentral && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">لوحة المقارنة الشاملة بين المستشفيات</h3>
              <p className="text-xs text-slate-500">
                متابعة مؤشرات الامتثال، الزيارات، ومنسقي مكافحة العدوى في كافة المرافق
              </p>
            </div>
            <Link
              href="/hospitals"
              className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
            >
              <span>إدارة المستشفيات الكاملة</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/70 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">اسم المستشفى</th>
                  <th className="py-3 px-4">النوع والموقع</th>
                  <th className="py-3 px-4">منسق مكافحة العدوى</th>
                  <th className="py-3 px-4">الزيارات المنجزة</th>
                  <th className="py-3 px-4">معدل الامتثال</th>
                  <th className="py-3 px-4">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {hospitals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      لا توجد مستشفيات مسجلة حالياً
                    </td>
                  </tr>
                ) : (
                  hospitals.map((h) => {
                    const hVisits = visits.filter((v) => v.hospitalId === h.id);
                    const hCompleted = hVisits.filter((v) => v.status === 'completed');
                    const score = averageCompliance(hCompleted.map((v) => v.complianceScore));

                    return (
                      <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{h.name}</td>
                        <td className="py-3 px-4">
                          <span className="block font-medium">{h.type}</span>
                          <span className="text-[11px] text-slate-400">{h.location}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="block font-medium">{h.coordinator?.name ?? 'غير محدد'}</span>
                          {h.coordinator?.email && (
                            <span className="text-[11px] text-slate-400" dir="ltr">
                              {h.coordinator.email}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium">
                          {hCompleted.length} مكتملة ({hVisits.length} إجمالي)
                        </td>
                        <td className="py-3 px-4">
                          {score === null ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs">{score}%</span>
                              <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${scoreBarColor(score)}`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              h.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {h.isActive ? 'مفعل نشط' : 'معطل'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KPI Export Modal (FR-43) */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in no-print"
          dir="rtl"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-teal-400" />
                تصدير تحليل مؤشرات الأداء (Excel)
              </h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExportSubmit} className="p-6 space-y-4 text-xs">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                يتم تصدير مؤشرات كل مستشفى (الزيارات، نسب الامتثال، التدريبات المنفذة) خلال الفترة المحددة بصيغة CSV
                متوافقة مع Excel.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">من تاريخ</label>
                  <input
                    type="date"
                    required
                    value={exportFrom}
                    onChange={(e) => setExportFrom(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">إلى تاريخ</label>
                  <input
                    type="date"
                    required
                    value={exportTo}
                    onChange={(e) => setExportTo(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold">
                  تصدير التقرير
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
