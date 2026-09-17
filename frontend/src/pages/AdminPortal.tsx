import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Lock, Unlock, KeyRound, CheckCircle2, AlertCircle,
  Users, BookOpen, GraduationCap, Server, RefreshCw, Plus,
  Trash2, Search, ArrowRight, ExternalLink, Activity, Sparkles,
  Sliders, Eye, EyeOff, Check, X, ShieldAlert, Cpu, Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthService, ClassService, StudentService, SubjectService, api } from '../services/api';
import { ClassItem, StudentItem, SubjectItem } from '../types';

type AdminTab = 'overview' | 'classes' | 'students' | 'subjects' | 'diagnostics';

export const AdminPortal: React.FC = () => {
  const navigate = useNavigate();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('attendx_admin_session') === 'active';
  });
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Core Data
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [systemHealth, setSystemHealth] = useState<{ status: string; database: string; version: string } | null>(null);

  // Filters & Search
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<number | 'ALL'>('ALL');

  // Modals & Creation forms
  const [showCreateClassModal, setShowCreateClassModal] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>('');
  const [newClassSection, setNewClassSection] = useState<string>('');
  const [newAcademicYear, setNewAcademicYear] = useState<string>('2026-27');

  const [showCreateStudentModal, setShowCreateStudentModal] = useState<boolean>(false);
  const [newStudentId, setNewStudentId] = useState<string>('');
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentRoll, setNewStudentRoll] = useState<string>('');
  const [newStudentClassId, setNewStudentClassId] = useState<number>(0);
  const [newStudentEmail, setNewStudentEmail] = useState<string>('');

  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newSubjectCode, setNewSubjectCode] = useState<string>('');
  const [newSubjectClassId, setNewSubjectClassId] = useState<number>(0);

  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // ── Authenticate with master password 2026/ ─────────────────────────────────
  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    if (passwordInput.trim() !== '2026/') {
      setAuthError('Access Denied: Invalid Master Password.');
      setAuthLoading(false);
      return;
    }

    try {
      const data = await AuthService.adminMasterLogin('2026/');
      localStorage.setItem('attendx_token', data.access_token);
      localStorage.setItem('attendx_admin_session', 'active');
      setIsAuthenticated(true);
      setPasswordInput('');
    } catch (err: any) {
      // Fallback local verification if offline or local network
      if (passwordInput.trim() === '2026/') {
        localStorage.setItem('attendx_admin_session', 'active');
        setIsAuthenticated(true);
        setPasswordInput('');
      } else {
        setAuthError(err.response?.data?.detail || 'Authentication failed.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLock = () => {
    localStorage.removeItem('attendx_admin_session');
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const refreshAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingData(true);
    try {
      const [clsList, stuList, subList] = await Promise.all([
        ClassService.getClasses().catch(() => []),
        StudentService.getStudents().catch(() => []),
        SubjectService.getSubjects().catch(() => []),
      ]);
      setClasses(clsList);
      setStudents(stuList);
      setSubjects(subList);

      if (clsList.length > 0) {
        if (!newStudentClassId) setNewStudentClassId(clsList[0].id);
        if (!newSubjectClassId) setNewSubjectClassId(clsList[0].id);
      }

      // Check health
      api.get('/health').then(res => setSystemHealth(res.data)).catch(() => {});
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [isAuthenticated, newStudentClassId, newSubjectClassId]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshAllData();
    }
  }, [isAuthenticated, refreshAllData]);

  // ── Class Handlers ──────────────────────────────────────────────────────────
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ClassService.createClass({
        name: newClassName.trim(),
        section: newClassSection.trim(),
        academic_year: newAcademicYear.trim(),
      });
      setShowCreateClassModal(false);
      setNewClassName('');
      setNewClassSection('');
      notify('Class section created successfully.');
      refreshAllData();
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to create class.', 'error');
    }
  };

  const handleDeleteClass = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete class "${name}"?`)) return;
    try {
      await ClassService.deleteClass(id);
      notify(`Class "${name}" deleted.`);
      refreshAllData();
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to delete class.', 'error');
    }
  };

  // ── Student Handlers ────────────────────────────────────────────────────────
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await StudentService.createStudent({
        student_id: newStudentId.trim(),
        name: newStudentName.trim(),
        roll_number: newStudentRoll.trim(),
        class_id: newStudentClassId,
        email: newStudentEmail.trim() || undefined,
      });
      setShowCreateStudentModal(false);
      setNewStudentId('');
      setNewStudentName('');
      setNewStudentRoll('');
      setNewStudentEmail('');
      notify('Student enrolled successfully.');
      refreshAllData();
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to enroll student.', 'error');
    }
  };

  const handleDeleteStudent = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete student "${name}" and all face data?`)) return;
    try {
      await StudentService.deleteStudent(id);
      notify(`Student "${name}" deleted.`);
      refreshAllData();
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to delete student.', 'error');
    }
  };

  const handleResetStudentFace = async (id: number, name: string) => {
    if (!window.confirm(`Reset face training vectors for "${name}"? They will need to scan again.`)) return;
    try {
      await StudentService.deleteFaceData(id);
      notify(`Face data wiped for "${name}".`);
      refreshAllData();
    } catch (err: any) {
      notify('Failed to wipe face data.', 'error');
    }
  };

  // ── Subject Handlers ────────────────────────────────────────────────────────
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await SubjectService.createSubject({
        name: newSubjectName.trim(),
        code: newSubjectCode.trim(),
        class_id: newSubjectClassId,
      });
      setShowCreateSubjectModal(false);
      setNewSubjectName('');
      setNewSubjectCode('');
      notify('Subject added successfully.');
      refreshAllData();
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to add subject.', 'error');
    }
  };

  const handleDeleteSubject = async (id: number, name: string) => {
    if (!window.confirm(`Delete subject "${name}"?`)) return;
    try {
      await SubjectService.deleteSubject(id);
      notify(`Subject "${name}" deleted.`);
      refreshAllData();
    } catch (err: any) {
      notify('Failed to delete subject.', 'error');
    }
  };

  // ── FILTERED STUDENTS ───────────────────────────────────────────────────────
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.student_id.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesClass = selectedClassFilter === 'ALL' || s.class_id === selectedClassFilter;
    return matchesSearch && matchesClass;
  });

  const totalFacesStored = students.reduce((acc, s) => acc + (s.face_count || 0), 0);

  // ── RENDER 1: MASTER PASSWORD LOCK SCREEN ──────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#08090d] text-zinc-100 flex items-center justify-center p-4 relative select-none">
        {/* Subtle Ambient Backlight */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-zinc-700/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-sm w-full space-y-6 relative z-10">
          {/* Brand & Terminal Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 rounded-2xl bg-zinc-900 border border-white/[0.08] text-zinc-300 shadow-2xl">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">AttendX Control Terminal</h1>
            <p className="text-xs text-zinc-500 font-mono tracking-wide">
              ADMINISTRATION GATEWAY • RESTRICTED
            </p>
          </div>

          {/* Master Password Card */}
          <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-6 shadow-2xl backdrop-blur-2xl">
            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-semibold uppercase tracking-widest text-zinc-400 mb-2">
                  Enter Master Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    autoFocus
                    placeholder="••••••••"
                    required
                    className="w-full bg-[#08090d] border border-white/[0.1] rounded-xl pl-10 pr-10 py-3 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-zinc-400 transition-all placeholder:text-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick Keypad for fast touch / click */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {['2', '0', '2', '6', '/'].map((char, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPasswordInput((prev) => prev + char)}
                    className="py-2 bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.05] rounded-lg text-xs font-mono text-zinc-300 hover:text-white transition-all active:scale-95"
                  >
                    {char}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPasswordInput((prev) => prev.slice(0, -1))}
                  className="py-2 bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.05] rounded-lg text-[10px] font-mono text-zinc-400 transition-all"
                >
                  DEL
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordInput('')}
                  className="col-span-2 py-2 bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.05] rounded-lg text-[10px] font-mono text-zinc-400 transition-all"
                >
                  CLEAR
                </button>
              </div>

              <button
                type="submit"
                disabled={authLoading || !passwordInput}
                className="w-full py-3 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                {authLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Unlock Admin Console</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-white/[0.06] text-center">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1 font-mono"
              >
                ← Return to Teacher Portal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER 2: UNLOCKED ADMIN CONSOLE ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100 flex flex-col antialiased selection:bg-zinc-700 selection:text-white">
      {/* Toast Notification */}
      {actionMessage && (
        <div className={`fixed top-4 right-4 z-50 py-2.5 px-4 rounded-xl border shadow-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
          actionMessage.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
            : 'bg-rose-950/90 border-rose-500/30 text-rose-200'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="border-b border-white/[0.06] bg-[#0c0d12]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-200">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white tracking-tight">AttendX</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/[0.06]">
                  ADMIN
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">ROOT OPERATOR CONSOLE</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/take-attendance')}
              className="hidden sm:inline-flex py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg border border-white/[0.06] transition-all"
            >
              Live Attendance
            </button>
            <button
              onClick={() => navigate('/student')}
              className="hidden sm:inline-flex py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg border border-white/[0.06] transition-all"
            >
              Student Portal
            </button>
            <button
              onClick={refreshAllData}
              disabled={loadingData}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg border border-white/[0.06] transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleAdminLock}
              className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Terminal</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto no-scrollbar border-t border-white/[0.04]">
          {[
            { id: 'overview', label: 'Overview & Telemetry', icon: Activity },
            { id: 'classes', label: `Classes (${classes.length})`, icon: BookOpen },
            { id: 'students', label: `Students (${students.length})`, icon: Users },
            { id: 'subjects', label: `Subjects (${subjects.length})`, icon: Sliders },
            { id: 'diagnostics', label: 'System Diagnostics', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`py-3 px-3.5 text-xs font-medium flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                  isActive
                    ? 'border-zinc-200 text-white font-semibold bg-white/[0.02]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.01]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* ── TAB 1: OVERVIEW & TELEMETRY ───────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Metric KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] font-mono uppercase tracking-widest">Enrolled Students</span>
                  <Users className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white tracking-tight">{students.length}</span>
                  <span className="text-xs text-zinc-500">active profiles</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  {students.filter(s => (s.face_count || 0) > 0).length} calibrated with face data
                </div>
              </div>

              <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] font-mono uppercase tracking-widest">Class Sections</span>
                  <BookOpen className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white tracking-tight">{classes.length}</span>
                  <span className="text-xs text-zinc-500">cohorts</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  {subjects.length} active subject modules
                </div>
              </div>

              <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] font-mono uppercase tracking-widest">Biometric Database</span>
                  <Sparkles className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white tracking-tight">{totalFacesStored}</span>
                  <span className="text-xs text-zinc-500">128-d vectors</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Real-time OpenCV SFace embeddings
                </div>
              </div>

              <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[10px] font-mono uppercase tracking-widest">Inference Engine</span>
                  <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-emerald-400 tracking-tight">YuNet + SFace</span>
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ZeroGPU / ONNX Active</span>
                </div>
              </div>
            </div>

            {/* Quick Management Shortcuts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-zinc-400" />
                  Classes Quick Setup
                </h3>
                <p className="text-xs text-zinc-400">
                  Create class sections, manage academic years, and assign faculty.
                </p>
                <button
                  onClick={() => { setActiveTab('classes'); setShowCreateClassModal(true); }}
                  className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Class
                </button>
              </div>

              <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-400" />
                  Student Directory & Faces
                </h3>
                <p className="text-xs text-zinc-400">
                  View student training levels, manage enrollments, or wipe face embeddings.
                </p>
                <button
                  onClick={() => { setActiveTab('students'); setShowCreateStudentModal(true); }}
                  className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Enroll New Student
                </button>
              </div>

              <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-zinc-400" />
                  Curriculum & Subjects
                </h3>
                <p className="text-xs text-zinc-400">
                  Configure subject codes, syllabus mappings, and class assignments.
                </p>
                <button
                  onClick={() => { setActiveTab('subjects'); setShowCreateSubjectModal(true); }}
                  className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Subject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: CLASSES MANAGEMENT ──────────────────────────────────────── */}
        {activeTab === 'classes' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Class Sections Directory</h2>
                <p className="text-xs text-zinc-400">Manage all registered academic classes and student allotments.</p>
              </div>
              <button
                onClick={() => setShowCreateClassModal(true)}
                className="py-2 px-3.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Class</span>
              </button>
            </div>

            {classes.length === 0 ? (
              <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-12 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">No Classes Registered Yet</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Create your first class section to begin enrolling students and taking attendance.
                </p>
                <button
                  onClick={() => setShowCreateClassModal(true)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl"
                >
                  + Add First Class
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((c) => (
                  <div key={c.id} className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white">{c.name}</h3>
                        <p className="text-xs text-zinc-400">Section {c.section} • {c.academic_year}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteClass(c.id, `${c.name} - ${c.section}`)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Delete Class"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        {students.filter(s => s.class_id === c.id).length} Students
                      </span>
                      <button
                        onClick={() => { setSelectedClassFilter(c.id); setActiveTab('students'); }}
                        className="text-zinc-300 hover:text-white font-medium hover:underline flex items-center gap-1"
                      >
                        View Students →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: STUDENT DIRECTORY & CONTINUOUS FACE TRAINING ──────────────── */}
        {activeTab === 'students' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Student Directory & Biometric Telemetry</h2>
                <p className="text-xs text-zinc-400">Real-time status of enrolled face vectors and training accuracy tiers.</p>
              </div>
              <button
                onClick={() => setShowCreateStudentModal(true)}
                className="py-2 px-3.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enroll Student</span>
              </button>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-3 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by name, Student ID, or Roll number..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="bg-[#08090d] border border-white/[0.08] text-zinc-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-zinc-400"
              >
                <option value="ALL">All Classes ({students.length})</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.section}
                  </option>
                ))}
              </select>
            </div>

            {/* Student Table */}
            <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
              {filteredStudents.length === 0 ? (
                <div className="p-10 text-center text-zinc-500 text-xs">
                  No students found matching current filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0c0d12] text-zinc-400 border-b border-white/[0.06] font-mono uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Student ID / Roll</th>
                        <th className="py-3 px-4">Full Name</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Face Embeddings</th>
                        <th className="py-3 px-4">Training Precision</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredStudents.map((s) => {
                        const faceCount = s.face_count || 0;
                        const cls = classes.find(c => c.id === s.class_id);

                        let tierBadge = { label: 'Not Scanned', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
                        if (faceCount >= 20) {
                          tierBadge = { label: 'Ultra Precision', color: 'bg-purple-500/10 text-purple-300 border-purple-500/20' };
                        } else if (faceCount >= 10) {
                          tierBadge = { label: 'High Precision', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' };
                        } else if (faceCount >= 5) {
                          tierBadge = { label: 'Standard Baseline', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' };
                        } else if (faceCount > 0) {
                          tierBadge = { label: 'Calibrating', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' };
                        }

                        return (
                          <tr key={s.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-3 px-4 font-mono font-semibold text-zinc-300">
                              <div>{s.student_id}</div>
                              <div className="text-[10px] text-zinc-500">Roll: {s.roll_number}</div>
                            </td>
                            <td className="py-3 px-4 font-bold text-white">
                              {s.name}
                              {s.email && <div className="text-[10px] text-zinc-500 font-normal">{s.email}</div>}
                            </td>
                            <td className="py-3 px-4 text-zinc-300">
                              {cls ? `${cls.name} ${cls.section}` : 'Unassigned'}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-white">{faceCount}</span>
                              <span className="text-zinc-500 text-[10px] ml-1">vectors</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${tierBadge.color}`}>
                                {tierBadge.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              {faceCount > 0 && (
                                <button
                                  onClick={() => handleResetStudentFace(s.id, s.name)}
                                  className="text-[10px] py-1 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 rounded font-medium transition-all"
                                  title="Wipe biometric vectors"
                                >
                                  Wipe Biometrics
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteStudent(s.id, s.name)}
                                className="text-[10px] py-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded font-medium transition-all"
                                title="Delete Student"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: SUBJECTS CATALOG ────────────────────────────────────────── */}
        {activeTab === 'subjects' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Subjects Catalog</h2>
                <p className="text-xs text-zinc-400">Configure curriculum modules, subject codes, and course allocations.</p>
              </div>
              <button
                onClick={() => setShowCreateSubjectModal(true)}
                className="py-2 px-3.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>
            </div>

            {subjects.length === 0 ? (
              <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-12 text-center space-y-3">
                <Sliders className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">No Subjects Added Yet</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Add course subjects to allow teachers to take roll calls and log attendance sessions.
                </p>
                <button
                  onClick={() => setShowCreateSubjectModal(true)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl"
                >
                  + Add First Subject
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((sub) => {
                  const cls = classes.find(c => c.id === sub.class_id);
                  return (
                    <div key={sub.id} className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-5 space-y-3 shadow-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/[0.06]">
                            {sub.code}
                          </span>
                          <h3 className="text-sm font-bold text-white mt-1.5">{sub.name}</h3>
                          <p className="text-xs text-zinc-400">{cls ? `${cls.name} - ${cls.section}` : 'General Class'}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteSubject(sub.id, sub.name)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: SYSTEM DIAGNOSTICS & AUDIT ──────────────────────────────── */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-base font-bold text-white">System Architecture & Diagnostics</h2>
              <p className="text-xs text-zinc-400">Live operational status of ZeroGPU, OpenCV pipeline, and database services.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  Neural Vision Pipeline
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-zinc-500">Face Detector</span>
                    <span className="text-zinc-200">OpenCV YuNet (ONNX)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-zinc-500">Face Embedder</span>
                    <span className="text-zinc-200">OpenCV SFace 128-D (ONNX)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-zinc-500">ZeroGPU Target</span>
                    <span className="text-emerald-400">Hugging Face @spaces.GPU Active</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-500">Matcher Strategy</span>
                    <span className="text-zinc-200">Cosine Sim + Top-2 Margin Gap</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0f1117] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  Database & API Gateway
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-zinc-500">Backend API</span>
                    <span className="text-zinc-200">FastAPI + SQLite Engine</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-zinc-500">API Health Status</span>
                    <span className="text-emerald-400">{systemHealth?.status === 'ok' ? 'Healthy (200 OK)' : 'Operational'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                    <span className="text-zinc-500">Frontend Hosting</span>
                    <span className="text-zinc-200">Vercel Edge Network</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-zinc-500">Interactive Docs</span>
                    <a
                      href="https://iamudit02-attendx-api.hf.space/docs"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Swagger UI <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── MODAL: CREATE CLASS ─────────────────────────────────────────────── */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f1117] border border-white/[0.1] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Create New Class Section</h3>
              <button onClick={() => setShowCreateClassModal(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Class / Department Name</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science & Eng"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  required
                  className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1">Section</label>
                  <input
                    type="text"
                    placeholder="e.g. A or 1"
                    value={newClassSection}
                    onChange={(e) => setNewClassSection(e.target.value)}
                    required
                    className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Academic Year</label>
                  <input
                    type="text"
                    placeholder="2026-27"
                    value={newAcademicYear}
                    onChange={(e) => setNewAcademicYear(e.target.value)}
                    required
                    className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl transition-all shadow-md"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE STUDENT ───────────────────────────────────────────── */}
      {showCreateStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f1117] border border-white/[0.1] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Enroll New Student</h3>
              <button onClick={() => setShowCreateStudentModal(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1">Student ID (Login)</label>
                  <input
                    type="text"
                    placeholder="e.g. STU101"
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    required
                    className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Roll Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 01"
                    value={newStudentRoll}
                    onChange={(e) => setNewStudentRoll(e.target.value)}
                    required
                    className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  required
                  className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Assign Class</label>
                <select
                  value={newStudentClassId}
                  onChange={(e) => setNewStudentClassId(Number(e.target.value))}
                  required
                  className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-zinc-400"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.section} ({c.academic_year})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="alex@university.edu"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateStudentModal(false)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl transition-all shadow-md"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE SUBJECT ───────────────────────────────────────────── */}
      {showCreateSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f1117] border border-white/[0.1] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add Curriculum Subject</h3>
              <button onClick={() => setShowCreateSubjectModal(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Neural Networks & Deep Learning"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  required
                  className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Subject Code</label>
                <input
                  type="text"
                  placeholder="e.g. CS401"
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                  required
                  className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Assign to Class</label>
                <select
                  value={newSubjectClassId}
                  onChange={(e) => setNewSubjectClassId(Number(e.target.value))}
                  required
                  className="w-full bg-[#08090d] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-zinc-400"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.section}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSubjectModal(false)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl transition-all shadow-md"
                >
                  Add Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
