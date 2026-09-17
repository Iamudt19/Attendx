import React, { useState, useEffect } from 'react';
import { StudentLogin } from './StudentLogin';
import { FaceEnrollmentWizard } from './FaceEnrollmentWizard';
import { StudentUser } from '../types';
import { StudentPortalService } from '../services/api';

export const StudentPortal: React.FC = () => {
  const [student, setStudent] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to restore session from localStorage
    const token = localStorage.getItem('attendx_student_token');
    if (token) {
      StudentPortalService.getMe()
        .then((status) => {
          setStudent({
            student_db_id: status.student_db_id,
            student_id: status.student_id,
            name: status.name,
            face_registration_complete: status.face_registration_complete,
            access_token: token,
          });
        })
        .catch(() => {
          localStorage.removeItem('attendx_student_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = (studentUser: StudentUser) => {
    setStudent(studentUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('attendx_student_token');
    setStudent(null);
  };

  const handleRegistrationComplete = () => {
    if (student) {
      setStudent({ ...student, face_registration_complete: true });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Loading Student Portal...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return <StudentLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <FaceEnrollmentWizard
      student={student}
      onComplete={handleRegistrationComplete}
      onLogout={handleLogout}
    />
  );
};
