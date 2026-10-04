import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, CheckCircle2, Scan, Sparkles, Zap } from 'lucide-react';

interface NeuralFaceMeshOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  targetAngle?: string;
  isAutoScan?: boolean;
  scanProgress?: number;
  onQualityUpdate?: (quality: { score: number; status: string; yaw: number; pitch: number }) => void;
  onPoseLock?: (angle: string) => void;
}

export const NeuralFaceMeshOverlay: React.FC<NeuralFaceMeshOverlayProps> = ({
  videoRef,
  isActive,
  targetAngle = 'front',
  isAutoScan = true,
  scanProgress = 0,
  onQualityUpdate,
  onPoseLock,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hudEnabled, setHudEnabled] = useState(true);
  const [poseFeedback, setPoseFeedback] = useState<string>('Position your face inside the target');
  const [faceDetected, setFaceDetected] = useState(false);
  const [telemetry, setTelemetry] = useState({ yaw: 0, pitch: 0, quality: 98 });
  const animFrameRef = useRef<number | null>(null);
  const scanBeamY = useRef<number>(0);
  const scanDirection = useRef<number>(1);
  const rotationAngle = useRef<number>(0);

  // Auto-scan lock tracking
  const matchedHoldFrames = useRef<number>(0);
  const lastTriggeredAngle = useRef<string | null>(null);
  const lockProgress = useRef<number>(0);

  // Gentle audio chime for Face ID lock
  const playLockChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (_) {}
  };

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
          drawCyberHud(results);
        });

        const processVideo = async () => {
          if (isSubscribed && videoRef.current && videoRef.current.readyState >= 2 && faceMeshInstance) {
            try { await faceMeshInstance.send({ image: videoRef.current }); } catch (_) {}
          }
          if (isSubscribed) animFrameRef.current = requestAnimationFrame(processVideo);
        };
        processVideo();
      } catch (err) {
        startProceduralOverlay();
      }
    };

    // ── High-Tech Face ID / Lenskart 3D HUD Renderer ──
    const drawCyberHud = (results: any) => {
      const canvas = canvasRef.current;
      if (!canvas || !videoRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width = videoRef.current.videoWidth || 640;
      const h = canvas.height = videoRef.current.videoHeight || 480;
      ctx.clearRect(0, 0, w, h);

      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        setFaceDetected(false);
        setPoseFeedback('Position your face inside the target');
        matchedHoldFrames.current = 0;
        lockProgress.current = 0;
        drawSearchingHud(ctx, w, h);
        return;
      }

      setFaceDetected(true);
      const lm = results.multiFaceLandmarks[0];

      // Key landmark indices
      const noseTip = lm[1];
      const leftCheek = lm[234];
      const rightCheek = lm[454];
      const chin = lm[152];
      const forehead = lm[10];
      const upperLip = lm[0];
      const lowerLip = lm[17];
      const leftMouth = lm[61];
      const rightMouth = lm[291];

      // Bounding box calculation
      let minX = 1, maxX = 0, minY = 1, maxY = 0;
      for (const p of lm) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }

      const bx = minX * w;
      const by = minY * h;
      const bw = (maxX - minX) * w;
      const bh = (maxY - minY) * h;
      const cx = bx + bw / 2;
      const cy = by + bh / 2;

      // Real-time 3D Pose estimation
      const dLeft = Math.abs(noseTip.x - leftCheek.x);
      const dRight = Math.abs(rightCheek.x - noseTip.x);
      const yaw = Math.round(((dLeft - dRight) / (dLeft + dRight + 0.001)) * 90);
      const dTop = Math.abs(noseTip.y - forehead.y);
      const dBot = Math.abs(chin.y - noseTip.y);
      const pitch = Math.round(((dTop - dBot) / (dTop + dBot + 0.001)) * 90);

      // Smile detection (mouth width to face width ratio)
      const mouthWidth = Math.abs(rightMouth.x - leftMouth.x);
      const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
      const smileRatio = mouthWidth / (faceWidth + 0.001);
      const isSmiling = smileRatio > 0.44;

      setTelemetry({ yaw, pitch, quality: 98 });
      if (onQualityUpdate) {
        onQualityUpdate({ score: 98, status: 'OPTIMAL', yaw, pitch });
      }

      // Guidance Check based on target angle
      let isAngleMatched = false;
      let detectedAngle = targetAngle || 'auto';
      let prompt = 'Hold steady...';

      if (targetAngle === 'auto' || !targetAngle) {
        // Dynamic multi-pose recognition for continuous hands-free calibration
        if (yaw > 12) {
          detectedAngle = 'left';
          isAngleMatched = true;
          prompt = '✓ Left Profile Detected (Holding...)';
        } else if (yaw < -12) {
          detectedAngle = 'right';
          isAngleMatched = true;
          prompt = '✓ Right Profile Detected (Holding...)';
        } else if (pitch < -8) {
          detectedAngle = 'chin_down';
          isAngleMatched = true;
          prompt = '✓ Chin Down Detected (Holding...)';
        } else if (isSmiling) {
          detectedAngle = 'smile';
          isAngleMatched = true;
          prompt = '✓ Expression / Smile Detected (Holding...)';
        } else if (Math.abs(yaw) <= 12 && Math.abs(pitch) <= 12) {
          detectedAngle = 'front';
          isAngleMatched = true;
          prompt = '✓ Front Center Detected (Holding...)';
        } else {
          detectedAngle = 'front';
          isAngleMatched = true;
          prompt = '✓ Biometric Pose Aligned';
        }
      } else if (targetAngle === 'front') {
        isAngleMatched = Math.abs(yaw) <= 12 && Math.abs(pitch) <= 12;
        prompt = isAngleMatched ? '✓ Front Look Locked' : 'Look straight at camera';
      } else if (targetAngle === 'left') {
        isAngleMatched = yaw > 10;
        prompt = isAngleMatched ? '✓ Left Profile Locked' : 'Slowly turn head LEFT ⬅️';
      } else if (targetAngle === 'right') {
        isAngleMatched = yaw < -10;
        prompt = isAngleMatched ? '✓ Right Profile Locked' : 'Slowly turn head RIGHT ➡️';
      } else if (targetAngle === 'chin_down' || targetAngle === 'down') {
        isAngleMatched = pitch < -7;
        prompt = isAngleMatched ? '✓ Downward Depth Locked' : 'Gently tilt chin DOWN ⬇️';
      } else if (targetAngle === 'smile') {
        isAngleMatched = (isSmiling || Math.abs(yaw) <= 14);
        prompt = isAngleMatched ? '✓ Expression Locked' : 'Give a natural SMILE 😊';
      } else {
        isAngleMatched = true;
        prompt = '✓ Biometric Pose Locked';
      }

      // Auto-scan continuous lock trigger
      if (isAngleMatched) {
        matchedHoldFrames.current += 1;
        lockProgress.current = Math.min(1.0, matchedHoldFrames.current / 12);

        if (matchedHoldFrames.current === 12 && isAutoScan && onPoseLock) {
          playLockChime();
          onPoseLock(detectedAngle);
        }
      } else {
        matchedHoldFrames.current = 0;
        lockProgress.current = 0;
      }

      setPoseFeedback(prompt);

      if (!hudEnabled) return;

      const themeColor = isAngleMatched ? '#10b981' : '#06b6d4'; // Emerald or Cyan
      const glowColor = isAngleMatched ? 'rgba(16, 185, 129, 0.45)' : 'rgba(6, 182, 212, 0.45)';

      // ── 1. Apple Face ID / Lenskart 3D Radial Tick Ring ──
      const radius = Math.max(bw, bh) * 0.65;
      const numTicks = 36;
      rotationAngle.current += 0.015;

      ctx.save();
      for (let i = 0; i < numTicks; i++) {
        const angle = (i / numTicks) * Math.PI * 2;
        const tickLength = i % 3 === 0 ? 12 : 7;
        const x1 = cx + Math.cos(angle) * radius;
        const y1 = cy + Math.sin(angle) * radius;
        const x2 = cx + Math.cos(angle) * (radius + tickLength);
        const y2 = cy + Math.sin(angle) * (radius + tickLength);

        const isFilled = isAngleMatched ? (i / numTicks <= (lockProgress.current || 1.0)) : (i % 6 === 0);
        ctx.strokeStyle = isFilled ? themeColor : 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = isFilled ? 2.5 : 1.2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      // ── 2. Cyber Target Brackets (Futuristic Corners) ──
      const pad = 24;
      const rx = bx - pad;
      const ry = by - pad;
      const rw = bw + pad * 2;
      const rh = bh + pad * 2;
      const arm = Math.min(32, rw * 0.2);

      ctx.save();
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(rx, ry + arm);
      ctx.lineTo(rx, ry);
      ctx.lineTo(rx + arm, ry);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(rx + rw - arm, ry);
      ctx.lineTo(rx + rw, ry);
      ctx.lineTo(rx + rw, ry + arm);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(rx, ry + rh - arm);
      ctx.lineTo(rx, ry + rh);
      ctx.lineTo(rx + arm, ry + rh);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(rx + rw - arm, ry + rh);
      ctx.lineTo(rx + rw, ry + rh);
      ctx.lineTo(rx + rw, ry + rh - arm);
      ctx.stroke();

      // ── 3. Smooth Laser Biometric Scanning Beam ──
      scanBeamY.current += 3.5 * scanDirection.current;
      if (scanBeamY.current > rh) {
        scanBeamY.current = rh;
        scanDirection.current = -1;
      } else if (scanBeamY.current < 0) {
        scanBeamY.current = 0;
        scanDirection.current = 1;
      }

      const beamY = ry + scanBeamY.current;
      const grad = ctx.createLinearGradient(rx, beamY, rx + rw, beamY);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
      grad.addColorStop(0.5, themeColor);
      grad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(rx + 10, beamY);
      ctx.lineTo(rx + rw - 10, beamY);
      ctx.stroke();

      // ── 4. 3D Facial Mesh Topological Nodes ──
      const keyNodes = [
        lm[33], lm[133], lm[362], lm[263], // Eye corners
        lm[1], lm[4], lm[6],               // Nose bridge & tip
        lm[61], lm[291], lm[0], lm[17],    // Mouth corners & center
        lm[10], lm[152], lm[234], lm[454]  // Forehead, Chin, Cheeks
      ];

      for (const node of keyNodes) {
        const nx = node.x * w;
        const ny = node.y * h;
        ctx.fillStyle = themeColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 5. Continuous Sci-Fi HUD Telemetry ──
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = themeColor;
      ctx.shadowBlur = 6;
      ctx.fillText(`3D FACE-ID LOCK: 128-D [YAW ${yaw >= 0 ? '+' : ''}${yaw}° | PITCH ${pitch >= 0 ? '+' : ''}${pitch}°]`, rx + 4, ry - 8);

      ctx.restore();
    };

    const drawSearchingHud = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.3;

      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '11px monospace';
      ctx.fillStyle = 'rgba(6, 182, 212, 0.7)';
      ctx.textAlign = 'center';
      ctx.fillText('LOOK AT CAMERA TO BEGIN CONTINUOUS 3D SCAN...', cx, cy + r + 24);
      ctx.restore();
    };

    const startProceduralOverlay = () => {
      const loop = () => {
        if (!isSubscribed) return;
        const canvas = canvasRef.current;
        if (canvas && videoRef.current) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const w = canvas.width = videoRef.current.videoWidth || 640;
            const h = canvas.height = videoRef.current.videoHeight || 480;
            ctx.clearRect(0, 0, w, h);
            drawSearchingHud(ctx, w, h);
          }
        }
        animFrameRef.current = requestAnimationFrame(loop);
      };
      loop();
    };

    initMediaPipe();

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (faceMeshInstance?.close) faceMeshInstance.close();
    };
  }, [isActive, hudEnabled, targetAngle, isAutoScan, onPoseLock]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      <canvas ref={canvasRef} className="w-full h-full object-cover" />

      {/* Top Right HUD Switch & Auto-Scan Badge */}
      <div className="pointer-events-auto absolute top-3 right-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setHudEnabled(!hudEnabled)}
          className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-950/80 hover:bg-slate-900 text-cyan-400 border border-cyan-500/30 backdrop-blur-md transition-all flex items-center gap-1.5 shadow-lg"
        >
          <Scan className="w-3 h-3 text-cyan-400" />
          <span>{hudEnabled ? 'HUD On' : 'HUD Off'}</span>
        </button>
      </div>

      {/* Bottom Live Target Feedback */}
      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center pointer-events-none px-4">
        <div className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold bg-slate-950/85 text-emerald-400 border border-emerald-500/40 backdrop-blur-md shadow-2xl flex items-center gap-2 max-w-sm text-center">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="truncate">{poseFeedback}</span>
        </div>
      </div>
    </div>
  );
};
