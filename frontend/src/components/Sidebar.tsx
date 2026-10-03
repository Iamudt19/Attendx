import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Camera, Users, BarChart3, 
  ShieldCheck, BookOpen, Sliders, X, Sparkles 
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User | null;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  mobileOpen = false, 
  onCloseMobile 
}) => {
  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Attendance Canvas', path: '/take-attendance', icon: Camera },
    { label: 'Student Roster', path: '/students', icon: Users },
    { label: 'Reports & Exports', path: '/history', icon: BarChart3 },
    { label: 'Audit Queue', path: '/review-attendance', icon: ShieldCheck, badge: '3' },
    { label: 'Academic Classes', path: '/classes', icon: BookOpen },
  ];

  const content = (
    <div className="flex flex-col justify-between h-full p-4">
      <div className="flex flex-col">
        {/* Mobile Drawer Close Header */}
        <div className="flex items-center justify-between lg:hidden pb-4 mb-2 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="font-bold text-sm text-[var(--text-primary)]">AttendX Mobile Menu</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Architecture Header */}
        <div className="px-2 pb-2 text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)] opacity-80 font-mono">
          Workspace Architecture
        </div>

        <nav className="space-y-1 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.01]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4.5 h-4.5" />
                  <span className="text-xs sm:text-sm">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Vision Node Status Widget */}
      <div className="pt-4 border-t border-[var(--border-color)] mt-auto">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] text-[var(--text-primary)] font-mono font-bold">Vision Node 01</span>
              <span className="text-[10px] text-[var(--text-secondary)] font-mono">Synced 99.8%</span>
            </div>
          </div>
          <Sliders className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-72 bg-[var(--bg-main)] border-r border-[var(--border-color)] flex-col shrink-0 select-none min-h-[calc(100vh-4rem)] transition-colors duration-400">
        {content}
      </aside>

      {/* Mobile Slide-over Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            onClick={onCloseMobile} 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" 
          />
          <aside className="relative w-80 max-w-[85vw] bg-[var(--bg-main)] border-r border-[var(--border-color)] h-full shadow-2xl z-50 animate-in slide-in-from-left duration-250">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};
