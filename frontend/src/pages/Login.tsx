import React, { useState } from 'react';
import { 
  Camera, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck, 
  GraduationCap, UserPlus, LogIn, ChevronLeft, Sparkles, CheckCircle2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/api';
import { User } from '../types';
import { extractErrorMessage } from '../utils/error';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
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
      if (data.user?.is_approved && data.access_token) {
        localStorage.setItem('attendx_token', data.access_token);
        setSuccessMsg('Account created successfully! Redirecting to dashboard...');
        setTimeout(() => {
          onLoginSuccess(data.user, data.access_token);
          navigate('/dashboard');
        }, 600);
      } else {
        setSuccessMsg('Account registration submitted! Your educator account is pending administrator approval before you can sign in.');
        setEmail(regEmail.trim());
        setPassword('');
        setName('');
        setRegEmail('');
        setRegPassword('');
        setConfirmPassword('');
        setActiveTab('signin');
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Registration failed. Please try again with another email.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white transition-colors duration-300 ${
      isDark ? 'bg-black text-white' : 'bg-[#FBFBFB] text-[#111827]'
    }`}>
      {/* Top Header with Theme Toggle Slider */}
      <header className={`w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b transition-colors ${
        isDark ? 'border-white/[0.08] bg-black/60 backdrop-blur-xl' : 'border-slate-200/80 bg-white/60 backdrop-blur-xl'
      }`}>
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <Logo size="md" variant="auto" showTagline />
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Slider */}
          <ThemeToggle variant="slider" size="sm" />

          <button
            onClick={() => navigate('/student/login')}
            className={`text-sm font-semibold flex items-center gap-1.5 transition-colors px-3 py-2 rounded-xl border ${
              isDark 
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-200 hover:text-white' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-blue-500" />
            <span className="hidden sm:inline">Student Portal</span>
          </button>
          
          <button
            onClick={() => navigate('/')}
            className={`text-sm font-semibold flex items-center gap-1 transition-colors px-3 py-2 rounded-xl border ${
              isDark 
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300 hover:text-white' 
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-950'
            }`}
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
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-1 ${
              isDark 
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                : 'bg-blue-50 text-blue-700 border-blue-100'
            }`}>
              <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Educator & Institutional Access
            </div>
            <h1 className={`font-serif text-4xl font-normal tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {activeTab === 'signin' ? 'Welcome back.' : 'Create your account.'}
            </h1>
            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              {activeTab === 'signin' 
                ? 'Sign in to access your lecture rosters, real-time scanning, and reports.' 
                : 'Join AttendX to modernize multi-face attendance across your campus.'}
            </p>
          </div>

          {/* Tab Pill Selector */}
          <div className={`p-1 rounded-2xl flex gap-1 border ${
            isDark ? 'bg-zinc-950/80 border-white/10' : 'bg-slate-100/80 border-slate-200/60'
          }`}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'signin'
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
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'signup'
                  ? isDark 
                    ? 'bg-zinc-800 text-white shadow-md border border-white/15' 
                    : 'bg-white text-slate-950 shadow-sm'
                  : isDark 
                    ? 'text-zinc-400 hover:text-white' 
                    : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-500" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Form Card with Pure Glassmorphism in Dark Mode */}
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

            {activeTab === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-zinc-300' : 'text-slate-700'
                  }`}>
                    Institutional Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="faculty@institution.edu"
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
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${
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
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-zinc-300' : 'text-slate-700'
                  }`}>
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. Sarah Jenkins"
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
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="s.jenkins@stanford.edu"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${
                        isDark 
                          ? 'bg-black/60 border border-white/15 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20' 
                          : 'bg-slate-50/50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-zinc-300' : 'text-slate-700'
                    }`}>
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 chars"
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
                      Confirm
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
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
                    Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('TEACHER')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        role === 'TEACHER'
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-sm'
                          : isDark 
                            ? 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10' 
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
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-sm'
                          : isDark 
                            ? 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10' 
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
