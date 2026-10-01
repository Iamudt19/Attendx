import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, Upload, Calendar, BookOpen, AlertCircle, 
  CheckCircle2, Sparkles, RefreshCw, Video, Plus, Trash2, Image as ImageIcon, Layers
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
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        newItems.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          source: 'upload'
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
      e.target.value = ''; // Reset input so re-uploading same file triggers change
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

  // Attach stream to video element whenever active
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
        ? "Camera permission denied. Please allow camera access in your browser settings and try again."
        : (err as DOMException).name === 'NotFoundError'
        ? "No camera device found. Please connect a camera and try again."
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

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `webcam_snap_${stagedPhotos.length + 1}.jpg`, { type: 'image/jpeg' });
        const newPhoto: StagedPhoto = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          source: 'webcam'
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
      setError("Please take or upload at least one classroom image.");
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
      setError(err.response?.data?.detail || "No faces were detected or face recognition service failed. Please try again with clearer classroom photographs.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Camera className="w-6 h-6 text-blue-500" />
          Take Attendance
        </h1>
        <p className="text-slate-400 text-sm">
          Cover entire classroom by capturing or uploading multiple angle photos (Left, Center, Right, Back Rows).
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Selection Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
            Select Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section} ({c.academic_year})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
            Select Subject
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
            Session Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Classroom Multi-Angle Capture Guidelines */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          Multi-Angle Classroom Coverage Advice
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold">1.</span>
            <span>Snap <strong>Left Wing</strong> benches</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold">2.</span>
            <span>Snap <strong>Center Rows</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold">3.</span>
            <span>Snap <strong>Right Wing</strong> benches</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold">4.</span>
            <span>Snap <strong>Back Benches</strong></span>
          </div>
        </div>
      </div>

      {/* Step 2: Camera Capture / Upload Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Classroom Photographs</h2>
            {stagedPhotos.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
                {stagedPhotos.length} {stagedPhotos.length === 1 ? 'photo' : 'photos'} staged
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isWebcamActive ? (
              <button
                type="button"
                onClick={startWebcam}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Video className="w-4 h-4 text-blue-400" />
                Live Camera Snap
              </button>
            ) : (
              <button
                type="button"
                onClick={stopWebcam}
                className="px-3 py-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded-lg text-xs font-semibold border border-rose-500/30 transition-colors"
              >
                Close Camera
              </button>
            )}
          </div>
        </div>

        {/* Display Live Webcam Video if active */}
        {isWebcamActive && (
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center border border-slate-700 shadow-2xl">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white border border-white/20 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Live Camera Feed • Pan to capture different sections of the classroom
            </div>
            <div className="absolute bottom-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => captureWebcamPhoto(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-full shadow-xl flex items-center gap-2 transition-transform active:scale-95"
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

        {/* Staged Photos Gallery & Active Preview */}
        {stagedPhotos.length > 0 && (
          <div className="space-y-3">
            {/* Active Selected Preview */}
            <div className="relative rounded-xl overflow-hidden bg-black/60 border border-slate-800">
              <img
                src={stagedPhotos[activePreviewIndex]?.previewUrl}
                alt={`Photo ${activePreviewIndex + 1}`}
                className="w-full max-h-[400px] object-contain block mx-auto"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700 text-white text-xs font-bold">
                Viewing Photo #{activePreviewIndex + 1} of {stagedPhotos.length}
              </div>
              <button
                type="button"
                onClick={() => removeStagedPhoto(stagedPhotos[activePreviewIndex]?.id)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white shadow-lg transition-all"
                title="Remove this photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Thumbnail Strip */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center gap-3 overflow-x-auto">
              <span className="text-[11px] uppercase font-bold text-slate-400 shrink-0 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Photos:
              </span>

              {stagedPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  onClick={() => setActivePreviewIndex(idx)}
                  className={`relative shrink-0 w-20 h-14 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                    activePreviewIndex === idx
                      ? 'border-blue-500 ring-2 ring-blue-500/40 scale-105'
                      : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={photo.previewUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-white text-center font-bold py-0.5">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStagedPhoto(photo.id);
                    }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600/90 text-white flex items-center justify-center text-[10px] hover:bg-rose-500"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Add More Photos Card in Strip */}
              <label className="shrink-0 w-20 h-14 rounded-lg border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-900/50 hover:bg-slate-900 flex flex-col items-center justify-center cursor-pointer transition-all text-slate-400 hover:text-blue-400">
                <Plus className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] font-bold uppercase">Add Photo</span>
                <input type="file" accept="image/*" multiple onChange={handleFileInputChange} className="hidden" />
              </label>

              {stagedPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={clearAllPhotos}
                  className="ml-auto text-[11px] text-rose-400 hover:text-rose-300 font-semibold shrink-0"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        )}

        {/* Default Upload Dropzone if no webcam & no staged photos */}
        {!isWebcamActive && stagedPhotos.length === 0 && (
          <label className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/80">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white mb-1">Upload Classroom Images</p>
            <p className="text-xs text-slate-400 text-center max-w-sm">
              Select one or multiple classroom photographs (Left, Center, Right wings, Back rows) to cover every student. Supports JPG, PNG, WEBP.
            </p>
            <input type="file" accept="image/*" multiple onChange={handleFileInputChange} className="hidden" />
          </label>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing || stagedPhotos.length === 0}
          className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin text-blue-200" />
              <span>Analyzing {stagedPhotos.length} Classroom Photo{stagedPhotos.length > 1 ? 's' : ''} with AI...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>
                Process & Detect Registered Students
                {stagedPhotos.length > 0 ? ` (${stagedPhotos.length} photo${stagedPhotos.length > 1 ? 's' : ''})` : ''}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

