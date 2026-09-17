import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, XCircle, AlertTriangle, Save, 
  FileSpreadsheet, ArrowLeft, Check, Sparkles, ShieldCheck, UserCheck, Edit3, X 
} from 'lucide-react';
import { BoundingBoxCanvas } from '../components/BoundingBoxCanvas';
import { AttendanceService } from '../services/api';
import { AttendanceAnalysisResponse, AttendanceProposalItem, RecognizedFace } from '../types';

interface ReviewAttendanceProps {
  analysisResult: AttendanceAnalysisResponse | null;
  sessionContext: { classId: number; subjectId: number; date: string; startTime: string } | null;
}

export const ReviewAttendance: React.FC<ReviewAttendanceProps> = ({
  analysisResult,
  sessionContext
}) => {
  const navigate = useNavigate();

  if (!analysisResult || !sessionContext) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-slate-400">No active attendance review session found.</p>
        <button
          onClick={() => navigate('/take-attendance')}
          className="px-4 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg"
        >
          Go to Take Attendance
        </button>
      </div>
    );
  }

  const [proposedList, setProposedList] = useState<AttendanceProposalItem[]>(
    analysisResult.proposed_attendance
  );
  const [faces, setFaces] = useState<RecognizedFace[]>(
    analysisResult.recognized_faces
  );
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [editingFaceIndex, setEditingFaceIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [savedSessionId, setSavedSessionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleStatus = (studentDbId: number) => {
    setProposedList((prev) =>
      prev.map((item) => {
        if (item.student_db_id === studentDbId) {
          const newStatus = item.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
          return {
            ...item,
            status: newStatus,
            verification_status: 'TEACHER_VERIFIED'
          };
        }
        return item;
      })
    );
  };

  const markAllVerified = () => {
    setProposedList((prev) =>
      prev.map((item) => ({
        ...item,
        verification_status: 'TEACHER_VERIFIED'
      }))
    );
  };

  const handleAssignFaceToStudent = (faceIdx: number, targetStudentDbId: number) => {
    const targetStudent = proposedList.find(s => s.student_db_id === targetStudentDbId);
    if (!targetStudent) return;

    // Update face
    setFaces(prev => prev.map((f, idx) => {
      if (idx === faceIdx) {
        return {
          ...f,
          student_id: targetStudent.student_db_id,
          custom_student_id: targetStudent.student_id,
          name: targetStudent.name,
          roll_number: targetStudent.roll_number,
          status: 'PRESENT',
          confidence: 1.0,
          verification_status: 'TEACHER_VERIFIED'
        };
      }
      return f;
    }));

    // Update student proposal to present
    setProposedList(prev => prev.map(s => {
      if (s.student_db_id === targetStudentDbId) {
        return {
          ...s,
          status: 'PRESENT',
          confidence: 1.0,
          verification_status: 'TEACHER_VERIFIED'
        };
      }
      return s;
    }));

    setSelectedStudentId(targetStudentDbId);
    setEditingFaceIndex(null);
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    setError(null);

    const records = proposedList.map((item) => ({
      student_id: item.student_db_id,
      status: item.status,
      confidence: item.confidence,
      verification_status: item.verification_status
    }));

    try {
      const savedSession = await AttendanceService.saveSession({
        class_id: sessionContext.classId,
        subject_id: sessionContext.subjectId,
        date: sessionContext.date,
        start_time: sessionContext.startTime,
        image_path: analysisResult.image_url,
        records,
        recognized_faces: faces
      } as any);

      setSavedSessionId(savedSession.id);
      setSaveSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save attendance record.");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = proposedList.filter((item) => item.status === 'PRESENT').length;
  const absentCount = proposedList.filter((item) => item.status === 'ABSENT').length;
  const needsReviewCount = proposedList.filter((item) => item.verification_status === 'NEEDS_REVIEW').length;

  if (saveSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">Attendance Saved & Model Trained!</h1>
          <p className="text-slate-400 text-sm">
            Attendance has been recorded and teacher-verified faces have been automatically added to student training profiles.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 grid grid-cols-2 gap-4 max-w-md mx-auto">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-3xl font-bold text-emerald-400">{presentCount}</div>
            <div className="text-xs text-slate-400 font-semibold uppercase mt-1">Students Present</div>
          </div>
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <div className="text-3xl font-bold text-rose-400">{absentCount}</div>
            <div className="text-xs text-slate-400 font-semibold uppercase mt-1">Students Absent</div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate('/history')}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl border border-slate-700"
          >
            View Attendance History
          </button>
          <a
            href={AttendanceService.downloadExcelUrl(sessionContext.classId, sessionContext.subjectId)}
            download
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Excel Report
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button
            onClick={() => navigate('/take-attendance')}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 mb-1 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Take Attendance
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight">Attendance Review & Correction</h1>
          <p className="text-xs text-slate-400">
            Review AI recognition results. Any corrections you make will automatically train the AI recognition engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={markAllVerified}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            Mark All Verified
          </button>
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving & Training...' : 'Save Attendance'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Present</div>
            <div className="text-xl font-bold text-emerald-400">{presentCount}</div>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-500/40" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Absent</div>
            <div className="text-xl font-bold text-rose-400">{absentCount}</div>
          </div>
          <XCircle className="w-6 h-6 text-rose-500/40" />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Needs Review</div>
            <div className="text-xl font-bold text-amber-400">{needsReviewCount}</div>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-500/40" />
        </div>
      </div>

      {/* Main Grid: Image Bounding Box Canvas + Student Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Image Bounding Box Canvas */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Detected Faces Visualizer
            </h2>
            <div className="flex items-center gap-2 text-[10px] font-medium">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Recognized
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Review
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Unknown
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Tip: Click on any face box to highlight the student or reassign an unknown face.
          </p>

          <BoundingBoxCanvas
            imageUrl={analysisResult.image_url}
            recognizedFaces={faces}
            selectedStudentId={selectedStudentId}
            onSelectFace={(face: RecognizedFace) => {
              const idx = faces.findIndex(f => f === face || (f.box.x === face.box.x && f.box.y === face.box.y));
              if (idx !== -1) {
                setEditingFaceIndex(idx);
              }
              if (face.student_id) {
                setSelectedStudentId(face.student_id);
              }
            }}
          />

          {/* Reassign / Correction Box */}
          {editingFaceIndex !== null && (
            <div className="p-3 bg-slate-950 border border-violet-500/40 rounded-xl space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  Assign Face #{editingFaceIndex + 1} ({faces[editingFaceIndex]?.name})
                </span>
                <button
                  onClick={() => setEditingFaceIndex(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-lg text-xs p-2 focus:ring-1 focus:ring-violet-500 focus:outline-none"
                  defaultValue=""
                  onChange={(e) => {
                    const sid = parseInt(e.target.value);
                    if (sid) handleAssignFaceToStudent(editingFaceIndex, sid);
                  }}
                >
                  <option value="" disabled>Select student to assign this face...</option>
                  {proposedList.map((s) => (
                    <option key={s.student_db_id} value={s.student_db_id}>
                      {s.roll_number} - {s.name} ({s.student_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Student Proposed Attendance Table */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Proposed Attendance List ({proposedList.length} Students)</h2>
            <span className="text-xs text-slate-400">Click toggle to switch Present/Absent</span>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">AI Confidence</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {proposedList.map((item) => {
                  const isSelected = selectedStudentId === item.student_db_id;
                  const pct = Math.round(item.confidence * 100);

                  return (
                    <tr
                      key={item.student_db_id}
                      onClick={() => setSelectedStudentId(item.student_db_id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-600/10' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-400">{item.roll_number}</td>
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        {item.name}
                        {item.verification_status === 'TEACHER_VERIFIED' && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[9px] font-bold">
                            Verified
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            pct >= 80
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : pct >= 50
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {pct > 0 ? `${pct}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                            item.status === 'PRESENT'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {item.status === 'PRESENT' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStatus(item.student_db_id);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold border border-slate-700 transition-all"
                        >
                          Toggle {item.status === 'PRESENT' ? 'Absent' : 'Present'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

