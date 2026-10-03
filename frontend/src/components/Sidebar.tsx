import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  X, 
  Cpu, 
  Zap, 
  Database, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  Sliders 
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User | null;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const [showNodeModal, setShowNodeModal] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: 'dashboard' },
    { label: 'Attendance Canvas', path: '/take-attendance', icon: 'center_focus_strong' },
    { label: 'Student Roster', path: '/students', icon: 'groups' },
    { label: 'Reports & Exports', path: '/history', icon: 'query_stats' },
    { label: 'Audit Queue', path: '/review-attendance', icon: 'verified_user', badge: '3' },
    { label: 'Academic Classes', path: '/classes', icon: 'menu_book' },
  ];

  return (
    <>
      <aside className="w-72 bg-[#0e0e10] border-r border-[#3c4a42]/30 flex flex-col justify-between shrink-0 select-none min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col">
          {/* Workspace Architecture header */}
          <div className="px-5 py-5">
            <div className="px-2 pb-2 text-[10px] uppercase font-bold tracking-widest text-[#86948a]">
              Workspace Architecture
            </div>
            <nav className="space-y-1 mt-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#2a2a2c] text-[#e5e1e4] border border-[#3c4a42]/50 shadow-sm'
                        : 'text-[#bbcabf] hover:text-[#e5e1e4] hover:bg-[#201f22] border border-transparent'
                    }`}
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
                );
              })}
            </nav>
          </div>
        </div>

        {/* Vision Node Edge status widget (Interactive) */}
        <div className="p-4 border-t border-[#3c4a42]/20 bg-[#0e0e10]">
          <div 
            onClick={() => setShowNodeModal(true)}
            className="flex items-center justify-between p-3 rounded-xl bg-[#1c1b1d] hover:bg-[#252427] border border-[#3c4a42]/30 hover:border-[#4edea3]/40 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4edea3]"></span>
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#e5e1e4] font-mono font-semibold group-hover:text-white">
                  Vision Node 01
                </span>
                <span className="text-[10px] text-[#86948a] font-mono">Synced 99.8%</span>
              </div>
            </div>
            <Sliders className="w-3.5 h-3.5 text-[#86948a] group-hover:text-[#4edea3] transition-colors" />
          </div>
        </div>
      </aside>

      {/* ── Vision Edge Node Diagnostics Modal ── */}
      {showNodeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#141416] border border-[#3c4a42]/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-[#e5e1e4]">
            <button
              onClick={() => setShowNodeModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#201f22] hover:bg-[#2a2a2c] flex items-center justify-center text-[#86948a] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-[#4edea3] flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-white">Vision Edge Node #01</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#4edea3] text-[10px] font-mono font-bold">
                    ONLINE
                  </span>
                </div>
                <p className="text-xs text-[#86948a]">Edge Neural Acceleration & Runtime Diagnostics</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-[#1c1b1d] rounded-2xl border border-[#3c4a42]/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-[#bbcabf]">Inference Latency</span>
                </div>
                <span className="font-mono font-bold text-white">18.4 ms / frame</span>
              </div>

              <div className="p-3.5 bg-[#1c1b1d] rounded-2xl border border-[#3c4a42]/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span className="text-[#bbcabf]">Detection Pipeline</span>
                </div>
                <span className="font-mono font-semibold text-white">ONNX YuNet v2 (640x640)</span>
              </div>

              <div className="p-3.5 bg-[#1c1b1d] rounded-2xl border border-[#3c4a42]/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-[#bbcabf]">Verification Model</span>
                </div>
                <span className="font-mono font-semibold text-white">SFace (512-dim Embeddings)</span>
              </div>

              <div className="p-3.5 bg-[#1c1b1d] rounded-2xl border border-[#3c4a42]/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span className="text-[#bbcabf]">Database Sync Target</span>
                </div>
                <span className="font-mono text-emerald-400 font-semibold">Supabase PostgreSQL 15</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#3c4a42]/30 flex justify-end">
              <button
                onClick={() => setShowNodeModal(false)}
                className="bg-[#2a2a2c] hover:bg-[#353437] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
