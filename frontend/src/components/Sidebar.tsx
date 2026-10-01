import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Camera, History, Users, BookOpen, ShieldCheck } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Take Attendance', path: '/take-attendance', icon: Camera },
    { label: 'Attendance History', path: '/history', icon: History },
    { label: 'Students Directory', path: '/students', icon: Users },
    { label: 'Classes & Subjects', path: '/classes', icon: BookOpen },
  ];

  return (
    <aside className="w-64 bg-[#070A0F] border-r border-white/[0.08] flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-3 flex-1 space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
          NAVIGATION //
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#0D121C]'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Security & System Info */}
      <div className="p-3 m-3 rounded-lg bg-[#0D121C] border border-white/[0.06] text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-300 text-[10px] font-mono uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Biometric Privacy</span>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-500">
          Vectors processed locally with 128-D Euclidean hashing. No raw biometric imagery retained without authorization.
        </p>
      </div>
    </aside>
  );
};
