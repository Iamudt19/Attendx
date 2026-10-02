import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface LogoProps {
  className?: string;
  showSubtitle?: boolean;
  interactive?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "h-8", 
  showSubtitle = true,
  interactive = true 
}) => {
  const { theme, toggleTheme, isAnimating } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div 
      onClick={interactive ? toggleTheme : undefined}
      className={`group flex items-center gap-3 select-none cursor-pointer transition-transform duration-300 ${
        isAnimating ? 'animate-logo-flip' : 'hover:scale-[1.02]'
      } ${className}`}
      title="Click to toggle Light/Dark Mode"
    >
      {/* Dynamic Animated Logo SVG */}
      <div className="relative flex items-center">
        <svg 
          viewBox="0 0 440 85" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-7 sm:h-9 w-auto transition-all duration-500 ease-out drop-shadow-sm"
        >
          {/* Custom Lead 'A' with Extended Checkmark Crossbar */}
          <g className={`transition-colors duration-500 ${isDark ? 'fill-white' : 'fill-slate-900'}`}>
            {/* A Outer Stems */}
            <path 
              d="M 45 70 L 15 70 L 42 12 L 58 12 L 85 70 L 69 70 L 61 54 L 32 54 Z M 47 24 L 37 43 L 56 43 Z" 
            />
            {/* Extended Checkmark Crossbar (Highlights in accent color) */}
            <path 
              d="M 4 58 L 26 58 L 40 44 L 50 44 L 33 63 L 4 63 Z" 
              className={`transition-all duration-500 ${
                isDark ? 'fill-emerald-400 group-hover:fill-emerald-300' : 'fill-indigo-600 group-hover:fill-indigo-500'
              }`}
            />
          </g>

          {/* 'TTEND' Typographic Body */}
          <g className={`transition-colors duration-500 ${isDark ? 'fill-white' : 'fill-slate-900'}`}>
            <text 
              x="90" 
              y="68" 
              fontSize="60" 
              fontWeight="800" 
              letterSpacing="0.08em"
              style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
            >
              TTEND
            </text>
          </g>

          {/* Stylized AI 'X' Mark with Camera/Scan Cross-cuts */}
          <g className={`transition-colors duration-500 ${
            isDark ? 'fill-blue-500 group-hover:fill-blue-400' : 'fill-indigo-600 group-hover:fill-indigo-700'
          }`}>
            <path 
              d="M 338 14 L 362 14 L 384 45 L 406 14 L 430 14 L 396 55 L 430 70 L 406 70 L 384 39 L 362 70 L 338 70 L 370 39 Z" 
            />
          </g>

          {/* Terminal Dot */}
          <circle 
            cx="438" 
            cy="65" 
            r="4.5" 
            className={`transition-colors duration-500 ${
              isDark ? 'fill-emerald-400' : 'fill-indigo-600'
            }`} 
          />
        </svg>

        {/* Pulse ring on logo interaction */}
        <span className={`absolute -inset-1 rounded-full opacity-0 group-hover:opacity-25 transition-opacity duration-300 blur ${
          isDark ? 'bg-blue-500' : 'bg-indigo-600'
        }`} />
      </div>

      {showSubtitle && (
        <div className="hidden md:flex flex-col border-l border-current/20 pl-2.5 transition-colors duration-500">
          <span className={`text-[9px] font-mono tracking-widest uppercase font-bold transition-colors duration-500 ${
            isDark ? 'text-blue-400' : 'text-indigo-600'
          }`}>
            VISION ENGINE
          </span>
          <span className={`text-[10px] tracking-tight transition-colors duration-500 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Biometric Attendance
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
