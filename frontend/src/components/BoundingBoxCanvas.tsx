import React, { useRef, useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle2, AlertTriangle, HelpCircle, Layers, SlidersHorizontal, UserCheck } from 'lucide-react';
import { RecognizedFace } from '../types';
import { getStorageUrl } from '../services/api';

interface BoundingBoxCanvasProps {
  imageUrl: string;
  recognizedFaces: RecognizedFace[];
  selectedStudentId?: number | null;
  onSelectFace?: (face: RecognizedFace) => void;
}

export const BoundingBoxCanvas: React.FC<BoundingBoxCanvasProps> = ({
  imageUrl,
  recognizedFaces,
  selectedStudentId,
  onSelectFace
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Visibility & mode filters
  const [showPresent, setShowPresent] = useState(true);
  const [showReview, setShowReview] = useState(true);
  const [showUnknown, setShowUnknown] = useState(false); // Default OFF to eliminate clutter!
  const [alwaysShowLabels, setAlwaysShowLabels] = useState(false); // Default OFF: tooltips on hover only!
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const resolvedImageUrl = getStorageUrl(imageUrl);

  const presentCount = recognizedFaces.filter(f => f.status === 'PRESENT').length;
  const reviewCount = recognizedFaces.filter(f => f.status === 'NEEDS_REVIEW').length;
  const unknownCount = recognizedFaces.filter(f => f.status === 'UNKNOWN').length;

  return (
    <div className="space-y-2">
      {/* Interactive Toolbar for Clutter Reduction */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-violet-400" />
            Filters:
          </span>

          <button
            type="button"
            onClick={() => setShowPresent(!showPresent)}
            className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
              showPresent
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Present ({presentCount})
          </button>

          <button
            type="button"
            onClick={() => setShowReview(!showReview)}
            className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
              showReview
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Review ({reviewCount})
          </button>

          <button
            type="button"
            onClick={() => setShowUnknown(!showUnknown)}
            className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
              showUnknown
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <HelpCircle className="w-3 h-3 text-rose-400" />
            Unknowns ({unknownCount})
          </button>
        </div>

        <button
          type="button"
          onClick={() => setAlwaysShowLabels(!alwaysShowLabels)}
          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 transition-colors"
        >
          {alwaysShowLabels ? <Eye className="w-3 h-3 text-violet-400" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
          {alwaysShowLabels ? 'Labels: Always Visible' : 'Labels: On Hover'}
        </button>
      </div>

      {/* Main Image Canvas */}
      <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl border border-slate-800 bg-black/60 shadow-2xl">
        <img
          ref={imgRef}
          src={resolvedImageUrl}
          alt="Classroom Capture"
          className="w-full h-auto object-contain max-h-[520px] block mx-auto select-none"
        />

        {/* Bounding Boxes Layer */}
        <div className="absolute inset-0 pointer-events-none">
          {recognizedFaces.map((face, idx) => {
            const { box, name, confidence, status, student_id } = face;

            // Visibility filtering
            if (status === 'PRESENT' && !showPresent) return null;
            if (status === 'NEEDS_REVIEW' && !showReview) return null;
            if (status === 'UNKNOWN' && !showUnknown) return null;

            if (!imgRef.current) return null;
            const img = imgRef.current;
            const scaleX = img.clientWidth / (img.naturalWidth || img.clientWidth || 1);
            const scaleY = img.clientHeight / (img.naturalHeight || img.clientHeight || 1);

            const left = box.x * scaleX;
            const top = box.y * scaleY;
            const width = box.w * scaleX;
            const height = box.h * scaleY;

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

            const pct = Math.round(confidence * 100);

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSelectFace && onSelectFace(face)}
                className={`absolute pointer-events-auto cursor-pointer transition-all duration-200 border-2 rounded-lg ${colorBorder} ${colorBg} ${
                  isSelected ? 'ring-4 ring-white shadow-[0_0_25px_rgba(255,255,255,0.8)] scale-105 z-30' : isHovered ? 'shadow-[0_0_15px_rgba(139,92,246,0.6)] z-20 scale-102' : 'z-10'
                }`}
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  borderStyle: status === 'UNKNOWN' ? 'dashed' : 'solid'
                }}
              >
                {/* Minimalist Floating Tooltip: Only rendered on Hover/Selection or when Always Visible */}
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
  );
};
