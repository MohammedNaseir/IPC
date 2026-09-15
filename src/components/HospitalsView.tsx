import React, { useState } from 'react';
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
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  LogIn,
  Copy,
  Check,
  ArrowLeft,
  Calendar,
  Layers,
  Lock,
  Key,
  Eye,
  EyeOff,
  UserPlus,
} from 'lucide-react';
import { Hospital, User, Visit, Training, Practitioner, Equipment } from '../types/ipc';

interface HospitalsViewProps {
  currentUser: User;
  hospitals: Hospital[];
  visits: Visit[];
  trainings: Training[];
  practitioners: Practitioner[];
  equipments: Equipment[];
  onCreateHospital: (data: Omit<Hospital, 'id' | 'createdAt'> & { coordinatorPassword?: string }) => void;
  onUpdateHospital: (id: string, data: Partial<Hospital>) => void;
  onToggleHospitalStatus: (id: string) => void;
  onAddCoordinator?: (data: { name: string; email: string; password?: string; hospitalId: string; phone?: string }) => void;
  onUpdateCoordinator?: (userId: string, data: { name?: string; email?: string; password?: string; phone?: string; hospitalId?: string }) => void;
  onResetCoordinatorPassword?: (userId: string, newPassword: string) => void;
  onSwitchUser?: (user: User) => void;
  availableUsers?: User[];
  setActiveTab?: (tab: any) => void;
}

