import React, { useState } from 'react';
import { Camera, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck, GraduationCap, UserPlus, LogIn, ChevronLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/api';
import { User } from '../types';
import { extractErrorMessage } from '../utils/error';

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Sign In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign Up State
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'TEACHER' | 'ADMIN'>('TEACHER');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const data = await AuthService.login(email.trim(), password);
      localStorage.setItem('attendx_token', data.access_token);
      onLoginSuccess(data.user, data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Login failed. Please check your email and password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await AuthService.register({
        name: name.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: role,
      });
      localStorage.setItem('attendx_token', data.access_token);
      setSuccessMsg('Account created successfully! Redirecting to dashboard...');
      setTimeout(() => {
        onLoginSuccess(data.user, data.access_token);
        navigate('/dashboard');
      }, 600);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Registration failed. Please try again with another email.'));
    } finally {
      setLoading(false);
    }
  };

  const fillDemoTeacher = () => {
    setEmail('teacher@attendx.edu');
    setPassword('teacher123');
    setActiveTab('signin');
  };

  const fillDemoAdmin = () => {
    setEmail('admin@attendx.edu');
    setPassword('admin123');
    setActiveTab('signin');
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-[#111827] flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans">
      {/* Top Simple Header */}
      <header className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center">
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">Attend</span>
            <span className="font-extrabold text-2xl tracking-tight text-blue-600">X</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/student/login')}
            className="text-sm font-semibold text-slate-600 hover:text-slate-950 flex items-center gap-1.5 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100/60"
          >
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>Student Portal</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-sm font-semibold text-slate-600 hover:text-slate-950 flex items-center gap-1 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100/60"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Overview</span>
          </button>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Educator & Institutional Access
            </div>
            <h1 className="font-serif text-4xl text-slate-900 font-normal tracking-tight">
              {activeTab === 'signin' ? 'Welcome back.' : 'Create your account.'}
            </h1>
            <p className="text-sm text-slate-600">
              {activeTab === 'signin' 
                ? 'Sign in to access your lecture rosters, real-time scanning, and reports.' 
                : 'Join AttendX to modernize multi-face attendance across your campus.'}
            </p>
          </div>

          {/* Tab Pill Selector */}
          <div className="bg-slate-100/80 p-1 rounded-xl flex gap-1 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'signin'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-blue-600" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'signup'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Form Card */}
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

            {activeTab === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Institutional Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="teacher@attendx.edu"
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
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
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
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Quick Demo Logins Bar */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2.5">
                    Quick Demo Autofill
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={fillDemoTeacher}
                      className="text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 transition-colors"
                    >
                      Demo Teacher
                    </button>
                    <button
                      type="button"
                      onClick={fillDemoAdmin}
                      className="text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 transition-colors"
                    >
                      Demo Admin
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. Sarah Jenkins"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="s.jenkins@stanford.edu"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Confirm
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('TEACHER')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        role === 'TEACHER'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>Instructor / Teacher</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('ADMIN')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        role === 'ADMIN'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Department Admin</span>
                    </button>
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
          <div>AttendX AI Campus Attendance · Enterprise Biometric Security</div>
          <div className="flex gap-4">
            <span className="hover:text-slate-800 cursor-pointer">Security Compliance</span>
            <span className="hover:text-slate-800 cursor-pointer">Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
