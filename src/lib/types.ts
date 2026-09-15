// Serializable shapes passed from server components to client views. Dates are ISO strings.

export type UserRole = 'central' | 'hospital';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hospitalId: string | null;
  hospitalName: string | null;
}

export interface CoordinatorDTO {
  id: string;
  name: string;
  email: string;
}

export interface HospitalDTO {
  id: string;
  name: string;
  location: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  coordinator: CoordinatorDTO | null;
}

export interface FileRefDTO {
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

export type VisitStatus = 'in_progress' | 'completed';

export interface VisitAttachmentDTO {
  id: string;
  file: FileRefDTO;
  uploadedAt: string;
}

export interface VisitResponseDTO {
  id: string;
  note: string;
  attachment: FileRefDTO | null;
  respondentName: string;
  respondedAt: string;
}

export interface VisitDTO {
  id: string;
  hospitalId: string;
  hospitalName: string;
  visitDate: string;
  team: string;
  details: string;
  report: FileRefDTO | null;
  status: VisitStatus;
  complianceScore: number | null;
  createdAt: string;
  updatedAt: string;
  attachments: VisitAttachmentDTO[];
  responses: VisitResponseDTO[];
}

export interface AuditLogDTO {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  timestamp: string;
}

export type TrainingStatus = 'pending' | 'late' | 'completed';

export interface TrainingAttachmentDTO {
  id: string;
  file: FileRefDTO;
  uploadedAt: string;
}

export interface TrainingDTO {
  id: string;
  templateId: string | null;
  isInternal: boolean;
  hospitalId: string;
  hospitalName: string;
  title: string;
  description: string;
  deliveredBy: string | null;
  date: string | null;
  dueDate: string | null;
  notes: string | null;
  status: TrainingStatus;
  attendeeCount: number;
  attendeePractitionerIds: string[];
  attachments: TrainingAttachmentDTO[];
  createdAt: string;
}

export interface PractitionerDTO {
  id: string;
  hospitalId: string;
  hospitalName: string;
  name: string;
  role: string;
  licenseNumber: string | null;
  email: string | null;
  phone: string | null;
}

export interface EquipmentDTO {
  id: string;
  hospitalId: string;
  hospitalName: string;
  name: string;
  type: string;
  serialNumber: string | null;
  status: string | null;
  lastMaintenance: string | null;
}

export type PolicyCategory = 'policy' | 'procedure' | 'form';
export type OrgDocType = 'org_structure' | 'job_description';

export interface PolicyDTO {
  id: string;
  title: string;
  category: PolicyCategory;
  version: string;
  file: FileRefDTO;
  uploadedAt: string;
}

export interface OrgDocumentDTO {
  id: string;
  title: string;
  type: OrgDocType;
  file: FileRefDTO;
  uploadedBy: string | null;
  uploadedAt: string;
}

export interface DocumentCenterFileDTO {
  id: string;
  title: string;
  file: FileRefDTO;
  uploadedBy: string | null;
  uploadedAt: string;
}

// Programs and folders share one tree: programs are root nodes (parentId null), folders hang off a program or folder.
export interface ProgramNodeDTO {
  id: string;
  kind: 'program' | 'folder';
  parentId: string | null;
  name: string;
  description: string | null;
}

export interface ProgramFileDTO {
  id: string;
  parentId: string;
  name: string;
  file: FileRefDTO;
  uploadedAt: string;
}

export type NotificationType = 'training_overdue' | 'visit_upcoming' | 'new_document';

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}
