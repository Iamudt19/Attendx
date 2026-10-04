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
  adminMasterLogin: async (password: string) => {
    const res = await api.post('/auth/admin-master-login', { password });
    return res.data;
  },
  register: async (data: { name: string; email: string; password: string; role?: string }) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  getPendingTeachers: async () => {
    const res = await api.get('/auth/pending-teachers');
    return res.data;
  },
  approveTeacher: async (teacherId: number) => {
    const res = await api.post(`/auth/approve-teacher/${teacherId}`);
    return res.data;
  },
  rejectTeacher: async (teacherId: number) => {
    const res = await api.post(`/auth/reject-teacher/${teacherId}`);
    return res.data;
  },
  getAllTeachers: async () => {
    const res = await api.get('/auth/teachers');
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
  updateClass: async (classId: number, data: { name?: string; section?: string; academic_year?: string }): Promise<ClassItem> => {
    const res = await api.put(`/classes/${classId}`, data);
    return res.data;
  },
  deleteClass: async (classId: number) => {
    const res = await api.delete(`/classes/${classId}`);
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
  },
  updateSubject: async (subjectId: number, data: { name?: string; code?: string; class_id?: number }): Promise<SubjectItem> => {
    const res = await api.put(`/subjects/${subjectId}`, data);
    return res.data;
  },
  deleteSubject: async (subjectId: number) => {
    const res = await api.delete(`/subjects/${subjectId}`);
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
  deleteStudent: async (studentId: number) => {
    const res = await api.delete(`/students/${studentId}`);
    return res.data;
  },
  uploadFaceImages: async (studentId: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const res = await api.post(`/students/${studentId}/face-images`, formData);
    return res.data;
  },
  deleteFaceData: async (studentId: number) => {
    const res = await api.delete(`/students/${studentId}/face-data`);
    return res.data;
  }
};

export const AttendanceService = {
  analyzePhotos: async (classId: number, subjectId: number, files: File[]): Promise<AttendanceAnalysisResponse> => {
    if (files.length <= 1) {
      const formData = new FormData();
      formData.append('class_id', classId.toString());
      formData.append('subject_id', subjectId.toString());
      if (files.length === 1) {
        formData.append('files', files[0]);
      }
      const res = await api.post('/attendance/analyze', formData);
      return res.data;
    }

    // Parallel multi-photo requests: process all photos concurrently
    const promises = files.map(async (file) => {
      const formData = new FormData();
      formData.append('class_id', classId.toString());
      formData.append('subject_id', subjectId.toString());
      formData.append('files', file);
      const res = await api.post('/attendance/analyze', formData);
      return res.data as AttendanceAnalysisResponse;
    });

    const results = await Promise.all(promises);

    const allImageUrls: string[] = [];
    const allRecognizedFaces: any[] = [];
    const studentMatchMap: Record<number, { match_score: number; status: string; verification_status: string }> = {};
    let totalDetected = 0;

    results.forEach((res, imgIdx) => {
      if (res.image_urls && res.image_urls.length > 0) {
        allImageUrls.push(...res.image_urls);
      } else if (res.image_url) {
        allImageUrls.push(res.image_url);
      }
      totalDetected += res.total_detected_faces || 0;

      (res.recognized_faces || []).forEach((face) => {
        const faceCopy = { ...face, image_index: imgIdx };
        allRecognizedFaces.push(faceCopy);

        if (faceCopy.student_id != null) {
          const sid = faceCopy.student_id;
          const score = faceCopy.match_score ?? faceCopy.confidence ?? 0;
          const status = faceCopy.status ?? 'NEEDS_REVIEW';
          const vStatus = faceCopy.verification_status ?? 'AUTO';

          if (!studentMatchMap[sid] || score > studentMatchMap[sid].match_score) {
            studentMatchMap[sid] = {
              match_score: score,
              status: status,
              verification_status: vStatus
            };
          }
        }
      });
    });

    // Base proposed attendance from the first result template
    const baseProposals = results[0]?.proposed_attendance || [];
    let presentCount = 0;
    let reviewCount = 0;
    let absentCount = 0;

    const mergedProposed = baseProposals.map((student) => {
      const sId = student.student_db_id;
      if (studentMatchMap[sId]) {
        const match = studentMatchMap[sId];
        const finalStatus: 'PRESENT' | 'ABSENT' = (match.status === 'PRESENT' || match.status === 'NEEDS_REVIEW') ? 'PRESENT' : 'ABSENT';
        const vStatus = match.verification_status;

        if (match.status === 'PRESENT') {
          presentCount++;
        } else if (match.status === 'NEEDS_REVIEW') {
          reviewCount++;
        } else {
          absentCount++;
        }

        return {
          ...student,
          status: finalStatus,
          match_score: match.match_score,
          confidence: match.match_score,
          verification_status: vStatus
        };
      } else {
        absentCount++;
        return {
          ...student,
          status: 'ABSENT' as const,
          match_score: 0,
          confidence: 0,
          verification_status: 'AUTO'
        };
      }
    });

    return {
      image_url: allImageUrls[0] || '',
      image_urls: allImageUrls,
      total_detected_faces: totalDetected,
      recognized_faces: allRecognizedFaces,
      proposed_attendance: mergedProposed,
      present_count: presentCount,
      absent_count: absentCount,
      needs_review_count: reviewCount
    };
  },
  analyzePhoto: async (classId: number, subjectId: number, file: File): Promise<AttendanceAnalysisResponse> => {
    return AttendanceService.analyzePhotos(classId, subjectId, [file]);
  },
  saveSession: async (data: {
    class_id: number;
    subject_id: number;
    date: string;
    start_time: string;
    image_path?: string;
    image_urls?: string[];
    records: Array<{
      student_id: number;
      status: 'PRESENT' | 'ABSENT';
      confidence: number;
      verification_status: string;
    }>;
    recognized_faces?: any[];
  }): Promise<AttendanceSessionOut> => {
    try {
      const res = await api.post('/attendance/sessions', data);
      return res.data;
    } catch (err: any) {
      // If server returns "already been recorded" from an older backend version or unique constraint,
      // seamlessly find the existing session and overwrite its records with the newly submitted data
      const errMsg = err.response?.data?.detail || err.message || '';
      if (
        errMsg.toLowerCase().includes('already been recorded') || 
        errMsg.toLowerCase().includes('already exists') ||
        errMsg.toLowerCase().includes('already marked') ||
        errMsg.toLowerCase().includes('already recorded') ||
        err.response?.status === 400 ||
        err.response?.status === 409
      ) {
        console.warn("Session already recorded for this date/class, performing seamless overwrite:", errMsg);
        try {
          const allSessions = await AttendanceService.getSessions();
          const targetSession = (allSessions || []).find(
            (s: AttendanceSessionOut) =>
              Number(s.class_id) === Number(data.class_id) &&
              Number(s.subject_id) === Number(data.subject_id) &&
              s.date === data.date
          ) || (allSessions || []).find(
            (s: AttendanceSessionOut) =>
              Number(s.class_id) === Number(data.class_id) &&
              s.date === data.date
          );
          if (targetSession) {
            return await AttendanceService.updateSessionRecords(targetSession.id, data.records);
          }
        } catch (fallbackErr) {
          console.error("Fallback session overwrite error:", fallbackErr);
        }
      }
      throw err;
    }
  },
  getSessions: async (params?: { class_id?: number; subject_id?: number; date?: string }): Promise<AttendanceSessionOut[]> => {
    const res = await api.get('/attendance/sessions', { params });
    return res.data;
  },
  getSessionDetail: async (sessionId: number): Promise<AttendanceSessionOut> => {
    const res = await api.get(`/attendance/sessions/${sessionId}`);
    return res.data;
  },
  updateSessionRecords: async (
    sessionId: number,
    records: Array<{
      student_id: number;
      status: 'PRESENT' | 'ABSENT';
      confidence?: number;
      verification_status?: string;
    }>
  ): Promise<AttendanceSessionOut> => {
    const payload = { records };
    // Try multiple endpoint styles (PUT / POST / PATCH) to ensure compatibility across proxies and server versions
    const attempts = [
      () => api.put(`/attendance/sessions/${sessionId}`, payload),
      () => api.post(`/attendance/sessions/${sessionId}/update`, payload),
      () => api.put(`/attendance/sessions/${sessionId}/records`, payload),
      () => api.post(`/attendance/sessions/${sessionId}/records`, payload),
      () => api.patch(`/attendance/sessions/${sessionId}`, payload),
      () => api.post(`/attendance/sessions/${sessionId}`, payload),
    ];

    let lastError: any = null;
    for (const attempt of attempts) {
      try {
        const res = await attempt();
        return res.data;
      } catch (err: any) {
        lastError = err;
        // If 405 (Method Not Allowed) or 404 (Not Found), try next endpoint variant
        if (err.response?.status === 405 || err.response?.status === 404) {
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  },
  getStudentAttendanceLog: async (studentId: number) => {
    const res = await api.get(`/attendance/students/${studentId}`);
    return res.data;
  },
  downloadExcelUrl: (classId: number, subjectId?: number) => {
    const token = localStorage.getItem('attendx_token');
    let url = `${API_BASE}/export/excel?class_id=${classId}`;
    if (subjectId) url += `&subject_id=${subjectId}`;
    if (token) url += `&token=${encodeURIComponent(token)}`;
    return url;
  },
  downloadExcelDirect: async (classId: number, subjectId?: number) => {
    try {
      const res = await api.get('/export/excel', {
        params: { class_id: classId, subject_id: subjectId },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Attendance_Report_Class_${classId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (primaryErr) {
      console.warn("Direct binary excel fetch failed, generating client report...", primaryErr);
      // Fallback: Fetch sessions and build CSV
      const sessions = await api.get('/attendance/sessions', { params: { class_id: classId, subject_id: subjectId } });
      const sessList = sessions.data || [];
      
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Session ID,Class,Subject,Date,Time,Present Count,Absent Count,Total Enrolled,Attendance Rate\n";
      
      sessList.forEach((s: any) => {
        const rate = s.total_enrolled > 0 ? `${Math.round((s.present_count / s.total_enrolled) * 100)}%` : 'N/A';
        const row = [
          s.id,
          `"${s.class_name || 'Class'}"`,
          `"${s.subject_name || 'Subject'}"`,
          s.date,
          s.start_time,
          s.present_count,
          s.absent_count,
          s.total_enrolled,
          rate
        ].join(",");
        csvContent += row + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Attendance_Dossier_Class_${classId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
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

  submitFaceFrame: async (angleLabel: string, imageBlob: Blob): Promise<FaceFrameUploadResult> => {
    const formData = new FormData();
    formData.append('angle_label', angleLabel);
    formData.append('file', imageBlob, `scan_${angleLabel}.jpg`);
    const res = await studentApi.post('/student/face-scan/frame', formData);
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
