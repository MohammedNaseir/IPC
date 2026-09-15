// IPC Management Portal - Data Models matching SRS Specification v1.0

export type UserRole = 'central' | 'hospital';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hospitalId?: string | null;
  phone?: string;
  password?: string;
  isDevAdmin?: boolean;
  createdAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  location: string;
  type: string;
  coordinatorName: string;
  coordinatorEmail: string;
  isActive: boolean;
  createdAt: string;
}

export type VisitStatus = 'in_progress' | 'completed';

export interface VisitAttachment {
  id: string;
  visitId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface VisitResponse {
  id: string;
  visitId: string;
  note: string;
  attachmentUrl?: string;
  attachmentName?: string;
  respondentName: string;
  respondedAt: string;
}

export interface Visit {
  id: string;
  hospitalId: string;
  hospitalName?: string;
  visitDate: string;
  team: string;
  details: string;
  reportUrl: string;
  reportName?: string;
  status: VisitStatus;
  complianceScore?: number; // Calculated KPI (e.g. 88%)
  createdAt: string;
  updatedAt: string;
  attachments?: VisitAttachment[];
  responses?: VisitResponse[];
}

export interface AuditLog {
  id: string;
  entityType: 'Visit' | 'Training' | 'Hospital' | 'Policy' | 'Program' | 'Document';
  entityId: string;
  action: string;
  performedBy: string;
  timestamp: string;
}

export interface TrainingTemplate {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt: string;
}

export type TrainingStatus = 'pending' | 'late' | 'completed';

export interface TrainingAttendance {
  id: string;
  trainingId: string;
  practitionerId?: string | null;
  practitionerName?: string | null;
  headcount?: number | null;
}

export interface TrainingAttachment {
  id: string;
  trainingId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface Training {
  id: string;
  templateId?: string | null;
  hospitalId: string;
  hospitalName?: string;
  title: string;
  description: string;
  deliveredBy: string;
  date?: string | null;
  status: TrainingStatus;
  createdAt: string;
  attendances?: TrainingAttendance[];
  attachments?: TrainingAttachment[];
}

export interface Practitioner {
  id: string;
  hospitalId: string;
  name: string;
  role: string; // Specialization / Job title
  licenseNumber?: string;
  contact?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
}

export interface Equipment {
  id: string;
  hospitalId: string;
  name: string;
  type: string;
  serialNumber?: string;
  status?: string;
  lastMaintenance?: string;
  createdAt?: string;
}

export type PolicyCategory = 'policy' | 'procedure' | 'form' | string;

export interface Policy {
  id: string;
  title: string;
  category: PolicyCategory;
  fileUrl: string;
  fileName?: string;
  fileSize?: string;
  version?: string;
  uploadedAt?: string;
  createdAt?: string;
}

export type PolicyItem = Policy;

export type OrgDocType = 'org_structure' | 'job_description' | string;

export interface OrgDocument {
  id: string;
  title: string;
  type?: OrgDocType;
  fileUrl: string;
  fileName?: string;
  fileSize?: string;
  uploadedBy?: string;
  uploadedAt: string;
}

export interface DocumentCenterFile {
  id: string;
  title: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: string;
  category?: string;
  description?: string;
  uploadedBy?: string;
  uploadedAt: string;
}

export type DocumentCenterItem = DocumentCenterFile;

export interface ProgramFile {
  id: string;
  programId?: string;
  folderId?: string | null;
  name?: string;
  title?: string;
  fileUrl: string;
  fileSize?: string;
  uploadedAt?: string;
  createdAt?: string;
}

export interface ProgramFolder {
  id: string;
  programId?: string;
  parentId?: string | null;
  parentFolderId?: string | null;
  name: string;
  description?: string;
  subFolders?: ProgramFolder[];
  files?: ProgramFile[];
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  folders?: ProgramFolder[];
  files?: ProgramFile[];
}

export type NotificationType = 'training_overdue' | 'visit_upcoming' | 'new_document';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface NeonConnectionConfig {
  databaseUrl: string;
  directUrl?: string;
  isConnected: boolean;
  error?: string;
  lastChecked?: string;
}
