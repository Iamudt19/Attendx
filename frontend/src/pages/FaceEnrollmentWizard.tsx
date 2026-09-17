import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, CheckCircle2, XCircle, RefreshCw, ScanFace,
  ChevronRight, RotateCcw, PartyPopper, AlertCircle,
  BookOpen, Check, School, GraduationCap
} from 'lucide-react';
import { StudentPortalService } from '../services/api';
import { StudentUser, ScanAngle, SCAN_ANGLES, ANGLE_LABELS, ANGLE_ICONS, FaceFrameUploadResult, StudentPublicClass } from '../types';

interface FaceEnrollmentWizardProps {
  student: StudentUser;
  onComplete: () => void;
  onLogout: () => void;
}

type WizardPhase = 'intro' | 'scanning' | 'complete';
type FrameStatus = 'idle' | 'capturing' | 'uploading' | 'accepted' | 'rejected';

const ANGLE_INSTRUCTIONS: Record<ScanAngle, string> = {
  front: 'Sit upright and look directly at the camera with a neutral expression. Keep your face centered.',
  left:  'Slowly turn your head slightly to the LEFT. Your face should still be mostly visible.',
  right: 'Slowly turn your head slightly to the RIGHT. Your face should still be mostly visible.',
  chin_down: 'Keep looking at the camera but gently tilt your chin slightly DOWNWARD.',
  smile: 'Face the camera straight ahead and give a natural, relaxed SMILE.',
};

// Silhouette directions
const ANGLE_SVG: Record<ScanAngle, React.ReactNode> = {
  front: (
    <svg viewBox="0 0 80 80" className="w-16 h-16 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="40" cy="28" rx="18" ry="22" />
      <path d="M14 72 C14 52 66 52 66 72" />
      <circle cx="32" cy="26" r="3" fill="currentColor" stroke="none" />
      <circle cx="48" cy="26" r="3" fill="currentColor" stroke="none" />
      <path d="M33 36 Q40 41 47 36" strokeLinecap="round" />
    </svg>
  ),
  left: (
    <svg viewBox="0 0 80 80" className="w-16 h-16 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="44" cy="28" rx="16" ry="22" transform="rotate(-15 44 28)" />
      <path d="M18 72 C18 52 68 52 68 72" />
      <circle cx="36" cy="25" r="3" fill="currentColor" stroke="none" />
      <circle cx="51" cy="22" r="3" fill="currentColor" stroke="none" />
      <path d="M37 35 Q43 40 49 34" strokeLinecap="round" />
      <path d="M12 40 L22 40 M12 40 L18 34 M12 40 L18 46" strokeLinecap="round" />
    </svg>
  ),
  right: (
    <svg viewBox="0 0 80 80" className="w-16 h-16 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="36" cy="28" rx="16" ry="22" transform="rotate(15 36 28)" />
      <path d="M12 72 C12 52 62 52 62 72" />
      <circle cx="29" cy="22" r="3" fill="currentColor" stroke="none" />
      <circle cx="44" cy="25" r="3" fill="currentColor" stroke="none" />
      <path d="M31 34 Q37 40 43 35" strokeLinecap="round" />
      <path d="M68 40 L58 40 M68 40 L62 34 M68 40 L62 46" strokeLinecap="round" />
    </svg>
  ),
  chin_down: (
    <svg viewBox="0 0 80 80" className="w-16 h-16 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="40" cy="32" rx="18" ry="22" transform="rotate(10 40 32)" />
      <path d="M14 74 C14 54 66 54 66 74" />
      <circle cx="32" cy="30" r="3" fill="currentColor" stroke="none" />
      <circle cx="48" cy="30" r="3" fill="currentColor" stroke="none" />
      <path d="M33 40 Q40 45 47 40" strokeLinecap="round" />
      <path d="M40 56 L40 66 M34 62 L40 68 L46 62" strokeLinecap="round" />
    </svg>
  ),
  smile: (
    <svg viewBox="0 0 80 80" className="w-16 h-16 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="40" cy="28" rx="18" ry="22" />
      <path d="M14 72 C14 52 66 52 66 72" />
      <circle cx="32" cy="25" r="3" fill="currentColor" stroke="none" />
      <circle cx="48" cy="25" r="3" fill="currentColor" stroke="none" />
      {/* Big smile */}
      <path d="M30 35 Q40 48 50 35" strokeLinecap="round" strokeWidth="2.5" />
    </svg>
  ),
};

