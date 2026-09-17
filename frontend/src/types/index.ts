export interface User {
  id: number;
  name: string;
  email: string;
  role: 'TEACHER' | 'ADMIN';
  created_at: string;
}

// Student portal session (after student login)
export interface StudentUser {
  student_db_id: number;
  student_id: string;
  name: string;
  face_registration_complete: boolean;
  access_token: string;
}

// Public class info returned to unauthenticated students during registration
export interface StudentPublicClass {
  id: number;
  name: string;
  section: string;
  academic_year: string;
}

// Payload for student self-registration
export interface StudentSelfRegisterData {
  student_id: string;
  name: string;
  roll_number: string;
  class_id: number;
  email?: string;
  password?: string;
}

export type ScanAngle = 'front' | 'left' | 'right' | 'chin_down' | 'smile';

export const SCAN_ANGLES: ScanAngle[] = ['front', 'left', 'right', 'chin_down', 'smile'];

export const ANGLE_LABELS: Record<ScanAngle, string> = {
  front: 'Look Straight Ahead',
  left: 'Turn Slightly Left',
  right: 'Turn Slightly Right',
  chin_down: 'Tilt Chin Slightly Down',
  smile: 'Smile Naturally',
};

export const ANGLE_ICONS: Record<ScanAngle, string> = {
  front: '😐',
  left: '⬅️',
  right: '➡️',
  chin_down: '⬇️',
  smile: '😊',
};

export interface FaceFrameUploadResult {
  accepted: boolean;
  angle_label: ScanAngle;
  reason: string;
  completed_angles: ScanAngle[];
  remaining_angles: ScanAngle[];
  total_required: number;
  registration_complete: boolean;
}

export interface FaceRegistrationStatus {
  student_db_id: number;
  student_id: string;
  name: string;
  roll_number?: string;
  class_id?: number;
  class_name?: string;
  face_registration_complete: boolean;
  completed_angles: ScanAngle[];
  remaining_angles: ScanAngle[];
  total_embeddings: number;
  total_required: number;
}


export interface ClassItem {
  id: number;
  name: string;
  section: string;
  academic_year: string;
  student_count?: number;
}

export interface SubjectItem {
  id: number;
  name: string;
  code: string;
  class_id: number;
}

export interface StudentItem {
  id: number;
  student_id: string;
  name: string;
  roll_number: string;
  class_id: number;
  email?: string;
  active: boolean;
  face_count?: number;
  attendance_percentage?: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RecognizedFace {
  box: BoundingBox;
  student_id?: number | null;
  custom_student_id?: string | null;
  name: string;
  roll_number?: string | null;
  confidence: number;
  status: 'PRESENT' | 'NEEDS_REVIEW' | 'UNKNOWN';
  verification_status: string;
}

export interface AttendanceProposalItem {
  student_db_id: number;
  student_id: string;
  name: string;
  roll_number: string;
  status: 'PRESENT' | 'ABSENT';
  confidence: number;
  verification_status: string;
}

export interface AttendanceAnalysisResponse {
  image_url: string;
  total_detected_faces: number;
  recognized_faces: RecognizedFace[];
  proposed_attendance: AttendanceProposalItem[];
  present_count: number;
  absent_count: number;
  needs_review_count: number;
}

export interface AttendanceRecordOut {
  id: number;
  student_id: number;
  student_name?: string;
  student_code?: string;
  roll_number?: string;
  status: 'PRESENT' | 'ABSENT';
  confidence: number;
  verification_status: string;
}

export interface AttendanceSessionOut {
  id: number;
  class_id: number;
  class_name?: string;
  subject_id: number;
  subject_name?: string;
  teacher_id: number;
  teacher_name?: string;
  date: string;
  start_time: string;
  image_path?: string;
  present_count: number;
  absent_count: number;
  total_enrolled: number;
  records: AttendanceRecordOut[];
}
