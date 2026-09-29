'use client';

import { useMemo, useState } from 'react';
import { Users2, Wrench, Plus, Edit2, X } from 'lucide-react';
import type { EquipmentDTO, HospitalDTO, PractitionerDTO, SessionUser } from '@/lib/types';
import type { ColumnDef, RowAction } from '@/lib/table';
import { DataTable } from '@/components/table/DataTable';
import { formatDate, todayInputValue } from '@/lib/format';
import { createPractitioner, updatePractitioner } from '@/server/actions/practitioners';
import { createEquipment, updateEquipment } from '@/server/actions/equipment';
import { useActionRunner } from '@/components/hooks/useActionRunner';

interface AssetsViewProps {
  user: SessionUser;
  practitioners: PractitionerDTO[];
  equipments: EquipmentDTO[];
  hospitals: HospitalDTO[];
}

const EQUIPMENT_STATUSES = ['يعمل بكفاءة', 'بحاجة لصيانة', 'خارج الخدمة مؤقتاً'];

export function AssetsView({ user, practitioners, equipments, hospitals }: AssetsViewProps) {
  const isCentral = user.role === 'central';
  const defaultHospitalId = user.hospitalId ?? hospitals[0]?.id ?? '';
  const { run, isPending } = useActionRunner();

  const [activeTab, setActiveTab] = useState<'practitioners' | 'equipments'>('practitioners');
  const [filterHospital, setFilterHospital] = useState('');

  const [showAddPracModal, setShowAddPracModal] = useState(false);
  const [editingPrac, setEditingPrac] = useState<PractitionerDTO | null>(null);
  const [showAddEqModal, setShowAddEqModal] = useState(false);
  const [editingEq, setEditingEq] = useState<EquipmentDTO | null>(null);

  const [pracName, setPracName] = useState('');
  const [pracRole, setPracRole] = useState('أخصائي مكافحة عدوى');
  const [pracLicense, setPracLicense] = useState('');
  const [pracHospId, setPracHospId] = useState(defaultHospitalId);
  const [pracEmail, setPracEmail] = useState('');
  const [pracPhone, setPracPhone] = useState('');

  const [eqName, setEqName] = useState('');
  const [eqType, setEqType] = useState('جهاز تعقيم بخاري');
  const [eqSerial, setEqSerial] = useState('');
  const [eqHospId, setEqHospId] = useState(defaultHospitalId);
  const [eqStatus, setEqStatus] = useState(EQUIPMENT_STATUSES[0]);
  const [eqMaint, setEqMaint] = useState(todayInputValue());

  // The hospital select keeps narrowing both lists as before; each table owns its own search, sort and
  // page state so switching tabs cannot carry one section's state into the other (FR-020).
  const scopedPractitioners = useMemo(
    () => practitioners.filter((p) => !(isCentral && filterHospital) || p.hospitalId === filterHospital),
    [practitioners, isCentral, filterHospital],
  );
  const scopedEquipments = useMemo(
    () => equipments.filter((e) => !(isCentral && filterHospital) || e.hospitalId === filterHospital),
    [equipments, isCentral, filterHospital],
  );

  const practitionerColumns = useMemo<ColumnDef<PractitionerDTO>[]>(
    () => [
      {
        key: 'name',
        header: 'اسم الممارس',
        value: (p) => p.name,
        render: (p) => (
          <span className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-700 font-bold text-[10px] shrink-0">
              {p.name.slice(0, 1)}
            </span>
            <span className="font-bold text-slate-900">{p.name}</span>
          </span>
        ),
      },
      { key: 'role', header: 'المسمى الوظيفي', value: (p) => p.role, render: (p) => <span className="text-navy-700 font-medium">{p.role}</span> },
      {
        key: 'licenseNumber',
        header: 'رقم رخصة الهيئة (SCFHS)',
        value: (p) => p.licenseNumber,
        render: (p) => <span className="font-mono">{p.licenseNumber ?? <span className="text-muted">—</span>}</span>,
      },
      { key: 'hospitalName', header: 'المنشأة التابع لها', value: (p) => p.hospitalName },
      {
        key: 'email',
        header: 'البريد الإلكتروني',
        value: (p) => p.email,
        render: (p) => <span className="font-mono text-[10px] text-slate-500">{p.email ?? <span className="text-muted">—</span>}</span>,
        hideBelowMd: true,
      },
    ],
    [],
  );

  const equipmentColumns = useMemo<ColumnDef<EquipmentDTO>[]>(
    () => [
      {
        key: 'name',
        header: 'اسم الجهاز',
        value: (e) => e.name,
        render: (e) => (
          <span className="flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5 text-navy-700 shrink-0" aria-hidden="true" />
            <span className="font-bold text-slate-900">{e.name}</span>
          </span>
        ),
      },
      { key: 'type', header: 'نوع الجهاز', value: (e) => e.type, render: (e) => <span className="text-navy-700 font-medium">{e.type}</span> },
      {
        key: 'serialNumber',
        header: 'الرقم التسلسلي (SN)',
        value: (e) => e.serialNumber,
        render: (e) => <span className="font-mono">{e.serialNumber ?? <span className="text-muted">—</span>}</span>,
      },
      { key: 'hospitalName', header: 'المنشأة', value: (e) => e.hospitalName },
      {
        key: 'status',
        header: 'الحالة',
        value: (e) => e.status,
        render: (e) =>
          e.status ? (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                e.status === EQUIPMENT_STATUSES[0]
                  ? 'bg-navy-50 text-navy-700 border-navy-200'
                  : 'bg-attn-50 text-attn-700 border-attn-200'
              }`}
            >
              {e.status}
            </span>
          ) : (
            <span className="text-muted">—</span>
          ),
      },
      {
        key: 'lastMaintenance',
        header: 'آخر صيانة وقائية',
        type: 'date',
        value: (e) => e.lastMaintenance,
        render: (e) => <span className="whitespace-nowrap">{e.lastMaintenance ? formatDate(e.lastMaintenance) : 'غير محدد'}</span>,
        hideBelowMd: true,
      },
    ],
    [],
  );

  const closePracModal = () => {
    setShowAddPracModal(false);
    setEditingPrac(null);
  };

  const closeEqModal = () => {
    setShowAddEqModal(false);
    setEditingEq(null);
  };

  const handleOpenAddPrac = () => {
    setPracName('');
    setPracRole('أخصائي مكافحة عدوى');
    setPracLicense('');
    setPracHospId(defaultHospitalId);
    setPracEmail('');
    setPracPhone('');
    setShowAddPracModal(true);
  };

  const handleOpenEditPrac = (p: PractitionerDTO) => {
    setEditingPrac(p);
    setPracName(p.name);
    setPracRole(p.role);
    setPracLicense(p.licenseNumber ?? '');
    setPracHospId(p.hospitalId);
    setPracEmail(p.email ?? '');
    setPracPhone(p.phone ?? '');
  };

  const handleSavePrac = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      hospitalId: isCentral ? pracHospId : defaultHospitalId,
      name: pracName,
      role: pracRole,
      licenseNumber: pracLicense,
      email: pracEmail,
      phone: pracPhone,
    };
    const target = editingPrac;
    run(() => (target ? updatePractitioner(target.id, payload) : createPractitioner(payload)), closePracModal);
  };

  const handleOpenAddEq = () => {
    setEqName('');
    setEqType('جهاز تعقيم بخاري');
    setEqSerial('');
    setEqHospId(defaultHospitalId);
    setEqStatus(EQUIPMENT_STATUSES[0]);
    setEqMaint(todayInputValue());
    setShowAddEqModal(true);
  };

  const handleOpenEditEq = (eq: EquipmentDTO) => {
    setEditingEq(eq);
    setEqName(eq.name);
    setEqType(eq.type);
    setEqSerial(eq.serialNumber ?? '');
    setEqHospId(eq.hospitalId);
    setEqStatus(eq.status ?? EQUIPMENT_STATUSES[0]);
    setEqMaint(eq.lastMaintenance?.slice(0, 10) ?? '');
  };

  const handleSaveEq = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      hospitalId: isCentral ? eqHospId : defaultHospitalId,
      name: eqName,
      type: eqType,
      serialNumber: eqSerial,
      status: eqStatus,
      lastMaintenance: eqMaint || null,
    };
    const target = editingEq;
    run(() => (target ? updateEquipment(target.id, payload) : createEquipment(payload)), closeEqModal);
  };

  const practitionerActions: RowAction<PractitionerDTO>[] = [
    { label: 'تعديل بيانات الممارس', icon: Edit2, onSelect: handleOpenEditPrac },
  ];
  const equipmentActions: RowAction<EquipmentDTO>[] = [
    { label: 'تعديل بيانات الجهاز', icon: Edit2, onSelect: handleOpenEditEq },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>المنشآت والأصول</span>
            <span>/</span>
            <span className="text-navy-700 font-medium">الممارسون والأجهزة</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            قاعدة بيانات الكوادر والأجهزة الطبية
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-navy-50 text-navy-700 font-bold border border-navy-200">
              سجل معتمد
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            حصر وتوثيق ممارسي مكافحة العدوى، أرقام التراخيص، وأجهزة التعقيم والسلامة مع ربط الحضور بالتدريبات المعتمدة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'practitioners' ? (
            <button
              onClick={handleOpenAddPrac}
              disabled={hospitals.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-navy-800 hover:bg-navy-900 text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة ممارس صحي</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddEq}
              disabled={hospitals.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-navy-800 hover:bg-navy-900 text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة جهاز / معدة</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('practitioners')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'practitioners' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users2 className="w-4 h-4 text-navy-700" />
            <span>الممارسون الصحيون ({practitioners.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('equipments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'equipments' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4 text-navy-700" />
            <span>أجهزة ومعدات مكافحة العدوى ({equipments.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isCentral && (
            <select
              value={filterHospital}
              onChange={(e) => setFilterHospital(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="">كافة المستشفيات</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {activeTab === 'practitioners' ? (
        <DataTable
          // Both sub-sections render a DataTable at the same position, so without distinct keys React
          // reuses one instance and its search/sort/page state leaks between the tabs (FR-020).
          key="practitioners"
          rows={scopedPractitioners}
          columns={practitionerColumns}
          rowKey={(p) => p.id}
          actions={practitionerActions}
          searchPlaceholder="بحث بالاسم، المسمى، رقم الترخيص..."
          emptyMessage="لا يوجد ممارسون مسجلون بعد"
          noMatchMessage="لا يوجد ممارسون مطابقون للبحث"
          caption="سجل الممارسين الصحيين"
        />
      ) : (
        <DataTable
          key="equipment"
          rows={scopedEquipments}
          columns={equipmentColumns}
          rowKey={(e) => e.id}
          actions={equipmentActions}
          searchPlaceholder="بحث بالاسم، النوع، الرقم التسلسلي..."
          emptyMessage="لا توجد أجهزة مسجلة بعد"
          noMatchMessage="لا توجد أجهزة مطابقة للبحث"
          caption="سجل الأجهزة والمعدات"
        />
      )}

      {(showAddPracModal || editingPrac) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white">
                {editingPrac ? 'تعديل بيانات الممارس الصحي' : 'إضافة ممارس صحي جديد'}
              </h3>
              <button onClick={closePracModal} className="text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrac} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الممارس الكامل</label>
                <input
                  type="text"
                  required
                  placeholder="اسم الممارس"
                  value={pracName}
                  onChange={(e) => setPracName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المسمى الوظيفي</label>
                  <input
                    type="text"
                    required
                    placeholder="أخصائي مكافحة عدوى"
                    value={pracRole}
                    onChange={(e) => setPracRole(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم رخصة الهيئة</label>
                  <input
                    type="text"
                    required
                    placeholder="SCFHS-XXXXXX"
                    value={pracLicense}
                    onChange={(e) => setPracLicense(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المستشفى التابع له</label>
                <select
                  value={isCentral ? pracHospId : defaultHospitalId}
                  onChange={(e) => setPracHospId(e.target.value)}
                  disabled={!isCentral}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                {!isCentral && (
                  <span className="text-[10px] text-navy-700 mt-1 block">
                    محدد تلقائياً وفقاً للمستشفى التابع لحسابك كمنسق
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="البريد الإلكتروني للممارس"
                    value={pracEmail}
                    onChange={(e) => setPracEmail(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الجوال</label>
                  <input
                    type="tel"
                    placeholder="05xxxxxxxx"
                    value={pracPhone}
                    onChange={(e) => setPracPhone(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={closePracModal} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg">
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  {editingPrac ? 'حفظ التعديلات' : 'إضافة الممارس'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(showAddEqModal || editingEq) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white">
                {editingEq ? 'تعديل بيانات الجهاز' : 'إضافة جهاز جديد لمكافحة العدوى'}
              </h3>
              <button onClick={closeEqModal} className="text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEq} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الجهاز / المعدة</label>
                <input
                  type="text"
                  required
                  placeholder="جهاز تعقيم أوتوكلاف بخاري سعة 200 لتر"
                  value={eqName}
                  onChange={(e) => setEqName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع الجهاز</label>
                  <input
                    type="text"
                    required
                    placeholder="جهاز تعقيم / فلترة هواء"
                    value={eqType}
                    onChange={(e) => setEqType(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الرقم التسلسلي (SN)</label>
                  <input
                    type="text"
                    required
                    placeholder="SN-XXXX"
                    value={eqSerial}
                    onChange={(e) => setEqSerial(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المستشفى التابع له</label>
                <select
                  value={isCentral ? eqHospId : defaultHospitalId}
                  onChange={(e) => setEqHospId(e.target.value)}
                  disabled={!isCentral}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                {!isCentral && (
                  <span className="text-[10px] text-navy-700 mt-1 block">
                    محدد تلقائياً وفقاً للمستشفى التابع لحسابك كمنسق
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الحالة التشغيلية</label>
                  <select
                    value={eqStatus}
                    onChange={(e) => setEqStatus(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  >
                    {EQUIPMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ آخر صيانة</label>
                  <input
                    type="date"
                    value={eqMaint}
                    onChange={(e) => setEqMaint(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={closeEqModal} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg">
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  {editingEq ? 'حفظ التعديلات' : 'إضافة الجهاز'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
