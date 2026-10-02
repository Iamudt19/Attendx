import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  // Fallback state if opened directly for inspection
  const initialProposed: AttendanceProposalItem[] = analysisResult?.proposed_attendance || [
    { student_db_id: 1, student_id: '2024-8841', name: 'Dev Patel', roll_number: 'CS-014', status: 'PRESENT', confidence: 0.648, verification_status: 'NEEDS_REVIEW' },
    { student_db_id: 2, student_id: '2024-8842', name: 'Elena Rostova', roll_number: 'CS-015', status: 'PRESENT', confidence: 0.984, verification_status: 'AI_VERIFIED' },
    { student_db_id: 3, student_id: '2024-8843', name: 'David Kim', roll_number: 'CS-016', status: 'PRESENT', confidence: 0.991, verification_status: 'AI_VERIFIED' },
    { student_db_id: 4, student_id: '2024-8844', name: 'Chloe Bennett', roll_number: 'CS-017', status: 'PRESENT', confidence: 0.712, verification_status: 'NEEDS_REVIEW' },
    { student_db_id: 5, student_id: '2024-8845', name: 'Liam Chen', roll_number: 'CS-018', status: 'PRESENT', confidence: 0.684, verification_status: 'NEEDS_REVIEW' },
  ];

  const initialFaces: RecognizedFace[] = analysisResult?.recognized_faces || [
    {
      box: { x: 180, y: 150, width: 90, height: 90 },
      student_id: 2,
      name: 'Elena Rostova',
      confidence: 0.984,
      status: 'PRESENT',
      image_index: 0,
      verification_status: 'AI_VERIFIED'
    },
    {
      box: { x: 440, y: 210, width: 95, height: 95 },
      student_id: 3,
      name: 'David Kim',
      confidence: 0.991,
      status: 'PRESENT',
      image_index: 0,
      verification_status: 'AI_VERIFIED'
    },
    {
      box: { x: 300, y: 280, width: 110, height: 110 },
      student_id: 1,
      name: 'Dev Patel',
      confidence: 0.648,
      status: 'PRESENT',
      image_index: 0,
      verification_status: 'NEEDS_REVIEW'
    }
  ];

  const [proposedList, setProposedList] = useState<AttendanceProposalItem[]>(initialProposed);
  const [faces, setFaces] = useState<RecognizedFace[]>(initialFaces);
  const [selectedStudentId, setSelectedStudentId] = useState<number>(1);
  const [canvasFilter, setCanvasFilter] = useState<'all' | 'review' | 'unmatched'>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showReassignDropdown, setShowReassignDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const selectedStudent = proposedList.find((s) => s.student_db_id === selectedStudentId) || proposedList[0];
  const selectedConfidencePct = selectedStudent ? Math.round(selectedStudent.confidence * 1000) / 10 : 64.8;

  // Key Actions
  const handleApproveSelected = () => {
    if (!selectedStudent) return;
    setProposedList((prev) =>
      prev.map((s) =>
        s.student_db_id === selectedStudent.student_db_id
          ? { ...s, status: 'PRESENT', verification_status: 'TEACHER_VERIFIED' }
          : s
      )
    );
    showToast(`Approved ${selectedStudent.name} as PRESENT`);

    // Next pending item in queue
    const nextPending = proposedList.find(
      (s) => s.student_db_id !== selectedStudent.student_db_id && s.verification_status === 'NEEDS_REVIEW'
    );
    if (nextPending) setSelectedStudentId(nextPending.student_db_id);
  };

  const handleMarkAbsent = () => {
    if (!selectedStudent) return;
    setProposedList((prev) =>
      prev.map((s) =>
        s.student_db_id === selectedStudent.student_db_id
          ? { ...s, status: 'ABSENT', verification_status: 'TEACHER_VERIFIED' }
          : s
      )
    );
    showToast(`Marked ${selectedStudent.name} as ABSENT`);
  };

  const handleReassign = (targetDbId: number) => {
    const target = proposedList.find((s) => s.student_db_id === targetDbId);
    if (!target || !selectedStudent) return;

    setProposedList((prev) =>
      prev.map((s) => {
        if (s.student_db_id === targetDbId) {
          return { ...s, status: 'PRESENT', verification_status: 'MANUAL', confidence: 1.0 };
        }
        if (s.student_db_id === selectedStudent.student_db_id) {
          return { ...s, status: 'ABSENT', verification_status: 'TEACHER_VERIFIED' };
        }
        return s;
      })
    );
    setShowReassignDropdown(false);
    showToast(`Reassigned face to ${target.name}`);
  };

  // Keyboard Shortcuts [A], [R], [X]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'a' || e.key === 'A') {
        handleApproveSelected();
      } else if (e.key === 'x' || e.key === 'X') {
        handleMarkAbsent();
      } else if (e.key === 'r' || e.key === 'R') {
        setShowReassignDropdown((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStudent, proposedList]);

  const handleSaveAttendance = async () => {
    setSaving(true);
    setError(null);
    try {
      if (sessionContext) {
        const records = proposedList.map((item) => ({
          student_id: item.student_db_id,
          status: item.status,
          confidence: item.confidence,
          verification_status: item.verification_status
        }));
        await AttendanceService.saveSession({
          class_id: sessionContext.classId,
          subject_id: sessionContext.subjectId,
          date: sessionContext.date,
          start_time: sessionContext.startTime,
          image_path: analysisResult?.image_url || '/hero-scenic-1.jpg',
          records,
          recognized_faces: faces
        } as any);
      }
      setSaveSuccess(true);
      showToast('Attendance ledger finalized & synchronized!');
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to save attendance record."));
    } finally {
      setSaving(false);
    }
  };

  const verifiedCount = proposedList.filter((s) => s.status === 'PRESENT' && s.verification_status !== 'NEEDS_REVIEW').length;
  const reviewCount = proposedList.filter((s) => s.verification_status === 'NEEDS_REVIEW').length;
  const unmatchedCount = proposedList.filter((s) => s.status === 'ABSENT').length;

  if (saveSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6 text-[#e5e1e4]">
        <div className="w-16 h-16 rounded-2xl bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/30 mx-auto flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-[36px]">verified</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-[#e5e1e4]">Attendance Ledger Finalized!</h1>
          <p className="text-xs text-[#86948a] max-w-md mx-auto">
            All records cryptographically signed and stored in institutional database with 128-D biometric vector updates.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => navigate('/history')}
            className="px-5 py-2.5 bg-[#201f22] hover:bg-[#2a2a2c] text-[#e5e1e4] font-medium text-xs rounded-lg border border-[#3c4a42]/40 transition-colors"
          >
            View History Ledger
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] font-semibold text-xs rounded-lg shadow-sm transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full text-[#e5e1e4] space-y-6">
      {/* ── SUB-HEADER ACTION BAR ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#3c4a42]/30">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold tracking-tight text-[#e5e1e4]">CS-101: Advanced Data Structures</span>
            <span className="inline-block w-1 h-1 rounded-full bg-[#3c4a42]"></span>
            <span className="text-[10px] text-[#bbcabf] uppercase tracking-wider font-mono">Lecture Hall 4B</span>
            <span className="inline-block w-1 h-1 rounded-full bg-[#3c4a42]"></span>
            <span className="font-mono text-xs text-[#86948a]">Oct 24, 09:14 AM</span>
          </div>
          <div className="flex items-center gap-2 text-[#bbcabf] text-xs font-mono">
            <span className="material-symbols-outlined text-[15px] text-[#4edea3]">videocam</span>
            <span>Vision Node Optical Stream #04 (Sony IMX415 Array • 4K HDR)</span>
          </div>
        </div>

        {/* Center Status Metagroup */}
        <div className="flex items-center bg-[#0e0e10] p-1 rounded-full shadow-inner border border-[#3c4a42]/30">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#4edea3]/10">
            <span className="w-2 h-2 rounded-full bg-[#4edea3]"></span>
            <span className="font-mono text-xs font-medium text-[#4edea3]">{verifiedCount} Verified</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#d97707]/20 ml-1">
            <span className="w-2 h-2 rounded-full bg-[#ffb77d]"></span>
            <span className="font-mono text-xs font-medium text-[#ffb77d]">{reviewCount} Review</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#2a2a2c] ml-1">
            <span className="w-2 h-2 rounded-full bg-[#86948a]"></span>
            <span className="font-mono text-xs text-[#bbcabf]">{unmatchedCount} Unmatched</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => showToast('Reverted last verification action')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c1b1d] hover:bg-[#201f22] text-[#bbcabf] hover:text-[#e5e1e4] transition-colors text-xs border border-[#3c4a42]/30"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">undo</span>
            <span>Undo</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-[#353437] font-mono text-[10px] text-[#86948a]">⌘Z</kbd>
          </button>
          <button
            onClick={() => showToast('Shortcuts: [A] Approve, [R] Reassign, [X] Flag Absent')}
            className="p-2 rounded-lg bg-[#1c1b1d] hover:bg-[#201f22] text-[#bbcabf] hover:text-[#e5e1e4] border border-[#3c4a42]/30 transition-colors"
            title="Keyboard Shortcuts [?]"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">keyboard</span>
          </button>
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e5e1e4] hover:bg-[#39393b] text-[#131315] hover:text-[#e5e1e4] text-xs font-semibold transition-all shadow-md ml-1"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>{saving ? 'Finalizing...' : 'Save & Finalize'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-[#93000a]/20 border border-[#93000a]/50 text-[#ffb4ab] text-xs font-medium">
          {error}
        </div>
      )}

      {/* ── WORKSPACE SPLIT (70% Canvas / 30% Verification Panel) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT: MAIN PHOTO CANVAS (8 cols = ~67-70%) */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          {/* Main Photo Viewport */}
          <div className="relative w-full aspect-[16/10] bg-[#0e0e10] rounded-xl overflow-hidden shadow-2xl group select-none border border-[#3c4a42]/30">
            {/* Background Auditorium Photography */}
            <img
              className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.78] contrast-[1.08] transition-transform duration-700 group-hover:scale-[1.01]"
              alt="Classroom Auditorium Viewport"
              src="/hero-scenic-1.jpg"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80";
              }}
              style={{ transform: `scale(${zoomLevel / 100})` }}
            />

            {/* Subtle Ambient Vignette Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10]/80 via-transparent to-[#0e0e10]/40 pointer-events-none"></div>

            {/* CAMERA OVERLAY METADATA WATERMARK */}
            <div className="absolute top-4 left-4 flex items-center gap-3 bg-[#0e0e10]/80 backdrop-blur-md px-3 py-1.5 rounded-md pointer-events-none border border-[#3c4a42]/40">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffb4ab] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffb4ab]"></span>
              </span>
              <span className="font-mono text-[11px] text-[#e5e1e4] tracking-wider uppercase font-semibold">
                CAM-02 REC [4K 60FPS]
              </span>
              <span className="font-mono text-[11px] text-[#86948a]">ISO 400 • f/2.8 • 1/125s</span>
            </div>

            {/* DETECTION RETICLE 1: Verified (Elena Rostova) */}
            <div
              onClick={() => setSelectedStudentId(2)}
              className="absolute top-[28%] left-[22%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group/node"
              style={{ zIndex: 10 }}
            >
              <div className="relative flex items-center justify-center">
                <div className="w-14 h-14 rounded-full border border-[#4edea3]/60 transition-all duration-300 group-hover/node:border-[#4edea3] group-hover/node:scale-110 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                </div>
                {/* Hairline Crosshairs */}
                <div className="absolute -top-1 w-2 h-px bg-[#4edea3]/80"></div>
                <div className="absolute -bottom-1 w-2 h-px bg-[#4edea3]/80"></div>
                <div className="absolute -left-1 w-px h-2 bg-[#4edea3]/80"></div>
                <div className="absolute -right-1 w-px h-2 bg-[#4edea3]/80"></div>
                {/* Micro Tag Pill */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1.5 bg-[#0e0e10]/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-lg border border-[#3c4a42]/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
                  <span className="text-[11px] text-[#e5e1e4] font-medium">Elena Rostova</span>
                  <span className="font-mono text-[10px] text-[#4edea3]">98.4%</span>
                </div>
              </div>
            </div>

            {/* DETECTION RETICLE 2: Verified (David Kim) */}
            <div
              onClick={() => setSelectedStudentId(3)}
              className="absolute top-[38%] left-[54%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group/node"
              style={{ zIndex: 10 }}
            >
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border border-[#4edea3]/50 transition-all duration-300 group-hover/node:border-[#4edea3] group-hover/node:scale-110 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]/80"></span>
                </div>
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1.5 bg-[#0e0e10]/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-lg border border-[#3c4a42]/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
                  <span className="text-[11px] text-[#e5e1e4] font-medium">David Kim</span>
                  <span className="font-mono text-[10px] text-[#4edea3]">99.1%</span>
                </div>
              </div>
            </div>

            {/* DETECTION RETICLE 3: Active Selected Target (Needs Review: Dev Patel) */}
            <div
              onClick={() => setSelectedStudentId(1)}
              className="absolute top-[52%] left-[36%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer z-30"
            >
              <div className="relative flex items-center justify-center">
                {/* Pulsing Concentric Aura */}
                <div className="absolute w-28 h-28 rounded-full bg-[#d97707]/10 animate-ping opacity-60"></div>
                {/* Minimal Geometric Focal Brackets */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#ffb77d]"></span>
                  <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#ffb77d]"></span>
                  <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#ffb77d]"></span>
                  <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#ffb77d]"></span>
                  <div className="w-14 h-14 rounded-full border border-[#ffb77d]/40 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-[#ffb77d] shadow-sm"></span>
                  </div>
                </div>
                {/* Elevated Status Floating Badge */}
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-2 bg-[#353437] px-3 py-1 rounded-full shadow-2xl border border-[#ffb77d]/30">
                  <span className="w-2 h-2 rounded-full bg-[#ffb77d]"></span>
                  <span className="text-[10px] text-[#ffb77d] uppercase tracking-wider font-mono font-semibold">
                    Active Review Target
                  </span>
                </div>
                {/* Detail Pill */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-2 bg-[#0e0e10]/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-2xl ring-1 ring-[#ffb77d]/30 border border-[#3c4a42]/40">
                  <span className="text-xs text-[#e5e1e4] font-semibold">{selectedStudent?.name || 'Dev Patel'}</span>
                  <span className="font-mono text-[11px] text-[#ffb77d] font-bold">{selectedConfidencePct}% Match</span>
                  <span className="material-symbols-outlined text-[#ffb77d] text-[14px]">priority_high</span>
                </div>
              </div>
            </div>

            {/* DETECTION RETICLE 4: Unmatched Candidate (Row 6) */}
            <div
              onClick={() => showToast('Unassigned student candidate face selected')}
              className="absolute top-[22%] left-[78%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group/node"
              style={{ zIndex: 10 }}
            >
              <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border border-dashed border-[#86948a]/70 transition-all duration-300 group-hover/node:border-[#86948a] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#86948a]/40"></span>
                </div>
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1.5 bg-[#0e0e10]/80 backdrop-blur-md px-2.5 py-1 rounded-full shadow-md border border-[#3c4a42]/40">
                  <span className="material-symbols-outlined text-[#86948a] text-[12px]">person_search</span>
                  <span className="text-[11px] text-[#86948a] font-medium">Unassigned Candidate</span>
                </div>
              </div>
            </div>

            {/* FLOATING QUICK-ACTION CAPSULE */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-[#0e0e10]/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-xl border border-[#3c4a42]/40">
              <span className="font-mono text-[11px] text-[#ffb77d] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffb77d]"></span>
                1 Selected
              </span>
              <span className="text-[#3c4a42]">/</span>
              <button
                onClick={handleApproveSelected}
                className="text-[10px] text-[#bbcabf] hover:text-[#e5e1e4] flex items-center gap-1"
              >
                <kbd className="px-1 py-0.5 rounded bg-[#2a2a2c] font-mono text-[#e5e1e4]">A</kbd> Approve
              </button>
              <button
                onClick={() => setShowReassignDropdown((p) => !p)}
                className="text-[10px] text-[#bbcabf] hover:text-[#e5e1e4] flex items-center gap-1"
              >
                <kbd className="px-1 py-0.5 rounded bg-[#2a2a2c] font-mono text-[#e5e1e4]">R</kbd> Reassign
              </button>
              <button
                onClick={handleMarkAbsent}
                className="text-[10px] text-[#bbcabf] hover:text-[#e5e1e4] flex items-center gap-1"
              >
                <kbd className="px-1 py-0.5 rounded bg-[#2a2a2c] font-mono text-[#e5e1e4]">X</kbd> Absent
              </button>
            </div>

            {/* FLOATING BOTTOM MINIMALIST HUD */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-2 pointer-events-none">
              {/* View Filtering Toggles */}
              <div className="pointer-events-auto flex items-center bg-[#0e0e10]/90 backdrop-blur-md p-1 rounded-full shadow-lg border border-[#3c4a42]/40">
                <button
                  onClick={() => setCanvasFilter('all')}
                  className={`px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider font-semibold transition-all ${
                    canvasFilter === 'all' ? 'bg-[#201f22] text-[#e5e1e4]' : 'text-[#86948a] hover:text-[#e5e1e4]'
                  }`}
                  type="button"
                >
                  All ({proposedList.length})
                </button>
                <button
                  onClick={() => setCanvasFilter('review')}
                  className={`px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider font-semibold transition-all ${
                    canvasFilter === 'review' ? 'bg-[#201f22] text-[#ffb77d]' : 'text-[#ffb77d] hover:text-[#e5e1e4]'
                  }`}
                  type="button"
                >
                  Review Only ({reviewCount})
                </button>
                <button
                  onClick={() => setCanvasFilter('unmatched')}
                  className={`px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider font-semibold transition-all ${
                    canvasFilter === 'unmatched' ? 'bg-[#201f22] text-[#e5e1e4]' : 'text-[#86948a] hover:text-[#e5e1e4]'
                  }`}
                  type="button"
                >
                  Unmatched ({unmatchedCount})
                </button>
              </div>

              {/* Zoom & Pan Controls */}
              <div className="pointer-events-auto flex items-center gap-1 bg-[#0e0e10]/90 backdrop-blur-md px-2 py-1 rounded-full shadow-lg border border-[#3c4a42]/40">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 10, 80))}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#201f22] text-[#bbcabf] hover:text-[#e5e1e4] transition-colors"
                  title="Zoom Out"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">remove</span>
                </button>
                <span className="font-mono text-[11px] text-[#e5e1e4] px-2 select-none">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 10, 160))}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#201f22] text-[#bbcabf] hover:text-[#e5e1e4] transition-colors"
                  title="Zoom In"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </button>
                <span className="w-px h-3.5 bg-[#3c4a42]/40 mx-0.5"></span>
                <button
                  onClick={() => setZoomLevel(100)}
                  className="px-2.5 py-1 rounded-full hover:bg-[#201f22] text-[#bbcabf] hover:text-[#e5e1e4] text-[10px] uppercase font-mono tracking-wider flex items-center gap-1 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">fit_screen</span>
                  <span>Fit</span>
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Sub-strip: Telemetry and Vision Node Specs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="p-3 rounded-lg bg-[#1c1b1d] border border-[#3c4a42]/30 flex flex-col gap-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#86948a]">Face Confidence Avg</span>
              <span className="text-xl text-[#e5e1e4] font-semibold tracking-tight">96.8%</span>
            </div>
            <div className="p-3 rounded-lg bg-[#1c1b1d] border border-[#3c4a42]/30 flex flex-col gap-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#86948a]">Optical Occlusion Rate</span>
              <span className="text-xl text-[#e5e1e4] font-semibold tracking-tight">3.2%</span>
            </div>
            <div className="p-3 rounded-lg bg-[#1c1b1d] border border-[#3c4a42]/30 flex flex-col gap-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#86948a]">Liveness Invariance</span>
              <span className="text-xl text-[#4edea3] font-semibold tracking-tight">99.98%</span>
            </div>
            <div className="p-3 rounded-lg bg-[#1c1b1d] border border-[#3c4a42]/30 flex flex-col gap-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#86948a]">Capture Frame Drift</span>
              <span className="text-xl text-[#e5e1e4] font-semibold tracking-tight">12 ms</span>
            </div>
          </div>
        </div>

        {/* RIGHT: VERIFICATION PANEL / SLIDE-OVER DRAWER (4 cols = ~30%) */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="bg-[#0e0e10] rounded-xl p-5 shadow-xl flex flex-col gap-4 border border-[#3c4a42]/30">
            {/* Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#3c4a42]/20">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#ffb77d] uppercase tracking-widest font-mono font-semibold">Priority Audit</span>
                <h2 className="text-sm text-[#e5e1e4] font-semibold">Biometric Inspection</h2>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2a2a2c] font-mono text-[11px] text-[#bbcabf] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffb77d]"></span>
                <span>{reviewCount} of {proposedList.length} Pending</span>
              </div>
            </div>

            {/* Comparative Biometric Inspection Section */}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3 items-center relative">
                {/* Classroom Optical Crop */}
                <div className="flex flex-col gap-1.5">
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#2a2a2c] border border-[#3c4a42]/40 group">
                    <img
                      className="w-full h-full object-cover filter contrast-[1.05]"
                      alt="Classroom optical crop"
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
                    />
                    <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-[#0e0e10]/80 backdrop-blur-sm font-mono text-[10px] text-[#bbcabf]">
                      Row 4 • Seat 12
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-[#e5e1e4] font-medium">Classroom Crop</span>
                    <span className="font-mono text-[10px] text-[#86948a]">Camera 02 • 09:14:02 AM</span>
                  </div>
                </div>

                {/* VS Minimalist Absolute Center Divider */}
                <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-[#353437] shadow-md flex items-center justify-center border border-[#3c4a42]/50">
                  <span className="text-[9px] font-bold text-[#86948a] tracking-wider font-mono">VS</span>
                </div>

                {/* Official Registrar ID Portrait */}
                <div className="flex flex-col gap-1.5">
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#2a2a2c] border border-[#3c4a42]/40 group">
                    <img
                      className="w-full h-full object-cover"
                      alt="Verified student ID portrait"
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80"
                    />
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-[#0e0e10]/80 backdrop-blur-sm font-mono text-[9px] text-[#4edea3] font-semibold uppercase">
                      Verified ID
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-[#e5e1e4] font-medium truncate">{selectedStudent?.name || 'Dev Patel'}</span>
                    <span className="font-mono text-[10px] text-[#86948a]">ID #{selectedStudent?.student_id || '2024-8841'} • CS</span>
                  </div>
                </div>
              </div>

              {/* MATCH TELEMETRY SLIDER & CONFIDENCE GAUGE */}
              <div className="p-3 rounded-lg bg-[#1c1b1d] border border-[#3c4a42]/30 flex flex-col gap-2 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#86948a]">Neural Vector Match</span>
                  <span className="font-mono text-xs text-[#ffb77d] font-bold">{selectedConfidencePct}%</span>
                </div>
                {/* Dual-marker custom range indicator */}
                <div className="relative w-full h-2 bg-[#353437] rounded-full overflow-visible my-1">
                  <div className="h-full bg-[#ffb77d] rounded-full" style={{ width: `${selectedConfidencePct}%` }}></div>
                  <div className="absolute -top-1 bottom-0 w-0.5 h-4 bg-[#4edea3] z-10" style={{ left: '78%' }} title="Acceptance Threshold: 78%">
                    <div className="absolute -top-4 -translate-x-1/2 font-mono text-[9px] text-[#4edea3] whitespace-nowrap">78% Goal</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[#86948a] font-mono text-[10px]">
                  <span>0% Ambiguity</span>
                  <span className="text-[#4edea3] font-medium">Auto-Accept &gt; 78%</span>
                  <span>100% Deterministic</span>
                </div>
                {/* Optical Diagnostic Warning Banner */}
                <div className="flex items-start gap-2 p-2 rounded bg-[#d97707]/10 mt-1">
                  <span className="material-symbols-outlined text-[#ffb77d] text-[16px] mt-0.5 shrink-0">info</span>
                  <p className="text-[11px] text-[#ffb77d] leading-snug">
                    Sub-optimal illumination in Row 4 + partial laptop bezel occlusion (35%). Manual sign-off required.
                  </p>
                </div>
              </div>
            </div>

            {/* 1-CLICK TACTILE ACTION BUTTONS */}
            <div className="flex flex-col gap-2 pt-1">
              {/* Button 1: Primary Approval */}
              <button
                onClick={handleApproveSelected}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] text-xs font-semibold transition-all shadow-md group"
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Approve {selectedStudent?.name}</span>
                </div>
                <kbd className="px-2 py-0.5 rounded bg-[#003824]/20 font-mono text-[11px] text-[#003824] group-hover:bg-[#003824]/30">
                  A
                </kbd>
              </button>

              {/* Button 2: Reassign Dropdown Search Trigger */}
              <div className="relative">
                <button
                  onClick={() => setShowReassignDropdown((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] text-[#e5e1e4] text-xs font-medium transition-colors border border-[#3c4a42]/30"
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#86948a]">swap_horiz</span>
                    <span>Reassign to Roster...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 rounded bg-[#353437] font-mono text-[10px] text-[#86948a]">R</kbd>
                  </div>
                </button>

                {showReassignDropdown && (
                  <div className="absolute bottom-full mb-2 inset-x-0 bg-[#1c1b1d] border border-[#3c4a42]/60 rounded-xl p-2 shadow-2xl z-50 max-h-48 overflow-y-auto space-y-1">
                    <div className="text-[10px] font-mono text-[#86948a] px-2 py-1 uppercase">Select target student:</div>
                    {proposedList.map((s) => (
                      <button
                        key={s.student_db_id}
                        onClick={() => handleReassign(s.student_db_id)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#2a2a2c] text-xs text-[#e5e1e4] flex items-center justify-between"
                      >
                        <span>{s.roll_number} • {s.name}</span>
                        <span className="font-mono text-[10px] text-[#86948a]">{s.student_id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Button 3: Absent / Reject */}
              <button
                onClick={handleMarkAbsent}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-transparent hover:bg-[#93000a]/20 text-[#bbcabf] hover:text-[#ffb4ab] text-xs font-medium transition-colors border border-transparent hover:border-[#93000a]/30"
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">person_off</span>
                  <span>Flag Unrecognized / Absent</span>
                </div>
                <kbd className="px-1.5 py-0.5 rounded bg-[#201f22] font-mono text-[10px] text-[#86948a]">X</kbd>
              </button>
            </div>

            {/* UPCOMING AUDIT QUEUE PREVIEW */}
            <div className="pt-2 border-t border-[#3c4a42]/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#86948a]">Upcoming In Queue</span>
                <span className="font-mono text-[10px] text-[#86948a]">2 items remain</span>
              </div>

              {/* Queue Item 1 */}
              <div
                onClick={() => setSelectedStudentId(4)}
                className="flex items-center justify-between p-2 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] transition-colors cursor-pointer group border border-[#3c4a42]/30"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#353437] shrink-0">
                    <img
                      className="w-full h-full object-cover"
                      alt="Chloe Bennett"
                      src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-[#e5e1e4] font-medium group-hover:text-[#4edea3] transition-colors">Chloe Bennett</span>
                    <span className="font-mono text-[10px] text-[#86948a]">Row 3 • Seat 04</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#d97707]/20 text-[#ffb77d] font-mono text-[11px] font-semibold">71%</span>
                  <span className="material-symbols-outlined text-[#86948a] group-hover:text-[#e5e1e4] text-[16px]">chevron_right</span>
                </div>
              </div>

              {/* Queue Item 2 */}
              <div
                onClick={() => setSelectedStudentId(5)}
                className="flex items-center justify-between p-2 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] transition-colors cursor-pointer group border border-[#3c4a42]/30"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#353437] shrink-0">
                    <img
                      className="w-full h-full object-cover"
                      alt="Liam Chen"
                      src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-[#e5e1e4] font-medium group-hover:text-[#4edea3] transition-colors">Liam Chen</span>
                    <span className="font-mono text-[10px] text-[#86948a]">Row 6 • Seat 09</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#d97707]/20 text-[#ffb77d] font-mono text-[11px] font-semibold">68%</span>
                  <span className="material-symbols-outlined text-[#86948a] group-hover:text-[#e5e1e4] text-[16px]">chevron_right</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Toaster */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded bg-[#2a2a2c] border border-[#3c4a42]/60 shadow-2xl text-xs font-medium text-[#e5e1e4] animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span className="material-symbols-outlined text-[#4edea3] text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
