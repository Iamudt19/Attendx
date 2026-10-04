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
  onNavigateToAttendance?: () => void;
  embedded?: boolean;
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

// Continuous biometric calibration angles and descriptors
const BIOMETRIC_COVERAGE_ANGLES = [
  { id: 'front', label: 'Direct Look', icon: '😐', desc: 'Frontal geometry' },
  { id: 'left', label: 'Left Turn', icon: '⬅️', desc: 'Left cheek profile' },
  { id: 'right', label: 'Right Turn', icon: '➡️', desc: 'Right cheek profile' },
  { id: 'chin_down', label: 'Chin Down', icon: '⬇️', desc: 'Nasal depth angle' },
  { id: 'smile', label: 'Expression', icon: '😊', desc: 'Dynamic expression' },
  { id: 'glasses', label: 'Eyewear / Var', icon: '👓', desc: 'Lighting / accessories' },
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

export const FaceEnrollmentWizard: React.FC<FaceEnrollmentWizardProps> = ({
  student,
  onComplete,
  onLogout,
  onNavigateToAttendance,
  embedded = true,
}) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<WizardPhase>(student.face_registration_complete ? 'complete' : 'intro');
  const [currentAngleIdx, setCurrentAngleIdx] = useState(0);
  const [completedAngles, setCompletedAngles] = useState<ScanAngle[]>([]);
  const [frameStatus, setFrameStatus] = useState<FrameStatus>('idle');
  const [lastResult, setLastResult] = useState<FaceFrameUploadResult | null>(null);
  const [scanToast, setScanToast] = useState<{ text: string; nextTip?: string; type: 'success' | 'error' } | null>(null);
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

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isAutoScan, setIsAutoScan] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentAngle = SCAN_ANGLES[currentAngleIdx] as ScanAngle;

  const enumerateCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoDevices);
    } catch (e) {
      // ignore
    }
  }, []);

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

  // Load available classes, student profile, and camera devices
  useEffect(() => {
    StudentPortalService.getPublicClasses()
      .then((data) => {
        setClasses(data);
      })
      .catch(() => {});

    loadStudentProfile();
    enumerateCameras();
  }, [loadStudentProfile, enumerateCameras]);

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

  // Start webcam with specific facing mode or device ID
  const startWebcam = useCallback(async (mode: 'user' | 'environment' = facingMode, deviceId?: string) => {
    setWebcamError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setWebcamError('Camera API not available. Please access this page over HTTPS or localhost.');
      return;
    }

    // Clean up existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      let stream: MediaStream;
      try {
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        };

        if (deviceId) {
          videoConstraints.deviceId = { exact: deviceId };
        } else {
          videoConstraints.facingMode = mode;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
        });
      } catch (constraintErr) {
        console.warn(`Targeted camera constraint (${mode}) failed, falling back to basic video:`, constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      streamRef.current = stream;
      setIsWebcamActive(true);
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
      }, 100);

      // Re-enumerate to get device labels now that permission is granted
      enumerateCameras();
    } catch (err: any) {
      const name = (err as DOMException).name;
      setWebcamError(
        name === 'NotAllowedError' ? 'Camera permission denied. Please allow camera access in your browser.' :
        name === 'NotFoundError' ? 'No camera found. Please connect a camera.' :
        'Could not start camera. Please try again.'
      );
      setIsWebcamActive(false);
    }
  }, [facingMode, enumerateCameras]);

  const toggleFacingMode = () => {
    const nextMode: 'user' | 'environment' = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setSelectedDeviceId('');
    if (isWebcamActive) {
      startWebcam(nextMode);
    }
  };

  const switchCameraMode = (mode: 'user' | 'environment') => {
    if (mode === facingMode && !selectedDeviceId) return;
    setFacingMode(mode);
    setSelectedDeviceId('');
    if (isWebcamActive) {
      startWebcam(mode);
    }
  };

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isWebcamActive) {
      startWebcam(facingMode, deviceId);
    }
  };

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

        if (phase === 'scanning') {
          if (result.registration_complete) {
            setScanToast({
              text: '🎉 5/5 Face Angles Successfully Saved to Biometric Model!',
              nextTip: 'Registration complete. Your 3D facial identity is active.',
              type: 'success',
            });
            setTimeout(() => {
              setPhase('complete');
              onComplete();
              setFrameStatus('idle');
              setLastResult(null);
            }, 1200);
          } else {
            const nextIdx = SCAN_ANGLES.findIndex(a => !result.completed_angles.includes(a as ScanAngle));
            const nextAngleKey = nextIdx !== -1 ? (SCAN_ANGLES[nextIdx] as ScanAngle) : null;
            const nextAngleName = nextAngleKey ? ANGLE_LABELS[nextAngleKey] : 'Next Pose';

            setScanToast({
              text: `✓ ${ANGLE_LABELS[angleToSubmit as ScanAngle] || 'Angle'} Saved to Vector Bank!`,
              nextTip: `👉 Next Step: Turn slowly toward ${nextAngleName}`,
              type: 'success',
            });

            if (nextIdx !== -1) setCurrentAngleIdx(nextIdx);
            setTimeout(() => {
              setFrameStatus('idle');
              setLastResult(null);
            }, 900);
          }
        } else {
          const nextAngleIdx = (currentAngleIdx + 1) % SCAN_ANGLES.length;
          setCurrentAngleIdx(nextAngleIdx);
          const nextAngleName = ANGLE_LABELS[SCAN_ANGLES[nextAngleIdx] as ScanAngle];

          setScanToast({
            text: `✓ Vector Saved to 128-D Bank! (Total: ${result.total_embeddings || totalEmbeddings + 1})`,
            nextTip: `👉 Next Step: Turn toward ${nextAngleName}`,
            type: 'success',
          });
          setTimeout(() => {
            setFrameStatus('idle');
            setLastResult(null);
          }, 900);
        }
      } else {
        setFrameStatus('rejected');
        setScanToast({
          text: 'Scan Skipped — Adjust Position',
          nextTip: result.reason || 'Please face the camera steadily and hold in view.',
          type: 'error',
        });
        setTimeout(() => {
          setFrameStatus('idle');
          setLastResult(null);
        }, 2000);
      }
    } catch (err: any) {
      setFrameStatus('rejected');
      setScanToast({
        text: 'Upload Attempt Failed',
        nextTip: extractErrorMessage(err, 'Network timeout. Hold position to retry.'),
        type: 'error',
      });
      setTimeout(() => {
        setFrameStatus('idle');
        setLastResult(null);
      }, 2500);
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
    const introContent = (
      <div className="max-w-lg w-full mx-auto space-y-6 py-6">
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

        {/* Camera Source Selector Card */}
        <div className={`swiss-card border rounded-2xl p-5 shadow-sm space-y-3 ${
          isDark ? 'bg-zinc-900/70 border-white/10' : 'bg-slate-50/80 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Camera Lens Mode
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold">
              {facingMode === 'user' ? 'Selfie Camera' : 'Back Camera Active'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => switchCameraMode('user')}
              className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                facingMode === 'user' && !selectedDeviceId
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : isDark
                    ? 'bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Front (Selfie)</span>
            </button>

            <button
              type="button"
              onClick={() => switchCameraMode('environment')}
              className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                facingMode === 'environment' && !selectedDeviceId
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : isDark
                    ? 'bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Back Camera (Rear)</span>
            </button>
          </div>

          {availableDevices.length > 1 && (
            <div className="pt-1">
              <select
                value={selectedDeviceId}
                onChange={(e) => handleDeviceSelect(e.target.value)}
                className={`w-full text-[11px] p-2 rounded-xl border font-mono transition-colors ${
                  isDark ? 'bg-black/60 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <option value="">Default {facingMode === 'user' ? 'Front' : 'Back'} Camera</option>
                {availableDevices.map((d, idx) => (
                  <option key={d.deviceId || idx} value={d.deviceId}>
                    {d.label || `Camera Device ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
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
            onClick={() => { setPhase('scanning'); startWebcam(facingMode, selectedDeviceId); }}
            className="py-3 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <span>Start Face Scan</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );

    if (embedded) return introContent;

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
            <button onClick={onLogout} className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5">
              Sign Out
            </button>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          {introContent}
        </main>
        <footer className="py-6 border-t border-slate-200/80 bg-white dark:bg-black text-center text-xs text-slate-500">
          AttendX Guided Facial Biometrics · Privacy Protected
        </footer>
      </div>
    );
  }

  // ── Render: Complete & Continuous AI Face Training Studio ───────────────────
  if (phase === 'complete') {
    const completeContent = (
      <div className="w-full space-y-6">
        {/* Top Status & Next Steps Banner */}
        <div className={`border rounded-2xl p-6 shadow-sm flex flex-col gap-4 transition-colors ${
          isDark ? 'bg-zinc-900/60 border-white/10 text-white' : 'bg-white border-slate-200/90 text-slate-900'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className={`font-serif text-2xl font-normal flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {student.name}
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
                    Face Registered &amp; Saved
                  </span>
                </h1>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Student ID: {student.student_id} {assignedClassName ? `• Enrolled in ${assignedClassName}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onNavigateToAttendance && (
                <button
                  type="button"
                  onClick={onNavigateToAttendance}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <span>View Attendance</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleReset}
                disabled={resetting}
                className={`text-xs flex items-center gap-1 transition-colors px-3 py-2 rounded-xl border ${
                  isDark 
                    ? 'text-zinc-400 hover:text-rose-400 border-white/10 bg-white/5' 
                    : 'text-slate-600 hover:text-rose-600 border-slate-200 bg-slate-50'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{resetting ? 'Resetting...' : 'Re-scan Baseline'}</span>
              </button>
            </div>
          </div>

          {/* Clear Next Steps Box */}
          <div className={`p-4 rounded-xl border text-xs space-y-2 ${
            isDark ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
          }`}>
            <div className="font-bold text-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>Biometric Scans Successfully Saved &amp; Active</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Step 1: Classroom Confirmation</p>
                  <p className="opacity-80 text-[11px]">Confirm your class &amp; section below to receive automated attendance marks.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Step 2: Continuous Model Calibration (Optional)</p>
                  <p className="opacity-80 text-[11px]">Rotate your head in the continuous studio below to add extra lighting &amp; glasses angles.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Training Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className={`border rounded-2xl p-6 shadow-sm space-y-1 transition-colors ${
            isDark ? 'bg-zinc-900/60 border-white/10 text-white' : 'bg-white border-slate-200/90 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              <span className="text-xs font-semibold uppercase tracking-wider">Trained Vectors</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalEmbeddings}</div>
            <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>128-D facial reference embeddings</div>
          </div>

          <div className={`border rounded-2xl p-6 shadow-sm space-y-1 transition-colors ${
            isDark ? 'bg-zinc-900/60 border-white/10 text-white' : 'bg-white border-slate-200/90 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              <span className="text-xs font-semibold uppercase tracking-wider">Precision Tier</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-500 tracking-tight truncate">{trainingLevel}</div>
            <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Multi-pose biometric model ready</div>
          </div>

          <div className={`border rounded-2xl p-6 shadow-sm space-y-1 transition-colors ${
            isDark ? 'bg-zinc-900/60 border-white/10 text-white' : 'bg-white border-slate-200/90 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              <span className="text-xs font-semibold uppercase tracking-wider">Readiness Score</span>
              <Sparkles className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-extrabold text-blue-500 tracking-tight">{readinessScore}%</div>
            <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Match probability in lecture hall</div>
          </div>
        </div>

        {/* Continuous AI Face Calibration Studio Main Section */}
        <div className={`border rounded-3xl overflow-hidden shadow-sm transition-colors ${
          isDark ? 'bg-zinc-900/60 border-white/10' : 'bg-white border-slate-200/90'
        }`}>
          <div className={`p-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isDark ? 'border-white/10' : 'border-slate-100'
          }`}>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-semibold border border-blue-500/20 mb-1">
                <Zap className="w-3.5 h-3.5 text-blue-500" /> Continuous Model Calibration
              </div>
              <h2 className={`font-serif text-2xl font-normal ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Train AI Face Recognizer with More Scans
              </h2>
              <p className={`text-xs mt-1 max-w-xl ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Hands-free continuous 3D capture (Face ID & Lenskart style). Rotate your head naturally to auto-train reference vectors.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isWebcamActive && (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className={`py-2 px-3 font-semibold text-xs rounded-xl flex items-center gap-1.5 border transition-all ${
                    isDark 
                      ? 'bg-white/10 hover:bg-white/15 text-zinc-200 border-white/10' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                  title="Switch camera lens"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                  <span>{facingMode === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'}</span>
                </button>
              )}

              {!isWebcamActive ? (
                <button
                  onClick={() => startWebcam(facingMode, selectedDeviceId)}
                  className="py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all shrink-0"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Camera ({facingMode === 'user' ? 'Front' : 'Back'})</span>
                </button>
              ) : (
                <button
                  onClick={stopWebcam}
                  className={`py-2 px-3 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
                    isDark ? 'bg-white/10 hover:bg-white/15 text-zinc-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <VideoOff className="w-3.5 h-3.5" />
                  <span>Stop Camera</span>
                </button>
              )}
            </div>
          </div>

          {/* Studio Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Camera Preview Area (7 Cols) */}
            <div className="lg:col-span-7 bg-black relative flex flex-col items-center justify-center min-h-[380px]">
              {isWebcamActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover max-h-[460px] ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                  />
                  <NeuralFaceMeshOverlay
                    videoRef={videoRef}
                    isActive={isWebcamActive}
                    targetAngle={SCAN_ANGLES[currentAngleIdx] || 'front'}
                    isAutoScan={true}
                    facingMode={facingMode}
                    onPoseLock={(lockedPreset) => {
                      if (frameStatus === 'idle') {
                        captureAndSubmit(lockedPreset);
                      }
                    }}
                  />

                  {/* Camera Info & Step Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 z-10 pointer-events-none">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[11px] font-mono text-cyan-400 shadow-md">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      <span>{facingMode === 'user' ? 'Front' : 'Back Camera'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/90 backdrop-blur-md border border-blue-400/40 text-[11px] font-semibold text-white shadow-md">
                      <ScanFace className="w-3.5 h-3.5" />
                      <span>Step {currentAngleIdx + 1}/5: {ANGLE_LABELS[SCAN_ANGLES[currentAngleIdx] as ScanAngle]}</span>
                    </div>
                  </div>

                  {/* Quick Flip Floating Button */}
                  <div className="absolute top-3 right-14 flex items-center z-10">
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="px-2.5 py-1 rounded-lg bg-black/80 hover:bg-black text-white border border-white/20 text-[11px] font-mono flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all active:scale-95"
                      title="Flip Camera Lens"
                    >
                      <RefreshCw className="w-3 h-3 text-cyan-400" />
                      <span>Flip to {facingMode === 'user' ? 'Back' : 'Front'}</span>
                    </button>
                  </div>

                  {/* Floating Scan Feedback Notification Pill */}
                  {scanToast && (
                    <div className="absolute top-12 inset-x-4 flex justify-center z-20 pointer-events-none transition-all animate-fadeIn">
                      <div className={`px-4 py-2 rounded-xl backdrop-blur-md border shadow-xl max-w-md text-center ${
                        scanToast.type === 'success'
                          ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                          : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
                      }`}>
                        <div className="flex items-center justify-center gap-2 font-bold text-xs">
                          {scanToast.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span>{scanToast.text}</span>
                        </div>
                        {scanToast.nextTip && (
                          <p className="text-[11px] mt-0.5 opacity-90 text-white font-medium">
                            {scanToast.nextTip}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-8 text-white">
                  <Camera className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
                  <h3 className="text-base font-bold">Continuous Camera Standby</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto mb-4 leading-relaxed">
                    Start camera to enable hands-free Apple Face ID &amp; Lenskart continuous calibration. Simply move your head in front of the lens.
                  </p>
                  <div className="inline-flex gap-2 p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => switchCameraMode('user')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${facingMode === 'user' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                    >
                      🤳 Front (Selfie)
                    </button>
                    <button
                      type="button"
                      onClick={() => switchCameraMode('environment')}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${facingMode === 'environment' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                    >
                      📷 Back Camera
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Continuous Biometric Telemetry & Coverage (5 Cols) */}
            <div className={`lg:col-span-5 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l transition-colors ${
              isDark ? 'bg-zinc-950/80 border-white/10' : 'bg-white border-slate-100'
            }`}>
              <div className="space-y-4">
                {/* Camera Lens Source Toggle */}
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2 ${
                    isDark ? 'text-zinc-300' : 'text-slate-700'
                  }`}>
                    <Camera className="w-3.5 h-3.5 text-blue-500" />
                    Camera Lens Source
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => switchCameraMode('user')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        facingMode === 'user' && !selectedDeviceId
                          ? isDark
                            ? 'bg-blue-900/40 border-blue-500 text-blue-200 shadow-sm'
                            : 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                          : isDark
                            ? 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:bg-zinc-850'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Front (Selfie)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchCameraMode('environment')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        facingMode === 'environment' && !selectedDeviceId
                          ? isDark
                            ? 'bg-blue-900/40 border-blue-500 text-blue-200 shadow-sm'
                            : 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                          : isDark
                            ? 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:bg-zinc-850'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Back Camera (Rear)</span>
                    </button>
                  </div>
                </div>

                {/* Biometric 3D Angle Coverage Tracker */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      isDark ? 'text-zinc-300' : 'text-slate-700'
                    }`}>
                      <ScanFace className="w-3.5 h-3.5 text-blue-500" />
                      Biometric 3D Angle Coverage
                    </span>
                    <span className="text-[10px] font-mono text-emerald-500 font-bold">
                      {totalEmbeddings} vectors trained
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {BIOMETRIC_COVERAGE_ANGLES.map((angle) => {
                      const isCovered = completedAngles.includes(angle.id as ScanAngle) || totalEmbeddings >= 5;
                      return (
                        <div
                          key={angle.id}
                          className={`p-2.5 rounded-xl border transition-all ${
                            isCovered
                              ? isDark
                                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : isDark
                                ? 'bg-zinc-900/60 border-white/10 text-zinc-400'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{angle.icon}</span>
                              <span className="text-xs font-semibold">{angle.label}</span>
                            </div>
                            {isCovered ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-zinc-400" />
                            )}
                          </div>
                          <p className={`text-[10px] mt-0.5 truncate ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                            {angle.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Continuous Status Notice */}
                <div className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1 ${
                  isDark ? 'bg-blue-950/30 border-blue-500/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <Zap className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Hands-Free Continuous Scanning</span>
                  </div>
                  <p className="text-[11px] opacity-90">
                    No clicks required. Look straight, then slowly turn your head left, right, and tilt downward. The neural mesh overlay locks onto each perspective and enriches your classroom profile automatically.
                  </p>
                </div>

                {trainingSuccessFlash && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{trainingSuccessFlash}</span>
                  </div>
                )}
              </div>

              <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Auto-Scan Mode</span>
                  <span className="font-mono text-emerald-500 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Continuous Auto-Capture Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Post-Scan Class Selection Card */}
        <div className={`border rounded-2xl p-6 space-y-3 shadow-sm transition-colors ${
          isDark ? 'bg-zinc-900/60 border-white/10 text-white' : 'bg-white border-slate-200/90 text-slate-900'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <GraduationCap className="w-4 h-4 text-blue-500" />
              Classroom Assignment
            </span>
            {assignedClassName && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
                Enrolled in {assignedClassName}
              </span>
            )}
          </div>

          <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Confirm or switch which class and section you belong to:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className={`sm:col-span-3 rounded-xl text-xs p-3 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium border transition-colors ${
                isDark ? 'bg-black/60 border-white/15 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
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
            <p className="text-xs font-semibold text-emerald-500 pt-1">
              {classMessage}
            </p>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );

    if (embedded) return completeContent;

    return (
      <div className={`min-h-screen flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-[#FBFBFB] text-[#111827]'
      }`}>
        <header className={`border-b sticky top-0 z-40 transition-colors backdrop-blur-xl ${
          isDark ? 'bg-black/70 border-white/10 text-white' : 'bg-white/80 border-slate-200/90 text-slate-900'
        }`}>
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold shadow-sm">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-lg">AttendX</span>
            </div>
            <ThemeToggle variant="slider" size="sm" />
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto p-6">
          {completeContent}
        </main>
      </div>
    );
  }

  // ── Render: Scanning Wizard (Guided 5-step Baseline) ─────────────────────────
  const progressPct = (completedAngles.length / 5) * 100;

  const scanningContent = (
    <div className="max-w-2xl w-full mx-auto px-2 py-4 space-y-6">
      {/* Header with progress */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-semibold border border-blue-500/20">
          <ScanFace className="w-3.5 h-3.5 text-blue-500" /> Step {completedAngles.length + 1} of 5
        </div>
        <h1 className={`font-serif text-3xl font-normal ${isDark ? 'text-white' : 'text-slate-900'}`}>Guided Face Scan</h1>
        <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{student.name} · {student.student_id}</p>
      </div>

      {/* Progress bar */}
      <div className={`rounded-full h-2 overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}>
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
                  ? isDark
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : current
                  ? isDark
                    ? 'bg-blue-950/50 border-blue-400/50 text-blue-300 ring-2 ring-blue-500/20'
                    : 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-100'
                  : isDark
                  ? 'bg-zinc-900 border-white/10 text-zinc-500'
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
      <div className={`border rounded-3xl overflow-hidden shadow-sm transition-colors ${
        isDark ? 'bg-zinc-900/60 border-white/10' : 'bg-white border-slate-200/90'
      }`}>
        {/* Instruction row — compact, horizontal */}
        <div className={`flex items-center gap-4 px-6 py-4 border-b ${
          isDark ? 'border-white/10' : 'border-slate-100'
        }`}>
          <div className="text-3xl shrink-0">{ANGLE_ICONS[currentAngle]}</div>
          <div className="flex-1 min-w-0">
            <h2 className={`font-semibold text-base leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{ANGLE_LABELS[currentAngle]}</h2>
            <p className={`text-xs leading-relaxed mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{ANGLE_INSTRUCTIONS[currentAngle]}</p>
          </div>
          <div className={`p-2.5 rounded-xl border shrink-0 ${
            isDark ? 'bg-zinc-800/80 border-white/10' : 'bg-slate-50 border-slate-100'
          }`}>
            {ANGLE_SVG[currentAngle]}
          </div>
        </div>

        {/* Camera Lens & Auto-Scan Selector Toolbar */}
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-2 px-6 py-2.5 border-b text-xs ${
          isDark ? 'bg-zinc-950/60 border-white/10' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-lg border font-mono text-[11px] font-semibold flex items-center gap-1.5 bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
              <Zap className="w-3 h-3 text-emerald-500" />
              <span>Continuous Face ID: Active</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="flex p-0.5 rounded-lg border bg-[var(--bg-inset)] border-[var(--border-color)] text-xs flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => switchCameraMode('user')}
                className={`px-3 py-1 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-all text-xs flex-1 sm:flex-initial ${
                  facingMode === 'user' && !selectedDeviceId
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Camera className="w-3 h-3" />
                <span>Front (Selfie)</span>
              </button>
              <button
                type="button"
                onClick={() => switchCameraMode('environment')}
                className={`px-3 py-1 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-all text-xs flex-1 sm:flex-initial ${
                  facingMode === 'environment' && !selectedDeviceId
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Back (Rear)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Full-width camera feed */}
        <div className="relative bg-slate-950" style={{ aspectRatio: '4/3', minHeight: '320px', maxHeight: '480px' }}>
          {isWebcamActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />
              <NeuralFaceMeshOverlay
                videoRef={videoRef}
                isActive={isWebcamActive}
                targetAngle={currentAngle}
                isAutoScan={true}
                facingMode={facingMode}
                onPoseLock={(lockedAngle) => {
                  if (frameStatus === 'idle') {
                    captureAndSubmit(lockedAngle);
                  }
                }}
              />

              {/* Floating Optical Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/15 text-[11px] font-mono text-cyan-400 z-10 pointer-events-none shadow-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Live Continuous ({facingMode === 'user' ? 'Front' : 'Back Camera'})</span>
              </div>

              {/* Quick Flip Floating Button */}
              <div className="absolute top-3 right-14 flex items-center z-10">
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="px-2.5 py-1 rounded-lg bg-black/80 hover:bg-black text-white border border-white/20 text-[11px] font-mono flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all active:scale-95"
                  title="Flip camera"
                >
                  <RefreshCw className="w-3 h-3 text-cyan-400" />
                  <span>Flip to {facingMode === 'user' ? 'Back' : 'Front'}</span>
                </button>
              </div>

              {/* Floating Scan Feedback Notification Pill */}
              {scanToast && (
                <div className="absolute top-12 inset-x-4 flex justify-center z-20 pointer-events-none transition-all animate-fadeIn">
                  <div className={`px-4 py-2 rounded-xl backdrop-blur-md border shadow-xl max-w-md text-center ${
                    scanToast.type === 'success'
                      ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
                  }`}>
                    <div className="flex items-center justify-center gap-2 font-bold text-xs">
                      {scanToast.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{scanToast.text}</span>
                    </div>
                    {scanToast.nextTip && (
                      <p className="text-[11px] mt-0.5 opacity-90 text-white font-medium">
                        {scanToast.nextTip}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 p-4">
              <Camera className="w-10 h-10 text-slate-400" />
              <p className="text-xs text-slate-400">Camera Standby ({facingMode === 'user' ? 'Front Camera' : 'Back Camera'})</p>
              <div className="flex gap-2">
                <button
                  onClick={() => startWebcam(facingMode, selectedDeviceId)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                >
                  Start Camera
                </button>
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Switch to {facingMode === 'user' ? 'Back' : 'Front'} Camera</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Continuous Face ID Status footer */}
        <div className={`p-4 transition-colors text-center ${isDark ? 'bg-zinc-900/90' : 'bg-white'}`}>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-500">
            <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>Continuous Face ID: Hold position to auto-lock &amp; proceed</span>
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
            Rotate your head naturally according to the prompt above. Captured automatically when aligned.
          </p>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  if (embedded) return scanningContent;

  return (
    <div className={`min-h-screen flex flex-col justify-between selection:bg-blue-600 selection:text-white font-sans transition-colors duration-300 ${
      isDark ? 'bg-black text-white' : 'bg-[#FBFBFB] text-[#111827]'
    }`}>
      <header className={`w-full max-w-6xl mx-auto px-6 h-20 flex items-center justify-between border-b ${
        isDark ? 'border-white/10' : 'border-slate-200/90'
      }`}>
        <div onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold shadow-sm">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center">
            <span className={`font-extrabold text-2xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Attend</span>
            <span className="font-extrabold text-2xl tracking-tight text-blue-600">X</span>
          </div>
        </div>
        <ThemeToggle variant="slider" size="sm" />
      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        {scanningContent}
      </main>
      <footer className="py-6 border-t text-center text-xs text-slate-500">
        AttendX Facial Geometry Enrollment
      </footer>
    </div>
  );
};
