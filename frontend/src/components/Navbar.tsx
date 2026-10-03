import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, LogOut, X, CheckCircle2, 
  ChevronDown, Sun, Moon, Menu, Sparkles, Shield 
} from 'lucide-react';
import { User, ClassItem } from '../types';
import { ClassService } from '../services/api';
import { Logo } from './Logo';
import { ThemeToggle, CursorToggle } from './ThemeToggle';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  toggleTheme?: () => void;
  isDark?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  onLogout, 
  toggleTheme, 
  isDark = true,
  onToggleMobileMenu 
}) => {
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
      <header className="h-16 bg-[var(--bg-main)] border-b border-[var(--border-color)] sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 select-none transition-colors duration-400">
        {/* Left: Mobile Menu Trigger + Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="p-2 lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)]"
              title="Open Navigation Menu"
              type="button"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div 
            onClick={() => navigate('/dashboard')} 
            className="flex items-center gap-2 cursor-pointer group select-none"
          >
            <Logo size="sm" showSubtitle={false} interactive={false} />
          </div>
        </div>

        {/* Middle: Desktop Term Selector & Search Bar */}
        <div className="hidden lg:flex items-center gap-4 flex-1 max-w-xl">
          {/* Term selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTermDropdown(!showTermDropdown)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] text-[11px] uppercase tracking-wider font-semibold font-mono hover:border-indigo-500/40 transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>{selectedTerm}</span>
              <ChevronDown className="w-3 h-3 text-[var(--text-secondary)]" />
            </button>

            {showTermDropdown && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl py-1 z-50 animate-in fade-in duration-100">
                {terms.map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setSelectedTerm(term.replace(' (Current)', ''));
                      setShowTermDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-inset)] flex items-center justify-between transition-colors"
                  >
                    <span>{term}</span>
                    {selectedTerm === term.replace(' (Current)', '') && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
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
            <div className="flex items-center w-full h-9 pl-3 pr-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-indigo-500/40 transition-colors shadow-sm">
              <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] mr-2 shrink-0" />
              <span className="w-full text-xs text-[var(--text-secondary)] select-none truncate">
                Search students, courses, or session archives...
              </span>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-inset)] font-mono text-[10px] text-[var(--text-secondary)] shadow-xs">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right: Search Mobile Icon + Theme Toggle + New Session + User */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Mobile Search Trigger Button */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="p-2 lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)]"
            title="Search"
            type="button"
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          {/* Custom Animated Cursor Toggle */}
          <CursorToggle size="sm" />

          {/* Theme Toggle Slider Switch */}
          <ThemeToggle variant="slider" size="sm" />

          <button 
            onClick={() => setShowNewSessionModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all" 
            type="button"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Session</span>
          </button>

          {user && (
            <div className="flex items-center gap-1.5 sm:gap-2.5 pl-0.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs font-mono">
                {user.name.charAt(0)}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs text-[var(--text-primary)] font-semibold leading-tight">{user.name}</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-mono leading-tight flex items-center gap-1">
                  {user.role === 'ADMIN' ? (
                    <span className="text-amber-500 font-medium flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" /> ADMIN</span>
                  ) : (
                    <span>FACULTY</span>
                  )}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="p-2 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                title="Sign Out"
                type="button"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Search Palette Modal ── */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="flex items-center px-4 py-3.5 border-b border-[var(--border-color)]">
              <Search className="w-4 h-4 text-[var(--text-secondary)] mr-3 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a command, student name, or page..."
                className="bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] w-full"
              />
              <button 
                onClick={() => setShowSearchModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 max-h-80 overflow-y-auto space-y-1">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] font-mono">
                Quick Navigation
              </div>
              {searchResults.map((item) => (
                <div
                  key={item.path}
                  onClick={() => {
                    setShowSearchModal(false);
                    navigate(item.path);
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--bg-inset)] cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-semibold text-[var(--text-primary)]">{item.title}</div>
                  </div>
                  <kbd className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-inset)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                    Jump
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── New Session Launcher Modal ── */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-[var(--text-primary)]">
            <button
              onClick={() => setShowNewSessionModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-[var(--bg-inset)] hover:bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Launch Attendance Session</h3>
                <p className="text-xs text-[var(--text-secondary)]">Configure classroom environment & start multi-face scan</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 font-mono">
                  Academic Class & Section
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(Number(e.target.value))}
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors font-medium"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Section {c.section} ({c.academic_year})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleLaunchSession}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
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
