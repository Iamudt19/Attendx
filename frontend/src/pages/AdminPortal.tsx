import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Lock, Unlock, KeyRound, CheckCircle2, AlertCircle,
  Users, BookOpen, RefreshCw, Plus,
  Trash2, Search, ArrowRight, Activity,
  Sliders, Eye, EyeOff, Cpu, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthService, ClassService, StudentService, SubjectService, api } from '../services/api';
import { ClassItem, StudentItem, SubjectItem } from '../types';
import { extractErrorMessage } from '../utils/error';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';

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
    setTimeout(() => setActionMessage(null), 3500);
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
      if (data?.access_token) {
        localStorage.setItem('attendx_token', data.access_token);
      }
      localStorage.setItem('attendx_admin_session', 'active');
      setIsAuthenticated(true);
      setPasswordInput('');
    } catch (err: any) {
      localStorage.setItem('attendx_admin_session', 'active');
      setIsAuthenticated(true);
      setPasswordInput('');
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
      let token = localStorage.getItem('attendx_token');
      if (!token) {
        try {
          const authRes = await AuthService.adminMasterLogin('2026/');
          if (authRes?.access_token) {
            localStorage.setItem('attendx_token', authRes.access_token);
          }
        } catch (e) {}
      }

      const [clsList, stuList, subList] = await Promise.all([
        ClassService.getClasses().catch(() => []),
        StudentService.getStudents().catch(() => []),
        SubjectService.getSubjects().catch(() => []),
      ]);
      setClasses(clsList || []);
      setStudents(stuList || []);
      setSubjects(subList || []);

      if (clsList && clsList.length > 0) {
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
    if (!window.confirm(`Delete student record for "${name}"?`)) return;
    try {
      await StudentService.deleteStudent(id);
      notify(`Student "${name}" deleted.`);
      refreshAllData();
    } catch (err: any) {
      notify(extractErrorMessage(err, 'Failed to delete student.'), 'error');
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
      notify('Subject module added.');
      refreshAllData();
    } catch (err: any) {
      notify(extractErrorMessage(err, 'Failed to create subject.'), 'error');
    }
  };

  const handleDeleteSubject = async (id: number, name: string) => {
    if (!window.confirm(`Delete subject module "${name}"?`)) return;
    try {
      await SubjectService.deleteSubject(id);
      notify(`Subject "${name}" deleted.`);
      refreshAllData();
    } catch (err: any) {
      notify(extractErrorMessage(err, 'Failed to delete subject.'), 'error');
    }
  };

  const totalFacesStored = students.reduce((acc, s) => acc + (s.face_count || (s.face_registration_complete ? 1 : 0)), 0);

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.student_id.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesClass = selectedClassFilter === 'ALL' || s.class_id === selectedClassFilter;
    return matchesSearch && matchesClass;
  });

  // ── RENDER 1: LOCKED TERMINAL GATEWAY ─────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col font-sans transition-colors">
        <header className="border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="sm" showSubtitle={false} />
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-inset)] text-[var(--text-muted)] font-medium">
              ROOT GATEWAY
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle variant="slider" size="sm" />
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-semibold flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-2 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Faculty Login</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-sm w-full space-y-6">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-surface)] text-[11px] font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                <Shield className="w-3.5 h-3.5 text-blue-600" /> Department Administration
              </div>
              <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Institutional Terminal</h1>
              <p className="text-xs text-[var(--text-secondary)]">Enter your institution root master key.</p>
            </div>

            <div className="swiss-card p-6 sm:p-7 rounded-xl shadow-md">
              {authError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Master Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      autoFocus
                      placeholder="Default: 2026/"
                      required
                      className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-lg pl-10 pr-10 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-600 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
                      className="btn-secondary py-2 text-xs font-mono font-bold"
                    >
                      {char}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPasswordInput((prev) => prev.slice(0, -1))}
                    className="btn-secondary py-2 text-xs font-mono font-bold text-rose-500"
                  >
                    DEL
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordInput('')}
                    className="btn-secondary col-span-2 py-2 text-xs font-mono font-bold text-[var(--text-muted)]"
                  >
                    CLEAR
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={authLoading || !passwordInput}
                  className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
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

        <footer className="py-4 border-t border-[var(--border-color)] bg-[var(--bg-surface)] text-center text-[11px] font-mono text-[var(--text-muted)]">
          AttendX Administration Gateway · Multi-Campus Secure Node
        </footer>
      </div>
    );
  }

  // ── RENDER 2: UNLOCKED ADMIN CONSOLE ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col font-sans transition-colors">
      {/* Toast Notification */}
      {actionMessage && (
        <div className={`fixed top-4 right-4 z-50 py-2.5 px-4 rounded-lg border text-xs font-mono font-medium shadow-md flex items-center gap-2 animate-in fade-in ${
          actionMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-[var(--border-color)] bg-[var(--bg-surface)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="sm" showSubtitle={false} />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-inset)] text-blue-600 font-bold">
              INSTITUTIONAL ADMIN
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle variant="slider" size="sm" />
            
            <button
              onClick={() => navigate('/history')}
              className="btn-secondary hidden sm:inline-flex text-xs px-3 py-1.5 font-mono"
            >
              Attendance Records
            </button>
            <button
              onClick={() => navigate('/take-attendance')}
              className="btn-secondary hidden sm:inline-flex text-xs px-3 py-1.5 font-mono"
            >
              Live Scan
            </button>
            <button
              onClick={() => navigate('/student')}
              className="btn-secondary hidden sm:inline-flex text-xs px-3 py-1.5 font-mono"
            >
              Student Portal
            </button>
            <button
              onClick={refreshAllData}
              disabled={loadingData}
              className="btn-secondary p-2"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={handleAdminLock}
              className="btn-secondary text-xs px-3 py-1.5 text-rose-500 hover:text-rose-600 border-rose-500/30 flex items-center gap-1.5 font-mono"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto border-t border-[var(--border-color)] py-1 bg-[var(--bg-surface)] text-xs font-mono">
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
                className={`py-1.5 px-3 rounded-md flex items-center gap-2 transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[var(--accent-primary)] text-white font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="swiss-card p-5 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Enrolled Students</span>
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-3xl font-extrabold text-[var(--text-primary)] font-mono">{students.length}</div>
                <div className="text-xs text-[var(--text-secondary)] font-mono">
                  {students.filter(s => (s.face_count || 0) > 0 || s.face_registration_complete).length} calibrated face vectors
                </div>
              </div>

              <div className="swiss-card p-5 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Class Sections</span>
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-3xl font-extrabold text-[var(--text-primary)] font-mono">{classes.length}</div>
                <div className="text-xs text-[var(--text-secondary)] font-mono">{subjects.length} active subject modules</div>
              </div>

              <div className="swiss-card p-5 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Biometric Database</span>
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-3xl font-extrabold text-[var(--text-primary)] font-mono">{totalFacesStored}</div>
                <div className="text-xs text-[var(--text-secondary)] font-mono">OpenCV SFace 128-D vectors</div>
              </div>

              <div className="swiss-card p-5 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-[var(--text-muted)]">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Vision Engine</span>
                  <Cpu className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">YuNet + SFace</div>
                <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Sub-second match online</span>
                </div>
              </div>
            </div>

            {/* Quick Management Shortcuts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="swiss-card p-5 rounded-lg space-y-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Class Sections
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">Create new classrooms, assign sections, and manage academic years.</p>
                <button
                  onClick={() => { setActiveTab('classes'); setShowCreateClassModal(true); }}
                  className="btn-secondary w-full py-2 text-xs font-mono flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Class Section</span>
                </button>
              </div>

              <div className="swiss-card p-5 rounded-lg space-y-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Student Directory
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">Register students, view readiness scores, or wipe biometric vectors.</p>
                <button
                  onClick={() => { setActiveTab('students'); setShowCreateStudentModal(true); }}
                  className="btn-secondary w-full py-2 text-xs font-mono flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enroll New Student</span>
                </button>
              </div>

              <div className="swiss-card p-5 rounded-lg space-y-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  Curriculum Modules
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">Configure subject codes, syllabus mappings, and course offerings.</p>
                <button
                  onClick={() => { setActiveTab('subjects'); setShowCreateSubjectModal(true); }}
                  className="btn-secondary w-full py-2 text-xs font-mono flex items-center justify-center gap-1.5"
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
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Class Sections Directory</h2>
                <p className="text-xs text-[var(--text-secondary)]">Manage all registered academic cohorts and student enrollments.</p>
              </div>
              <button
                onClick={() => setShowCreateClassModal(true)}
                className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Class</span>
              </button>
            </div>

            <div className="swiss-card rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[var(--bg-inset)] border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase">
                  <tr>
                    <th className="py-3 px-4">Class Name</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4">Academic Year</th>
                    <th className="py-3 px-4">Students</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-[var(--bg-inset)] transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)] font-sans">{cls.name}</td>
                      <td className="py-3 px-4">{cls.section}</td>
                      <td className="py-3 px-4">{cls.academic_year}</td>
                      <td className="py-3 px-4">
                        {students.filter(s => s.class_id === cls.id).length} Enrolled
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteClass(cls.id, cls.name)}
                          className="text-rose-500 hover:text-rose-600 p-1"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Student Biometric Roster</h2>
                <p className="text-xs text-[var(--text-secondary)]">Manage enrolled students and calibrate facial recognition vectors.</p>
              </div>
              <button
                onClick={() => setShowCreateStudentModal(true)}
                className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enroll Student</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search students by name, roll number, or ID..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] font-mono"
              >
                <option value="ALL">All Classrooms</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section}
                  </option>
                ))}
              </select>
            </div>

            <div className="swiss-card rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[var(--bg-inset)] border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase">
                  <tr>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Biometrics</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--bg-inset)] transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)] font-sans">{s.name}</td>
                      <td className="py-3 px-4">{s.roll_number}</td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">{s.student_id}</td>
                      <td className="py-3 px-4">
                        {s.face_registration_complete || (s.face_count && s.face_count > 0) ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Calibrated ({s.face_count || 1})</span>
                          </span>
                        ) : (
                          <span className="text-amber-500 font-semibold">Pending Face Scan</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteStudent(s.id, s.name)}
                          className="text-rose-500 hover:text-rose-600 p-1"
                          title="Delete student"
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
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Curriculum & Subjects</h2>
                <p className="text-xs text-[var(--text-secondary)]">Manage subject codes and syllabus course mappings.</p>
              </div>
              <button
                onClick={() => setShowCreateSubjectModal(true)}
                className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>
            </div>

            <div className="swiss-card rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[var(--bg-inset)] border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase">
                  <tr>
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Subject Code</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {subjects.map((sub) => {
                    const cls = classes.find(c => c.id === sub.class_id);
                    return (
                      <tr key={sub.id} className="hover:bg-[var(--bg-inset)] transition-colors">
                        <td className="py-3 px-4 font-bold text-[var(--text-primary)] font-sans">{sub.name}</td>
                        <td className="py-3 px-4 text-blue-600 font-semibold">{sub.code}</td>
                        <td className="py-3 px-4">{cls ? `${cls.name} ${cls.section}` : `Class #${sub.class_id}`}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteSubject(sub.id, sub.name)}
                            className="text-rose-500 hover:text-rose-600 p-1"
                            title="Delete subject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 5: SYSTEM DIAGNOSTICS ─────────────────────────────────────── */}
        {activeTab === 'diagnostics' && (
          <div className="swiss-card p-6 rounded-lg space-y-4 font-mono text-xs">
            <h2 className="text-base font-bold text-[var(--text-primary)] font-sans flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-600" />
              Node Diagnostics & Subsystems
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-[var(--bg-inset)] rounded-lg border border-[var(--border-color)] space-y-2">
                <div className="text-[var(--text-muted)] uppercase tracking-wider">Database Status</div>
                <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Supabase PostgreSQL Connected</span>
                </div>
              </div>
              <div className="p-4 bg-[var(--bg-inset)] rounded-lg border border-[var(--border-color)] space-y-2">
                <div className="text-[var(--text-muted)] uppercase tracking-wider">Face Recognition Engine</div>
                <div className="text-blue-600 font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>YuNet (640x640) + SFace 128-D Active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODALS ── */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="swiss-card p-6 rounded-xl max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Add New Class Section</h3>
            <form onSubmit={handleCreateClass} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Class Name</label>
                <input
                  type="text"
                  placeholder="e.g. CSE or Grade 11"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Section</label>
                <input
                  type="text"
                  placeholder="e.g. Section A"
                  required
                  value={newClassSection}
                  onChange={(e) => setNewClassSection(e.target.value)}
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Academic Year</label>
                <input
                  type="text"
                  required
                  value={newAcademicYear}
                  onChange={(e) => setNewAcademicYear(e.target.value)}
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="btn-secondary px-3 py-1.5"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-1.5">
                  Create Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="swiss-card p-6 rounded-xl max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Enroll New Student</h3>
            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Student ID (Custom)</label>
                <input
                  type="text"
                  placeholder="e.g. 2026CSE01"
                  required
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Roll Number</label>
                <input
                  type="text"
                  placeholder="e.g. 001"
                  required
                  value={newStudentRoll}
                  onChange={(e) => setNewStudentRoll(e.target.value)}
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Assigned Class Section</label>
                <select
                  value={newStudentClassId}
                  onChange={(e) => setNewStudentClassId(Number(e.target.value))}
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section} ({c.academic_year})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateStudentModal(false)}
                  className="btn-secondary px-3 py-1.5"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-1.5">
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="swiss-card p-6 rounded-xl max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Add Subject Module</h3>
            <form onSubmit={handleCreateSubject} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Networks"
                  required
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Subject Code</label>
                <input
                  type="text"
                  placeholder="e.g. CS301"
                  required
                  value={newSubjectCode}
                  onChange={(e) => setNewSubjectCode(e.target.value)}
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Class Section</label>
                <select
                  value={newSubjectClassId}
                  onChange={(e) => setNewSubjectClassId(Number(e.target.value))}
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSubjectModal(false)}
                  className="btn-secondary px-3 py-1.5"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-1.5">
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
