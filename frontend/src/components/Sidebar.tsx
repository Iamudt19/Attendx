import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Camera, History, Users, BookOpen, FileSpreadsheet, ShieldCheck } from 'lucide-react';
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
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 flex-1 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Privacy Notice Box */}
      <div className="p-4 m-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Biometric Privacy Notice</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Facial embeddings are encrypted and processed locally. Consent is managed institutionally.
        </p>
      </div>
    </aside>
  );
};
