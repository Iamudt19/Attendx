import {
  Shield, Lock, Unlock, KeyRound, CheckCircle2, AlertCircle,
  Users, BookOpen, RefreshCw, Plus,
  Trash2, Search, ArrowRight, Activity,
  Sliders, Eye, EyeOff, Cpu, ChevronLeft,
  FileSpreadsheet, Edit3, Save, Check, RotateCcw, X, Calendar, Download, UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthService, ClassService, StudentService, SubjectService, AttendanceService, api } from '../services/api';
import { ClassItem, StudentItem, SubjectItem, AttendanceSessionOut, AttendanceRecordOut } from '../types';
import { extractErrorMessage } from '../utils/error';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';

type AdminTab = 'overview' | 'attendance' | 'teachers' | 'classes' | 'students' | 'subjects' | 'diagnostics';

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
  const [sessions, setSessions] = useState<AttendanceSessionOut[]>([]);
  const [pendingTeachers, setPendingTeachers] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);
  const [systemHealth, setSystemHealth] = useState<{ status: string; database: string; version: string } | null>(null);

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
        localStorage.setItem('attendx_token', data.access_token);
      }
      localStorage.setItem('attendx_admin_session', 'active');
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
          const authRes = await AuthService.adminMasterLogin('Doomsday@1812');
          if (authRes?.access_token) {
            localStorage.setItem('attendx_token', authRes.access_token);
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

  useEffect(() => {
    if (isAuthenticated) {
      refreshAllData();
    }
  }, [isAuthenticated, refreshAllData]);

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
                      .filter(s => {
                        const matchesClass = selectedSessionClassFilter === 'ALL' || s.class_id === selectedSessionClassFilter;
                        const matchesDate = !selectedSessionDateFilter || s.date === selectedSessionDateFilter;
                        const matchesSearch = !sessionSearch ||
                          (s.class_name && s.class_name.toLowerCase().includes(sessionSearch.toLowerCase())) ||
                          (s.subject_name && s.subject_name.toLowerCase().includes(sessionSearch.toLowerCase())) ||
                          (s.teacher_name && s.teacher_name.toLowerCase().includes(sessionSearch.toLowerCase())) ||
                          s.date.includes(sessionSearch);
                        return matchesClass && matchesDate && matchesSearch;
                      })
                      .map((sess) => {
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
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Registered On</th>
                      <th className="py-3 px-4 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {pendingTeachers.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-[var(--bg-inset)] transition-colors bg-amber-500/[0.03]">
                        <td className="py-3.5 px-4 font-bold text-[var(--text-primary)] font-sans">
                          {teacher.name}
                        </td>
                        <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                          {teacher.email}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            {teacher.role}
                          </span>
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
                    ))}
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
                Active Institutional Faculty ({allTeachers.filter(t => t.is_approved).length})
              </h3>
              <div className="swiss-card rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[var(--bg-inset)] border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase">
                    <tr>
                      <th className="py-3 px-4">Faculty Name</th>
                      <th className="py-3 px-4">Institutional Email</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Registration Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {allTeachers.filter(t => t.is_approved).map((t) => (
                      <tr key={t.id} className="hover:bg-[var(--bg-inset)] transition-colors">
                        <td className="py-3 px-4 font-bold text-[var(--text-primary)] font-sans">{t.name}</td>
                        <td className="py-3 px-4 text-[var(--text-secondary)]">{t.email}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            ✓ ACTIVE &amp; APPROVED
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--text-muted)]">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                    {allTeachers.filter(t => t.is_approved).length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-xs text-[var(--text-muted)]">
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
                  {editableRecords.filter(r => r.status === 'PRESENT').length}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-rose-600 dark:text-rose-400 uppercase">Absent Count</div>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {editableRecords.filter(r => r.status === 'ABSENT').length}
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
                    .map((rec, origIdx) => ({ rec, origIdx }))
                    .filter(({ rec }) => {
                      if (!sessionRecordSearch) return true;
                      const q = sessionRecordSearch.toLowerCase();
                      return (
                        (rec.student_name && rec.student_name.toLowerCase().includes(q)) ||
                        (rec.roll_number && rec.roll_number.toLowerCase().includes(q)) ||
                        (rec.student_code && rec.student_code.toLowerCase().includes(q))
                      );
                    })
                    .map(({ rec, origIdx }) => {
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
    </div>
  );
};
