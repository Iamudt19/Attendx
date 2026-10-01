import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, Upload, Calendar, BookOpen, AlertCircle, 
  CheckCircle2, Sparkles, RefreshCw, Video, Plus, Trash2, 
  Layers, Users, Info, ChevronDown, ChevronUp, Zap, Check, ArrowRight
} from 'lucide-react';
import { ClassService, SubjectService, AttendanceService } from '../services/api';
import { ClassItem, SubjectItem } from '../types';

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

  // Multiple staged photos list
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);

  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState<boolean>(false);

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
    const labels = ['Left Wing', 'Center Rows', 'Right Wing', 'Back Rows', 'Section 5', 'Section 6'];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const currentCount = stagedPhotos.length + newItems.length;
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          source: 'upload',
          label: labels[currentCount] || `Section ${currentCount + 1}`
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
      setError("Camera API not available. Make sure you are accessing this page over HTTPS or localhost.");
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
        ? "Camera permission denied. Please allow camera access in browser settings and try again."
        : (err as DOMException).name === 'NotFoundError'
        ? "No camera device found. Please connect a camera or upload photos."
        : "Camera unavailable. You can alternatively upload classroom photographs.";
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

    const labels = ['Left Wing', 'Center Rows', 'Right Wing', 'Back Rows', 'Section 5'];
    const currentCount = stagedPhotos.length;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `webcam_snap_${currentCount + 1}.jpg`, { type: 'image/jpeg' });
        const newPhoto: StagedPhoto = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          source: 'webcam',
          label: labels[currentCount] || `Section ${currentCount + 1}`
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
      setError("Please select both a Class and a Subject.");
      return;
    }
    if (stagedPhotos.length === 0) {
      setError("Please stage at least one classroom photograph.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const filesToSend = stagedPhotos.map((p) => p.file);
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
      setError(err.response?.data?.detail || "Face recognition service failed to process. Please ensure photos are clear and try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* ── Page Header with Stepper Breadcrumb ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Attendance Session</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            Take Attendance
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
              Multi-Section AI
            </span>
          </h1>
        </div>

        {/* Workflow steps indicator */}
        <div className="flex items-center gap-2 bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1.5 text-blue-400">
            <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-300 flex items-center justify-center text-[10px] font-bold">1</span>
            Scope
          </span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className={`flex items-center gap-1.5 ${stagedPhotos.length > 0 ? 'text-blue-400' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              stagedPhotos.length > 0 ? 'bg-blue-600/30 text-blue-300' : 'bg-slate-800 text-slate-500'
            }`}>2</span>
            Photos ({stagedPhotos.length})
          </span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-600 flex items-center justify-center text-[10px] font-bold">3</span>
            Review
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 text-xs font-bold">Dismiss</button>
        </div>
      )}

      {/* ── STEP 1: Session Scope (Class, Subject, Date) ── */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">1</div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Select Class & Subject</h2>
          </div>
          {selectedClass && (
            <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span><strong>{selectedClass.student_count ?? 0}</strong> Students Enrolled</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Class Selector */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Target Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700/80 hover:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.section} ({c.academic_year})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Subject / Course
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700/80 hover:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Session Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 hover:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ── STEP 2: Classroom Photograph Studio (Visual Hero Area) ── */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">2</div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Classroom Photographs</h2>
              <p className="text-[11px] text-slate-400">Capture 2–4 overlapping photos (Left, Center, Right, Back) for 98%+ accuracy in large halls.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isWebcamActive ? (
              <button
                type="button"
                onClick={startWebcam}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Video className="w-3.5 h-3.5 text-blue-400" />
                Live Camera Snap
              </button>
            ) : (
              <button
                type="button"
                onClick={stopWebcam}
                className="px-3.5 py-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded-xl text-xs font-semibold border border-rose-500/30 transition-all"
              >
                Close Camera
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowTips(!showTips)}
              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-xs border border-slate-700/80 transition-colors"
              title="Toggle Multi-Photo Tips"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Best Practice Tips Drawer */}
        {showTips && (
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center text-[10px] font-bold">1</span>
              <span><strong>Left Wing:</strong> Snap rows 1–8 left</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center text-[10px] font-bold">2</span>
              <span><strong>Center:</strong> Snap center aisle</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center text-[10px] font-bold">3</span>
              <span><strong>Right Wing:</strong> Snap rows 1–8 right</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center text-[10px] font-bold">4</span>
              <span><strong>Back Rows:</strong> Far back benches</span>
            </div>
          </div>
        )}

        {/* Live Webcam Stream View */}
        {isWebcamActive && (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center border-2 border-blue-500/40 shadow-2xl">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs text-white border border-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Live Camera • Pan to cover different classroom sections
            </div>
            <div className="absolute bottom-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => captureWebcamPhoto(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-full shadow-xl flex items-center gap-2 transition-transform active:scale-95"
              >
                <Camera className="w-4 h-4" />
                Capture & Add Another Section
              </button>
              <button
                type="button"
                onClick={() => captureWebcamPhoto(false)}
                className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white font-semibold text-xs rounded-full border border-slate-600 shadow-xl transition-all"
              >
                Capture & Done
              </button>
            </div>
          </div>
        )}

        {/* Staged Photos Filmstrip & Active Photo Preview */}
        {stagedPhotos.length > 0 && !isWebcamActive && (
          <div className="space-y-3">
            {/* Active Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-slate-800 max-h-[420px] flex items-center justify-center">
              <img
                src={stagedPhotos[activePreviewIndex]?.previewUrl}
                alt={`Photo ${activePreviewIndex + 1}`}
                className="w-full max-h-[420px] object-contain block mx-auto select-none"
              />
              <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-slate-950/90 backdrop-blur-md border border-slate-700 text-white text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Photo #{activePreviewIndex + 1} ({stagedPhotos[activePreviewIndex]?.label || 'Section'})</span>
              </div>
              <button
                type="button"
                onClick={() => removeStagedPhoto(stagedPhotos[activePreviewIndex]?.id)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white shadow-lg transition-all"
                title="Remove photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Filmstrip Bar */}
            <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center gap-3 overflow-x-auto">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider shrink-0 mr-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Staged ({stagedPhotos.length}):</span>
              </div>

              {stagedPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  onClick={() => setActivePreviewIndex(idx)}
                  className={`relative shrink-0 w-24 h-16 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                    activePreviewIndex === idx
                      ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-lg scale-105'
                      : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={photo.previewUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-sm text-[9px] text-white text-center font-bold py-0.5 truncate px-1">
                    {photo.label || `#${idx + 1}`}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStagedPhoto(photo.id);
                    }}
                    className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] hover:bg-rose-500 shadow-sm"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Add More Section Photo Trigger in Strip */}
              <label className="shrink-0 w-24 h-16 rounded-xl border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-900/60 hover:bg-slate-900 flex flex-col items-center justify-center cursor-pointer transition-all text-slate-400 hover:text-blue-400">
                <Plus className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">+ Add Photo</span>
                <input type="file" accept="image/*" multiple onChange={handleFileInputChange} className="hidden" />
              </label>

              {stagedPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={clearAllPhotos}
                  className="ml-auto text-xs text-rose-400 hover:text-rose-300 font-semibold shrink-0 px-2 py-1 rounded-lg hover:bg-rose-500/10"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty Dropzone when no photos staged & webcam closed */}
        {!isWebcamActive && stagedPhotos.length === 0 && (
          <label className="border-2 border-dashed border-slate-700/80 hover:border-blue-500/80 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950/50 hover:bg-slate-950/80 group">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/15 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/10">
              <Upload className="w-7 h-7" />
            </div>
            <p className="text-base font-bold text-white mb-1">Upload Classroom Photographs</p>
            <p className="text-xs text-slate-400 text-center max-w-md leading-relaxed">
              Select one or multiple section photos (Left Wing, Center, Right Wing, Back Rows) or drop them here.
            </p>
            <span className="mt-4 px-4 py-2 bg-slate-800 group-hover:bg-blue-600 text-slate-200 group-hover:text-white rounded-xl text-xs font-bold transition-all shadow-md">
              Browse Files
            </span>
            <input type="file" accept="image/*" multiple onChange={handleFileInputChange} className="hidden" />
          </label>
        )}
      </div>

      {/* ── STEP 3: High-Prominence Action Bar (Primary CTA) ── */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Ready for Recognition</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {stagedPhotos.length === 0
              ? 'Stage classroom photos above to activate AI recognition.'
              : `${stagedPhotos.length} photo${stagedPhotos.length > 1 ? 's' : ''} ready • Multi-thread parallel matching across enrolled database.`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing || stagedPhotos.length === 0}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-xl ${
            stagedPhotos.length > 0 && !analyzing
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02] cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
          }`}
        >
          {analyzing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin text-blue-200" />
              <span>Analyzing {stagedPhotos.length} Photo{stagedPhotos.length > 1 ? 's' : ''}...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>
                {stagedPhotos.length > 0
                  ? `Run Face Recognition (${stagedPhotos.length} Photo${stagedPhotos.length > 1 ? 's' : ''})`
                  : 'Stage Photos to Begin'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

