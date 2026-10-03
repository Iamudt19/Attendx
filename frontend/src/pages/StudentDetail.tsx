import React, { useState, useEffect } from 'react';
import { useParams as useReactParams, useNavigate as useReactNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, XCircle, ShieldCheck, Sparkles, Fingerprint, Calendar
} from 'lucide-react';
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
      <div className="text-center py-20 bg-[#141416] border border-[#3c4a42]/30 rounded-2xl shadow-xl text-[#86948a] font-mono text-sm">
        <div className="w-6 h-6 border-2 border-[#4edea3] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading student attendance profile & neural embedding gallery...
      </div>
    );
  }

  if (!student || !attendanceData) {
    return (
      <div className="text-center py-20 bg-[#141416] border border-[#3c4a42]/30 rounded-2xl shadow-xl text-[#86948a] font-mono text-sm">
        Student profile not found in institutional database.
      </div>
    );
  }

  const pct = student.attendance_percentage || 100;
  const logs = attendanceData.logs || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-[#e5e1e4]">
      <button
        onClick={() => navigate('/students')}
        className="text-xs text-[#86948a] hover:text-white flex items-center gap-1.5 font-semibold transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Student Directory
      </button>

      {/* ── Header Profile Card ── */}
      <div className="bg-[#141416] border border-[#3c4a42]/30 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          {student.avatar_url ? (
            <img 
              src={student.avatar_url} 
              alt={student.name} 
              className="w-16 h-16 rounded-2xl object-cover border border-[#3c4a42]/50 shadow-md ring-4 ring-blue-500/10"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#201f22] text-[#4edea3] border border-[#3c4a42]/50 flex items-center justify-center font-bold text-2xl font-mono shadow-xs">
              {student.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1c1b1d] text-[#86948a] border border-[#3c4a42]/40 text-[11px] font-mono font-semibold mb-1">
              Roll No: {student.roll_number}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{student.name}</h1>
            <p className="text-xs text-[#86948a] font-mono mt-0.5">
              Institutional ID: <span className="text-[#e5e1e4] font-semibold">{student.student_id}</span>
            </p>
          </div>
        </div>

        {/* Attendance % Meter */}
        <div className="bg-[#1c1b1d] border border-[#3c4a42]/40 p-4 rounded-xl text-center min-w-[150px] shadow-xs">
          <div className="text-[10px] text-[#86948a] font-mono font-bold uppercase tracking-wider mb-1">
            Attendance Ratio
          </div>
          <div className={`text-3xl font-black font-mono ${pct >= 85 ? 'text-[#4edea3]' : pct >= 75 ? 'text-amber-400' : 'text-rose-400'}`}>
            {pct}%
          </div>
        </div>
      </div>

      {/* ── Enrolled Biometric Reference Photos Gallery ── */}
      <div className="bg-[#141416] border border-[#3c4a42]/30 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-[#4edea3]" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Biometric Reference Face Vectors
            </h2>
          </div>
          <span className="px-2.5 py-1 text-[11px] bg-emerald-500/10 text-[#4edea3] border border-emerald-500/20 rounded-md font-semibold font-mono">
            {student.face_images?.length || student.embeddings_count || 0} Registered Angle(s)
          </span>
        </div>

        {!student.face_images || student.face_images.length === 0 ? (
          <div className="p-5 rounded-xl bg-[#1c1b1d] border border-[#3c4a42]/30 text-xs text-[#86948a] font-mono italic text-center">
            {student.embeddings_count && student.embeddings_count > 0
              ? `${student.embeddings_count} one-way mathematical embeddings active in PostgreSQL vector space (Raw photos purged for privacy).`
              : 'No reference face photos uploaded for this student yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1">
            {student.face_images.map((imgUrl, i) => (
              <div key={i} className="group relative aspect-square rounded-xl overflow-hidden border border-[#3c4a42]/40 bg-[#1c1b1d] shadow-xs hover:border-[#4edea3]/60 transition-all">
                <img 
                  src={imgUrl} 
                  alt={`Face crop ${i+1}`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-1.5 text-[10px] font-mono text-white text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  Vector #{i+1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Attendance Log Matrix ── */}
      <div className="bg-[#141416] border border-[#3c4a42]/30 rounded-2xl p-6 space-y-3 shadow-xl">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          Recent Attendance Ledger
        </h2>
        {logs.length === 0 ? (
          <p className="text-xs text-[#86948a] font-mono italic">No attendance sessions logged for this student yet.</p>
        ) : (
          <div className="space-y-2 pt-1">
            {logs.map((log: any, idx: number) => (
              <div
                key={idx}
                className="p-3 bg-[#1c1b1d] rounded-xl border border-[#3c4a42]/30 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-white">{log.session_date || 'Class Session'}</div>
                  <div className="text-[10px] font-mono text-[#86948a]">{log.class_name || log.subject_name || 'Lecture'}</div>
                </div>
                <div className="flex items-center gap-3">
                  {log.confidence && (
                    <span className="text-[11px] font-mono text-[#86948a]">
                      {(log.confidence * 100).toFixed(1)}% Match
                    </span>
                  )}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      log.status === 'PRESENT'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
