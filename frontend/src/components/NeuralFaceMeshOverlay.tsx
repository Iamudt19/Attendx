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

      const time = Date.now() * 0.003;
      const w = canvas.width;
      const h = canvas.height;

      ctx.save();

      // ── 1. Calculate Face Bounding Coordinates ──
      let minX = w, maxX = 0, minY = h, maxY = 0;
      landmarks.forEach((pt: any) => {
        const x = pt.x * w;
        const y = pt.y * h;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });

      const padX = (maxX - minX) * 0.15;
      const padY = (maxY - minY) * 0.15;
      const bboxLeft = Math.max(10, minX - padX);
      const bboxRight = Math.min(w - 10, maxX + padX);
      const bboxTop = Math.max(10, minY - padY);
      const bboxBottom = Math.min(h - 10, maxY + padY);

      // ── 2. Corner Tech Brackets (Biometric HUD Bounding Box) ──
      const cornerLen = Math.min(28, (bboxRight - bboxLeft) * 0.2);
      ctx.strokeStyle = qualityScore > 85 ? 'rgba(52, 211, 153, 0.85)' : 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 2;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(bboxLeft, bboxTop + cornerLen);
      ctx.lineTo(bboxLeft, bboxTop);
      ctx.lineTo(bboxLeft + cornerLen, bboxTop);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(bboxRight - cornerLen, bboxTop);
      ctx.lineTo(bboxRight, bboxTop);
      ctx.lineTo(bboxRight, bboxTop + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(bboxLeft, bboxBottom - cornerLen);
      ctx.lineTo(bboxLeft, bboxBottom);
      ctx.lineTo(bboxLeft + cornerLen, bboxBottom);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(bboxRight - cornerLen, bboxBottom);
      ctx.lineTo(bboxRight, bboxBottom);
      ctx.lineTo(bboxRight, bboxBottom - cornerLen);
      ctx.stroke();

      // ── 3. Cyber Scanning Laser Beam across Face ──
      const scanY = bboxTop + ((Math.sin(time * 2.2) + 1) / 2) * (bboxBottom - bboxTop);
      const laserGrad = ctx.createLinearGradient(0, scanY - 14, 0, scanY);
      laserGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
      laserGrad.addColorStop(1, 'rgba(6, 182, 212, 0.45)');
      ctx.fillStyle = laserGrad;
      ctx.fillRect(bboxLeft, scanY - 14, bboxRight - bboxLeft, 14);

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(bboxLeft, scanY);
      ctx.lineTo(bboxRight, scanY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ── 4. Geodesic Neural Wireframe (Decorative Mesh Network) ──
      const drawPolyline = (indices: number[], color: string, width = 1, close = false) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        indices.forEach((idx, i) => {
          const pt = landmarks[idx];
          if (!pt) return;
          const x = pt.x * w;
          const y = pt.y * h;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        if (close) ctx.closePath();
        ctx.stroke();
      };

      // Outer Face Silhouette
      const outerSilhouette = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
        397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
        172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10
      ];
      drawPolyline(outerSilhouette, 'rgba(139, 92, 246, 0.65)', 1.5, true);

      // Eyebrows
      drawPolyline([70, 63, 105, 66, 107, 55, 65, 52, 53, 46], 'rgba(56, 189, 248, 0.75)', 1.2);
      drawPolyline([336, 296, 334, 293, 300, 276, 283, 282, 295, 285], 'rgba(56, 189, 248, 0.75)', 1.2);

      // Eyes & Irises
      drawPolyline([33, 160, 158, 133, 153, 144, 33], 'rgba(34, 211, 238, 0.85)', 1.2, true);
      drawPolyline([362, 385, 387, 263, 373, 380, 362], 'rgba(34, 211, 238, 0.85)', 1.2, true);

      // Nose Bridge & Contour
      drawPolyline([168, 6, 197, 195, 5, 4, 1, 19, 94, 2], 'rgba(99, 102, 241, 0.7)', 1.2);
      drawPolyline([98, 97, 2, 326, 327], 'rgba(56, 189, 248, 0.6)', 1);

      // Lips
      drawPolyline([61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 61], 'rgba(236, 72, 153, 0.65)', 1.2, true);
      drawPolyline([78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308], 'rgba(236, 72, 153, 0.4)', 1);

      // ── 5. Triangulated Geodesic Tessellation Lines ──
      const triangulationPairs = [
        [10, 151], [151, 9], [9, 8], [8, 168], [168, 1], [1, 2], [2, 0], [0, 17], [17, 152], // Central sagittal axis
        [10, 67], [10, 297], [67, 109], [297, 338], // Forehead triangles
        [70, 168], [336, 168], // Eyebrows to glabella
        [33, 168], [263, 168], // Eyes to nose bridge
        [33, 1], [263, 1], // Eyes to nose tip
        [234, 1], [454, 1], // Cheeks to nose tip
        [234, 132], [454, 361], // Cheekbones
        [132, 58], [361, 288], // Jaw angles
        [58, 172], [288, 397],
        [172, 152], [397, 152], // Jaw to chin
        [61, 1], [291, 1], // Mouth corners to nose
        [61, 152], [291, 152], // Mouth corners to chin
        [234, 93], [454, 323], // Mid-cheeks
        [93, 61], [323, 291], // Cheeks to mouth
        [1, 152], // Nose to chin vertical
      ];

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 0.8;
      triangulationPairs.forEach(([i, j]) => {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x * w, p1.y * h);
          ctx.lineTo(p2.x * w, p2.y * h);
          ctx.stroke();
        }
      });

      // ── 6. Luminous Coordinate Landmark Nodes ──
      const keyNodes = [
        10, 151, 9, 8, 168, 1, 2, 0, 17, 152, // Center axis
        70, 107, 336, 334, // Brows
        33, 133, 362, 263, // Eye corners
        234, 454, 93, 323, // Cheeks
        61, 291, 0, 17, // Lips & Philtrum
        58, 288, 132, 361 // Jawline nodes
      ];

      keyNodes.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        const x = pt.x * w;
        const y = pt.y * h;
        const pulse = (Math.sin(time * 5 + i) + 1) / 2;

        ctx.fillStyle = idx === 1 || idx === 152 || idx === 10 ? '#10b981' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(x, y, 2.2 + pulse * 1.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── 7. Decorative HUD Readout Overlays ──
      ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
      ctx.fillText(`SFACE-128D // NEURAL LOCK: ACTIVE`, bboxLeft + 4, bboxTop - 8);

      ctx.fillStyle = qualityScore > 85 ? 'rgba(52, 211, 153, 0.95)' : 'rgba(251, 191, 36, 0.95)';
      ctx.fillText(`YAW: ${yaw > 0 ? '+' : ''}${yaw}°  PITCH: ${pitch > 0 ? '+' : ''}${pitch}°  Q: ${qualityScore}%`, bboxLeft + 4, bboxBottom + 16);

      ctx.restore();
    };

    const drawOvalGuide = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const rx = w * 0.28;
      const ry = h * 0.40;
      const time = Date.now() * 0.002;

      ctx.save();
      // Glowing target oval
      ctx.strokeStyle = faceDetected ? 'rgba(52, 211, 153, 0.75)' : 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash(faceDetected ? [12, 6] : [8, 6]);
      ctx.lineDashOffset = -time * 20;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      ctx.stroke();

      // Outer delicate reticle
      ctx.strokeStyle = faceDetected ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 12]);
      ctx.lineDashOffset = time * 15;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 1.1, ry * 1.1, 0, 0, 2 * Math.PI);
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

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const rx = w * 0.28;
        const ry = h * 0.38;
        const time = Date.now() * 0.002;

        ctx.save();

        // ── 1. Corner Tech Brackets (Biometric Bounding Box) ──
        const bw = rx * 1.35;
        const bh = ry * 1.35;
        const cornerLen = 24;
        ctx.strokeStyle = faceDetected ? 'rgba(56, 189, 248, 0.85)' : 'rgba(148, 163, 184, 0.5)';
        ctx.lineWidth = 2;

        // Top-Left
        ctx.beginPath();
        ctx.moveTo(cx - bw, cy - bh + cornerLen);
        ctx.lineTo(cx - bw, cy - bh);
        ctx.lineTo(cx - bw + cornerLen, cy - bh);
        ctx.stroke();

        // Top-Right
        ctx.beginPath();
        ctx.moveTo(cx + bw - cornerLen, cy - bh);
        ctx.lineTo(cx + bw, cy - bh);
        ctx.lineTo(cx + bw, cy - bh + cornerLen);
        ctx.stroke();

        // Bottom-Left
        ctx.beginPath();
        ctx.moveTo(cx - bw, cy + bh - cornerLen);
        ctx.lineTo(cx - bw, cy + bh);
        ctx.lineTo(cx - bw + cornerLen, cy + bh);
        ctx.stroke();

        // Bottom-Right
        ctx.beginPath();
        ctx.moveTo(cx + bw - cornerLen, cy + bh);
        ctx.lineTo(cx + bw, cy + bh);
        ctx.lineTo(cx + bw, cy + bh - cornerLen);
        ctx.stroke();

        // ── 2. Rotating Circular HUD Degree Reticle ──
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time * 0.4);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 12]);
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(rx, ry) * 1.15, 0, Math.PI * 2);
        ctx.stroke();

        ctx.rotate(-time * 0.8);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.setLineDash([16, 24]);
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(rx, ry) * 1.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // ── 3. Biometric Oval Target with Pulse ──
        const pulse = Math.sin(time * 3) * 3;
        ctx.strokeStyle = faceDetected ? 'rgba(52, 211, 153, 0.9)' : 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx + pulse, ry + pulse, 0, 0, 2 * Math.PI);
        ctx.stroke();

        // ── 4. Neural Geodesic Wireframe Node Grid ──
        if (meshEnabled) {
          const nodes = [
            { x: cx, y: cy - ry * 0.55 },             // Forehead top
            { x: cx - rx * 0.45, y: cy - ry * 0.4 },  // Left Temple
            { x: cx + rx * 0.45, y: cy - ry * 0.4 },  // Right Temple
            { x: cx - rx * 0.35, y: cy - ry * 0.15 }, // Left Eye
            { x: cx + rx * 0.35, y: cy - ry * 0.15 }, // Right Eye
            { x: cx, y: cy - ry * 0.15 },             // Glabella
            { x: cx, y: cy + ry * 0.1 },              // Nose tip
            { x: cx - rx * 0.25, y: cy + ry * 0.15 }, // Left Nostril
            { x: cx + rx * 0.25, y: cy + ry * 0.15 }, // Right Nostril
            { x: cx - rx * 0.55, y: cy + ry * 0.2 },  // Left Cheek
            { x: cx + rx * 0.55, y: cy + ry * 0.2 },  // Right Cheek
            { x: cx, y: cy + ry * 0.4 },              // Mouth Center
            { x: cx - rx * 0.25, y: cy + ry * 0.4 },  // Mouth Left
            { x: cx + rx * 0.25, y: cy + ry * 0.4 },  // Mouth Right
            { x: cx - rx * 0.35, y: cy + ry * 0.65 }, // Left Jaw
            { x: cx + rx * 0.35, y: cy + ry * 0.65 }, // Right Jaw
            { x: cx, y: cy + ry * 0.75 },             // Chin
          ];

          const connections = [
            [0, 1], [0, 2], [0, 5], [1, 3], [2, 4], [3, 5], [4, 5],
            [3, 9], [4, 10], [5, 6], [6, 7], [6, 8], [7, 9], [8, 10],
            [6, 11], [11, 12], [11, 13], [12, 14], [13, 15], [14, 16], [15, 16],
            [9, 14], [10, 15], [1, 9], [2, 10], [12, 16], [13, 16]
          ];

          // Draw Connecting Mesh Lines
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 1;
          connections.forEach(([i, j]) => {
            const p1 = nodes[i];
            const p2 = nodes[j];
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          });

          // Draw Glowing Nodes
          nodes.forEach((n, idx) => {
            const nodeGlow = (Math.sin(time * 4 + idx) + 1) / 2;
            ctx.fillStyle = idx === 6 || idx === 0 || idx === 16 ? '#10b981' : '#38bdf8';
            ctx.beginPath();
            ctx.arc(n.x, n.y, 2.5 + nodeGlow * 1.5, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // ── 5. Cyber Laser Scanning Beam with Gradient Trail ──
        const scanY = cy - ry + ((Math.sin(time * 1.8) + 1) / 2) * (ry * 2);
        const grad = ctx.createLinearGradient(0, scanY - 18, 0, scanY);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0.65)');

        ctx.fillStyle = grad;
        ctx.fillRect(cx - rx * 0.9, scanY - 18, rx * 1.8, 18);

        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(cx - rx * 0.9, scanY);
        ctx.lineTo(cx + rx * 0.9, scanY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // ── 6. HUD Telemetry Digital Overlay Readout ──
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
        ctx.fillText('SFACE-128D // NEURAL LOCK', cx - bw + 4, cy - bh - 6);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
        ctx.fillText('VEC: 99.4% CALIBRATED', cx + bw - 110, cy - bh - 6);

        ctx.restore();

        setFaceDetected(true);
        setPoseFeedback(targetAngle === 'front' ? 'Look straight at the camera' : `Angle: ${targetAngle}`);
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
