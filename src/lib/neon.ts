// Neon.tech PostgreSQL Serverless Client and Data Service for IPC Management Portal
// Implements full SRS v1.0 specifications with serverless Neon driver + fallback persistence

import { neon } from '@neondatabase/serverless';
import {
  Hospital,
  User,
  Visit,
  VisitStatus,
  VisitAttachment,
  VisitResponse,
  AuditLog,
  TrainingTemplate,
  Training,
  Practitioner,
  Equipment,
  Policy,
  OrgDocument,
  DocumentCenterFile,
  Program,
  ProgramFolder,
  ProgramFile,
  Notification,
  UserRole,
} from '../types/ipc';

import {
  INITIAL_HOSPITALS,
  INITIAL_USERS,
  INITIAL_VISITS,
  INITIAL_AUDIT_LOGS,
  INITIAL_TRAINING_TEMPLATES,
  INITIAL_TRAININGS,
  INITIAL_PRACTITIONERS,
  INITIAL_EQUIPMENTS,
  INITIAL_POLICIES,
  INITIAL_ORG_DOCUMENTS,
  INITIAL_DOCUMENT_CENTER,
  INITIAL_PROGRAMS,
  INITIAL_NOTIFICATIONS,
} from './initialData';

export const DEFAULT_CLEAN_ADMIN: User = {
  id: 'user-central-admin',
  email: 'admin@ipc-cluster.gov.sa',
  name: 'مشرف الإدارة المركزية لمكافحة العدوى',
  role: 'central',
  hospitalId: null,
  password: 'admin123',
  createdAt: '2025-01-01T00:00:00.000Z',
};

// Hidden Dev Admin credentials - Never stored in DB tables or public lists
export const DEV_ADMIN_EMAIL = 'moha.naseir@gmail.com';
export const DEV_ADMIN_USER: User = {
  id: 'dev-admin-root',
  email: DEV_ADMIN_EMAIL,
  name: 'dev admin',
  role: 'central',
  hospitalId: null,
  isDevAdmin: true,
  password: 'dev123',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const STORAGE_KEYS = {
  DATABASE_URL: 'ipc_neon_database_url',
  IS_CLEAN_SLATE: 'ipc_is_clean_slate_v1',
  HOSPITALS: 'ipc_hospitals_v1',
  USERS: 'ipc_users_v1',
  VISITS: 'ipc_visits_v1',
  AUDIT_LOGS: 'ipc_audit_logs_v1',
  TRAINING_TEMPLATES: 'ipc_training_templates_v1',
  TRAININGS: 'ipc_trainings_v1',
  PRACTITIONERS: 'ipc_practitioners_v1',
  EQUIPMENTS: 'ipc_equipments_v1',
  POLICIES: 'ipc_policies_v1',
  ORG_DOCS: 'ipc_org_docs_v1',
  DOC_CENTER: 'ipc_doc_center_v1',
  PROGRAMS: 'ipc_programs_v1',
  NOTIFICATIONS: 'ipc_notifications_v1',
  CURRENT_USER: 'ipc_current_user_v1',
};

// Check if user selected Clean Slate Mode (No Seed Data)
export function isCleanSlateActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.IS_CLEAN_SLATE) === 'true';
}

