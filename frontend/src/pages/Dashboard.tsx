import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Camera, Users, History, FileSpreadsheet, CheckCircle2, 
  Clock, AlertCircle, TrendingUp, BookOpen, ArrowRight, ShieldCheck, Zap, Activity
} from 'lucide-react';
import { AttendanceService, ClassService } from '../services/api';
import { AttendanceSessionOut, ClassItem, User } from '../types';

interface DashboardProps {
  user: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AttendanceSessionOut[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessData, classData] = await Promise.all([
          AttendanceService.getSessions(),
          ClassService.getClasses()
        ]);
        setSessions(sessData);
        setClasses(classData);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalCohorts = classes.length;
  const totalRecordedSessions = sessions.length;
  const totalStudentsEnrolled = classes.reduce((sum, c) => sum + (c.student_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* ── Above-the-Fold Architectural Institutional Hub ── */}
      <div className="surface-card rounded-xl p-6 sm:p-8 border border-white/10 relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          
          {/* Core Institutional Narrative */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-wider uppercase text-blue-400">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="font-bold">SYSTEM ACTIVE</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-300">ATTENDX BIOMETRIC PLATFORM</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                High-Throughput Classroom Biometric Attendance Engine
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Automated facial recognition infrastructure built specifically for lecture halls, laboratories, and academic cohorts.
              </p>
            </div>

            {/* 3-Column Core Value Pillars: What / Who / Why */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-lg bg-[#080C14] border border-white/[0.08]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold mb-1">
                  1. What It Is
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  Multi-angle parallel neural scanner analyzing entire 70+ student classrooms in parallel.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#080C14] border border-white/[0.08]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold mb-1">
                  2. Who It's For
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  University professors, faculty instructors, and departmental audit administrators.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#080C14] border border-white/[0.08]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-1">
                  3. Why It Matters
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  Eliminates 15 minutes of manual roll-calls with instant cross-photo deduplication and zero proxy fraud.
                </p>
              </div>
            </div>
          </div>

          {/* Direct Action Hub: What To Do Next */}
          <div className="lg:col-span-4 surface-inset rounded-xl p-5 border border-white/10 flex flex-col justify-between space-y-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                <span>NEXT ACTION</span>
                <span className="text-emerald-400">STEP 1 OF 3</span>
              </div>
              <h3 className="text-sm font-bold text-white mt-1">Ready for Class Attendance?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Upload room photos or use your camera to mark 70+ students in one click.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => navigate('/take-attendance')}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Launch Attendance Scan</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate('/students')}
                  className="py-2.5 px-3 bg-[#121927] hover:bg-slate-800 text-slate-200 font-semibold text-xs rounded-lg border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Rosters</span>
                </button>
                <button
                  onClick={() => navigate('/history')}
                  className="py-2.5 px-3 bg-[#121927] hover:bg-slate-800 text-slate-200 font-semibold text-xs rounded-lg border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Metric Telemetry Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface-card rounded-xl p-5 border border-white/10 space-y-1">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white font-mono tracking-tight">{totalStudentsEnrolled}</div>
          <div className="text-[11px] text-slate-500">Across {totalCohorts} registered academic cohorts</div>
        </div>

        <div className="surface-card rounded-xl p-5 border border-white/10 space-y-1">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Sessions Recorded</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 font-mono tracking-tight">{totalRecordedSessions}</div>
          <div className="text-[11px] text-slate-500">Biometric verifications archived</div>
        </div>

        <div className="surface-card rounded-xl p-5 border border-white/10 space-y-1">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Neural Match Speed</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white font-mono tracking-tight">&lt; 1.8s</div>
          <div className="text-[11px] text-slate-500">ONNX vectorized cosine latency</div>
        </div>
      </div>

      {/* ── Main Ledger Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Attendance Sessions Ledger */}
        <div className="lg:col-span-2 surface-card rounded-xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              Recent Attendance Ledger
            </h2>
            <Link to="/history" className="text-xs font-mono text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
              FULL ARCHIVE <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-10 text-slate-500 text-xs font-mono">LOADING TELEMETRY...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs font-mono surface-inset rounded-lg border border-white/5">
              No attendance sessions recorded yet. Launch a scan to record your first class!
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 6).map((sess) => {
                const pct = sess.total_enrolled > 0 ? Math.round((sess.present_count / sess.total_enrolled) * 100) : 0;
                return (
                  <div
                    key={sess.id}
                    className="p-3.5 rounded-lg bg-[#080C14] border border-white/[0.06] flex items-center justify-between hover:border-white/20 transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{sess.subject_name}</div>
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{sess.class_name}</span>
                        <span>•</span>
                        <span>{sess.date} ({sess.start_time})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-emerald-400">
                          {sess.present_count} / {sess.total_enrolled} Present
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">{pct}% Turnout</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Operations Console */}
        <div className="surface-card rounded-xl p-6 border border-white/10 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/[0.06] pb-3">
            Operations Console
          </h2>
          <div className="space-y-2.5">
            <button
              onClick={() => navigate('/take-attendance')}
              className="w-full p-3.5 rounded-lg bg-[#080C14] border border-white/[0.08] hover:border-blue-500/50 text-left transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-blue-400">Take Attendance</div>
                  <div className="text-[11px] text-slate-500">Multi-photo classroom scan</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => navigate('/students')}
              className="w-full p-3.5 rounded-lg bg-[#080C14] border border-white/[0.08] hover:border-emerald-500/50 text-left transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-400">Student Directory</div>
                  <div className="text-[11px] text-slate-500">Face scans & profiles</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => navigate('/history')}
              className="w-full p-3.5 rounded-lg bg-[#080C14] border border-white/[0.08] hover:border-amber-500/50 text-left transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-400">Export Excel Sheet</div>
                  <div className="text-[11px] text-slate-500">Official monthly attendance</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
