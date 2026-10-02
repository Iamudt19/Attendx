import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, Upload, Calendar, BookOpen, AlertCircle, 
  CheckCircle2, Sparkles, RefreshCw, Video, Plus, Trash2, 
  Layers, Users, Info, ChevronRight, Zap, Check, ArrowRight, ShieldCheck
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
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      {/* ── Above-the-Fold Context Banner ── */}
      <div className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Multi-Angle Classroom Scan</span>
            </div>
            
            <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 font-normal tracking-tight">
              Classroom Attendance Verification.
            </h1>
            
            <p className="text-sm text-slate-600 leading-relaxed">
              Capture or upload multi-section classroom photographs. AttendX will concurrently isolate, embed, and identify students across all views.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2">
            <div className="bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between gap-4">
              <span className="text-slate-500 font-medium">Active Cohort:</span>
              <span className="text-slate-900 font-bold">{selectedClass ? `${selectedClass.name} ${selectedClass.section}` : 'None Selected'}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between gap-4">
              <span className="text-slate-500 font-medium">Enrolled Roster:</span>
              <span className="text-blue-600 font-bold">{selectedClass?.student_count ?? 0} Students</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 font-semibold text-xs">Dismiss</button>
        </div>
      )}

      {/* ── Section 1: Session Cockpit ── */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600">01 //</span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900">Session Parameters</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">Step 1 of 2</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Class Cohort
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section} — {c.academic_year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Course / Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Session Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Optical Capture Studio ── */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600">02 //</span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">Classroom Photography</span>
              <span className="text-xs text-slate-500 ml-2 hidden sm:inline">— Stage 1 to 4 section views for complete coverage</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isWebcamActive ? (
              <button
                type="button"
                onClick={startWebcam}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Video className="w-3.5 h-3.5 text-blue-600" />
                <span>Live Camera</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopWebcam}
                className="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold border border-rose-200 transition-colors"
              >
                Close Camera
              </button>
            )}
          </div>
        </div>

        {/* Live Camera Viewfinder */}
        {isWebcamActive && (
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex flex-col items-center justify-center border border-slate-800 shadow-lg">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            
            <div className="absolute bottom-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => captureWebcamPhoto(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-xl flex items-center gap-2 transition-transform active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Capture & Add Section</span>
              </button>
              <button
                type="button"
                onClick={() => captureWebcamPhoto(false)}
                className="px-4 py-2.5 bg-white text-slate-900 font-semibold text-xs rounded-xl hover:bg-slate-100"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Staged Section Gallery */}
        {stagedPhotos.length > 0 && !isWebcamActive && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 max-h-[400px] flex items-center justify-center shadow-inner">
              <img
                src={stagedPhotos[activePreviewIndex]?.previewUrl}
                alt={`Photo ${activePreviewIndex + 1}`}
                className="w-full max-h-[400px] object-contain block mx-auto select-none"
              />
              <div className="absolute top-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-md border border-white/10 text-white text-xs font-semibold rounded-lg flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                <span>PHOTO #{activePreviewIndex + 1} — {stagedPhotos[activePreviewIndex]?.label || 'SECTION'}</span>
              </div>
              <button
                type="button"
                onClick={() => removeStagedPhoto(stagedPhotos[activePreviewIndex]?.id)}
                className="absolute top-3 right-3 p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow transition-all"
                title="Remove photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Filmstrip View */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3 overflow-x-auto">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
                Staged ({stagedPhotos.length}):
              </div>

              {stagedPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  onClick={() => setActivePreviewIndex(idx)}
                  className={`relative shrink-0 w-24 h-16 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                    activePreviewIndex === idx
                      ? 'border-blue-600 shadow-md scale-105'
                      : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={photo.previewUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] font-semibold text-white text-center py-0.5 truncate px-1">
                    {photo.label || `#${idx + 1}`}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStagedPhoto(photo.id);
                    }}
                    className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white flex items-center justify-center text-[10px] rounded-full hover:bg-rose-500"
                  >
                    ×
                  </button>
                </div>
              ))}

              <label className="shrink-0 w-24 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white flex flex-col items-center justify-center cursor-pointer transition-all text-slate-500 hover:text-blue-600">
                <Plus className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] font-semibold uppercase">+ Add</span>
                <input type="file" accept="image/*" multiple onChange={handleFileInputChange} className="hidden" />
              </label>

              {stagedPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={clearAllPhotos}
                  className="ml-auto text-xs font-semibold text-rose-600 hover:text-rose-700 shrink-0 px-2"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        )}

        {/* Multi-Section File Dropzone */}
        {!isWebcamActive && stagedPhotos.length === 0 && (
          <label className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50/50 hover:bg-blue-50/30 group">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-slate-900 mb-1">Select or Drop Classroom Photographs</p>
            <p className="text-xs text-slate-500 text-center max-w-md">
              Upload section views (Left Wing, Center Rows, Right Wing, Rear Tier) to capture every student in large lecture halls.
            </p>
            <span className="mt-4 px-5 py-2 bg-white group-hover:bg-blue-600 text-slate-700 group-hover:text-white rounded-xl text-xs font-semibold border border-slate-200 transition-all shadow-sm">
              Browse Files
            </span>
            <input type="file" accept="image/*" multiple onChange={handleFileInputChange} className="hidden" />
          </label>
        )}
      </div>

      {/* ── Section 3: High-Prominence Action HUD ── */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-600 rounded-full" />
            <span>Multi-Face Neural Recognition</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {stagedPhotos.length === 0
              ? 'Stage classroom views above to enable multi-threaded recognition.'
              : `${stagedPhotos.length} section view${stagedPhotos.length > 1 ? 's' : ''} staged • SFace 128-D cosine correlation.`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing || stagedPhotos.length === 0}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            stagedPhotos.length > 0 && !analyzing
              ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-md shadow-blue-500/25 active:scale-[0.99]'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          }`}
        >
          {analyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Processing {stagedPhotos.length} Photo{stagedPhotos.length > 1 ? 's' : ''}...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>
                {stagedPhotos.length > 0
                  ? `Initiate Attendance (${stagedPhotos.length} Photo${stagedPhotos.length > 1 ? 's' : ''})`
                  : 'Stage Photos to Proceed'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
