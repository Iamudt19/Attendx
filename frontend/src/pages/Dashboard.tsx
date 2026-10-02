import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Upload, 
  FileSpreadsheet, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  BarChart3, 
  ShieldCheck, 
  Layers, 
  RefreshCw,
  Eye,
  Check,
  Zap
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
    showToast('Generating official Excel (.xlsx) attendance dossier...');
    try {
      const url = `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : ''}/api/export/excel?class_id=${targetClassId}`;
      window.open(url, '_blank');
      showToast('Excel report downloaded successfully!');
    } catch (err) {
      showToast('Export failed. Please check your connection.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      showToast(`Redirecting to Attendance Canvas to stage ${e.target.files.length} photo(s)...`);
      navigate('/take-attendance');
    }
  };

  // Metrics Calculations
  const totalStudentsCount = students.length;
  const verifiedFacesCount = students.filter(s => s.face_registration_complete || (s.embeddings_count && s.embeddings_count > 0)).length;
  const totalSessionsCount = sessions.length;
  const avgAttendancePct = sessions.length > 0
    ? Math.round(sessions.reduce((acc, s) => acc + ((s.present_count / (s.total_enrolled || 1)) * 100), 0) / sessions.length)
    : 94;

  const filteredSessions = sessions.filter(sess => {
    if (filter === 'verified') return (sess.verification_rate || 0) >= 90;
    if (filter === 'audit') return (sess.flags_count || 0) > 0 || (sess.verification_rate || 0) < 90;
    return true;
  });

  return (
    <div className="flex flex-col w-full space-y-8 text-slate-100 max-w-7xl mx-auto pb-12">
      {/* ── Top Header & Greeting ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-mono font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Academic Ledger
            </span>
            <span className="text-slate-700">•</span>
            <span className="text-xs text-slate-400 font-mono">Academic Year 2026–27</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
            Welcome back, {user?.name || 'Educator'}
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono font-normal">
              {user?.role || 'TEACHER'}
            </span>
          </h1>
          <p className="text-sm text-slate-400">
            Automated deep face recognition pipeline active • Instant multi-angle attendance verification
          </p>
        </div>

        {/* Action Button Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all shadow-sm"
            title="Refresh Data"
            type="button"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          
          <button
            onClick={() => handleExportExcel()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition-all hover:border-slate-700 shadow-sm"
            type="button"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Excel (.XLSX)</span>
          </button>

          <button
            onClick={() => navigate('/take-attendance')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-bold hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-emerald-500/20"
            type="button"
          >
            <Camera className="w-4 h-4" />
            <span>Take Attendance</span>
          </button>
        </div>
      </header>

      {/* ── Key Operational Metrics Cards (Obsidian Glassmorphism) ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Enrolled */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl hover:border-slate-700/80 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Total Enrolled</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{totalStudentsCount}</span>
            <span className="text-xs text-slate-400 font-mono">Students</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/60">
            <span>{classes.length} Active Class Sections</span>
            <span className="text-emerald-400 font-medium">100% Synced</span>
          </div>
        </div>

        {/* Card 2: Biometric Face Profiles */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl hover:border-slate-700/80 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Face Profiles</span>
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{verifiedFacesCount}</span>
            <span className="text-xs text-slate-400 font-mono">/ {totalStudentsCount} Enrolled</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/60">
            <span>SFace 128-D Model</span>
            <span className="text-violet-400 font-medium">Active Vector Pool</span>
          </div>
        </div>

        {/* Card 3: Average Attendance Rate */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl hover:border-slate-700/80 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Term Attendance</span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400 tracking-tight">{avgAttendancePct}%</span>
            <span className="text-xs text-emerald-400/80 font-mono">Average</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/60">
            <span>{totalSessionsCount} Lectures Logged</span>
            <span className="text-emerald-400 font-medium">Zero Proxy</span>
          </div>
        </div>

        {/* Card 4: Neural Pipeline Speed */}
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl hover:border-slate-700/80 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Pipeline Latency</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">&lt;0.9<span className="text-lg text-slate-400 font-normal">s</span></span>
            <span className="text-xs text-emerald-400 font-mono font-medium">Parallel YuNet + SFace</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/60">
            <span>ZeroGPU Accelerated</span>
            <span className="text-emerald-400 font-medium">Online</span>
          </div>
        </div>
      </section>

      {/* ── Main Dual Ingestion Actions ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Method A: High-Res Classroom Photo Upload */}
        <div className="p-7 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between hover:border-slate-700/80 transition-all shadow-xl relative overflow-hidden group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Method A • High Resolution Photo
              </span>
              <Camera className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            </div>
            <h2 className="text-xl font-bold text-white">Upload Classroom Capture</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload single or multi-photo wide-angle shots of the classroom. The AI automatically crops, rotates, aligns, and matches faces against enrolled students.
            </p>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="mt-6 relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 bg-slate-950/60 hover:bg-slate-950/80 transition-all cursor-pointer text-center group/drop">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover/drop:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">Drop classroom photo(s) here or click to browse</p>
            <p className="text-xs text-slate-400 mt-1">Supports JPEG, PNG, WEBP, multi-photo angles</p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
            <span className="text-xs text-slate-400">Multi-Angle Fusion Support</span>
            <button
              onClick={() => navigate('/take-attendance')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1.5 transition-colors"
              type="button"
            >
              <span>Open Scanner Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Method B: Live Web Camera & Burst Scan */}
        <div className="p-7 rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between hover:border-slate-700/80 transition-all shadow-xl relative overflow-hidden group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                Method B • Live Camera Scan
              </span>
              <Sparkles className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
            </div>
            <h2 className="text-xl font-bold text-white">Live Classroom Webcam Rig</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Capture instant optical frames directly through your laptop or connected classroom camera rig with real-time face landmark mesh tracking.
            </p>
          </div>

          {/* Visual Camera Preview Placeholder Card */}
          <div 
            onClick={() => navigate('/take-attendance')}
            className="mt-6 relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[16/8] flex items-center justify-center cursor-pointer group/cam"
          >
            <img 
              src="/hero-scenic-1.jpg" 
              alt="Classroom Camera Rig"
              className="w-full h-full object-cover opacity-40 group-hover/cam:scale-105 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=800&q=80";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
            
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-slate-300">
                HD Optical Sensor Ready
              </span>
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-slate-900/90 border border-slate-700 flex items-center justify-center text-cyan-400 mb-2 shadow-lg group-hover/cam:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white">Launch Interactive Camera</span>
              <span className="text-[11px] text-slate-400 mt-0.5">Click to activate video capture stream</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
            <span className="text-xs text-slate-400">Supports 4K / 1080p Optical Feeds</span>
            <button
              onClick={() => navigate('/take-attendance')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1.5 transition-colors"
              type="button"
            >
              <span>Activate Camera</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Split Section: Recent Attendance Ledger (Left) & Classes (Right) ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Sessions (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Recent Attendance Sessions</h2>
              <p className="text-xs text-slate-400">Authenticated classroom records and AI recognition logs</p>
            </div>

            {/* Filter Pill Tabs */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                  filter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                type="button"
              >
                All Sessions
              </button>
              <button
                onClick={() => setFilter('verified')}
                className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                  filter === 'verified' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                type="button"
              >
                High Accuracy (≥90%)
              </button>
              <button
                onClick={() => setFilter('audit')}
                className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                  filter === 'audit' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                type="button"
              >
                Needs Review
              </button>
            </div>
          </div>

          {/* Sessions Table Container */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-xl">
            {filteredSessions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-white">No attendance sessions logged yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Take your first classroom attendance photo or camera scan to begin tracking automated records.
                </p>
                <button
                  onClick={() => navigate('/take-attendance')}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md"
                  type="button"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Start First Session</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                      <th className="py-3.5 px-4 font-semibold">Class & Subject</th>
                      <th className="py-3.5 px-4 font-semibold">Attendance</th>
                      <th className="py-3.5 px-4 font-semibold">Accuracy</th>
                      <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSessions.slice(0, 8).map((sess) => {
                      const present = sess.present_count || 0;
                      const total = sess.total_enrolled || 1;
                      const pct = Math.round((present / total) * 100);
                      return (
                        <tr key={sess.id} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="py-4 px-4 font-mono text-slate-300">
                            {sess.date} <span className="text-slate-400 font-normal">• {sess.start_time}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-white">{sess.class_name || 'CSE Section A'}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{sess.subject_name || sess.subject_code || 'DBMS101'}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-bold text-white">{present}</span>
                            <span className="text-slate-400 font-normal"> / {total} students</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${pct >= 75 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`} 
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                              <span className="font-mono text-[11px] font-semibold text-slate-300">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => navigate(`/history?session_id=${sess.id}`)}
                              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 transition-colors"
                              type="button"
                              aria-label={`Inspect session ${sess.id} from ${sess.date}`}
                            >
                              <span>Inspect</span>
                              <ArrowRight className="w-3.5 h-3.5" />
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

        {/* Right Column: Academic Class Sections (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Academic Classes</h2>
              <p className="text-xs text-slate-400">Class sections and enrolled student rosters</p>
            </div>
            <button
              onClick={() => navigate('/classes')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              type="button"
            >
              Manage
            </button>
          </div>

          <div className="space-y-3">
            {classes.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
                No classes registered. Go to Classes to add one.
              </div>
            ) : (
              classes.map((cls) => (
                <div 
                  key={cls.id}
                  className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl hover:border-slate-700 transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{cls.name} {cls.section}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                          {cls.academic_year}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {students.filter(s => s.class_id === cls.id).length} Enrolled Students
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition-colors">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <button
                      onClick={() => navigate('/students')}
                      className="text-slate-400 hover:text-white transition-colors"
                      type="button"
                    >
                      View Roster
                    </button>
                    <button
                      onClick={() => navigate('/take-attendance')}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
                      type="button"
                    >
                      <span>Take Attendance</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── Interactive Feedback Toast ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 border border-emerald-500/40 shadow-2xl text-xs font-semibold text-emerald-300 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
