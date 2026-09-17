import axios from 'axios';
import { 
  User, ClassItem, SubjectItem, StudentItem, 
  AttendanceAnalysisResponse, AttendanceSessionOut, 
  AttendanceProposalItem,
  StudentUser, FaceFrameUploadResult, FaceRegistrationStatus,
  ScanAngle, StudentPublicClass, StudentSelfRegisterData
} from '../types';

const rawApiBase = import.meta.env.VITE_API_URL;
const API_BASE = rawApiBase ? `${rawApiBase.replace(/\/+$/, '')}/api` : '/api';

export const getStorageUrl = (path: string): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = rawApiBase ? rawApiBase.replace(/\/+$/, '') : '';
  return `${base}${cleanPath}`;
};

export const api = axios.create({
  baseURL: API_BASE,
});

// Interceptor for JWT auth token header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('attendx_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AuthService = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  }
};

export const ClassService = {
  getClasses: async (): Promise<ClassItem[]> => {
    const res = await api.get('/classes');
    return res.data;
  },
  createClass: async (data: { name: string; section: string; academic_year: string }): Promise<ClassItem> => {
    const res = await api.post('/classes', data);
    return res.data;
  },
  getClassStudents: async (classId: number): Promise<StudentItem[]> => {
    const res = await api.get(`/classes/${classId}/students`);
    return res.data;
  }
};

export const SubjectService = {
  getSubjects: async (classId?: number): Promise<SubjectItem[]> => {
    const res = await api.get('/subjects', { params: { class_id: classId } });
    return res.data;
  },
  createSubject: async (data: { name: string; code: string; class_id: number }): Promise<SubjectItem> => {
    const res = await api.post('/subjects', data);
    return res.data;
  }
};

export const StudentService = {
  getStudents: async (classId?: number): Promise<StudentItem[]> => {
    const res = await api.get('/students', { params: { class_id: classId } });
    return res.data;
  },
  getStudentDetail: async (studentId: number): Promise<StudentItem> => {
    const res = await api.get(`/students/${studentId}`);
    return res.data;
  },
  createStudent: async (data: { student_id: string; name: string; roll_number: string; class_id: number; email?: string }): Promise<StudentItem> => {
    const res = await api.post('/students', data);
    return res.data;
  },
  uploadFaceImages: async (studentId: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const res = await api.post(`/students/${studentId}/face-images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  deleteFaceData: async (studentId: number) => {
    const res = await api.delete(`/students/${studentId}/face-data`);
    return res.data;
  }
};

export const AttendanceService = {
  analyzePhoto: async (classId: number, subjectId: number, file: File): Promise<AttendanceAnalysisResponse> => {
    const formData = new FormData();
    formData.append('class_id', classId.toString());
    formData.append('subject_id', subjectId.toString());
    formData.append('file', file);
    const res = await api.post('/attendance/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  saveSession: async (data: {
    class_id: number;
    subject_id: number;
    date: string;
    start_time: string;
    image_path?: string;
    records: Array<{
      student_id: number;
      status: 'PRESENT' | 'ABSENT';
      confidence: number;
      verification_status: string;
    }>;
  }): Promise<AttendanceSessionOut> => {
    const res = await api.post('/attendance/sessions', data);
    return res.data;
  },
  getSessions: async (params?: { class_id?: number; subject_id?: number; date?: string }): Promise<AttendanceSessionOut[]> => {
    const res = await api.get('/attendance/sessions', { params });
    return res.data;
  },
  getSessionDetail: async (sessionId: number): Promise<AttendanceSessionOut> => {
    const res = await api.get(`/attendance/sessions/${sessionId}`);
    return res.data;
  },
  getStudentAttendanceLog: async (studentId: number) => {
    const res = await api.get(`/attendance/students/${studentId}`);
    return res.data;
  },
  downloadExcelUrl: (classId: number, subjectId?: number) => {
    let url = `${API_BASE}/export/excel?class_id=${classId}`;
    if (subjectId) url += `&subject_id=${subjectId}`;
    return url;
  }
};

// ── Student Portal API ────────────────────────────────────────────────────────

// Separate axios instance that uses the student token from localStorage
const studentApi = axios.create({ baseURL: API_BASE });
studentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('attendx_student_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const StudentPortalService = {
  getPublicClasses: async (): Promise<StudentPublicClass[]> => {
    const res = await api.get('/student/classes');
    return res.data;
  },

  register: async (data: StudentSelfRegisterData): Promise<StudentUser> => {
    const res = await api.post('/student/register', data);
    return {
      student_db_id: res.data.student_db_id,
      student_id: res.data.student_id,
      name: res.data.name,
      face_registration_complete: res.data.face_registration_complete,
      access_token: res.data.access_token,
    };
  },

  login: async (studentId: string, password: string): Promise<StudentUser> => {
    const res = await api.post('/student/login', { student_id: studentId, password });
    return {
      student_db_id: res.data.student_db_id,
      student_id: res.data.student_id,
      name: res.data.name,
      face_registration_complete: res.data.face_registration_complete,
      access_token: res.data.access_token,
    };
  },

  getMe: async (): Promise<FaceRegistrationStatus> => {
    const res = await studentApi.get('/student/me');
    return res.data;
  },

  updateClass: async (classId: number): Promise<FaceRegistrationStatus> => {
    const res = await studentApi.put('/student/class', { class_id: classId });
    return res.data;
  },

  submitFaceFrame: async (angleLabel: ScanAngle, imageBlob: Blob): Promise<FaceFrameUploadResult> => {
    const formData = new FormData();
    formData.append('angle_label', angleLabel);
    formData.append('file', imageBlob, `scan_${angleLabel}.jpg`);
    const res = await studentApi.post('/student/face-scan/frame', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  getRegistrationStatus: async (): Promise<FaceRegistrationStatus> => {
    const res = await studentApi.get('/student/me');
    return res.data;
  },

  resetFaceScan: async (): Promise<void> => {
    await studentApi.delete('/student/face-scan/reset');
  }
};
