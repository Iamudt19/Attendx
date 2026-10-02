import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, XCircle, AlertTriangle, Save, 
  FileSpreadsheet, ArrowLeft, Check, Sparkles, ShieldCheck, UserCheck, Edit3, X, Zap, ChevronRight, HelpCircle, Camera 
} from 'lucide-react';
import { BoundingBoxCanvas } from '../components/BoundingBoxCanvas';
import { AttendanceService } from '../services/api';
import { AttendanceAnalysisResponse, AttendanceProposalItem, RecognizedFace } from '../types';
import { extractErrorMessage } from '../utils/error';

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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [savedSessionId, setSavedSessionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Available photo URLs list
  const imageUrls = analysisResult.image_urls && analysisResult.image_urls.length > 0 
    ? analysisResult.image_urls 
    : [analysisResult.image_url];
  
  const activeImageUrl = imageUrls[currentPhotoIndex] || imageUrls[0];

  // Filter faces for the currently active photo
  const activePhotoFaces = faces.filter((f) => (f.image_index ?? 0) === currentPhotoIndex);

  // Quick exception review items
  const needsReviewItems = proposedList.filter(item => item.verification_status === 'NEEDS_REVIEW');

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

  const confirmStudentPresent = (studentDbId: number) => {
    setProposedList((prev) =>
      prev.map((item) => {
        if (item.student_db_id === studentDbId) {
          return {
            ...item,
            status: 'PRESENT',
            verification_status: 'TEACHER_VERIFIED'
          };
        }
        return item;
      })
    );
  };

  const markStudentAbsent = (studentDbId: number) => {
    setProposedList((prev) =>
      prev.map((item) => {
        if (item.student_db_id === studentDbId) {
          return {
            ...item,
            status: 'ABSENT',
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
        image_urls: analysisResult.image_urls && analysisResult.image_urls.length > 0
          ? analysisResult.image_urls
          : [analysisResult.image_url],
        records,
        recognized_faces: faces
      } as any);

      setSavedSessionId(savedSession.id);
      setSaveSuccess(true);
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to save attendance record."));
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
            Attendance has been recorded and verified faces have been automatically added to student training profiles.
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
      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <button
            onClick={() => navigate('/take-attendance')}
            className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 mb-1 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> RETURN TO CAPTURE
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Attendance Verification Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            High-confidence matches are auto-verified. Confirm any ambiguous exception cases below and archive session.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={markAllVerified}
            className="px-3.5 py-2 bg-[#121927] hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-all"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Approve All ({presentCount})
          </button>
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Archiving...' : 'Confirm & Save'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Exception Review Banner */}
      {needsReviewItems.length > 0 && (
        <div className="p-4 rounded-xl surface-card border border-amber-500/30 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
            <div>
              <h3 className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider">
                {needsReviewItems.length} Student(s) Require Visual Confirmation
              </h3>
              <p className="text-[11px] text-slate-400">
                Confidence was moderate or lighting was tricky. Confirm identity in 1 click:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {needsReviewItems.map((item) => (
              <div
                key={item.student_db_id}
                className="p-3 bg-[#080C14] border border-amber-500/20 rounded-lg flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{item.name}</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {Math.round(item.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400">Roll: {item.roll_number}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => confirmStudentPresent(item.student_db_id)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Check className="w-3 h-3" /> Present
                  </button>
                  <button
                    onClick={() => markStudentAbsent(item.student_db_id)}
                    className="px-2 py-1 bg-[#121927] hover:bg-slate-800 text-slate-400 rounded text-xs font-medium border border-white/10 transition-all"
                  >
                    Absent
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="surface-card p-4 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Present</div>
            <div className="text-2xl font-bold font-mono text-emerald-400">{presentCount}</div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500/30" />
        </div>

        <div className="surface-card p-4 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Absent</div>
            <div className="text-2xl font-bold font-mono text-rose-400">{absentCount}</div>
          </div>
          <XCircle className="w-5 h-5 text-rose-500/30" />
        </div>

        <div className="surface-card p-4 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Needs Review</div>
            <div className="text-2xl font-bold font-mono text-amber-400">{needsReviewCount}</div>
          </div>
          <AlertTriangle className="w-5 h-5 text-amber-500/30" />
        </div>
      </div>

      {/* Main Grid: Visualizer + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Visualizer */}
        <div className="lg:col-span-5 surface-card rounded-xl p-4 border border-white/10 space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-400" />
              Classroom Visualizer
            </h2>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Recognized
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Review
              </span>
            </div>
          </div>

          {/* Photo Selector Tabs */}
          {imageUrls.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {imageUrls.map((url, idx) => {
                const photoFacesCount = faces.filter((f) => (f.image_index ?? 0) === idx).length;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCurrentPhotoIndex(idx);
                      setEditingFaceIndex(null);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                      currentPhotoIndex === idx
                        ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                        : 'bg-[#080C14] text-slate-400 hover:text-white border border-white/10'
                    }`}
                  >
                    <span>PHOTO #{idx + 1}</span>
                    <span className="text-[10px] px-1 bg-black/40 rounded">
                      {photoFacesCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <BoundingBoxCanvas
            imageUrl={activeImageUrl}
            recognizedFaces={activePhotoFaces}
            selectedStudentId={selectedStudentId}
            onSelectFace={(face: RecognizedFace) => {
              const idx = faces.findIndex(f => f === face || (f.box.x === face.box.x && f.box.y === face.box.y && (f.image_index ?? 0) === (face.image_index ?? 0)));
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
            <div className="p-3 bg-[#080C14] border border-blue-500/40 rounded-lg space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300 font-mono">
                  REASSIGN FACE #{editingFaceIndex + 1} ({faces[editingFaceIndex]?.name})
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
                  className="flex-1 bg-[#121927] border border-white/10 text-white rounded text-xs p-2 focus:border-blue-500 focus:outline-none font-mono"
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

        {/* Right column: Roster Table */}
        <div className="lg:col-span-7 surface-card rounded-xl p-4 border border-white/10 space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Class Roster ({proposedList.length} Students)
            </h2>
            <span className="text-[11px] font-mono text-slate-500">CLICK ROW TO LOCATE IN PHOTO</span>
          </div>

          <div className="overflow-x-auto max-h-[480px] overflow-y-auto border border-white/[0.06] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#080C14] text-slate-400 uppercase tracking-wider font-mono text-[10px] sticky top-0 border-b border-white/[0.08]">
                <tr>
                  <th className="py-2.5 px-3">Roll No</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">AI Score</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {proposedList.map((item) => {
                  const isSelected = selectedStudentId === item.student_db_id;
                  const pct = Math.round(item.confidence * 100);

                  const handleRowClick = () => {
                    setSelectedStudentId(item.student_db_id);
                    const matchedFace = faces.find((f) => f.student_id === item.student_db_id);
                    if (matchedFace && matchedFace.image_index !== undefined) {
                      setCurrentPhotoIndex(matchedFace.image_index);
                    }
                  };

                  return (
                    <tr
                      key={item.student_db_id}
                      onClick={handleRowClick}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-600/20' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-400">{item.roll_number}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">
                        {item.name}
                        {item.verification_status === 'TEACHER_VERIFIED' && (
                          <span className="ml-2 px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[9px] font-mono">
                            VERIFIED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pct >= 65
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : pct >= 40
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {pct > 0 ? `${pct}%` : '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                            item.status === 'PRESENT'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStatus(item.student_db_id);
                          }}
                          className="px-2 py-1 bg-[#121927] hover:bg-slate-800 text-slate-300 rounded text-[11px] font-mono border border-white/10 transition-all"
                        >
                          {item.status === 'PRESENT' ? 'Set Absent' : 'Set Present'}
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