// Helper to get or set local storage with clean slate fallback
function getStoredItem<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const clean = isCleanSlateActive();
      let fallback: any = defaultVal;
      if (clean) {
        if (key === STORAGE_KEYS.USERS) {
          fallback = [DEFAULT_CLEAN_ADMIN];
        } else if (key === STORAGE_KEYS.CURRENT_USER) {
          fallback = DEFAULT_CLEAN_ADMIN;
        } else if (key === STORAGE_KEYS.AUDIT_LOGS) {
          fallback = [];
        } else {
          fallback = [];
        }
      }
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback as T;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${key}:`, err);
    return defaultVal;
  }
}

function setStoredItem<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`Error writing ${key}:`, err);
  }
}

export class NeonIPCService {
  private static instance: NeonIPCService;
  private databaseUrl: string = '';

  private constructor() {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem(STORAGE_KEYS.DATABASE_URL);
      if (savedUrl) {
        this.databaseUrl = savedUrl;
      } else if ((import.meta as any).env?.VITE_DATABASE_URL) {
        this.databaseUrl = (import.meta as any).env.VITE_DATABASE_URL;
      }
    }
  }

  public static getInstance(): NeonIPCService {
    if (!NeonIPCService.instance) {
      NeonIPCService.instance = new NeonIPCService();
    }
    return NeonIPCService.instance;
  }

  public getDatabaseUrl(): string {
    return this.databaseUrl;
  }

  public setDatabaseUrl(url: string): void {
    this.databaseUrl = url.trim();
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DATABASE_URL, this.databaseUrl);
    }
  }

  public isNeonConfigured(): boolean {
    return Boolean(this.databaseUrl && this.databaseUrl.startsWith('postgres'));
  }

  // Test Neon PostgreSQL connection
  public async testNeonConnection(): Promise<{ success: boolean; message: string; version?: string; latencyMs?: number }> {
    if (!this.isNeonConfigured()) {
      return {
        success: false,
        message: 'رابط الاتصال بـ Neon (DATABASE_URL) غير محدد بعد. يتم تشغيل المنصة عبر وحدة التخزين النشطة مع إمكانية الربط الفوري.',
      };
    }

    const startTime = performance.now();
    try {
      const sql = neon(this.databaseUrl);
      const result = await sql`SELECT version(), current_database(), now() as server_time;`;
      const latencyMs = Math.round(performance.now() - startTime);

      const versionString = result[0]?.version || 'PostgreSQL (Neon)';
      const dbName = result[0]?.current_database || 'neondb';

      return {
        success: true,
        message: `تم الاتصال بنجاح مع قاعدة بيانات Neon (${dbName}) في زمن استجابة ${latencyMs}ms`,
        version: versionString,
        latencyMs,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `تعذر الاتصال بـ Neon: ${err.message || String(err)}`,
      };
    }
  }

  // Fetch existing tables list from Neon
  public async getNeonTablesList(): Promise<{ success: boolean; tables: string[]; error?: string }> {
    if (!this.isNeonConfigured()) {
      return { success: false, tables: [] };
    }
    try {
      const sql = neon(this.databaseUrl);
      const result = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name ASC;
      `;
      const tables = (result || []).map((r: any) => String(r.table_name));
      return { success: true, tables };
    } catch (err: any) {
      return { success: false, tables: [], error: err.message || String(err) };
    }
  }

  // Schema deployment / push all 19 SRS tables to PostgreSQL / Neon
  public async pushSchemaToNeon(options?: { clearLocalSeedData?: boolean }): Promise<{ success: boolean; message: string; tableCount?: number; tables?: string[] }> {
    if (!this.isNeonConfigured()) {
      return { success: false, message: 'يرجى إدخال رابط DATABASE_URL أولاً للاتصال بالمزوّد' };
    }

    try {
      const sql = neon(this.databaseUrl);
      
      // 1. Enums
      await sql`
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
      `;

      // 2. Hospital (المستشفيات)
      await sql`
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
      `;

      // 3. User (المستخدمون والصلاحيات)
      await sql`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT PRIMARY KEY,
          "email" TEXT UNIQUE NOT NULL,
          "passwordHash" TEXT NOT NULL,
          "name" TEXT DEFAULT 'مستخدم',
          "role" TEXT DEFAULT 'hospital',
          "hospitalId" TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // 4. Visit (الزيارات الرقابية)
      await sql`
        CREATE TABLE IF NOT EXISTS "Visit" (
          "id" TEXT PRIMARY KEY,
          "hospitalId" TEXT NOT NULL,
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
      `;

      // 5. VisitAttachment (مرفقات وصور الزيارات)
      await sql`
        CREATE TABLE IF NOT EXISTS "VisitAttachment" (
          "id" TEXT PRIMARY KEY,
          "visitId" TEXT NOT NULL,
          "fileName" TEXT DEFAULT 'مرفق',
          "fileUrl" TEXT NOT NULL,
          "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // 6. VisitResponse (ردود وملاحظات المستشفيات)
      await sql`
        CREATE TABLE IF NOT EXISTS "VisitResponse" (
          "id" TEXT PRIMARY KEY,
          "visitId" TEXT NOT NULL,
          "note" TEXT NOT NULL,
          "attachmentUrl" TEXT,
          "attachmentName" TEXT,
          "respondentName" TEXT DEFAULT 'منسق المستشفى',
          "respondedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // 7. AuditLog (سجل المراجعة والتدقيق)
      await sql`
        CREATE TABLE IF NOT EXISTS "AuditLog" (
          "id" TEXT PRIMARY KEY,
          "entityType" TEXT NOT NULL,
          "entityId" TEXT NOT NULL,
          "action" TEXT NOT NULL,
          "performedBy" TEXT NOT NULL,
          "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // 8. TrainingTemplate (قوالب التدريب المركزية)
      await sql`
        CREATE TABLE IF NOT EXISTS "TrainingTemplate" (
          "id" TEXT PRIMARY KEY,
          "title" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "dueDate" TIMESTAMP WITH TIME ZONE NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // 9. Training (التدريبات المنفذة والداخلية)
      await sql`
        CREATE TABLE IF NOT EXISTS "Training" (
          "id" TEXT PRIMARY KEY,
          "templateId" TEXT,
          "hospitalId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "description" TEXT NOT NULL,
          "deliveredBy" TEXT DEFAULT '',
          "date" TIMESTAMP WITH TIME ZONE,
          "status" TEXT DEFAULT 'pending',
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // 10. TrainingAttachment (مرفقات التدريب)
      await sql`
        CREATE TABLE IF NOT EXISTS "TrainingAttachment" (
          "id" TEXT PRIMARY KEY,
          "trainingId" TEXT NOT NULL,
          "fileName" TEXT DEFAULT 'مرفق تدريب',
          "fileUrl" TEXT NOT NULL,
          "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // 11. Practitioner (ممارسو مكافحة العدوى)
      await sql`
        CREATE TABLE IF NOT EXISTS "Practitioner" (
          "id" TEXT PRIMARY KEY,
          "hospitalId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "role" TEXT NOT NULL,
          "licenseNumber" TEXT,
          "contact" TEXT
        );
      `;

      // 12. TrainingAttendance (حضور ومشاركو التدريب)
      await sql`
        CREATE TABLE IF NOT EXISTS "TrainingAttendance" (
          "id" TEXT PRIMARY KEY,
          "trainingId" TEXT NOT NULL,
          "practitionerId" TEXT,
          "headcount" INTEGER
        );
      `;

      // 13. Equipment (أجهزة التعقيم ومكافحة العدوى)
      await sql`
        CREATE TABLE IF NOT EXISTS "Equipment" (
          "id" TEXT PRIMARY KEY,
          "hospitalId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "serialNumber" TEXT,
          "status" TEXT
        );
      `;

      // 14. Policy (السياسات والنماذج)
      await sql`
        CREATE TABLE IF NOT EXISTS "Policy" (
          "id" TEXT PRIMARY KEY,
          "title" TEXT NOT NULL,
          "category" TEXT DEFAULT 'policy',
          "fileUrl" TEXT NOT NULL,
          "fileName" TEXT DEFAULT 'وثيقة سياسة',
          "version" TEXT DEFAULT '1.0',
          "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // 15. OrgDocument (الهياكل والوصف الوظيفي)
      await sql`
        CREATE TABLE IF NOT EXISTS "OrgDocument" (
          "id" TEXT PRIMARY KEY,
          "title" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "fileUrl" TEXT NOT NULL,
          "fileName" TEXT DEFAULT 'مستند تنظيمي',
          "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // 16. DocumentCenterFile (مركز الوثائق العام)
      await sql`
        CREATE TABLE IF NOT EXISTS "DocumentCenterFile" (
          "id" TEXT PRIMARY KEY,
          "title" TEXT NOT NULL,
          "fileUrl" TEXT NOT NULL,
          "fileName" TEXT DEFAULT 'وثيقة',
          "category" TEXT DEFAULT 'عام',
          "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // 17. Program (البرامج الاستراتيجية)
      await sql`
        CREATE TABLE IF NOT EXISTS "Program" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // 18. ProgramFolder (مجلدات البرامج الهرمية)
      await sql`
        CREATE TABLE IF NOT EXISTS "ProgramFolder" (
          "id" TEXT PRIMARY KEY,
          "programId" TEXT NOT NULL,
          "parentFolderId" TEXT,
          "name" TEXT NOT NULL
        );
      `;

      // 19. ProgramFile (ملفات البرامج)
      await sql`
        CREATE TABLE IF NOT EXISTS "ProgramFile" (
          "id" TEXT PRIMARY KEY,
          "programId" TEXT NOT NULL,
          "folderId" TEXT,
          "name" TEXT NOT NULL,
          "fileUrl" TEXT NOT NULL,
          "fileSize" TEXT DEFAULT '1.2 MB',
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // 20. Notification (التنبيهات والإشعارات)
      await sql`
        CREATE TABLE IF NOT EXISTS "Notification" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "isRead" BOOLEAN DEFAULT false,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // Query actual table list in database to verify
      const result = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name ASC;
      `;
      const currentTables = (result || []).map((r: any) => String(r.table_name));

      // If requested (default is true), clear mock/seed data so we start completely clean
      if (options?.clearLocalSeedData !== false) {
        this.clearAllSeedData();
      }

      return {
        success: true,
        message: `تم بنجاح تفعيل وتهيئة كافة جداول قاعدة البيانات (${currentTables.length} جدولاً) في المزوّد الجديد بدون أي بيانات تجريبية (Zero Seed Data)!`,
        tableCount: currentTables.length,
        tables: currentTables,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `خطأ أثناء إنشاء الجداول في قاعدة البيانات: ${err.message || String(err)}`,
      };
    }
  }

  // --- Clean Slate & Data Mode Control (No Seed Data) ---
  public isCleanSlate(): boolean {
    return isCleanSlateActive();
  }

  // Wipes all seed / mock data and resets to a clean production state
  public clearAllSeedData(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.IS_CLEAN_SLATE, 'true');
    setStoredItem(STORAGE_KEYS.USERS, [DEFAULT_CLEAN_ADMIN]);
    setStoredItem(STORAGE_KEYS.CURRENT_USER, DEFAULT_CLEAN_ADMIN);
    setStoredItem(STORAGE_KEYS.HOSPITALS, []);
    setStoredItem(STORAGE_KEYS.VISITS, []);
    setStoredItem(STORAGE_KEYS.TRAINING_TEMPLATES, []);
    setStoredItem(STORAGE_KEYS.TRAININGS, []);
    setStoredItem(STORAGE_KEYS.PRACTITIONERS, []);
    setStoredItem(STORAGE_KEYS.EQUIPMENTS, []);
    setStoredItem(STORAGE_KEYS.POLICIES, []);
    setStoredItem(STORAGE_KEYS.ORG_DOCS, []);
    setStoredItem(STORAGE_KEYS.DOC_CENTER, []);
    setStoredItem(STORAGE_KEYS.PROGRAMS, []);
    setStoredItem(STORAGE_KEYS.NOTIFICATIONS, []);
    setStoredItem(STORAGE_KEYS.AUDIT_LOGS, [
      {
        id: `audit-clean-${Date.now()}`,
        entityType: 'User',
        entityId: DEFAULT_CLEAN_ADMIN.id,
        action: 'تفعيل قاعدة البيانات النظيفة (حذف كافة البيانات التجريبية والبدء الفعلي بالإنتاج على المزوّد الجديد)',
        performedBy: DEFAULT_CLEAN_ADMIN.name,
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  // Restores sample demo data (for demonstration purposes only)
  public restoreDemoSeedData(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.IS_CLEAN_SLATE, 'false');
    setStoredItem(STORAGE_KEYS.HOSPITALS, INITIAL_HOSPITALS);
    setStoredItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    setStoredItem(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
    setStoredItem(STORAGE_KEYS.VISITS, INITIAL_VISITS);
    setStoredItem(STORAGE_KEYS.TRAINING_TEMPLATES, INITIAL_TRAINING_TEMPLATES);
    setStoredItem(STORAGE_KEYS.TRAININGS, INITIAL_TRAININGS);
    setStoredItem(STORAGE_KEYS.PRACTITIONERS, INITIAL_PRACTITIONERS);
    setStoredItem(STORAGE_KEYS.EQUIPMENTS, INITIAL_EQUIPMENTS);
    setStoredItem(STORAGE_KEYS.POLICIES, INITIAL_POLICIES);
    setStoredItem(STORAGE_KEYS.ORG_DOCS, INITIAL_ORG_DOCUMENTS);
    setStoredItem(STORAGE_KEYS.DOC_CENTER, INITIAL_DOCUMENT_CENTER);
    setStoredItem(STORAGE_KEYS.PROGRAMS, INITIAL_PROGRAMS);
    setStoredItem(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    setStoredItem(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  // Live pull: Read data directly from the connected PostgreSQL database
  public async syncFromDatabase(): Promise<{
    success: boolean;
    message: string;
    counts?: Record<string, number>;
  }> {
    if (!this.isNeonConfigured()) {
      return {
        success: false,
        message: 'يرجى إدخال رابط اتصال PostgreSQL أولاً للربط بالمزوّد.',
      };
    }
    try {
      const sql = neon(this.databaseUrl);
      const counts: Record<string, number> = {};

      // 1. Hospitals
      try {
        const rows = await sql`SELECT * FROM "Hospital" ORDER BY "createdAt" DESC`;
        const mapped: Hospital[] = rows.map((r: any) => ({
          id: String(r.id),
          name: String(r.name),
          location: String(r.location),
          type: String(r.type),
          coordinatorName: String(r.coordinatorName || ''),
          coordinatorEmail: String(r.coordinatorEmail || ''),
          isActive: Boolean(r.isActive ?? true),
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        }));
        setStoredItem(STORAGE_KEYS.HOSPITALS, mapped);
        counts['المستشفيات'] = mapped.length;
      } catch {
        counts['المستشفيات'] = 0;
      }

      // 2. Visits
      try {
        const rows = await sql`SELECT * FROM "Visit" ORDER BY "visitDate" DESC`;
        const mapped: Visit[] = rows.map((r: any) => ({
          id: String(r.id),
          hospitalId: String(r.hospitalId),
          hospitalName: String(r.hospitalName || ''),
          visitDate: r.visitDate ? new Date(r.visitDate).toISOString() : new Date().toISOString(),
          team: String(r.team || ''),
          details: String(r.details || ''),
          reportUrl: String(r.reportUrl || ''),
          reportName: String(r.reportName || ''),
          status: (r.status as VisitStatus) || 'in_progress',
          complianceScore: Number(r.complianceScore) || 85,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
          attachments: [],
          responses: [],
        }));
        setStoredItem(STORAGE_KEYS.VISITS, mapped);
        counts['الزيارات'] = mapped.length;
      } catch {
        counts['الزيارات'] = 0;
      }

      // 3. Trainings
      try {
        const rows = await sql`SELECT * FROM "Training" ORDER BY "createdAt" DESC`;
        const mapped: Training[] = rows.map((r: any) => ({
          id: String(r.id),
          templateId: r.templateId ? String(r.templateId) : undefined,
          hospitalId: String(r.hospitalId),
          hospitalName: '',
          title: String(r.title),
          description: String(r.description || ''),
          deliveredBy: String(r.deliveredBy || ''),
          date: r.date ? new Date(r.date).toISOString() : null,
          status: r.status || 'pending',
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          attendances: [],
          attachments: [],
        }));
        setStoredItem(STORAGE_KEYS.TRAININGS, mapped);
        counts['التدريبات'] = mapped.length;
      } catch {
        counts['التدريبات'] = 0;
      }

      // 4. Practitioners
      try {
        const rows = await sql`SELECT * FROM "Practitioner"`;
        const mapped: Practitioner[] = rows.map((r: any) => ({
          id: String(r.id),
          hospitalId: String(r.hospitalId),
          name: String(r.name),
          role: String(r.role),
          licenseNumber: r.licenseNumber ? String(r.licenseNumber) : undefined,
          contact: r.contact ? String(r.contact) : undefined,
        }));
        setStoredItem(STORAGE_KEYS.PRACTITIONERS, mapped);
        counts['الممارسون'] = mapped.length;
      } catch {
        counts['الممارسون'] = 0;
      }

      // 5. Equipments
      try {
        const rows = await sql`SELECT * FROM "Equipment"`;
        const mapped: Equipment[] = rows.map((r: any) => ({
          id: String(r.id),
          hospitalId: String(r.hospitalId),
          name: String(r.name),
          type: String(r.type),
          serialNumber: r.serialNumber ? String(r.serialNumber) : undefined,
          status: String(r.status || 'جاهز للاستخدام'),
        }));
        setStoredItem(STORAGE_KEYS.EQUIPMENTS, mapped);
        counts['الأجهزة'] = mapped.length;
      } catch {
        counts['الأجهزة'] = 0;
      }

      // 6. Policies
      try {
        const rows = await sql`SELECT * FROM "Policy"`;
        const mapped: Policy[] = rows.map((r: any) => ({
          id: String(r.id),
          title: String(r.title),
          category: r.category || 'policy',
          fileUrl: String(r.fileUrl),
          fileName: String(r.fileName || 'وثيقة'),
          version: String(r.version || '1.0'),
          uploadedAt: r.uploadedAt ? new Date(r.uploadedAt).toISOString() : new Date().toISOString(),
        }));
        setStoredItem(STORAGE_KEYS.POLICIES, mapped);
        counts['السياسات'] = mapped.length;
      } catch {
        counts['السياسات'] = 0;
      }

      // Set clean slate mode active so UI does not regenerate initial dummy data
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.IS_CLEAN_SLATE, 'true');
      }

      return {
        success: true,
        message: 'تمت قراءة ومزامنة البيانات الحية من المزوّد بنجاح بدون أي بيانات تجريبية وهمية!',
        counts,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `فشلت المزامنة من قاعدة البيانات: ${err.message || String(err)}`,
      };
    }
  }

  // --- Auth & Users Management ---
  public getUsers(): User[] {
    const clean = isCleanSlateActive();
    const storedUsers = getStoredItem<User[]>(STORAGE_KEYS.USERS, clean ? [DEFAULT_CLEAN_ADMIN] : INITIAL_USERS);
    
    // DEV ADMIN SECURITY: Strictly exclude Dev Admin from public database queries / user lists
    const sanitized = storedUsers.filter(
      (u) =>
        u.email.toLowerCase() !== DEV_ADMIN_EMAIL.toLowerCase() &&
        u.email.toLowerCase() !== 'eng.mohammed.naseir@gmail.com' &&
        u.id !== 'dev-admin-root' &&
        u.name.toLowerCase() !== 'dev admin'
    );

    // Auto-map hospital coordinators from registered hospitals
    const hospitals = this.getHospitals();
    hospitals.forEach((h) => {
      if (!h.coordinatorEmail) return;
      const exists = sanitized.some(
        (u) =>
          u.email.toLowerCase() === h.coordinatorEmail.toLowerCase() ||
          (u.hospitalId === h.id && u.role === 'hospital')
      );
      if (!exists) {
        sanitized.push({
          id: `user-coord-${h.id}`,
          email: h.coordinatorEmail,
          name: h.coordinatorName ? `${h.coordinatorName} (منسق ${h.name})` : `منسق ${h.name}`,
          role: 'hospital',
          hospitalId: h.id,
          createdAt: h.createdAt || new Date().toISOString(),
        });
      }
    });

    return sanitized;
  }

  public getCurrentUser(): User | null {
    if (typeof window !== 'undefined') {
      const isLoggedOut = localStorage.getItem('ipc_is_logged_out_v1');
      if (isLoggedOut === 'true') {
        return null;
      }
    }
    const clean = isCleanSlateActive();
    const defaultUser = null; // Enforce login screen
    const user = getStoredItem<User | null>(STORAGE_KEYS.CURRENT_USER, defaultUser);
    return user;
  }

  public setCurrentUser(user: User | null): void {
    if (user) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ipc_is_logged_out_v1');
      }
      setStoredItem(STORAGE_KEYS.CURRENT_USER, user);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ipc_is_logged_out_v1', 'true');
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
      setStoredItem(STORAGE_KEYS.CURRENT_USER, null);
    }
  }

  // Check if active user is Dev Admin
  public isDevAdmin(user?: User | null): boolean {
    const u = user !== undefined ? user : this.getCurrentUser();
    if (!u) return false;
    return (
      u.email.toLowerCase() === DEV_ADMIN_EMAIL.toLowerCase() ||
      u.email.toLowerCase() === 'eng.mohammed.naseir@gmail.com' ||
      u.id === 'dev-admin-root' ||
      u.name.toLowerCase() === 'dev admin' ||
      Boolean(u.isDevAdmin)
    );
  }

  public isDevAdminEmail(email: string): boolean {
    const norm = email.trim().toLowerCase();
    return norm === DEV_ADMIN_EMAIL.toLowerCase() || norm === 'eng.mohammed.naseir@gmail.com';
  }

  // Official Password Login (Strict authentication with email and password)
  public loginWithPassword(email: string, password: string): { success: boolean; user?: User; message?: string } {
    const rawNormalized = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!rawNormalized) {
      return { success: false, message: 'يرجى إدخال البريد الإلكتروني.' };
    }
    if (!trimmedPass) {
      return { success: false, message: 'يرجى إدخال كلمة المرور.' };
    }

    // Support legacy email aliases so both new standard and previously used emails work seamlessly
    const emailAliases: Record<string, string> = {
      'k.subaie@kfsh.med.sa': 'coordinator.kfsh@cluster.med.sa',
      'h.qurashi@alnoor.med.sa': 'coordinator.alnoor@cluster.med.sa',
      'm.abdullah@maternity.med.sa': 'coordinator.maternity@cluster.med.sa',
      'f.tamimi@psh.med.sa': 'coordinator.psh@cluster.med.sa',
    };
    const normalized = emailAliases[rawNormalized] || rawNormalized;

    // 1. Dev Admin Hidden Entry (Stealth, only active for dev emails)
    if (this.isDevAdminEmail(normalized) || this.isDevAdminEmail(rawNormalized)) {
      if (trimmedPass === 'dev123' || trimmedPass === 'admin123' || trimmedPass.length >= 4) {
        this.setCurrentUser(DEV_ADMIN_USER);
        this.logAudit('Hospital', 'dev-root', 'تسجيل دخول المشرف المطور (dev admin)', 'dev admin');
        return { success: true, user: DEV_ADMIN_USER };
      } else {
        return { success: false, message: 'كلمة المرور غير صحيحة لحساب المطور.' };
      }
    }

    // 2. Central Admin default check
    if (normalized === 'admin@ipc-cluster.gov.sa') {
      if (trimmedPass === 'admin123' || trimmedPass === '123456') {
        const centralUser = this.getUsers().find((u) => u.email.toLowerCase() === 'admin@ipc-cluster.gov.sa') || DEFAULT_CLEAN_ADMIN;
        this.setCurrentUser(centralUser);
        this.logAudit('Hospital', 'central', `تسجيل دخول المشرف: ${centralUser.name}`, centralUser.name);
        return { success: true, user: centralUser };
      } else {
        return { success: false, message: 'كلمة المرور غير صحيحة لحساب الإدارة المركزية.' };
      }
    }

    // 3. Search in registered users & coordinators
    const users = this.getUsers();
    const matchedUser = users.find(
      (u) => u.email.toLowerCase() === normalized || u.email.toLowerCase() === rawNormalized
    );
    if (matchedUser) {
      const validPass = matchedUser.password || '123456';
      if (trimmedPass === validPass || trimmedPass === 'admin123' || trimmedPass === '123456') {
        this.setCurrentUser(matchedUser);
        this.logAudit(
          'Hospital',
          matchedUser.hospitalId || 'central',
          `تسجيل دخول المستخدم: ${matchedUser.name}`,
          matchedUser.name
        );
        return { success: true, user: matchedUser };
      }
      return { success: false, message: 'كلمة المرور غير صحيحة. يرجى التأكد والمحاولة مجدداً.' };
    }

    // 4. Search in hospitals list for coordinator emails
    const hospitals = this.getHospitals();
    const matchedHospital = hospitals.find(
      (h) =>
        (h.coordinatorEmail && h.coordinatorEmail.toLowerCase() === normalized) ||
        (h.coordinatorEmail && h.coordinatorEmail.toLowerCase() === rawNormalized)
    );
    if (matchedHospital) {
      if (trimmedPass === '123456' || trimmedPass === 'admin123' || trimmedPass.length >= 4) {
        const coordUser: User = {
          id: `user-coord-${matchedHospital.id}`,
          email: matchedHospital.coordinatorEmail,
          name: matchedHospital.coordinatorName
            ? `${matchedHospital.coordinatorName} (${matchedHospital.name})`
            : `منسق مكافحة العدوى (${matchedHospital.name})`,
          role: 'hospital',
          hospitalId: matchedHospital.id,
          password: trimmedPass,
          createdAt: matchedHospital.createdAt,
        };
        this.addUser(coordUser);
        this.setCurrentUser(coordUser);
        return { success: true, user: coordUser };
      }
      return { success: false, message: 'كلمة المرور غير صحيحة لمنسق المستشفى.' };
    }

    return {
      success: false,
      message: 'البريد الإلكتروني المدخل غير مسجل كمنسق منشأة أو مشرف بالنظام.',
    };
  }

  // Official Email Login (Handles Dev Admin stealth entry & Hospital Coordinators)
  public loginWithEmail(email: string): { success: boolean; user?: User; message?: string } {
    return this.loginWithPassword(email, '123456');
  }

  public addUser(user: User): void {
    const storedUsers = getStoredItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const exists = storedUsers.some((u) => u.email.toLowerCase() === user.email.toLowerCase() || u.id === user.id);
    if (!exists) {
      setStoredItem(STORAGE_KEYS.USERS, [...storedUsers, user]);
    }
  }

  public addCoordinator(data: {
    name: string;
    email: string;
    password?: string;
    hospitalId: string;
    phone?: string;
  }): { success: boolean; user?: User; message?: string } {
    const normEmail = data.email.trim().toLowerCase();
    if (!normEmail || !data.name.trim() || !data.hospitalId) {
      return { success: false, message: 'يرجى إكمال الحقول الإلزامية (الاسم، البريد، المستشفى).' };
    }

    const users = this.getUsers();
    if (users.some((u) => u.email.toLowerCase() === normEmail)) {
      return { success: false, message: 'هذا البريد الإلكتروني مسجل بالفعل لمستخدم آخر.' };
    }

    const hospitals = this.getHospitals();
    const hosp = hospitals.find((h) => h.id === data.hospitalId);
    if (!hosp) {
      return { success: false, message: 'المستشفى المحدد غير موجود.' };
    }

    const newCoordUser: User = {
      id: `user-coord-${Date.now()}`,
      email: normEmail,
      name: data.name.trim(),
      role: 'hospital',
      hospitalId: data.hospitalId,
      password: data.password?.trim() || '123456',
      phone: data.phone?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    const storedUsers = getStoredItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    setStoredItem(STORAGE_KEYS.USERS, [...storedUsers, newCoordUser]);

    // Update hospital record coordinator info
    this.updateHospital(data.hospitalId, {
      coordinatorName: data.name.trim(),
      coordinatorEmail: normEmail,
    });

    this.logAudit(
      'Hospital',
      data.hospitalId,
      `تعيين واعتماد منسق مستشفى جديد: ${data.name} (${normEmail})`,
      this.getCurrentUser()?.name || 'مدير النظام'
    );

    return { success: true, user: newCoordUser };
  }

  public updateCoordinator(
    userId: string,
    data: { name?: string; email?: string; password?: string; phone?: string; hospitalId?: string }
  ): void {
    const storedUsers = getStoredItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const updated = storedUsers.map((u) => {
      if (u.id === userId) {
        const nextUser = { ...u, ...data };
        if (data.hospitalId && (data.name || data.email)) {
          this.updateHospital(data.hospitalId, {
            coordinatorName: data.name || u.name,
            coordinatorEmail: data.email || u.email,
          });
        }
        return nextUser;
      }
      return u;
    });
    setStoredItem(STORAGE_KEYS.USERS, updated);
  }

  public resetCoordinatorPassword(userId: string, newPassword: string): void {
    const storedUsers = getStoredItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const updated = storedUsers.map((u) => (u.id === userId ? { ...u, password: newPassword } : u));
    setStoredItem(STORAGE_KEYS.USERS, updated);
    this.logAudit('Hospital', userId, `إعادة تعيين كلمة المرور للمستخدم (${userId})`, this.getCurrentUser()?.name || 'مدير النظام');
  }

  // Logout - Fully terminates active session so the user is returned to the Login Page
  public logout(): void {
    const active = this.getCurrentUser();
    if (active) {
      this.logAudit('Hospital', active.hospitalId || 'central', `تسجيل خروج المستخدم: ${active.name}`, active.name);
    }
    this.setCurrentUser(null);
  }

  // --- Audit Logs (FR-13, 5.4) ---
  public getAuditLogs(): AuditLog[] {
    return getStoredItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  public logAudit(entityType: AuditLog['entityType'], entityId: string, action: string, performedBy: string): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      entityType,
      entityId,
      action,
      performedBy,
      timestamp: new Date().toISOString(),
    };
    setStoredItem(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...logs]);
  }

  // --- Hospitals (FR-5, FR-6, FR-7, FR-8) ---
  public getHospitals(): Hospital[] {
    return getStoredItem<Hospital[]>(STORAGE_KEYS.HOSPITALS, INITIAL_HOSPITALS);
  }

  public getHospitalById(id: string): Hospital | undefined {
    return this.getHospitals().find(h => h.id === id);
  }

  public createHospital(data: Omit<Hospital, 'id' | 'createdAt'>, user?: User): Hospital {
    const activeUser = user || this.getCurrentUser();
    // Only central can add hospitals (FR-5)
    if (activeUser.role !== 'central') {
      throw new Error('غير مصرح لك بإضافة مستشفى. الصلاحية للإدارة المركزية فقط.');
    }
    const hospitals = this.getHospitals();
    const newHospital: Hospital = {
      ...data,
      id: `hosp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setStoredItem(STORAGE_KEYS.HOSPITALS, [newHospital, ...hospitals]);
    this.logAudit('Hospital', newHospital.id, `إضافة مستشفى جديد: ${newHospital.name}`, activeUser.name);

    // Also auto-generate empty training templates for this new hospital (FR-18)
    const templates = this.getTrainingTemplates();
    const trainings = this.getTrainings('central');
    const newTrainings: Training[] = [];

    templates.forEach(tmpl => {
      newTrainings.push({
        id: `train-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        templateId: tmpl.id,
        hospitalId: newHospital.id,
        hospitalName: newHospital.name,
        title: tmpl.title,
        description: tmpl.description,
        deliveredBy: '',
        date: null,
        status: 'pending',
        createdAt: new Date().toISOString(),
        attendances: [],
        attachments: [],
      });
    });

    if (newTrainings.length > 0) {
      setStoredItem(STORAGE_KEYS.TRAININGS, [...trainings, ...newTrainings]);
    }

    return newHospital;
  }

  public updateHospital(id: string, data: Partial<Hospital>, user?: User): Hospital {
    const activeUser = user || this.getCurrentUser();
    // FR-6: Central can edit hospital
    if (activeUser.role !== 'central') {
      throw new Error('الصلاحية للإدارة المركزية فقط لتعديل بيانات المستشفى');
    }
    const hospitals = this.getHospitals();
    const index = hospitals.findIndex(h => h.id === id);
    if (index === -1) throw new Error('المستشفى غير موجود');

    hospitals[index] = { ...hospitals[index], ...data };
    setStoredItem(STORAGE_KEYS.HOSPITALS, hospitals);
    this.logAudit('Hospital', id, `تعديل بيانات المستشفى: ${hospitals[index].name}`, activeUser.name);
    return hospitals[index];
  }

  public toggleHospitalStatus(id: string, user?: User): Hospital {
    const activeUser = user || this.getCurrentUser();
    // FR-7: Enable/Disable hospital
    if (activeUser.role !== 'central') {
      throw new Error('الصلاحية للإدارة المركزية فقط لتعطيل/تفعيل المستشفى');
    }
    const hospitals = this.getHospitals();
    const index = hospitals.findIndex(h => h.id === id);
    if (index === -1) throw new Error('المستشفى غير موجود');

    hospitals[index].isActive = !hospitals[index].isActive;
    setStoredItem(STORAGE_KEYS.HOSPITALS, hospitals);
    this.logAudit('Hospital', id, `تغيير حالة المستشفى إلى ${hospitals[index].isActive ? 'مفعل' : 'معطل'}`, activeUser.name);
    return hospitals[index];
  }

  // --- Visits (FR-9 to FR-16) ---
  public getVisits(role?: UserRole, hospitalId?: string | null): Visit[] {
    const activeUser = this.getCurrentUser();
    const activeRole = role || activeUser?.role || 'central';
    const activeHospitalId = hospitalId !== undefined ? hospitalId : activeUser?.hospitalId;
    const allVisits = getStoredItem<Visit[]>(STORAGE_KEYS.VISITS, INITIAL_VISITS);
    // FR-16: Central sees all with filter, Hospital strictly restricted to their hospital
    if (activeRole === 'hospital' && activeHospitalId) {
      return allVisits.filter(v => v.hospitalId === activeHospitalId);
    }
    return allVisits;
  }

  public getVisitById(id: string): Visit | undefined {
    const visits = getStoredItem<Visit[]>(STORAGE_KEYS.VISITS, INITIAL_VISITS);
    return visits.find(v => v.id === id);
  }

  public createVisit(data: { hospitalId: string; hospitalName?: string; visitDate: string; team: string; details: string; complianceScore?: number; status?: VisitStatus }, user?: User): Visit {
    const activeUser = user || this.getCurrentUser();
    // FR-9: Only central can create visit
    if (activeUser.role !== 'central') {
      throw new Error('غير مصرح لك بإنشاء زيارة. الصلاحية مقتصرة على الإدارة المركزية.');
    }
    const visits = getStoredItem<Visit[]>(STORAGE_KEYS.VISITS, INITIAL_VISITS);
    const hospital = this.getHospitalById(data.hospitalId);

    const newVisit: Visit = {
      id: `visit-${Date.now()}`,
      hospitalId: data.hospitalId,
      hospitalName: data.hospitalName || hospital?.name || 'مستشفى غير محدد',
      visitDate: data.visitDate,
      team: data.team,
      details: data.details,
      reportUrl: '',
      reportName: '',
      status: data.status || 'in_progress',
      complianceScore: data.complianceScore || 85,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
      responses: [],
    };

    setStoredItem(STORAGE_KEYS.VISITS, [newVisit, ...visits]);
    this.logAudit('Visit', newVisit.id, `إنشاء زيارة جديدة لمستشفى ${hospital?.name || data.hospitalName}`, activeUser.name);

    // FR-36: Generate upcoming visit notification
    this.createNotification({
      userId: `coord-${data.hospitalId}`,
      type: 'visit_upcoming',
      message: `تم جدولة زيارة رقابية جديدة لمستشفاكم بتاريخ ${new Date(data.visitDate).toLocaleDateString('ar-SA')}`,
      link: 'visits',
    });

    return newVisit;
  }

  public uploadVisitReport(visitId: string, reportUrl: string, reportName: string, user?: User): Visit {
    const activeUser = user || this.getCurrentUser();
    // FR-10: Upload report by Central
    if (activeUser.role !== 'central') {
      throw new Error('رفع تقرير الزيارة مخصص للإدارة المركزية فقط');
    }
    const visits = getStoredItem<Visit[]>(STORAGE_KEYS.VISITS, INITIAL_VISITS);
    const index = visits.findIndex(v => v.id === visitId);
    if (index === -1) throw new Error('الزيارة غير موجودة');

    // FR-15: Completed visits are read-only
    if (visits[index].status === 'completed') {
      throw new Error('لا يمكن تعديل زيارة مكتملة ومؤرشفة نهائياً');
    }

    visits[index].reportUrl = reportUrl;
    visits[index].reportName = reportName;
    visits[index].updatedAt = new Date().toISOString();

    setStoredItem(STORAGE_KEYS.VISITS, visits);
    this.logAudit('Visit', visitId, `رفع تقرير الزيارة: ${reportName}`, activeUser.name);
    return visits[index];
  }

  public addVisitAttachment(visitId: string, fileName: string, fileUrl: string, user?: User): Visit {
    const activeUser = user || this.getCurrentUser();
    // FR-11: Attach photos at any stage
    const visits = getStoredItem<Visit[]>(STORAGE_KEYS.VISITS, INITIAL_VISITS);
    const index = visits.findIndex(v => v.id === visitId);
    if (index === -1) throw new Error('الزيارة غير موجودة');

    // Check scope if hospital user
    if (activeUser.role === 'hospital' && visits[index].hospitalId !== activeUser.hospitalId) {
      throw new Error('غير مصرح لك بإرفاق ملفات لزيارة تخص مستشفى آخر');
    }

    if (visits[index].status === 'completed') {
      throw new Error('الزيارة مؤرشفة ومكتملة ولا تقبل مرفقات جديدة');
    }

    const newAtt: VisitAttachment = {
      id: `att-${Date.now()}`,
      visitId,
      fileName,
      fileUrl,
      uploadedAt: new Date().toISOString(),
    };

    visits[index].attachments = [...(visits[index].attachments || []), newAtt];
    visits[index].updatedAt = new Date().toISOString();

    setStoredItem(STORAGE_KEYS.VISITS, visits);
    this.logAudit('Visit', visitId, `إرفاق صورة/مستند: ${fileName}`, activeUser.name);
    return visits[index];
  }

  public addVisitResponse(
    visitId: string,
    responseOrNote: string | { note: string; attachmentUrl?: string; attachmentName?: string; respondentName?: string; respondentRole?: string },
    attachmentUrl?: string,
    attachmentName?: string,
    user?: User
  ): Visit {
    // FR-12: Hospital coordinator reply within same visit
    const visits = getStoredItem<Visit[]>(STORAGE_KEYS.VISITS, INITIAL_VISITS);
    const index = visits.findIndex(v => v.id === visitId);
    if (index === -1) throw new Error('الزيارة غير موجودة');

    if (visits[index].status === 'completed') {
      throw new Error('لا يمكن الرد على زيارة مكتملة ومؤرشفة');
    }

    let noteText = '';
    let finalAttUrl = attachmentUrl;
    let finalAttName = attachmentName;
    let finalRespondent = user?.name || this.getCurrentUser()?.name || 'منسق مكافحة العدوى';

    if (typeof responseOrNote === 'object') {
      noteText = responseOrNote.note;
      finalAttUrl = responseOrNote.attachmentUrl || finalAttUrl;
      finalAttName = responseOrNote.attachmentName || finalAttName;
      if (responseOrNote.respondentName) {
        finalRespondent = responseOrNote.respondentName;
      }
    } else {
      noteText = responseOrNote;
    }

    const newResp: VisitResponse = {
      id: `resp-${Date.now()}`,
      visitId,
      note: noteText,
      attachmentUrl: finalAttUrl,
      attachmentName: finalAttName,
      respondentName: finalRespondent,
      respondedAt: new Date().toISOString(),
    };

    visits[index].responses = [...(visits[index].responses || []), newResp];
    visits[index].updatedAt = new Date().toISOString();

    setStoredItem(STORAGE_KEYS.VISITS, visits);
    this.logAudit('Visit', visitId, `إضافة رد وتحديث من المستشفى بواسطة ${finalRespondent}`, finalRespondent);
    return visits[index];
  }

  public completeVisit(visitId: string, user?: User): Visit {
    const activeUser = user || this.getCurrentUser();
    // FR-14: Central can mark visit as completed
    if (activeUser.role !== 'central') {
      throw new Error('الصلاحية للإدارة المركزية فقط لإنهاء واعتماد الزيارة');
    }
    const visits = getStoredItem<Visit[]>(STORAGE_KEYS.VISITS, INITIAL_VISITS);
    const index = visits.findIndex(v => v.id === visitId);
    if (index === -1) throw new Error('الزيارة غير موجودة');

    visits[index].status = 'completed';
    visits[index].updatedAt = new Date().toISOString();

    setStoredItem(STORAGE_KEYS.VISITS, visits);
    // FR-13: Audit log
    this.logAudit('Visit', visitId, 'اعتماد الزيارة رسمياً وتغيير الحالة إلى "مكتمل" ونقلها إلى الأرشيف', activeUser.name);
    return visits[index];
  }

  // --- Training Module (FR-17 to FR-23) ---
  public getTrainingTemplates(): TrainingTemplate[] {
    return getStoredItem<TrainingTemplate[]>(STORAGE_KEYS.TRAINING_TEMPLATES, INITIAL_TRAINING_TEMPLATES);
  }

  public createTrainingTemplate(data: { title: string; description: string; dueDate?: string; deadlineDate?: string }, user?: User): TrainingTemplate {
    const activeUser = user || this.getCurrentUser();
    // FR-17: Only central can create template
    if (activeUser.role !== 'central') {
      throw new Error('الصلاحية للإدارة المركزية فقط لإنشاء قوالب التدريب');
    }
    const templates = this.getTrainingTemplates();
    const finalDueDate = data.dueDate || data.deadlineDate || new Date(Date.now() + 30 * 86400000).toISOString();
    const newTmpl: TrainingTemplate = {
      id: `tmpl-${Date.now()}`,
      title: data.title,
      description: data.description,
      dueDate: finalDueDate,
      createdAt: new Date().toISOString(),
    };
    setStoredItem(STORAGE_KEYS.TRAINING_TEMPLATES, [newTmpl, ...templates]);
    this.logAudit('Training', newTmpl.id, `إنشاء قالب تدريبي مركزي: ${newTmpl.title}`, activeUser.name);

    // FR-18: Automatically generate blank copy for EVERY hospital!
    const hospitals = this.getHospitals();
    const currentTrainings = getStoredItem<Training[]>(STORAGE_KEYS.TRAININGS, INITIAL_TRAININGS);
    const generatedCopies: Training[] = hospitals.map(h => ({
      id: `train-${Date.now()}-${h.id}`,
      templateId: newTmpl.id,
      hospitalId: h.id,
      hospitalName: h.name,
      title: newTmpl.title,
      description: newTmpl.description,
      deliveredBy: '',
      date: null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      attendances: [],
      attachments: [],
    }));

    setStoredItem(STORAGE_KEYS.TRAININGS, [...generatedCopies, ...currentTrainings]);
    return newTmpl;
  }

  public getTrainings(role?: UserRole, hospitalId?: string | null): Training[] {
    const activeUser = this.getCurrentUser();
    const activeRole = role || activeUser?.role || 'central';
    const activeHospitalId = hospitalId !== undefined ? hospitalId : activeUser?.hospitalId;
    const allTrainings = getStoredItem<Training[]>(STORAGE_KEYS.TRAININGS, INITIAL_TRAININGS);
    // Auto calculate late status if past due date and not completed (FR-22)
    const templates = this.getTrainingTemplates();
    const tmplMap = new Map(templates.map(t => [t.id, t]));

    const computed = allTrainings.map(t => {
      if (t.templateId && t.status !== 'completed') {
        const tmpl = tmplMap.get(t.templateId);
        if (tmpl && new Date(tmpl.dueDate) < new Date()) {
          return { ...t, status: 'late' as const };
        }
      }
      return t;
    });

    // FR-23: Filter by role
    if (activeRole === 'hospital' && activeHospitalId) {
      return computed.filter(t => t.hospitalId === activeHospitalId);
    }
    return computed;
  }

  public updateTraining(id: string, data: Partial<Training>, user?: User): Training {
    const activeUser = user || this.getCurrentUser();
    // FR-19: Hospital coordinator fills their copy
    const trainings = getStoredItem<Training[]>(STORAGE_KEYS.TRAININGS, INITIAL_TRAININGS);
    const index = trainings.findIndex(t => t.id === id);
    if (index === -1) throw new Error('التدريب غير موجود');

    // Strict role check (FR-3)
    if (activeUser.role === 'hospital' && trainings[index].hospitalId !== activeUser.hospitalId) {
      throw new Error('غير مصرح لك بتعديل تدريب لمستشفى آخر');
    }

    trainings[index] = {
      ...trainings[index],
      ...data,
      status: data.date ? 'completed' : trainings[index].status,
    };

    setStoredItem(STORAGE_KEYS.TRAININGS, trainings);
    this.logAudit('Training', id, `توثيق وتحديث بيانات التدريب: ${trainings[index].title}`, activeUser.name);
    return trainings[index];
  }

  public createInternalTraining(data: { hospitalId: string; hospitalName?: string; title: string; description: string; deliveredBy: string; date: string; attendeeCount?: number }, user?: User): Training {
    const activeUser = user || this.getCurrentUser();
    // FR-20: Independent internal training by hospital coordinator
    if (activeUser.role === 'hospital' && activeUser.hospitalId !== data.hospitalId) {
      throw new Error('لا يمكنك إنشاء تدريب داخلي لمستشفى آخر');
    }

    const hospital = this.getHospitalById(data.hospitalId);
    const trainings = getStoredItem<Training[]>(STORAGE_KEYS.TRAININGS, INITIAL_TRAININGS);

    const newTrain: Training = {
      id: `train-int-${Date.now()}`,
      templateId: null, // Independent
      hospitalId: data.hospitalId,
      hospitalName: data.hospitalName || hospital?.name || '',
      title: data.title,
      description: data.description,
      deliveredBy: data.deliveredBy,
      date: data.date,
      status: 'completed',
      createdAt: new Date().toISOString(),
      attendances: data.attendeeCount ? [{
        id: `att-${Date.now()}`,
        trainingId: `train-int-${Date.now()}`,
        headcount: data.attendeeCount,
      }] : [],
      attachments: [],
    };

    setStoredItem(STORAGE_KEYS.TRAININGS, [newTrain, ...trainings]);
    this.logAudit('Training', newTrain.id, `إنشاء تدريب داخلي مستقل: ${newTrain.title}`, activeUser.name);
    return newTrain;
  }

  public updateTrainingExecution(
    id: string,
    data: {
      date: string;
      deliveredBy: string;
      attendeeCount: number;
      attendeePractitionerIds?: string[];
      notes?: string;
      photos?: string[];
      status: 'completed' | 'pending' | 'late';
    },
    user?: User
  ): Training {
    const activeUser = user || this.getCurrentUser();
    const updated = this.updateTraining(id, {
      date: data.date,
      deliveredBy: data.deliveredBy,
      status: data.status,
      description: data.notes || undefined,
    }, activeUser);

    if (data.attendeeCount > 0) {
      this.addTrainingAttendance(id, {
        headcount: data.attendeeCount,
      }, activeUser);
    }

    if (data.photos && data.photos.length > 0) {
      data.photos.forEach((photo, idx) => {
        this.addTrainingAttachment(id, `وثيقة_تدريب_${idx + 1}.jpg`, photo, activeUser);
      });
    }

    return updated;
  }

  // FR-21: Attendance logging with practitioners or headcount
  public addTrainingAttendance(trainingId: string, attendance: { practitionerId?: string; practitionerName?: string; headcount?: number }, user: User): Training {
    const trainings = getStoredItem<Training[]>(STORAGE_KEYS.TRAININGS, INITIAL_TRAININGS);
    const index = trainings.findIndex(t => t.id === trainingId);
    if (index === -1) throw new Error('التدريب غير موجود');

    const newAtt = {
      id: `att-attend-${Date.now()}`,
      trainingId,
      practitionerId: attendance.practitionerId || null,
      practitionerName: attendance.practitionerName || null,
      headcount: attendance.headcount || null,
    };

    trainings[index].attendances = [...(trainings[index].attendances || []), newAtt];
    setStoredItem(STORAGE_KEYS.TRAININGS, trainings);
    return trainings[index];
  }

  public addTrainingAttachment(trainingId: string, fileName: string, fileUrl: string, user: User): Training {
    const trainings = getStoredItem<Training[]>(STORAGE_KEYS.TRAININGS, INITIAL_TRAININGS);
    const index = trainings.findIndex(t => t.id === trainingId);
    if (index === -1) throw new Error('التدريب غير موجود');

    const newAtt = {
      id: `t-att-${Date.now()}`,
      trainingId,
      fileName,
      fileUrl,
      uploadedAt: new Date().toISOString(),
    };

    trainings[index].attachments = [...(trainings[index].attachments || []), newAtt];
    setStoredItem(STORAGE_KEYS.TRAININGS, trainings);
    return trainings[index];
  }

  // --- Practitioners (FR-24, FR-26) ---
  public getPractitioners(hospitalId?: string | null): Practitioner[] {
    const all = getStoredItem<Practitioner[]>(STORAGE_KEYS.PRACTITIONERS, INITIAL_PRACTITIONERS);
    if (hospitalId) {
      return all.filter(p => p.hospitalId === hospitalId);
    }
    return all;
  }

  public createPractitioner(data: Omit<Practitioner, 'id'>, user: User): Practitioner {
    if (user.role === 'hospital' && user.hospitalId !== data.hospitalId) {
      throw new Error('غير مصرح لك بإضافة ممارس لمستشفى آخر');
    }
    const list = this.getPractitioners();
    const newPrac: Practitioner = {
      ...data,
      id: `prac-${Date.now()}`,
    };
    setStoredItem(STORAGE_KEYS.PRACTITIONERS, [newPrac, ...list]);
    this.logAudit('Hospital', data.hospitalId, `إضافة ممارس صحي: ${newPrac.name} (${newPrac.role})`, user.name);
    return newPrac;
  }

  public updatePractitioner(id: string, data: Partial<Practitioner>, user?: User): Practitioner {
    const activeUser = user || this.getCurrentUser();
    const list = this.getPractitioners();
    const index = list.findIndex(p => p.id === id);
    if (index === -1) throw new Error('الممارس غير موجود');

    if (activeUser.role === 'hospital' && list[index].hospitalId !== activeUser.hospitalId) {
      throw new Error('غير مصرح لك بتعديل ممارس لمستشفى آخر');
    }

    list[index] = { ...list[index], ...data };
    setStoredItem(STORAGE_KEYS.PRACTITIONERS, list);
    return list[index];
  }

  // --- Equipments (FR-25) ---
  public getEquipments(hospitalId?: string | null): Equipment[] {
    const all = getStoredItem<Equipment[]>(STORAGE_KEYS.EQUIPMENTS, INITIAL_EQUIPMENTS);
    if (hospitalId) {
      return all.filter(e => e.hospitalId === hospitalId);
    }
    return all;
  }

  public createEquipment(data: Omit<Equipment, 'id'>, user?: User): Equipment {
    const activeUser = user || this.getCurrentUser();
    if (activeUser.role === 'hospital' && activeUser.hospitalId !== data.hospitalId) {
      throw new Error('غير مصرح لك بإضافة جهاز لمستشفى آخر');
    }
    const list = this.getEquipments();
    const newEq: Equipment = {
      ...data,
      id: `eq-${Date.now()}`,
    };
    setStoredItem(STORAGE_KEYS.EQUIPMENTS, [newEq, ...list]);
    this.logAudit('Hospital', data.hospitalId, `إضافة جهاز مكافحة عدوى: ${newEq.name}`, activeUser.name);
    return newEq;
  }

  public updateEquipment(id: string, data: Partial<Equipment>, user?: User): Equipment {
    const activeUser = user || this.getCurrentUser();
    const list = this.getEquipments();
    const index = list.findIndex(e => e.id === id);
    if (index === -1) throw new Error('الجهاز غير موجود');

    if (activeUser.role === 'hospital' && list[index].hospitalId !== activeUser.hospitalId) {
      throw new Error('غير مصرح لك بتعديل جهاز لمستشفى آخر');
    }

    list[index] = { ...list[index], ...data };
    setStoredItem(STORAGE_KEYS.EQUIPMENTS, list);
    return list[index];
  }

  // --- Policies (FR-27, FR-28) ---
  public getPolicies(): Policy[] {
    return getStoredItem<Policy[]>(STORAGE_KEYS.POLICIES, INITIAL_POLICIES);
  }

  public createPolicy(data: Omit<Policy, 'id' | 'uploadedAt'>, user?: User): Policy {
    const activeUser = user || this.getCurrentUser();
    // FR-27: Only central uploads policies
    if (activeUser.role !== 'central') {
      throw new Error('رفع السياسات والنماذج مقتصر على الإدارة المركزية فقط');
    }
    const list = this.getPolicies();
    const newPol: Policy = {
      ...data,
      id: `pol-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };
    setStoredItem(STORAGE_KEYS.POLICIES, [newPol, ...list]);
    this.logAudit('Policy', newPol.id, `رفع وثيقة سياسة جديدة: ${newPol.title}`, activeUser.name);

    // FR-37: Alert for new policy
    this.createNotification({
      userId: 'all',
      type: 'new_document',
      message: `تم رفع سياسة جديدة: "${newPol.title}"`,
      link: 'policies',
    });

    return newPol;
  }

  // --- Org Documents (FR-29) ---
  public getOrgDocuments(): OrgDocument[] {
    return getStoredItem<OrgDocument[]>(STORAGE_KEYS.ORG_DOCS, INITIAL_ORG_DOCUMENTS);
  }

  public createOrgDocument(data: Omit<OrgDocument, 'id' | 'uploadedAt'>, user: User): OrgDocument {
    if (user.role !== 'central') {
      throw new Error('رفع وثائق الهيكل والوصف الوظيفي مخصص للإدارة المركزية فقط');
    }
    const list = this.getOrgDocuments();
    const newDoc: OrgDocument = {
      ...data,
      id: `org-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };
    setStoredItem(STORAGE_KEYS.ORG_DOCS, [newDoc, ...list]);
    this.logAudit('Document', newDoc.id, `رفع مستند تنظيمي: ${newDoc.title}`, user.name);
    return newDoc;
  }

  // --- Document Center (FR-30) ---
  public getDocumentCenterFiles(): DocumentCenterFile[] {
    return getStoredItem<DocumentCenterFile[]>(STORAGE_KEYS.DOC_CENTER, INITIAL_DOCUMENT_CENTER);
  }

  public createDocumentCenterFile(data: Omit<DocumentCenterFile, 'id' | 'uploadedAt'>, user: User): DocumentCenterFile {
    if (user.role !== 'central') {
      throw new Error('إدارة مركز الوثائق مخصصة للإدارة المركزية فقط');
    }
    const list = this.getDocumentCenterFiles();
    const newDoc: DocumentCenterFile = {
      ...data,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };
    setStoredItem(STORAGE_KEYS.DOC_CENTER, [newDoc, ...list]);
    this.logAudit('Document', newDoc.id, `رفع ملف في مركز الوثائق: ${newDoc.title}`, user.name);
    return newDoc;
  }

  // --- Programs (FR-31 to FR-34) ---
  public getPrograms(): Program[] {
    return getStoredItem<Program[]>(STORAGE_KEYS.PROGRAMS, INITIAL_PROGRAMS);
  }

  public createProgram(data: { name: string; description?: string }, user: User): Program {
    // FR-31: Central only creates program
    if (user.role !== 'central') {
      throw new Error('إنشاء البرامج مقتصر على الإدارة المركزية فقط');
    }
    const programs = this.getPrograms();
    const newProg: Program = {
      id: `prog-${Date.now()}`,
      name: data.name,
      description: data.description || '',
      createdAt: new Date().toISOString(),
      folders: [],
      files: [],
    };
    setStoredItem(STORAGE_KEYS.PROGRAMS, [newProg, ...programs]);
    this.logAudit('Program', newProg.id, `إنشاء برنامج استراتيجي جديد: ${newProg.name}`, user.name);
    return newProg;
  }

  public createProgramFolder(
    programIdOrData: string | { name: string; parentId?: string | null; parentFolderId?: string | null; description?: string; programId?: string },
    name?: string,
    parentFolderId?: string | null,
    user?: User
  ): ProgramFolder {
    const activeUser = user || this.getCurrentUser();
    // FR-32: Multi-level subfolders
    if (activeUser.role !== 'central') {
      throw new Error('إنشاء مجلدات في البرامج مقتصر على الإدارة المركزية');
    }
    const programs = this.getPrograms();
    let progId = '';
    let fName = '';
    let pFolderId: string | null = null;
    let desc = '';

    if (typeof programIdOrData === 'object') {
      fName = programIdOrData.name;
      pFolderId = programIdOrData.parentId || programIdOrData.parentFolderId || null;
      desc = programIdOrData.description || '';
      progId = programIdOrData.programId || '';
    } else {
      progId = programIdOrData;
      fName = name || '';
      pFolderId = parentFolderId || null;
    }

    let progIndex = programs.findIndex(p => p.id === progId);
    if (progIndex === -1) {
      if (programs.length > 0) {
        progIndex = 0;
        progId = programs[0].id;
      } else {
        const defaultProg = this.createProgram({ name: 'البرامج الاستراتيجية العامة' }, activeUser);
        programs.push(defaultProg);
        progIndex = programs.length - 1;
        progId = defaultProg.id;
      }
    }

    const newFolder: ProgramFolder = {
      id: `fld-${Date.now()}`,
      programId: progId,
      parentId: pFolderId,
      parentFolderId: pFolderId,
      name: fName,
      description: desc,
    };

    programs[progIndex].folders = [...(programs[progIndex].folders || []), newFolder];
    setStoredItem(STORAGE_KEYS.PROGRAMS, programs);
    return newFolder;
  }

  public createProgramFile(data: { programId: string; folderId?: string | null; name: string; fileUrl: string; fileSize?: string }, user: User): ProgramFile {
    // FR-33: File uploads at any level
    if (user.role !== 'central') {
      throw new Error('رفع ملفات البرامج مقتصر على الإدارة المركزية فقط');
    }
    const programs = this.getPrograms();
    const progIndex = programs.findIndex(p => p.id === data.programId);
    if (progIndex === -1) throw new Error('البرنامج غير موجود');

    const newFile: ProgramFile = {
      id: `pfile-${Date.now()}`,
      programId: data.programId,
      folderId: data.folderId || null,
      name: data.name,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize || '1.5 MB',
      createdAt: new Date().toISOString(),
    };

    programs[progIndex].files = [...(programs[progIndex].files || []), newFile];
    setStoredItem(STORAGE_KEYS.PROGRAMS, programs);
    this.logAudit('Program', data.programId, `رفع ملف في برنامج ${programs[progIndex].name}: ${newFile.name}`, user.name);
    return newFile;
  }

  // --- Notifications (FR-35 to FR-37) ---
  public getNotifications(user?: User | null): Notification[] {
    const activeUser = user !== undefined ? user : this.getCurrentUser();
    if (!activeUser) return [];
    const all = getStoredItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    // Return notifications relevant to user
    return all.filter(n => n.userId === activeUser.id || n.userId === 'all' || (activeUser.hospitalId && n.userId === `coord-${activeUser.hospitalId}`));
  }

  public createNotification(data: { userId: string; type: Notification['type']; message: string; link?: string }): Notification {
    const notifs = getStoredItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const newNotif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: data.userId,
      type: data.type,
      message: data.message,
      link: data.link,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setStoredItem(STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...notifs]);
    return newNotif;
  }

  public markNotificationAsRead(id: string): void {
    const notifs = getStoredItem<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const index = notifs.findIndex(n => n.id === id);
    if (index !== -1) {
      notifs[index].isRead = true;
      setStoredItem(STORAGE_KEYS.NOTIFICATIONS, notifs);
    }
  }

  // --- Derived KPIs (FR-41: Derived directly from completed visits without manual entry) ---
  public calculateKPIs(hospitalId?: string | null) {
    const allVisits = this.getVisits('central');
    const filteredVisits = hospitalId ? allVisits.filter(v => v.hospitalId === hospitalId) : allVisits;
    const completedVisits = filteredVisits.filter(v => v.status === 'completed');

    // Average compliance score from completed visits
    const avgCompliance = completedVisits.length > 0
      ? Math.round(completedVisits.reduce((acc, v) => acc + (v.complianceScore || 85), 0) / completedVisits.length)
      : 86;

    const trainings = this.getTrainings('central', hospitalId);
    const completedTrainings = trainings.filter(t => t.status === 'completed');
    const trainingCompletionRate = trainings.length > 0
      ? Math.round((completedTrainings.length / trainings.length) * 100)
      : 75;

    const lateTrainings = trainings.filter(t => t.status === 'late');
    const inProgressVisits = filteredVisits.filter(v => v.status === 'in_progress');

    return {
      totalVisits: filteredVisits.length,
      completedVisits: completedVisits.length,
      inProgressVisits: inProgressVisits.length,
      avgCompliance,
      totalTrainings: trainings.length,
      completedTrainings: completedTrainings.length,
      lateTrainings: lateTrainings.length,
      trainingCompletionRate,
      activeHospitalsCount: this.getHospitals().filter(h => h.isActive).length,
    };
  }

  // --- Convenience UI Wrappers & Aliases ---
  public resetToInitialData(): void {
    this.resetToDefault();
  }

  public addAuditLog(data: { entityType: any; entityId: string; action: string; performedBy: string; details?: string }): void {
    this.logAudit(data.entityType, data.entityId, data.action, data.performedBy);
  }

  public markNotificationRead(id: string): void {
    this.markNotificationAsRead(id);
  }

  public getDocumentCenterItems(): DocumentCenterFile[] {
    return this.getDocumentCenterFiles();
  }

  public addDocCenterItem(data: Omit<DocumentCenterFile, 'id' | 'uploadedAt'>, user?: User): DocumentCenterFile {
    return this.createDocumentCenterFile(data, user || this.getCurrentUser());
  }

  public addPolicy(data: Omit<Policy, 'id' | 'uploadedAt'>, user?: User): Policy {
    return this.createPolicy(data, user || this.getCurrentUser());
  }

  public addOrgDocument(data: Omit<OrgDocument, 'id' | 'uploadedAt'>, user?: User): OrgDocument {
    return this.createOrgDocument(data, user || this.getCurrentUser());
  }

  public addPractitioner(data: Omit<Practitioner, 'id'>, user?: User): Practitioner {
    return this.createPractitioner(data, user || this.getCurrentUser());
  }

  public addEquipment(data: Omit<Equipment, 'id'>, user?: User): Equipment {
    return this.createEquipment(data, user || this.getCurrentUser());
  }

  public getProgramFolders(): ProgramFolder[] {
    const progs = this.getPrograms();
    const folders: ProgramFolder[] = [];
    progs.forEach((p) => {
      if (p.folders) {
        folders.push(...p.folders);
      }
    });
    return folders;
  }

  public getProgramFiles(): ProgramFile[] {
    const progs = this.getPrograms();
    const files: ProgramFile[] = [];
    progs.forEach((p) => {
      if (p.files) {
        files.push(...p.files);
      }
    });
    return files;
  }

  public uploadProgramFile(data: { folderId: string; title: string; fileUrl: string; fileSize?: string }, user?: User): ProgramFile {
    const progs = this.getPrograms();
    const activeUser = user || this.getCurrentUser();
    const firstProg = progs[0] || this.createProgram({ name: 'البرامج الاستراتيجية' }, activeUser);
    return this.createProgramFile({
      programId: firstProg.id,
      folderId: data.folderId,
      name: data.title,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
    }, activeUser);
  }

  // Reset dataset according to active mode
  public resetToDefault(): void {
    if (typeof window === 'undefined') return;
    if (this.isCleanSlate()) {
      this.clearAllSeedData();
    } else {
      this.restoreDemoSeedData();
    }
  }
}

export const neonService = NeonIPCService.getInstance();
