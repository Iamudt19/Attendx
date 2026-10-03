import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  ArrowLeft, 
  Save, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  UserCheck, 
  UserX, 
  RefreshCw, 
  Eye, 
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Zap,
  Users,
  Camera
} from 'lucide-react';
import { AttendanceService } from '../services/api';
import { AttendanceAnalysisResponse, AttendanceProposalItem, RecognizedFace } from '../types';
import { extractErrorMessage } from '../utils/error';
import { BoundingBoxCanvas } from '../components/BoundingBoxCanvas';

interface ReviewAttendanceProps {
  analysisResult: AttendanceAnalysisResponse | null;
  sessionContext: { classId: number; subjectId: number; date: string; startTime: string } | null;
}

export const ReviewAttendance: React.FC<ReviewAttendanceProps> = ({
  analysisResult,
  sessionContext
}) => {
  const navigate = useNavigate();

  // 1. Photos list (support multi-photo)
  const imageUrls: string[] = analysisResult?.image_urls && analysisResult.image_urls.length > 0
    ? analysisResult.image_urls
    : analysisResult?.image_url
      ? [analysisResult.image_url]
      : ['/hero-scenic-1.jpg'];

  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  // 2. Proposed attendance list
  const initialProposed: AttendanceProposalItem[] = analysisResult?.proposed_attendance ?? [];

  const initialFaces: RecognizedFace[] = analysisResult?.recognized_faces ?? [];

  const [proposedList, setProposedList] = useState<AttendanceProposalItem[]>(initialProposed);
  const [faces, setFaces] = useState<RecognizedFace[]>(initialFaces);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(initialProposed[0]?.student_db_id || null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'review' | 'absent'>('all');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Filter faces for the currently active photo
  const activePhotoFaces = faces.filter(f => (f.image_index ?? 0) === activePhotoIndex);

  const selectedStudent = proposedList.find((s) => s.student_db_id === selectedStudentId);

  // Status Counts
  const presentCount = proposedList.filter(s => s.status === 'PRESENT').length;
  const reviewCount = proposedList.filter(s => s.verification_status === 'NEEDS_REVIEW').length;
  const absentCount = proposedList.filter(s => s.status === 'ABSENT').length;
  const totalCount = proposedList.length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  if (!analysisResult || proposedList.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6 text-[var(--text-primary)] animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mx-auto flex items-center justify-center shadow-xl backdrop-blur-xl">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] font-serif">No Active Attendance Session In Review</h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Take a photo scan or upload classroom pictures in the Attendance Canvas to inspect AI detections, verify proposed rosters, and save official session ledgers.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            onClick={() => navigate('/take-attendance')}
            className="px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Launch Attendance Scanner</span>
          </button>
          <button
            onClick={() => navigate('/history')}
            className="px-6 py-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] text-[var(--text-primary)] font-medium text-xs rounded-xl border border-[var(--border-color)] transition-colors"
          >
            <span>View Attendance Ledger</span>
          </button>
        </div>
      </div>
    );
  }

  const handleToggleStatus = (studentDbId: number) => {
    setProposedList(prev => prev.map(s => {
      if (s.student_db_id === studentDbId) {
        const nextStatus = s.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
        return {
          ...s,
          status: nextStatus,
          verification_status: 'TEACHER_VERIFIED'
        };
      }
      return s;
    }));
  };

  const handleApproveAllReview = () => {
    setProposedList(prev => prev.map(s => {
      if (s.verification_status === 'NEEDS_REVIEW') {
        return {
          ...s,
          status: 'PRESENT',
          verification_status: 'TEACHER_VERIFIED'
        };
      }
      return s;
    }));
    showToast('All review flags approved as Present');
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    setError(null);
    try {
      const records = proposedList.map((item) => ({
        student_id: item.student_db_id,
        status: item.status,
        confidence: item.confidence,
        verification_status: item.verification_status
      }));

      await AttendanceService.saveSession({
        class_id: sessionContext?.classId || 1,
        subject_id: sessionContext?.subjectId || 1,
        date: sessionContext?.date || new Date().toISOString().split('T')[0],
        start_time: sessionContext?.startTime || '09:00',
        image_path: imageUrls[0],
        image_urls: imageUrls,
        records,
        recognized_faces: faces
      } as any);

      setSaveSuccess(true);
      showToast('Attendance records finalized and synchronized to database!');
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to save attendance record. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  if (saveSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6 text-[var(--text-primary)] animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center shadow-lg">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Attendance Ledger Finalized!</h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            All records cryptographically signed and stored in Supabase PostgreSQL with 128-D biometric vector active learning updates.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => navigate('/history')}
            className="px-5 py-2.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] text-[var(--text-primary)] font-medium text-xs rounded-xl border border-[var(--border-color)] transition-colors shadow-sm"
          >
            View History Ledger
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const filteredStudents = proposedList.filter(s => {
    if (statusFilter === 'present') return s.status === 'PRESENT';
    if (statusFilter === 'review') return s.verification_status === 'NEEDS_REVIEW';
    if (statusFilter === 'absent') return s.status === 'ABSENT';
    return true;
  });

  return (
    <div className="flex flex-col w-full space-y-6 text-[var(--text-primary)] max-w-7xl mx-auto pb-12 transition-colors font-sans">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/take-attendance')}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Capture</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            Review Attendance Results
            <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] font-mono font-normal">
              {presentCount} / {totalCount} Present ({attendanceRate}%)
            </span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Interactive bounding box audit • Confirm AI proposals or click a student to toggle status
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {reviewCount > 0 && (
            <button
              onClick={handleApproveAllReview}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
              type="button"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <span>Approve All Review Flags ({reviewCount})</span>
            </button>
          )}

          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-bold hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-emerald-500/20"
            type="button"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Finalizing...' : 'Save & Finalize Attendance'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Multi-Photo Selector Tabs (if more than 1 photo) ── */}
      {imageUrls.length > 1 && (
        <div className="swiss-card flex items-center gap-2 p-2 rounded-2xl overflow-x-auto">
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] px-3 font-semibold flex items-center gap-1.5 shrink-0">
            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
            Classroom Sections ({imageUrls.length} Photos):
          </span>
          {imageUrls.map((url, idx) => {
            const photoFaceCount = faces.filter(f => (f.image_index ?? 0) === idx).length;
            const isActive = activePhotoIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => setActivePhotoIndex(idx)}
                className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                type="button"
              >
                <span>Photo #{idx + 1}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                  {photoFaceCount} Faces
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Main Workspace (Left: Interactive Bounding Box Canvas / Right: Student Roster) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual AI Bounding Box Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="swiss-card p-4 rounded-3xl">
            <BoundingBoxCanvas
              imageUrl={imageUrls[activePhotoIndex] || imageUrls[0]}
              recognizedFaces={activePhotoFaces}
              selectedStudentId={selectedStudentId}
              onSelectFace={(face) => {
                if (face.student_id) {
                  setSelectedStudentId(face.student_id);
                }
              }}
            />
          </div>
        </div>

        {/* Right Column: Student Attendance Ledger & Overrides (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="swiss-card p-5 rounded-3xl flex flex-col h-full max-h-[750px]">
            {/* Filter Pills */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                Student Roster ({filteredStudents.length})
              </span>
              <div className="inline-flex items-center p-1 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-[11px]">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'all' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs' : 'text-[var(--text-secondary)]'}`}
                >
                  All ({totalCount})
                </button>
                <button
                  onClick={() => setStatusFilter('present')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'present' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold' : 'text-[var(--text-secondary)]'}`}
                >
                  Present ({presentCount})
                </button>
                <button
                  onClick={() => setStatusFilter('review')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'review' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold' : 'text-[var(--text-secondary)]'}`}
                >
                  Review ({reviewCount})
                </button>
                <button
                  onClick={() => setStatusFilter('absent')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'absent' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold' : 'text-[var(--text-secondary)]'}`}
                >
                  Absent ({absentCount})
                </button>
              </div>
            </div>

            {/* Scrollable Students List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-color)] pr-1 mt-2 space-y-1">
              {filteredStudents.map((stu) => {
                const isSelected = selectedStudentId === stu.student_db_id;
                const isPresent = stu.status === 'PRESENT';
                const isReview = stu.verification_status === 'NEEDS_REVIEW';

                return (
                  <div
                    key={stu.student_db_id}
                    onClick={() => setSelectedStudentId(stu.student_db_id)}
                    className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[var(--bg-inset)] border border-emerald-500/50 shadow-sm'
                        : 'hover:bg-[var(--bg-inset)] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isPresent
                          ? isReview ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border-color)]'
                      }`}>
                        {stu.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[var(--text-primary)] truncate flex items-center gap-2">
                          <span>{stu.name}</span>
                          {stu.student_id === 'UDIT01' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-700 dark:text-cyan-300 border border-blue-500/30 font-mono">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] font-mono flex items-center gap-2">
                          <span>{stu.roll_number}</span>
                          {stu.confidence > 0 && (
                            <span className={`text-[10px] font-semibold ${stu.confidence >= 0.75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              {Math.round(stu.confidence * 100)}% match
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(stu.student_db_id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        isPresent
                          ? isReview
                            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                          : 'bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                      }`}
                    >
                      {isPresent ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isReview ? 'Review' : 'Present'}</span>
                        </>
                      ) : (
                        <span>Absent</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Toast Message ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--bg-surface)] border border-emerald-500/40 shadow-2xl text-xs font-semibold text-emerald-600 dark:text-emerald-300 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
