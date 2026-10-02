import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { Analytics } from '@vercel/analytics/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HeroLanding } from './pages/HeroLanding';
import { ThemeProvider } from './context/ThemeContext';

// ── Admin Portal Root ─────────────────────────────────────────────────────────
const AdminPortalRoot: React.FC = () => <AdminPortal />;

// ── Student Portal Root ───────────────────────────────────────────────────────
const StudentPortalRoot: React.FC = () => <StudentPortal />;

// ── Teacher / Admin Protected App ─────────────────────────────────────────────
const TeacherPortalApp: React.FC = () => {
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm font-mono animate-pulse">
        Initializing AttendX Engine...
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
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

// ── App Root: Top Level Routes ────────────────────────────────────────────────
export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Analytics />
        <Routes>
          {/* Landing / Hero Page */}
          <Route path="/" element={<HeroLanding />} />
          <Route path="/landing" element={<HeroLanding />} />
          
          {/* Direct Login Route */}
          <Route path="/login" element={<TeacherPortalApp />} />

          {/* Admin Portal Routes */}
          <Route path="/admin/*" element={<AdminPortalRoot />} />

          {/* Student Portal Routes */}
          <Route path="/student/*" element={<StudentPortalRoot />} />

          {/* Teacher / Admin Authenticated Routes */}
          <Route path="/dashboard/*" element={<TeacherPortalApp />} />
          <Route path="/take-attendance/*" element={<TeacherPortalApp />} />
          <Route path="/review-attendance/*" element={<TeacherPortalApp />} />
          <Route path="/history/*" element={<TeacherPortalApp />} />
          <Route path="/students/*" element={<TeacherPortalApp />} />
          <Route path="/classes/*" element={<TeacherPortalApp />} />

          {/* Fallback */}
          <Route path="*" element={<HeroLanding />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};
