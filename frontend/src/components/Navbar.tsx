import React from 'react';
import { Camera, LogOut, User as UserIcon, Shield, Sparkles } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Brand logo & Tagline */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-bold text-xl">
          <Camera className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-white">Attend<span className="text-blue-500">X</span></span>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> AI Powered
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">"One Photo. Complete Attendance."</p>
        </div>
      </div>

      {/* User profile & controls */}
      {user && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-medium text-sm">
              {user.name.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-semibold text-slate-200">{user.name}</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                {user.role === 'ADMIN' ? (
                  <span className="text-amber-400 font-medium flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" /> Admin</span>
                ) : (
                  <span>Teacher</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      )}
    </header>
  );
};
