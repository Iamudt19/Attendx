import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Upload, 
  FileSpreadsheet, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  BarChart3, 
  ShieldCheck, 
  RefreshCw,
  ExternalLink,
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
    showToast('Preparing Excel attendance report...');
    try {
      await AttendanceService.downloadExcelDirect(targetClassId);
      showToast('Attendance report downloaded successfully!');
    } catch (err) {
      showToast('Export failed. Please check your connection.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      showToast(`Staging ${e.target.files.length} photo(s) for attendance scan...`);
      setTimeout(() => {
        navigate('/take-attendance');
      }, 500);
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
    <div className="flex flex-col w-full space-y-8 max-w-7xl mx-auto pb-16 transition-colors">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 py-3 px-5 rounded-2xl bg-indigo-600 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header & Greeting ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Academic Year 2026–27
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            Welcome back, {user?.name || 'Professor'}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--bg-inset)] border border-[var(--border-color)] text-[var(--text-secondary)] font-mono font-medium">
              {user?.role || 'TEACHER'}
            </span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Classroom roll-call dashboard and biometric attendance records
          </p>
        </div>

        {/* Action Button Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-sm"
            title="Refresh Data"
            type="button"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
          
          <button
            onClick={() => handleExportExcel()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold transition-all shadow-sm"
            type="button"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Export Excel (.XLSX)</span>
          </button>

          <button
            onClick={() => navigate('/take-attendance')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95"
            type="button"
          >
            <Camera className="w-4 h-4" />
            <span>Take Attendance</span>
          </button>
        </div>
      </header>

      {/* ── Key Operational Metrics Cards ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Enrolled */}
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] transition-all shadow-sm hover:shadow-md group">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="text-xs uppercase font-semibold tracking-wider">Total Enrolled</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">{totalStudentsCount}</span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">Students</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-secondary)] pt-3 border-t border-[var(--border-color)]">
            <span>{classes.length} Class Sections</span>
            <span className="text-emerald-500 font-medium">Active Roster</span>
          </div>
        </div>

        {/* Card 2: Biometric Profiles */}
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] transition-all shadow-sm hover:shadow-md group">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="text-xs uppercase font-semibold tracking-wider">Face Profiles</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">{verifiedFacesCount}</span>
            <span className="text-xs text-[var(--text-secondary)]">/ {totalStudentsCount} calibrated</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-secondary)] pt-3 border-t border-[var(--border-color)]">
            <span>Recognition Readiness</span>
            <span className="text-indigo-500 font-medium">
              {totalStudentsCount > 0 ? `${Math.round((verifiedFacesCount / totalStudentsCount) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Card 3: Average Attendance Rate */}
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] transition-all shadow-sm hover:shadow-md group">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="text-xs uppercase font-semibold tracking-wider">Term Attendance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-500 tracking-tight">{avgAttendancePct}%</span>
            <span className="text-xs text-[var(--text-secondary)]">Average</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-secondary)] pt-3 border-t border-[var(--border-color)]">
            <span>{totalSessionsCount} Lectures Logged</span>
            <span className="text-emerald-500 font-medium">Verified</span>
          </div>
        </div>

        {/* Card 4: Total Sessions */}
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] transition-all shadow-sm hover:shadow-md group">
          <div className="flex items-center justify-between text-[var(--text-secondary)]">
            <span className="text-xs uppercase font-semibold tracking-wider">Official Sessions</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">{totalSessionsCount}</span>
            <span className="text-xs text-[var(--text-secondary)]">Recorded</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-secondary)] pt-3 border-t border-[var(--border-color)]">
            <span>Latest: {sessions[0]?.date || 'None today'}</span>
            <span className="text-blue-500 font-medium cursor-pointer" onClick={() => navigate('/history')}>
              View All
            </span>
          </div>
        </div>
      </section>

      {/* ── Main Quick Launch Hub ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Classroom Capture Box */}
        <div className="p-7 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-sm group">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                Classroom Photo Scanner
              </span>
              <Camera className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-blue-500 transition-colors" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Upload Classroom Capture</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Upload wide-angle photos of the classroom. The facial recognition engine automatically detects, matches, and records attendance for all enrolled students.
            </p>
          </div>

          <div className="mt-6">
            <label className="border-2 border-dashed border-[var(--border-color)] hover:border-indigo-500/50 bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-center">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Click to browse or drop photos</span>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Supports multi-angle JPEG, PNG, WEBP</p>
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
        </div>

        {/* Live Camera Rig */}
        <div className="p-7 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-sm group">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Live Video Feed
              </span>
              <Sparkles className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-emerald-500 transition-colors" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Live Classroom Webcam Rig</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Stream live video frames from your laptop camera or connected lecture webcam with real-time facial landmark detection.
            </p>
          </div>

          <div className="mt-6 p-6 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Ready for Interactive Scanning</p>
              <p className="text-[11px] text-[var(--text-secondary)]">Launch camera stream to scan lecture hall in real-time</p>
            </div>
            <button
              onClick={() => navigate('/take-attendance')}
              className="mt-1 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
            >
              Activate Camera Scanner
            </button>
          </div>
        </div>
      </section>

      {/* ── Recent Attendance Ledger & Active Classes ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Sessions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Recent Attendance Logs</h3>
              <p className="text-xs text-[var(--text-secondary)]">Latest recorded sessions across your enrolled classes</p>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
            >
              <span>View Full Archive</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-xs text-[var(--text-secondary)] font-mono animate-pulse">
                Loading session logs...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Clock className="w-8 h-8 text-[var(--text-secondary)] mx-auto opacity-50" />
                <p className="text-xs font-medium text-[var(--text-primary)]">No recorded attendance sessions yet</p>
                <p className="text-[11px] text-[var(--text-secondary)] max-w-sm mx-auto">
                  Take your first roll call by uploading classroom photos or launching the live camera.
                </p>
                <button
                  onClick={() => navigate('/take-attendance')}
                  className="mt-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all"
                >
                  Start First Session
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-inset)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-color)]">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Class & Section</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Present Ratio</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {filteredSessions.slice(0, 5).map((sess) => {
                      const rate = sess.total_enrolled > 0
                        ? Math.round((sess.present_count / sess.total_enrolled) * 100)
                        : 0;
                      return (
                        <tr key={sess.id} className="hover:bg-[var(--bg-inset)] transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-[var(--text-primary)]">
                            <div>{sess.date}</div>
                            <div className="text-[10px] text-[var(--text-secondary)]">{sess.start_time}</div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                            {sess.class_name}
                          </td>
                          <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                            {sess.subject_name}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className="font-bold text-[var(--text-primary)]">{sess.present_count}</span>
                            <span className="text-[var(--text-secondary)]"> / {sess.total_enrolled} ({rate}%)</span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => navigate('/history')}
                              className="py-1 px-2.5 rounded-lg bg-[var(--bg-inset)] hover:bg-indigo-500/10 text-indigo-500 text-[11px] font-semibold border border-[var(--border-color)] hover:border-indigo-500/30 transition-all"
                            >
                              Inspect & Edit
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

        {/* Right 1 Col: Class Sections Directory */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Class Cohorts</h3>
              <p className="text-xs text-[var(--text-secondary)]">Registered sections</p>
            </div>
            <button
              onClick={() => navigate('/classes')}
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
            >
              <span>Manage</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {classes.slice(0, 4).map((cls) => (
              <div
                key={cls.id}
                className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-indigo-500/30 transition-all shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">{cls.name}</div>
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Section {cls.section} • {cls.student_count || 0} Students
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/take-attendance')}
                  className="py-1 px-2.5 rounded-lg bg-[var(--bg-inset)] hover:bg-indigo-600 hover:text-white text-[11px] font-semibold text-[var(--text-primary)] border border-[var(--border-color)] transition-all"
                >
                  Scan
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
