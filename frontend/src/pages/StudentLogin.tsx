import React, { useState, useEffect } from 'react';
import { Camera, ScanFace, Lock, User, ArrowRight, ChevronLeft, BookOpen, Hash, Mail, UserPlus, LogIn, GraduationCap, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudentPortalService } from '../services/api';
import { StudentUser, StudentPublicClass } from '../types';
import { extractErrorMessage } from '../utils/error';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { InstallAppButton } from '../components/InstallAppButton';
import { useTheme } from '../context/ThemeContext';

interface StudentLoginProps {
  onLoginSuccess: (student: StudentUser) => void;
}

type AuthTab = 'login' | 'register';

export const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<AuthTab>('login');

  // Login state
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');

  // Register state
  const [regStudentId, setRegStudentId] = useState('');
  const [regName, setRegName] = useState('');
  const [regRollNumber, setRegRollNumber] = useState('');
  const [regClassId, setRegClassId] = useState<number>(0);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [classes, setClasses] = useState<StudentPublicClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch available classes when register tab is shown
  useEffect(() => {
    if (activeTab === 'register' && classes.length === 0) {
      setClassesLoading(true);
      StudentPortalService.getPublicClasses()
        .then((data) => {
          setClasses(data);
          if (data.length > 0) setRegClassId(data[0].id);
        })
        .catch(() => {
          // Silently fail
        })
        .finally(() => setClassesLoading(false));
    }
  }, [activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const student = await StudentPortalService.login(studentId.trim(), password);
      localStorage.setItem('attendx_student_token', student.access_token);
      onLoginSuccess(student);
      navigate('/student');
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Login failed. Please check your Student ID and password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regPassword || regPassword.trim().length < 4) {
      setError('Please enter a valid password (minimum 4 characters).');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (!regClassId) {
      setError('Please select a class.');
      return;
    }

    setLoading(true);
    try {
      const student = await StudentPortalService.register({
        student_id: regStudentId.trim(),
        name: regName.trim(),
        roll_number: regRollNumber.trim(),
        class_id: regClassId,
        email: regEmail.trim() || undefined,
        password: regPassword.trim(),
      });
      localStorage.setItem('attendx_student_token', student.access_token);
      setSuccessMsg('Registration successful! Redirecting to face enrollment...');
      setTimeout(() => {
        onLoginSuccess(student);
        navigate('/student');
      }, 500);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setError(null);
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white transition-colors duration-300 ${
      isDark ? 'bg-black text-white' : 'bg-[#FBFBFB] text-[#111827]'
    }`}>
      {/* Top Simple Header */}
      <header className={`w-full max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between border-b transition-colors gap-2 ${
        isDark ? 'border-white/[0.08] bg-black/60 backdrop-blur-xl' : 'border-slate-200/80 bg-white/60 backdrop-blur-xl'
      }`}>
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <Logo size="sm" variant="auto" showTagline />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <InstallAppButton variant="header" className="hidden md:inline-flex" />

          {/* Theme Toggle Button on mobile / Slider on desktop */}
          <ThemeToggle variant="button" className="sm:hidden p-2 rounded-xl text-xs border border-[var(--border-color)]" />
          <ThemeToggle variant="slider" size="sm" className="hidden sm:inline-flex" />

          <button
            onClick={() => navigate('/login')}
            className={`text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors p-2 sm:px-3 sm:py-2 rounded-xl border ${
              isDark 
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-200 hover:text-white' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950'
            }`}
            title="Teacher Portal"
          >
            <GraduationCap className="w-4 h-4 text-purple-500 shrink-0" />
            <span className="hidden sm:inline">Teacher Portal</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className={`text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors p-2 sm:px-3 sm:py-2 rounded-xl border ${
              isDark 
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-950'
            }`}
            title="Home"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Home</span>
          </button>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-1 ${
              isDark ? 'bg-blue-950/60 text-blue-400 border-blue-800/50' : 'bg-blue-50 text-blue-700 border-blue-100'
            }`}>
              <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> Student Attendance Portal
            </div>
            <h1 className={`font-serif text-3xl sm:text-4xl font-normal tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {activeTab === 'login' ? 'Student Sign In.' : 'Register for Face Verification.'}
            </h1>
            <p className={`text-sm ${
              isDark ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              {activeTab === 'login'
                ? 'Check attendance stats, percentage thresholds, and face registration status.'
                : 'Self-enroll in your cohort to participate in automatic biometric roll calls.'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className={`p-1 rounded-2xl flex gap-1 border ${
            isDark ? 'bg-zinc-950/80 border-white/10' : 'bg-slate-100/80 border-slate-200/60'
          }`}>
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'login'
                  ? isDark 
                    ? 'bg-zinc-800 text-white shadow-md border border-white/15' 
                    : 'bg-white text-slate-950 shadow-sm'
                  : isDark 
                    ? 'text-zinc-400 hover:text-white' 
                    : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-blue-500" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'register'
                  ? isDark 
                    ? 'bg-zinc-800 text-white shadow-md border border-white/15' 
                    : 'bg-white text-slate-950 shadow-sm'
                  : isDark 
                    ? 'text-zinc-400 hover:text-white' 
                    : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-500" />
              <span>Self-Enroll</span>
            </button>
          </div>

          {/* Main Card with Pure Glassmorphism in Dark Mode */}
          <div className={`rounded-3xl p-7 sm:p-8 transition-all ${
            isDark 
              ? 'glass-card border border-white/10 text-white shadow-[0_25px_60px_rgba(0,0,0,0.8)]' 
              : 'bg-white border border-slate-200/90 rounded-2xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)] text-slate-900'
          }`}>
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {activeTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-zinc-300' : 'text-slate-700'
                  }`}>
                    Student ID
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. STU001"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${
                        isDark 
                          ? 'bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20' 
                          : 'bg-slate-50/50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-zinc-300' : 'text-slate-700'
                  }`}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Default: your Student ID"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${
                        isDark 
                          ? 'bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20' 
                          : 'bg-slate-50/50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                  </div>
                  <p className={`mt-1.5 text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    First time logging in? Your initial password is your Student ID.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-150 active:scale-[0.99] shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 mt-2 disabled:opacity-60 font-sans"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Open Student Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-zinc-300' : 'text-slate-700'
                    }`}>
                      Student ID
                    </label>
                    <input
                      type="text"
                      required
                      value={regStudentId}
                      onChange={(e) => setRegStudentId(e.target.value)}
                      placeholder="e.g. STU099"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${
                        isDark 
                          ? 'bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20' 
                          : 'bg-slate-50/50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-zinc-300' : 'text-slate-700'
                    }`}>
                      Roll Number
                    </label>
                    <input
                      type="text"
                      required
                      value={regRollNumber}
                      onChange={(e) => setRegRollNumber(e.target.value)}
                      placeholder="2026CSE99"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${
                        isDark 
                          ? 'bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20' 
                          : 'bg-slate-50/50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-zinc-300' : 'text-slate-700'
                  }`}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Full Student Name"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${
                      isDark 
                        ? 'bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20' 
                        : 'bg-slate-50/50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-zinc-300' : 'text-slate-700'
                  }`}>
                    Assigned Class / Cohort
                  </label>
                  <select
                    value={regClassId}
                    onChange={(e) => setRegClassId(Number(e.target.value))}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${
                      isDark 
                        ? 'bg-black/80 border border-white/15 text-white focus:border-blue-500' 
                        : 'bg-slate-50/50 border border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                  >
                    {classesLoading ? (
                      <option>Loading classrooms...</option>
                    ) : classes.length > 0 ? (
                      classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} - Section {c.section} ({c.academic_year})
                        </option>
                      ))
                    ) : (
                      <option value={1}>CSE - Section A (2025-2026)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-zinc-300' : 'text-slate-700'
                  }`}>
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${
                      isDark 
                        ? 'bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20' 
                        : 'bg-slate-50/50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-zinc-300' : 'text-slate-700'
                    }`}>
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 4 chars *"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${
                        isDark 
                          ? 'bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20' 
                          : 'bg-slate-50/50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-zinc-300' : 'text-slate-700'
                    }`}>
                      Confirm <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password *"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${
                        isDark 
                          ? 'bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20' 
                          : 'bg-slate-50/50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-150 active:scale-[0.99] shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`py-6 border-t transition-colors ${
        isDark ? 'border-white/10 bg-black text-zinc-500' : 'border-slate-200/80 bg-white text-slate-500'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>AttendX AI Campus Attendance · Enterprise Biometric Security</div>
          <div className="flex gap-4">
            <span className={`cursor-pointer transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-800'}`}>Security Compliance</span>
            <span className={`cursor-pointer transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-800'}`}>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
