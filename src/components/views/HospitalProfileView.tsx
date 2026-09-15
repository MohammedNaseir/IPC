'use client';

import Link from 'next/link';
import { Building2, Users, Wrench, ClipboardList, GraduationCap, MapPin, ShieldCheck } from 'lucide-react';
import type {
  EquipmentDTO,
  HospitalDTO,
  PractitionerDTO,
  SessionUser,
  TrainingDTO,
  VisitDTO,
} from '@/lib/types';
import { formatDate } from '@/lib/format';

interface HospitalProfileViewProps {
  user: SessionUser;
  hospital: HospitalDTO;
  visits: VisitDTO[];
  trainings: TrainingDTO[];
  practitioners: PractitionerDTO[];
  equipments: EquipmentDTO[];
}

export function HospitalProfileView({
  user,
  hospital,
  visits,
  trainings,
  practitioners,
  equipments,
}: HospitalProfileViewProps) {
  const hVisits = visits.filter((v) => v.hospitalId === hospital.id);
  const hTrainings = trainings.filter((t) => t.hospitalId === hospital.id);
  const hPractitioners = practitioners.filter((p) => p.hospitalId === hospital.id);
  const hEquipments = equipments.filter((e) => e.hospitalId === hospital.id);

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>المنشآت والأصول</span>
              <span>/</span>
              <span className="text-teal-700 font-medium">الملف التعريفي للمستشفى وحساب المنسق</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-teal-600" />
              <span>{hospital.name}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                منشأة معتمدة ونشطة
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              لوحة تحكم منسق مكافحة العدوى - إدارة الكوادر والمعدات ومتابعة الزيارات والبرامج التدريبية لمنشأتك
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-teal-800 to-slate-900 text-white p-5 rounded-xl shadow-sm md:col-span-1">
          <div className="flex items-center gap-2 text-teal-300 text-xs font-bold mb-3">
            <ShieldCheck className="w-4 h-4" />
            <span>حساب منسق مكافحة العدوى المعتمد</span>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">الاسم الكامل:</span>
              <p className="text-sm font-bold text-white mt-0.5">{hospital.coordinator?.name ?? user.name}</p>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">البريد الإلكتروني الرسمي:</span>
              <p className="font-mono text-teal-200 text-[11px] mt-0.5" dir="ltr">
                {hospital.coordinator?.email ?? user.email}
              </p>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">الدور والصلاحيات:</span>
              <p className="text-white mt-0.5">
                منسق مستشفى (إدارة الأصول وتوثيق التدريب ومتابعة الزيارات الخاصة بالمنشأة)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 md:col-span-2 flex flex-col justify-between">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">تصنيف المنشأة</span>
              <strong className="text-slate-800 font-bold block mt-1">{hospital.type}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">الموقع الجغرافي</span>
              <strong className="text-slate-800 font-bold mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                {hospital.location}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">تاريخ التسجيل بالنظام</span>
              <strong className="text-slate-800 font-bold block mt-1">{formatDate(hospital.createdAt)}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">الحالة التشغيلية</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                نشط ومعتمد
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">اختصارات سريعة للمنسق:</span>
            <Link
              href="/assets"
              className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition-colors"
            >
              + إضافة كادر / جهاز طبي
            </Link>
            <Link
              href="/trainings"
              className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition-colors"
            >
              + رصد وتوثيق تدريب
            </Link>
            <Link
              href="/visits"
              className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition-colors"
            >
              استعراض الزيارات الرقابية
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">الكوادر الصحية المسجلة</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{hPractitioners.length}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">ضمن فريق مكافحة العدوى بالمستشفى</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">الأجهزة والمعدات الطبية</span>
            <Wrench className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{hEquipments.length}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">أجهزة التعقيم ومكافحة العدوى المسجلة</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">البرامج التدريبية المعتمدة</span>
            <GraduationCap className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{hTrainings.length}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">تدريبات مركزية ومستقلة للمستشفى</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">الزيارات الرقابية</span>
            <ClipboardList className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{hVisits.length}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">زيارات تقييم امتثال مكافحة العدوى</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-teal-600" />
              الزيارات الرقابية الخاصة بالمستشفى
            </span>
            <Link href="/visits" className="text-xs text-teal-700 font-bold hover:underline">
              عرض الكل
            </Link>
          </h3>
          {hVisits.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">لا توجد زيارات رقابية مسجلة حالياً للمستشفى</p>
          ) : (
            <div className="space-y-2">
              {hVisits.slice(0, 4).map((v) => (
                <div key={v.id} className="p-3 bg-slate-50 rounded-lg text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">زيارة بتاريخ {formatDate(v.visitDate)}</span>
                    <span className="text-[11px] text-slate-500">الفريق الزائر: {v.team}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      v.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {v.status === 'completed'
                      ? `مكتملة (${v.complianceScore !== null ? `${v.complianceScore}%` : '—'})`
                      : 'قيد المتابعة'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-teal-600" />
              البرامج التدريبية المخصصة للمستشفى
            </span>
            <Link href="/trainings" className="text-xs text-teal-700 font-bold hover:underline">
              عرض الكل
            </Link>
          </h3>
          {hTrainings.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">لا توجد برامج تدريبية مسجلة حالياً</p>
          ) : (
            <div className="space-y-2">
              {hTrainings.slice(0, 4).map((t) => (
                <div key={t.id} className="p-3 bg-slate-50 rounded-lg text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">{t.title}</span>
                    <span className="text-[11px] text-slate-500">
                      {t.isInternal ? 'تدريب داخلي' : `تاريخ الاستحقاق: ${formatDate(t.dueDate)}`}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : t.status === 'late'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {t.status === 'completed' ? 'منفذ وموثق' : t.status === 'late' ? 'متأخر' : 'معلق ومستحق'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
