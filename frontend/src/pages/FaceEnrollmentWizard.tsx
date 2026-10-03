import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, CheckCircle2, XCircle, RefreshCw, ScanFace,
  ChevronRight, RotateCcw, PartyPopper, AlertCircle,
  Check, School, GraduationCap, Zap, Sparkles, ShieldCheck,
  Layers, Sliders, History, ArrowRight, Video, VideoOff, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudentPortalService } from '../services/api';
import { StudentUser, ScanAngle, SCAN_ANGLES, ANGLE_LABELS, ANGLE_ICONS, FaceFrameUploadResult, StudentPublicClass } from '../types';
import { extractErrorMessage } from '../utils/error';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { NeuralFaceMeshOverlay } from '../components/NeuralFaceMeshOverlay';

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
    <svg viewBox="0 0 80 80" className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="40" cy="28" rx="18" ry="22" />
      <path d="M14 72 C14 52 66 52 66 72" />
      <circle cx="32" cy="26" r="3" fill="currentColor" stroke="none" />
      <circle cx="48" cy="26" r="3" fill="currentColor" stroke="none" />
      <path d="M33 36 Q40 41 47 36" strokeLinecap="round" />
    </svg>
  ),
  left: (
    <svg viewBox="0 0 80 80" className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="44" cy="28" rx="16" ry="22" transform="rotate(-15 44 28)" />
      <path d="M18 72 C18 52 68 52 68 72" />
      <circle cx="36" cy="25" r="3" fill="currentColor" stroke="none" />
      <circle cx="51" cy="22" r="3" fill="currentColor" stroke="none" />
      <path d="M37 35 Q43 40 49 34" strokeLinecap="round" />
      <path d="M12 40 L22 40 M12 40 L18 34 M12 40 L18 46" strokeLinecap="round" />
    </svg>
  ),
  right: (
    <svg viewBox="0 0 80 80" className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="36" cy="28" rx="16" ry="22" transform="rotate(15 36 28)" />
      <path d="M12 72 C12 52 62 52 62 72" />
      <circle cx="29" cy="22" r="3" fill="currentColor" stroke="none" />
      <circle cx="44" cy="25" r="3" fill="currentColor" stroke="none" />
      <path d="M31 34 Q37 40 43 35" strokeLinecap="round" />
      <path d="M68 40 L58 40 M68 40 L62 34 M68 40 L62 46" strokeLinecap="round" />
    </svg>
  ),
  chin_down: (
    <svg viewBox="0 0 80 80" className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="40" cy="32" rx="18" ry="22" transform="rotate(10 40 32)" />
      <path d="M14 74 C14 54 66 54 66 74" />
      <circle cx="32" cy="30" r="3" fill="currentColor" stroke="none" />
      <circle cx="48" cy="30" r="3" fill="currentColor" stroke="none" />
      <path d="M33 40 Q40 45 47 40" strokeLinecap="round" />
      <path d="M40 56 L40 66 M34 62 L40 68 L46 62" strokeLinecap="round" />
    </svg>
  ),
  smile: (
    <svg viewBox="0 0 80 80" className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="40" cy="28" rx="18" ry="22" />
      <path d="M14 72 C14 52 66 52 66 72" />
      <circle cx="32" cy="25" r="3" fill="currentColor" stroke="none" />
      <circle cx="48" cy="25" r="3" fill="currentColor" stroke="none" />
      <path d="M30 35 Q40 48 50 35" strokeLinecap="round" strokeWidth="2.5" />
    </svg>
  ),
};

