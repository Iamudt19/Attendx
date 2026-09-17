import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Camera, Users, History, FileSpreadsheet, CheckCircle2, 
  Clock, AlertCircle, TrendingUp, BookOpen, ArrowRight 
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

  const totalClassesCount = classes.length * 2; // Simulated schedule count
  const takenCount = sessions.length;
  const pendingCount = Math.max(0, totalClassesCount - takenCount);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Good Morning, {user?.name || 'Teacher'} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            "One Photo. Complete Attendance." Ready to record today's classroom sessions.
          </p>
        </div>
        <button
          onClick={() => navigate('/take-attendance')}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2"
        >
          <Camera className="w-5 h-5" />
          <span>Take Attendance Now</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{totalClassesCount}</div>
            <div className="text-xs text-slate-400 font-medium">Classes Scheduled</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{takenCount}</div>
            <div className="text-xs text-slate-400 font-medium">Attendance Recorded</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{pendingCount}</div>
            <div className="text-xs text-slate-400 font-medium">Pending Sessions</div>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Attendance Sessions List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              Recent Attendance Sessions
            </h2>
            <Link to="/history" className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500 text-sm">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm bg-slate-950/40 rounded-xl border border-slate-800/60">
              No attendance sessions recorded yet today. Click "Take Attendance" to begin!
            </div>
          ) : (
            <div className="space-y-2.5">
              {sessions.slice(0, 5).map((sess) => {
                const pct = sess.total_enrolled > 0 ? Math.round((sess.present_count / sess.total_enrolled) * 100) : 0;
                return (
                  <div
                    key={sess.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-all"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{sess.subject_name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{sess.class_name}</span>
                        <span>•</span>
                        <span>{sess.date} ({sess.start_time})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-emerald-400">
                          {sess.present_count} / {sess.total_enrolled} Present
                        </div>
                        <div className="text-[11px] text-slate-400">{pct}% Attendance</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/take-attendance')}
              className="w-full p-4 rounded-xl bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 text-left transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-blue-300">Take Attendance</div>
                  <div className="text-xs text-slate-400">Upload classroom photo & run AI</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-400" />
            </button>

            <button
              onClick={() => navigate('/students')}
              className="w-full p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 text-left transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-emerald-300">Students Directory</div>
                  <div className="text-xs text-slate-400">Register faces & manage students</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => navigate('/history')}
              className="w-full p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 text-left transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-amber-300">Export Attendance Excel</div>
                  <div className="text-xs text-slate-400">Download formatted workbooks</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
