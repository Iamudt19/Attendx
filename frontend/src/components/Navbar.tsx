import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Upload, 
  Search, 
  Plus, 
  LogOut, 
  X, 
  Sliders, 
  CheckCircle2, 
  Layers, 
  Users, 
  FileSpreadsheet, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { User, ClassItem } from '../types';
import { ClassService } from '../services/api';

import { Logo } from './Logo';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showTermDropdown, setShowTermDropdown] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('Fall 2024 • Term A');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [selectedMode, setSelectedMode] = useState<'upload' | 'camera'>('upload');

  const terms = [
    'Fall 2024 • Term A (Current)',
    'Spring 2025 • Term B',
    'Academic Year 2026-27'
  ];

  useEffect(() => {
    ClassService.getClasses()
      .then((data) => {
        setClasses(data || []);
        if (data && data.length > 0) {
          setSelectedClassId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Global ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setShowSearchModal(false);
        setShowNewSessionModal(false);
        setShowTermDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchResults = [
    { title: 'Overview Dashboard', subtitle: 'Real-time metrics, recent sessions', path: '/dashboard', icon: 'dashboard' },
    { title: 'Attendance Canvas', subtitle: 'Launch camera or upload multi-face photos', path: '/take-attendance', icon: 'center_focus_strong' },
    { title: 'Student Roster', subtitle: 'View enrolled students and facial biometrics', path: '/students', icon: 'groups' },
    { title: 'Reports & Exports', subtitle: 'Attendance history and Excel .xlsx exports', path: '/history', icon: 'query_stats' },
    { title: 'Audit Queue', subtitle: 'Review and verify multi-photo classroom scans', path: '/review-attendance', icon: 'verified_user' },
    { title: 'Academic Classes', subtitle: 'Manage course sections and schedules', path: '/classes', icon: 'menu_book' },
  ].filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLaunchSession = () => {
    setShowNewSessionModal(false);
    navigate('/take-attendance');
  };

  return (
    <>
      <header className="h-16 bg-[#131315]/95 backdrop-blur-xl border-b border-[#3c4a42]/30 sticky top-0 z-40 px-6 flex items-center justify-between gap-4 select-none">
        {/* Brand logo (Left) */}
        <div 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-3 cursor-pointer group select-none min-w-[200px]"
        >
          <Logo size="sm" variant="glass" showTagline />
        </div>

        {/* Middle search bar & semester badge */}
        <div className="hidden lg:flex items-center gap-4 flex-1 max-w-xl">
          {/* Term selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTermDropdown(!showTermDropdown)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#3c4a42]/30 bg-[#1c1b1d] hover:bg-[#252427] text-[#bbcabf] text-[11px] uppercase tracking-wider font-semibold transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#4edea3]"></span>
              <span>{selectedTerm}</span>
              <ChevronDown className="w-3 h-3 text-[#86948a]" />
            </button>

            {showTermDropdown && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-[#1c1b1d] border border-[#3c4a42]/50 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in duration-100">
                {terms.map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setSelectedTerm(term.replace(' (Current)', ''));
                      setShowTermDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-[#e5e1e4] hover:bg-[#2a2a2c] flex items-center justify-between transition-colors"
                  >
                    <span>{term}</span>
                    {selectedTerm === term.replace(' (Current)', '') && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#4edea3]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Search Bar Trigger */}
          <div 
            onClick={() => setShowSearchModal(true)}
            className="relative flex-1 cursor-pointer"
          >
            <div className="flex items-center w-full h-9 pl-3 pr-2 rounded-lg bg-[#1c1b1d] border border-[#3c4a42]/30 hover:border-[#86948a]/60 focus-within:border-[#86948a] transition-colors">
              <Search className="w-3.5 h-3.5 text-[#86948a] mr-2" />
              <span className="w-full text-xs text-[#86948a]/80 select-none">
                Search students, courses, or session archives...
              </span>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[#3c4a42]/40 bg-[#201f22] font-mono text-[10px] text-[#86948a] shadow-xs">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right User profile & actions */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setShowNewSessionModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-all shadow-sm active:scale-[0.98]" 
            type="button"
          >
            <Plus className="w-3.5 h-3.5" />
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
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Search Palette Modal (⌘K) ── */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 px-4 animate-in fade-in duration-150">
          <div className="bg-[#18181b] border border-[#3c4a42]/50 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="flex items-center px-4 py-3.5 border-b border-[#3c4a42]/30">
              <Search className="w-4 h-4 text-[#86948a] mr-3" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a command, student name, or page..."
                className="bg-transparent border-none outline-none text-sm text-white placeholder-[#86948a] w-full"
              />
              <button 
                onClick={() => setShowSearchModal(false)}
                className="text-[#86948a] hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 max-h-80 overflow-y-auto space-y-1">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-[#86948a]">
                Quick Navigation
              </div>
              {searchResults.map((item) => (
                <div
                  key={item.path}
                  onClick={() => {
                    setShowSearchModal(false);
                    navigate(item.path);
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#27272a] cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px] text-[#4edea3] group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-white">{item.title}</div>
                      <div className="text-[11px] text-[#86948a]">{item.subtitle}</div>
                    </div>
                  </div>
                  <kbd className="text-[10px] font-mono text-[#86948a] bg-[#201f22] px-1.5 py-0.5 rounded border border-[#3c4a42]/30">
                    Jump
                  </kbd>
                </div>
              ))}
              {searchResults.length === 0 && (
                <div className="p-4 text-center text-xs text-[#86948a]">
                  No matching results for "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── New Session Quick Launcher Modal ── */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#141416] border border-[#3c4a42]/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-[#e5e1e4]">
            <button
              onClick={() => setShowNewSessionModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#201f22] hover:bg-[#2a2a2c] flex items-center justify-center text-[#86948a] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Launch Attendance Session</h3>
                <p className="text-xs text-[#86948a]">Configure classroom environment & start multi-face scan</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#86948a] uppercase tracking-wider mb-1.5">
                  Academic Class & Section
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(Number(e.target.value))}
                  className="w-full bg-[#1c1b1d] border border-[#3c4a42]/50 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Section {c.section} ({c.academic_year})
                    </option>
                  ))}
                  {classes.length === 0 && (
                    <option value="1">CSE - Section A (2026)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#86948a] uppercase tracking-wider mb-1.5">
                  Capture Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMode('upload')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      selectedMode === 'upload'
                        ? 'bg-blue-600/15 border-blue-500/60 text-white'
                        : 'bg-[#1c1b1d] border-[#3c4a42]/30 text-[#86948a] hover:border-[#3c4a42]'
                    }`}
                  >
                    <Upload className="w-5 h-5 text-blue-400 mb-2" />
                    <div className="text-xs font-bold text-white">Multi-Photo Upload</div>
                    <div className="text-[10px] text-[#86948a] mt-0.5">Wide angle lecture hall shots</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMode('camera')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      selectedMode === 'camera'
                        ? 'bg-blue-600/15 border-blue-500/60 text-white'
                        : 'bg-[#1c1b1d] border-[#3c4a42]/30 text-[#86948a] hover:border-[#3c4a42]'
                    }`}
                  >
                    <Camera className="w-5 h-5 text-emerald-400 mb-2" />
                    <div className="text-xs font-bold text-white">Live Camera Scanner</div>
                    <div className="text-[10px] text-[#86948a] mt-0.5">Real-time webcam/edge feed</div>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-[#1c1b1d] rounded-xl border border-[#3c4a42]/30 flex items-center justify-between text-xs">
                <span className="text-[#86948a]">Neural Inference Threshold:</span>
                <span className="font-mono text-[#4edea3] font-bold">0.65 Cosine Sim</span>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleLaunchSession}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 text-sm"
                >
                  <span>Proceed to Attendance Canvas</span>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
