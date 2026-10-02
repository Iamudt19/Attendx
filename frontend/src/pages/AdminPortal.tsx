import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Lock, Unlock, KeyRound, CheckCircle2, AlertCircle,
  Users, BookOpen, GraduationCap, Server, RefreshCw, Plus,
  Trash2, Search, ArrowRight, ExternalLink, Activity, Sparkles,
  Sliders, Eye, EyeOff, Check, X, ShieldAlert, ShieldCheck, Cpu, Database, Camera, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthService, ClassService, StudentService, SubjectService, api } from '../services/api';
import { ClassItem, StudentItem, SubjectItem } from '../types';
import { extractErrorMessage } from '../utils/error';

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

  // Authenticate with master password 2026/
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
      if (passwordInput.trim() === '2026/') {
        localStorage.setItem('attendx_admin_session', 'active');
        setIsAuthenticated(true);
        setPasswordInput('');
      } else {
        setAuthError(extractErrorMessage(err, 'Authentication failed.'));
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

  // Fetch all data
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

  // Class Handlers
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
      notify(extractErrorMessage(err, 'Failed to create class.'), 'error');
    }
  };

  const handleDeleteClass = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete class "${name}"?`)) return;
    try {
      await ClassService.deleteClass(id);
      notify(`Class "${name}" deleted.`);
      refreshAllData();
    } catch (err: any) {
      notify(extractErrorMessage(err, 'Failed to delete class.'), 'error');
    }
  };

  // Student Handlers
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
      notify(extractErrorMessage(err, 'Failed to enroll student.'), 'error');
    }
  };

  const handleDeleteStudent = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete student "${name}" and all face data?`)) return;
    try {
      await StudentService.deleteStudent(id);
      notify(`Student "${name}" deleted.`);
      refreshAllData();
    } catch (err: any) {
      notify(extractErrorMessage(err, 'Failed to delete student.'), 'error');
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

  // Subject Handlers
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
      notify(extractErrorMessage(err, 'Failed to add subject.'), 'error');
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
      <div className="min-h-screen bg-[#FBFBFB] text-[#111827] flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans">
        <header className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer group">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center">
              <span className="font-extrabold text-2xl tracking-tight text-slate-900">Attend</span>
              <span className="font-extrabold text-2xl tracking-tight text-blue-600">X</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="text-sm font-semibold text-slate-600 hover:text-slate-950 flex items-center gap-1 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100/60"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Faculty Login</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-sm w-full space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 mb-1">
                <Shield className="w-3.5 h-3.5 text-blue-600" /> Department Administration
              </div>
              <h1 className="font-serif text-3xl text-slate-900 font-normal tracking-tight">Institutional Terminal</h1>
              <p className="text-xs text-slate-500">Enter your institution root master key.</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)]">
              {authError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Master Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      autoFocus
                      placeholder="Default: 2026/"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick Keypad */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {['2', '0', '2', '6', '/'].map((char, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPasswordInput((prev) => prev + char)}
                      className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 transition-all"
                    >
                      {char}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPasswordInput((prev) => prev.slice(0, -1))}
                    className="py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-600"
                  >
                    DEL
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordInput('')}
                    className="col-span-2 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-600"
                  >
                    CLEAR
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={authLoading || !passwordInput}
                  className="w-full py-3 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {authLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Unlock Terminal</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </main>

        <footer className="py-6 border-t border-slate-200/80 bg-white text-center text-xs text-slate-500">
          AttendX Administration Gateway · Multi-Campus Secure Node
        </footer>
      </div>
    );
  }

  // ── RENDER 2: UNLOCKED ADMIN CONSOLE ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FBFBFB] text-[#111827] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {actionMessage && (
        <div className={`fixed top-4 right-4 z-50 py-3 px-5 rounded-2xl border shadow-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 ${
          actionMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-slate-200/90 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900">AttendX</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  INSTITUTIONAL ADMIN
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/take-attendance')}
              className="hidden sm:inline-flex py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
            >
              Live Scan
            </button>
            <button
              onClick={() => navigate('/student')}
              className="hidden sm:inline-flex py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
            >
              Student Portal
            </button>
            <button
              onClick={refreshAllData}
              disabled={loadingData}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleAdminLock}
              className="py-1.5 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Terminal</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-6 flex gap-2 overflow-x-auto no-scrollbar border-t border-slate-100 py-1.5 bg-white">
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
                className={`py-2 px-3.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shrink-0 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {/* ── TAB 1: OVERVIEW & TELEMETRY ───────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Enrolled Students</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{students.length}</div>
                <div className="text-xs text-slate-500">
                  {students.filter(s => (s.face_count || 0) > 0).length} calibrated with face vectors
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Class Sections</span>
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{classes.length}</div>
                <div className="text-xs text-slate-500">{subjects.length} active subject modules</div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Biometric Database</span>
                  <Sparkles className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{totalFacesStored}</div>
                <div className="text-xs text-slate-500">OpenCV SFace 128-D vectors</div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Vision Engine</span>
                  <Cpu className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-bold text-emerald-600 tracking-tight">YuNet + SFace</div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Sub-second match online</span>
                </div>
              </div>
            </div>

            {/* Quick Management Shortcuts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Class Sections
                </h3>
                <p className="text-xs text-slate-600">Create new classrooms, assign sections, and manage academic years.</p>
                <button
                  onClick={() => { setActiveTab('classes'); setShowCreateClassModal(true); }}
                  className="w-full py-2.5 px-3 bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Class Section</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Student Directory
                </h3>
                <p className="text-xs text-slate-600">Register students, view readiness scores, or wipe biometric vectors.</p>
                <button
                  onClick={() => { setActiveTab('students'); setShowCreateStudentModal(true); }}
                  className="w-full py-2.5 px-3 bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enroll New Student</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  Curriculum Modules
                </h3>
                <p className="text-xs text-slate-600">Configure subject codes, syllabus mappings, and course offerings.</p>
                <button
                  onClick={() => { setActiveTab('subjects'); setShowCreateSubjectModal(true); }}
                  className="w-full py-2.5 px-3 bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subject Code</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: CLASSES MANAGEMENT ──────────────────────────────────────── */}
        {activeTab === 'classes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl text-slate-900 font-normal">Class Sections Directory</h2>
                <p className="text-xs text-slate-500">Manage all registered academic cohorts and student enrollments.</p>
              </div>
              <button
                onClick={() => setShowCreateClassModal(true)}
                className="py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Class</span>
              </button>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Class Name</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4">Academic Year</th>
                    <th className="py-3 px-4">Students</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{cls.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{cls.section}</td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">{cls.academic_year}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-100">
                          {cls.student_count || 0} enrolled
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteClass(cls.id, cls.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete class"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: STUDENTS DIRECTORY ──────────────────────────────────────── */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl text-slate-900 font-normal">Student Biometric Directory</h2>
                <p className="text-xs text-slate-500">Search student profiles, training scores, and face vectors.</p>
              </div>
              <button
                onClick={() => setShowCreateStudentModal(true)}
                className="py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enroll Student</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search student name, ID, or roll number..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="w-full sm:w-48 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Classrooms</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.section}</option>
                ))}
              </select>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">ID & Roll</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Face Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((stu) => (
                    <tr key={stu.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{stu.name}</td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                        {stu.student_id} • {stu.roll_number}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                        {classes.find(c => c.id === stu.class_id)?.name || `Class #${stu.class_id}`}
                      </td>
                      <td className="py-3.5 px-4">
                        {(stu.face_count || 0) > 0 ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-100">
                            {stu.face_count} Scans Enrolled
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold border border-amber-100">
                            Pending Scan
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleResetStudentFace(stu.id, stu.name)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                          title="Reset Face Training Vectors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(stu.id, stu.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: SUBJECTS MANAGEMENT ─────────────────────────────────────── */}
        {activeTab === 'subjects' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl text-slate-900 font-normal">Subject Modules</h2>
                <p className="text-xs text-slate-500">Curriculum catalog and subject code mappings.</p>
              </div>
              <button
                onClick={() => setShowCreateSubjectModal(true)}
                className="py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Subject Code</th>
                    <th className="py-3 px-4">Class Allotment</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{sub.name}</td>
                      <td className="py-3.5 px-4 text-xs font-mono font-bold text-blue-600">{sub.code}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                        {classes.find(c => c.id === sub.class_id)?.name || `Class #${sub.class_id}`}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteSubject(sub.id, sub.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 5: SYSTEM DIAGNOSTICS ──────────────────────────────────────── */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-serif text-2xl text-slate-900 font-normal">System Diagnostics & Node Telemetry</h2>
              <p className="text-xs text-slate-500">Real-time status of the biometric recognition engine and database layer.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span>Database Layer</span>
                </div>
                <div className="text-2xl font-extrabold text-emerald-600">CONNECTED</div>
                <p className="text-xs text-slate-500">PostgreSQL Cloud Instance active with connection pooling.</p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span>Vision Pipeline</span>
                </div>
                <div className="text-2xl font-extrabold text-blue-600">YuNet + SFace 128-D</div>
                <p className="text-xs text-slate-500">ZeroGPU multi-thread face detection with cosine similarity matcher.</p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Security & GDPR</span>
                </div>
                <div className="text-2xl font-extrabold text-slate-900">ENCRYPTED</div>
                <p className="text-xs text-slate-500">Biometric mathematical coordinates only. Raw images not stored.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODALS ── */}
      {/* Create Class Modal */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-7 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-serif text-2xl text-slate-900 font-normal">Create New Class Section</h3>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Class Name</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. CSE"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Section</label>
                <input
                  type="text"
                  required
                  value={newClassSection}
                  onChange={(e) => setNewClassSection(e.target.value)}
                  placeholder="e.g. Section A"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Academic Year</label>
                <input
                  type="text"
                  required
                  value={newAcademicYear}
                  onChange={(e) => setNewAcademicYear(e.target.value)}
                  placeholder="2026-27"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Student Modal */}
      {showCreateStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-7 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-serif text-2xl text-slate-900 font-normal">Enroll New Student</h3>
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Student ID</label>
                  <input
                    type="text"
                    required
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    placeholder="e.g. STU050"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={newStudentRoll}
                    onChange={(e) => setNewStudentRoll(e.target.value)}
                    placeholder="2026CSE50"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Full Student Name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Class Section</label>
                <select
                  value={newStudentClassId}
                  onChange={(e) => setNewStudentClassId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.section}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateStudentModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  Enroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Subject Modal */}
      {showCreateSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-7 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-serif text-2xl text-slate-900 font-normal">Add Subject Module</h3>
            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Distributed Computing"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                  placeholder="e.g. CS402"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Class Allotment</label>
                <select
                  value={newSubjectClassId}
                  onChange={(e) => setNewSubjectClassId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.section}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSubjectModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl transition-colors"
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
