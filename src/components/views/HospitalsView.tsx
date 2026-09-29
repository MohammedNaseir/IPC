'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Edit2,
  Power,
  Users,
  Wrench,
  ClipboardList,
  GraduationCap,
  Sparkles,
  MapPin,
  Mail,
  UserCheck,
  X,
  Copy,
  Check,
  ArrowLeft,
  Lock,
  Key,
  Eye,
  EyeOff,
  UserPlus,
} from 'lucide-react';
import type { EquipmentDTO, HospitalDTO, PractitionerDTO, TrainingDTO, VisitDTO } from '@/lib/types';
import type { ColumnDef, RowAction } from '@/lib/table';
import { DataTable } from '@/components/table/DataTable';
import { formatDate } from '@/lib/format';
import {
  addCoordinator,
  createHospital,
  toggleHospitalStatus,
  updateCoordinator,
  updateHospital,
} from '@/server/actions/hospitals';
import { useActionRunner } from '@/components/hooks/useActionRunner';

interface HospitalsViewProps {
  hospitals: HospitalDTO[];
  visits: VisitDTO[];
  trainings: TrainingDTO[];
  practitioners: PractitionerDTO[];
  equipments: EquipmentDTO[];
}

interface EditingCoordinator {
  id: string;
  hospitalName: string;
  name: string;
  email: string;
}

