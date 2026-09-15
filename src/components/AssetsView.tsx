import React, { useState } from 'react';
import {
  Users2,
  Wrench,
  Plus,
  Edit2,
  Search,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import { Practitioner, Equipment, Hospital, User } from '../types/ipc';

interface AssetsViewProps {
  currentUser: User;
  practitioners: Practitioner[];
  equipments: Equipment[];
  hospitals: Hospital[];
  onAddPractitioner: (data: Omit<Practitioner, 'id' | 'createdAt'>) => void;
  onUpdatePractitioner: (id: string, data: Partial<Practitioner>) => void;
  onAddEquipment: (data: Omit<Equipment, 'id' | 'createdAt'>) => void;
  onUpdateEquipment: (id: string, data: Partial<Equipment>) => void;
}

export const AssetsView: React.FC<AssetsViewProps> = ({
  currentUser,
  practitioners,
  equipments,
  hospitals,
  onAddPractitioner,
  onUpdatePractitioner,
  onAddEquipment,
  onUpdateEquipment,
}) => {
  const isCentral = currentUser.role === 'central' || currentUser.isDevAdmin;
  const [activeTab, setActiveTab] = useState<'practitioners' | 'equipments'>('practitioners');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHospital, setFilterHospital] = useState('');

  // Modals
  const [showAddPracModal, setShowAddPracModal] = useState(false);
  const [editingPrac, setEditingPrac] = useState<Practitioner | null>(null);
  const [showAddEqModal, setShowAddEqModal] = useState(false);
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);

  // Practitioner Form State
  const [pracName, setPracName] = useState('');
  const [pracRole, setPracRole] = useState('أخصائي مكافحة عدوى');
  const [pracLicense, setPracLicense] = useState('');
  const [pracHospId, setPracHospId] = useState(currentUser.hospitalId || hospitals[0]?.id || '');
  const [pracEmail, setPracEmail] = useState('');
  const [pracPhone, setPracPhone] = useState('');

  // Equipment Form State
  const [eqName, setEqName] = useState('');
  const [eqType, setEqType] = useState('جهاز تعقيم بخاري');
  const [eqSerial, setEqSerial] = useState('');
  const [eqHospId, setEqHospId] = useState(currentUser.hospitalId || hospitals[0]?.id || '');
  const [eqStatus, setEqStatus] = useState('يعمل بكفاءة');
  const [eqMaint, setEqMaint] = useState(new Date().toISOString().slice(0, 10));

  // Filtered lists - strictly isolated
  const filteredPractitioners = practitioners.filter((p) => {
    if (!isCentral && p.hospitalId !== currentUser.hospitalId) return false;
    if (isCentral && filterHospital && p.hospitalId !== filterHospital) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.licenseNumber.toLowerCase().includes(q) ||
        (p.hospitalName && p.hospitalName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredEquipments = equipments.filter((e) => {
    if (!isCentral && e.hospitalId !== currentUser.hospitalId) return false;
    if (isCentral && filterHospital && e.hospitalId !== filterHospital) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        e.serialNumber.toLowerCase().includes(q) ||
        (e.hospitalName && e.hospitalName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Handlers
  const handleOpenAddPrac = () => {
    setPracName('');
    setPracRole('أخصائي مكافحة عدوى');
    setPracLicense('');
    setPracHospId(currentUser.hospitalId || hospitals[0]?.id || '');
    setPracEmail('');
    setPracPhone('');
    setShowAddPracModal(true);
  };

  const handleOpenEditPrac = (p: Practitioner) => {
    setEditingPrac(p);
    setPracName(p.name);
    setPracRole(p.role);
    setPracLicense(p.licenseNumber);
    setPracHospId(isCentral ? p.hospitalId : (currentUser.hospitalId || p.hospitalId));
    setPracEmail(p.email || '');
    setPracPhone(p.phone || '');
  };

  const handleSavePrac = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pracName.trim() || !pracLicense.trim()) return;
    const targetHospId = isCentral ? pracHospId : (currentUser.hospitalId || pracHospId);
    if (editingPrac) {
      onUpdatePractitioner(editingPrac.id, {
        name: pracName.trim(),
        role: pracRole.trim(),
        licenseNumber: pracLicense.trim(),
        hospitalId: targetHospId,
        email: pracEmail.trim(),
        phone: pracPhone.trim(),
      });
      setEditingPrac(null);
    } else {
      onAddPractitioner({
        name: pracName.trim(),
        role: pracRole.trim(),
        licenseNumber: pracLicense.trim(),
        hospitalId: targetHospId,
        email: pracEmail.trim(),
        phone: pracPhone.trim(),
      });
      setShowAddPracModal(false);
    }
  };

  const handleOpenAddEq = () => {
    setEqName('');
    setEqType('جهاز تعقيم بخاري');
    setEqSerial('');
    setEqHospId(currentUser.hospitalId || hospitals[0]?.id || '');
    setEqStatus('يعمل بكفاءة');
    setEqMaint(new Date().toISOString().slice(0, 10));
    setShowAddEqModal(true);
  };

  const handleOpenEditEq = (eq: Equipment) => {
    setEditingEq(eq);
    setEqName(eq.name);
    setEqType(eq.type);
    setEqSerial(eq.serialNumber);
    setEqHospId(isCentral ? eq.hospitalId : (currentUser.hospitalId || eq.hospitalId));
    setEqStatus(eq.status);
    setEqMaint(eq.lastMaintenance?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  };

  const handleSaveEq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqName.trim() || !eqSerial.trim()) return;
    const targetHospId = isCentral ? eqHospId : (currentUser.hospitalId || eqHospId);
    if (editingEq) {
      onUpdateEquipment(editingEq.id, {
        name: eqName.trim(),
        type: eqType.trim(),
        serialNumber: eqSerial.trim(),
        hospitalId: targetHospId,
        status: eqStatus.trim(),
        lastMaintenance: new Date(eqMaint).toISOString(),
      });
      setEditingEq(null);
    } else {
      onAddEquipment({
        name: eqName.trim(),
        type: eqType.trim(),
        serialNumber: eqSerial.trim(),
        hospitalId: targetHospId,
        status: eqStatus.trim(),
        lastMaintenance: new Date(eqMaint).toISOString(),
      });
      setShowAddEqModal(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>المنشآت والأصول</span>
            <span>/</span>
            <span className="text-teal-700 font-medium">الممارسون والأجهزة</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            قاعدة بيانات الكوادر والأجهزة الطبية
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
              سجل معتمد
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            حصر وتوثيق ممارسي مكافحة العدوى، أرقام التراخيص، وأجهزة التعقيم والسلامة مع ربط الحضور بالتدريبات المعتمدة.
          </p>
        </div>

        {/* Add Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'practitioners' ? (
            <button
              onClick={handleOpenAddPrac}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة ممارس صحي</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddEq}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة جهاز / معدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('practitioners')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'practitioners'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users2 className="w-4 h-4 text-teal-600" />
            <span>الممارسون الصحيون ({practitioners.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('equipments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeTab === 'equipments'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4 text-indigo-600" />
            <span>أجهزة ومعدات مكافحة العدوى ({equipments.length})</span>
          </button>
        </div>

        {/* Search & Hospital Filter */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="بحث بالاسم، الترخيص، الرقم التسلسلي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white w-56"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
          </div>

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

      {/* Content Area */}
      {activeTab === 'practitioners' ? (
        /* Practitioners Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPractitioners.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              لا يوجد ممارسون مطابقون للبحث
            </div>
          ) : (
            filteredPractitioners.map((prac) => (
              <div
                key={prac.id}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                      {prac.name.slice(0, 1)}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 leading-tight">{prac.name}</h4>
                      <p className="text-[11px] text-teal-700 font-medium mt-0.5">{prac.role}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEditPrac(prac)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    title="تعديل بيانات الممارس"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>رقم رخصة الهيئة (SCFHS):</span>
                    <strong className="font-mono text-slate-800">{prac.licenseNumber}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>المنشأة التابع لها:</span>
                    <strong className="text-slate-800 truncate max-w-[140px]">{prac.hospitalName}</strong>
                  </div>
                  {prac.email && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>البريد:</span>
                      <span className="font-mono text-slate-500 text-[10px] truncate max-w-[140px]">{prac.email}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    متاح للربط بالتدريبات المعتمدة
                  </span>
                  <span>معتمد</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Equipments Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipments.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              لا توجد أجهزة مطابقة للبحث
            </div>
          ) : (
            filteredEquipments.map((eq) => (
              <div
                key={eq.id}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 leading-tight">{eq.name}</h4>
                      <p className="text-[11px] text-indigo-700 font-medium mt-0.5">{eq.type}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEditEq(eq)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    title="تعديل بيانات الجهاز"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>الرقم التسلسلي (SN):</span>
                    <strong className="font-mono text-slate-800">{eq.serialNumber}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>المنشأة:</span>
                    <strong className="text-slate-800 truncate max-w-[140px]">{eq.hospitalName}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>آخر صيانة وقائية:</span>
                    <strong className="text-slate-800">
                      {eq.lastMaintenance
                        ? new Date(eq.lastMaintenance).toLocaleDateString('ar-SA')
                        : 'غير محدد'}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {eq.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">معايرة سارية</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Add/Edit Practitioner (FR-24) */}
      {(showAddPracModal || editingPrac) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white">
                {editingPrac ? 'تعديل بيانات الممارس الصحي' : 'إضافة ممارس صحي جديد'}
              </h3>
              <button
                onClick={() => {
                  setShowAddPracModal(false);
                  setEditingPrac(null);
                }}
                className="text-slate-400 hover:text-white"
              >
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
                    placeholder="SCFHS-994821"
                    value={pracLicense}
                    onChange={(e) => setPracLicense(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المستشفى التابع له</label>
                <select
                  value={pracHospId}
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
                  <span className="text-[10px] text-teal-700 mt-1 block">
                    محدد تلقائياً وفقاً للمستشفى التابع لحسابك كمنسق
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="doctor@hospital.med.sa"
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
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPracModal(false);
                    setEditingPrac(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  {editingPrac ? 'حفظ التعديلات' : 'إضافة الممارس'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Equipment (FR-25) */}
      {(showAddEqModal || editingEq) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white">
                {editingEq ? 'تعديل بيانات الجهاز' : 'إضافة جهاز جديد لمكافحة العدوى'}
              </h3>
              <button
                onClick={() => {
                  setShowAddEqModal(false);
                  setEditingEq(null);
                }}
                className="text-slate-400 hover:text-white"
              >
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
                    placeholder="SN-8829-AUT"
                    value={eqSerial}
                    onChange={(e) => setEqSerial(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المستشفى التابع له</label>
                <select
                  value={eqHospId}
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
                  <span className="text-[10px] text-teal-700 mt-1 block">
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
                    <option value="يعمل بكفاءة">يعمل بكفاءة</option>
                    <option value="بحاجة لصيانة">بحاجة لصيانة</option>
                    <option value="خارج الخدمة مؤقتاً">خارج الخدمة مؤقتاً</option>
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
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEqModal(false);
                    setEditingEq(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
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
};
