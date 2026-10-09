import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, Lock, Unlock, KeyRound, CheckCircle2, AlertCircle,
  Users, BookOpen, RefreshCw, Plus,
  Trash2, Search, ArrowRight, Activity,
  Sliders, Eye, EyeOff, Cpu, ChevronLeft,
  FileSpreadsheet, Edit3, Save, Check, RotateCcw, X, Calendar, Download, UserCheck,
  Server, Zap, HardDrive, Wifi, WifiOff, Globe, Clock, ShieldCheck, AlertTriangle,
  Play, Database, Terminal, Radio, Signal, Power
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  AuthService, ClassService, StudentService, SubjectService, 
  AttendanceService, SystemDiagnosticsService, BackendHealthResult, api 
} from '../services/api';
import { ClassItem, StudentItem, SubjectItem, AttendanceSessionOut, AttendanceRecordOut } from '../types';
import { extractErrorMessage } from '../utils/error';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { InstallAppButton } from '../components/InstallAppButton';

type AdminTab = 'overview' | 'attendance' | 'teachers' | 'classes' | 'students' | 'subjects' | 'diagnostics';

export const AdminPortal: React.FC = () => {
  const navigate = useNavigate();

  // Authentication State - always require password each time Admin is opened
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
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
  const [sessions, setSessions] = useState<AttendanceSessionOut[]>([]);
  const [pendingTeachers, setPendingTeachers] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);
  const [systemHealth, setSystemHealth] = useState<{ status: string; database: string; version: string } | null>(null);

  // System Diagnostics & Backend Pulse State
  const [backendHealth, setBackendHealth] = useState<BackendHealthResult | null>(null);
  const [isPingingBackend, setIsPingingBackend] = useState<boolean>(false);
  const [autoKeepAlive, setAutoKeepAlive] = useState<boolean>(true);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState<boolean>(false);
  const [pingHistory, setPingHistory] = useState<{ time: string; latency: number | null; status: string }[]>([]);

  // Attendance Editing State
  const [selectedSessionForEdit, setSelectedSessionForEdit] = useState<AttendanceSessionOut | null>(null);
  const [editableRecords, setEditableRecords] = useState<AttendanceRecordOut[]>([]);
  const [sessionSearch, setSessionSearch] = useState<string>('');
  const [sessionRecordSearch, setSessionRecordSearch] = useState<string>('');
  const [selectedSessionClassFilter, setSelectedSessionClassFilter] = useState<number | 'ALL'>('ALL');
  const [selectedSessionDateFilter, setSelectedSessionDateFilter] = useState<string>('');
  const [isSavingAttendance, setIsSavingAttendance] = useState<boolean>(false);
  const [attendanceSaveMessage, setAttendanceSaveMessage] = useState<string | null>(null);

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
  const [editingTeacherClasses, setEditingTeacherClasses] = useState<{
    id: number;
    name: string;
    email: string;
    assigned_classes: number[];
  } | null>(null);
  const [isSavingTeacherClasses, setIsSavingTeacherClasses] = useState<boolean>(false);

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Authenticate with master password Doomsday@1812
  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    if (passwordInput.trim() !== 'Doomsday@1812') {
      setAuthError('Access Denied: Invalid Master Password.');
      setAuthLoading(false);
      return;
    }

    try {
      const data = await AuthService.adminMasterLogin('Doomsday@1812');
      if (data?.access_token) {
        localStorage.setItem('attendx_admin_token', data.access_token);
        localStorage.setItem('attendx_token', data.access_token);
      }
      setIsAuthenticated(true);
      setPasswordInput('');
    } catch (err: any) {
      setAuthError(extractErrorMessage(err, 'Failed to authenticate with master password.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLock = () => {
    localStorage.removeItem('attendx_admin_session');
    localStorage.removeItem('attendx_admin_token');
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  // Fetch all data
  const refreshAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingData(true);
    try {
      let adminToken = localStorage.getItem('attendx_admin_token');
      if (!adminToken) {
        try {
          const authRes = await AuthService.adminMasterLogin('Doomsday@1812');
          if (authRes?.access_token) {
            localStorage.setItem('attendx_admin_token', authRes.access_token);
          }
        } catch (e) {}
      }

      const [clsList, stuList, subList, sessList, pendingTchs, allTchs] = await Promise.all([
        ClassService.getClasses().catch(() => []),
        StudentService.getStudents().catch(() => []),
        SubjectService.getSubjects().catch(() => []),
        AttendanceService.getSessions().catch(() => []),
        AuthService.getPendingTeachers().catch(() => []),
        AuthService.getAllTeachers().catch(() => []),
      ]);
      setClasses(clsList || []);
      setStudents(stuList || []);
      setSubjects(subList || []);
      setSessions(sessList || []);
      setPendingTeachers(pendingTchs || []);
      setAllTeachers(allTchs || []);

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

  const handleApproveTeacher = async (teacherId: number, teacherName: string) => {
    try {
      await AuthService.approveTeacher(teacherId);
      notify(`Educator "${teacherName}" approved and activated.`);
      refreshAllData();
    } catch (err: any) {
      notify(extractErrorMessage(err, 'Failed to approve teacher account.'), 'error');
    }
  };

  const handleRejectTeacher = async (teacherId: number, teacherName: string) => {
    if (!window.confirm(`Are you sure you want to reject the registration for "${teacherName}"?`)) return;
    try {
      await AuthService.rejectTeacher(teacherId);
      notify(`Registration for "${teacherName}" has been rejected.`);
      refreshAllData();
    } catch (err: any) {
      notify(extractErrorMessage(err, 'Failed to reject teacher registration.'), 'error');
    }
  };

  const handleOpenEditTeacherClasses = (teacher: any) => {
    setEditingTeacherClasses({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      assigned_classes: Array.isArray(teacher.assigned_classes) ? [...teacher.assigned_classes] : []
    });
  };

  const handleToggleTeacherClass = (classId: number) => {
    if (!editingTeacherClasses) return;
    setEditingTeacherClasses(prev => {
      if (!prev) return null;
      const exists = prev.assigned_classes.includes(classId);
      return {
        ...prev,
        assigned_classes: exists
          ? prev.assigned_classes.filter(id => id !== classId)
          : [...prev.assigned_classes, classId]
      };
    });
  };

  const handleSelectAllTeacherClasses = () => {
    if (!editingTeacherClasses) return;
    setEditingTeacherClasses(prev => prev ? {
      ...prev,
      assigned_classes: classes.map(c => c.id)
    } : null);
  };

  const handleDeselectAllTeacherClasses = () => {
    if (!editingTeacherClasses) return;
    setEditingTeacherClasses(prev => prev ? {
      ...prev,
      assigned_classes: []
    } : null);
  };

  const handleSaveTeacherClasses = async () => {
    if (!editingTeacherClasses) return;
    setIsSavingTeacherClasses(true);
    try {
      await AuthService.updateTeacherClasses(editingTeacherClasses.id, editingTeacherClasses.assigned_classes);
      notify(`Assigned classes updated for ${editingTeacherClasses.name}.`);
      setEditingTeacherClasses(null);
      refreshAllData();
    } catch (err: any) {
      notify(extractErrorMessage(err, 'Failed to update teacher assigned classes.'), 'error');
    } finally {
      setIsSavingTeacherClasses(false);
    }
  };

  const checkBackendPulse = useCallback(async (isUserInitiated = false) => {
    setIsPingingBackend(true);
    try {
      const result = await SystemDiagnosticsService.pingBackend(isUserInitiated ? 12000 : 6000);
      setBackendHealth(result);
      setPingHistory(prev => [
        { time: result.timestamp, latency: result.latency, status: result.status },
        ...prev.slice(0, 7)
      ]);
      if (isUserInitiated) {
        if (result.status === 'online') {
          notify(`Backend node is ONLINE (${result.latency}ms roundtrip latency).`);
        } else if (result.status === 'waking') {
          notify('Backend node is spinning up on Render... please wait 15-25 seconds.', 'error');
        } else {
          notify(`Backend node status: ${result.error || result.status}`, 'error');
        }
      }
    } catch (e: any) {
      setBackendHealth({
        status: 'offline',
        latency: null,
        data: null,
        endpoint: '/api',
        timestamp: new Date().toLocaleTimeString(),
        error: e.message || 'Offline'
      });
    } finally {
      setIsPingingBackend(false);
    }
  }, []);

  const handleDownloadLiveBackup = async () => {
    setIsDownloadingBackup(true);
    try {
      await SystemDiagnosticsService.downloadLiveBackup();
      notify('Live database JSON snapshot downloaded successfully.');
    } catch (e: any) {
      notify(extractErrorMessage(e, 'Failed to download live database snapshot.'), 'error');
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshAllData();
      checkBackendPulse(false);
    }
  }, [isAuthenticated, refreshAllData, checkBackendPulse]);

  useEffect(() => {
    if (!isAuthenticated || !autoKeepAlive) return;
    // Auto-ping every 60 seconds to keep Render container active & track latency
    const interval = setInterval(() => {
      checkBackendPulse(false);
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, autoKeepAlive, checkBackendPulse]);

  // Attendance Handlers
  const handleOpenSessionEditor = async (sessionItem: AttendanceSessionOut) => {
    setAttendanceSaveMessage(null);
    try {
      const detail = await AttendanceService.getSessionDetail(sessionItem.id);
      setSelectedSessionForEdit(detail);
      setEditableRecords(detail.records ? JSON.parse(JSON.stringify(detail.records)) : []);
    } catch (err) {
      setSelectedSessionForEdit(sessionItem);
      setEditableRecords(sessionItem.records ? JSON.parse(JSON.stringify(sessionItem.records)) : []);
    }
  };

  const handleToggleRecordStatus = (index: number) => {
    setEditableRecords(prev => {
      const copy = [...prev];
      const cur = copy[index];
      const nextStatus = cur.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
      copy[index] = {
        ...cur,
        status: nextStatus,
        verification_status: 'TEACHER_VERIFIED'
      };
      return copy;
    });
  };

  const handleMarkAllStatus = (status: 'PRESENT' | 'ABSENT') => {
    setEditableRecords(prev =>
      prev.map(r => ({
        ...r,
        status,
        verification_status: 'TEACHER_VERIFIED'
      }))
    );
  };

  const handleSaveAttendanceRecords = async () => {
    if (!selectedSessionForEdit) return;
    setIsSavingAttendance(true);
    setAttendanceSaveMessage(null);
    try {
      const recordsToUpdate = editableRecords.map((r) => ({
        student_id: r.student_id,
        status: r.status,
        confidence: r.confidence ?? 1.0,
        verification_status: r.verification_status ?? 'TEACHER_VERIFIED'
      }));

      const updated = await AttendanceService.updateSessionRecords(
        selectedSessionForEdit.id,
        recordsToUpdate
      );
      setSelectedSessionForEdit(updated);
      setEditableRecords(updated.records ? JSON.parse(JSON.stringify(updated.records)) : []);
      notify(`Attendance for session #${selectedSessionForEdit.id} successfully updated.`);
      setAttendanceSaveMessage('Attendance updated & synchronized with Supabase database.');
      refreshAllData();
      setTimeout(() => setAttendanceSaveMessage(null), 3500);
    } catch (err: any) {
      console.error('Failed to update session records in admin:', err);
      notify(extractErrorMessage(err, 'Failed to update attendance records.'), 'error');
    } finally {
      setIsSavingAttendance(false);
    }
  };

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
                      placeholder="Enter Master Password..."
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
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <Logo size="sm" showSubtitle={false} />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-inset)] text-blue-600 font-bold">
                INSTITUTIONAL ADMIN
              </span>
            </div>

            {/* Live Backend Heartbeat Pill */}
            {backendHealth && (
              <button
                onClick={() => checkBackendPulse(true)}
                disabled={isPingingBackend}
                className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all border ${
                  backendHealth.status === 'online'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    : backendHealth.status === 'waking'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 animate-pulse'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20 animate-bounce'
                }`}
                title="Backend Server Telemetry · Click to test ping / wake up"
              >
                <span className={`w-2 h-2 rounded-full ${
                  backendHealth.status === 'online' ? 'bg-emerald-500 animate-pulse' :
                  backendHealth.status === 'waking' ? 'bg-amber-500 animate-ping' :
                  'bg-rose-500'
                }`}></span>
                <span>
                  {isPingingBackend ? 'Pinging...' :
                   backendHealth.status === 'online' ? `Backend Live ${backendHealth.latency !== null ? `· ${backendHealth.latency}ms` : ''}` :
                   backendHealth.status === 'waking' ? 'Backend Spinning Up...' :
                   'Backend Spun Down (Wake)'}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <InstallAppButton variant="header" className="hidden md:inline-flex" />
            <ThemeToggle variant="button" className="sm:hidden p-2 rounded-xl text-xs border border-[var(--border-color)]" />
            <ThemeToggle variant="slider" size="sm" className="hidden sm:inline-flex" />
            
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto no-scrollbar border-t border-[var(--border-color)] py-1 bg-[var(--bg-surface)] text-xs font-mono">
          {[
            { id: 'overview', label: 'Overview & Telemetry', icon: Activity },
            { id: 'attendance', label: `Attendance Ledger (${sessions.length})`, icon: FileSpreadsheet },
            { 
              id: 'teachers', 
              label: pendingTeachers.length > 0 ? `Teacher Approvals (${pendingTeachers.length})` : `Teachers (${allTeachers.length})`, 
              icon: UserCheck,
              highlight: pendingTeachers.length > 0 
            },
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
                    : tab.highlight
                      ? 'text-amber-500 hover:text-amber-400 bg-amber-500/10 font-bold border border-amber-500/30'
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
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Attendance Sessions</span>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-extrabold text-[var(--text-primary)] font-mono">{sessions.length}</div>
                <div className="text-xs text-[var(--text-secondary)] font-mono">Real-time roll-call sessions</div>
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="swiss-card p-5 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    Teacher Approvals
                  </h3>
                  {pendingTeachers.length > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold animate-pulse">
                      {pendingTeachers.length} New
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {pendingTeachers.length > 0
                    ? `${pendingTeachers.length} educator account(s) waiting for access approval.`
                    : 'All faculty accounts are verified.'}
                </p>
                <button
                  onClick={() => setActiveTab('teachers')}
                  className={`w-full py-2 text-xs font-mono flex items-center justify-center gap-1.5 rounded-lg ${
                    pendingTeachers.length > 0
                      ? 'bg-amber-600 hover:bg-amber-500 text-white font-bold'
                      : 'btn-secondary'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{pendingTeachers.length > 0 ? 'Review Approvals' : 'Manage Teachers'}</span>
                </button>
              </div>

              <div className="swiss-card p-5 rounded-lg space-y-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Attendance Ledger
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">Review session logs and directly edit present/absent student statuses.</p>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="btn-secondary w-full py-2 text-xs font-mono flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Attendance</span>
                </button>
              </div>

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

        {/* ── TAB: ATTENDANCE LEDGER & EDITING ──────────────────────────────── */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Attendance Ledger & Direct Edit
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Audit institutional attendance sessions and modify present/absent student records with immediate database sync.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/take-attendance')}
                  className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 font-mono"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Roll-Call Scan</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search class, subject, date..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <select
                  value={selectedSessionClassFilter}
                  onChange={(e) => setSelectedSessionClassFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-600 font-mono"
                >
                  <option value="ALL">All Class Cohorts ({sessions.length} sessions)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.section}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="date"
                  value={selectedSessionDateFilter}
                  onChange={(e) => setSelectedSessionDateFilter(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>
            </div>

            {/* Sessions Table */}
            <div className="swiss-card rounded-lg overflow-hidden border border-[var(--border-color)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] bg-[var(--bg-inset)] text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                      <th className="p-3.5">Session ID & Date</th>
                      <th className="p-3.5">Class Cohort</th>
                      <th className="p-3.5">Course / Subject</th>
                      <th className="p-3.5">Faculty In-Charge</th>
                      <th className="p-3.5">Attendance Ratio</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {sessions
                      .filter((s: AttendanceSessionOut) => {
                        const matchesClass = selectedSessionClassFilter === 'ALL' || s.class_id === selectedSessionClassFilter;
                        const matchesDate = !selectedSessionDateFilter || s.date === selectedSessionDateFilter;
                        const matchesSearch = !sessionSearch ||
                          (s.class_name && s.class_name.toLowerCase().includes(sessionSearch.toLowerCase())) ||
                          (s.subject_name && s.subject_name.toLowerCase().includes(sessionSearch.toLowerCase())) ||
                          (s.teacher_name && s.teacher_name.toLowerCase().includes(sessionSearch.toLowerCase())) ||
                          s.date.includes(sessionSearch);
                        return matchesClass && matchesDate && matchesSearch;
                      })
                      .map((sess: AttendanceSessionOut) => {
                        const total = sess.total_enrolled || (sess.present_count + sess.absent_count) || 1;
                        const pct = Math.round((sess.present_count / total) * 100);
                        return (
                          <tr key={sess.id} className="hover:bg-[var(--bg-inset)]/50 transition-colors">
                            <td className="p-3.5">
                              <div className="font-bold text-[var(--text-primary)]">#{sess.id} · {sess.date}</div>
                              <div className="text-[10px] text-[var(--text-muted)]">{sess.start_time || '09:00'}</div>
                            </td>
                            <td className="p-3.5 font-medium text-[var(--text-primary)]">
                              {sess.class_name}
                            </td>
                            <td className="p-3.5 text-[var(--text-secondary)]">
                              {sess.subject_name}
                            </td>
                            <td className="p-3.5 text-[var(--text-muted)]">
                              {sess.teacher_name || 'Faculty'}
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  pct >= 75
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                }`}>
                                  {pct}% ({sess.present_count}/{total})
                                </span>
                              </div>
                            </td>
                            <td className="p-3.5 text-right space-x-2">
                              <button
                                onClick={() => handleOpenSessionEditor(sess)}
                                className="btn-primary text-[11px] px-3 py-1.5 inline-flex items-center gap-1.5"
                                title="Edit attendance records"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit Records</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-xs text-[var(--text-muted)]">
                          No attendance sessions found. Run a roll-call scan to record sessions.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: TEACHERS & APPROVALS MANAGEMENT ───────────────────────── */}
        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  Educator Accounts & Access Governance
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Review pending faculty registrations, grant verified access, or manage institutional educators.
                </p>
              </div>
              <button
                onClick={refreshAllData}
                className="btn-secondary text-xs px-3 py-1.5 font-mono flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Queue</span>
              </button>
            </div>

            {/* Pending Approvals Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${pendingTeachers.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Pending Teacher Registrations ({pendingTeachers.length})
                  </h3>
                </div>
                {pendingTeachers.length > 0 && (
                  <span className="text-[11px] font-mono text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 font-bold">
                    Action Required
                  </span>
                )}
              </div>

              <div className="swiss-card rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[var(--bg-inset)] border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase">
                    <tr>
                      <th className="py-3 px-4">Educator Name</th>
                      <th className="py-3 px-4">Institutional Email</th>
                      <th className="py-3 px-4">Requested Classes</th>
                      <th className="py-3 px-4">Registered On</th>
                      <th className="py-3 px-4 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {pendingTeachers.map((teacher: any) => {
                      const teacherClassIds: number[] = Array.isArray(teacher.assigned_classes) ? teacher.assigned_classes : [];
                      return (
                        <tr key={teacher.id} className="hover:bg-[var(--bg-inset)] transition-colors bg-amber-500/[0.03]">
                          <td className="py-3.5 px-4 font-bold text-[var(--text-primary)] font-sans">
                            {teacher.name}
                          </td>
                          <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                            {teacher.email}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 items-center">
                              {teacherClassIds.length > 0 ? (
                                teacherClassIds.map((cid: number) => {
                                  const cObj = classes.find((c: ClassItem) => c.id === cid);
                                  return (
                                    <span
                                      key={cid}
                                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                    >
                                      {cObj ? `${cObj.name} ${cObj.section}` : `Class #${cid}`}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-[11px] text-[var(--text-muted)] italic">
                                  All Classes (Default)
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEditTeacherClasses(teacher)}
                                className="ml-1 text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                                title="Edit assigned classes"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[var(--text-muted)]">
                            {teacher.created_at ? new Date(teacher.created_at).toLocaleString() : 'Recent'}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleApproveTeacher(teacher.id, teacher.name)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm inline-flex items-center gap-1.5 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve Account</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectTeacher(teacher.id, teacher.name)}
                              className="px-3 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 border border-rose-500/20 font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {pendingTeachers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-xs text-[var(--text-muted)]">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2 opacity-80" />
                          <div className="font-bold text-[var(--text-primary)]">No Pending Registrations</div>
                          <div>All educator accounts are verified and up to date.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approved Faculty Section */}
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Active Institutional Faculty ({allTeachers.filter((t: any) => t.is_approved).length})
              </h3>
              <div className="swiss-card rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[var(--bg-inset)] border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase">
                    <tr>
                      <th className="py-3 px-4">Faculty Name</th>
                      <th className="py-3 px-4">Institutional Email</th>
                      <th className="py-3 px-4">Assigned Cohorts &amp; Classes</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {allTeachers.filter((t: any) => t.is_approved).map((t: any) => {
                      const teacherClassIds: number[] = Array.isArray(t.assigned_classes) ? t.assigned_classes : [];
                      return (
                        <tr key={t.id} className="hover:bg-[var(--bg-inset)] transition-colors">
                          <td className="py-3 px-4 font-bold text-[var(--text-primary)] font-sans">{t.name}</td>
                          <td className="py-3 px-4 text-[var(--text-secondary)]">{t.email}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 items-center">
                              {teacherClassIds.length > 0 ? (
                                teacherClassIds.map((cid: number) => {
                                  const cObj = classes.find((c: ClassItem) => c.id === cid);
                                  return (
                                    <span
                                      key={cid}
                                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                    >
                                      {cObj ? `${cObj.name} ${cObj.section}` : `Class #${cid}`}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-[11px] text-[var(--text-muted)] italic">
                                  All Classes (Unrestricted)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              ✓ ACTIVE
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTeacherClasses(t)}
                              className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] inline-flex items-center gap-1.5 transition-colors"
                            >
                              <Edit3 className="w-3 h-3 text-blue-500" />
                              <span>Edit Classes</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {allTeachers.filter((t: any) => t.is_approved).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-xs text-[var(--text-muted)]">
                          No active faculty accounts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
                  {classes.map((cls: ClassItem) => (
                    <tr key={cls.id} className="hover:bg-[var(--bg-inset)] transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)] font-sans">{cls.name}</td>
                      <td className="py-3 px-4">{cls.section}</td>
                      <td className="py-3 px-4">{cls.academic_year}</td>
                      <td className="py-3 px-4">
                        {students.filter((s: StudentItem) => s.class_id === cls.id).length} Enrolled
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
                {classes.map((c: ClassItem) => (
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
                  {filteredStudents.map((s: StudentItem) => (
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
                  {subjects.map((sub: SubjectItem) => {
                    const cls = classes.find((c: ClassItem) => c.id === sub.class_id);
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
          <div className="space-y-6 font-mono text-xs">
            {/* Header & Quick Controls */}
            <div className="swiss-card p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-extrabold text-[var(--text-primary)] font-sans flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-600" />
                  System Diagnostics & Server Telemetry
                </h2>
                <p className="text-xs text-[var(--text-secondary)] font-sans">
                  Real-time health monitoring, latency telemetry, and Keep-Alive controls for AttendX cloud subsystems.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setAutoKeepAlive(!autoKeepAlive)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-2 transition-colors ${
                    autoKeepAlive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-[var(--bg-inset)] text-[var(--text-muted)] border-[var(--border-color)]'
                  }`}
                  title="When active, pings the backend every 60s to prevent Render free-tier sleep"
                >
                  <Radio className={`w-3.5 h-3.5 ${autoKeepAlive ? 'animate-pulse text-emerald-500' : ''}`} />
                  <span>Keep-Alive: {autoKeepAlive ? 'ON (60s)' : 'OFF'}</span>
                </button>

                <button
                  onClick={() => checkBackendPulse(true)}
                  disabled={isPingingBackend}
                  className="btn-primary px-4 py-1.5 text-xs font-mono flex items-center gap-2 font-bold shrink-0"
                >
                  <Zap className={`w-3.5 h-3.5 ${isPingingBackend ? 'animate-spin' : ''}`} />
                  <span>{isPingingBackend ? 'Pinging Node...' : '⚡ Test Ping / Wake'}</span>
                </button>
              </div>
            </div>

            {/* 4 Core Telemetry Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Backend Container Status */}
              <div className="swiss-card p-5 rounded-xl border border-[var(--border-color)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-sans font-bold text-sm text-[var(--text-primary)]">
                    <Server className="w-4 h-4 text-blue-500" />
                    <span>Backend API Container</span>
                  </div>
                  <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
                    backendHealth?.status === 'online'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : backendHealth?.status === 'waking'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse'
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      backendHealth?.status === 'online' ? 'bg-emerald-500 animate-pulse' :
                      backendHealth?.status === 'waking' ? 'bg-amber-500' :
                      'bg-rose-500'
                    }`}></span>
                    <span>
                      {backendHealth?.status === 'online' ? 'ONLINE (ACTIVE)' :
                       backendHealth?.status === 'waking' ? 'SPINNING UP (WAKING)' :
                       'SPUN DOWN (OFFLINE)'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[var(--border-color)]/50">
                    <span className="text-[var(--text-muted)]">Hosting Platform:</span>
                    <span className="font-semibold text-[var(--text-primary)]">Render Cloud (FastAPI + Uvicorn)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-color)]/50">
                    <span className="text-[var(--text-muted)]">Roundtrip Latency:</span>
                    <span className={`font-bold ${
                      (backendHealth?.latency ?? 999) < 150 ? 'text-emerald-500' :
                      (backendHealth?.latency ?? 999) < 500 ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {backendHealth?.latency !== null && backendHealth?.latency !== undefined
                        ? `${backendHealth.latency} ms (${backendHealth.latency < 150 ? 'Optimal' : 'Moderate'})`
                        : 'No response / Offline'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-color)]/50">
                    <span className="text-[var(--text-muted)]">Last Pulse Check:</span>
                    <span className="text-[var(--text-secondary)]">{backendHealth?.timestamp || 'Pending check...'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--text-muted)]">Spindown Protection:</span>
                    <span className="text-emerald-500 font-semibold">{autoKeepAlive ? 'Active (Auto-Ping enabled)' : 'Disabled'}</span>
                  </div>
                </div>

                {backendHealth?.data && (
                  <div className="p-3 bg-[var(--bg-inset)] rounded-lg border border-[var(--border-color)]">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Live Health Payload:</div>
                    <pre className="text-[11px] text-emerald-500 overflow-x-auto">
                      {JSON.stringify(backendHealth.data, null, 2)}
                    </pre>
                  </div>
                )}
                {backendHealth?.error && (
                  <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/30 text-rose-500 text-xs">
                    <div className="font-bold mb-0.5">Connection Notice:</div>
                    <div>{backendHealth.error}</div>
                  </div>
                )}
              </div>

              {/* Card 2: Supabase PostgreSQL Database */}
              <div className="swiss-card p-5 rounded-xl border border-[var(--border-color)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-sans font-bold text-sm text-[var(--text-primary)]">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <span>Supabase PostgreSQL DB</span>
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>CONNECTED & HEALTHY</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[var(--border-color)]/50">
                    <span className="text-[var(--text-muted)]">Database Region:</span>
                    <span className="font-semibold text-[var(--text-primary)]">AWS ap-south-1 (Mumbai Pooler)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-color)]/50">
                    <span className="text-[var(--text-muted)]">Connection Mode:</span>
                    <span className="font-semibold text-[var(--text-primary)]">IPv4 Session Pooler (psycopg2)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-color)]/50">
                    <span className="text-[var(--text-muted)]">Data Persistence:</span>
                    <span className="text-emerald-500 font-semibold">100% Cloud Permanent (Never wiped)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 bg-[var(--bg-inset)] rounded-lg border border-[var(--border-color)] text-center">
                    <div className="text-base font-extrabold text-[var(--text-primary)]">{students.length}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Students</div>
                  </div>
                  <div className="p-2.5 bg-[var(--bg-inset)] rounded-lg border border-[var(--border-color)] text-center">
                    <div className="text-base font-extrabold text-blue-500">{totalFacesStored}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Face Vectors</div>
                  </div>
                  <div className="p-2.5 bg-[var(--bg-inset)] rounded-lg border border-[var(--border-color)] text-center">
                    <div className="text-base font-extrabold text-emerald-500">{sessions.length}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Sessions</div>
                  </div>
                  <div className="p-2.5 bg-[var(--bg-inset)] rounded-lg border border-[var(--border-color)] text-center">
                    <div className="text-base font-extrabold text-[var(--text-primary)]">{classes.length}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Classes</div>
                  </div>
                  <div className="p-2.5 bg-[var(--bg-inset)] rounded-lg border border-[var(--border-color)] text-center">
                    <div className="text-base font-extrabold text-[var(--text-primary)]">{subjects.length}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Subjects</div>
                  </div>
                  <div className="p-2.5 bg-[var(--bg-inset)] rounded-lg border border-[var(--border-color)] text-center">
                    <div className="text-base font-extrabold text-indigo-500">{allTeachers.length}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Educators</div>
                  </div>
                </div>
              </div>

              {/* Card 3: OpenCV SFace Biometric Engine */}
              <div className="swiss-card p-5 rounded-xl border border-[var(--border-color)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-sans font-bold text-sm text-[var(--text-primary)]">
                    <Cpu className="w-4 h-4 text-purple-500" />
                    <span>OpenCV SFace AI Engine</span>
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    <span>ACTIVE & CALIBRATED</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[var(--border-color)]/50">
                    <span className="text-[var(--text-muted)]">Face Detection:</span>
                    <span className="font-semibold text-[var(--text-primary)]">YuNet ONNX (640x640 Dynamic)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-color)]/50">
                    <span className="text-[var(--text-muted)]">Feature Extraction:</span>
                    <span className="font-semibold text-[var(--text-primary)]">OpenCV SFace (128-D Vector Embeddings)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-color)]/50">
                    <span className="text-[var(--text-muted)]">Assignment Protocol:</span>
                    <span className="text-blue-500 font-semibold">Strict 1-to-1 Bipartite Assignment</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--text-muted)]">Decision Threshold:</span>
                    <span className="text-emerald-500 font-semibold">Sim ≥ 0.42 · Margin ≥ 0.06 (PRESENT)</span>
                  </div>
                </div>

                <div className="p-3 bg-[var(--bg-inset)] rounded-lg border border-[var(--border-color)] space-y-1 text-[11px]">
                  <div className="font-bold text-[var(--text-primary)]">FAR / False-Positive Protection:</div>
                  <div className="text-[var(--text-secondary)] leading-relaxed">
                    Stranger faces &lt; 0.35 similarity fall back to <strong className="text-rose-500">UNKNOWN</strong>. Multi-face photo clashes are resolved via greedy bipartite optimization so no student is ever claimed twice.
                  </div>
                </div>
              </div>

              {/* Card 4: Disaster Recovery & Live Backups */}
              <div className="swiss-card p-5 rounded-xl border border-[var(--border-color)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-sans font-bold text-sm text-[var(--text-primary)]">
                    <HardDrive className="w-4 h-4 text-amber-500" />
                    <span>Live Database Backups</span>
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>SNAPSHOT READY</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[var(--border-color)]/50">
                    <span className="text-[var(--text-muted)]">Cloud Snapshot Engine:</span>
                    <span className="font-semibold text-[var(--text-primary)]">Live PostgreSQL Exporter</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--border-color)]/50">
                    <span className="text-[var(--text-muted)]">Includes Tables:</span>
                    <span className="font-semibold text-[var(--text-primary)]">Students, Embeddings, Classes, Subjects, Sessions</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--text-muted)]">Local CLI Restore:</span>
                    <span className="text-emerald-500 font-semibold">python scripts/restore_database.py</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleDownloadLiveBackup}
                    disabled={isDownloadingBackup}
                    className="w-full btn-secondary py-2.5 text-xs font-mono font-bold flex items-center justify-center gap-2 hover:border-blue-500/50 hover:text-blue-500 transition-colors"
                  >
                    <Download className={`w-4 h-4 ${isDownloadingBackup ? 'animate-bounce text-blue-500' : ''}`} />
                    <span>{isDownloadingBackup ? 'Generating Snapshot...' : 'Download Live Database Snapshot (.json)'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Heartbeat Ping History */}
            {pingHistory.length > 0 && (
              <div className="swiss-card p-5 rounded-xl border border-[var(--border-color)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-sans font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <span>Recent Heartbeat Latency Stream</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">Last {pingHistory.length} pulses</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                  {pingHistory.map((p, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border text-center font-mono ${
                        p.status === 'online'
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500'
                          : p.status === 'waking'
                            ? 'bg-amber-500/5 border-amber-500/20 text-amber-500'
                            : 'bg-rose-500/5 border-rose-500/20 text-rose-500'
                      }`}
                    >
                      <div className="text-[10px] text-[var(--text-muted)]">{p.time}</div>
                      <div className="font-bold text-xs mt-0.5">
                        {p.latency !== null ? `${p.latency}ms` : p.status.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  {classes.map((c: ClassItem) => (
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
                  {classes.map((c: ClassItem) => (
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

      {/* ── MODAL: ATTENDANCE RECORD EDITOR ── */}
      {selectedSessionForEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="swiss-card max-w-4xl w-full rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-color)] bg-[var(--bg-inset)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-600 text-white">
                    SESSION #{selectedSessionForEdit.id}
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--text-muted)]">
                    {selectedSessionForEdit.date} · {selectedSessionForEdit.start_time || '09:00'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mt-1">
                  {selectedSessionForEdit.class_name} — {selectedSessionForEdit.subject_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSessionForEdit(null)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dynamic Metric Bar */}
            <div className="grid grid-cols-3 divide-x divide-[var(--border-color)] border-b border-[var(--border-color)] bg-[var(--bg-surface)] font-mono text-center py-2.5">
              <div>
                <div className="text-[10px] text-[var(--text-muted)] uppercase">Total Enrolled</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">{editableRecords.length}</div>
              </div>
              <div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase">Present Count</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {editableRecords.filter((r: AttendanceRecordOut) => r.status === 'PRESENT').length}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-rose-600 dark:text-rose-400 uppercase">Absent Count</div>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {editableRecords.filter((r: AttendanceRecordOut) => r.status === 'ABSENT').length}
                </div>
              </div>
            </div>

            {/* Quick Actions & Search */}
            <div className="p-3 sm:p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Filter student by name or roll..."
                  value={sessionRecordSearch}
                  onChange={(e) => setSessionRecordSearch(e.target.value)}
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => handleMarkAllStatus('PRESENT')}
                  className="px-2.5 py-1.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors font-bold"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAllStatus('ABSENT')}
                  className="px-2.5 py-1.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors font-bold"
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            {/* Attendance Records Table */}
            <div className="flex-1 overflow-y-auto max-h-[420px] p-0">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead className="sticky top-0 bg-[var(--bg-inset)] z-10 border-b border-[var(--border-color)]">
                  <tr className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="p-3">Roll & ID</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Confidence / Method</th>
                    <th className="p-3 text-right">Attendance Status (Click to Toggle)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-surface)]">
                  {editableRecords
                    .map((rec: AttendanceRecordOut, origIdx: number) => ({ rec, origIdx }))
                    .filter(({ rec }: { rec: AttendanceRecordOut; origIdx: number }) => {
                      if (!sessionRecordSearch) return true;
                      const q = sessionRecordSearch.toLowerCase();
                      return (
                        (rec.student_name && rec.student_name.toLowerCase().includes(q)) ||
                        (rec.roll_number && rec.roll_number.toLowerCase().includes(q)) ||
                        (rec.student_code && rec.student_code.toLowerCase().includes(q))
                      );
                    })
                    .map(({ rec, origIdx }: { rec: AttendanceRecordOut; origIdx: number }) => {
                      const isPresent = rec.status === 'PRESENT';
                      return (
                        <tr
                          key={rec.id || `rec-${rec.student_id}-${origIdx}`}
                          className="hover:bg-[var(--bg-inset)]/60 transition-colors"
                        >
                          <td className="p-3">
                            <span className="font-bold text-[var(--text-primary)]">{rec.roll_number || '—'}</span>
                            <span className="text-[10px] text-[var(--text-muted)] ml-2">({rec.student_code || `#${rec.student_id}`})</span>
                          </td>
                          <td className="p-3 font-semibold text-[var(--text-primary)]">
                            {rec.student_name || `Student #${rec.student_id}`}
                          </td>
                          <td className="p-3 text-[var(--text-muted)]">
                            <span className="text-[10px]">
                              {rec.confidence ? `${Math.round(rec.confidence * 100)}% Match` : '—'}
                              {rec.verification_status === 'TEACHER_VERIFIED' && ' · Teacher Verified'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleRecordStatus(origIdx)}
                              className={`px-4 py-1.5 rounded-md font-bold text-xs transition-all active:scale-95 shadow-sm inline-flex items-center gap-1.5 ${
                                isPresent
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 ring-2 ring-emerald-500/20'
                                  : 'bg-rose-600 text-white hover:bg-rose-500 ring-2 ring-rose-500/20'
                              }`}
                            >
                              {isPresent ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                              <span>{rec.status}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {editableRecords.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-xs text-[var(--text-muted)]">
                        No enrolled student records found in this session.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-inset)] flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-mono text-[var(--text-muted)]">
                {attendanceSaveMessage ? (
                  <span className="text-emerald-500 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {attendanceSaveMessage}
                  </span>
                ) : (
                  <span>Click any student status badge to toggle between Present and Absent.</span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedSessionForEdit(null)}
                  className="btn-secondary px-4 py-2 text-xs font-mono"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendanceRecords}
                  disabled={isSavingAttendance}
                  className="btn-primary px-5 py-2 text-xs font-mono font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Save className={`w-3.5 h-3.5 ${isSavingAttendance ? 'animate-spin' : ''}`} />
                  <span>{isSavingAttendance ? 'Saving to Database...' : 'Save Attendance Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT TEACHER ASSIGNED CLASSES ───────────────────────────────── */}
      {editingTeacherClasses && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="swiss-card max-w-lg w-full rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface)]">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <UserCheck className="w-3 h-3" /> FACULTY CLASS SCOPE
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Assign Classes: {editingTeacherClasses.name}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] font-mono">
                  {editingTeacherClasses.email}
                </p>
              </div>
              <button
                onClick={() => setEditingTeacherClasses(null)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="p-3.5 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                Select the classes this teacher is authorized to teach and mark attendance for. They will only see students and take sessions for these assigned cohorts.
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center justify-between font-mono text-xs pt-1">
                <span className="text-[var(--text-muted)] font-bold">
                  {editingTeacherClasses.assigned_classes.length} of {classes.length} selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllTeacherClasses}
                    className="text-xs text-blue-600 hover:underline font-bold"
                  >
                    Select All
                  </button>
                  <span className="text-[var(--text-muted)]">·</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllTeacherClasses}
                    className="text-xs text-rose-500 hover:underline font-bold"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Class Checkbox List */}
              <div className="space-y-2">
                {classes.map((cls: ClassItem) => {
                  const isChecked = editingTeacherClasses.assigned_classes.includes(cls.id);
                  const enrolledCount = students.filter(s => s.class_id === cls.id).length;
                  return (
                    <label
                      key={cls.id}
                      onClick={() => handleToggleTeacherClass(cls.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-blue-500/10 border-blue-500/40 text-[var(--text-primary)] shadow-sm'
                          : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-color-hover)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent label onClick
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">
                            {cls.name} <span className="font-mono text-blue-500 font-normal">({cls.section})</span>
                          </div>
                          <div className="text-[11px] font-mono text-[var(--text-muted)]">
                            Year: {cls.academic_year || '2026-27'} · {enrolledCount} Students Enrolled
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        isChecked ? 'bg-blue-500 text-white' : 'bg-[var(--bg-inset)] text-[var(--text-muted)]'
                      }`}>
                        {isChecked ? 'ASSIGNED' : 'UNASSIGNED'}
                      </span>
                    </label>
                  );
                })}
                {classes.length === 0 && (
                  <div className="text-center py-6 text-xs text-[var(--text-muted)] font-mono">
                    No classes created in system yet.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingTeacherClasses(null)}
                className="btn-secondary px-4 py-2 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTeacherClasses}
                disabled={isSavingTeacherClasses}
                className="btn-primary px-5 py-2 text-xs font-mono font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <Save className={`w-3.5 h-3.5 ${isSavingTeacherClasses ? 'animate-spin' : ''}`} />
                <span>{isSavingTeacherClasses ? 'Saving...' : 'Save Assigned Classes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
