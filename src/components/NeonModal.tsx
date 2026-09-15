import React, { useState, useEffect } from 'react';
import { neonService } from '../lib/neon';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  ExternalLink,
  X,
  Zap,
  Copy,
  Check,
  Table2,
  Trash2,
  ShieldCheck,
  Sparkles,
  DownloadCloud,
} from 'lucide-react';

interface NeonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionChange?: () => void;
  onDataChanged?: () => void;
}

const SRS_TABLES = [
  { name: 'Hospital', ar: 'المستشفيات', category: 'المنشآت' },
  { name: 'User', ar: 'المستخدمون والصلاحيات', category: 'الأمان' },
  { name: 'Visit', ar: 'الزيارات الرقابية الإشرافية', category: 'الرقابة' },
  { name: 'VisitAttachment', ar: 'مرفقات وصور الزيارات', category: 'الرقابة' },
  { name: 'VisitResponse', ar: 'ردود المستشفيات على الملاحظات', category: 'الرقابة' },
  { name: 'AuditLog', ar: 'سجل التدقيق والمراجعة الزمني', category: 'الأمان' },
  { name: 'TrainingTemplate', ar: 'قوالب التدريب المركزية المعممة', category: 'التدريب' },
  { name: 'Training', ar: 'التدريبات المنفذة والداخلية', category: 'التدريب' },
  { name: 'TrainingAttachment', ar: 'مرفقات وشهادات التدريب', category: 'التدريب' },
  { name: 'TrainingAttendance', ar: 'حضور التدريب والمشاركون', category: 'التدريب' },
  { name: 'Practitioner', ar: 'ممارسو مكافحة العدوى', category: 'الأصول' },
  { name: 'Equipment', ar: 'أجهزة ومعدات التعقيم', category: 'الأصول' },
  { name: 'Policy', ar: 'السياسات والنماذج والأدلة', category: 'الوثائق' },
  { name: 'OrgDocument', ar: 'الهياكل التنظيمية والوصف الوظيفي', category: 'الوثائق' },
  { name: 'DocumentCenterFile', ar: 'مركز الوثائق والملفات الموحد', category: 'الوثائق' },
  { name: 'Program', ar: 'البرامج الاستراتيجية', category: 'البرامج' },
  { name: 'ProgramFolder', ar: 'مجلدات البرامج الهرمية المتداخلة', category: 'البرامج' },
  { name: 'ProgramFile', ar: 'ملفات ومستندات البرامج', category: 'البرامج' },
  { name: 'Notification', ar: 'نظام التنبيهات والإشعارات', category: 'التنبيهات' },
];

