import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, CheckCircle2, XCircle, RefreshCw, ScanFace,
  ChevronRight, RotateCcw, PartyPopper, AlertCircle,
  Check, School, GraduationCap, Zap, Sparkles, ShieldCheck,
  Layers, Sliders, History, ArrowRight, Video, VideoOff
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

// Continuous training preset poses
const TRAINING_PRESETS = [
  { id: 'front', label: 'Direct Look', icon: '😐', desc: 'Standard direct angle' },
  { id: 'left', label: 'Left Turn', icon: '⬅️', desc: 'Tilted left angle' },
  { id: 'right', label: 'Right Turn', icon: '➡️', desc: 'Tilted right angle' },
  { id: 'chin_down', label: 'Chin Down', icon: '⬇️', desc: 'Downward eye level' },
  { id: 'smile', label: 'Expression', icon: '😊', desc: 'Natural happy smile' },
  { id: 'glasses', label: 'Glasses/Shades', icon: '👓', desc: 'With or without eyewear' },
  { id: 'lighting', label: 'Lighting Var', icon: '💡', desc: 'Warm/dim/ambient light' },
  { id: 'distance', label: 'Distance Var', icon: '🔍', desc: 'Slightly closer/farther' },
];

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

  // Training & Telemetry state
  const [totalEmbeddings, setTotalEmbeddings] = useState<number>(0);
  const [trainingLevel, setTrainingLevel] = useState<string>('Calibrating');
  const [readinessScore, setReadinessScore] = useState<number>(80.0);
  const [selectedTrainingPreset, setSelectedTrainingPreset] = useState<string>('front');
  const [trainingSuccessFlash, setTrainingSuccessFlash] = useState<string | null>(null);

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

  const loadStudentProfile = useCallback(() => {
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
        if (profile.total_embeddings !== undefined) {
          setTotalEmbeddings(profile.total_embeddings);
        }
        if (profile.training_level) {
          setTrainingLevel(profile.training_level);
        }
        if (profile.recognition_readiness_score !== undefined) {
          setReadinessScore(profile.recognition_readiness_score);
        }
      })
      .catch(() => {});
  }, []);

  // Load available classes and student profile
  useEffect(() => {
    StudentPortalService.getPublicClasses()
      .then((data) => {
        setClasses(data);
      })
      .catch(() => {});

    loadStudentProfile();
  }, [loadStudentProfile]);

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
  const captureAndSubmit = async (customAngleLabel?: string) => {
    if (!videoRef.current || !canvasRef.current || frameStatus !== 'idle') return;

    const angleToSubmit = customAngleLabel || (phase === 'complete' ? selectedTrainingPreset : currentAngle);

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

      const result = await StudentPortalService.submitFaceFrame(angleToSubmit, blob);
      setLastResult(result);

      if (result.accepted) {
        setFrameStatus('accepted');
        setCompletedAngles(result.completed_angles);
        if (result.total_embeddings !== undefined) setTotalEmbeddings(result.total_embeddings);
        if (result.training_level) setTrainingLevel(result.training_level);
        if (result.recognition_readiness_score !== undefined) setReadinessScore(result.recognition_readiness_score);

        setTrainingSuccessFlash(`+1 Face Vector Added (Total: ${result.total_embeddings || totalEmbeddings + 1})`);
        setTimeout(() => setTrainingSuccessFlash(null), 4000);

        if (phase === 'scanning') {
          if (result.registration_complete) {
            setTimeout(() => {
              setPhase('complete');
              onComplete();
              setFrameStatus('idle');
              setLastResult(null);
            }, 1200);
          } else {
            // Move to next angle
            setTimeout(() => {
              const nextIdx = SCAN_ANGLES.findIndex(a => !result.completed_angles.includes(a as ScanAngle));
              if (nextIdx !== -1) setCurrentAngleIdx(nextIdx);
              setFrameStatus('idle');
              setLastResult(null);
            }, 1500);
          }
        } else {
          // Continuous training mode: reset status quickly so student can scan again immediately!
          setTimeout(() => {
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
        angle_label: angleToSubmit,
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
      setTotalEmbeddings(0);
      setTrainingLevel('Not Trained');
      setReadinessScore(0);
      setCurrentAngleIdx(0);
      setFrameStatus('idle');
      setLastResult(null);
      setPhase('scanning');
      startWebcam();
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
            <div className="inline-flex p-4 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-4 shadow-lg shadow-violet-500/10">
              <ScanFace className="w-10 h-10 text-violet-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Welcome, {student.name}!</h1>
            <p className="text-slate-400 text-sm mt-1">Enroll your face scan and train the AI model for high accuracy.</p>
            {assignedClassName && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-500/15 border border-violet-500/30 rounded-full text-violet-300 text-xs font-semibold mt-3">
                <School className="w-3.5 h-3.5" />
                <span>Assigned: {assignedClassName}</span>
              </div>
            )}
          </div>

          {/* Steps preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">5 Guided Baseline Steps</p>
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

  // ── Render: Complete & Continuous AI Face Training Studio ───────────────────
  if (phase === 'complete') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 py-8 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl w-full space-y-6 relative z-10">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <ScanFace className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  {student.name}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                    Face Registered
                  </span>
                </h1>
                <p className="text-xs text-slate-400">Student ID: {student.student_id} {assignedClassName ? `• ${assignedClassName}` : ''}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onLogout}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* AI Training Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Trained Vectors</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white">{totalEmbeddings}</span>
                  <span className="text-xs text-violet-400 font-medium">Embeddings</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Precision Tier</p>
                <p className="text-sm font-bold text-emerald-400 truncate">{trainingLevel}</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Readiness Score</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-blue-400">{readinessScore}%</span>
                  <span className="text-[10px] text-slate-400">Match Confidence</span>
                </div>
              </div>
            </div>
          </div>

          {/* Continuous AI Face Training Studio Main Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-violet-600/20 text-violet-300 border border-violet-500/30 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3 text-violet-400" />
                    Continuous Training Studio
                  </span>
                  <span className="text-xs text-slate-400">Scan unlimited times to boost accuracy</span>
                </div>
                <h2 className="text-lg font-extrabold text-white mt-1">
                  Train AI Face Recognizer with More Scans
                </h2>
                <p className="text-xs text-slate-400">
                  Every extra scan under different lighting, head angles, glasses, and distances adds new 128-d reference vectors directly into the live classroom attendance matcher.
                </p>
              </div>

              {!isWebcamActive ? (
                <button
                  onClick={startWebcam}
                  className="py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/20 flex items-center gap-2 transition-all shrink-0"
                >
                  <Video className="w-4 h-4" />
                  Activate Training Camera
                </button>
              ) : (
                <button
                  onClick={stopWebcam}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shrink-0"
                >
                  <VideoOff className="w-3.5 h-3.5" />
                  Turn Off Camera
                </button>
              )}
            </div>

            {/* Studio Workspace: Camera + Training Presets */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Camera Preview Area (7 Cols) */}
              <div className="lg:col-span-7 bg-black relative flex flex-col items-center justify-center min-h-[320px]">
                {isWebcamActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay playsInline muted
                      className="w-full h-full object-cover max-h-[420px]"
                    />

                    {/* AI Target Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        className={`w-44 h-56 rounded-full border-2 transition-all duration-300 ${
                          frameStatus === 'accepted' ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.5)] scale-105' :
                          frameStatus === 'rejected' ? 'border-rose-400 shadow-[0_0_30px_rgba(248,113,113,0.5)]' :
                          frameStatus === 'uploading' ? 'border-violet-300 animate-pulse' :
                          'border-violet-400/70 border-dashed shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                        }`}
                      >
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-violet-500/40 text-[10px] text-violet-300 px-2 py-0.5 rounded-full font-mono font-bold tracking-wider">
                          AI SCANNER
                        </div>
                      </div>
                    </div>

                    {/* Result Overlay */}
                    {(frameStatus === 'accepted' || frameStatus === 'rejected') && lastResult && (
                      <div className={`absolute inset-0 flex items-center justify-center backdrop-blur-sm ${
                        frameStatus === 'accepted' ? 'bg-emerald-950/70' : 'bg-rose-950/70'
                      }`}>
                        <div className="text-center px-6 py-4 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-2xl">
                          {frameStatus === 'accepted' ? (
                            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2 animate-bounce" />
                          ) : (
                            <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-2" />
                          )}
                          <p className={`text-sm font-bold ${frameStatus === 'accepted' ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {lastResult.reason}
                          </p>
                          {frameStatus === 'accepted' && (
                            <p className="text-xs text-slate-400 mt-1">Ready for next scan!</p>
                          )}
                        </div>
                      </div>
                    )}

                    {frameStatus === 'uploading' && (
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center">
                          <RefreshCw className="w-10 h-10 text-violet-400 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-violet-300 font-bold">Encoding 128-D Face Vector...</p>
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
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg font-semibold"
                        >
                          Try Again
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto mb-3">
                          <Camera className="w-8 h-8" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Camera Standby</h3>
                        <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto mb-4">
                          Click below to start your webcam and capture extra training scans.
                        </p>
                        <button
                          onClick={startWebcam}
                          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-violet-600/25 transition-all"
                        >
                          Start Training Camera
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Training Controls Area (5 Cols) */}
              <div className="lg:col-span-5 p-5 bg-slate-900 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-800">
                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                      <Sliders className="w-3.5 h-3.5 text-violet-400" />
                      Select Training Condition / Pose
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {TRAINING_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedTrainingPreset(preset.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            selectedTrainingPreset === preset.id
                              ? 'bg-violet-600/20 border-violet-500 text-white ring-1 ring-violet-500/50 shadow-md shadow-violet-500/10'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{preset.icon}</span>
                            <div>
                              <p className="text-xs font-bold leading-tight">{preset.label}</p>
                              <p className="text-[10px] text-slate-500 truncate">{preset.desc}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {trainingSuccessFlash && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-pulse">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{trainingSuccessFlash}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <button
                    id="capture-training-btn"
                    onClick={() => captureAndSubmit()}
                    disabled={!isWebcamActive || frameStatus !== 'idle'}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {frameStatus === 'capturing' || frameStatus === 'uploading' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Training AI Model...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>📸 Capture & Train Face Model</span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-[10px] text-slate-500">
                    Feel free to scan 5, 10, 20+ times with different poses & lighting for best classroom accuracy.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Post-Scan Class Selection & Confirmation Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" />
                Class Registration
              </span>
              {assignedClassName && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Enrolled in {assignedClassName}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300">
              Select or change which class and section you are registering for:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(Number(e.target.value))}
                className="sm:col-span-3 bg-slate-950 border border-slate-700 text-white rounded-xl text-xs p-3 focus:ring-1 focus:ring-violet-500 focus:outline-none"
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
                className="py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingClass ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm Class</span>
                  </>
                )}
              </button>
            </div>

            {classMessage && (
              <p className="text-[11px] font-medium text-emerald-400 pt-1">
                {classMessage}
              </p>
            )}
          </div>

          {/* Danger zone / Reset */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="py-2 px-3 text-slate-400 hover:text-rose-400 font-medium flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {resetting ? 'Resetting...' : 'Redo All Face Scans From Scratch'}
            </button>
            <p>AttendX AI Biometrics • Real-time OpenCV SFace Model</p>
          </div>
        </div>

        {/* Hidden canvas for capturing frames */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // ── Render: Scanning Wizard (Guided 5-step Baseline) ─────────────────────────
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
              Guided Face Scan — Step {completedAngles.length + 1} of 5
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
                  onClick={() => captureAndSubmit()}
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
