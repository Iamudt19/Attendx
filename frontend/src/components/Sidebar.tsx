import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Camera, Users, BarChart3, 
  ShieldCheck, BookOpen, X, ChevronLeft, ChevronRight,
  PanelLeftClose, PanelLeftOpen
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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('attendx_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('attendx_sidebar_collapsed', String(next));
      return next;
    });
  };

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Mark Attendance', path: '/take-attendance', icon: Camera },
    { label: 'Student Roster', path: '/students', icon: Users },
    { label: 'Attendance Records', path: '/history', icon: BarChart3 },
    { label: 'Verify Attendance', path: '/review-attendance', icon: ShieldCheck },
    { label: 'Classes & Sections', path: '/classes', icon: BookOpen },
  ];

  const renderNavContent = (collapsed: boolean) => (
    <div className={`flex flex-col justify-between h-full ${collapsed ? 'p-2.5' : 'p-4'}`}>
      <div className="flex flex-col">
        {/* Mobile Drawer Close Header */}
        <div className="flex items-center justify-between lg:hidden pb-4 mb-2 border-b border-[var(--border-color)]">
          <span className="font-bold text-xs text-[var(--text-primary)] font-mono uppercase tracking-wider">AttendX Menu</span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface)]"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Title & Desktop Collapse Toggle */}
        <div className="hidden lg:flex items-center justify-between pb-2 mb-1 px-1">
          {!collapsed && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] font-mono opacity-80">
              Navigation
            </span>
          )}
          <button
            onClick={toggleCollapse}
            className={`p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] transition-all ${
              collapsed ? 'mx-auto' : 'ml-auto'
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${collapsed ? 'justify-center p-2.5' : 'px-3.5 py-2.5 gap-3'} rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="text-xs truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="pt-4 border-t border-[var(--border-color)] mt-auto">
        <div className={`flex items-center ${collapsed ? 'justify-center p-2' : 'justify-between p-2.5'} rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]`}>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            {!collapsed && (
              <span className="text-[11px] text-[var(--text-secondary)] font-mono font-medium">AttendX Cloud v2.4</span>
            )}
          </div>
          {!collapsed && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Online
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside className={`hidden lg:flex ${isCollapsed ? 'w-18' : 'w-64'} bg-[var(--bg-main)] border-r border-[var(--border-color)] flex-col shrink-0 select-none min-h-[calc(100vh-4rem)] transition-all duration-250 ease-in-out`}>
        {renderNavContent(isCollapsed)}
      </aside>

      {/* Mobile Slide-over Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            onClick={onCloseMobile} 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
          />
          <aside className="relative w-72 max-w-[85vw] bg-[var(--bg-main)] border-r border-[var(--border-color)] h-full shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {renderNavContent(false)}
          </aside>
        </div>
      )}
    </>
  );
};
