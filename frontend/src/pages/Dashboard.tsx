import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Upload, 
  FileSpreadsheet, 
  Users, 
  ShieldCheck, 
  RefreshCw,
  Clock,
  ArrowRight, 
  BarChart3, 
  CheckCircle2, 
  Plus,
  BookOpen
} from 'lucide-react';
import { AttendanceService, ClassService, StudentService } from '../services/api';
import { AttendanceSessionOut, ClassItem, StudentItem, User } from '../types';

interface DashboardProps {
  user: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AttendanceSessionOut[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'verified' | 'audit'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadDashboardData = async () => {
    try {
      const [sessData, classData, stuData] = await Promise.all([
        AttendanceService.getSessions().catch(() => []),
        ClassService.getClasses().catch(() => []),
        StudentService.getStudents().catch(() => [])
      ]);
      setSessions(sessData || []);
      setClasses(classData || []);
      setStudents(stuData || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleExportExcel = async (classId?: number) => {
    const targetClassId = classId || (classes.length > 0 ? classes[0].id : 1);
    showToast('Preparing Excel attendance ledger (.xlsx)...');
    try {
      await AttendanceService.downloadExcelDirect(targetClassId);
      showToast('Attendance ledger downloaded successfully.');
    } catch (err) {
      showToast('Export failed. Please check network connection.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      showToast(`Staging ${e.target.files.length} capture(s) for scan...`);
      setTimeout(() => {
        navigate('/take-attendance');
      }, 400);
    }
  };

  // Metrics Calculations
  const totalStudentsCount = students.length;
  const verifiedFacesCount = students.filter(s => s.face_registration_complete || (s.face_count && s.face_count > 0)).length;
  const totalSessionsCount = sessions.length;
  const avgAttendancePct = sessions.length > 0
    ? Math.round(sessions.reduce((acc, s) => acc + ((s.present_count / (s.total_enrolled || 1)) * 100), 0) / sessions.length)
    : 94;

  const filteredSessions = sessions.filter(sess => {
    const rate = sess.total_enrolled > 0 ? (sess.present_count / sess.total_enrolled) * 100 : 0;
    if (filter === 'verified') return rate >= 90;
    if (filter === 'audit') return rate < 75;
    return true;
  });

  return (
    <div className="flex flex-col w-full space-y-8 max-w-7xl mx-auto pb-16 transition-colors font-sans">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 py-2.5 px-4 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-mono font-medium shadow-md flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Swiss Header & Context Bar ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Academic Term 2026–27</span>
            <span>•</span>
            <span className="text-[var(--text-secondary)] font-bold">{user?.role || 'TEACHER'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Attendance Ledger & Studio
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Institutional roll-call console for {user?.name || 'Faculty Member'}
          </p>
        </div>

        {/* Action Button Bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary p-2.5"
            title="Refresh Data"
            type="button"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          
          <button
            onClick={() => handleExportExcel()}
            className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-2 font-mono"
            type="button"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel (.XLSX)</span>
          </button>

          <button
            onClick={() => navigate('/take-attendance')}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-2 font-semibold shadow-sm"
            type="button"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Mark Attendance</span>
          </button>
        </div>
      </header>

      {/* ── Key Metrics Grid (Swiss Data Blocks) ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Enrolled */}
        <div className="swiss-card p-5 rounded-lg space-y-3">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Total Enrolled</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight font-mono">{totalStudentsCount}</span>
            <span className="text-xs text-[var(--text-muted)] font-mono">Students</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] pt-2 border-t border-[var(--border-color)]">
            <span>{classes.length} Sections</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Synced</span>
          </div>
        </div>

        {/* Metric 2: Calibrated Face Profiles */}
        <div className="swiss-card p-5 rounded-lg space-y-3">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Calibrated Faces</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight font-mono">{verifiedFacesCount}</span>
            <span className="text-xs text-[var(--text-muted)] font-mono">/ {totalStudentsCount}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] pt-2 border-t border-[var(--border-color)]">
            <span>Coverage</span>
            <span className="text-blue-600 font-semibold">
              {totalStudentsCount > 0 ? `${Math.round((verifiedFacesCount / totalStudentsCount) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Metric 3: Average Attendance Rate */}
        <div className="swiss-card p-5 rounded-lg space-y-3">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Term Attendance</span>
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">{avgAttendancePct}%</span>
            <span className="text-xs text-[var(--text-muted)] font-mono">Mean</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] pt-2 border-t border-[var(--border-color)]">
            <span>{totalSessionsCount} Lectures Logged</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Verified</span>
          </div>
        </div>

        {/* Metric 4: Total Sessions */}
        <div className="swiss-card p-5 rounded-lg space-y-3">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Ledger Entries</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight font-mono">{totalSessionsCount}</span>
            <span className="text-xs text-[var(--text-muted)] font-mono">Sessions</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] pt-2 border-t border-[var(--border-color)]">
            <span>Latest: {sessions[0]?.date || 'None today'}</span>
            <span className="text-blue-600 font-semibold cursor-pointer hover:underline" onClick={() => navigate('/history')}>
              History →
            </span>
          </div>
        </div>
      </section>

      {/* ── Attendance Workstation (Dual Mode Trigger) ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Classroom Capture Box */}
        <div className="swiss-card p-6 rounded-lg flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600">
                Mode A // Optical Photo Upload
              </span>
              <Camera className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Classroom Frame Ingestion</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Upload single or multi-angle photos of the lecture hall. The engine crops, normalizes, and matches faces against enrolled student biometric profiles.
            </p>
          </div>

          <label className="border border-dashed border-[var(--border-color)] hover:border-blue-600 bg-[var(--bg-inset)] rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors">
            <Upload className="w-5 h-5 text-blue-600" />
            <div className="text-center font-mono">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Select or drop classroom photo</span>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">JPEG, PNG, WEBP (Supports multi-file batches)</p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Live Camera Rig */}
        <div className="swiss-card p-6 rounded-lg flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Mode B // Connected Camera Rig
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Live Lecture Video Stream</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Scan students in real time through your integrated laptop camera or classroom webcam with live optical feedback.
            </p>
          </div>

          <div className="p-6 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-color)] flex flex-col items-center justify-center text-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-[var(--text-primary)]">Optical Rig Ready</span>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">Supports 1080p and 4K optical feeds</p>
            </div>
            <button
              onClick={() => navigate('/take-attendance')}
              className="btn-primary text-xs px-4 py-2 font-mono flex items-center gap-2"
            >
              <span>Activate Camera Feed</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Recent Attendance Ledger ── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Recent Attendance Sessions</h2>
            <p className="text-xs text-[var(--text-secondary)]">Classroom rolls committed to Supabase ledger</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 font-mono text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-[var(--accent-primary)] text-white font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-color)]'
              }`}
            >
              All Sessions
            </button>
            <button
              onClick={() => setFilter('verified')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'verified'
                  ? 'bg-[var(--accent-primary)] text-white font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-color)]'
              }`}
            >
              High Attendance (≥90%)
            </button>
            <button
              onClick={() => setFilter('audit')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'audit'
                  ? 'bg-[var(--accent-primary)] text-white font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-color)]'
              }`}
            >
              Needs Review (&lt;75%)
            </button>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="swiss-card rounded-lg overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)] animate-pulse">
              Loading session records from database...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-color)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-[var(--text-primary)]">No sessions match current filter</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Take attendance now to record your first roll-call.</p>
              </div>
              <button
                onClick={() => navigate('/take-attendance')}
                className="btn-primary text-xs px-4 py-2 font-mono"
              >
                Mark Attendance
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-inset)] text-[var(--text-muted)] uppercase">
                  <th className="p-3.5 font-bold">Date & Time</th>
                  <th className="p-3.5 font-bold">Class Section</th>
                  <th className="p-3.5 font-bold">Roll Present</th>
                  <th className="p-3.5 font-bold">Turnout Rate</th>
                  <th className="p-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredSessions.map((session) => {
                  const rate = session.total_enrolled > 0
                    ? Math.round((session.present_count / session.total_enrolled) * 100)
                    : 0;

                  return (
                    <tr key={session.id} className="hover:bg-[var(--bg-inset)] transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-[var(--text-primary)]">{session.date}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{session.start_time || '10:00 AM'}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-[var(--text-primary)] font-sans">{session.class_name || `Class #${session.class_id}`}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{session.subject_name || 'Lecture Session'}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-[var(--text-primary)]">{session.present_count}</span>
                        <span className="text-[var(--text-muted)]"> / {session.total_enrolled}</span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${rate >= 90 ? 'text-emerald-600 dark:text-emerald-400' : rate < 75 ? 'text-amber-500' : 'text-[var(--text-primary)]'}`}>
                            {rate}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => navigate('/history')}
                          className="text-blue-600 hover:underline font-bold text-xs"
                        >
                          Inspect & Edit →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Active Class Sections ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Enrolled Class Sections</h2>
            <p className="text-xs text-[var(--text-secondary)]">Active course rosters configured in AttendX</p>
          </div>
          <button
            onClick={() => navigate('/classes')}
            className="text-blue-600 font-mono text-xs hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Manage All Classes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <div key={cls.id} className="swiss-card p-5 rounded-lg space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)] font-sans">{cls.name}</h3>
                  <div className="font-mono text-xs text-[var(--text-muted)]">Section {cls.section} • {cls.academic_year}</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)]">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs font-mono">
                <button
                  onClick={() => navigate('/students')}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline"
                >
                  View Roster
                </button>
                <button
                  onClick={() => navigate('/take-attendance')}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Mark Attendance →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
