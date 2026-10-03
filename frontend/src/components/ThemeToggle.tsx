import React from 'react';
import { Sun, Moon, MousePointer, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  variant?: 'slider' | 'button' | 'pill';
  size?: 'sm' | 'md';
}

export const CursorToggle: React.FC<{ className?: string; size?: 'sm' | 'md' }> = ({ 
  className = '',
  size = 'sm'
}) => {
  const { cursorEnabled, toggleCursor, isDark } = useTheme();

  return (
    <button
      onClick={toggleCursor}
      type="button"
      title={cursorEnabled ? 'Disable Custom Animated Cursor' : 'Enable Custom Animated Cursor'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-300 text-xs font-semibold select-none ${
        cursorEnabled
          ? isDark
            ? 'bg-blue-600/20 border-blue-400/40 text-blue-300 shadow-sm shadow-blue-500/20'
            : 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
          : isDark
            ? 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-white'
            : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900'
      } ${className}`}
    >
      <MousePointer className={`w-3.5 h-3.5 ${cursorEnabled ? 'text-blue-400 animate-pulse' : ''}`} />
      <span className="hidden sm:inline">{cursorEnabled ? 'Cursor On' : 'Cursor Off'}</span>
    </button>
  );
};

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  variant = 'slider',
  size = 'md' 
}) => {
  const { theme, toggleTheme, isDark } = useTheme();

  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={`p-2 rounded-xl border transition-all duration-300 flex items-center justify-center ${
          isDark
            ? 'bg-zinc-900/80 border-white/10 text-amber-300 hover:bg-zinc-800 hover:border-white/20 shadow-sm'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
        } ${className}`}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-600" />}
      </button>
    );
  }

  // Modern Sliding Toggle Pill Switch
  return (
    <button
      onClick={toggleTheme}
      type="button"
      role="switch"
      aria-checked={isDark}
      title={isDark ? 'Dark Theme (Click for Light Mode)' : 'Light Theme (Click for Dark Mode)'}
      className={`relative inline-flex items-center rounded-full transition-all duration-300 select-none p-0.5 border ${
        size === 'sm' ? 'w-14 h-7' : 'w-16 h-8'
      } ${
        isDark
          ? 'bg-black/90 border-white/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] backdrop-blur-md'
          : 'bg-slate-200/90 border-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)]'
      } ${className}`}
    >
      {/* Background Icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none text-[10px]">
        <Moon className={`w-3.5 h-3.5 transition-opacity duration-200 ${isDark ? 'text-indigo-400 opacity-90' : 'text-slate-400 opacity-40'}`} />
        <Sun className={`w-3.5 h-3.5 transition-opacity duration-200 ${isDark ? 'text-amber-400/40 opacity-40' : 'text-amber-500 opacity-100'}`} />
      </div>

      {/* Sliding Knob */}
      <span
        className={`inline-flex items-center justify-center rounded-full transform transition-transform duration-300 shadow-md ${
          size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
        } ${
          isDark
            ? 'translate-x-0 bg-zinc-800 border border-white/20 text-indigo-300 shadow-[0_2px_8px_rgba(0,0,0,0.8)]'
            : size === 'sm'
              ? 'translate-x-7 bg-white border border-slate-200 text-amber-500 shadow-sm'
              : 'translate-x-8 bg-white border border-slate-200 text-amber-500 shadow-sm'
        }`}
      >
        {isDark ? (
          <Moon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        ) : (
          <Sun className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        )}
      </span>
    </button>
  );
};
