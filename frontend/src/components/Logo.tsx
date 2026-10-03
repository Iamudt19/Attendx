import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'glass';
  showTagline?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'glass',
  showTagline = false,
  className = ''
}) => {
  const sizeConfig = {
    sm: { height: 22, text: 'text-lg', badge: 'text-[9px]', icon: 'w-4 h-4' },
    md: { height: 28, text: 'text-2xl', badge: 'text-[10px]', icon: 'w-5 h-5' },
    lg: { height: 36, text: 'text-3xl', badge: 'text-[11px]', icon: 'w-6 h-6' },
    xl: { height: 48, text: 'text-4xl', badge: 'text-xs', icon: 'w-8 h-8' }
  }[size];

  const textColor = variant === 'light' ? '#111827' : '#FFFFFF';
  const dotColor = '#2563EB';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* AERON-Inspired Architectural Minimalist Vector Wordmark */}
      <div className="flex flex-col">
        <svg
          height={sizeConfig.height}
          viewBox="0 0 240 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* 
            AERON-Style Stylized Letter 'A'
            - Extended left-wing crossbar flourish
            - Precise architectural 68-degree apex
          */}
          <path
            d="M 2 28 L 38 28"
            stroke={textColor}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M 9 36 L 24 4 L 39 36"
            stroke={textColor}
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="miter"
          />

          {/* Letter 'T' */}
          <path d="M 45 4 L 63 4" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 54 4 L 54 36" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />

          {/* Letter 'T' */}
          <path d="M 68 4 L 86 4" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 77 4 L 77 36" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />

          {/* Letter 'E' */}
          <path d="M 92 4 L 92 36" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 92 4 L 110 4" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 92 20 L 107 20" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 92 36 L 110 36" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />

          {/* Letter 'N' */}
          <path d="M 118 36 L 118 4 L 140 36 L 140 4" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="miter" />

          {/* Letter 'D' */}
          <path d="M 148 4 L 148 36 M 148 4 C 168 4, 168 36, 148 36" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Bold Futuristic Neural 'X' with Accent */}
          <path d="M 176 4 L 198 36" stroke={textColor} strokeWidth="3.6" strokeLinecap="round" />
          <path d="M 198 4 L 176 36" stroke={dotColor} strokeWidth="3.6" strokeLinecap="round" />

          {/* Signature Dot Period */}
          <circle cx="206" cy="34" r="2.8" fill={dotColor} />
        </svg>

        {showTagline && (
          <span className="text-[9px] uppercase tracking-[0.28em] font-mono text-[#86948a] mt-0.5 font-semibold">
            Neural Roll Call Engine
          </span>
        )}
      </div>
    </div>
  );
};
