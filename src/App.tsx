import React, { useState, useEffect, useCallback } from 'react';
import { neonService } from './lib/neon';
import {
  User,
  Hospital,
  Visit,
  Training,
  Practitioner,
  Equipment,
  PolicyItem,
  OrgDocument,
  DocumentCenterItem,
  ProgramFolder,
  ProgramFile,
  AuditLog,
  Notification,
} from './types/ipc';

import { Sidebar, ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { HospitalsView } from './components/HospitalsView';
import { VisitsView } from './components/VisitsView';
import { TrainingsView } from './components/TrainingsView';
import { AssetsView } from './components/AssetsView';
import { DocumentsView } from './components/DocumentsView';
import { ProgramsView } from './components/ProgramsView';
import { AuditView } from './components/AuditView';
import { NeonModal } from './components/NeonModal';

export default function App() {
  // Navigation and UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isNeonModalOpen, setIsNeonModalOpen] = useState(false);
  const [isNeonConnected, setIsNeonConnected] = useState(false);

  // Core Data loaded from neonService
  const [currentUser, setCurrentUser] = useState<User>(neonService.getCurrentUser());
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [orgDocs, setOrgDocs] = useState<OrgDocument[]>([]);
  const [docCenterItems, setDocCenterItems] = useState<DocumentCenterItem[]>([]);
  const [programFolders, setProgramFolders] = useState<ProgramFolder[]>([]);
  const [programFiles, setProgramFiles] = useState<ProgramFile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Filtering for central role
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  // Reload all data from single source of truth
  const reloadData = useCallback(() => {
    setCurrentUser(neonService.getCurrentUser());
    setAvailableUsers(neonService.getUsers());
    setHospitals(neonService.getHospitals());
    setVisits(neonService.getVisits());
    setTrainings(neonService.getTrainings());
    setPractitioners(neonService.getPractitioners());
    setEquipments(neonService.getEquipments());
    setPolicies(neonService.getPolicies());
    setOrgDocs(neonService.getOrgDocuments());
    setDocCenterItems(neonService.getDocumentCenterItems());
    setProgramFolders(neonService.getProgramFolders());
    setProgramFiles(neonService.getProgramFiles());
    setAuditLogs(neonService.getAuditLogs());
    setNotifications(neonService.getNotifications());
  }, []);

  // Initial load and Neon check
  useEffect(() => {
    reloadData();
    // Test Neon connection status asynchronously
    neonService.testNeonConnection().then((res) => {
      setIsNeonConnected(res.success);
    });
  }, [reloadData]);

  // Handler: Switch user / role
  const handleSwitchUser = (user: User) => {
    neonService.setCurrentUser(user);
    setCurrentUser(user);
    if (user.role === 'hospital') {
      setSelectedHospitalId(user.hospitalId || null);
    } else {
      setSelectedHospitalId(null);
    }
  };

  // Handler: Direct Email Login (Handles hidden Dev Admin and Hospital Coordinators)
  const handleLoginWithEmail = (email: string): { success: boolean; user?: User; message?: string } => {
    const res = neonService.loginWithEmail(email);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      if (res.user.role === 'hospital') {
        setSelectedHospitalId(res.user.hospitalId || null);
      } else {
        setSelectedHospitalId(null);
      }
      return res;
    }
    return res;
  };

  // Handler: Logout
  const handleLogout = () => {
    const defaultUser = neonService.logout();
    setCurrentUser(defaultUser);
    setSelectedHospitalId(null);
  };

  // Handler: Reset Data
  const handleResetData = () => {
    neonService.resetToDefault();
    reloadData();
  };

  // Hospital Handlers (FR-5, 6, 7, 8, 18)
  const handleCreateHospital = (data: Omit<Hospital, 'id' | 'createdAt'> & { coordinatorPassword?: string }) => {
    const newHosp = neonService.createHospital(data);
    if (data.coordinatorEmail) {
      neonService.addCoordinator({
        name: data.coordinatorName || `منسق ${newHosp.name}`,
        email: data.coordinatorEmail,
        password: data.coordinatorPassword || '123456',
        hospitalId: newHosp.id,
      });
    }
    neonService.addAuditLog({
      entityType: 'Hospital',
      entityId: newHosp.id,
      action: `إضافة مستشفى جديد وتعيين حسابه: ${newHosp.name}`,
      performedBy: currentUser.name,
      details: `تمت الإضافة بنجاح وتوليد التدريبات التلقائية وحساب المنسق`,
    });
    reloadData();
  };

  const handleUpdateHospital = (id: string, data: Partial<Hospital>) => {
    neonService.updateHospital(id, data);
    neonService.addAuditLog({
      entityType: 'Hospital',
      entityId: id,
      action: `تعديل بيانات المستشفى`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleToggleHospitalStatus = (id: string) => {
    neonService.toggleHospitalStatus(id);
    neonService.addAuditLog({
      entityType: 'Hospital',
      entityId: id,
      action: `تغيير حالة تفعيل المستشفى`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  // Coordinator Account Handlers
  const handleAddCoordinator = (data: {
    name: string;
    email: string;
    password?: string;
    hospitalId: string;
    phone?: string;
  }) => {
    const res = neonService.addCoordinator(data);
    if (!res.success) {
      alert(res.message || 'حدث خطأ أثناء إضافة المنسق');
      return;
    }
    neonService.addAuditLog({
      entityType: 'Hospital',
      entityId: data.hospitalId,
      action: `إضافة واعتماد منسق مستشفى: ${data.name} (${data.email})`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleUpdateCoordinator = (
    userId: string,
    data: { name?: string; email?: string; password?: string; phone?: string; hospitalId?: string }
  ) => {
    neonService.updateCoordinator(userId, data);
    neonService.addAuditLog({
      entityType: 'Hospital',
      entityId: data.hospitalId || 'coordinator',
      action: `تحديث بيانات وحساب المنسق: ${data.name || userId}`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleResetCoordinatorPassword = (userId: string, newPassword: string) => {
    neonService.resetCoordinatorPassword(userId, newPassword);
    neonService.addAuditLog({
      entityType: 'Hospital',
      entityId: userId,
      action: `إعادة تعيين كلمة مرور المنسق`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  // Visit Handlers (FR-9, 10, 11, 12, 13, 14, 15)
  const handleCreateVisit = (data: {
    hospitalId: string;
    visitDate: string;
    team: string;
    details: string;
    complianceScore?: number;
  }) => {
    const hosp = hospitals.find((h) => h.id === data.hospitalId);
    const newVisit = neonService.createVisit({
      hospitalId: data.hospitalId,
      hospitalName: hosp?.name || 'مستشفى التجمع',
      visitDate: data.visitDate,
      team: data.team,
      details: data.details,
      status: 'in_progress',
      complianceScore: data.complianceScore || 85,
    });
    neonService.addAuditLog({
      entityType: 'Visit',
      entityId: newVisit.id,
      action: `إنشاء زيارة رقابية جديدة لمستشفى ${hosp?.name}`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleUploadVisitReport = (visitId: string, reportUrl: string, reportName: string) => {
    neonService.uploadVisitReport(visitId, reportUrl, reportName);
    neonService.addAuditLog({
      entityType: 'Visit',
      entityId: visitId,
      action: `رفع تقرير الزيارة الرسمي: ${reportName}`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleAddVisitAttachment = (visitId: string, fileName: string, fileUrl: string) => {
    neonService.addVisitAttachment(visitId, fileName, fileUrl);
    neonService.addAuditLog({
      entityType: 'Visit',
      entityId: visitId,
      action: `إرفاق ملف/صورة بالزيارة: ${fileName}`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleAddVisitResponse = (
    visitId: string,
    note: string,
    attachmentUrl?: string,
    attachmentName?: string
  ) => {
    neonService.addVisitResponse(visitId, {
      respondentName: currentUser.name,
      respondentRole: currentUser.role,
      note,
      attachmentUrl,
      attachmentName,
    });
    neonService.addAuditLog({
      entityType: 'Visit',
      entityId: visitId,
      action: `إضافة رد وتحديث منسق المستشفى على الزيارة`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleCompleteVisit = (visitId: string) => {
    neonService.completeVisit(visitId);
    neonService.addAuditLog({
      entityType: 'Visit',
      entityId: visitId,
      action: `اعتماد واكتمال الزيارة نهائياً وأرشفتها`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  // Training Handlers (FR-17..23)
  const handleCreateTemplate = (data: { title: string; description: string; deadlineDate: string }) => {
    neonService.createTrainingTemplate(data);
    neonService.addAuditLog({
      entityType: 'Training',
      entityId: 'template',
      action: `إنشاء قالب تدريبي مركزي وتوزيعه آلياً على كل المستشفيات: ${data.title}`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleCreateInternalTraining = (data: {
    hospitalId: string;
    title: string;
    description: string;
    date: string;
    deliveredBy: string;
    attendeeCount: number;
  }) => {
    const hosp = hospitals.find((h) => h.id === data.hospitalId);
    const newT = neonService.createInternalTraining({
      hospitalId: data.hospitalId,
      hospitalName: hosp?.name || 'مستشفى',
      title: data.title,
      description: data.description,
      date: data.date,
      deliveredBy: data.deliveredBy,
      attendeeCount: data.attendeeCount,
    });
    neonService.addAuditLog({
      entityType: 'Training',
      entityId: newT.id,
      action: `تسجيل تدريب داخلي مستقل: ${data.title}`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleUpdateHospitalTraining = (
    id: string,
    data: {
      date: string;
      deliveredBy: string;
      attendeeCount: number;
      attendeePractitionerIds?: string[];
      notes?: string;
      photos?: string[];
      status: 'completed' | 'pending' | 'late';
    }
  ) => {
    neonService.updateTrainingExecution(id, data);
    neonService.addAuditLog({
      entityType: 'Training',
      entityId: id,
      action: `توثيق إنجاز الدورة التدريبية ورصد حضور ${data.attendeeCount} ممارس`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  // Assets Handlers (FR-24, 25)
  const handleAddPractitioner = (data: Omit<Practitioner, 'id' | 'createdAt'>) => {
    const newP = neonService.addPractitioner(data);
    neonService.addAuditLog({
      entityType: 'Practitioner',
      entityId: newP.id,
      action: `تسجيل ممارس مكافحة عدوى جديد: ${data.name}`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleUpdatePractitioner = (id: string, data: Partial<Practitioner>) => {
    neonService.updatePractitioner(id, data);
    neonService.addAuditLog({
      entityType: 'Practitioner',
      entityId: id,
      action: `تعديل بيانات ممارس صحي`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleAddEquipment = (data: Omit<Equipment, 'id' | 'createdAt'>) => {
    const newEq = neonService.addEquipment(data);
    neonService.addAuditLog({
      entityType: 'Equipment',
      entityId: newEq.id,
      action: `إضافة جهاز مكافحة عدوى: ${data.name}`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleUpdateEquipment = (id: string, data: Partial<Equipment>) => {
    neonService.updateEquipment(id, data);
    neonService.addAuditLog({
      entityType: 'Equipment',
      entityId: id,
      action: `تعديل بيانات جهاز مكافحة عدوى`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  // Documents Handlers (FR-27..30)
  const handleAddPolicy = (data: Omit<PolicyItem, 'id' | 'createdAt'>) => {
    const p = neonService.addPolicy(data);
    neonService.addAuditLog({
      entityType: 'Policy',
      entityId: p.id,
      action: `رفع سياسة/نموذج جديد: ${data.title}`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleAddOrgDoc = (data: Omit<OrgDocument, 'id' | 'uploadedAt'>) => {
    const d = neonService.addOrgDocument(data);
    neonService.addAuditLog({
      entityType: 'OrgDoc',
      entityId: d.id,
      action: `رفع وثيقة هيكل تنظيمي: ${data.title}`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleAddDocCenterItem = (data: Omit<DocumentCenterItem, 'id' | 'uploadedAt'>) => {
    const item = neonService.addDocCenterItem(data);
    neonService.addAuditLog({
      entityType: 'DocCenter',
      entityId: item.id,
      action: `إضافة ملف لمركز الوثائق العام: ${data.title}`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  // Programs Handlers (FR-31..34)
  const handleCreateFolder = (data: { name: string; parentId: string | null; description?: string }) => {
    const folder = neonService.createProgramFolder(data);
    neonService.addAuditLog({
      entityType: 'Program',
      entityId: folder.id,
      action: `إنشاء مجلد برنامج استراتيجي: ${data.name}`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleUploadProgramFile = (data: {
    folderId: string;
    title: string;
    fileUrl: string;
    fileSize?: string;
  }) => {
    const file = neonService.uploadProgramFile(data);
    neonService.addAuditLog({
      entityType: 'Program',
      entityId: file.id,
      action: `رفع ملف في برنامج استراتيجي: ${data.title}`,
      performedBy: currentUser.name,
    });
    reloadData();
  };

  const handleMarkNotificationRead = (id: string) => {
    neonService.markNotificationRead(id);
    reloadData();
  };

  // Find user's hospital name
  const currentHospitalObj = hospitals.find((h) => h.id === currentUser.hospitalId);

  return (
    <div className="min-h-screen bg-[#f5f8fa] text-slate-900 font-sans antialiased selection:bg-teal-500 selection:text-white" dir="rtl">
      {/* Metronic Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={currentUser.role}
        currentHospitalName={currentHospitalObj?.name}
        isNeonConnected={isNeonConnected}
        onOpenNeonModal={() => setIsNeonModalOpen(true)}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Wrapper with proper RTL offset */}
      <div className="lg:mr-64 flex flex-col min-h-screen transition-all">
        {/* Metronic Header */}
        <Header
          currentUser={currentUser}
          onSwitchUser={handleSwitchUser}
          availableUsers={availableUsers}
          hospitals={hospitals}
          selectedHospitalId={selectedHospitalId}
          onSelectHospital={setSelectedHospitalId}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          isNeonConnected={isNeonConnected}
          onOpenNeonModal={() => setIsNeonModalOpen(true)}
          onResetData={handleResetData}
          onToggleMobileSidebar={() => setIsMobileOpen(!isMobileOpen)}
          onLoginWithEmail={handleLoginWithEmail}
          onLogout={handleLogout}
        />

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              hospitals={hospitals}
              visits={visits}
              trainings={trainings}
              selectedHospitalId={selectedHospitalId}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'hospitals' && (
            <HospitalsView
              currentUser={currentUser}
              hospitals={hospitals}
              visits={visits}
              trainings={trainings}
              practitioners={practitioners}
              equipments={equipments}
              onCreateHospital={handleCreateHospital}
              onUpdateHospital={handleUpdateHospital}
              onToggleHospitalStatus={handleToggleHospitalStatus}
              onAddCoordinator={handleAddCoordinator}
              onUpdateCoordinator={handleUpdateCoordinator}
              onResetCoordinatorPassword={handleResetCoordinatorPassword}
              onSwitchUser={handleSwitchUser}
              availableUsers={availableUsers}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'visits' && (
            <VisitsView
              currentUser={currentUser}
              visits={visits}
              hospitals={hospitals}
              auditLogs={auditLogs}
              onCreateVisit={handleCreateVisit}
              onUploadVisitReport={handleUploadVisitReport}
              onAddVisitAttachment={handleAddVisitAttachment}
              onAddVisitResponse={handleAddVisitResponse}
              onCompleteVisit={handleCompleteVisit}
            />
          )}

          {activeTab === 'trainings' && (
            <TrainingsView
              currentUser={currentUser}
              trainings={trainings}
              hospitals={hospitals}
              practitioners={practitioners}
              onCreateTemplate={handleCreateTemplate}
              onCreateInternalTraining={handleCreateInternalTraining}
              onUpdateHospitalTraining={handleUpdateHospitalTraining}
            />
          )}

          {activeTab === 'assets' && (
            <AssetsView
              currentUser={currentUser}
              practitioners={practitioners}
              equipments={equipments}
              hospitals={hospitals}
              onAddPractitioner={handleAddPractitioner}
              onUpdatePractitioner={handleUpdatePractitioner}
              onAddEquipment={handleAddEquipment}
              onUpdateEquipment={handleUpdateEquipment}
            />
          )}

          {(activeTab === 'policies' || activeTab === 'orgDocs' || activeTab === 'docCenter') && (
            <DocumentsView
              currentUser={currentUser}
              moduleType={activeTab}
              policies={policies}
              orgDocs={orgDocs}
              docCenterItems={docCenterItems}
              onAddPolicy={handleAddPolicy}
              onAddOrgDoc={handleAddOrgDoc}
              onAddDocCenterItem={handleAddDocCenterItem}
            />
          )}

          {activeTab === 'programs' && (
            <ProgramsView
              currentUser={currentUser}
              folders={programFolders}
              files={programFiles}
              onCreateFolder={handleCreateFolder}
              onUploadFile={handleUploadProgramFile}
            />
          )}

          {activeTab === 'audit' && (
            <AuditView
              currentUser={currentUser}
              auditLogs={auditLogs}
            />
          )}
        </main>

        {/* Global Footer */}
        <footer className="h-12 border-t border-slate-200/80 bg-white px-6 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>منصة مكافحة العدوى الموحدة للتجمع الصحي</span>
            <span>•</span>
            <span className="text-[11px] text-teal-700 font-medium">النسخة الرسمية المعتمدة v1.0</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            {isNeonConnected ? 'PostgreSQL Neon Active' : 'Offline / Local Ready'}
          </div>
        </footer>
      </div>

      {/* Neon Database Connection Modal */}
      <NeonModal
        isOpen={isNeonModalOpen}
        onClose={() => setIsNeonModalOpen(false)}
        onConnectionChange={() => {
          neonService.testNeonConnection().then((res) => setIsNeonConnected(res.success));
          reloadData();
        }}
        onDataChanged={reloadData}
      />
    </div>
  );
}