export const FaceEnrollmentWizard: React.FC<FaceEnrollmentWizardProps> = ({ student, onComplete, onLogout }) => {
  const [phase, setPhase] = useState<WizardPhase>(student.face_registration_complete ? 'complete' : 'intro');
  const [currentAngleIdx, setCurrentAngleIdx] = useState(0);
  const [completedAngles, setCompletedAngles] = useState<ScanAngle[]>([]);
  const [frameStatus, setFrameStatus] = useState<FrameStatus>('idle');
  const [lastResult, setLastResult] = useState<FaceFrameUploadResult | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  // Class Selection State
  const [classes, setClasses] = useState<StudentPublicClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [assignedClassName, setAssignedClassName] = useState<string>('');
  const [savingClass, setSavingClass] = useState(false);
  const [classMessage, setClassMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentAngle = SCAN_ANGLES[currentAngleIdx] as ScanAngle;

  // Load available classes and student profile
  useEffect(() => {
    StudentPortalService.getPublicClasses()
      .then((data) => {
        setClasses(data);
      })
      .catch(() => {});

    StudentPortalService.getMe()
      .then((profile) => {
        if (profile.class_id) {
          setSelectedClassId(profile.class_id);
        }
        if (profile.class_name) {
          setAssignedClassName(profile.class_name);
        }
        if (profile.completed_angles) {
          setCompletedAngles(profile.completed_angles as ScanAngle[]);
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdateClass = async () => {
    if (!selectedClassId) return;
    setSavingClass(true);
    setClassMessage(null);
    try {
      const updated = await StudentPortalService.updateClass(selectedClassId);
      if (updated.class_name) {
        setAssignedClassName(updated.class_name);
      }
      setClassMessage('Class successfully registered and updated!');
    } catch (err: any) {
      setClassMessage(err.response?.data?.detail || 'Failed to update class.');
    } finally {
      setSavingClass(false);
    }
  };

  // Start webcam
  const startWebcam = useCallback(async () => {
    setWebcamError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setWebcamError('Camera API not available. Please access this page over HTTPS or localhost.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      setIsWebcamActive(true);
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: any) {
      const name = (err as DOMException).name;
      setWebcamError(
        name === 'NotAllowedError' ? 'Camera permission denied. Please allow camera access in your browser.' :
        name === 'NotFoundError' ? 'No camera found. Please connect a camera.' :
        'Could not start camera. Please try again.'
      );
      setIsWebcamActive(false);
    }
  }, []);

  // Stop webcam
  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
  }, []);

  useEffect(() => {
    if (isWebcamActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isWebcamActive]);

  // Stop webcam when component unmounts
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  // Capture current video frame and submit
  const captureAndSubmit = async () => {
    if (!videoRef.current || !canvasRef.current || frameStatus !== 'idle') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setFrameStatus('capturing');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setFrameStatus('uploading');

    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas to blob failed')), 'image/jpeg', 0.92)
      );

      const result = await StudentPortalService.submitFaceFrame(currentAngle, blob);
      setLastResult(result);

      if (result.accepted) {
        setFrameStatus('accepted');
        setCompletedAngles(result.completed_angles);

        if (result.registration_complete) {
          stopWebcam();
          setTimeout(() => {
            setPhase('complete');
            onComplete();
          }, 1200);
        } else {
          // Move to next angle after a moment
          setTimeout(() => {
            const nextIdx = SCAN_ANGLES.findIndex(a => !result.completed_angles.includes(a as ScanAngle));
            if (nextIdx !== -1) setCurrentAngleIdx(nextIdx);
            setFrameStatus('idle');
            setLastResult(null);
          }, 1500);
        }
      } else {
        setFrameStatus('rejected');
        setTimeout(() => {
          setFrameStatus('idle');
          setLastResult(null);
        }, 3000);
      }
    } catch (err: any) {
      setFrameStatus('rejected');
      setLastResult({
        accepted: false,
        angle_label: currentAngle,
        reason: err.response?.data?.detail || 'Upload failed. Please try again.',
        completed_angles: completedAngles,
        remaining_angles: SCAN_ANGLES.filter(a => !completedAngles.includes(a as ScanAngle)) as ScanAngle[],
        total_required: 5,
        registration_complete: false,
      });
      setTimeout(() => { setFrameStatus('idle'); setLastResult(null); }, 3000);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await StudentPortalService.resetFaceScan();
      setCompletedAngles([]);
      setCurrentAngleIdx(0);
      setFrameStatus('idle');
      setLastResult(null);
      setPhase('scanning');
    } catch (e) {
      // ignore
    } finally {
      setResetting(false);
    }
  };

  // ── Render: Intro ───────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-lg w-full space-y-6 relative z-10">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex p-4 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4">
              <ScanFace className="w-10 h-10 text-violet-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Welcome, {student.name}!</h1>
            <p className="text-slate-400 text-sm mt-1">Complete your face scan and select your class.</p>
            {assignedClassName && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-500/15 border border-violet-500/30 rounded-full text-violet-300 text-xs font-semibold mt-3">
                <School className="w-3.5 h-3.5" />
                <span>Assigned: {assignedClassName}</span>
              </div>
            )}
          </div>

          {/* Steps preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">5 Quick Steps</p>
            {SCAN_ANGLES.map((angle, i) => (
              <div key={angle} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {ANGLE_ICONS[angle as ScanAngle]} {ANGLE_LABELS[angle as ScanAngle]}
                  </p>
                  <p className="text-[11px] text-slate-500">{ANGLE_INSTRUCTIONS[angle as ScanAngle]}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onLogout}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition-colors"
            >
              Sign Out
            </button>
            <button
              id="start-scan-btn"
              onClick={() => { setPhase('scanning'); startWebcam(); }}
              className="py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 transition-all"
            >
              Start Face Scan
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Complete ────────────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-600/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full text-center space-y-5 relative z-10">
          <div className="inline-flex p-5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30">
            <PartyPopper className="w-12 h-12 text-emerald-400" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-white">You're All Set, {student.name}!</h2>
            <p className="text-slate-400 text-sm mt-1">
              Your face has been successfully registered from <span className="text-emerald-400 font-semibold">5 angles</span>.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-5 gap-2">
            {SCAN_ANGLES.map((angle) => (
              <div key={angle} className="flex flex-col items-center gap-1">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[10px] text-slate-400 text-center leading-tight">{ANGLE_LABELS[angle as ScanAngle].split(' ').slice(-1)[0]}</span>
              </div>
            ))}
          </div>

          {/* Post-Scan Class Selection & Confirmation Card */}
          <div className="bg-slate-900/90 border border-violet-500/30 rounded-2xl p-5 text-left space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" />
                Class Registration
              </span>
              {assignedClassName && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Enrolled
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300">
              Select or change which class and section you are registering for:
            </p>

            <div className="space-y-2">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl text-xs p-3 focus:ring-1 focus:ring-violet-500 focus:outline-none"
              >
                <option value={0} disabled>Choose a class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.section} ({c.academic_year})
                  </option>
                ))}
              </select>

              <button
                onClick={handleUpdateClass}
                disabled={savingClass || !selectedClassId}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingClass ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Class...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm / Change Class</span>
                  </>
                )}
              </button>
            </div>

            {classMessage && (
              <p className="text-[11px] text-center font-medium text-emerald-400 pt-1">
                {classMessage}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              {resetting ? 'Resetting...' : 'Redo Face Scan'}
            </button>
            <button
              onClick={onLogout}
              className="w-full py-2.5 px-4 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Scanning Wizard ─────────────────────────────────────────────────
  const progressPct = (completedAngles.length / 5) * 100;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,58,237,0.06)_0%,_transparent_60%)] pointer-events-none" />

      <div className="max-w-2xl w-full space-y-5 relative z-10">
        {/* Header with progress */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <ScanFace className="w-5 h-5 text-violet-400" />
              Face Scan — Step {completedAngles.length + 1} of 5
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">{student.name} · {student.student_id}</p>
          </div>
          <button onClick={onLogout} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Sign Out
          </button>
        </div>

        {/* Progress bar */}
        <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Angle progress pills */}
        <div className="flex gap-2 justify-center">
          {SCAN_ANGLES.map((angle, i) => {
            const done = completedAngles.includes(angle as ScanAngle);
            const current = angle === currentAngle && !done;
            return (
              <div
                key={angle}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  done
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : current
                    ? 'bg-violet-600/30 border-violet-500/50 text-violet-300 ring-1 ring-violet-500/30'
                    : 'bg-slate-800/50 border-slate-700 text-slate-500'
                }`}
              >
                {done ? <CheckCircle2 className="w-3 h-3" /> : <span>{i + 1}</span>}
                {ANGLE_LABELS[angle as ScanAngle].split(' ').slice(-1)[0]}
              </div>
            );
          })}
        </div>

        {/* Main scanning area */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">

            {/* Left: Instruction panel */}
            <div className="p-6 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-4xl mb-2">{ANGLE_ICONS[currentAngle]}</div>
                <h2 className="text-base font-bold text-white">{ANGLE_LABELS[currentAngle]}</h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-[220px]">
                  {ANGLE_INSTRUCTIONS[currentAngle]}
                </p>
              </div>

              {/* Silhouette illustration */}
              <div className="p-4 rounded-2xl bg-violet-600/10 border border-violet-500/20">
                {ANGLE_SVG[currentAngle]}
              </div>

              {/* Completed angles */}
              {completedAngles.length > 0 && (
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Completed</p>
                  <div className="flex gap-1.5 flex-wrap justify-center">
                    {completedAngles.map(a => (
                      <span key={a} className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] rounded-full font-semibold">
                        ✓ {ANGLE_LABELS[a].split(' ').slice(-1)[0]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Webcam feed */}
            <div className="flex flex-col">
              {/* Video area */}
              <div className="relative bg-black aspect-video flex items-center justify-center">
                {isWebcamActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay playsInline muted
                      className="w-full h-full object-cover"
                    />
                    {/* Oval face guide overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        className={`w-36 h-48 rounded-full border-2 transition-colors duration-300 ${
                          frameStatus === 'accepted' ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]' :
                          frameStatus === 'rejected' ? 'border-rose-400 shadow-[0_0_20px_rgba(248,113,113,0.4)]' :
                          frameStatus === 'uploading' ? 'border-violet-300 animate-pulse' :
                          'border-violet-400/60'
                        }`}
                      />
                    </div>

                    {/* Status overlay */}
                    {(frameStatus === 'accepted' || frameStatus === 'rejected') && lastResult && (
                      <div className={`absolute inset-0 flex items-center justify-center ${
                        frameStatus === 'accepted' ? 'bg-emerald-900/50' : 'bg-rose-900/50'
                      }`}>
                        <div className="text-center px-4">
                          {frameStatus === 'accepted' ? (
                            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                          ) : (
                            <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-2" />
                          )}
                          <p className={`text-sm font-bold ${frameStatus === 'accepted' ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {lastResult.reason}
                          </p>
                        </div>
                      </div>
                    )}

                    {frameStatus === 'uploading' && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                        <div className="text-center">
                          <RefreshCw className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-violet-300 font-semibold">Checking quality...</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center p-8">
                    {webcamError ? (
                      <>
                        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
                        <p className="text-sm text-rose-400 font-medium mb-3">{webcamError}</p>
                        <button
                          onClick={startWebcam}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg"
                        >
                          Try Again
                        </button>
                      </>
                    ) : (
                      <>
                        <Camera className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm mb-3">Camera not started</p>
                        <button
                          onClick={startWebcam}
                          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg"
                        >
                          Start Camera
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Capture button area */}
              <div className="p-4 bg-slate-900 border-t border-slate-800">
                <button
                  id="capture-frame-btn"
                  onClick={captureAndSubmit}
                  disabled={!isWebcamActive || frameStatus !== 'idle'}
                  className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {frameStatus === 'capturing' || frameStatus === 'uploading' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analysing...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Capture — {ANGLE_LABELS[currentAngle]}</span>
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-slate-500 mt-2">
                  Make sure your face is clearly inside the oval guide before capturing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
