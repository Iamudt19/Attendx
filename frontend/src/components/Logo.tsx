import React from "react";
import { useTheme } from "../context/ThemeContext";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark" | "glass" | "auto";
  showTagline?: boolean;
  showSubtitle?: boolean;
  interactive?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  variant = "auto",
  showTagline = false,
  className = "",
}) => {
  const { isDark } = useTheme();

  const sizeConfig = {
    sm: { height: 22 },
    md: { height: 28 },
    lg: { height: 36 },
    xl: { height: 48 },
  }[size];

  const isLightSurface =
    variant === "light" || (variant === "auto" && !isDark);

  const textColor = isLightSurface ? "#111827" : "#FFFFFF";
  const accentColor = "#2563EB";

  return (
    <div className={`inline-flex items-center gap-3 select-none transition-all duration-300 ${className}`}>
      <div className="flex flex-col">
        <svg
          height={sizeConfig.height}
          viewBox="0 0 240 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          <path d="M 2 28 L 38 28" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 9 36 L 24 4 L 39 36" stroke={textColor} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="miter" />
          <path d="M 45 4 L 63 4" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 54 4 L 54 36" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 68 4 L 86 4" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 77 4 L 77 36" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 92 4 L 92 36" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 92 4 L 110 4" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 92 20 L 107 20" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 92 36 L 110 36" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 118 36 L 118 4 L 140 36 L 140 4" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="miter" />
          <path d="M 148 4 L 148 36 M 148 4 C 168 4, 168 36, 148 36" stroke={textColor} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 176 4 L 198 36" stroke={textColor} strokeWidth="3.6" strokeLinecap="round" />
          <path d="M 198 4 L 176 36" stroke={accentColor} strokeWidth="3.6" strokeLinecap="round" />
          <circle cx="206" cy="34" r="2.8" fill={accentColor} />
        </svg>

        {showTagline && (
          <span
            className={`hidden sm:inline-block text-[9px] uppercase tracking-[0.28em] font-mono mt-0.5 font-semibold transition-colors duration-300 ${
              isLightSurface ? "text-slate-400" : "text-[#86948a]"
            }`}
          >
            Neural Roll Call Engine
          </span>
        )}
      </div>
    </div>
  );
};
