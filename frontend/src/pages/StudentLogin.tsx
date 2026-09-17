import React, { useState, useEffect } from 'react';
import { ScanFace, Lock, User, ArrowRight, ChevronLeft, BookOpen, Hash, Mail, UserPlus, LogIn } from 'lucide-react';
import { StudentPortalService } from '../services/api';
import { StudentUser, StudentPublicClass } from '../types';

interface StudentLoginProps {
  onLoginSuccess: (student: StudentUser) => void;
}

type AuthTab = 'login' | 'register';

export const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess }) => {
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
          // Silently fail — classes will appear empty
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
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your Student ID and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (regPassword && regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
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
        password: regPassword || undefined,
      });
      localStorage.setItem('attendx_student_token', student.access_token);
      onLoginSuccess(student);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-600/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 left-10 w-40 h-40 bg-fuchsia-600/5 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Back to Teacher Portal */}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Teacher Portal
        </a>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-4 rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/30 shadow-lg shadow-violet-500/10">
            <ScanFace className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Attend<span className="text-violet-400">X</span> <span className="text-slate-400 font-normal text-2xl">Student</span>
            </h1>
            <p className="text-sm text-slate-400 font-medium mt-1">
              {activeTab === 'login'
                ? 'Sign in to access face enrollment'
                : 'Register to get assigned to your class'}
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all relative ${
                activeTab === 'login'
                  ? 'text-violet-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
              {activeTab === 'login' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-violet-400 rounded-full" />
              )}
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all relative ${
                activeTab === 'register'
                  ? 'text-violet-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Sign Up
              {activeTab === 'register' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-violet-400 rounded-full" />
              )}
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
                {error}
              </div>
            )}

            {/* ── Login Form ─────────────────────────────────────────── */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Student ID
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="student-id-input"
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                      placeholder="e.g. STU001"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="student-password-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                      placeholder="Default: your Student ID"
                      autoComplete="current-password"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    First time? Your default password is your Student ID (e.g., STU001).
                  </p>
                </div>

                <button
                  id="student-login-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 group disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <span>Signing in...</span>
                  ) : (
                    <>
                      <span>Access Student Portal</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-500 pt-1">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('register')}
                    className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
                  >
                    Sign up here
                  </button>
                </p>
              </form>
            )}

            {/* ── Registration Form ──────────────────────────────────── */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Class Selection — the key feature */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Select Your Class *
                  </label>
                  {classesLoading ? (
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      Loading classes...
                    </div>
                  ) : classes.length === 0 ? (
                    <div className="w-full bg-slate-950 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400">
                      No classes available. Please contact your teacher.
                    </div>
                  ) : (
                    <div className="relative">
                      <BookOpen className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <select
                        id="register-class-select"
                        value={regClassId}
                        onChange={(e) => setRegClassId(Number(e.target.value))}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all appearance-none cursor-pointer"
                      >
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name} — {cls.section} ({cls.academic_year})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  )}
                  {regClassId > 0 && classes.length > 0 && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300 flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        You'll be assigned to{' '}
                        <strong className="text-violet-200">
                          {classes.find(c => c.id === regClassId)?.name} {classes.find(c => c.id === regClassId)?.section}
                        </strong>{' '}
                        for {classes.find(c => c.id === regClassId)?.academic_year}
                      </span>
                    </div>
                  )}
                </div>

                {/* Student ID and Roll Number */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Student ID *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        id="register-student-id"
                        type="text"
                        value={regStudentId}
                        onChange={(e) => setRegStudentId(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                        placeholder="STU001"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Roll Number *
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        id="register-roll-number"
                        type="text"
                        value={regRollNumber}
                        onChange={(e) => setRegRollNumber(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                        placeholder="2026CSE01"
                      />
                    </div>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="register-name"
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                      placeholder="Rahul Verma"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Email <span className="text-slate-600 normal-case">(optional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="register-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                      placeholder="rahul@student.edu"
                    />
                  </div>
                </div>

                {/* Password fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        id="register-password"
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                        placeholder="Set password"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Confirm
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        id="register-confirm-password"
                        type="password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                        placeholder="Re-enter"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 -mt-2">
                  Leave blank to default to your Student ID as password.
                </p>

                <button
                  id="student-register-btn"
                  type="submit"
                  disabled={loading || classes.length === 0}
                  className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 group disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <span>Creating account...</span>
                  ) : (
                    <>
                      <span>Register & Continue</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-slate-500 pt-1">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
                  >
                    Sign in instead
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Info box */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 text-xs text-slate-400 space-y-1.5">
          <p className="font-semibold text-slate-300">
            {activeTab === 'login' ? '📋 What happens after login?' : '🎓 How registration works'}
          </p>
          <p>
            {activeTab === 'login'
              ? "You'll be guided through a 5-step face scan wizard. Each step captures a different angle of your face to ensure the AI can recognise you accurately from any seat in the classroom."
              : 'Select your class to get assigned to the right teacher and section. After registration, you\'ll complete a 5-step face scan so the AI can recognise you during attendance.'}
          </p>
        </div>
      </div>
    </div>
  );
};
