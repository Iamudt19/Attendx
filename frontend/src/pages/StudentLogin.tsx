import React, { useState, useEffect } from 'react';
import { Camera, ScanFace, Lock, User, ArrowRight, ChevronLeft, BookOpen, Hash, Mail, UserPlus, LogIn, GraduationCap, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudentPortalService } from '../services/api';
import { StudentUser, StudentPublicClass } from '../types';
import { extractErrorMessage } from '../utils/error';
import { Logo } from '../components/Logo';

interface StudentLoginProps {
  onLoginSuccess: (student: StudentUser) => void;
}

type AuthTab = 'login' | 'register';

export const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
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

  const fillQuickStudent = (id: string) => {
    setStudentId(id);
    setPassword(id);
    setActiveTab('login');
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-[#111827] flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans">
      {/* Top Simple Header */}
      <header className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <Logo size="md" variant="light" showTagline />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-semibold text-slate-600 hover:text-slate-950 flex items-center gap-1.5 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100/60"
          >
            <span>Teacher Portal</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-sm font-semibold text-slate-600 hover:text-slate-950 flex items-center gap-1 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100/60"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Home</span>
          </button>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 mb-1">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> Student Attendance Portal
            </div>
            <h1 className="font-serif text-4xl text-slate-900 font-normal tracking-tight">
              {activeTab === 'login' ? 'Student Sign In.' : 'Register for Face Verification.'}
            </h1>
            <p className="text-sm text-slate-600">
              {activeTab === 'login'
                ? 'Check attendance stats, percentage thresholds, and face registration status.'
                : 'Self-enroll in your cohort to participate in automatic biometric roll calls.'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="bg-slate-100/80 p-1 rounded-xl flex gap-1 border border-slate-200/60">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-blue-600" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>Self-Enroll</span>
            </button>
          </div>

          {/* Main Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-7 sm:p-8 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)]">
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {activeTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Student ID
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. STU001"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Default: your Student ID"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    First time logging in? Your initial password is your Student ID.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-150 active:scale-[0.99] shadow-sm hover:shadow flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
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

                {/* Quick Student Autofill */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2.5">
                    Quick Student Profiles
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => fillQuickStudent('STU001')}
                      className="text-xs font-semibold py-2 px-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 transition-colors"
                    >
                      Rahul (STU001)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillQuickStudent('STU002')}
                      className="text-xs font-semibold py-2 px-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 transition-colors"
                    >
                      Amit (STU002)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillQuickStudent('STU003')}
                      className="text-xs font-semibold py-2 px-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 transition-colors"
                    >
                      Priya (STU003)
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Student ID
                    </label>
                    <input
                      type="text"
                      required
                      value={regStudentId}
                      onChange={(e) => setRegStudentId(e.target.value)}
                      placeholder="e.g. STU099"
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Roll Number
                    </label>
                    <input
                      type="text"
                      required
                      value={regRollNumber}
                      onChange={(e) => setRegRollNumber(e.target.value)}
                      placeholder="2026CSE99"
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Full Student Name"
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Assigned Class / Cohort
                  </label>
                  <select
                    value={regClassId}
                    onChange={(e) => setRegClassId(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Confirm
                    </label>
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-150 active:scale-[0.99] shadow-sm hover:shadow flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
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
      <footer className="py-6 border-t border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>AttendX Biometric Enrollment · Student Privacy Protected</div>
          <div className="flex gap-4">
            <span className="hover:text-slate-800 cursor-pointer">Privacy Details</span>
            <span className="hover:text-slate-800 cursor-pointer">Help Center</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
