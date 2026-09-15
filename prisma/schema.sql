-- Neon.tech PostgreSQL DDL Script for IPC Management Portal (SRS v1.0)
-- 19 Tables Covering All SRS v1.0 Functional Requirements
-- Run this in Neon SQL Editor or execute from within the Application Modal

-- Safe idempotent ENUM creation
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

-- 1. Hospital (المستشفيات)
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

-- 2. User (المستخدمون والصلاحيات)
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT DEFAULT 'مستخدم',
  "role" TEXT DEFAULT 'hospital',
  "hospitalId" TEXT REFERENCES "Hospital"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Visit (الزيارات الرقابية الإشرافية)
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

-- 4. VisitAttachment (مرفقات وصور الزيارات)
CREATE TABLE IF NOT EXISTS "VisitAttachment" (
  "id" TEXT PRIMARY KEY,
  "visitId" TEXT NOT NULL REFERENCES "Visit"("id") ON DELETE CASCADE,
  "fileName" TEXT DEFAULT 'مرفق',
  "fileUrl" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. VisitResponse (ردود وملاحظات المستشفى على الزيارة)
CREATE TABLE IF NOT EXISTS "VisitResponse" (
  "id" TEXT PRIMARY KEY,
  "visitId" TEXT NOT NULL REFERENCES "Visit"("id") ON DELETE CASCADE,
  "note" TEXT NOT NULL,
  "attachmentUrl" TEXT,
  "attachmentName" TEXT,
  "respondentName" TEXT DEFAULT 'منسق المستشفى',
  "respondedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. AuditLog (سجل المراجعة والتدقيق الزمني)
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "performedBy" TEXT NOT NULL,
  "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TrainingTemplate (قوالب التدريب المركزية المعممة)
CREATE TABLE IF NOT EXISTS "TrainingTemplate" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "dueDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Training (التدريبات المنفذة والداخلية)
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

-- 9. TrainingAttachment (مرفقات ومستندات التدريب)
CREATE TABLE IF NOT EXISTS "TrainingAttachment" (
  "id" TEXT PRIMARY KEY,
  "trainingId" TEXT NOT NULL REFERENCES "Training"("id") ON DELETE CASCADE,
  "fileName" TEXT DEFAULT 'مرفق تدريب',
  "fileUrl" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Practitioner (ممارسو مكافحة العدوى)
CREATE TABLE IF NOT EXISTS "Practitioner" (
  "id" TEXT PRIMARY KEY,
  "hospitalId" TEXT NOT NULL REFERENCES "Hospital"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "licenseNumber" TEXT,
  "contact" TEXT
);

-- 11. TrainingAttendance (سجل حضور التدريب والمشاركون)
CREATE TABLE IF NOT EXISTS "TrainingAttendance" (
  "id" TEXT PRIMARY KEY,
  "trainingId" TEXT NOT NULL REFERENCES "Training"("id") ON DELETE CASCADE,
  "practitionerId" TEXT REFERENCES "Practitioner"("id") ON DELETE SET NULL,
  "headcount" INTEGER
);

-- 12. Equipment (أجهزة ومعدات مكافحة العدوى والتعقيم)
CREATE TABLE IF NOT EXISTS "Equipment" (
  "id" TEXT PRIMARY KEY,
  "hospitalId" TEXT NOT NULL REFERENCES "Hospital"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "serialNumber" TEXT,
  "status" TEXT
);

-- 13. Policy (السياسات والنماذج والأدلة الإرشادية)
CREATE TABLE IF NOT EXISTS "Policy" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "category" TEXT DEFAULT 'policy',
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT DEFAULT 'وثيقة سياسة',
  "version" TEXT DEFAULT '1.0',
  "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. OrgDocument (الهياكل التنظيمية والوصف الوظيفي)
CREATE TABLE IF NOT EXISTS "OrgDocument" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT DEFAULT 'مستند تنظيمي',
  "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. DocumentCenterFile (مركز الوثائق والملفات الموحد)
CREATE TABLE IF NOT EXISTS "DocumentCenterFile" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileName" TEXT DEFAULT 'وثيقة',
  "category" TEXT DEFAULT 'عام',
  "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Program (البرامج الاستراتيجية)
CREATE TABLE IF NOT EXISTS "Program" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. ProgramFolder (المجلدات الهرمية للبرامج)
CREATE TABLE IF NOT EXISTS "ProgramFolder" (
  "id" TEXT PRIMARY KEY,
  "programId" TEXT NOT NULL REFERENCES "Program"("id") ON DELETE CASCADE,
  "parentFolderId" TEXT REFERENCES "ProgramFolder"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL
);

-- 18. ProgramFile (ملفات ومستندات البرامج الاستراتيجية)
CREATE TABLE IF NOT EXISTS "ProgramFile" (
  "id" TEXT PRIMARY KEY,
  "programId" TEXT NOT NULL REFERENCES "Program"("id") ON DELETE CASCADE,
  "folderId" TEXT REFERENCES "ProgramFolder"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" TEXT DEFAULT '1.2 MB',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. Notification (نظام التنبيهات والإشعارات الفورية)
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
