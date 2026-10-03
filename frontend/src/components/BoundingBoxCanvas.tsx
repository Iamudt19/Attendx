import React, { useRef, useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle2, AlertTriangle, HelpCircle, SlidersHorizontal } from 'lucide-react';
import { RecognizedFace } from '../types';
import { getStorageUrl } from '../services/api';

interface BoundingBoxCanvasProps {
  imageUrl?: string;
  recognizedFaces?: RecognizedFace[];
  selectedStudentId?: number | null;
  onSelectFace?: (face: RecognizedFace) => void;
}

export const BoundingBoxCanvas: React.FC<BoundingBoxCanvasProps> = ({
  imageUrl = '',
  recognizedFaces = [],
  selectedStudentId,
  onSelectFace
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Layout recalculation trigger state
  const [, setDimensionsTrigger] = useState(0);

  // Visibility & mode filters
  const [showPresent, setShowPresent] = useState(true);
  const [showReview, setShowReview] = useState(true);
  const [showUnknown, setShowUnknown] = useState(false);
  const [alwaysShowLabels, setAlwaysShowLabels] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Recalculate offsets on window resize or layout updates
  useEffect(() => {
    const handleResize = () => {
      setDimensionsTrigger((prev) => prev + 1);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const resolvedImageUrl = imageUrl ? getStorageUrl(imageUrl) : '';

  const safeFaces = Array.isArray(recognizedFaces) ? recognizedFaces : [];
  const presentCount = safeFaces.filter(f => f?.status === 'PRESENT').length;
  const reviewCount = safeFaces.filter(f => f?.status === 'NEEDS_REVIEW').length;
  const unknownCount = safeFaces.filter(f => f?.status === 'UNKNOWN').length;

  if (!resolvedImageUrl) {
    return (
      <div className="w-full h-56 bg-[var(--bg-inset)] rounded-xl border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] text-xs font-mono">
        No classroom photo available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Interactive Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[var(--bg-inset)] rounded-xl border border-[var(--border-color)] text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-blue-600 dark:text-violet-400" />
            Photo Faces:
          </span>

          <button
            type="button"
            onClick={() => setShowPresent(!showPresent)}
            className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
              showPresent
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Present ({presentCount})
          </button>

          <button
            type="button"
            onClick={() => setShowReview(!showReview)}
            className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
              showReview
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            Review ({reviewCount})
          </button>

          <button
            type="button"
            onClick={() => setShowUnknown(!showUnknown)}
            className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
              showUnknown
                ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 shadow-sm'
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
            }`}
          >
            <HelpCircle className="w-3 h-3 text-rose-500" />
            Unknowns ({unknownCount})
          </button>
        </div>

        <button
          type="button"
          onClick={() => setAlwaysShowLabels(!alwaysShowLabels)}
          className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] transition-colors"
        >
          {alwaysShowLabels ? <Eye className="w-3 h-3 text-blue-600 dark:text-violet-400" /> : <EyeOff className="w-3 h-3 text-[var(--text-muted)]" />}
          {alwaysShowLabels ? 'Labels: Always' : 'Labels: Hover'}
        </button>
      </div>

      {/* Main Image Canvas with tight wrapper */}
      <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl border border-[var(--border-color)] bg-slate-950/90 shadow-2xl flex items-center justify-center">
        <div className="relative inline-block max-w-full">
          <img
            ref={imgRef}
            src={resolvedImageUrl}
            alt="Classroom Capture"
            onLoad={() => setDimensionsTrigger((prev) => prev + 1)}
            className="w-full h-auto object-contain max-h-[540px] block select-none"
          />

          {/* Bounding Boxes Layer - tightly pinned to the image bounds */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {safeFaces.map((face, idx) => {
              if (!face || !face.box) return null;
              const { box, name = 'Face', confidence = 0, status = 'UNKNOWN', student_id } = face;

              // Visibility filtering
              if (status === 'PRESENT' && !showPresent) return null;
              if (status === 'NEEDS_REVIEW' && !showReview) return null;
              if (status === 'UNKNOWN' && !showUnknown) return null;

              const img = imgRef.current;
              const natW = img?.naturalWidth || 1;
              const natH = img?.naturalHeight || 1;

              const boxX = box.x ?? 0;
              const boxY = box.y ?? 0;
              const boxW = box.w ?? box.width ?? 20;
              const boxH = box.h ?? box.height ?? 20;

              // Use percentage-based positioning for 100% responsive, sub-pixel accuracy
              const leftPct = (boxX / natW) * 100;
              const topPct = (boxY / natH) * 100;
              const widthPct = (boxW / natW) * 100;
              const heightPct = (boxH / natH) * 100;

              const isSelected = selectedStudentId && student_id === selectedStudentId;
              const isHovered = hoveredIndex === idx;
              const showTooltip = isHovered || isSelected || alwaysShowLabels;

              let colorBorder = 'border-emerald-400';
              let colorBg = 'bg-emerald-400/10';
              let badgeBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

              if (status === 'NEEDS_REVIEW') {
                colorBorder = 'border-amber-400';
                colorBg = 'bg-amber-400/15';
                badgeBg = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
              } else if (status === 'UNKNOWN') {
                colorBorder = 'border-rose-400/80';
                colorBg = 'bg-rose-400/10';
                badgeBg = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
              }

              const pct = Math.round((confidence ?? 0) * 100);

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => onSelectFace && onSelectFace(face)}
                  className={`absolute pointer-events-auto cursor-pointer transition-all duration-150 border-2 rounded-lg ${colorBorder} ${colorBg} ${
                    isSelected ? 'ring-4 ring-white shadow-[0_0_25px_rgba(255,255,255,0.8)] scale-105 z-30' : isHovered ? 'shadow-[0_0_15px_rgba(139,92,246,0.6)] z-20 scale-102' : 'z-10'
                  }`}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                    borderStyle: status === 'UNKNOWN' ? 'dashed' : 'solid'
                  }}
                >
                  {showTooltip && (
                    <div
                      className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap shadow-2xl bg-slate-950/95 text-white flex items-center gap-1.5 border border-slate-700/80 backdrop-blur-md transition-all duration-150 z-40`}
                    >
                      <span className="truncate max-w-[120px]">{name}</span>
                      <span className={`text-[10px] font-mono px-1 rounded border ${badgeBg}`}>
                        {pct}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
