import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [poseFeedback, setPoseFeedback] = useState<string>('Center your face in the oval');
  const [faceDetected, setFaceDetected] = useState(false);
  const [telemetry, setTelemetry] = useState({ yaw: 0, pitch: 0, quality: 96 });
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || !videoRef.current) return;

    let isSubscribed = true;
    let faceMeshInstance: any = null;

    const initMediaPipe = async () => {
      try {
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
        if (!FaceMesh) { startProceduralOverlay(); return; }

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

        const processVideo = async () => {
          if (isSubscribed && videoRef.current && videoRef.current.readyState >= 2 && faceMeshInstance) {
            try { await faceMeshInstance.send({ image: videoRef.current }); } catch (_) {}
          }
          if (isSubscribed) animFrameRef.current = requestAnimationFrame(processVideo);
        };

        animFrameRef.current = requestAnimationFrame(processVideo);
      } catch (err) {
        console.warn('FaceMesh fallback: running procedural overlay.', err);
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

      // Always draw the oval guide
      drawOvalGuide(ctx, canvas.width, canvas.height);

      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        setFaceDetected(false);
        setPoseFeedback('Center your face in the oval');
        return;
      }

      setFaceDetected(true);
      const landmarks = results.multiFaceLandmarks[0];

      const nose      = landmarks[1];
      const leftCheek = landmarks[234];
      const rightCheek= landmarks[454];
      const forehead  = landmarks[10];
      const chin      = landmarks[152];

      const distLeft  = Math.abs(nose.x - leftCheek.x);
      const distRight = Math.abs(rightCheek.x - nose.x);
      const yaw   = Math.round(((distRight - distLeft) / (distLeft + distRight)) * 100);
      const distForehead = Math.abs(nose.y - forehead.y);
      const distChin     = Math.abs(chin.y - nose.y);
      const pitch = Math.round(((distChin - distForehead) / (distForehead + distChin)) * 100);
      const qualityScore = Math.min(99, Math.max(70, Math.round(98 - Math.abs(yaw) * 0.2 - Math.abs(pitch) * 0.2)));

      setTelemetry({ yaw, pitch, quality: qualityScore });
      if (onQualityUpdate) onQualityUpdate({ score: qualityScore, status: qualityScore > 85 ? 'OPTIMAL' : 'GOOD', yaw, pitch });

      let feedback = 'Good — hold still';
      if (targetAngle === 'left'      && yaw < 15)                        feedback = 'Turn head slightly LEFT ←';
      else if (targetAngle === 'right' && yaw > -15)                      feedback = 'Turn head slightly RIGHT →';
      else if (targetAngle === 'chin_down' && pitch < 10)                 feedback = 'Tilt chin slightly DOWN ↓';
      else if (targetAngle === 'front' && (Math.abs(yaw) > 18 || Math.abs(pitch) > 18)) feedback = 'Look straight at the camera';
      else if (targetAngle === 'smile')                                    feedback = 'Give a natural smile 😊';

      setPoseFeedback(feedback);

      if (!meshEnabled) return;

      // Draw minimal, clean face contour only
      ctx.save();
      ctx.lineWidth = 1;

      const keyIndices = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
        397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
        172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
      ];

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.45)';
      keyIndices.forEach((idx, i) => {
        const pt = landmarks[idx];
        const x = pt.x * canvas.width;
        const y = pt.y * canvas.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();

      // Eyes only — subtle cyan
      const drawRing = (indices: number[], color: string) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        indices.forEach((idx, i) => {
          const pt = landmarks[idx];
          if (i === 0) ctx.moveTo(pt.x * canvas.width, pt.y * canvas.height);
          else ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
        });
        ctx.closePath();
        ctx.stroke();
      };
      drawRing([33, 160, 158, 133, 153, 144], 'rgba(56, 189, 248, 0.5)');
      drawRing([362, 385, 387, 263, 373, 380], 'rgba(56, 189, 248, 0.5)');

      ctx.restore();
    };

    const drawOvalGuide = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const rx = w * 0.28;
      const ry = h * 0.40;

      ctx.save();
      ctx.strokeStyle = faceDetected ? 'rgba(52, 211, 153, 0.85)' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash(faceDetected ? [] : [8, 6]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    };

    const startProceduralOverlay = () => {
      const render = () => {
        const canvas = canvasRef.current;
        const video  = videoRef.current;
        if (!canvas || !video || !isSubscribed) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const rx = canvas.width * 0.28;
        const ry = canvas.height * 0.40;

        // Oval guide
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);

        // Subtle scanning line
        const time  = Date.now() * 0.0018;
        const scanY = cy - ry + ((Math.sin(time) + 1) / 2) * (ry * 2);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.85, scanY);
        ctx.lineTo(cx + rx * 0.85, scanY);
        ctx.stroke();

        setFaceDetected(true);
        setPoseFeedback('Center your face in the oval');
        animFrameRef.current = requestAnimationFrame(render);
      };
      animFrameRef.current = requestAnimationFrame(render);
    };

    initMediaPipe();

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (faceMeshInstance?.close) faceMeshInstance.close();
    };
  }, [isActive, meshEnabled, targetAngle]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Canvas — full video overlay, no extra padding */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

      {/* Mesh toggle — tiny, top-right corner only */}
      <button
        onClick={() => setMeshEnabled(!meshEnabled)}
        className="absolute top-2 right-2 pointer-events-auto bg-black/40 hover:bg-black/60 text-white border border-white/20 text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1 transition-all"
      >
        {meshEnabled ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {meshEnabled ? 'Hide mesh' : 'Show mesh'}
      </button>

      {/* Status chip — bottom center only */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md border transition-all ${
          faceDetected
            ? 'bg-emerald-900/70 border-emerald-500/40 text-emerald-300'
            : 'bg-black/60 border-white/20 text-white/80'
        }`}>
          {faceDetected
            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            : <AlertCircle  className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          }
          {poseFeedback}
        </div>
      </div>
    </div>
  );
};
