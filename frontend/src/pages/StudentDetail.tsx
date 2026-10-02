import React, { useState, useEffect } from 'react';
import { useParams as useReactParams, useNavigate as useReactNavigate } from 'react-router-dom';
import { User, ArrowLeft, CheckCircle2, XCircle, Award, BookOpen, ShieldCheck, Sparkles, Fingerprint, RefreshCw } from 'lucide-react';
import { AttendanceService, StudentService } from '../services/api';
import { StudentItem } from '../types';

export const StudentDetail: React.FC = () => {
  const { studentId } = useReactParams<{ studentId: string }>();
  const navigate = useReactNavigate();

  const [student, setStudent] = useState<StudentItem | null>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!studentId) return;
    const loadStudentData = async () => {
      try {
        const [st, att] = await Promise.all([
          StudentService.getStudentDetail(Number(studentId)),
          AttendanceService.getStudentAttendanceLog(Number(studentId))
        ]);
        setStudent(st);
        setAttendanceData(att);
      } catch (err) {
        console.error("Failed to load student attendance details", err);
      } finally {
        setLoading(false);
      }
    };
    loadStudentData();
  }, [studentId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center rounded-3xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs font-mono flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
        <span>Loading student attendance profile & neural embedding gallery...</span>
      </div>
    );
  }

  if (!student || !attendanceData) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center rounded-3xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs font-mono space-y-3">
        <p>Student profile not found or could not be loaded.</p>
        <button
          onClick={() => navigate('/students')}
          className="px-4 py-2 rounded-xl bg-slate-800 text-emerald-400 font-semibold text-xs border border-slate-700 hover:bg-slate-700 transition-colors"
        >
          Return to Student Directory
        </button>
      </div>
    );
  }

  const pct = student.attendance_percentage ?? 100;
  const logs = attendanceData.logs || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-slate-100 pb-12">
      <button
        onClick={() => navigate('/students')}
        className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-semibold transition-colors"
        aria-label="Back to Students Directory"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Student Directory</span>
      </button>

      {/* Header Profile Card */}
      <div className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          {student.avatar_url ? (
            <img 
              src={student.avatar_url} 
              alt={student.name} 
              className="w-16 h-16 rounded-2xl object-cover border border-slate-700 shadow-md ring-4 ring-emerald-500/10"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-slate-800 text-emerald-400 border border-slate-700 flex items-center justify-center font-bold text-2xl font-mono shadow-md">
              {student.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono font-semibold mb-1.5">
              Roll No: {student.roll_number}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{student.name}</h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Institutional ID: <span className="text-emerald-400 font-semibold">{student.student_id}</span>
              {student.email && <span className="text-slate-500 ml-2">• {student.email}</span>}
            </p>
          </div>
        </div>

        {/* Attendance % Meter */}
        <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl text-center min-w-[150px] shadow-lg">
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">Attendance Ratio</div>
          <div className={`text-3xl font-black font-mono ${pct >= 85 ? 'text-emerald-400' : pct >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>
            {pct}%
          </div>
        </div>
      </div>

      {/* Enrolled Biometric Reference Photos Gallery */}
      <div className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Biometric Reference Face Crops
            </h2>
          </div>
          <span className="px-2.5 py-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg font-mono font-semibold">
            {student.face_images?.length || 0} Registered Angle(s)
          </span>
        </div>

        {!student.face_images || student.face_images.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs text-slate-500 text-center font-mono">
            No face reference photos uploaded for this student yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1">
            {student.face_images.map((imgUrl, i) => (
              <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md hover:border-emerald-500/50 transition-all">
                <img 
                  src={imgUrl} 
                  alt={`Face crop ${i+1}`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-1.5 text-[10px] font-mono text-emerald-400 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  Vector #{i+1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Attendance Sequence Pill Strip */}
      <div className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 space-y-3 shadow-xl">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono pb-2 border-b border-slate-800">
          Recent Attendance Matrix
        </h2>
        {logs.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono">No attendance sessions logged for this student yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {logs.map((log: any, idx: number) => (
              <span
                key={idx}
                title={`${log.date}: ${log.subject_name || log.subject_code} - ${log.status}`}
                className={`w-9 h-9 rounded-xl font-bold text-xs font-mono flex items-center justify-center border shadow-xs transition-transform hover:scale-105 ${
                  log.status === 'PRESENT'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {log.status === 'PRESENT' ? 'P' : 'A'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Log Table */}
      <div className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Detailed Attendance History</h2>
          <span className="text-xs text-slate-400 font-mono">{logs.length} Total Sessions</span>
        </div>
        <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px] font-mono">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Subject Course</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Confidence Vector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {logs.map((log: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-slate-300 font-mono">{log.date}</td>
                  <td className="py-3 px-4 font-semibold text-white">{log.subject_name} ({log.subject_code})</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                        log.status === 'PRESENT'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400 font-mono">
                    {Math.round(log.confidence * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
