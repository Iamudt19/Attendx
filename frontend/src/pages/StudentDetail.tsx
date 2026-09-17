import React, { useState, useEffect } from 'react';
import { useParams as useReactParams, useNavigate as useReactNavigate } from 'react-router-dom';
import { User, ArrowLeft, CheckCircle2, XCircle, Award, BookOpen } from 'lucide-react';
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
    return <div className="text-center py-12 text-slate-500 text-sm">Loading student attendance profile...</div>;
  }

  if (!student || !attendanceData) {
    return <div className="text-center py-12 text-slate-400 text-sm">Student profile not found.</div>;
  }

  const pct = student.attendance_percentage || 100;
  const logs = attendanceData.logs || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/students')}
        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-semibold"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Students Directory
      </button>

      {/* Header Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-2xl">
            {student.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{student.name}</h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Roll No: {student.roll_number} • Student ID: {student.student_id}
            </p>
          </div>
        </div>

        {/* Attendance % Meter */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-center min-w-[140px]">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Overall Attendance</div>
          <div className={`text-3xl font-extrabold ${pct >= 85 ? 'text-emerald-400' : pct >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>
            {pct}%
          </div>
        </div>
      </div>

      {/* Recent Attendance Sequence Pill Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Attendance Sequence</h2>
        {logs.length === 0 ? (
          <p className="text-xs text-slate-500">No attendance sessions logged for this student yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {logs.map((log: any, idx: number) => (
              <span
                key={idx}
                title={`${log.date}: ${log.subject_code} - ${log.status}`}
                className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center border shadow-sm ${
                  log.status === 'PRESENT'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {log.status === 'PRESENT' ? 'P' : 'A'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Detailed Attendance History</h2>
        <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">AI Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {logs.map((log: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 text-slate-300">{log.date}</td>
                  <td className="py-3 px-4 font-semibold text-slate-200">{log.subject_name} ({log.subject_code})</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        log.status === 'PRESENT'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
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