export function HospitalsView({ hospitals, visits, trainings, practitioners, equipments }: HospitalsViewProps) {
  const router = useRouter();
  const { run, isPending } = useActionRunner();

  const [activeSubTab, setActiveSubTab] = useState<'hospitals' | 'coordinators'>('hospitals');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState<HospitalDTO | null>(null);

  const [showAddCoordinatorModal, setShowAddCoordinatorModal] = useState(false);
  const [coordFormName, setCoordFormName] = useState('');
  const [coordFormEmail, setCoordFormEmail] = useState('');
  const [coordFormPassword, setCoordFormPassword] = useState('');
  const [coordFormHospitalId, setCoordFormHospitalId] = useState('');

  const [editingCoordinator, setEditingCoordinator] = useState<EditingCoordinator | null>(null);
  const [editCoordPassword, setEditCoordPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formType, setFormType] = useState('عام');
  const [formCoordName, setFormCoordName] = useState('');
  const [formCoordEmail, setFormCoordEmail] = useState('');
  const [formCoordPassword, setFormCoordPassword] = useState('');

  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const selectedHospitalForProfile = hospitals.find((h) => h.id === selectedHospitalId) ?? null;
  const hospitalsWithoutCoordinator = hospitals.filter((h) => !h.coordinator);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormLocation('');
    setFormType('مرجعي تخصصي');
    setFormCoordName('');
    setFormCoordEmail('');
    setFormCoordPassword('');
    setShowPasswordText(false);
    setShowAddModal(true);
  };

  const handleOpenEdit = (h: HospitalDTO) => {
    setEditingHospital(h);
    setFormName(h.name);
    setFormLocation(h.location);
    setFormType(h.type);
    setFormCoordName(h.coordinator?.name ?? '');
    setFormCoordEmail(h.coordinator?.email ?? '');
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () =>
        createHospital({
          name: formName,
          location: formLocation,
          type: formType,
          coordinatorName: formCoordName,
          coordinatorEmail: formCoordEmail,
          coordinatorPassword: formCoordPassword,
        }),
      () => {
        setShowAddModal(false);
        setFormCoordPassword('');
      },
    );
  };

  const handleOpenAddCoordinator = (hospitalId?: string) => {
    setCoordFormName('');
    setCoordFormEmail('');
    setCoordFormPassword('');
    setCoordFormHospitalId(hospitalId ?? hospitalsWithoutCoordinator[0]?.id ?? '');
    setShowPasswordText(false);
    setShowAddCoordinatorModal(true);
  };

  const handleSaveCoordinator = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () =>
        addCoordinator({
          hospitalId: coordFormHospitalId,
          name: coordFormName,
          email: coordFormEmail,
          password: coordFormPassword,
        }),
      () => {
        setShowAddCoordinatorModal(false);
        setCoordFormPassword('');
      },
    );
  };

  const handleOpenEditCoordinator = (hospital: HospitalDTO) => {
    if (!hospital.coordinator) return;
    setEditingCoordinator({
      id: hospital.coordinator.id,
      hospitalName: hospital.name,
      name: hospital.coordinator.name,
      email: hospital.coordinator.email,
    });
    setEditCoordPassword('');
    setShowPasswordText(false);
  };

  const handleSaveEditCoordinator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoordinator) return;
    const target = editingCoordinator;
    run(
      () =>
        updateCoordinator(target.id, {
          name: target.name,
          email: target.email,
          newPassword: editCoordPassword || null,
        }),
      () => {
        setEditingCoordinator(null);
        setEditCoordPassword('');
      },
    );
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHospital) return;
    const target = editingHospital;
    run(
      () =>
        updateHospital(target.id, {
          name: formName,
          location: formLocation,
          type: formType,
          coordinatorName: target.coordinator ? formCoordName : null,
          coordinatorEmail: target.coordinator ? formCoordEmail : null,
        }),
      () => setEditingHospital(null),
    );
  };

  const coordinatorsCount = hospitals.filter((h) => h.coordinator).length;
  // FR-006/R-008: the heading reports what the hospitals table currently shows, not the raw total.
  const [hospitalsShown, setHospitalsShown] = useState<number | null>(null);

  // Counted once per render rather than per row, since both tables read them.
  const countsByHospital = useMemo(() => {
    const empty = () => ({ visits: 0, trainings: 0, practitioners: 0, equipments: 0 });
    const map = new Map<string, ReturnType<typeof empty>>(hospitals.map((h) => [h.id, empty()]));
    for (const v of visits) {
      const entry = map.get(v.hospitalId);
      if (entry) entry.visits++;
    }
    for (const t of trainings) {
      const entry = map.get(t.hospitalId);
      if (entry) entry.trainings++;
    }
    for (const pr of practitioners) {
      const entry = map.get(pr.hospitalId);
      if (entry) entry.practitioners++;
    }
    for (const e of equipments) {
      const entry = map.get(e.hospitalId);
      if (entry) entry.equipments++;
    }
    return map;
  }, [hospitals, visits, trainings, practitioners, equipments]);

  type CountKey = 'visits' | 'trainings' | 'practitioners' | 'equipments';
  const countOf = (hospitalId: string, key: CountKey) => countsByHospital.get(hospitalId)?.[key] ?? 0;

  const countColumn = (key: CountKey, header: string): ColumnDef<HospitalDTO> => ({
    key,
    header,
    type: 'number',
    align: 'end',
    value: (h) => countOf(h.id, key),
    render: (h) => <span className="font-mono font-bold text-slate-800">{countOf(h.id, key)}</span>,
    hideBelowMd: true,
  });

  const hospitalColumns: ColumnDef<HospitalDTO>[] = [
    {
      key: 'name',
      header: 'المستشفى',
      value: (h) => h.name,
      render: (h) => (
        <span className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-navy-700 shrink-0" aria-hidden="true" />
          <span className="font-bold text-slate-900">{h.name}</span>
        </span>
      ),
    },
    {
      key: 'type',
      header: 'نوع المنشأة',
      value: (h) => h.type,
      render: (h) => <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium whitespace-nowrap">{h.type}</span>,
    },
    {
      key: 'location',
      header: 'الموقع',
      value: (h) => h.location,
      render: (h) => (
        <span className="flex items-center gap-1 text-slate-500">
          <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
          {h.location}
        </span>
      ),
    },
    {
      key: 'coordinator',
      header: 'المنسق',
      value: (h) => h.coordinator?.name ?? null,
      render: (h) =>
        h.coordinator ? (
          <span className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-navy-700 shrink-0" aria-hidden="true" />
            <span>{h.coordinator.name}</span>
          </span>
        ) : (
          <span className="text-muted">لم يتم التعيين بعد</span>
        ),
    },
    countColumn('visits', 'الزيارات'),
    countColumn('trainings', 'التدريبات'),
    countColumn('practitioners', 'الممارسون'),
    countColumn('equipments', 'الأجهزة'),
    {
      key: 'status',
      header: 'الحالة',
      value: (h) => (h.isActive ? 'مفعل ويعمل بكفاءة' : 'معطل مؤقتاً'),
      render: (h) => (
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
            h.isActive ? 'bg-navy-50 text-navy-700 border-navy-200' : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {h.isActive ? 'مفعل ويعمل بكفاءة' : 'معطل مؤقتاً'}
        </span>
      ),
    },
  ];

  const coordinatorColumns: ColumnDef<HospitalDTO>[] = [
    {
      key: 'coordinatorName',
      header: 'المنسق',
      value: (h) => h.coordinator?.name ?? null,
      render: (h) =>
        h.coordinator ? (
          <span className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-navy-100 text-navy-800 flex items-center justify-center font-bold text-[10px] shrink-0">
              {h.coordinator.name.charAt(0)}
            </span>
            <span className="font-bold text-slate-900">{h.coordinator.name}</span>
          </span>
        ) : (
          <span className="text-muted">لم يتم التعيين بعد</span>
        ),
    },
    { key: 'hospitalName', header: 'المستشفى', value: (h) => h.name },
    {
      key: 'email',
      header: 'بريد الدخول',
      value: (h) => h.coordinator?.email ?? null,
      render: (h) => {
        const coordinator = h.coordinator;
        if (!coordinator) return <span className="text-muted">لا يوجد بريد</span>;
        return (
          <span className="flex items-center gap-1.5">
            <Mail className="w-3 h-3 text-muted shrink-0" aria-hidden="true" />
            <span className="font-mono text-[11px] text-slate-600" dir="ltr">
              {coordinator.email}
            </span>
            <button
              type="button"
              onClick={() => handleCopyEmail(coordinator.email)}
              className="text-muted hover:text-navy-700"
              title="نسخ البريد"
            >
              {copiedEmail === coordinator.email ? <Check className="w-3 h-3 text-navy-700" /> : <Copy className="w-3 h-3" />}
              <span className="sr-only">نسخ البريد</span>
            </button>
          </span>
        );
      },
    },
    {
      key: 'accountStatus',
      header: 'حالة الحساب',
      value: (h) => (h.coordinator ? 'كلمة المرور مفعلة' : 'بانتظار التعيين'),
      render: (h) =>
        h.coordinator ? (
          <span className="text-[10px] px-2 py-0.5 bg-navy-50 text-navy-700 border border-navy-200 rounded-full font-medium inline-flex items-center gap-1 whitespace-nowrap">
            <Lock className="w-2.5 h-2.5" aria-hidden="true" />
            كلمة المرور مفعلة
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium whitespace-nowrap">
            بانتظار التعيين
          </span>
        ),
    },
  ];

  const hospitalActions: RowAction<HospitalDTO>[] = [
    { label: 'البروفايل الشامل', icon: Sparkles, tone: 'primary', onSelect: (h) => setSelectedHospitalId(h.id) },
    { label: 'تعديل بيانات المستشفى', icon: Edit2, onSelect: handleOpenEdit },
    { label: 'تفعيل / تعطيل المستشفى', icon: Power, onSelect: (h) => run(() => toggleHospitalStatus(h.id)) },
  ];

  const coordinatorActions: RowAction<HospitalDTO>[] = [
    {
      label: 'بيانات الدخول وكلمة المرور',
      icon: Key,
      tone: 'primary',
      isAvailable: (h) => h.coordinator !== null,
      onSelect: handleOpenEditCoordinator,
    },
    {
      label: 'تعيين منسق',
      icon: UserPlus,
      tone: 'primary',
      isAvailable: (h) => h.coordinator === null,
      onSelect: (h) => handleOpenAddCoordinator(h.id),
    },
    { label: 'تعديل بيانات المستشفى', icon: Edit2, onSelect: handleOpenEdit },
  ];

  // The comprehensive profile shows four narrow tables for one hospital; the summary panels above them
  // stay as they are.
  const profilePractitionerColumns: ColumnDef<PractitionerDTO>[] = [
    { key: 'name', header: 'الممارس', value: (pr) => pr.name, render: (pr) => <span className="font-bold text-slate-800">{pr.name}</span> },
    { key: 'role', header: 'المسمى', value: (pr) => pr.role, render: (pr) => <span className="text-slate-500">{pr.role}</span> },
    {
      key: 'licenseNumber',
      header: 'رقم الترخيص',
      align: 'end',
      value: (pr) => pr.licenseNumber,
      render: (pr) =>
        pr.licenseNumber ? (
          <span className="text-[10px] bg-navy-50 text-navy-700 px-2 py-0.5 rounded font-mono whitespace-nowrap">{pr.licenseNumber}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  const profileEquipmentColumns: ColumnDef<EquipmentDTO>[] = [
    { key: 'name', header: 'الجهاز', value: (e) => e.name, render: (e) => <span className="font-bold text-slate-800">{e.name}</span> },
    { key: 'type', header: 'النوع', value: (e) => e.type, render: (e) => <span className="text-slate-500">{e.type}</span> },
    {
      key: 'status',
      header: 'الحالة',
      align: 'end',
      value: (e) => e.status,
      render: (e) =>
        e.status ? (
          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700 whitespace-nowrap">{e.status}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  const profileVisitColumns: ColumnDef<VisitDTO>[] = [
    {
      key: 'visitDate',
      header: 'تاريخ الزيارة',
      type: 'date',
      value: (v) => v.visitDate,
      // A visit row opens a visit wherever a visit row appears (FR-017a).
      render: (v) => (
        <Link
          href={`/visits/${v.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-bold text-slate-800 whitespace-nowrap hover:text-navy-700 hover:underline"
        >
          {formatDate(v.visitDate)}
        </Link>
      ),
    },
    { key: 'team', header: 'الفريق الزائر', value: (v) => v.team, render: (v) => <span className="text-slate-500">{v.team}</span> },
    {
      key: 'result',
      header: 'النتيجة',
      align: 'end',
      value: (v) => (v.status === 'completed' ? v.complianceScore : null),
      render: (v) => (
        <span className="text-xs font-bold text-navy-700 font-mono whitespace-nowrap">
          {v.status === 'completed' ? (v.complianceScore !== null ? `${v.complianceScore}%` : '—') : 'قيد المتابعة'}
        </span>
      ),
    },
  ];

  const profileTrainingColumns: ColumnDef<TrainingDTO>[] = [
    {
      key: 'title',
      header: 'البرنامج',
      value: (t) => t.title,
      render: (t) => (
        <Link
          href={`/trainings/${t.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-bold text-slate-800 hover:text-navy-700 hover:underline"
        >
          {t.title}
        </Link>
      ),
    },
    {
      key: 'due',
      header: 'النوع / الاستحقاق',
      value: (t) => (t.isInternal ? 'تدريب داخلي' : t.dueDate),
      render: (t) => (
        <span className="text-[11px] text-slate-500">{t.isInternal ? 'تدريب داخلي' : `استحقاق: ${formatDate(t.dueDate)}`}</span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      align: 'end',
      value: (t) => (t.status === 'completed' ? 'مكتمل' : t.status === 'late' ? 'متأخر' : 'معلق'),
      render: (t) => (
        <span
          className={`text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${
            t.status === 'completed'
              ? 'bg-navy-100 text-navy-800'
              : t.status === 'late'
                ? 'bg-danger-100 text-danger-800'
                : 'bg-attn-100 text-attn-800'
          }`}
        >
          {t.status === 'completed' ? 'مكتمل' : t.status === 'late' ? 'متأخر' : 'معلق'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      {!selectedHospitalForProfile ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span>المنشآت والأصول</span>
                <span>/</span>
                <span className="text-navy-700 font-medium">إدارة المستشفيات ومنسقي مكافحة العدوى</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                مستشفيات التجمع ومنسقو مكافحة العدوى
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-navy-50 text-navy-700 font-bold border border-navy-200">
                  {hospitalsShown ?? hospitals.length} منشأة
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة المنشآت الصحية، تعيين حسابات منسقي المستشفيات وتفويض الصلاحيات، ومتابعة البروفايل الشامل
              </p>
            </div>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-navy-800 hover:bg-navy-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مستشفى جديد</span>
            </button>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 rounded-xl shadow-2xs">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveSubTab('hospitals')}
                className={`py-3.5 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  activeSubTab === 'hospitals'
                    ? 'border-navy-800 text-navy-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>قائمة المستشفيات ({hospitals.length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('coordinators')}
                className={`py-3.5 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  activeSubTab === 'coordinators'
                    ? 'border-navy-800 text-navy-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>حسابات منسقي المستشفيات ({coordinatorsCount})</span>
              </button>
            </div>

          </div>

          {activeSubTab === 'hospitals' && (
            <DataTable
              key="hospitals"
              rows={hospitals}
              columns={hospitalColumns}
              rowKey={(h) => h.id}
              actions={hospitalActions}
              onStateChange={({ filteredCount }) => setHospitalsShown(filteredCount)}
              searchPlaceholder="بحث بالاسم، الموقع، أو المنسق..."
              emptyMessage="لا توجد مستشفيات مسجلة بعد"
              noMatchMessage="لا توجد مستشفيات مسجلة مطابقة"
              caption="قائمة مستشفيات التجمع"
            />
          )}

          {activeSubTab === 'coordinators' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-navy-700" />
                    سجل حسابات منسقي مكافحة العدوى بمستشفيات التجمع
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    إدارة منسقي المنشآت الصحية وضبط بيانات الدخول وإعادة تعيين كلمات المرور
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-navy-700 bg-navy-50 px-2.5 py-1 rounded-full border border-navy-200">
                    {coordinatorsCount} منسق مسجل
                  </span>
                  <button
                    onClick={() => handleOpenAddCoordinator()}
                    disabled={hospitalsWithoutCoordinator.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-navy-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة منسق مستشفى جديد</span>
                  </button>
                </div>
              </div>

              <DataTable
                key="coordinators"
                rows={hospitals}
                columns={coordinatorColumns}
                rowKey={(h) => h.id}
                actions={coordinatorActions}
                searchPlaceholder="بحث بالمنسق، المستشفى، أو البريد..."
                emptyMessage="لا توجد مستشفيات مسجلة بعد"
                noMatchMessage="لا توجد مستشفيات مسجلة مطابقة"
                caption="سجل حسابات منسقي مكافحة العدوى"
              />
            </div>
          )}
        </>
      ) : (
        <div
          className="bg-white rounded-xl shadow-md border border-slate-200 w-full flex flex-col overflow-hidden animate-fade-in"
          dir="rtl"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-5 bg-slate-900 text-white gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedHospitalId(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors text-muted hover:text-white"
                title="العودة للقائمة"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-lg bg-navy-600/20 text-navy-300 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  البروفايل الشامل للمستشفى - {selectedHospitalForProfile.name}
                </h3>
                <p className="text-xs text-muted">
                  تجميع بيانات المستشفى الموحدة (الكوادر، الأجهزة، التدريبات، والزيارات الرقابية)
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-muted block text-[11px]">نوع المنشأة</span>
                <strong className="font-bold text-slate-800">{selectedHospitalForProfile.type}</strong>
              </div>
              <div>
                <span className="text-muted block text-[11px]">الموقع الجغرافي</span>
                <strong className="font-bold text-slate-800">{selectedHospitalForProfile.location}</strong>
              </div>
              <div>
                <span className="text-muted block text-[11px]">منسق مكافحة العدوى</span>
                <strong className="font-bold text-slate-800">
                  {selectedHospitalForProfile.coordinator?.name ?? 'لم يتم التعيين بعد'}
                </strong>
              </div>
              <div>
                <span className="text-muted block text-[11px]">البريد الرسمي</span>
                <strong className="font-bold text-slate-800 font-mono text-[11px]" dir="ltr">
                  {selectedHospitalForProfile.coordinator?.email ?? '—'}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-3 font-bold text-xs text-slate-800">
                  <Users className="w-4 h-4 text-navy-700" />
                  <span>فريق مكافحة العدوى والممارسين المعتمدين</span>
                </div>
                <DataTable
                  key={`prac-${selectedHospitalForProfile.id}`}
                  rows={practitioners.filter((pr) => pr.hospitalId === selectedHospitalForProfile.id)}
                  columns={profilePractitionerColumns}
                  rowKey={(pr) => pr.id}
                  pageSize={10}
                  searchPlaceholder="بحث في الممارسين..."
                  emptyMessage="لا يوجد ممارسون مسجلون حالياً"
                  noMatchMessage="لا يوجد ممارسون مطابقون للبحث"
                  caption="ممارسو المستشفى في البروفايل الشامل"
                />
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-3 font-bold text-xs text-slate-800">
                  <Wrench className="w-4 h-4 text-navy-700" />
                  <span>أجهزة ومعدات التعقيم والفحص المعتمدة</span>
                </div>
                <DataTable
                  key={`eq-${selectedHospitalForProfile.id}`}
                  rows={equipments.filter((e) => e.hospitalId === selectedHospitalForProfile.id)}
                  columns={profileEquipmentColumns}
                  rowKey={(e) => e.id}
                  pageSize={10}
                  searchPlaceholder="بحث في الأجهزة..."
                  emptyMessage="لا توجد معدات مسجلة حالياً"
                  noMatchMessage="لا توجد معدات مطابقة للبحث"
                  caption="أجهزة المستشفى في البروفايل الشامل"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-3 font-bold text-xs text-slate-800">
                  <ClipboardList className="w-4 h-4 text-navy-700" />
                  <span>سجل الزيارات الرقابية</span>
                </div>
                <DataTable
                  key={`vis-${selectedHospitalForProfile.id}`}
                  rows={visits.filter((v) => v.hospitalId === selectedHospitalForProfile.id)}
                  columns={profileVisitColumns}
                  rowKey={(v) => v.id}
                  onRowSelect={(v) => router.push(`/visits/${v.id}`)}
                  stateKey="hospital-comprehensive-visits"
                  pageSize={10}
                  searchPlaceholder="بحث في الزيارات..."
                  emptyMessage="لا توجد زيارات رقابية مسجلة"
                  noMatchMessage="لا توجد زيارات مطابقة للبحث"
                  caption="زيارات المستشفى في البروفايل الشامل"
                />
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-3 font-bold text-xs text-slate-800">
                  <GraduationCap className="w-4 h-4 text-navy-700" />
                  <span>البرامج والمسارات التدريبية</span>
                </div>
                <DataTable
                  key={`trn-${selectedHospitalForProfile.id}`}
                  rows={trainings.filter((t) => t.hospitalId === selectedHospitalForProfile.id)}
                  columns={profileTrainingColumns}
                  rowKey={(t) => t.id}
                  onRowSelect={(t) => router.push(`/trainings/${t.id}`)}
                  stateKey="hospital-comprehensive-trainings"
                  pageSize={10}
                  searchPlaceholder="بحث في البرامج التدريبية..."
                  emptyMessage="لا توجد برامج تدريبية مسجلة"
                  noMatchMessage="لا توجد برامج مطابقة للبحث"
                  caption="تدريبات المستشفى في البروفايل الشامل"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              onClick={() => setSelectedHospitalId(null)}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-navy-400" />
                إضافة مستشفى جديد إلى التجمع
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المستشفى</label>
                <input
                  type="text"
                  required
                  placeholder="اسم المنشأة الصحية"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الموقع الجغرافي</label>
                  <input
                    type="text"
                    required
                    placeholder="المدينة / المنطقة الإدارية"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع المنشأة</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                  >
                    <option value="عام">عام</option>
                    <option value="مرجعي تخصصي">مرجعي تخصصي</option>
                    <option value="ولادة وأطفال">ولادة وأطفال</option>
                    <option value="رعاية ممتدة">رعاية ممتدة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم منسق مكافحة العدوى</label>
                  <input
                    type="text"
                    placeholder="الاسم والصفة الوظيفية للمنسق"
                    value={formCoordName}
                    onChange={(e) => setFormCoordName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">البريد الرسمي للمنسق</label>
                  <input
                    type="email"
                    placeholder="البريد الرسمي للمنسق"
                    value={formCoordEmail}
                    onChange={(e) => setFormCoordEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">كلمة المرور الابتدائية لدخول المنسق</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    minLength={8}
                    required={formCoordEmail.trim() !== ''}
                    autoComplete="new-password"
                    value={formCoordPassword}
                    onChange={(e) => setFormCoordPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800 pl-10 font-mono"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute left-3 top-3 text-muted hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted mt-1">
                  مطلوبة عند إدخال بريد المنسق (8 أحرف على الأقل). يمكن تعيين المنسق لاحقاً من سجل المنسقين.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  حفظ المستشفى وتوزيع خطط التدريب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddCoordinatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-navy-950 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-navy-300" />
                إضافة واعتماد منسق مستشفى جديد
              </h3>
              <button onClick={() => setShowAddCoordinatorModal(false)} className="text-slate-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoordinator} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المنسق الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="الاسم الرباعي والصفة الرسمية للمنسق"
                  value={coordFormName}
                  onChange={(e) => setCoordFormName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المستشفى التابع له (نطاق الصلاحية)</label>
                <select
                  required
                  value={coordFormHospitalId}
                  onChange={(e) => setCoordFormHospitalId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                >
                  <option value="">-- اختر المستشفى --</option>
                  {hospitalsWithoutCoordinator.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.location})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-navy-700 mt-1">
                  سيكون لهذا المنسق استقلالية كاملة في إدارة بيانات هذا المستشفى فقط دون الاطلاع على المستشفيات الأخرى.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني الرسمي</label>
                <input
                  type="email"
                  required
                  placeholder="البريد الرسمي للمنسق"
                  value={coordFormEmail}
                  onChange={(e) => setCoordFormEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">كلمة المرور الخاصة بالحساب</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="8 أحرف على الأقل"
                    value={coordFormPassword}
                    onChange={(e) => setCoordFormPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800 pl-10 font-mono"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute left-3 top-3 text-muted hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted mt-1">
                  يدخل المنسق بواسطة هذا البريد وكلمة المرور من شاشة تسجيل الدخول الرسمية.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddCoordinatorModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  اعتماد وإنشاء الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingCoordinator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-navy-400" />
                بيانات حساب المنسق وتعيين كلمة المرور
              </h3>
              <button onClick={() => setEditingCoordinator(null)} className="text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCoordinator} className="p-6 space-y-4 text-xs">
              <p className="text-[11px] text-slate-500">
                المستشفى: <strong className="text-slate-800">{editingCoordinator.hospitalName}</strong>
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المنسق</label>
                <input
                  type="text"
                  required
                  value={editingCoordinator.name}
                  onChange={(e) => setEditingCoordinator({ ...editingCoordinator, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني الرسمي للدخول</label>
                <input
                  type="email"
                  required
                  value={editingCoordinator.email}
                  onChange={(e) => setEditingCoordinator({ ...editingCoordinator, email: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  كلمة مرور جديدة (اتركها فارغة للإبقاء على الحالية)
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    minLength={8}
                    autoComplete="new-password"
                    value={editCoordPassword}
                    onChange={(e) => setEditCoordPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800 pl-10 font-mono"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute left-3 top-3 text-muted hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  تغيير كلمة المرور أو البريد ينهي جلسات المنسق الحالية ويتطلب تسجيل الدخول مجدداً.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCoordinator(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  حفظ كلمة المرور والبيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-navy-400" />
                تعديل بيانات المستشفى والمنسق
              </h3>
              <button onClick={() => setEditingHospital(null)} className="text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المستشفى</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الموقع</label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">النوع</label>
                  <input
                    type="text"
                    required
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              {editingHospital.coordinator ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">منسق مكافحة العدوى</label>
                    <input
                      type="text"
                      required
                      value={formCoordName}
                      onChange={(e) => setFormCoordName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                    <input
                      type="email"
                      required
                      value={formCoordEmail}
                      onChange={(e) => setFormCoordEmail(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                      dir="ltr"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  لم يتم تعيين منسق لهذا المستشفى بعد. يمكن تعيينه من تبويب &quot;حسابات منسقي المستشفيات&quot;.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingHospital(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
