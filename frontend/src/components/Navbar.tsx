import React from 'react';
import { Camera, LogOut, User as UserIcon, Shield, Sparkles } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <header className="h-16 bg-[#070A0F] border-b border-white/[0.08] sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Brand logo & Tagline */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold">
          <Camera className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white font-mono">ATTEND<span className="text-blue-500">X</span></span>
            <span className="px-2 py-0.2 text-[9px] font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
              VISION ENGINE
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">Automated Multi-Angle Biometric Attendance</p>
        </div>
      </div>

      {/* User profile & controls */}
      {user && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 bg-[#0D121C] px-3 py-1.5 rounded-lg border border-white/[0.08]">
            <div className="w-7 h-7 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs font-mono">
              {user.name.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-slate-200">{user.name}</div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                {user.role === 'ADMIN' ? (
                  <span className="text-amber-400 font-medium flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" /> ADMIN</span>
                ) : (
                  <span>FACULTY</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-[#0D121C] rounded-lg border border-transparent hover:border-white/10 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};
