import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, Upload, Calendar, BookOpen, AlertCircle, 
  CheckCircle2, Sparkles, RefreshCw, Video, Plus, Trash2, 
  Layers, Users, Info, ChevronRight, Zap, Check, ArrowRight, ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import { ClassService, SubjectService, AttendanceService } from '../services/api';
import { ClassItem, SubjectItem } from '../types';
import { extractErrorMessage } from '../utils/error';
import { compressClassroomPhoto } from '../utils/imageCompressor';

interface TakeAttendanceProps {
  onAnalysisComplete: (resultData: any, sessionContext: { classId: number; subjectId: number; date: string; startTime: string }) => void;
}

interface StagedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  source: 'upload' | 'webcam';
  label?: string;
}

export const TakeAttendance: React.FC<TakeAttendanceProps> = ({ onAnalysisComplete }) => {
  const navigate = useNavigate();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Staged photos list
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);

  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Cleanup camera stream and object URLs on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const clsList = await ClassService.getClasses();
        setClasses(clsList);
        if (clsList.length > 0) {
          setSelectedClassId(clsList[0].id);
        }
      } catch (err) {
        console.error("Failed to load classes", err);
      }
    };
    loadClasses();
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    const loadSubjects = async () => {
      try {
        const subList = await SubjectService.getSubjects(selectedClassId);
        setSubjects(subList);
        if (subList.length > 0) {
          setSelectedSubjectId(subList[0].id);
        }
      } catch (err) {
        console.error("Failed to load subjects", err);
      }
    };
    loadSubjects();
  }, [selectedClassId]);

  const addFilesToStaged = (files: FileList | File[]) => {
    const newItems: StagedPhoto[] = [];
    const sectionTags = ['Left Wing', 'Center Rows', 'Right Wing', 'Rear Tier', 'Section 5', 'Section 6'];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const currentCount = stagedPhotos.length + newItems.length;
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          source: 'upload',
          label: sectionTags[currentCount] || `Section ${currentCount + 1}`
        });
      }
    });

    if (newItems.length > 0) {
      setStagedPhotos((prev) => [...prev, ...newItems]);
      setActivePreviewIndex(stagedPhotos.length);
      stopWebcam();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToStaged(e.target.files);
      e.target.value = '';
    }
  };

  const removeStagedPhoto = (id: string) => {
    setStagedPhotos((prev) => {
      const target = prev.find(p => p.id === id);
      if (target?.previewUrl?.startsWith('blob:')) {
        try { URL.revokeObjectURL(target.previewUrl); } catch (e) {}
      }
      const next = prev.filter((p) => p.id !== id);
      if (activePreviewIndex >= next.length) {
        setActivePreviewIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const clearAllPhotos = () => {
    stagedPhotos.forEach(p => {
      if (p.previewUrl?.startsWith('blob:')) {
        try { URL.revokeObjectURL(p.previewUrl); } catch (e) {}
      }
    });
    setStagedPhotos([]);
    setActivePreviewIndex(0);
  };

  const startWebcam = async (mode: 'environment' | 'user' = facingMode) => {
    try {
      setError(null);
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let stream: MediaStream;
      try {
        // Attempt with desired resolution & facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
            facingMode: mode
          }
        });
      } catch (modeErr) {
        console.warn(`Targeted facingMode (${mode}) failed, falling back to basic camera:`, modeErr);
        // Fallback for laptops/desktops where facingMode constraint throws OverconstrainedError
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video play notice:", e));
      }
      setIsWebcamActive(true);
    } catch (err: any) {
      console.error("Webcam access error:", err);
      setError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? "Camera permission was denied. Please allow camera access in your browser settings."
          : "Unable to access camera hardware. Verify that another application isn't using it."
      );
      setIsWebcamActive(false);
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isWebcamActive) {
      startWebcam(nextMode);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
  };

  const captureWebcamFrame = (keepCameraOpen: boolean = false) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sectionTags = ['Left Wing', 'Center Rows', 'Right Wing', 'Rear Tier', 'Section 5'];
    const currentCount = stagedPhotos.length;

    // Flip horizontally if front camera for natural mirroring
    if (facingMode === 'user') {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture_${currentCount + 1}.jpg`, { type: 'image/jpeg' });
        const newPhoto: StagedPhoto = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          source: 'webcam',
          label: sectionTags[currentCount] || `Section ${currentCount + 1}`
        };
        setStagedPhotos((prev) => [...prev, newPhoto]);
        setActivePreviewIndex(stagedPhotos.length);
        if (!keepCameraOpen) {
          stopWebcam();
        }
      }
    }, 'image/jpeg', 0.95);
  };

  const handleAnalyze = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      setError("Please designate a target class and subject in the session parameters.");
      return;
    }
    if (stagedPhotos.length === 0) {
      setError("Stage at least one classroom photograph before running analysis.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const filesToSend = await Promise.all(
        stagedPhotos.map((p) => compressClassroomPhoto(p.file))
      );
      const res = await AttendanceService.analyzePhotos(selectedClassId, selectedSubjectId, filesToSend);
      
      const now = new Date();
      const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      onAnalysisComplete(res, {
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        date,
        startTime
      });

      navigate('/review-attendance');
    } catch (err: any) {
      console.error("Analysis failed", err);
      setError(extractErrorMessage(err, "Recognition pipeline encountered an issue. Ensure photos have sufficient lighting and try again."));
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-2 text-[var(--text-primary)] pb-12 transition-colors font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            Take Classroom Attendance
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
              Deep Neural Scanner
            </span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Upload or capture multi-angle classroom photographs • Deep face detection & enrollment matching
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || stagedPhotos.length === 0}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg ${
              stagedPhotos.length > 0 && !analyzing
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 active:scale-[0.99] shadow-emerald-500/20'
                : 'bg-[var(--bg-inset)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-color)]'
            }`}
            type="button"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Marking Attendance with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Mark Attendance ({stagedPhotos.length} Photo{stagedPhotos.length !== 1 ? 's' : ''})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Section 1: Session Parameters Cockpit ── */}
      <div className="swiss-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">01 //</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Class & Subject Parameters</span>
          </div>
          <span className="text-xs text-[var(--text-secondary)] font-mono">Step 1 of 2</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Academic Class Cohort
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-medium focus:outline-none focus:border-emerald-500 transition-all"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section} ({c.academic_year})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Subject / Course
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
              className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-medium focus:outline-none focus:border-emerald-500 transition-all"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Lecture Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-medium focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Photo Capture & Staging Studio ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Ingestion Studio (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="swiss-card p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-cyan-400">02 //</span>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Stage Classroom Photos</span>
              </div>
              <div className="flex items-center gap-2">
                {isWebcamActive ? (
                  <button
                    onClick={stopWebcam}
                    className="text-xs text-rose-500 font-semibold transition-colors"
                  >
                    Close Camera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startWebcam()}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-cyan-400 hover:underline font-semibold transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Open Live Camera</span>
                  </button>
                )}
              </div>
            </div>

            {/* Webcam Live Viewfinder */}
            {isWebcamActive ? (
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/40 aspect-[16/10] flex flex-col items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                />
                <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>Optical Stream Live ({facingMode === 'user' ? 'Front Camera' : 'Auditorium/Rear Camera'})</span>
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="p-2 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                    title="Switch camera"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="text-[10px] hidden sm:inline">Flip Camera</span>
                  </button>
                </div>

                <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => captureWebcamFrame(false)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture & Close</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => captureWebcamFrame(true)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-cyan-300 hover:text-white font-semibold text-xs shadow-md hover:bg-slate-850 active:scale-95 transition-all flex items-center gap-1.5"
                    title="Capture photo and keep camera open for multiple angles"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Angle</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Drag & Drop Upload Zone */
              <div className="relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-[var(--border-color)] hover:border-blue-500 bg-[var(--bg-inset)] transition-all cursor-pointer text-center group">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Drop classroom photo(s) here or browse</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Select one or multiple photos (Left, Center, Right Wing)</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Staged Photos Gallery (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="swiss-card p-6 rounded-3xl flex flex-col h-full">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Staged Photos ({stagedPhotos.length})
              </span>
              {stagedPhotos.length > 0 && (
                <button
                  onClick={clearAllPhotos}
                  className="text-xs text-rose-500 font-semibold transition-colors hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {stagedPhotos.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--text-muted)]">
                <Camera className="w-8 h-8 text-[var(--text-muted)] mb-2" />
                <p className="font-semibold text-[var(--text-primary)]">No photos staged yet</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Capture or upload photos to review them here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-4 overflow-y-auto max-h-[360px] pr-1">
                {stagedPhotos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="relative rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-inset)] aspect-[4/3] group shadow-md"
                  >
                    <img
                      src={photo.previewUrl}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <span>#{idx + 1} {photo.label}</span>
                      <button
                        onClick={() => removeStagedPhoto(photo.id)}
                        className="p-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
