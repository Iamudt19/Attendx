import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import { HeroLanding } from './pages/HeroLanding';
import { AuthService } from './services/api';
import { User, AttendanceAnalysisResponse } from './types';
import { Analytics } from '@vercel/analytics/react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { FloatingMobileInstallBanner } from './components/InstallAppButton';

// ── Admin Portal Root ─────────────────────────────────────────────────────────
const AdminPortalRoot: React.FC = () => <AdminPortal />;

// ── Student Portal Root ───────────────────────────────────────────────────────
const StudentPortalRoot: React.FC = () => <StudentPortal />;

interface TeacherLayoutProps {
  user: User | null;
  loading: boolean;
  onLogout: () => void;
  onLoginSuccess: (userData: User, token: string) => void;
}

const TeacherLayout: React.FC<TeacherLayoutProps> = ({
  user,
  loading,
  onLogout,
  onLoginSuccess
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toggleTheme, isDark } = useTheme();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-secondary)] text-sm font-medium">
        Loading AttendX...
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={onLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col transition-colors duration-400">
      <Navbar 
        user={user} 
        onLogout={onLogout} 
        toggleTheme={toggleTheme} 
        isDark={isDark} 
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} 
      />
      <div className="flex flex-1 relative">
        <Sidebar 
          user={user} 
          mobileOpen={mobileMenuOpen} 
          onCloseMobile={() => setMobileMenuOpen(false)} 
        />
        <main className="flex-1 p-3.5 sm:p-6 overflow-y-auto max-w-7xl mx-auto w-full animate-fade-in-up">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// ── Main App Root ─────────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
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

  return (
    <BrowserRouter>
      <Analytics />
      <Routes>
        {/* Public Landing & Hero Pages */}
        <Route path="/" element={<HeroLanding />} />
        <Route path="/landing" element={<HeroLanding />} />

        {/* Admin & Student Portals */}
        <Route path="/admin/*" element={<AdminPortalRoot />} />
        <Route path="/student/*" element={<StudentPortalRoot />} />

        {/* Teacher / Admin Authenticated Shell Routes */}
        <Route
          element={
            <TeacherLayout
              user={user}
              loading={loading}
              onLogout={handleLogout}
              onLoginSuccess={handleLoginSuccess}
            />
          }
        >
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
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
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <FloatingMobileInstallBanner />
    </BrowserRouter>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </ThemeProvider>
  );
};
export default App;
