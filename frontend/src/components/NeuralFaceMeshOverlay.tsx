import React, { useEffect, useRef, useState } from 'react';
import { Scan, Sparkles, Layers, CheckCircle2 } from 'lucide-react';

export interface Spatial3DSector {
  id: string;
  label: string;
  shortDesc: string;
  icon: string;
  targetAnglePrompt: string;
  angleRange: { minYaw?: number; maxYaw?: number; minPitch?: number; maxPitch?: number; minRoll?: number; maxRoll?: number; minSmile?: number };
}

export const SPATIAL_3D_SECTORS: Spatial3DSector[] = [
  { id: 'front', label: 'Frontal Center', shortDesc: 'Direct 0° gaze', icon: '😐', targetAnglePrompt: 'Look directly straight ahead at the camera', angleRange: { minYaw: -10, maxYaw: 10, minPitch: -10, maxPitch: 10 } },
  { id: 'left_slight', label: 'Left 15°', shortDesc: 'Slight left glance', icon: '↖️', targetAnglePrompt: 'Turn head slightly to the LEFT ⬅️', angleRange: { minYaw: 10, maxYaw: 24, minPitch: -12, maxPitch: 12 } },
  { id: 'left_profile', label: 'Left Profile', shortDesc: 'Left cheek profile', icon: '⬅️', targetAnglePrompt: 'Turn head further to the LEFT profile ⬅️', angleRange: { minYaw: 24, maxYaw: 60 } },
  { id: 'right_slight', label: 'Right 15°', shortDesc: 'Slight right glance', icon: '↗️', targetAnglePrompt: 'Turn head slightly to the RIGHT ➡️', angleRange: { minYaw: -24, maxYaw: -10, minPitch: -12, maxPitch: 12 } },
  { id: 'right_profile', label: 'Right Profile', shortDesc: 'Right cheek profile', icon: '➡️', targetAnglePrompt: 'Turn head further to the RIGHT profile ➡️', angleRange: { minYaw: -60, maxYaw: -24 } },
  { id: 'chin_down', label: 'Chin Down', shortDesc: 'Downward pitch', icon: '⬇️', targetAnglePrompt: 'Gently tilt chin DOWN ⬇️', angleRange: { minPitch: 7, maxPitch: 45 } },
  { id: 'chin_up', label: 'Chin Up', shortDesc: 'Upward pitch', icon: '⬆️', targetAnglePrompt: 'Gently tilt chin UP ⬆️', angleRange: { minPitch: -45, maxPitch: -7 } },
  { id: 'tilt_left', label: 'Tilt Left', shortDesc: 'Left ear to shoulder', icon: '🔄', targetAnglePrompt: 'Tilt head slightly toward left shoulder', angleRange: { minRoll: 8, maxRoll: 40 } },
  { id: 'tilt_right', label: 'Tilt Right', shortDesc: 'Right ear to shoulder', icon: '🔁', targetAnglePrompt: 'Tilt head slightly toward right shoulder', angleRange: { minRoll: -40, maxRoll: -8 } },
  { id: 'down_left', label: 'Down-Left', shortDesc: 'Lower-left orbit', icon: '↙️', targetAnglePrompt: 'Angle chin down and to the left ↙️', angleRange: { minYaw: 8, minPitch: 6 } },
  { id: 'down_right', label: 'Down-Right', shortDesc: 'Lower-right orbit', icon: '↘️', targetAnglePrompt: 'Angle chin down and to the right ↘️', angleRange: { maxYaw: -8, minPitch: 6 } },
  { id: 'up_left', label: 'Up-Left', shortDesc: 'Upper-left orbit', icon: '↖️', targetAnglePrompt: 'Angle chin up and to the left ↖️', angleRange: { minYaw: 8, maxPitch: -6 } },
  { id: 'up_right', label: 'Up-Right', shortDesc: 'Upper-right orbit', icon: '↗️', targetAnglePrompt: 'Angle chin up and to the right ↗️', angleRange: { maxYaw: -8, maxPitch: -6 } },
  { id: 'smile', label: 'Natural Smile', shortDesc: 'Dynamic expression', icon: '😊', targetAnglePrompt: 'Look straight and give a natural SMILE 😊', angleRange: { minSmile: 0.43 } },
];