export const FaceEnrollmentWizard: React.FC<FaceEnrollmentWizardProps> = ({ student, onComplete, onLogout }) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<WizardPhase>(student.face_registration_complete ? 'complete' : 'intro');
  const [currentAngleIdx, setCurrentAngleIdx] = useState(0);
  const [completedAngles, setCompletedAngles] = useState<ScanAngle[]>([]);
  const [frameStatus, setFrameStatus] = useState<FrameStatus>('idle');
  const [lastResult, setLastResult] = useState<FaceFrameUploadResult | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const { isDark } = useTheme();
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
      setClassMessage(extractErrorMessage(err, 'Failed to update class.'));
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
            setTimeout(() => {
              const nextIdx = SCAN_ANGLES.findIndex(a => !result.completed_angles.includes(a as ScanAngle));
              if (nextIdx !== -1) setCurrentAngleIdx(nextIdx);
              setFrameStatus('idle');
              setLastResult(null);
            }, 1500);
          }
        } else {
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
        reason: extractErrorMessage(err, 'Upload failed. Please try again.'),
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
      <div className={`min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans transition-colors ${
        isDark ? 'bg-black text-white' : 'bg-[#FBFBFB] text-[#111827]'
      }`}>
        <header className={`w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b ${
          isDark ? 'glass-nav text-white' : 'bg-white border-slate-200/90 text-slate-900'
        }`}>
          <div onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer group">
            <Logo size="md" variant="auto" />
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle variant="slider" size="sm" />
            <button 
              onClick={onLogout} 
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                isDark ? 'text-zinc-300 hover:text-white bg-white/5' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-lg w-full space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-100 dark:border-blue-800/40 mb-1">
                <ScanFace className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Biometric Face Onboarding
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-[var(--text-primary)] font-normal tracking-tight">Welcome, {student.name}!</h1>
              <p className="text-sm text-[var(--text-secondary)]">Enroll your facial baseline scan for instant classroom recognition.</p>
              {assignedClassName && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40 rounded-full text-blue-700 dark:text-blue-300 text-xs font-semibold mt-2">
                  <School className="w-3.5 h-3.5" />
                  <span>Enrolled Cohort: {assignedClassName}</span>
                </div>
              )}
            </div>

            {/* Steps preview */}
            <div className="swiss-card border rounded-2xl p-6 shadow-sm space-y-3">
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">5 Guided Baseline Angles</p>
              {SCAN_ANGLES.map((angle, i) => (
                <div key={angle} className="flex items-center gap-3 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {ANGLE_ICONS[angle as ScanAngle]} {ANGLE_LABELS[angle as ScanAngle]}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">{ANGLE_INSTRUCTIONS[angle as ScanAngle]}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onLogout}
                className="py-3 px-4 bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs rounded-xl border border-[var(--border-color)] transition-colors"
              >
                Sign Out
              </button>
              <button
                id="start-scan-btn"
                onClick={() => { setPhase('scanning'); startWebcam(); }}
                className="py-3 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <span>Start Face Scan</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>

        <footer className="py-6 border-t border-slate-200/80 bg-white text-center text-xs text-slate-500">
          AttendX Guided Facial Biometrics · Privacy Protected
        </footer>
      </div>
    );
  }

  // ── Render: Complete & Continuous AI Face Training Studio ───────────────────
  if (phase === 'complete') {
    return (
      <div className="min-h-screen bg-[#FBFBFB] text-[#111827] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold shadow-sm">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900">AttendX</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  STUDENT PORTAL
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 hidden sm:inline">
                <strong>{student.name}</strong> ({student.student_id})
              </span>
              <button
                onClick={onLogout}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
          {/* Top Status Banner */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-serif text-2xl text-slate-900 font-normal flex items-center gap-2">
                  {student.name}
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                    Face Registered
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Student ID: {student.student_id} {assignedClassName ? `• Enrolled in ${assignedClassName}` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              disabled={resetting}
              className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resetting ? 'Resetting...' : 'Re-scan Baseline'}</span>
            </button>
          </div>

          {/* AI Training Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Trained Vectors</span>
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{totalEmbeddings}</div>
              <div className="text-xs text-slate-500">128-D facial reference embeddings</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Precision Tier</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 tracking-tight truncate">{trainingLevel}</div>
              <div className="text-xs text-slate-500">Multi-pose biometric model ready</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Readiness Score</span>
                <Sparkles className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-3xl font-extrabold text-blue-600 tracking-tight">{readinessScore}%</div>
              <div className="text-xs text-slate-500">Match probability in lecture hall</div>
            </div>
          </div>

          {/* Continuous AI Face Training Studio Main Section */}
          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 mb-1">
                  <Zap className="w-3.5 h-3.5 text-blue-600" /> Continuous Model Calibration
                </div>
                <h2 className="font-serif text-2xl text-slate-900 font-normal">
                  Train AI Face Recognizer with More Scans
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  Extra scans under varied lighting, glasses, and head angles add new reference vectors directly into the classroom matcher.
                </p>
              </div>

              {!isWebcamActive ? (
                <button
                  onClick={startWebcam}
                  className="py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all shrink-0"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Camera</span>
                </button>
              ) : (
                <button
                  onClick={stopWebcam}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shrink-0"
                >
                  <VideoOff className="w-3.5 h-3.5" />
                  <span>Stop Camera</span>
                </button>
              )}
            </div>

            {/* Studio Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Camera Preview Area (7 Cols) */}
              <div className="lg:col-span-7 bg-slate-950 relative flex flex-col items-center justify-center min-h-[340px]">
                {isWebcamActive ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover max-h-[420px]" />
                    <NeuralFaceMeshOverlay videoRef={videoRef} isActive={isWebcamActive} targetAngle={selectedTrainingPreset} />

                    {/* Result Overlay */}
                    {(frameStatus === 'accepted' || frameStatus === 'rejected') && lastResult && (
                      <div className={`absolute inset-0 flex items-center justify-center backdrop-blur-sm ${
                        frameStatus === 'accepted' ? 'bg-emerald-950/70' : 'bg-rose-950/70'
                      }`}>
                        <div className="text-center px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-2xl">
                          {frameStatus === 'accepted' ? (
                            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2 animate-bounce" />
                          ) : (
                            <XCircle className="w-10 h-10 text-rose-600 mx-auto mb-2" />
                          )}
                          <p className={`text-sm font-bold ${frameStatus === 'accepted' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {lastResult.reason}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center p-8 text-white">
                    <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <h3 className="text-sm font-bold">Camera Ready</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto mb-4">
                      Click start camera above to capture extra training poses.
                    </p>
                  </div>
                )}
              </div>

              {/* Training Controls Area (5 Cols) */}
              <div className="lg:col-span-5 p-6 bg-white flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-600" />
                      Select Training Pose
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {TRAINING_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedTrainingPreset(preset.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            selectedTrainingPreset === preset.id
                              ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
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
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{trainingSuccessFlash}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <button
                    id="capture-training-btn"
                    onClick={() => captureAndSubmit()}
                    disabled={!isWebcamActive || frameStatus !== 'idle'}
                    className="w-full py-3.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  >
                    {frameStatus === 'capturing' || frameStatus === 'uploading' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Training AI Model...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>Capture & Add Face Vector</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Post-Scan Class Selection Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                Classroom Assignment
              </span>
              {assignedClassName && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                  Enrolled in {assignedClassName}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Confirm or switch which class and section you belong to:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(Number(e.target.value))}
                className="sm:col-span-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs p-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none font-medium"
              >
                <option value={0} disabled>Choose a classroom...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.section} ({c.academic_year})
                  </option>
                ))}
              </select>

              <button
                onClick={handleUpdateClass}
                disabled={savingClass || !selectedClassId}
                className="py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingClass ? <span>Saving...</span> : <span>Confirm Class</span>}
              </button>
            </div>

            {classMessage && (
              <p className="text-xs font-semibold text-emerald-600 pt-1">
                {classMessage}
              </p>
            )}
          </div>
        </main>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // ── Render: Scanning Wizard (Guided 5-step Baseline) ─────────────────────────
  const progressPct = (completedAngles.length / 5) * 100;

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-[#111827] flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans">
      <header className="w-full max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <div onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold shadow-sm">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center">
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">Attend</span>
            <span className="font-extrabold text-2xl tracking-tight text-blue-600">X</span>
          </div>
        </div>

        <button onClick={onLogout} className="text-xs font-semibold text-slate-500 hover:text-slate-900">
          Sign Out
        </button>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Header with progress */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
            <ScanFace className="w-3.5 h-3.5 text-blue-600" /> Step {completedAngles.length + 1} of 5
          </div>
          <h1 className="font-serif text-3xl text-slate-900 font-normal">Guided Face Scan</h1>
          <p className="text-xs text-slate-500">{student.name} · {student.student_id}</p>
        </div>

        {/* Progress bar */}
        <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Angle progress pills */}
        <div className="flex gap-2 justify-center flex-wrap">
          {SCAN_ANGLES.map((angle, i) => {
            const done = completedAngles.includes(angle as ScanAngle);
            const current = angle === currentAngle && !done;
            return (
              <div
                key={angle}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  done
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : current
                    ? 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-100'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
                <span>{ANGLE_LABELS[angle as ScanAngle].split(' ').slice(-1)[0]}</span>
              </div>
            );
          })}
        </div>

        {/* Main scanning card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm">
          {/* Instruction row — compact, horizontal */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
            <div className="text-3xl shrink-0">{ANGLE_ICONS[currentAngle]}</div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base text-slate-900 leading-tight">{ANGLE_LABELS[currentAngle]}</h2>
              <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{ANGLE_INSTRUCTIONS[currentAngle]}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
              {ANGLE_SVG[currentAngle]}
            </div>
          </div>

          {/* Full-width camera feed — tall enough to see your face clearly */}
          <div className="relative bg-slate-950" style={{ aspectRatio: '4/3', minHeight: '320px', maxHeight: '480px' }}>
            {isWebcamActive ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <NeuralFaceMeshOverlay videoRef={videoRef} isActive={isWebcamActive} targetAngle={currentAngle} />

                {(frameStatus === 'accepted' || frameStatus === 'rejected') && lastResult && (
                  <div className={`absolute inset-0 flex items-center justify-center ${
                    frameStatus === 'accepted' ? 'bg-emerald-900/60' : 'bg-rose-900/60'
                  }`}>
                    <div className="text-center px-6 py-4 rounded-2xl bg-white shadow-2xl">
                      {frameStatus === 'accepted' ? (
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 animate-bounce" />
                      ) : (
                        <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                      )}
                      <p className={`text-sm font-bold ${frameStatus === 'accepted' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {lastResult.reason}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                <Camera className="w-10 h-10 text-slate-400" />
                <p className="text-xs text-slate-400">Camera Standby</p>
                <button
                  onClick={startWebcam}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all"
                >
                  Start Camera
                </button>
              </div>
            )}
          </div>

          {/* Capture button — full width below the camera */}
          <div className="p-5 bg-white">
            <button
              id="capture-frame-btn"
              onClick={() => captureAndSubmit()}
              disabled={!isWebcamActive || frameStatus !== 'idle'}
              className="w-full py-4 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-40"
            >
              {frameStatus === 'capturing' || frameStatus === 'uploading' ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /><span>Processing...</span></>
              ) : (
                <><Camera className="w-4 h-4" /><span>Capture — {ANGLE_LABELS[currentAngle]}</span></>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">Make sure your face is clearly inside the oval guide before capturing.</p>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-slate-200/80 bg-white text-center text-xs text-slate-500">
        AttendX Facial Geometry Enrollment
      </footer>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
