import React, { useState, useEffect } from 'react';
import { useParams as useReactParams, useNavigate as useReactNavigate } from 'react-router-dom';
import { User, ArrowLeft, CheckCircle2, XCircle, Award, BookOpen, ShieldCheck, Sparkles, Fingerprint } from 'lucide-react';
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
      <div className="text-center py-20 bg-white border border-slate-200/90 rounded-2xl shadow-sm text-slate-500 text-sm">
        Loading student attendance profile and neural embedding gallery...
      </div>
    );
  }

  if (!student || !attendanceData) {
    return (
      <div className="text-center py-20 bg-white border border-slate-200/90 rounded-2xl shadow-sm text-slate-500 text-sm">
        Student profile not found.
      </div>
    );
  }

  const pct = student.attendance_percentage || 100;
  const logs = attendanceData.logs || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/students')}
        className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 font-semibold transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Students Directory
      </button>

      {/* Header Profile Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          {student.avatar_url ? (
            <img 
              src={student.avatar_url} 
              alt={student.name} 
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm ring-4 ring-blue-500/10"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center font-bold text-2xl font-mono shadow-xs">
              {student.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-mono font-semibold mb-1">
              Roll No: {student.roll_number}
            </div>
            <h1 className="font-serif text-3xl font-normal text-slate-900 tracking-tight">{student.name}</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Institutional ID: <span className="text-slate-800 font-semibold">{student.student_id}</span>
            </p>
          </div>
        </div>

        {/* Attendance % Meter */}
        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl text-center min-w-[150px] shadow-xs">
          <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Attendance Ratio</div>
          <div className={`text-3xl font-black ${pct >= 85 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>
            {pct}%
          </div>
        </div>
      </div>

      {/* Enrolled Biometric Reference Photos Gallery */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              Biometric Reference Face Crops
            </h2>
          </div>
          <span className="px-2.5 py-1 text-[11px] bg-blue-50 text-blue-700 border border-blue-200/70 rounded-md font-semibold">
            {student.face_images?.length || 0} Registered Angle(s)
          </span>
        </div>

        {!student.face_images || student.face_images.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 italic text-center">
            No face reference photos uploaded for this student yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1">
            {student.face_images.map((imgUrl, i) => (
              <div key={i} className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs hover:border-blue-400 transition-all">
                <img 
                  src={imgUrl} 
                  alt={`Face crop ${i+1}`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 via-slate-900/60 to-transparent p-1.5 text-[10px] font-mono text-white text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  Vector #{i+1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Attendance Sequence Pill Strip */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-3 shadow-sm">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Recent Attendance Matrix</h2>
        {logs.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No attendance sessions logged for this student yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {logs.map((log: any, idx: number) => (
              <span
                key={idx}
                title={`${log.date}: ${log.subject_name || log.subject_code} - ${log.status}`}
                className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center border shadow-xs transition-transform hover:scale-105 ${
                  log.status === 'PRESENT'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {log.status === 'PRESENT' ? 'P' : 'A'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Log Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Detailed Attendance History</h2>
          <span className="text-xs text-slate-500 font-sans">{logs.length} Total Sessions</span>
        </div>
        <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Subject Course</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Confidence Vector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {logs.map((log: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-slate-700">{log.date}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{log.subject_name} ({log.subject_code})</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        log.status === 'PRESENT'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 font-mono">
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