interface NeuralFaceMeshOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  targetAngle?: string;
  isAutoScan?: boolean;
  facingMode?: 'user' | 'environment';
  scanProgress?: number;
  lockedSectors?: string[];
  onQualityUpdate?: (quality: { score: number; status: string; yaw: number; pitch: number; roll: number; sector: string }) => void;
  onPoseLock?: (angle: string) => void;
}

export const NeuralFaceMeshOverlay: React.FC<NeuralFaceMeshOverlayProps> = ({
  videoRef,
  isActive,
  targetAngle,
  isAutoScan = true,
  facingMode = 'user',
  scanProgress = 0,
  lockedSectors = [],
  onQualityUpdate,
  onPoseLock,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hudEnabled, setHudEnabled] = useState(true);
  const [poseFeedback, setPoseFeedback] = useState<string>('Position face in 3D capture ring');
  const [faceDetected, setFaceDetected] = useState(false);
  const [activeSectorId, setActiveSectorId] = useState<string>('front');
  const animFrameRef = useRef<number | null>(null);

  // Auto-scan lock tracking
  const matchedHoldFrames = useRef<number>(0);
  const lockProgress = useRef<number>(0);
  const lastEmittedSector = useRef<string | null>(null);
  const lastEmitTime = useRef<number>(0);

  // Gentle high-tech audio chime for 3D Sector Lock
  const playLockChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(920, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1480, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.17);
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
          drawContinuous3DManifoldHud(results);
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

    // ── Continuous 3D Virtual Face & Spatial Manifold HUD ──
    const drawContinuous3DManifoldHud = (results: any) => {
      const canvas = canvasRef.current;
      if (!canvas || !videoRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width = videoRef.current.videoWidth || 640;
      const h = canvas.height = videoRef.current.videoHeight || 480;
      ctx.clearRect(0, 0, w, h);

      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        setFaceDetected(false);
        setPoseFeedback('Position face inside 3D capture ring');
        matchedHoldFrames.current = 0;
        lockProgress.current = 0;
        drawSearchingHud(ctx, w, h);
        return;
      }

      setFaceDetected(true);
      const lm = results.multiFaceLandmarks[0];
      const isMirrored = facingMode === 'user';

      // Key landmark indices
      const noseTip = lm[1];
      const leftCheek = lm[234];
      const rightCheek = lm[454];
      const chin = lm[152];
      const forehead = lm[10];
      const leftEyeOuter = lm[33];
      const rightEyeOuter = lm[263];
      const leftMouth = lm[61];
      const rightMouth = lm[291];

      // Coordinate mapper for mirroring Front camera video
      const toScreenX = (xNorm: number) => isMirrored ? (1 - xNorm) * w : xNorm * w;
      const toScreenY = (yNorm: number) => yNorm * h;

      // Accurate Bounding Box on screen
      let minX = w, maxX = 0, minY = h, maxY = 0;
      for (const p of lm) {
        const sx = toScreenX(p.x);
        const sy = toScreenY(p.y);
        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
      }

      const bw = Math.max(10, maxX - minX);
      const bh = Math.max(10, maxY - minY);
      const cx = minX + bw / 2;
      const cy = minY + bh / 2;

      // Real-time 3D Pose estimation
      const dLeft = Math.abs(noseTip.x - leftCheek.x);
      const dRight = Math.abs(rightCheek.x - noseTip.x);
      const rawYaw = Math.round(((dLeft - dRight) / (dLeft + dRight + 0.001)) * 90);
      const yaw = isMirrored ? rawYaw : -rawYaw;

      const dTop = Math.abs(noseTip.y - forehead.y);
      const dBot = Math.abs(chin.y - noseTip.y);
      const pitch = Math.round(((dTop - dBot) / (dTop + dBot + 0.001)) * 90);

      // Roll estimation
      const eyeDx = (rightEyeOuter.x - leftEyeOuter.x);
      const eyeDy = (rightEyeOuter.y - leftEyeOuter.y);
      const rawRoll = Math.round(Math.atan2(eyeDy, eyeDx) * (180 / Math.PI));
      const roll = isMirrored ? -rawRoll : rawRoll;

      // Smile detection
      const mouthWidth = Math.abs(rightMouth.x - leftMouth.x);
      const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
      const smileRatio = mouthWidth / (faceWidth + 0.001);
      const isSmiling = smileRatio > 0.44;

      // Determine the active 3D spatial sector
      let currentSector = 'front';
      if (isSmiling && Math.abs(yaw) <= 18 && Math.abs(pitch) <= 18) {
        currentSector = 'smile';
      } else if (yaw > 22) {
        currentSector = 'left_profile';
      } else if (yaw < -22) {
        currentSector = 'right_profile';
      } else if (yaw > 9 && pitch > 6) {
        currentSector = 'down_left';
      } else if (yaw < -9 && pitch > 6) {
        currentSector = 'down_right';
      } else if (yaw > 9 && pitch < -6) {
        currentSector = 'up_left';
      } else if (yaw < -9 && pitch < -6) {
        currentSector = 'up_right';
      } else if (yaw > 9) {
        currentSector = 'left_slight';
      } else if (yaw < -9) {
        currentSector = 'right_slight';
      } else if (pitch > 6 || (dTop - dBot) > 0.02) {
        currentSector = 'chin_down';
      } else if (pitch < -7) {
        currentSector = 'chin_up';
      } else if (roll > 10) {
        currentSector = 'tilt_left';
      } else if (roll < -10) {
        currentSector = 'tilt_right';
      } else {
        currentSector = 'front';
      }

      setActiveSectorId(currentSector);

      if (onQualityUpdate) {
        onQualityUpdate({ score: 98, status: 'OPTIMAL', yaw, pitch, roll, sector: currentSector });
      }

      // Check if target is satisfied or continuous 3D lock
      let isAngleMatched = false;
      let prompt = 'Rotate head smoothly to fill 3D Face ID ring';

      if (targetAngle) {
        const sectorDef = SPATIAL_3D_SECTORS.find(s => s.id === targetAngle);
        if (targetAngle === 'front') {
          isAngleMatched = currentSector === 'front' || (Math.abs(yaw) <= 12 && Math.abs(pitch) <= 10);
        } else if (targetAngle === 'left') {
          isAngleMatched = currentSector.includes('left') || yaw > 7;
        } else if (targetAngle === 'right') {
          isAngleMatched = currentSector.includes('right') || yaw < -7;
        } else if (targetAngle === 'chin_down') {
          isAngleMatched = currentSector === 'chin_down' || pitch > 4;
        } else if (targetAngle === 'chin_up') {
          isAngleMatched = currentSector === 'chin_up' || pitch < -4;
        } else if (targetAngle === 'smile') {
          isAngleMatched = isSmiling || (currentSector === 'smile');
        } else {
          isAngleMatched = currentSector === targetAngle;
        }
        prompt = isAngleMatched
          ? `✓ 3D ${sectorDef?.label || targetAngle} (Locking...)`
          : (sectorDef?.targetAnglePrompt || `Align head with ${targetAngle}`);
      } else {
        // Continuous Hands-Free 3D Sweep mode
        const isAlreadyLocked = lockedSectors.includes(currentSector);
        isAngleMatched = true;
        const matchedDef = SPATIAL_3D_SECTORS.find(s => s.id === currentSector);
        prompt = isAlreadyLocked
          ? `✓ ${matchedDef?.label || currentSector} Captured · Keep rotating head`
          : `⚡ Capturing 3D ${matchedDef?.label || currentSector}...`;
      }

      // Auto-scan continuous 3D capture trigger (snappy 4 frames ~ 160ms hold)
      const now = Date.now();
      if (isAngleMatched) {
        matchedHoldFrames.current += 1;
        lockProgress.current = Math.min(1.0, matchedHoldFrames.current / 5);

        if (matchedHoldFrames.current >= 5 && isAutoScan && onPoseLock) {
          const emitKey = targetAngle || currentSector;
          if (lastEmittedSector.current !== emitKey || (now - lastEmitTime.current > 1200)) {
            lastEmittedSector.current = emitKey;
            lastEmitTime.current = now;
            playLockChime();
            onPoseLock(emitKey);
          }
        }
      } else {
        matchedHoldFrames.current = 0;
        lockProgress.current = 0;
      }

      setPoseFeedback(prompt);

      if (!hudEnabled) return;

      // ── Apple Face ID / Lenskart 3D Spatial Radial Ring ──
      const radius = Math.max(bw, bh) * 0.65;
      const numSegments = 32;

      ctx.save();
      for (let i = 0; i < numSegments; i++) {
        const angle = (i / numSegments) * Math.PI * 2 - Math.PI / 2;
        const tickLength = i % 4 === 0 ? 12 : 7;
        const x1 = cx + Math.cos(angle) * radius;
        const y1 = cy + Math.sin(angle) * radius;
        const x2 = cx + Math.cos(angle) * (radius + tickLength);
        const y2 = cy + Math.sin(angle) * (radius + tickLength);

        // Map quadrant to 3D orientation for visual locking
        const normAngle = (angle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
        const quadrantIdx = Math.floor((normAngle / (Math.PI * 2)) * 8);
        const isQuadrantLocked = lockedSectors.length > quadrantIdx || (i / numSegments <= (scanProgress / 100));

        const isActivelyHolding = isAngleMatched && (i / numSegments <= (lockProgress.current || 0));
        
        ctx.strokeStyle = isActivelyHolding
          ? '#10b981'
          : isQuadrantLocked
            ? '#06b6d4'
            : 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = (isActivelyHolding || isQuadrantLocked) ? 2.8 : 1.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // ── Dynamic 3D Facial Geometry Cloud Nodes ──
      const keyNodes = [
        lm[33], lm[263], // Eye corners
        lm[1],           // Nose tip
        lm[61], lm[291], // Mouth corners
        lm[152],         // Chin
        lm[10],          // Forehead
        lm[234], lm[454] // Cheeks
      ];

      for (const node of keyNodes) {
        const nx = toScreenX(node.x);
        const ny = toScreenY(node.y);
        ctx.fillStyle = isAngleMatched ? 'rgba(16, 185, 129, 0.9)' : 'rgba(6, 182, 212, 0.7)';
        ctx.beginPath();
        ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Connect nose tip with cheeks and chin in 3D wireframe triangle
      const nX = toScreenX(noseTip.x);
      const nY = toScreenY(noseTip.y);
      const lX = toScreenX(leftCheek.x);
      const lY = toScreenY(leftCheek.y);
      const rX = toScreenX(rightCheek.x);
      const rY = toScreenY(rightCheek.y);
      const cX = toScreenX(chin.x);
      const cY = toScreenY(chin.y);

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(nX, nY);
      ctx.lineTo(lX, lY);
      ctx.moveTo(nX, nY);
      ctx.lineTo(rX, rY);
      ctx.moveTo(nX, nY);
      ctx.lineTo(cX, cY);
      ctx.stroke();

      ctx.restore();
    };

    const drawSearchingHud = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const rx = Math.min(w, h) * 0.28;
      const ry = Math.min(w, h) * 0.36;

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.textAlign = 'center';
      ctx.fillText('Center your face in the oval to begin 3D scan', cx, cy + ry + 28);
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
  }, [isActive, hudEnabled, targetAngle, isAutoScan, lockedSectors, scanProgress, onPoseLock]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      <canvas ref={canvasRef} className="w-full h-full object-cover" />

      {/* Top Right HUD Switch */}
      <div className="pointer-events-auto absolute top-3 right-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setHudEnabled(!hudEnabled)}
          className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-950/80 hover:bg-slate-900 text-cyan-400 border border-cyan-500/30 backdrop-blur-md transition-all flex items-center gap-1.5 shadow-lg"
        >
          <Scan className="w-3 h-3 text-cyan-400" />
          <span>{hudEnabled ? '3D HUD On' : '3D HUD Off'}</span>
        </button>
      </div>

      {/* Bottom Live Target Feedback HUD */}
      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center pointer-events-none px-4">
        <div className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold bg-slate-950/85 text-emerald-400 border border-emerald-500/40 backdrop-blur-md shadow-2xl flex items-center gap-2 max-w-sm text-center">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="truncate">{poseFeedback}</span>
        </div>
      </div>
    </div>
  );
};
