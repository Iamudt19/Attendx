import React from 'react';
import { NavLink } from 'react-router-dom';
import { User } from '../types';

interface SidebarProps {
  user: User | null;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: 'dashboard' },
    { label: 'Attendance Canvas', path: '/take-attendance', icon: 'center_focus_strong' },
    { label: 'Student Roster', path: '/students', icon: 'groups' },
    { label: 'Reports & Exports', path: '/history', icon: 'query_stats' },
    { label: 'Audit Queue', path: '/review-attendance', icon: 'verified_user', badge: '3' },
    { label: 'Academic Classes', path: '/classes', icon: 'menu_book' },
  ];

  return (
    <aside className="w-72 bg-[#0e0e10] border-r border-[#3c4a42]/30 flex flex-col justify-between shrink-0 select-none min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col">
        {/* Workspace Architecture header */}
        <div className="px-5 py-5">
          <div className="px-2 pb-2 text-[10px] uppercase font-bold tracking-widest text-[#86948a]">
            Workspace Architecture
          </div>
          <nav className="space-y-1 mt-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#2a2a2c] text-[#e5e1e4] border border-[#3c4a42]/50 shadow-sm'
                      : 'text-[#bbcabf] hover:text-[#e5e1e4] hover:bg-[#201f22] border border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-[#d97707]/20 text-[#ffb77d] border border-[#d97707]/30 text-[10px] font-mono font-semibold">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Vision Node Edge status widget */}
      <div className="p-4 border-t border-[#3c4a42]/20 bg-[#0e0e10]">
        <div className="flex items-center justify-between p-3 rounded-lg bg-[#1c1b1d] border border-[#3c4a42]/30">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4edea3]"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#e5e1e4] font-mono font-semibold">Vision Node 01</span>
              <span className="text-[10px] text-[#86948a] font-mono">Synced 99.8%</span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#86948a] text-[16px]">tune</span>
        </div>
      </div>
    </aside>
  );
};
