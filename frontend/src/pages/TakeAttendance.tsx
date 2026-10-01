import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, Upload, Calendar, BookOpen, AlertCircle, 
  CheckCircle2, Sparkles, RefreshCw, Video, Plus, Trash2, 
  Layers, Users, Info, ChevronRight, Zap, Check, ArrowRight, ShieldCheck, HelpCircle
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      const next = prev.filter((p) => p.id !== id);
      if (activePreviewIndex >= next.length) {
        setActivePreviewIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const clearAllPhotos = () => {
    setStagedPhotos([]);
    setActivePreviewIndex(0);
  };

  useEffect(() => {
    if (isWebcamActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isWebcamActive]);

  const startWebcam = async () => {
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera API is unavailable. Please ensure your browser has camera permissions enabled over HTTPS.");
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'environment' }
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      setIsWebcamActive(true);

      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err: any) {
      console.error("Webcam access error:", err);
      const msg = (err as DOMException).name === 'NotAllowedError'
        ? "Camera permission denied in browser settings."
        : "Camera device not accessible. You can upload photo files directly.";
      setError(msg);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  const captureWebcamPhoto = (keepCameraOpen = true) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sectionTags = ['Left Wing', 'Center Rows', 'Right Wing', 'Rear Tier', 'Section 5'];
    const currentCount = stagedPhotos.length;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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
      setError("Please designate a target class and subject in the session console.");
      return;
    }
    if (stagedPhotos.length === 0) {
      setError("Stage at least one classroom photograph before running analysis.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Fast high-accuracy parallel compression (reduces upload payload by 90%+ in ~100ms)
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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Above-the-Fold Context & Mission Statement ── */}
      <div className="surface-card rounded-xl p-6 relative overflow-hidden border border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-blue-400">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              <span>AttendX Neural Vision System</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">Facial Biometrics & Roll Engine</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              Classroom Attendance Verification
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Designed for faculty managing <strong>30 to 100+ student cohorts</strong>. Captures and correlates multi-section photographs in parallel, eliminating 15 minutes of manual roll call while preventing proxy fraud.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2.5">
            <div className="bg-[#080C14] border border-white/10 px-4 py-2.5 rounded-lg text-xs font-mono flex items-center justify-between gap-4">
              <span className="text-slate-400">Active Cohort</span>
              <span className="text-white font-bold">{selectedClass ? `${selectedClass.name} ${selectedClass.section}` : 'None Selected'}</span>
            </div>
            <div className="bg-[#080C14] border border-white/10 px-4 py-2.5 rounded-lg text-xs font-mono flex items-center justify-between gap-4">
              <span className="text-slate-400">Enrolled Students</span>
              <span className="text-emerald-400 font-bold">{selectedClass?.student_count ?? 0} Registered</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white font-mono text-[11px]">DISMISS</button>
        </div>
      )}

      {/* ── Section 1: Session Cockpit ── */}
      <div className="surface-card rounded-xl p-5 border border-white/10 space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-blue-400 font-bold">01 //</span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Session Parameters</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">STEP 1 OF 2</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-mono uppercase text-slate-400">
              Class Cohort
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full bg-[#080C14] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section} — {c.academic_year}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-mono uppercase text-slate-400">
              Course / Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
              className="w-full bg-[#080C14] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-mono uppercase text-slate-400">
              Session Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#080C14] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Optical Capture Studio ── */}
      <div className="surface-card rounded-xl p-5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-blue-400 font-bold">02 //</span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Optical Classroom Capture</span>
              <span className="text-[11px] text-slate-400 ml-2 hidden sm:inline">— Stage 2 to 4 section views for class-wide coverage</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isWebcamActive ? (
              <button
                type="button"
                onClick={startWebcam}
                className="px-3 py-1.5 bg-[#121927] hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-medium border border-white/10 flex items-center gap-1.5 transition-colors"
              >
                <Video className="w-3.5 h-3.5 text-blue-400" />
                Live Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopWebcam}
                className="px-3 py-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded-lg text-xs font-medium border border-rose-500/30 transition-colors"
              >
                Close Camera
              </button>
            )}
          </div>
        </div>

        {/* Live Camera Viewfinder */}
        {isWebcamActive && (
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center border border-white/20">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            
            {/* Viewfinder crosshairs */}
            <div className="absolute top-4 left-4 border-t-2 border-l-2 border-white/40 w-6 h-6"></div>
            <div className="absolute top-4 right-4 border-t-2 border-r-2 border-white/40 w-6 h-6"></div>
            <div className="absolute bottom-4 left-4 border-b-2 border-l-2 border-white/40 w-6 h-6"></div>
            <div className="absolute bottom-4 right-4 border-b-2 border-r-2 border-white/40 w-6 h-6"></div>

            <div className="absolute bottom-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => captureWebcamPhoto(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-xl flex items-center gap-2 transition-transform active:scale-95"
              >
                <Camera className="w-4 h-4" />
                Capture & Add Another Section
              </button>
              <button
                type="button"
                onClick={() => captureWebcamPhoto(false)}
                className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-white font-medium text-xs rounded-lg border border-white/20"
              >
                Capture & Complete
              </button>
            </div>
          </div>
        )}

        {/* Staged Section Gallery */}
        {stagedPhotos.length > 0 && !isWebcamActive && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black/80 border border-white/10 max-h-[400px] flex items-center justify-center">
              <img
                src={stagedPhotos[activePreviewIndex]?.previewUrl}
                alt={`Photo ${activePreviewIndex + 1}`}
                className="w-full max-h-[400px] object-contain block mx-auto select-none"
              />
              <div className="absolute top-3 left-3 px-3 py-1 bg-black/80 border border-white/10 text-white text-xs font-mono rounded flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                <span>PHOTO #{activePreviewIndex + 1} — {stagedPhotos[activePreviewIndex]?.label || 'SECTION'}</span>
              </div>
              <button
                type="button"
                onClick={() => removeStagedPhoto(stagedPhotos[activePreviewIndex]?.id)}
                className="absolute top-3 right-3 p-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded shadow transition-all"
                title="Remove photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Filmstrip View */}
            <div className="p-3 bg-[#080C14] rounded-lg border border-white/[0.08] flex items-center gap-3 overflow-x-auto">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Staged ({stagedPhotos.length}):
              </div>

              {stagedPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  onClick={() => setActivePreviewIndex(idx)}
                  className={`relative shrink-0 w-24 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    activePreviewIndex === idx
                      ? 'border-blue-500 shadow-md scale-102'
                      : 'border-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={photo.previewUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] font-mono text-white text-center py-0.5 truncate px-1">
                    {photo.label || `#${idx + 1}`}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStagedPhoto(photo.id);
                    }}
                    className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white flex items-center justify-center text-[10px] rounded hover:bg-rose-500"
                  >
                    ×
                  </button>
                </div>
              ))}

              <label className="shrink-0 w-24 h-16 rounded-lg border border-dashed border-white/20 hover:border-blue-500 bg-slate-900/40 hover:bg-slate-900 flex flex-col items-center justify-center cursor-pointer transition-all text-slate-400 hover:text-blue-400">
                <Plus className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] font-mono uppercase">+ Add View</span>
                <input type="file" accept="image/*" multiple onChange={handleFileInputChange} className="hidden" />
              </label>

              {stagedPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={clearAllPhotos}
                  className="ml-auto text-xs font-mono text-rose-400 hover:text-rose-300 shrink-0 px-2"
                >
                  CLEAR ALL
                </button>
              )}
            </div>
          </div>
        )}

        {/* Multi-Section File Dropzone */}
        {!isWebcamActive && stagedPhotos.length === 0 && (
          <label className="border border-dashed border-white/20 hover:border-blue-500/80 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-[#080C14] hover:bg-[#0C121E] group">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white mb-1">Select or Drop Classroom Photographs</p>
            <p className="text-xs text-slate-400 text-center max-w-md">
              Upload section views (Left Wing, Center Rows, Right Wing, Rear Tier) to capture every student in large lecture halls.
            </p>
            <span className="mt-4 px-4 py-1.5 bg-[#121927] group-hover:bg-blue-600 text-slate-200 group-hover:text-white rounded-lg text-xs font-semibold border border-white/10 transition-all">
              Choose Files
            </span>
            <input type="file" accept="image/*" multiple onChange={handleFileInputChange} className="hidden" />
          </label>
        )}
      </div>

      {/* ── Section 3: High-Prominence Action HUD ── */}
      <div className="surface-card rounded-xl p-4 sm:p-5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>Execution Protocol</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {stagedPhotos.length === 0
              ? 'Stage classroom views above to enable multi-threaded recognition.'
              : `${stagedPhotos.length} section view${stagedPhotos.length > 1 ? 's' : ''} loaded • Vectorized matrix cosine match with margin verification.`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing || stagedPhotos.length === 0}
          className={`w-full sm:w-auto px-8 py-3 rounded-lg text-xs sm:text-sm font-bold tracking-wide uppercase flex items-center justify-center gap-2 transition-all ${
            stagedPhotos.length > 0 && !analyzing
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 cursor-pointer active:scale-98'
              : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
          }`}
        >
          {analyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-blue-200" />
              <span>Processing {stagedPhotos.length} Section Photo{stagedPhotos.length > 1 ? 's' : ''}...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>
                {stagedPhotos.length > 0
                  ? `Initiate Recognition (${stagedPhotos.length} View${stagedPhotos.length > 1 ? 's' : ''})`
                  : 'Stage Photos to Proceed'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