const SQL_DDL_SCRIPT = `-- Neon.tech PostgreSQL DDL Script for IPC Management Portal (SRS v1.0)
-- 19 Tables Covering All Functional Modules

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM ('central', 'hospital');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VisitStatus') THEN
    CREATE TYPE "VisitStatus" AS ENUM ('in_progress', 'completed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TrainingStatus') THEN
    CREATE TYPE "TrainingStatus" AS ENUM ('pending', 'late', 'completed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PolicyCategory') THEN
    CREATE TYPE "PolicyCategory" AS ENUM ('policy', 'procedure', 'form');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrgDocType') THEN
    CREATE TYPE "OrgDocType" AS ENUM ('org_structure', 'job_description');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM ('training_overdue', 'visit_upcoming', 'new_document');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Hospital" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "coordinatorName" TEXT DEFAULT '',
  "coordinatorEmail" TEXT DEFAULT '',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT DEFAULT 'مستخدم',
  "role" TEXT DEFAULT 'hospital',
  "hospitalId" TEXT REFERENCES "Hospital"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Visit" (
  "id" TEXT PRIMARY KEY,
  "hospitalId" TEXT NOT NULL REFERENCES "Hospital"("id") ON DELETE CASCADE,
  "visitDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  "team" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "reportUrl" TEXT DEFAULT '',
  "reportName" TEXT DEFAULT 'تقرير الزيارة',
  "status" TEXT DEFAULT 'in_progress',
  "complianceScore" DOUBLE PRECISION DEFAULT 85.0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "VisitAttachment" (
  "id" TEXT PRIMARY KEY,
  "visitId" TEXT NOT NULL REFERENCES "Visit"("id") ON DELETE CASCADE,
  "fileName" TEXT DEFAULT 'مرفق',
  "fileUrl" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "VisitResponse" (
  "id" TEXT PRIMARY KEY,
  "visitId" TEXT NOT NULL REFERENCES "Visit"("id") ON DELETE CASCADE,
  "note" TEXT NOT NULL,
  "attachmentUrl" TEXT,
  "attachmentName" TEXT,
  "respondentName" TEXT DEFAULT 'منسق المستشفى',
  "respondedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "performedBy" TEXT NOT NULL,
  "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TrainingTemplate" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "dueDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Training" (
  "id" TEXT PRIMARY KEY,
  "templateId" TEXT REFERENCES "TrainingTemplate"("id") ON DELETE SET NULL,
  "hospitalId" TEXT NOT NULL REFERENCES "Hospital"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "deliveredBy" TEXT DEFAULT '',
  "date" TIMESTAMP WITH TIME ZONE,
  "status" TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TrainingAttachment" (
  "id" TEXT PRIMARY KEY,
  "trainingId" TEXT NOT NULL REFERENCES "Training"("id") ON DELETE CASCADE,
  "fileName" TEXT DEFAULT 'مرفق تدريب',
  "fileUrl" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Practitioner" (
  "id" TEXT PRIMARY KEY,
  "hospitalId" TEXT NOT NULL REFERENCES "Hospital"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "licenseNumber" TEXT,
  "contact" TEXT
);

CREATE TABLE IF NOT EXISTS "TrainingAttendance" (
  "id" TEXT PRIMARY KEY,
  "trainingId" TEXT NOT NULL REFERENCES "Training"("id") ON DELETE CASCADE,
  "practitionerId" TEXT REFERENCES "Practitioner"("id") ON DELETE SET NULL,
  "headcount" INTEGER
);

CREATE TABLE IF NOT EXISTS "Equipment" (
  "id" TEXT PRIMARY KEY,
  "hospitalId" TEXT NOT NULL REFERENCES "Hospital"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "serialNumber" TEXT,
  "status" TEXT
);

CREATE TABLE IF NOT EXISTS "Policy" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "category" TEXT DEFAULT 'policy',
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT DEFAULT 'وثيقة سياسة',
  "version" TEXT DEFAULT '1.0',
  "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "OrgDocument" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT DEFAULT 'مستند تنظيمي',
  "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DocumentCenterFile" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT DEFAULT 'وثيقة',
  "category" TEXT DEFAULT 'عام',
  "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Program" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProgramFolder" (
  "id" TEXT PRIMARY KEY,
  "programId" TEXT NOT NULL REFERENCES "Program"("id") ON DELETE CASCADE,
  "parentFolderId" TEXT REFERENCES "ProgramFolder"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "ProgramFile" (
  "id" TEXT PRIMARY KEY,
  "programId" TEXT NOT NULL REFERENCES "Program"("id") ON DELETE CASCADE,
  "folderId" TEXT REFERENCES "ProgramFolder"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" TEXT DEFAULT '1.2 MB',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

export const NeonModal: React.FC<NeonModalProps> = ({
  isOpen,
  onClose,
  onConnectionChange,
  onDataChanged,
}) => {
  const [databaseUrl, setDatabaseUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCleanSlate, setIsCleanSlate] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [pgVersion, setPgVersion] = useState<string | null>(null);
  const [existingTables, setExistingTables] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [showTableDetails, setShowTableDetails] = useState(false);

  const fetchTables = async () => {
    if (neonService.isNeonConfigured()) {
      const res = await neonService.getNeonTablesList();
      if (res.success) {
        setExistingTables(res.tables);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDatabaseUrl(neonService.getDatabaseUrl());
      setIsCleanSlate(neonService.isCleanSlate());
      setStatusMessage(null);
      setLatency(null);
      fetchTables();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Primary Action: Connect to new provider & deploy all 19 tables WITHOUT seed data
  const handleConnectAndCleanDeploy = async () => {
    if (!databaseUrl.trim()) {
      setStatusMessage({
        text: 'يرجى إدخال رابط اتصال PostgreSQL (DATABASE_URL) الخاص بالمزوّد الجديد أولاً.',
        isError: true,
      });
      return;
    }
    setIsPushing(true);
    setStatusMessage(null);
    neonService.setDatabaseUrl(databaseUrl);

    // Test connection first
    const testRes = await neonService.testNeonConnection();
    if (!testRes.success) {
      setIsPushing(false);
      setStatusMessage({
        text: `تعذر الاتصال بالمزوّد الجديد: ${testRes.message}`,
        isError: true,
      });
      return;
    }

    setLatency(testRes.latencyMs || null);
    setPgVersion(testRes.version || null);

    // Deploy 19 tables and wipe seed data locally
    const res = await neonService.pushSchemaToNeon({ clearLocalSeedData: true });
    setIsPushing(false);
    setIsCleanSlate(true);

    setStatusMessage({
      text: res.message,
      isError: !res.success,
    });

    if (res.success) {
      await fetchTables();
      if (onConnectionChange) onConnectionChange();
      if (onDataChanged) onDataChanged();
    }
  };

  // 2. Wipe seed data immediately
  const handleWipeSeedData = () => {
    setIsWiping(true);
    neonService.clearAllSeedData();
    setIsCleanSlate(true);
    setIsWiping(false);
    setStatusMessage({
      text: 'تم بنجاح حذف وتفريغ كافة البيانات التجريبية (Zero Seed Data) وتفعيل وضع الإنتاج النظيف! النظام جاهز الآن لإدخال بياناتكم الحقيقية.',
      isError: false,
    });
    if (onDataChanged) onDataChanged();
  };

  // 3. Sync live records from DB
  const handleSyncFromDatabase = async () => {
    if (!neonService.isNeonConfigured()) {
      setStatusMessage({
        text: 'يرجى إدخال رابط اتصال المزوّد وحفظه أولاً.',
        isError: true,
      });
      return;
    }
    setIsSyncing(true);
    setStatusMessage(null);
    const res = await neonService.syncFromDatabase();
    setIsSyncing(false);
    setStatusMessage({
      text: res.message,
      isError: !res.success,
    });
    if (res.success) {
      setIsCleanSlate(true);
      if (onDataChanged) onDataChanged();
    }
  };

  // 4. Restore demo data (if user wants to inspect demo samples)
  const handleRestoreDemoData = () => {
    neonService.restoreDemoSeedData();
    setIsCleanSlate(false);
    setStatusMessage({
      text: 'تم استعادة عينات البيانات التجريبية (Demo Data) لغرض المعاينة والتجربة.',
      isError: false,
    });
    if (onDataChanged) onDataChanged();
  };

  // 5. Test Connection Only
  const handleSaveAndTest = async () => {
    setIsTesting(true);
    setStatusMessage(null);
    neonService.setDatabaseUrl(databaseUrl);

    const res = await neonService.testNeonConnection();
    setIsTesting(false);
    setStatusMessage({
      text: res.message,
      isError: !res.success,
    });
    if (res.success) {
      setLatency(res.latencyMs || null);
      setPgVersion(res.version || null);
      fetchTables();
    }
    if (onConnectionChange) onConnectionChange();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_DDL_SCRIPT);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const existingCount = existingTables.length;
  const isAllCreated = existingCount >= 19;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">إعدادات مزوّد قاعدة البيانات</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 font-mono">
                  PostgreSQL
                </span>
                {isCleanSlate ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    بدون Seed Data
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    وضع تجريبي
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">ربط مزوّد جديد (Neon / Supabase / PostgreSQL) مع 19 جدولاً بدون بيانات تجريبية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-sm text-slate-700">
          {/* Active Data Mode Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            isCleanSlate ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}>
            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
              isCleanSlate ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {isCleanSlate ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div className="text-xs leading-relaxed flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <strong className="font-bold text-sm">
                  {isCleanSlate ? 'وضع قاعدة البيانات النظيفة نشط (Zero Seed Data)' : 'وضع العرض التجريبي نشط (Demo Data)'}
                </strong>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/80 border">
                  الجداول بالمزوّد: {existingCount} / 19
                </span>
              </div>
              <p className={isCleanSlate ? 'text-emerald-800' : 'text-amber-800'}>
                {isCleanSlate
                  ? 'تم استبعاد وتفريغ كافة البيانات الوهمية والتجريبية. النظام يعمل الآن ببياناتكم الفعلية فقط، مع حساب المشرف العام المركزي الافتراضي.'
                  : 'التطبيق يعرض حالياً بيانات تجريبية توضيحية. إذا كنت تقوم بربط مزوّد جديد للإنتاج، اضغط على زر "الربط بالمزوّد والتهيئة النظيفة" بالأسفل لبدء العمل من الصفر دون بيانات وهمية.'}
              </p>
            </div>
          </div>

          {/* Database Connection Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-800">
                رابط اتصال المزوّد الجديد (PostgreSQL / Neon / Supabase Connection URL)
              </label>
              <span className="text-[11px] text-slate-500 font-mono">يدعم أي مزوّد PostgreSQL</span>
            </div>
            <div className="relative">
              <input
                type="password"
                value={databaseUrl}
                onChange={(e) => setDatabaseUrl(e.target.value)}
                placeholder="postgresql://username:password@ep-host.region.neon.tech/neondb?sslmode=require"
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-900"
              />
              <Database className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              انسخ رابط الاتصال من لوحة تحكم مزوّدك (Neon Console أو Supabase أو أي خادم PostgreSQL).
            </p>
          </div>

          {/* Data Mode Choice Cards */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800 block">
              اختيار وضع البيانات عند الربط (Data Seeding Preference)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                onClick={() => handleWipeSeedData()}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isCleanSlate
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className={`w-4 h-4 ${isCleanSlate ? 'text-emerald-600' : 'text-slate-500'}`} />
                  <span className="font-bold text-xs text-slate-900">بدء نظيف (بدون Seed Data)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold mr-auto">موصى به</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  تفريغ كافة السجلات الوهمية، وإنشاء الجداول الـ 19 فارغة تماماً بالمزوّد الجديد للبدء الفعلي بالبيانات الحقيقية.
                </p>
              </div>

              <div
                onClick={() => handleRestoreDemoData()}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  !isCleanSlate
                    ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className={`w-4 h-4 ${!isCleanSlate ? 'text-teal-600' : 'text-slate-500'}`} />
                  <span className="font-bold text-xs text-slate-900">وضع العرض التجريبي (Demo)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  تحميل بيانات وعينات جاهزة (4 مستشفيات وعينات زيارات وتدريبات) لأغراض الفحص والاختبار السريع.
                </p>
              </div>
            </div>
          </div>

          {/* Test / Feedback Status */}
          {statusMessage && (
            <div className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
              statusMessage.isError
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {statusMessage.isError ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 flex-1">
                <p className="font-medium">{statusMessage.text}</p>
                {latency !== null && (
                  <p className="text-[11px] text-emerald-700">زمن الاستجابة مع الخادم: {latency} ميلي ثانية</p>
                )}
                {pgVersion && (
                  <p className="text-[10px] text-slate-600 font-mono line-clamp-1">{pgVersion}</p>
                )}
              </div>
            </div>
          )}

          {/* Main Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            {/* Primary Action Button: Connect & Clean Deploy (Zero Seed Data) */}
            <button
              onClick={handleConnectAndCleanDeploy}
              disabled={isPushing || !databaseUrl.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isPushing ? 'جاري الاتصال وتهيئة الـ 19 جدولاً بدون بيانات تجريبية...' : 'الربط بالمزوّد والتهيئة النظيفة (19 جدولاً بدون Seed Data)'}</span>
            </button>

            {/* Secondary Action Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                onClick={handleSaveAndTest}
                disabled={isTesting}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium border border-slate-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'جاري الفحص...' : 'فحص الاتصال'}</span>
              </button>

              <button
                onClick={handleWipeSeedData}
                disabled={isWiping}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg text-xs font-medium border border-rose-200 transition-colors"
                title="تفريغ كافة البيانات الوهمية من واجهات التطبيق"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>تفريغ الـ Seed Data</span>
              </button>

              <button
                onClick={handleSyncFromDatabase}
                disabled={isSyncing || !databaseUrl}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-medium border border-teal-200 transition-colors disabled:opacity-50"
                title="قراءة البيانات الحية المخزنة بالمزوّد"
              >
                <DownloadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>مزامنة من المزوّد</span>
              </button>

              <button
                onClick={handleCopySql}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium border border-slate-300 transition-colors"
                title="نسخ كود SQL DDL لتشغيله في SQL Editor"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                <span>{isCopied ? 'تم النسخ!' : 'نسخ كود SQL'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible 19 Tables List */}
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowTableDetails(!showTableDetails)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition-colors"
            >
              <div className="flex items-center gap-2">
                <Table2 className="w-4 h-4 text-teal-600" />
                <span>قائمة الجداول الـ 19 المعتمدة بالنظام ({existingCount} متواجد بالمزوّد)</span>
              </div>
              <span className="text-[11px] text-slate-500 font-normal">
                {showTableDetails ? 'إخفاء التفاصيل ▲' : 'عرض التفاصيل ▼'}
              </span>
            </button>

            {showTableDetails && (
              <div className="p-3 bg-white space-y-2 max-h-48 overflow-y-auto divide-y divide-slate-100">
                {SRS_TABLES.map((table, index) => {
                  const exists = existingTables.includes(table.name) || existingTables.includes(table.name.toLowerCase());
                  return (
                    <div key={table.name} className="flex items-center justify-between py-1.5 px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-4">{index + 1}.</span>
                        <code className="font-mono font-semibold text-slate-800 text-[11px]">{table.name}</code>
                        <span className="text-[11px] text-slate-500">({table.ar})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {table.category}
                        </span>
                        {exists ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            متواجد بالمزوّد
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            مُجدول للإنشاء
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center shrink-0 text-xs">
          <a
            href="https://console.neon.tech"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-slate-600 hover:text-teal-600 font-medium transition-colors"
          >
            <span>لوحة تحكم Neon</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
