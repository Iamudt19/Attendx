import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { AttendanceService, ClassService, StudentService } from '../services/api';
import { AttendanceSessionOut, ClassItem, StudentItem, User } from '../types';

interface DashboardProps {
  user: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const loadDashboardData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, location.key]);

  useEffect(() => {
    const onFocus = () => loadDashboardData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadDashboardData]);

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
    <div className="flex flex-col w-full space-y-5 sm:space-y-8 max-w-7xl mx-auto pb-10 sm:pb-16 transition-colors font-sans">

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-16 right-3 sm:top-20 sm:right-6 z-50 py-2 px-3 sm:py-2.5 sm:px-4 rounded-lg bg-[var(--accent-primary)] text-white text-[11px] sm:text-xs font-mono font-medium shadow-md flex items-center gap-2 animate-in fade-in max-w-[90vw]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Term 2026–27</span>
            <span>•</span>
            <span className="text-[var(--text-secondary)] font-bold">{user?.role || 'TEACHER'}</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Attendance Ledger & Studio
          </h1>
          <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] hidden sm:block">
            Roll-call console for {user?.name || 'Faculty Member'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary p-2 sm:p-2.5" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button onClick={() => handleExportExcel()} className="btn-secondary text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-2 flex items-center gap-1.5 font-mono">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Export Excel (.XLSX)</span>
            <span className="sm:hidden">Export</span>
          </button>
          <button onClick={() => navigate('/take-attendance')} className="btn-primary text-[11px] sm:text-xs px-3 sm:px-4 py-2 flex items-center gap-1.5 font-semibold shadow-sm">
            <Camera className="w-3.5 h-3.5" />
            <span>Mark Attendance</span>
          </button>
        </div>
      </header>

      {/* ── Metrics: 2×2 mobile / 4-col desktop ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="swiss-card p-3.5 sm:p-5 rounded-lg space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[9px] sm:text-[11px] font-mono font-bold uppercase tracking-wider">Enrolled</span>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight font-mono">{totalStudentsCount}</span>
            <span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-mono hidden sm:inline">Students</span>
          </div>
          <div className="flex items-center justify-between text-[9px] sm:text-[11px] font-mono text-[var(--text-secondary)] pt-1.5 sm:pt-2 border-t border-[var(--border-color)]">
            <span>{classes.length} Sections</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Synced</span>
          </div>
        </div>
        <div className="swiss-card p-3.5 sm:p-5 rounded-lg space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[9px] sm:text-[11px] font-mono font-bold uppercase tracking-wider">Faces</span>
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight font-mono">{verifiedFacesCount}</span>
            <span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-mono">/ {totalStudentsCount}</span>
          </div>
          <div className="flex items-center justify-between text-[9px] sm:text-[11px] font-mono text-[var(--text-secondary)] pt-1.5 sm:pt-2 border-t border-[var(--border-color)]">
            <span>Coverage</span>
            <span className="text-blue-600 font-semibold">{totalStudentsCount > 0 ? `${Math.round((verifiedFacesCount / totalStudentsCount) * 100)}%` : '0%'}</span>
          </div>
        </div>
        <div className="swiss-card p-3.5 sm:p-5 rounded-lg space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[9px] sm:text-[11px] font-mono font-bold uppercase tracking-wider">Attendance</span>
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">{avgAttendancePct}%</span>
            <span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-mono hidden sm:inline">Mean</span>
          </div>
          <div className="flex items-center justify-between text-[9px] sm:text-[11px] font-mono text-[var(--text-secondary)] pt-1.5 sm:pt-2 border-t border-[var(--border-color)]">
            <span>{totalSessionsCount} Lectures</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">OK</span>
          </div>
        </div>
        <div className="swiss-card p-3.5 sm:p-5 rounded-lg space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[9px] sm:text-[11px] font-mono font-bold uppercase tracking-wider">Sessions</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight font-mono">{totalSessionsCount}</span>
            <span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-mono hidden sm:inline">Total</span>
          </div>
          <div className="flex items-center justify-between text-[9px] sm:text-[11px] font-mono text-[var(--text-secondary)] pt-1.5 sm:pt-2 border-t border-[var(--border-color)]">
            <span className="truncate">{sessions[0]?.date || 'None yet'}</span>
            <span className="text-blue-600 font-semibold cursor-pointer hover:underline shrink-0 ml-1" onClick={() => navigate('/history')}>Logs →</span>
          </div>
        </div>
      </section>

      {/* ── Quick Actions (compact on mobile) ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="swiss-card p-4 sm:p-5 rounded-lg flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600">Photo Upload</span>
              <h2 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">Upload Classroom Photo</h2>
            </div>
            <Camera className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          </div>
          <label className="border border-dashed border-[var(--border-color)] hover:border-blue-600 bg-[var(--bg-inset)] rounded-lg p-4 flex items-center justify-center gap-3 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="font-mono text-center">
              <span className="text-[11px] font-semibold text-[var(--text-primary)] block">Select or drop photo</span>
              <p className="text-[10px] text-[var(--text-muted)]">JPEG · PNG · WEBP · Multi-file</p>
            </div>
            <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
        <div className="swiss-card p-4 sm:p-5 rounded-lg flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Live Camera</span>
              <h2 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">Real-time Video Scan</h2>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-color)]">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-mono font-bold text-[var(--text-primary)] block">Optical Rig Ready</span>
              <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">1080p · 4K · Webcam feeds</p>
            </div>
            <button onClick={() => navigate('/take-attendance')} className="btn-primary text-[11px] px-3 py-1.5 font-mono flex items-center gap-1 shrink-0">
              <span>Start</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Recent Sessions ── */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-color)]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Recent Sessions</h2>
            <p className="text-[10px] text-[var(--text-secondary)] hidden sm:block">Classroom rolls committed to Supabase ledger</p>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px] sm:text-xs overflow-x-auto shrink-0">
            {(['all', 'verified', 'audit'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  filter === f
                    ? 'bg-[var(--accent-primary)] text-white font-bold'
                    : 'text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-color)] hover:text-[var(--text-primary)]'
                }`}
              >
                {f === 'all' ? 'All' : f === 'verified' ? '≥90%' : '<75%'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)] animate-pulse">Loading session records...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="swiss-card rounded-lg p-8 text-center space-y-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-color)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-xs font-mono font-bold text-[var(--text-primary)]">No sessions match filter</p>
            <button onClick={() => navigate('/take-attendance')} className="btn-primary text-xs px-4 py-2 font-mono">Mark Attendance</button>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden space-y-2">
              {filteredSessions.slice(0, 8).map((session) => {
                const rate = session.total_enrolled > 0 ? Math.round((session.present_count / session.total_enrolled) * 100) : 0;
                const rateColor = rate >= 90 ? 'text-emerald-600 dark:text-emerald-400' : rate < 75 ? 'text-amber-500' : 'text-[var(--text-primary)]';
                return (
                  <div
                    key={session.id}
                    onClick={() => navigate('/history')}
                    className="swiss-card rounded-lg px-3.5 py-3 flex items-center gap-3 cursor-pointer active:opacity-70 transition-opacity"
                  >
                    <div className="shrink-0 text-center w-10">
                      <div className="text-[11px] font-mono font-bold text-[var(--text-primary)] leading-tight">{session.date?.slice(5) || '—'}</div>
                      <div className="text-[9px] font-mono text-[var(--text-muted)] leading-tight">{session.date?.slice(0, 4) || ''}</div>
                    </div>
                    <div className="w-px h-8 bg-[var(--border-color)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate">{session.class_name || `Class #${session.class_id}`}</div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)] truncate">{session.subject_name || 'Lecture'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-extrabold font-mono ${rateColor}`}>{rate}%</div>
                      <div className="text-[9px] font-mono text-[var(--text-muted)]">{session.present_count}/{session.total_enrolled}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                  </div>
                );
              })}
              {filteredSessions.length > 8 && (
                <button onClick={() => navigate('/history')} className="w-full text-center text-xs text-blue-600 font-semibold py-2 hover:underline">
                  View all {filteredSessions.length} sessions →
                </button>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block swiss-card rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--bg-inset)] text-[var(--text-muted)] uppercase text-[10px]">
                    <th className="p-3.5 font-bold">Date & Time</th>
                    <th className="p-3.5 font-bold">Class Section</th>
                    <th className="p-3.5 font-bold">Roll Present</th>
                    <th className="p-3.5 font-bold">Turnout</th>
                    <th className="p-3.5 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredSessions.map((session) => {
                    const rate = session.total_enrolled > 0 ? Math.round((session.present_count / session.total_enrolled) * 100) : 0;
                    return (
                      <tr key={session.id} className="hover:bg-[var(--bg-inset)] transition-colors">
                        <td className="p-3.5"><div className="font-bold text-[var(--text-primary)]">{session.date}</div><div className="text-[10px] text-[var(--text-muted)]">{session.start_time || '10:00'}</div></td>
                        <td className="p-3.5"><div className="font-bold text-[var(--text-primary)] font-sans">{session.class_name || `Class #${session.class_id}`}</div><div className="text-[10px] text-[var(--text-muted)]">{session.subject_name || 'Lecture'}</div></td>
                        <td className="p-3.5"><span className="font-bold text-[var(--text-primary)]">{session.present_count}</span><span className="text-[var(--text-muted)]"> / {session.total_enrolled}</span></td>
                        <td className="p-3.5"><span className={`font-bold ${rate >= 90 ? 'text-emerald-600 dark:text-emerald-400' : rate < 75 ? 'text-amber-500' : 'text-[var(--text-primary)]'}`}>{rate}%</span></td>
                        <td className="p-3.5 text-right"><button onClick={() => navigate('/history')} className="text-blue-600 hover:underline font-bold text-xs">Inspect & Edit →</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ── Class Sections ── */}
      {classes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Class Sections</h2>
              <p className="text-[10px] text-[var(--text-secondary)] hidden sm:block">Active course rosters in AttendX</p>
            </div>
            <button onClick={() => navigate('/classes')} className="text-blue-600 font-mono text-[11px] sm:text-xs hover:underline flex items-center gap-1 font-semibold">
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {classes.map((cls) => (
              <div key={cls.id} className="swiss-card p-3 sm:p-4 rounded-lg flex flex-col gap-2">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <h3 className="font-bold text-[11px] sm:text-sm text-[var(--text-primary)] truncate">{cls.name}</h3>
                    <div className="font-mono text-[9px] sm:text-xs text-[var(--text-muted)] truncate">§{cls.section} · {cls.academic_year}</div>
                  </div>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[var(--bg-inset)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] shrink-0">
                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                </div>
                <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[9px] sm:text-[11px] font-mono">
                  <button onClick={() => navigate('/students')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Roster</button>
                  <button onClick={() => navigate('/take-attendance')} className="text-blue-600 font-bold hover:underline">Mark →</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
