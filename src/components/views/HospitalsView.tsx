'use client';

import { useState } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Power,
  Search,
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
  const { run, isPending } = useActionRunner();

  const [activeSubTab, setActiveSubTab] = useState<'hospitals' | 'coordinators'>('hospitals');
  const [searchTerm, setSearchTerm] = useState('');
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

  const term = searchTerm.trim();
  const filteredHospitals = hospitals.filter(
    (h) =>
      !term ||
      h.name.includes(term) ||
      h.location.includes(term) ||
      (h.coordinator?.name.includes(term) ?? false) ||
      (h.coordinator?.email.includes(term) ?? false),
  );

  const coordinatorsCount = hospitals.filter((h) => h.coordinator).length;

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      {!selectedHospitalForProfile ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span>المنشآت والأصول</span>
                <span>/</span>
                <span className="text-teal-700 font-medium">إدارة المستشفيات ومنسقي مكافحة العدوى</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                مستشفيات التجمع ومنسقو مكافحة العدوى
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
                  {hospitals.length} منشأة
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة المنشآت الصحية، تعيين حسابات منسقي المستشفيات وتفويض الصلاحيات، ومتابعة البروفايل الشامل
              </p>
            </div>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
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
                    ? 'border-teal-600 text-teal-700'
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
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>حسابات منسقي المستشفيات ({coordinatorsCount})</span>
              </button>
            </div>

            <div className="relative my-2 w-64">
              <input
                type="text"
                placeholder="بحث بالاسم، الموقع، أو المنسق..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
            </div>
          </div>

          {activeSubTab === 'hospitals' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredHospitals.length === 0 && (
                <div className="col-span-full bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                  لا توجد مستشفيات مسجلة مطابقة
                </div>
              )}
              {filteredHospitals.map((hospital) => {
                const hVisits = visits.filter((v) => v.hospitalId === hospital.id);
                const hTrainings = trainings.filter((t) => t.hospitalId === hospital.id);
                const hPractitioners = practitioners.filter((p) => p.hospitalId === hospital.id);
                const hEquipments = equipments.filter((e) => e.hospitalId === hospital.id);

                return (
                  <div
                    key={hospital.id}
                    className={`bg-white rounded-xl border transition-all hover:shadow-md ${
                      hospital.isActive ? 'border-slate-200' : 'border-rose-200 bg-rose-50/20'
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 leading-tight">{hospital.name}</h3>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                {hospital.type}
                              </span>
                              <span className="flex items-center gap-1 text-slate-400">
                                <MapPin className="w-3 h-3" />
                                {hospital.location}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => run(() => toggleHospitalStatus(hospital.id))}
                            disabled={isPending}
                            className={`p-1.5 rounded-lg border text-xs transition-colors disabled:opacity-60 ${
                              hospital.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                            title={hospital.isActive ? 'تعطيل المستشفى مؤقتاً' : 'تفعيل المستشفى'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(hospital)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="تعديل بيانات المستشفى"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 text-xs border border-slate-100 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <UserCheck className="w-4 h-4 text-teal-600 shrink-0" />
                            <span>المنسق: {hospital.coordinator?.name ?? 'لم يتم التعيين بعد'}</span>
                          </div>
                        </div>
                        {hospital.coordinator && (
                          <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-1 mr-6">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-mono text-[11px]" dir="ltr">
                              {hospital.coordinator.email}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center text-xs pt-3 border-t border-slate-100">
                        <div className="bg-slate-50/80 rounded-lg p-2">
                          <span className="block text-[10px] text-slate-400">الزيارات</span>
                          <span className="font-bold text-slate-800 font-mono text-sm">{hVisits.length}</span>
                        </div>
                        <div className="bg-slate-50/80 rounded-lg p-2">
                          <span className="block text-[10px] text-slate-400">التدريبات</span>
                          <span className="font-bold text-slate-800 font-mono text-sm">{hTrainings.length}</span>
                        </div>
                        <div className="bg-slate-50/80 rounded-lg p-2">
                          <span className="block text-[10px] text-slate-400">الممارسون</span>
                          <span className="font-bold text-slate-800 font-mono text-sm">{hPractitioners.length}</span>
                        </div>
                        <div className="bg-slate-50/80 rounded-lg p-2">
                          <span className="block text-[10px] text-slate-400">الأجهزة</span>
                          <span className="font-bold text-slate-800 font-mono text-sm">{hEquipments.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                      <span className={`text-[11px] font-bold ${hospital.isActive ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {hospital.isActive ? 'مفعل ويعمل بكفاءة' : 'معطل مؤقتاً'}
                      </span>

                      <button
                        onClick={() => setSelectedHospitalId(hospital.id)}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                      >
                        <span>البروفايل الشامل</span>
                        <Sparkles className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeSubTab === 'coordinators' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-teal-600" />
                    سجل حسابات منسقي مكافحة العدوى بمستشفيات التجمع
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    إدارة منسقي المنشآت الصحية وضبط بيانات الدخول وإعادة تعيين كلمات المرور
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                    {coordinatorsCount} منسق مسجل
                  </span>
                  <button
                    onClick={() => handleOpenAddCoordinator()}
                    disabled={hospitalsWithoutCoordinator.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة منسق مستشفى جديد</span>
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredHospitals.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">لا توجد مستشفيات مسجلة مطابقة</div>
                )}
                {filteredHospitals.map((hospital) => {
                  const coordinator = hospital.coordinator;
                  return (
                    <div
                      key={hospital.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0">
                          {coordinator ? coordinator.name.charAt(0) : 'م'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">
                              {coordinator?.name ?? 'لم يتم التعيين بعد'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                              {hospital.name}
                            </span>
                            {coordinator && (
                              <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-medium flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                كلمة المرور مفعلة
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 flex-wrap">
                            <span className="font-mono text-[11px] text-slate-600 flex items-center gap-1" dir="ltr">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {coordinator?.email ?? 'لا يوجد بريد'}
                            </span>
                            {coordinator && (
                              <button
                                onClick={() => handleCopyEmail(coordinator.email)}
                                className="text-slate-400 hover:text-teal-600"
                                title="نسخ البريد"
                              >
                                {copiedEmail === coordinator.email ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                            <span className="text-slate-300">|</span>
                            <span className="text-[10px] text-slate-500">
                              صلاحية الوصول: شاشات مستشفى {hospital.name} فقط
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {coordinator ? (
                          <button
                            onClick={() => handleOpenEditCoordinator(hospital)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                            title="تعديل بيانات وحساب المنسق وكلمة المرور"
                          >
                            <Key className="w-3 h-3 text-teal-600" />
                            <span>بيانات الدخول وكلمة المرور</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenAddCoordinator(hospital.id)}
                            className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <UserPlus className="w-3 h-3 text-teal-600" />
                            <span>تعيين منسق</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEdit(hospital)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>المستشفى</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-300 hover:text-white"
                title="العودة للقائمة"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  البروفايل الشامل للمستشفى - {selectedHospitalForProfile.name}
                </h3>
                <p className="text-xs text-slate-400">
                  تجميع بيانات المستشفى الموحدة (الكوادر، الأجهزة، التدريبات، والزيارات الرقابية)
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">نوع المنشأة</span>
                <strong className="font-bold text-slate-800">{selectedHospitalForProfile.type}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">الموقع الجغرافي</span>
                <strong className="font-bold text-slate-800">{selectedHospitalForProfile.location}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">منسق مكافحة العدوى</span>
                <strong className="font-bold text-slate-800">
                  {selectedHospitalForProfile.coordinator?.name ?? 'لم يتم التعيين بعد'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">البريد الرسمي</span>
                <strong className="font-bold text-slate-800 font-mono text-[11px]" dir="ltr">
                  {selectedHospitalForProfile.coordinator?.email ?? '—'}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-3 font-bold text-xs text-slate-800">
                  <Users className="w-4 h-4 text-teal-600" />
                  <span>فريق مكافحة العدوى والممارسين المعتمدين</span>
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {practitioners.filter((p) => p.hospitalId === selectedHospitalForProfile.id).length === 0 ? (
                    <p className="text-slate-400 text-center py-4 text-xs">لا يوجد ممارسون مسجلون حالياً</p>
                  ) : (
                    practitioners
                      .filter((p) => p.hospitalId === selectedHospitalForProfile.id)
                      .map((prac) => (
                        <div key={prac.id} className="p-2.5 bg-slate-50 rounded-lg text-xs flex justify-between">
                          <div>
                            <strong className="block text-slate-800">{prac.name}</strong>
                            <span className="text-[11px] text-slate-500">{prac.role}</span>
                          </div>
                          <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-mono">
                            {prac.licenseNumber ?? '—'}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-3 font-bold text-xs text-slate-800">
                  <Wrench className="w-4 h-4 text-teal-600" />
                  <span>أجهزة ومعدات التعقيم والفحص المعتمدة</span>
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {equipments.filter((e) => e.hospitalId === selectedHospitalForProfile.id).length === 0 ? (
                    <p className="text-slate-400 text-center py-4 text-xs">لا توجد معدات مسجلة حالياً</p>
                  ) : (
                    equipments
                      .filter((e) => e.hospitalId === selectedHospitalForProfile.id)
                      .map((eq) => (
                        <div key={eq.id} className="p-2.5 bg-slate-50 rounded-lg text-xs flex justify-between">
                          <div>
                            <strong className="block text-slate-800">{eq.name}</strong>
                            <span className="text-[11px] text-slate-500">{eq.type}</span>
                          </div>
                          {eq.status && (
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                              {eq.status}
                            </span>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-3 font-bold text-xs text-slate-800">
                  <ClipboardList className="w-4 h-4 text-teal-600" />
                  <span>سجل الزيارات الرقابية</span>
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {visits.filter((v) => v.hospitalId === selectedHospitalForProfile.id).length === 0 ? (
                    <p className="text-slate-400 text-center py-4 text-xs">لا توجد زيارات رقابية مسجلة</p>
                  ) : (
                    visits
                      .filter((v) => v.hospitalId === selectedHospitalForProfile.id)
                      .map((vis) => (
                        <div key={vis.id} className="p-2.5 bg-slate-50 rounded-lg text-xs flex justify-between items-center">
                          <div>
                            <strong className="block text-slate-800">{formatDate(vis.visitDate)}</strong>
                            <span className="text-[11px] text-slate-500">الفريق الزائر: {vis.team}</span>
                          </div>
                          <span className="text-xs font-bold text-teal-700 font-mono">
                            {vis.status === 'completed'
                              ? vis.complianceScore !== null
                                ? `${vis.complianceScore}%`
                                : '—'
                              : 'قيد المتابعة'}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-3 font-bold text-xs text-slate-800">
                  <GraduationCap className="w-4 h-4 text-teal-600" />
                  <span>البرامج والمسارات التدريبية</span>
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {trainings.filter((t) => t.hospitalId === selectedHospitalForProfile.id).length === 0 ? (
                    <p className="text-slate-400 text-center py-4 text-xs">لا توجد برامج تدريبية مسجلة</p>
                  ) : (
                    trainings
                      .filter((t) => t.hospitalId === selectedHospitalForProfile.id)
                      .map((trn) => (
                        <div key={trn.id} className="p-2.5 bg-slate-50 rounded-lg text-xs flex justify-between items-center">
                          <div>
                            <strong className="block text-slate-800">{trn.title}</strong>
                            <span className="text-[11px] text-slate-500">
                              {trn.isInternal ? 'تدريب داخلي' : `استحقاق: ${formatDate(trn.dueDate)}`}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              trn.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : trn.status === 'late'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {trn.status === 'completed' ? 'مكتمل' : trn.status === 'late' ? 'متأخر' : 'معلق'}
                          </span>
                        </div>
                      ))
                  )}
                </div>
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
                <Building2 className="w-4 h-4 text-teal-400" />
                إضافة مستشفى جديد إلى التجمع
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
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
                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-60"
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
            <div className="flex items-center justify-between px-6 py-4 bg-teal-800 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-teal-300" />
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
                <p className="text-[11px] text-teal-700 mt-1">
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
                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-60"
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
                <Key className="w-4 h-4 text-teal-400" />
                بيانات حساب المنسق وتعيين كلمة المرور
              </h3>
              <button onClick={() => setEditingCoordinator(null)} className="text-slate-400 hover:text-white">
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
                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-60"
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
                <Edit2 className="w-4 h-4 text-teal-400" />
                تعديل بيانات المستشفى والمنسق
              </h3>
              <button onClick={() => setEditingHospital(null)} className="text-slate-400 hover:text-white">
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-60"
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
