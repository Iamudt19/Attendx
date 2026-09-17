import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, Upload, Calendar, BookOpen, AlertCircle, 
  CheckCircle2, Sparkles, RefreshCw, Video 
} from 'lucide-react';
import { ClassService, SubjectService, AttendanceService } from '../services/api';
import { ClassItem, SubjectItem } from '../types';

interface TakeAttendanceProps {
  onAnalysisComplete: (resultData: any, sessionContext: { classId: number; subjectId: number; date: string; startTime: string }) => void;
}

export const TakeAttendance: React.FC<TakeAttendanceProps> = ({ onAnalysisComplete }) => {
  const navigate = useNavigate();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      stopWebcam();
    }
  };

  // Attach stream to video element whenever the video element becomes available
  useEffect(() => {
    if (isWebcamActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isWebcamActive]);

  const startWebcam = async () => {
    setError(null);

    // Check if mediaDevices API is available (requires HTTPS or localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera API not available. Make sure you are accessing this page over HTTPS or localhost.");
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' }
        });
      } catch (e) {
        // Fallback: any camera without constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      setSelectedFile(null);
      setImagePreview(null);
      // Set active AFTER storing stream so the useEffect can attach it
      setIsWebcamActive(true);

      // Also attempt direct attachment after a small delay for the DOM to render
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
        : "Camera unavailable. You can alternatively upload a classroom photograph.";
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

  const captureWebcamPhoto = () => {
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
        const file = new File([blob], `webcam_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        setImagePreview(URL.createObjectURL(file));
        stopWebcam();
      }
    }, 'image/jpeg', 0.95);
  };

  const handleAnalyze = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      setError("Please select both a Class and a Subject.");
      return;
    }
    if (!selectedFile) {
      setError("Please take a webcam photo or upload a classroom image.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const res = await AttendanceService.analyzePhoto(selectedClassId, selectedSubjectId, selectedFile);
      
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
      setError(err.response?.data?.detail || "No faces were detected or face recognition service failed. Please try again with a clearer classroom photograph.");
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
          Select class parameters and capture/upload a classroom photograph for AI face detection.
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

      {/* Classroom Capture Guidelines Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          Best Practices for Accurate Attendance Capture
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Stand at the back or center of the room</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Ensure all students are in frame</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Avoid harsh backlight / window glare</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Ensure faces are not occluded</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Hold camera steady for sharp focus</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>High resolution photo (1080p+)</span>
          </div>
        </div>
      </div>

      {/* Step 2: Camera Capture / Upload Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Classroom Photograph</h2>
          <div className="flex items-center gap-2">
            {!isWebcamActive ? (
              <button
                type="button"
                onClick={startWebcam}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Video className="w-4 h-4 text-blue-400" />
                Use Live Camera
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
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center border border-slate-700">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={captureWebcamPhoto}
              className="absolute bottom-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-full shadow-xl flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Capture Photo
            </button>
          </div>
        )}

        {/* Display Image Preview if captured/uploaded */}
        {imagePreview && !isWebcamActive && (
          <div className="relative rounded-xl overflow-hidden bg-black/40 border border-slate-800">
            <img src={imagePreview} alt="Selected Preview" className="w-full max-h-[420px] object-contain block mx-auto" />
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 truncate max-w-xs">{selectedFile?.name}</span>
              <label className="text-xs text-blue-400 hover:underline cursor-pointer font-semibold">
                Change Image
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* Default Upload Dropzone if no webcam & no image preview */}
        {!isWebcamActive && !imagePreview && (
          <label className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/80">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white mb-1">Upload Classroom Image</p>
            <p className="text-xs text-slate-400 text-center max-w-sm">
              Click to select a high-resolution classroom photo or drop it here. Supports JPG, PNG, WEBP.
            </p>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing || !selectedFile}
          className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin text-blue-200" />
              <span>Running Face Recognition AI Pipeline...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Process & Detect Registered Students</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
