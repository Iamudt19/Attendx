import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-[#131315]/90 backdrop-blur-xl border-b border-[#3c4a42]/30 sticky top-0 z-40 px-6 flex items-center justify-between gap-4">
      {/* Brand logo (Left) */}
      <div 
        onClick={() => navigate('/dashboard')} 
        className="flex items-center gap-3 cursor-pointer group select-none min-w-[220px]"
      >
        <div className="w-8 h-8 rounded-lg bg-[#201f22] border border-[#3c4a42]/40 text-[#4edea3] flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105">
          <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm tracking-tight text-[#e5e1e4]">ATTENDX.</span>
          <span className="text-[10px] text-[#86948a] uppercase tracking-widest font-mono">AI Intelligence</span>
        </div>
      </div>

      {/* Middle search bar & semester badge */}
      <div className="hidden lg:flex items-center gap-4 flex-1 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#3c4a42]/30 bg-[#1c1b1d] text-[#bbcabf] text-[11px] uppercase tracking-wider font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3]"></span>
          <span>Fall 2024 • Term A</span>
        </div>

        <div className="relative flex-1">
          <div className="flex items-center w-full h-9 pl-3 pr-2 rounded-lg bg-[#1c1b1d] border border-[#3c4a42]/30 focus-within:border-[#86948a] transition-colors">
            <span className="material-symbols-outlined text-[#86948a] text-[16px] mr-2">search</span>
            <input 
              className="w-full bg-transparent border-0 outline-none text-xs text-[#e5e1e4] placeholder:text-[#86948a]/70 focus:ring-0" 
              placeholder="Search students, courses, or session archives..." 
              type="text"
            />
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[#3c4a42]/40 bg-[#201f22] font-mono text-[10px] text-[#86948a] shadow-xs">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right User profile & actions */}
      <div className="flex items-center gap-2.5">
        <button 
          onClick={() => navigate('/take-attendance')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#39393b] border border-[#3c4a42]/50 hover:bg-[#353437] text-[#e5e1e4] text-xs font-medium transition-all shadow-xs" 
          type="button"
        >
          <span className="material-symbols-outlined text-[16px] text-[#4edea3]">add</span>
          <span>New Session</span>
        </button>

        <div className="h-4 w-px bg-[#3c4a42]/30 mx-1"></div>

        {user && (
          <div className="flex items-center gap-2.5 pl-1">
            <div className="w-8 h-8 rounded-full bg-[#201f22] border border-[#3c4a42]/40 text-[#4edea3] flex items-center justify-center font-bold text-xs">
              {user.name.charAt(0)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs text-[#e5e1e4] font-medium leading-tight">{user.name}</span>
              <span className="text-[10px] text-[#86948a] uppercase tracking-wider font-mono leading-tight">
                {user.role === 'ADMIN' ? 'Admin Ops' : 'Computer Science'}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 text-[#86948a] hover:text-[#ffb4ab] hover:bg-[#93000a]/20 rounded-lg transition-colors ml-1"
              title="Sign Out"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
