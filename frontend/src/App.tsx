import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TakeAttendance } from './pages/TakeAttendance';
import { ReviewAttendance } from './pages/ReviewAttendance';
import { History } from './pages/History';
import { Students } from './pages/Students';
import { StudentDetail } from './pages/StudentDetail';
import { Classes } from './pages/Classes';
import { StudentPortal } from './pages/StudentPortal';
import { AdminPortal } from './pages/AdminPortal';
import { AuthService } from './services/api';
import { User, AttendanceAnalysisResponse } from './types';

// ── Admin Portal Root ─────────────────────────────────────────────────────────
const AdminPortalRoot: React.FC = () => <AdminPortal />;

// ── Student Portal (completely separate) ──────────────────────────────────────
// If the URL starts with /student, render the StudentPortal only
const StudentPortalRoot: React.FC = () => <StudentPortal />;

// ── Teacher / Admin Portal ────────────────────────────────────────────────────
const TeacherPortal: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [analysisResult, setAnalysisResult] = useState<AttendanceAnalysisResponse | null>(null);
  const [sessionContext, setSessionContext] = useState<{
    classId: number;
    subjectId: number;
    date: string;
    startTime: string;
  } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('attendx_token');
    if (token) {
      AuthService.getMe()
        .then((userData) => setUser(userData))
        .catch(() => {
          localStorage.removeItem('attendx_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('attendx_token');
    setUser(null);
  };

  const handleLoginSuccess = (userData: User, _token: string) => {
    setUser(userData);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Initializing AttendX...
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route
              path="/take-attendance"
              element={
                <TakeAttendance
                  onAnalysisComplete={(res, context) => {
                    setAnalysisResult(res);
                    setSessionContext(context);
                  }}
                />
              }
            />
            <Route
              path="/review-attendance"
              element={
                <ReviewAttendance
                  analysisResult={analysisResult}
                  sessionContext={sessionContext}
                />
              }
            />
            <Route path="/history" element={<History />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:studentId" element={<StudentDetail />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// ── App Root: Route split ─────────────────────────────────────────────────────
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* /admin/* routes go directly to the Admin Portal */}
        <Route path="/admin/*" element={<AdminPortalRoot />} />
        {/* All /student/* routes go to the student portal */}
        <Route path="/student/*" element={<StudentPortalRoot />} />
        {/* Everything else goes to the teacher portal */}
        <Route path="/*" element={<TeacherPortal />} />
      </Routes>
    </BrowserRouter>
  );
};
