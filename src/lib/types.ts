// Serializable shapes passed from server components to client views. Dates are ISO strings.

export type UserRole = 'central' | 'hospital';

// Soft delete (005-soft-delete). Mixed into a record's own DTO for its Trash-view variant, e.g.
// `PractitionerDTO & TrashedRecordMeta`. deletedByName/deletedAt come from the most recent matching
// AuditLog entry, not a stored column -- AuditLog stays the single source for "who did this, when"
// (contracts/soft-delete.md, research.md R-003).
export interface TrashedRecordMeta {
  deletedAt: string;
  deletedByName: string;
}

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

// Soft delete (005-soft-delete, US6). hospitalName is null once a replacement coordinator has
// taken the hospital slot (research.md R-005's accepted consequence: the restored account would
// come back orphaned, hospitalId cleared).
export interface TrashedCoordinatorDTO extends TrashedRecordMeta {
  id: string;
  name: string;
  email: string;
  hospitalName: string | null;
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

// Soft delete (005-soft-delete, US4).
export interface TrashedHospitalDTO extends TrashedRecordMeta {
  id: string;
  name: string;
  location: string;
  type: string;
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

// Soft delete (005-soft-delete). A trash row is a simpler shape than the full DTO -- a list to
// restore from, not a full record view.
export interface TrashedVisitDTO extends TrashedRecordMeta {
  id: string;
  hospitalId: string;
  hospitalName: string;
  visitDate: string;
  team: string;
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
  /** Attendee names as stored, in insertion order; duplicates are preserved deliberately. */
  attendeeNames: string[];
  attachments: TrainingAttachmentDTO[];
  createdAt: string;
}

// Soft delete (005-soft-delete). There was no existing screen listing TrainingTemplate master
// records on their own (only the per-hospital Training copies distributed from one) -- this is new,
// minimal surface needed so a central user has somewhere to delete/restore a template from.
export interface TrainingTemplateDTO {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  trainingCount: number;
  createdAt: string;
}

export interface TrashedTrainingTemplateDTO extends TrashedRecordMeta {
  id: string;
  title: string;
}

// Soft delete (005-soft-delete).
export interface TrashedTrainingDTO extends TrashedRecordMeta {
  id: string;
  hospitalId: string;
  hospitalName: string;
  title: string;
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

// Soft delete (005-soft-delete, US5). One row per deletion *event* root -- the program, folder or
// file the user actually clicked delete on -- not one row per cascaded descendant; `id` is what
// gets passed back to `restoreProgramNode` to bring the whole branch back.
export interface TrashedProgramNodeDTO extends TrashedRecordMeta {
  id: string;
  kind: 'program' | 'folder' | 'file';
  name: string;
  folderCount: number;
  fileCount: number;
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
