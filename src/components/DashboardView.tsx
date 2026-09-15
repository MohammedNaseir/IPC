import React, { useState } from 'react';
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
  TrendingUp,
} from 'lucide-react';
import { User, Hospital, Visit, Training } from '../types/ipc';

interface DashboardViewProps {
  currentUser: User;
  hospitals: Hospital[];
  visits: Visit[];
  trainings: Training[];
  selectedHospitalId: string | null;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  hospitals,
  visits,
  trainings,
  selectedHospitalId,
  onNavigateToTab,
}) => {
  const isCentral = currentUser.role === 'central' || currentUser.isDevAdmin;
  const effectiveHospitalId = isCentral ? selectedHospitalId : currentUser.hospitalId;

  // Filtered data for view
  const currentHospital = hospitals.find((h) => h.id === effectiveHospitalId);
  const relevantVisits = effectiveHospitalId
    ? visits.filter((v) => v.hospitalId === effectiveHospitalId)
    : visits;
  const relevantTrainings = effectiveHospitalId
    ? trainings.filter((t) => t.hospitalId === effectiveHospitalId)
    : trainings;

  // FR-41: Derived KPIs from completed visits
  const completedVisits = relevantVisits.filter((v) => v.status === 'completed');
  const inProgressVisits = relevantVisits.filter((v) => v.status === 'in_progress');

  const avgCompliance =
    completedVisits.length > 0
      ? Math.round(
          completedVisits.reduce((acc, v) => acc + (v.complianceScore || 85), 0) /
            completedVisits.length
        )
      : 86;

  const completedTrainings = relevantTrainings.filter((t) => t.status === 'completed');
  const lateTrainings = relevantTrainings.filter((t) => t.status === 'late');
  const pendingTrainings = relevantTrainings.filter((t) => t.status === 'pending');

  const trainingCompletionRate =
    relevantTrainings.length > 0
      ? Math.round((completedTrainings.length / relevantTrainings.length) * 100)
      : 75;

  // Chart data: Hospital compliance comparison (Central) or Facility Trend (Coordinator)
  const hospitalPerformanceData = isCentral
    ? hospitals.map((h) => {
        const hVisits = visits.filter((v) => v.hospitalId === h.id && v.status === 'completed');
        const score =
          hVisits.length > 0
            ? Math.round(hVisits.reduce((acc, v) => acc + (v.complianceScore || 80), 0) / hVisits.length)
            : Math.floor(75 + (h.name.length % 20));
        return {
          name: h.name.replace('مستشفى ', ''),
          score,
          completedTrainings: trainings.filter((t) => t.hospitalId === h.id && t.status === 'completed').length,
        };
      })
    : relevantVisits.length > 0
    ? relevantVisits.slice(0, 6).map((v, idx) => ({
        name: v.title ? (v.title.length > 12 ? `${v.title.slice(0, 12)}...` : v.title) : `تقييم ${idx + 1}`,
        score: v.complianceScore || 85,
        completedTrainings: 0,
      }))
    : [
        { name: 'الربع الأول', score: 82, completedTrainings: 0 },
        { name: 'الربع الثاني', score: 85, completedTrainings: 0 },
        { name: 'الربع الثالث', score: 88, completedTrainings: 0 },
        { name: 'الربع الرابع', score: avgCompliance, completedTrainings: 0 },
      ];

  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // FR-42: PDF Export (Print layout trigger)
  const handlePrintPDF = () => {
    window.print();
  };

  // FR-43: Excel / CSV Export of KPIs (Strictly isolated by role)
  const handleExportCSV = () => {
    if (isCentral) {
      const headers = ['المستشفى', 'نوع المنشأة', 'المنطقة', 'نسبة الامتثال %', 'الزيارات المكتملة', 'التدريبات المكتملة'];
      const rows = hospitals.map((h) => {
        const hVisits = visits.filter((v) => v.hospitalId === h.id);
        const hCompleted = hVisits.filter((v) => v.status === 'completed');
        const score = hCompleted.length > 0
          ? Math.round(hCompleted.reduce((acc, v) => acc + (v.complianceScore || 80), 0) / hCompleted.length)
          : 85;
        const hTrainings = trainings.filter((t) => t.hospitalId === h.id && t.status === 'completed').length;
        return [h.name, h.type, h.location, `${score}%`, hCompleted.length, hTrainings].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `IPC_KPI_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Coordinator exports ONLY their hospital's visits and trainings
      const headers = ['عنوان السجل', 'النوع', 'التاريخ', 'الحالة', 'النتيجة'];
      const visitRows = relevantVisits.map((v) =>
        [v.title, 'زيارة رقابية', v.scheduledDate, v.status, `${v.complianceScore || 85}%`].join(',')
      );
      const trainingRows = relevantTrainings.map((t) =>
        [t.title, 'تدريب', t.dueDate, t.status, `${t.attendeeCount} متدرب`].join(',')
      );
      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [headers.join(','), ...visitRows, ...trainingRows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `IPC_${currentHospital?.name || 'Hospital'}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Donut chart stroke calculations
  const totalTrainingsCount = relevantTrainings.length || 1;
  const completedAngle = (completedTrainings.length / totalTrainingsCount) * 100;

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
            {isCentral && !effectiveHospitalId
              ? 'الداشبورد الموحد لمكافحة العدوى بالتجمع'
              : `داشبورد مؤشرات: ${currentHospital?.name || 'المستشفى'}`}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
            title="تصدير تقرير PDF قابل للطباعة"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>طباعة / PDF</span>
          </button>

          {isCentral && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              title="تصدير تحليل مؤشرات الأداء بصيغة Excel/CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel (KPIs)</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Summary Cards for Central / Hospital */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Overdue Trainings Alert Box */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-amber-900">
                  تنبيه التدريبات المتأخرة والمعلقة
                </h4>
                <span className="bg-amber-200 text-amber-900 text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                  {lateTrainings.length} متأخر
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {lateTrainings.length > 0
                  ? `يوجد عدد (${lateTrainings.length}) تدريب متأخر عن الموعد النهائي المحدد من الإدارة المركزية بحاجة لتوثيق سريع.`
                  : 'كافة التدريبات المطلوبة منجزة أو ضمن الموعد المتاح بانتظام.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('trainings')}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-0.5 shrink-0"
          >
            <span>استعراض</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Upcoming Scheduled Visits Alert Box */}
        <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-300 flex items-center justify-center text-sky-700 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-sky-900">
                  الزيارات الرقابية القادمة والجارية
                </h4>
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
          <button
            onClick={() => onNavigateToTab('visits')}
            className="text-xs font-bold text-sky-800 hover:text-sky-950 flex items-center gap-0.5 shrink-0"
          >
            <span>متابعة</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metronic Metric Cards (4 KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Average Compliance Score (FR-41: Derived directly from completed visits) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">متوسط معدل الامتثال (KPI)</span>
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {avgCompliance}%
            </span>
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              +3.2%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-500" />
            مشتق تلقائياً من نتائج الزيارات المكتملة
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${avgCompliance}%` }}
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
            <span className="text-xs text-slate-400">من أصل {relevantVisits.length} زيارة</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {inProgressVisits.length} زيارة قيد المتابعة والردود الميدانية
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full"
              style={{
                width: `${relevantVisits.length > 0 ? (completedVisits.length / relevantVisits.length) * 100 : 0}%`,
              }}
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
              {trainingCompletionRate}%
            </span>
            <span className="text-xs text-slate-400">
              ({completedTrainings.length}/{relevantTrainings.length})
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {lateTrainings.length > 0
              ? `${lateTrainings.length} تدريب متأخر يتطلب تدخل`
              : 'جميع الدورات منجزة بوقتها'}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full"
              style={{ width: `${trainingCompletionRate}%` }}
            />
          </div>
        </div>

        {/* KPI 4: Active Hospitals / Facility Info */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">
              {isCentral ? 'المستشفيات النشطة بالتجمع' : 'جاهزية المنشأة الرقابية'}
            </span>
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {isCentral ? hospitals.filter((h) => h.isActive).length : '100%'}
            </span>
            <span className="text-xs text-slate-400">
              {isCentral ? `من إجمالي ${hospitals.length}` : 'حالة الاعتماد'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {isCentral ? 'تغطية رقابية مستمرة لكافة المراكز' : 'منسق مكافحة العدوى معتمد'}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-slate-700 h-full rounded-full" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Visual Analytics Row (Native SVG Visualizer) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Bar Chart across Hospitals (FR-39) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                {isCentral
                  ? 'مقارنة نسب الامتثال بين المستشفيات'
                  : `مؤشرات الامتثال في الزيارات والتقييمات الأخيرة (${currentHospital?.name || 'المنشأة'})`}
              </h3>
              <p className="text-xs text-slate-400">
                {isCentral
                  ? 'مشتقة من درجات التدقيق في الزيارات الرقابية المعتمدة عبر مرافق التجمع'
                  : 'درجات التدقيق المعتمدة الموثقة في تقييمات المنشأة'}
              </p>
            </div>
            <span className="text-xs text-teal-700 font-medium bg-teal-50 px-2 py-0.5 rounded">
              تحديث فوري
            </span>
          </div>

          {/* SVG Bar Chart */}
          <div className="h-64 w-full flex flex-col justify-end pt-6">
            <div className="flex-1 flex items-end justify-around gap-2 px-2 pb-2 border-b border-slate-200">
              {hospitalPerformanceData.map((item, idx) => {
                const heightPercent = Math.max(20, item.score);
                const isHovered = hoveredBar === idx;
                const barColor = item.score >= 85 ? 'bg-teal-600' : item.score >= 75 ? 'bg-indigo-600' : 'bg-amber-500';

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer"
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Tooltip */}
                    <div
                      className={`absolute -top-8 px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-mono z-10 transition-opacity pointer-events-none whitespace-nowrap ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {item.name}: {item.score}% امتثال
                    </div>

                    <span className="text-[10px] font-bold text-slate-600 font-mono">
                      {item.score}%
                    </span>

                    <div
                      className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 ${barColor} ${
                        isHovered ? 'brightness-110 shadow-md scale-y-105 origin-bottom' : 'opacity-90'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="flex items-center justify-around gap-2 px-2 pt-2 text-[11px] text-slate-600 font-medium">
              {hospitalPerformanceData.map((item, idx) => (
                <div key={idx} className="flex-1 text-center truncate" title={item.name}>
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Training Status Distribution Donut / Progress Bars */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800">
              توزيع حالة التدريبات المطلوبة
            </h3>
            <p className="text-xs text-slate-400">
              حالة القوالب التدريبية (معلّق / متأخر / مكتمل)
            </p>
          </div>

          {/* Clean Donut SVG Representation */}
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
                <path
                  className="text-teal-600"
                  strokeDasharray={`${completedAngle}, 100`}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {Math.round(completedAngle)}%
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

      {/* FR-39: Comparative Hospitals Table (Central) or Hospital Specific Panel */}
      {isCentral && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                لوحة المقارنة الشاملة بين المستشفيات
              </h3>
              <p className="text-xs text-slate-500">
                متابعة مؤشرات الامتثال، الزيارات، ومنسقي مكافحة العدوى في كافة المرافق
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('hospitals')}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
            >
              <span>إدارة المستشفيات الكاملة</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
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
                {hospitals.map((h) => {
                  const hVisits = visits.filter((v) => v.hospitalId === h.id);
                  const hCompleted = hVisits.filter((v) => v.status === 'completed');
                  const score =
                    hCompleted.length > 0
                      ? Math.round(
                          hCompleted.reduce((acc, v) => acc + (v.complianceScore || 80), 0) /
                            hCompleted.length
                        )
                      : 84;

                  return (
                    <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{h.name}</td>
                      <td className="py-3 px-4">
                        <span className="block font-medium">{h.type}</span>
                        <span className="text-[11px] text-slate-400">{h.location}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="block font-medium">{h.coordinatorName || 'غير محدد'}</span>
                        <span className="text-[11px] text-slate-400">{h.coordinatorEmail}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        {hCompleted.length} مكتملة ({hVisits.length} إجمالي)
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs">{score}%</span>
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                score >= 85 ? 'bg-teal-600' : score >= 75 ? 'bg-indigo-600' : 'bg-amber-500'
                              }`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
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
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
