import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, Camera, LogOut, User, CheckCircle2, 
  ChevronLeft, Sparkles, BookOpen, Layers
} from 'lucide-react';
import { StudentLogin } from './StudentLogin';
import { FaceEnrollmentWizard } from './FaceEnrollmentWizard';
import { StudentAttendanceView } from '../components/StudentAttendanceView';
import { StudentUser, FaceRegistrationStatus } from '../types';
import { StudentPortalService } from '../services/api';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { InstallAppButton } from '../components/InstallAppButton';

type StudentTab = 'attendance' | 'biometrics';

export const StudentPortal: React.FC = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentUser | null>(null);
  const [studentProfile, setStudentProfile] = useState<FaceRegistrationStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<StudentTab>('attendance');

  useEffect(() => {
    // Restore session from localStorage
    const token = localStorage.getItem('attendx_student_token');
    if (token) {
      StudentPortalService.getMe()
        .then((profile) => {
          setStudentProfile(profile);
          setStudent({
            student_db_id: profile.student_db_id,
            student_id: profile.student_id,
            name: profile.name,
            face_registration_complete: profile.face_registration_complete,
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
    StudentPortalService.getMe().then(setStudentProfile).catch(() => {});
  };

  const handleLogout = () => {
    localStorage.removeItem('attendx_student_token');
    setStudent(null);
    setStudentProfile(null);
  };

  const handleRegistrationComplete = () => {
    if (student) {
      setStudent({ ...student, face_registration_complete: true });
      StudentPortalService.getMe().then(setStudentProfile).catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-secondary)] text-xs font-mono">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Connecting to AttendX Student Portal...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return <StudentLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col font-sans transition-colors">
      {/* ── HEADER NAVIGATION ────────────────────────────────────────────────── */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-surface)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <Logo size="sm" showSubtitle={false} />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-inset)] text-blue-600 font-bold">
                STUDENT DESK
              </span>
            </div>
          </div>

          {/* User Badge & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Student Info Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-color)] text-xs font-mono">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-[var(--text-primary)]">{student.name}</span>
              <span className="text-[var(--text-muted)]">({student.student_id})</span>
              {studentProfile?.class_name && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">
                  {studentProfile.class_name}
                </span>
              )}
            </div>

            <InstallAppButton variant="header" />
            <ThemeToggle variant="slider" size="sm" />

            <button
              onClick={handleLogout}
              className="btn-secondary text-xs px-3 py-1.5 text-rose-500 hover:text-rose-600 border-rose-500/30 flex items-center gap-1.5 font-mono"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 border-t border-[var(--border-color)] py-1.5 bg-[var(--bg-surface)] text-xs font-mono">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-1.5 px-4 rounded-lg flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'attendance'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Attendance &amp; Subject Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('biometrics')}
            className={`py-1.5 px-4 rounded-lg flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'biometrics'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Face ID Calibration ({student.face_registration_complete ? '✓ Active' : '⚠ Incomplete'})</span>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT WORKSPACE ───────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'attendance' ? (
          <StudentAttendanceView
            student={student}
            onNavigateToScan={() => setActiveTab('biometrics')}
          />
        ) : (
          <div className="max-w-4xl mx-auto">
            <FaceEnrollmentWizard
              student={student}
              onComplete={handleRegistrationComplete}
              onLogout={handleLogout}
              onNavigateToAttendance={() => setActiveTab('attendance')}
            />
          </div>
        )}
      </main>

      <footer className="py-4 border-t border-[var(--border-color)] bg-[var(--bg-surface)] text-center text-[11px] font-mono text-[var(--text-muted)]">
        AttendX Student Self-Service Node · Multi-Vector Biometric Identity
      </footer>
    </div>
  );
};
