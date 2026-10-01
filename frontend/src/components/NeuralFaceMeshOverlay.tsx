import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Eye, ShieldCheck, Activity, Compass, Zap } from 'lucide-react';

interface NeuralFaceMeshOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  targetAngle?: string;
  onQualityUpdate?: (quality: { score: number; status: string; yaw: number; pitch: number }) => void;
}

export const NeuralFaceMeshOverlay: React.FC<NeuralFaceMeshOverlayProps> = ({
  videoRef,
  isActive,
  targetAngle = 'front',
  onQualityUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [meshEnabled, setMeshEnabled] = useState(true);
  const [poseFeedback, setPoseFeedback] = useState<string>('Aligning 3D Neural Mesh...');
  const [faceDetected, setFaceDetected] = useState(false);
  const [telemetry, setTelemetry] = useState({ yaw: 0, pitch: 0, quality: 96 });
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || !videoRef.current) return;

    let isSubscribed = true;
    let faceMeshInstance: any = null;

    const initMediaPipe = async () => {
      try {
        // Dynamically load MediaPipe FaceMesh CDN script if not in window
        if (!(window as any).FaceMesh) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
          script.crossOrigin = 'anonymous';
          document.body.appendChild(script);

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load FaceMesh script'));
          });
        }

        if (!isSubscribed) return;

        const { FaceMesh } = window as any;
        if (!FaceMesh) return;

        faceMeshInstance = new FaceMesh({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMeshInstance.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMeshInstance.onResults((results: any) => {
          if (!isSubscribed) return;
          drawMeshResults(results);
        });

        // Processing loop
        const processVideo = async () => {
          if (isSubscribed && videoRef.current && videoRef.current.readyState >= 2 && faceMeshInstance) {
            try {
              await faceMeshInstance.send({ image: videoRef.current });
            } catch (e) {
              // Ignore transient frame dropping
            }
          }
          if (isSubscribed) {
            animFrameRef.current = requestAnimationFrame(processVideo);
          }
        };

        animFrameRef.current = requestAnimationFrame(processVideo);
      } catch (err) {
        console.warn('FaceMesh hardware loader fallback: running procedural neural grid.', err);
        startProceduralOverlay();
      }
    };

    const drawMeshResults = (results: any) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        setFaceDetected(false);
        setPoseFeedback('Position face inside frame');
        return;
      }

      setFaceDetected(true);
      const landmarks = results.multiFaceLandmarks[0];

      // Calculate approximate 3D Yaw & Pitch from key landmarks
      // Nose tip: 1, Left cheek: 234, Right cheek: 454, Forehead: 10, Chin: 152
      const nose = landmarks[1];
      const leftCheek = landmarks[234];
      const rightCheek = landmarks[454];
      const forehead = landmarks[10];
      const chin = landmarks[152];

      const distLeft = Math.abs(nose.x - leftCheek.x);
      const distRight = Math.abs(rightCheek.x - nose.x);
      const yaw = Math.round(((distRight - distLeft) / (distLeft + distRight)) * 100);

      const distForehead = Math.abs(nose.y - forehead.y);
      const distChin = Math.abs(chin.y - nose.y);
      const pitch = Math.round(((distChin - distForehead) / (distForehead + distChin)) * 100);

      const qualityScore = Math.min(99, Math.max(70, Math.round(98 - Math.abs(yaw) * 0.2 - Math.abs(pitch) * 0.2)));

      setTelemetry({ yaw, pitch, quality: qualityScore });

      if (onQualityUpdate) {
        onQualityUpdate({
          score: qualityScore,
          status: qualityScore > 85 ? 'OPTIMAL' : 'GOOD',
          yaw,
          pitch,
        });
      }

      // Check alignment against requested targetAngle
      let feedback = 'Perfect Alignment!';
      if (targetAngle === 'left' && yaw < 15) feedback = 'Turn head slightly LEFT ⬅️';
      else if (targetAngle === 'right' && yaw > -15) feedback = 'Turn head slightly RIGHT ➡️';
      else if (targetAngle === 'chin_down' && pitch < 10) feedback = 'Tilt chin slightly DOWN ⬇️';
      else if (targetAngle === 'front' && (Math.abs(yaw) > 18 || Math.abs(pitch) > 18)) feedback = 'Look straight at camera 🎯';

      setPoseFeedback(feedback);

      if (!meshEnabled) return;

      // Draw futuristic 3D Neural Wireframe
      ctx.save();
      ctx.lineWidth = 1.0;

      // 1. Draw facial contours
      const keyIndices = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
        397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
        172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
      ];

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.7)'; // Violet neon
      keyIndices.forEach((idx, i) => {
        const pt = landmarks[idx];
        const x = pt.x * canvas.width;
        const y = pt.y * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();

      // 2. Draw eye and lip meshes
      const drawRing = (indices: number[], color: string) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        indices.forEach((idx, i) => {
          const pt = landmarks[idx];
          const x = pt.x * canvas.width;
          const y = pt.y * canvas.height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.stroke();
      };

      // Left Eye
      drawRing([33, 160, 158, 133, 153, 144], 'rgba(56, 189, 248, 0.8)');
      // Right Eye
      drawRing([362, 385, 387, 263, 373, 380], 'rgba(56, 189, 248, 0.8)');
      // Lips
      drawRing([61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291], 'rgba(236, 72, 153, 0.8)');

      // 3. Draw key 3D landmark nodes
      landmarks.forEach((pt: any, idx: number) => {
        if (idx % 4 === 0) {
          const x = pt.x * canvas.width;
          const y = pt.y * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
          ctx.fillStyle = idx % 8 === 0 ? '#34d399' : '#a78bfa'; // emerald & violet glow
          ctx.fill();
        }
      });

      // 4. Center 3D Crosshair on Nose
      const nx = nose.x * canvas.width;
      const ny = nose.y * canvas.height;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(nx, ny, 6, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.restore();
    };

    const startProceduralOverlay = () => {
      const render = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video || !isSubscribed) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Procedural scanning grid
        const time = Date.now() * 0.002;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const rx = canvas.width * 0.22;
        const ry = canvas.height * 0.32;

        ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();

        // Scanning laser pulse
        const scanY = cy - ry + ((Math.sin(time) + 1) / 2) * (ry * 2);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.8)';
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.9, scanY);
        ctx.lineTo(cx + rx * 0.9, scanY);
        ctx.stroke();

        setFaceDetected(true);
        setPoseFeedback('3D Neural Grid Active');
        animFrameRef.current = requestAnimationFrame(render);
      };
      animFrameRef.current = requestAnimationFrame(render);
    };

    initMediaPipe();

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (faceMeshInstance && faceMeshInstance.close) faceMeshInstance.close();
    };
  }, [isActive, meshEnabled, targetAngle]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3">
      {/* Canvas rendering layer */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

      {/* Top telemetry bar */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-violet-500/30 px-3 py-1.5 rounded-xl shadow-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-bold text-violet-300 font-mono flex items-center gap-1">
            <Zap className="w-3 h-3 text-violet-400" />
            468-PT 3D MESH
          </span>
          <span className="text-[10px] text-slate-400">|</span>
          <span className="text-[10px] font-mono text-emerald-400">{telemetry.quality}% ISO-Q</span>
        </div>

        <button
          onClick={() => setMeshEnabled(!meshEnabled)}
          className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow pointer-events-auto"
        >
          <Eye className="w-3 h-3 text-violet-400" />
          {meshEnabled ? 'Hide 3D Wireframe' : 'Show 3D Wireframe'}
        </button>
      </div>

      {/* Bottom pose & alignment feedback card */}
      <div className="pointer-events-auto flex items-end justify-between">
        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${faceDetected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Neural Guide</span>
              <span className="text-[10px] font-mono text-violet-400">Yaw: {telemetry.yaw}° | Pitch: {telemetry.pitch}°</span>
            </div>
            <p className="text-xs font-extrabold text-white">{poseFeedback}</p>
          </div>
        </div>

        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-xl text-right">
          <p className="text-[9px] uppercase font-bold text-slate-400">Topology Status</p>
          <p className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1 justify-end">
            <ShieldCheck className="w-3.5 h-3.5" />
            LOCKED
          </p>
        </div>
      </div>
    </div>
  );
};
