import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export const CustomCursor: React.FC = () => {
  const { cursorEnabled, isDark } = useTheme();
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!cursorEnabled) {
      document.documentElement.classList.remove('custom-cursor-active');
      return;
    }

    // Check if device supports fine pointer (mouse) vs touch screen
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) {
      document.documentElement.classList.remove('custom-cursor-active');
      return;
    }

    document.documentElement.classList.add('custom-cursor-active');

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);

      // Check if target or parent is an interactive element
      const target = e.target as HTMLElement | null;
      if (target) {
        const isInteractive = Boolean(
          target.closest('button, a, input, select, textarea, [role="button"], [onClick], .cursor-pointer')
        );
        setIsHovered(isInteractive);
      }
    };

    const onMouseDown = () => setIsMouseDown(true);
    const onMouseUp = () => setIsMouseDown(false);
    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
    };
  }, [cursorEnabled, isVisible]);

  if (!cursorEnabled || !isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none">
      {/* Outer Glowing Pulsing Aura Ring */}
      <div
        className={`fixed top-0 left-0 rounded-full transition-transform duration-100 ease-out border backdrop-blur-[1px] ${
          isHovered
            ? isDark 
              ? 'w-12 h-12 -ml-6 -mt-6 bg-blue-500/20 border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-110'
              : 'w-12 h-12 -ml-6 -mt-6 bg-indigo-500/20 border-indigo-500/80 shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-110'
            : isDark
              ? 'w-8 h-8 -ml-4 -mt-4 bg-white/5 border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.2)]'
              : 'w-8 h-8 -ml-4 -mt-4 bg-slate-900/5 border-slate-900/30 shadow-[0_0_12px_rgba(15,23,42,0.15)]'
        } ${isMouseDown ? 'scale-75' : ''}`}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        }}
      />

      {/* Inner Precision Neural Dot */}
      <div
        className={`fixed top-0 left-0 rounded-full transition-transform duration-75 ease-out ${
          isHovered
            ? 'w-3 h-3 -ml-1.5 -mt-1.5 bg-blue-500 scale-125'
            : isDark
              ? 'w-2 h-2 -ml-1 -mt-1 bg-white shadow-[0_0_8px_#ffffff]'
              : 'w-2 h-2 -ml-1 -mt-1 bg-slate-900 shadow-[0_0_8px_rgba(15,23,42,0.5)]'
        } ${isMouseDown ? 'scale-150 bg-emerald-400' : ''}`}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        }}
      />
    </div>
  );
};
