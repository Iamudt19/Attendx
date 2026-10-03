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
    { label: 'Mark Attendance', path: '/take-attendance', icon: Camera },
    { label: 'Student Roster', path: '/students', icon: Users },
    { label: 'Attendance Records', path: '/history', icon: BarChart3 },
    { label: 'Verify Attendance', path: '/review-attendance', icon: ShieldCheck },
    { label: 'Classes & Sections', path: '/classes', icon: BookOpen },
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

        {/* Section Title */}
        <div className="px-2 pb-2 text-[11px] uppercase font-bold tracking-wider text-[var(--text-secondary)] opacity-70">
          Navigation
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
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{item.label}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="pt-4 border-t border-[var(--border-color)] mt-auto">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">AttendX Cloud v2.4</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            Online
          </span>
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