export const HospitalsView: React.FC<HospitalsViewProps> = ({
  currentUser,
  hospitals,
  visits,
  trainings,
  practitioners,
  equipments,
  onCreateHospital,
  onUpdateHospital,
  onToggleHospitalStatus,
  onAddCoordinator,
  onUpdateCoordinator,
  onResetCoordinatorPassword,
  onSwitchUser,
  availableUsers = [],
  setActiveTab,
}) => {
  const isCentral = currentUser.role === 'central' || currentUser.isDevAdmin;

  // Tabs for central admin: 'hospitals' | 'coordinators'
  const [activeSubTab, setActiveSubTab] = useState<'hospitals' | 'coordinators'>('hospitals');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHospitalForProfile, setSelectedHospitalForProfile] = useState<Hospital | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);

  // Add Coordinator modal & state
  const [showAddCoordinatorModal, setShowAddCoordinatorModal] = useState(false);
  const [coordFormName, setCoordFormName] = useState('');
  const [coordFormEmail, setCoordFormEmail] = useState('');
  const [coordFormPassword, setCoordFormPassword] = useState('123456');
  const [coordFormHospitalId, setCoordFormHospitalId] = useState('');
  const [coordFormPhone, setCoordFormPhone] = useState('');

  // Edit / Password management state
  const [editingCoordinatorUser, setEditingCoordinatorUser] = useState<User | null>(null);
  const [editCoordPassword, setEditCoordPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Form states (Hospital)
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formType, setFormType] = useState('عام');
  const [formCoordName, setFormCoordName] = useState('');
  const [formCoordEmail, setFormCoordEmail] = useState('');
  const [formCoordPassword, setFormCoordPassword] = useState('123456');

  // Copy feedback state
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Find coordinator's hospital if user is hospital role
  const coordinatorHospital =
    hospitals.find((h) => h.id === currentUser.hospitalId) ||
    hospitals[0] ||
    null;

  const handleOpenAdd = () => {
    setFormName('');
    setFormLocation('');
    setFormType('مرجعي تخصصي');
    setFormCoordName('');
    setFormCoordEmail('');
    setFormCoordPassword('123456');
    setShowAddModal(true);
  };

  const handleOpenEdit = (h: Hospital) => {
    setEditingHospital(h);
    setFormName(h.name);
    setFormLocation(h.location);
    setFormType(h.type);
    setFormCoordName(h.coordinatorName);
    setFormCoordEmail(h.coordinatorEmail);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    onCreateHospital({
      name: formName.trim(),
      location: formLocation.trim() || 'المنطقة الإدارية',
      type: formType,
      coordinatorName: formCoordName.trim(),
      coordinatorEmail: formCoordEmail.trim(),
      coordinatorPassword: formCoordPassword.trim() || '123456',
      isActive: true,
    });
    setShowAddModal(false);
  };

  const handleOpenAddCoordinator = () => {
    setCoordFormName('');
    setCoordFormEmail('');
    setCoordFormPassword('123456');
    setCoordFormHospitalId(hospitals[0]?.id || '');
    setCoordFormPhone('');
    setShowAddCoordinatorModal(true);
  };

  const handleSaveCoordinator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordFormName.trim() || !coordFormEmail.trim() || !coordFormHospitalId) return;
    if (onAddCoordinator) {
      onAddCoordinator({
        name: coordFormName.trim(),
        email: coordFormEmail.trim(),
        password: coordFormPassword.trim() || '123456',
        hospitalId: coordFormHospitalId,
        phone: coordFormPhone.trim(),
      });
    }
    setShowAddCoordinatorModal(false);
  };

  const handleOpenEditCoordinator = (coordUser: User) => {
    setEditingCoordinatorUser(coordUser);
    setEditCoordPassword(coordUser.password || '123456');
    setShowPasswordText(false);
  };

  const handleSaveEditCoordinator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoordinatorUser) return;
    if (onUpdateCoordinator) {
      onUpdateCoordinator(editingCoordinatorUser.id, {
        name: editingCoordinatorUser.name,
        email: editingCoordinatorUser.email,
        password: editCoordPassword ? editCoordPassword.trim() : (editingCoordinatorUser.password || '123456'),
        phone: editingCoordinatorUser.phone,
        hospitalId: editingCoordinatorUser.hospitalId,
      });
    }
    setEditingCoordinatorUser(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHospital || !formName.trim()) return;
    onUpdateHospital(editingHospital.id, {
      name: formName.trim(),
      location: formLocation.trim(),
      type: formType,
      coordinatorName: formCoordName.trim(),
      coordinatorEmail: formCoordEmail.trim(),
    });
    setEditingHospital(null);
  };

  // -------------------------------------------------------------
  // VIEW A: HOSPITAL COORDINATOR DEDICATED VIEW
  // -------------------------------------------------------------
  if (!isCentral && coordinatorHospital) {
    const hVisits = visits.filter((v) => v.hospitalId === coordinatorHospital.id);
    const hTrainings = trainings.filter((t) => t.hospitalId === coordinatorHospital.id);
    const hPractitioners = practitioners.filter((p) => p.hospitalId === coordinatorHospital.id);
    const hEquipments = equipments.filter((e) => e.hospitalId === coordinatorHospital.id);

    return (
      <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
        {/* Header */}
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
                <span>{coordinatorHospital.name}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                  منشأة معتمدة ونشطة
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                لوحة تحكم منسق مكافحة العدوى والتعقيم - إدارة الكوادر والمعدات ومتابعة الزيارات والبرامج التدريبية لمنشأتك
              </p>
            </div>

            <button
              onClick={() => handleOpenEdit(coordinatorHospital)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              <Edit2 className="w-4 h-4 text-slate-500" />
              <span>تحديث بيانات الاتصال</span>
            </button>
          </div>
        </div>

        {/* Coordinator Account & Hospital Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Official Coordinator Identity */}
          <div className="bg-gradient-to-br from-teal-800 to-slate-900 text-white p-5 rounded-xl shadow-sm md:col-span-1">
            <div className="flex items-center gap-2 text-teal-300 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4" />
              <span>حساب منسق مكافحة العدوى المعتمد</span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">الاسم الكامل:</span>
                <p className="text-sm font-bold text-white mt-0.5">
                  {coordinatorHospital.coordinatorName || currentUser.name}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">البريد الإلكتروني الرسمي:</span>
                <p className="font-mono text-teal-200 text-[11px] mt-0.5" dir="ltr">
                  {coordinatorHospital.coordinatorEmail || currentUser.email}
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

          {/* Card 2: Hospital Specifications */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 md:col-span-2 flex flex-col justify-between">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">تصنيف المنشأة</span>
                <strong className="text-slate-800 font-bold block mt-1">{coordinatorHospital.type}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">الموقع الجغرافي</span>
                <strong className="text-slate-800 font-bold block mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  {coordinatorHospital.location}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">تاريخ التسجيل بالنظام</span>
                <strong className="text-slate-800 font-bold block mt-1">
                  {new Date(coordinatorHospital.createdAt).toLocaleDateString('ar-SA')}
                </strong>
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
              {setActiveTab && (
                <>
                  <button
                    onClick={() => setActiveTab('assets')}
                    className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition-colors"
                  >
                    + إضافة كادر / جهاز طبي
                  </button>
                  <button
                    onClick={() => setActiveTab('trainings')}
                    className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition-colors"
                  >
                    + رصد وتوثيق تدريب
                  </button>
                  <button
                    onClick={() => setActiveTab('visits')}
                    className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition-colors"
                  >
                    استعراض الزيارات الرقابية
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 4 Key Metric Cards for Coordinator's Hospital */}
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
            <span className="text-[10px] text-slate-400 mt-1 block">أجهزة تعقيم وغسيل وفحص نشطة</span>
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

        {/* Recent Visits & Staff Summary for this Hospital */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Visits */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-600" />
                الزيارات الرقابية الخاصة بالمستشفى
              </span>
              {setActiveTab && (
                <button
                  onClick={() => setActiveTab('visits')}
                  className="text-xs text-teal-700 font-bold hover:underline"
                >
                  عرض الكل
                </button>
              )}
            </h3>
            {hVisits.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">لا توجد زيارات رقابية مسجلة حالياً للمستشفى</p>
            ) : (
              <div className="space-y-2">
                {hVisits.slice(0, 4).map((v) => (
                  <div key={v.id} className="p-3 bg-slate-50 rounded-lg text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">{v.title}</span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(v.scheduledDate).toLocaleDateString('ar-SA')} • المفتش: {v.inspectorName}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {v.status === 'completed' ? `مكتملة (${v.complianceScore}%)` : 'قيد المتابعة'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trainings */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-teal-600" />
                البرامج التدريبية المخصصة للمستشفى
              </span>
              {setActiveTab && (
                <button
                  onClick={() => setActiveTab('trainings')}
                  className="text-xs text-teal-700 font-bold hover:underline"
                >
                  عرض الكل
                </button>
              )}
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
                        تاريخ الاستحقاق: {new Date(t.dueDate).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {t.status === 'completed' ? 'منفذ وموثق' : 'معلق ومستحق'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {editingHospital && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-teal-400" />
                  تحديث بيانات المنسق والمنشأة
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">منسق مكافحة العدوى</label>
                    <input
                      type="text"
                      required
                      value={formCoordName}
                      onChange={(e) => setFormCoordName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني الرسمي</label>
                    <input
                      type="email"
                      required
                      value={formCoordEmail}
                      onChange={(e) => setFormCoordEmail(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                </div>

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
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
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

  // -------------------------------------------------------------
  // VIEW B: CENTRAL ADMIN & DEV ADMIN VIEW
  // -------------------------------------------------------------
  const filteredHospitals = hospitals.filter(
    (h) =>
      h.name.includes(searchTerm) ||
      h.location.includes(searchTerm) ||
      (h.coordinatorName && h.coordinatorName.includes(searchTerm)) ||
      (h.coordinatorEmail && h.coordinatorEmail.includes(searchTerm))
  );

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      {/* Top Header */}
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

        {/* Add Hospital button */}
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مستشفى جديد</span>
        </button>
      </div>

      {/* Sub Tabs: Hospitals vs Coordinators Directory */}
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
            <span>حسابات منسقي المستشفيات ({hospitals.length})</span>
          </button>
        </div>

        {/* Search */}
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

      {/* TAB 1: HOSPITALS GRID */}
      {activeSubTab === 'hospitals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                        <h3 className="font-bold text-sm text-slate-900 leading-tight">
                          {hospital.name}
                        </h3>
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

                    {/* Enable/Disable Toggle and Edit */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onToggleHospitalStatus(hospital.id)}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
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

                  {/* Coordinator Info */}
                  <div className="bg-slate-50 rounded-lg p-3 text-xs border border-slate-100 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-700 font-medium">
                        <UserCheck className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>المنسق: {hospital.coordinatorName || 'لم يتم التعيين بعد'}</span>
                      </div>
                      {hospital.coordinatorEmail && onSwitchUser && (
                        <button
                          onClick={() => {
                            const coordUser = availableUsers.find(
                              (u) =>
                                u.hospitalId === hospital.id ||
                                u.email.toLowerCase() === hospital.coordinatorEmail.toLowerCase()
                            ) || {
                              id: `user-coord-${hospital.id}`,
                              email: hospital.coordinatorEmail,
                              name: hospital.coordinatorName || `منسق ${hospital.name}`,
                              role: 'hospital' as const,
                              hospitalId: hospital.id,
                              createdAt: hospital.createdAt,
                            };
                            onSwitchUser(coordUser);
                          }}
                          className="text-[11px] text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1"
                          title="الدخول فوراً بحساب منسق هذا المستشفى"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>دخول كمنسق</span>
                        </button>
                      )}
                    </div>
                    {hospital.coordinatorEmail && (
                      <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-1 mr-6">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px]" dir="ltr">{hospital.coordinatorEmail}</span>
                      </div>
                    )}
                  </div>

                  {/* Micro Stats */}
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

                {/* View Comprehensive Profile */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold ${
                      hospital.isActive ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {hospital.isActive ? 'مفعل ويعمل بكفاءة' : 'معطل مؤقتاً'}
                  </span>

                  <button
                    onClick={() => setSelectedHospitalForProfile(hospital)}
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

      {/* TAB 2: COORDINATORS DIRECTORY */}
      {activeSubTab === 'coordinators' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-600" />
                سجل حسابات منسقي مكافحة العدوى بمستشفيات التجمع
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                إدارة منسقي المنشآت الصحية، ضبط كلمات المرور الخاصة بالدخول، وتسجيل الدخول المباشر
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                {filteredHospitals.length} منسق مسجل
              </span>
              <button
                onClick={handleOpenAddCoordinator}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة منسق مستشفى جديد</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredHospitals.map((hospital) => {
              const coordUser = availableUsers.find(
                (u) =>
                  u.hospitalId === hospital.id ||
                  u.email.toLowerCase() === hospital.coordinatorEmail?.toLowerCase()
              ) || {
                id: `user-coord-${hospital.id}`,
                email: hospital.coordinatorEmail || `coord@${hospital.id}.med.sa`,
                name: hospital.coordinatorName || `منسق ${hospital.name}`,
                role: 'hospital' as const,
                hospitalId: hospital.id,
                password: 'password123',
                createdAt: hospital.createdAt,
              };

              const isCurrent = currentUser.id === coordUser.id;

              return (
                <div
                  key={hospital.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0">
                      {hospital.coordinatorName ? hospital.coordinatorName.charAt(0) : 'م'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">
                          {hospital.coordinatorName || 'لم يتم تعيين الاسم'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                          {hospital.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-medium flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          كلمة المرور مفعلة
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full font-bold">
                            الحساب النشط حالياً
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 flex-wrap">
                        <span className="font-mono text-[11px] text-slate-600 flex items-center gap-1" dir="ltr">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {hospital.coordinatorEmail || 'لا يوجد بريد'}
                        </span>
                        {hospital.coordinatorEmail && (
                          <button
                            onClick={() => handleCopyEmail(hospital.coordinatorEmail)}
                            className="text-slate-400 hover:text-teal-600"
                            title="نسخ البريد"
                          >
                            {copiedEmail === hospital.coordinatorEmail ? (
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

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleOpenEditCoordinator(coordUser)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                      title="تعديل بيانات وحساب المنسق وكلمة المرور"
                    >
                      <Key className="w-3 h-3 text-teal-600" />
                      <span>بيانات الدخول وكلمة المرور</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(hospital)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>المستشفى</span>
                    </button>

                    {onSwitchUser && (
                      <button
                        onClick={() => onSwitchUser(coordUser)}
                        disabled={isCurrent}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                          isCurrent
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default'
                            : 'bg-teal-600 hover:bg-teal-700 text-white'
                        }`}
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{isCurrent ? 'أنت داخل الحساب' : 'تسجيل الدخول كمنسق'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comprehensive Hospital Profile Modal */}
      {selectedHospitalForProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-3">
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
              <button
                onClick={() => setSelectedHospitalForProfile(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Aggregated Profile */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Facility Details Bar */}
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
                  <strong className="font-bold text-slate-800">{selectedHospitalForProfile.coordinatorName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">البريد الرسمي</span>
                  <strong className="font-bold text-slate-800 font-mono text-[11px]">{selectedHospitalForProfile.coordinatorEmail}</strong>
                </div>
              </div>

              {/* Sections: Practitioners & Equipment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Practitioners */}
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
                              <span className="text-[11px] text-slate-500">{prac.role} • {prac.department}</span>
                            </div>
                            <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-mono">
                              {prac.licenseNumber || 'معتمد'}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Equipment */}
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
                              <span className="text-[11px] text-slate-500">{eq.type} • {eq.location}</span>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                eq.status === 'operational'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {eq.status === 'operational' ? 'يعمل' : 'تحت الصيانة'}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {/* Sections: Visits & Trainings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visits */}
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
                              <strong className="block text-slate-800">{vis.title}</strong>
                              <span className="text-[11px] text-slate-500">{new Date(vis.scheduledDate).toLocaleDateString('ar-SA')}</span>
                            </div>
                            <span className="text-xs font-bold text-teal-700 font-mono">
                              {vis.status === 'completed' ? `${vis.complianceScore}%` : 'قيد المتابعة'}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Trainings */}
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
                              <span className="text-[11px] text-slate-500">استحقاق: {new Date(trn.dueDate).toLocaleDateString('ar-SA')}</span>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                trn.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {trn.status === 'completed' ? 'مكتمل' : 'معلق'}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedHospitalForProfile(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Hospital Modal */}
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
                  placeholder="مثال: مستشفى حراء العام"
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
                    placeholder="مثال: مكة المكرمة"
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
                    placeholder="اسم المنسق المعتمد"
                    value={formCoordName}
                    onChange={(e) => setFormCoordName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">البريد الرسمي للمنسق</label>
                  <input
                    type="email"
                    placeholder="coord@hospital.med.sa"
                    value={formCoordEmail}
                    onChange={(e) => setFormCoordEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">كلمة المرور الابتدائية لدخول المنسق</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    placeholder="123456"
                    value={formCoordPassword}
                    onChange={(e) => setFormCoordPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800 pl-10"
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
                  سيتمكن منسق المستشفى من استخدام هذه الكلمة لتسجيل الدخول إلى شاشات منشأته
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  حفظ المستشفى وتوزيع خطط التدريب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Coordinator Modal */}
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
                  placeholder="مثال: أ. أحمد الزهراني"
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
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.location})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-teal-700 mt-1">
                  سيكون لهذا المنسق استقلالية كاملة في إدارة بيانات هذا المستشفى فقط دون الاطلاع على المستشفيات الأخرى.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني الرسمي</label>
                  <input
                    type="email"
                    required
                    placeholder="coord@hospital.med.sa"
                    value={coordFormEmail}
                    onChange={(e) => setCoordFormEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم التواصل / التحويلة</label>
                  <input
                    type="text"
                    placeholder="05XXXXXXXX"
                    value={coordFormPhone}
                    onChange={(e) => setCoordFormPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">كلمة المرور الخاصة بالحساب</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    placeholder="كلمة المرور"
                    value={coordFormPassword}
                    onChange={(e) => setCoordFormPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800 pl-10 font-mono"
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  اعتماد وإنشاء الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Manage Coordinator Account Modal */}
      {editingCoordinatorUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-teal-400" />
                بيانات حساب المنسق وتعيين كلمة المرور
              </h3>
              <button onClick={() => setEditingCoordinatorUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCoordinator} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المنسق</label>
                <input
                  type="text"
                  required
                  value={editingCoordinatorUser.name}
                  onChange={(e) =>
                    setEditingCoordinatorUser({
                      ...editingCoordinatorUser,
                      name: e.target.value,
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني الرسمي للدخول</label>
                <input
                  type="email"
                  required
                  value={editingCoordinatorUser.email}
                  onChange={(e) =>
                    setEditingCoordinatorUser({
                      ...editingCoordinatorUser,
                      email: e.target.value,
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تعيين / تعديل كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    value={editCoordPassword}
                    onChange={(e) => setEditCoordPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800 pl-10 font-mono"
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
                  يمكنك إعادة تعيين كلمة المرور هنا لتسليمها لمنسق المستشفى
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCoordinatorUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  حفظ كلمة المرور والبيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Hospital Modal */}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">منسق مكافحة العدوى</label>
                  <input
                    type="text"
                    value={formCoordName}
                    onChange={(e) => setFormCoordName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formCoordEmail}
                    onChange={(e) => setFormCoordEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white text-slate-800"
                  />
                </div>
              </div>

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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
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
};
