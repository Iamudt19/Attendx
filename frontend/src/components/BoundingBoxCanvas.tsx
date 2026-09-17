import React, { useRef, useEffect } from 'react';
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

  const resolvedImageUrl = getStorageUrl(imageUrl);

  return (
    <div ref={containerRef} className="relative inline-block w-full overflow-hidden rounded-xl border border-slate-800 bg-black/40">
      <img
        ref={imgRef}
        src={resolvedImageUrl}
        alt="Classroom Capture"
        className="w-full h-auto object-contain max-h-[520px] block mx-auto"
      />

      {/* Render interactive bounding box overlays */}
      <div className="absolute inset-0 pointer-events-none">
        {recognizedFaces.map((face, idx) => {
          const { box, name, confidence, status, student_id } = face;
          
          // Image coordinates mapping
          if (!imgRef.current) return null;
          const img = imgRef.current;
          const scaleX = img.clientWidth / (img.naturalWidth || img.clientWidth || 1);
          const scaleY = img.clientHeight / (img.naturalHeight || img.clientHeight || 1);

          const left = box.x * scaleX;
          const top = box.y * scaleY;
          const width = box.w * scaleX;
          const height = box.h * scaleY;

          const isSelected = selectedStudentId && student_id === selectedStudentId;

          let colorClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-400';
          let borderStyle = 'solid';
          if (status === 'NEEDS_REVIEW') {
            colorClass = 'border-amber-500 bg-amber-500/15 text-amber-300';
            borderStyle = 'dashed';
          } else if (status === 'UNKNOWN') {
            colorClass = 'border-rose-500 bg-rose-500/15 text-rose-300';
            borderStyle = 'dotted';
          }

          if (isSelected) {
            colorClass += ' ring-4 ring-white shadow-lg';
          }

          const pct = Math.round(confidence * 100);

          return (
            <div
              key={idx}
              onClick={() => onSelectFace && onSelectFace(face)}
              className={`absolute pointer-events-auto cursor-pointer transition-all duration-150 border-2 ${colorClass}`}
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`,
                borderStyle
              }}
            >
              <div className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap shadow-md bg-slate-900/90 text-white flex items-center gap-1 border border-slate-700">
                <span>{name}</span>
                <span className={`text-[10px] px-1 rounded ${status === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-300' : status === 'NEEDS_REVIEW' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
