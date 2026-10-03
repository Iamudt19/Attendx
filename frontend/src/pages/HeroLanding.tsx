import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  ChevronDown, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Users, 
  BarChart3, 
  Scan, 
  X,
  Play,
  Layers,
  GraduationCap,
  Lock,
  Cpu,
  Database,
  Building2,
  Check,
  Sun,
  Moon
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

interface CaseStory {
  id: string;
  name: string;
  badge: string;
  logoText: string;
  logoStyle?: string;
  image: string;
  quote: string;
  author: string;
  role: string;
  institution: string;
  avatarUrl: string;
  storyLinkText: string;
  stats: {
    speedup: string;
    accuracy: string;
    seatsPerScan: string;
  };
}

const CASE_STORIES: CaseStory[] = [
  {
    id: 'apex',
    name: 'Apex Institute',
    badge: 'Higher Ed',
    logoText: 'APEX',
    image: '/hero-scenic-1.jpg',
    quote: 'The support from AttendX at all layers, from neural mesh tuning to multi-angle classroom verification, really made the difference.',
    author: 'Dr. Benjamin Vance',
    role: 'Dean of Academic Computing',
    institution: 'Apex Tech',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    storyLinkText: "Apex's story",
    stats: {
      speedup: '12m → 2s',
      accuracy: '99.8%',
      seatsPerScan: '180 seats'
    }
  },
  {
    id: 'stanford',
    name: 'Stanford Labs',
    badge: 'Research AI',
    logoText: 'STANFORD LAB',
    image: '/hero-scenic-2.jpg',
    quote: 'We replaced manual sheet passing with one wide-angle capture. Zero proxy attendance, instant SIS synchronization.',
    author: 'Elena Rostova',
    role: 'Director of Instructional Tech',
    institution: 'Stanford AI Lab',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    storyLinkText: "Stanford's story",
    stats: {
      speedup: '15m → 3s',
      accuracy: '99.9%',
      seatsPerScan: '240 seats'
    }
  },
  {
    id: 'superloop',
    name: 'Superloop',
    badge: 'Enterprise Academy',
    logoText: 'superloop',
    image: '/hero-scenic-1.jpg',
    quote: 'AttendX eliminated attendance friction across our 32 training auditoriums worldwide with enterprise-grade biometric security.',
    author: 'Marcus Chen',
    role: 'VP of Corporate Learning',
    institution: 'Superloop Ed',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    storyLinkText: "Superloop's story",
    stats: {
      speedup: '98% faster',
      accuracy: '99.7%',
      seatsPerScan: '300+ seats'
    }
  },
  {
    id: 'stubhub',
    name: 'StubHub',
    badge: 'Events & Seminars',
    logoText: 'StubHub',
    image: '/hero-scenic-2.jpg',
    quote: 'Verifying credentialed staff and student cohorts at major venues went from bottlenecks to a seamless glance.',
    author: 'Aisha Robinson',
    role: 'Operations Lead',
    institution: 'StubHub Academy',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    storyLinkText: "StubHub's story",
    stats: {
      speedup: 'Instantaneous',
      accuracy: '99.9%',
      seatsPerScan: '500+ cohort'
    }
  },
  {
    id: 'trilogy',
    name: 'Trilogy',
    badge: 'Bootcamps',
    logoText: 'TRILOGY',
    image: '/hero-scenic-1.jpg',
    quote: 'Our instructional leads love the simplicity. One panoramic photo and the attendance matrix is filled accurately.',
    author: 'David K. Miller',
    role: 'Head of Global Curriculum',
    institution: 'Trilogy Global',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    storyLinkText: "Trilogy's story",
    stats: {
      speedup: '10x Speed',
      accuracy: '99.6%',
      seatsPerScan: '120 seats'
    }
  }
];

export const HeroLanding: React.FC = () => {
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [email, setEmail] = useState('');
  
  // Modals state
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showResourcesMenu, setShowResourcesMenu] = useState(false);
  const [showPlatformMenu, setShowPlatformMenu] = useState(false);
  const [liveMeshOverlay, setLiveMeshOverlay] = useState(true);
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const activeStory = CASE_STORIES[activeStoryIndex];

  // Auto-rotate stories gently every 10 seconds if not hovered
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStoryIndex((prev) => (prev + 1) % CASE_STORIES.length);
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setShowDemoModal(true);
    } else {
      navigate('/login');
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col selection:bg-blue-600 selection:text-white transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-[#FBFBFB] text-[#111827]'}`}>
      {/* Top Navigation Bar */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-300 ${isDark ? 'bg-black/80 border-white/[0.08] text-white' : 'bg-[#FBFBFB]/90 border-slate-200/80 text-slate-900'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <Logo size="md" variant="auto" showTagline />
          </div>

          {/* Navigation Links */}
          <nav className={`hidden md:flex items-center gap-8 text-[15px] font-medium transition-colors ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
            {/* Platform Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setShowPlatformMenu(true)}
              onMouseLeave={() => setShowPlatformMenu(false)}
            >
              <button className={`flex items-center gap-1 transition-colors py-2 ${isDark ? 'hover:text-white' : 'hover:text-slate-950'}`}>
                Platform <ChevronDown className="w-4 h-4 opacity-70" />
              </button>
              {showPlatformMenu && (
                <div className={`absolute top-full left-0 w-72 rounded-2xl shadow-2xl border p-3 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${isDark ? 'glass-panel text-white shadow-black/80' : 'bg-white border-slate-100 text-slate-900 shadow-slate-200/50'}`}>
                  <div 
                    onClick={() => {
                      setShowPlatformMenu(false);
                      navigate('/login');
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-colors ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`font-semibold text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <Scan className="w-4 h-4 text-blue-500" /> Multi-Face Neural Engine
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Simultaneous recognition of up to 200 faces per frame.</p>
                  </div>
                  <div 
                    onClick={() => {
                      setShowPlatformMenu(false);
                      navigate('/admin');
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-colors ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`font-semibold text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <ShieldCheck className="w-4 h-4 text-blue-500" /> Institutional Admin Portal
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Multi-campus roster sync, role controls & SIS integration.</p>
                  </div>
                  <div 
                    onClick={() => {
                      setShowPlatformMenu(false);
                      navigate('/student/login');
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-colors ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`font-semibold text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <GraduationCap className="w-4 h-4 text-blue-500" /> Student Attendance Portal
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Personal attendance histories, percentage thresholds & alerts.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Resources Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setShowResourcesMenu(true)}
              onMouseLeave={() => setShowResourcesMenu(false)}
            >
              <button className={`flex items-center gap-1 transition-colors py-2 ${isDark ? 'hover:text-white' : 'hover:text-slate-950'}`}>
                Resources <ChevronDown className="w-4 h-4 opacity-70" />
              </button>
              {showResourcesMenu && (
                <div className={`absolute top-full left-0 w-64 rounded-2xl shadow-2xl border p-3 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${isDark ? 'glass-panel text-white shadow-black/80' : 'bg-white border-slate-100 text-slate-900 shadow-slate-200/50'}`}>
                  <button 
                    onClick={() => {
                      setShowResourcesMenu(false);
                      setShowHowItWorksModal(true);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-sm font-medium transition-colors block ${isDark ? 'text-zinc-200 hover:bg-white/[0.06]' : 'text-slate-800 hover:bg-slate-50'}`}
                  >
                    How AttendX Works
                  </button>
                  <button 
                    onClick={() => {
                      setShowResourcesMenu(false);
                      scrollToSection('case-studies-section');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-sm font-medium transition-colors block ${isDark ? 'text-zinc-200 hover:bg-white/[0.06]' : 'text-slate-800 hover:bg-slate-50'}`}
                  >
                    University Case Studies
                  </button>
                  <button 
                    onClick={() => {
                      setShowResourcesMenu(false);
                      setShowPrivacyModal(true);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-sm font-medium transition-colors block ${isDark ? 'text-zinc-200 hover:bg-white/[0.06]' : 'text-slate-800 hover:bg-slate-50'}`}
                  >
                    Biometric Privacy & GDPR
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={() => scrollToSection('case-studies-section')} 
              className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-950'}`}
            >
              Customers
            </button>
            <button 
              onClick={() => setShowPricingModal(true)} 
              className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-950'}`}
            >
              Pricing
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Slider */}
            <ThemeToggle variant="slider" size="sm" />

            <button
              onClick={() => navigate('/login')}
              className={`text-[15px] font-semibold transition-colors px-3 py-2 ${isDark ? 'text-zinc-300 hover:text-white' : 'text-slate-700 hover:text-slate-950'}`}
            >
              Login
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[15px] font-semibold px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98]"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 pt-12 md:pt-20 pb-16 flex flex-col items-center">
        {/* Editorial Serif Hero Headlines */}
        <div className="text-center max-w-4xl mx-auto space-y-4">
          <h1 className={`font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[80px] leading-[1.08] tracking-[-0.03em] font-normal transition-colors ${isDark ? 'text-white' : 'text-[#111827]'}`}>
            AI attendance teachers love.<br />
            <span className="italic font-serif">Accuracy you can prove.</span>
          </h1>

          <p className={`text-base sm:text-lg md:text-[19px] max-w-2xl mx-auto leading-relaxed pt-2 font-normal transition-colors ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            The AI attendance platform that helps academic teams own every roll call, 
            from multi-face instant detection to audit-ready analytics.
          </p>
        </div>

        {/* Email Input Bar */}
        <div className="w-full max-w-md mx-auto mt-8 mb-12">
          <form 
            onSubmit={handleStart}
            className="bg-white rounded-full p-1.5 pl-5 border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] flex items-center justify-between transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100"
          >
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="What's your work email?" 
              className="bg-transparent border-none outline-none text-[15px] text-slate-800 placeholder-slate-400 w-full pr-3"
            />
            <button
              type="submit"
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-[14px] px-5 py-2.5 rounded-full whitespace-nowrap transition-all duration-150 active:scale-[0.98] shadow-sm flex items-center gap-1.5"
            >
              Get started
            </button>
          </form>
        </div>

        {/* Hero Visual Canvas Showcase Frame */}
        <div 
          id="case-studies-section"
          className="w-full rounded-[28px] border border-slate-200/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] overflow-hidden bg-slate-950 relative min-h-[460px] md:min-h-[580px] flex flex-col justify-end"
        >
          {/* Scenic Background Image */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <img 
              src={activeStory.image} 
              alt="Lecture Hall Scenic"
              className="w-full h-full object-cover object-center transition-all duration-700 scale-100 filter brightness-95"
            />
            {/* Subtle Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Top Left Live Neural HUD Controls */}
          <div className="absolute top-5 left-5 z-20 flex flex-wrap items-center gap-2.5">
            <div className="bg-black/60 backdrop-blur-md border border-white/15 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Neural Scanner Live</span>
              <span className="text-white/40">|</span>
              <span className="text-emerald-300 font-mono">{activeStory.stats.accuracy}</span>
            </div>

            <button 
              onClick={() => setLiveMeshOverlay(!liveMeshOverlay)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-md transition-all ${
                liveMeshOverlay 
                  ? 'bg-blue-600/80 text-white border-blue-400 shadow-md shadow-blue-500/20' 
                  : 'bg-black/40 text-white/70 border-white/10 hover:bg-black/60'
              }`}
            >
              {liveMeshOverlay ? 'Hide HUD Mesh' : 'Show HUD Mesh'}
            </button>
          </div>

          {/* Simulated Face Detection Bounding Boxes Over Students (Interactive HUD) */}
          {liveMeshOverlay && (
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
              {/* Box 1 */}
              <div className="absolute top-[52%] left-[24%] border-2 border-emerald-400/90 rounded-lg p-1 bg-emerald-500/10 shadow-lg backdrop-blur-[1px] animate-pulse">
                <span className="bg-emerald-500 text-black font-mono font-bold text-[9px] px-1 py-0.5 rounded -top-4 left-0 absolute whitespace-nowrap">
                  ID: 041 · 99.8%
                </span>
              </div>

              {/* Box 2 */}
              <div className="absolute top-[48%] left-[34%] border-2 border-emerald-400/90 rounded-lg p-1 bg-emerald-500/10 shadow-lg backdrop-blur-[1px]">
                <span className="bg-emerald-500 text-black font-mono font-bold text-[9px] px-1 py-0.5 rounded -top-4 left-0 absolute whitespace-nowrap">
                  ID: 119 · 99.4%
                </span>
              </div>

              {/* Box 3 */}
              <div className="absolute top-[62%] left-[46%] border-2 border-emerald-400/90 rounded-lg p-1 bg-emerald-500/10 shadow-lg backdrop-blur-[1px]">
                <span className="bg-emerald-500 text-black font-mono font-bold text-[9px] px-1 py-0.5 rounded -top-4 left-0 absolute whitespace-nowrap">
                  ID: 082 · 99.9%
                </span>
              </div>

              {/* Box 4 */}
              <div className="absolute top-[58%] left-[68%] border-2 border-blue-400/90 rounded-lg p-1 bg-blue-500/10 shadow-lg backdrop-blur-[1px]">
                <span className="bg-blue-500 text-white font-mono font-bold text-[9px] px-1 py-0.5 rounded -top-4 left-0 absolute whitespace-nowrap">
                  ID: 215 · 98.9%
                </span>
              </div>

              {/* Top Right Stats Ribbon */}
              <div className="hidden lg:flex absolute top-5 right-5 bg-black/70 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-white flex-col gap-1 min-w-[200px] shadow-2xl">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Detection Benchmark</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Classroom Depth:</span>
                  <span className="font-mono text-emerald-400 font-bold">{activeStory.stats.seatsPerScan}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Roll Processing:</span>
                  <span className="font-mono text-blue-400 font-bold">{activeStory.stats.speedup}</span>
                </div>
              </div>
            </div>
          )}

          {/* Floating Testimonial Card Overlay (Bottom Right) */}
          <div className="relative z-20 m-4 md:m-8 self-end max-w-md w-full">
            <div className={`p-6 sm:p-7 rounded-2xl transition-all duration-300 ${
              isDark ? 'glass-card text-white' : 'bg-white/95 backdrop-blur-xl border border-slate-100 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.2)]'
            }`}>
              <p className={`font-serif text-[17px] sm:text-[18px] leading-relaxed italic mb-5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                "{activeStory.quote}"
              </p>

              <div className={`flex items-center justify-between pt-2 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <img 
                    src={activeStory.avatarUrl} 
                    alt={activeStory.author}
                    className={`w-10 h-10 rounded-full object-cover border ${isDark ? 'border-white/20' : 'border-slate-200'}`}
                  />
                  <div>
                    <div className={`text-[14px] font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeStory.author}</div>
                    <div className={`text-[12px] font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{activeStory.role}</div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowDemoModal(true)}
                  className="text-[13px] font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 group/link transition-colors"
                >
                  <span>{activeStory.storyLinkText}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Dock / Customer Stories Selector Bar */}
          <div className={`relative z-20 w-full px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors ${
            isDark ? 'bg-black/90 backdrop-blur-md border-t border-white/[0.08]' : 'bg-white/95 backdrop-blur-md border-t border-slate-200/90'
          }`}>
            <div className={`text-[13px] font-semibold uppercase tracking-wider shrink-0 ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>
              Customer stories
            </div>

            {/* Stories Tab Items */}
            <div className="flex items-center justify-around md:justify-end gap-2 sm:gap-6 w-full overflow-x-auto no-scrollbar py-1">
              {CASE_STORIES.map((story, index) => {
                const isActive = activeStoryIndex === index;
                return (
                  <button
                    key={story.id}
                    onClick={() => setActiveStoryIndex(index)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-bold tracking-tight transition-all duration-200 relative whitespace-nowrap flex items-center gap-1.5 ${
                      isActive 
                        ? isDark ? 'text-white bg-white/10 shadow-sm' : 'text-slate-950 bg-slate-100/80 shadow-sm' 
                        : isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{story.logoText}</span>
                    {isActive && (
                      <span className={`absolute bottom-[-17px] left-0 right-0 h-[2.5px] rounded-full ${isDark ? 'bg-white' : 'bg-slate-950'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid Below Hero */}
        <section className={`w-full mt-24 pt-10 border-t ${isDark ? 'border-white/10' : 'border-slate-200/60'}`}>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className={`font-serif text-3xl sm:text-4xl font-normal ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Engineered for high-volume classroom intelligence
            </h2>
            <p className={`mt-2 text-base ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              Say goodbye to proxy roll-calls and lost lecture minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`p-8 rounded-2xl transition-all ${isDark ? 'glass-card text-white' : 'bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md'}`}>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5 font-bold border border-blue-500/20">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Sub-Second Multi-Face Capture</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                Capture an entire auditorium in one wide camera shot. AttendX automatically isolates, aligns, and identifies 100+ students concurrently.
              </p>
            </div>

            <div className={`p-8 rounded-2xl transition-all ${isDark ? 'glass-card text-white' : 'bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md'}`}>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-5 font-bold border border-indigo-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Anti-Spoofing & Liveness Proof</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                Multi-angle 3D facial geometry prevents photo and video playback spoofing, guaranteeing 100% audit-proof roll calls.
              </p>
            </div>

            <div className={`p-8 rounded-2xl transition-all ${isDark ? 'glass-card text-white' : 'bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md'}`}>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5 font-bold border border-emerald-500/20">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Instant SIS & Roster Sync</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                Direct export to Banner, Canvas, Blackboard, or CSV. Students track their own attendance thresholds via personal portal login.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Portal Access Section */}
        <section className={`w-full mt-20 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl transition-all ${
          isDark ? 'glass-card border border-white/10 text-white' : 'bg-gradient-to-r from-slate-900 to-slate-950 text-white'
        }`}>
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5" /> Instant Launch
            </div>
            <h3 className="font-serif text-3xl font-normal tracking-tight text-white">
              Ready to modernize your classroom attendance?
            </h3>
            <p className="text-zinc-300 text-sm sm:text-base">
              Get started with AttendX today. Create a teacher account or explore the student attendance experience.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/login')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <span>Teacher / Admin Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/student/login')}
              className={`font-semibold text-sm px-6 py-3.5 rounded-xl border transition-all flex items-center gap-2 ${
                isDark ? 'bg-white/10 hover:bg-white/15 text-white border-white/15' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-blue-400" />
              <span>Student Portal</span>
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={`border-t py-12 transition-colors ${
        isDark ? 'bg-black border-white/10 text-zinc-400' : 'bg-white border-slate-200 text-slate-500'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>AttendX</span>
            <span>© 2026 AttendX AI Inc. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setShowPrivacyModal(true)} className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>
              Privacy Policy
            </button>
            <button onClick={() => setShowHowItWorksModal(true)} className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>
              Documentation
            </button>
            <button onClick={() => setShowPrivacyModal(true)} className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}>
              Biometric Security
            </button>
          </div>
        </div>
      </footer>

      {/* ── Demo Modal ── */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-normal text-slate-900">Experience AttendX Live</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Try the multi-face classroom recognition engine or log into your campus portal.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    setShowDemoModal(false);
                    navigate('/login');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  <span>Launch Teacher / Admin App</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setShowDemoModal(false);
                    navigate('/student/login');
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span>Open Student Portal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── "How AttendX Works" Modal ── */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-100 relative text-slate-900 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowHowItWorksModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-normal">How AttendX Works</h3>
                <p className="text-xs text-slate-500">Autonomous 3-Stage Biometric Attendance Pipeline</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Multi-Angle Classroom Capture</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Educator snaps 1 to 4 wide-angle photos of the classroom or triggers live webcam scanning. The system handles varying focal lengths, side-profiles, and lecture hall lighting.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">YuNet Localization + SFace 512-D Embeddings</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Our ONNX-powered lightweight neural vision pipeline detects up to 200 faces simultaneously, crops & aligns landmarks, and computes mathematically unique 512-dimensional biometric feature vectors in sub-20ms.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Instant Roster Matching & SIS Ledger Export</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Feature vectors are matched against registered student embeddings using cosine similarity. Attendance is locked in PostgreSQL, available for review in the Audit Queue, and exported to Excel with one click.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowHowItWorksModal(false);
                  navigate('/login');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all"
              >
                Try Live Scanner Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Biometric Privacy & GDPR Modal ── */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-100 relative text-slate-900 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-normal">Biometric Privacy & Compliance</h3>
                <p className="text-xs text-slate-500">FERPA, GDPR & Zero-Knowledge Mathematical Safeguards</p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Zero Raw Image Retention
                </h4>
                <p className="text-xs text-slate-600">
                  AttendX does not store raw student facial images in the database. During registration, faces are immediately translated into one-way 512-dimensional numerical vectors that cannot be reverse-engineered back into pictures.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  AES-256 Encryption at Rest & in Transit
                </h4>
                <p className="text-xs text-slate-600">
                  All vector embeddings and academic records are encrypted using TLS 1.3 in transit and AES-256 at rest across Supabase isolated tenant shards.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  FERPA & Institutional Sovereignty
                </h4>
                <p className="text-xs text-slate-600">
                  Student biometric data remains under complete ownership of your university. Admins can permanently purge face vectors or export audit histories at any time.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all"
              >
                Close Privacy Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Institutional Pricing Modal ── */}
      {showPricingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl border border-slate-100 relative text-slate-900 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowPricingModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center max-w-xl mx-auto mb-8">
              <h3 className="font-serif text-3xl font-normal">Transparent Academic Pricing</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                From individual professors to university-wide multi-campus rollouts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Starter */}
              <div className="p-6 rounded-2xl border border-slate-200 flex flex-col justify-between hover:border-blue-500 transition-colors">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Starter Tier</div>
                  <div className="text-3xl font-extrabold text-slate-900 mt-2">$0</div>
                  <p className="text-xs text-slate-500 mt-1">Free forever for educators</p>
                  <ul className="mt-6 space-y-3 text-xs text-slate-600">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Up to 150 students</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Multi-photo classroom review</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Excel (.xlsx) downloads</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setShowPricingModal(false);
                    navigate('/login');
                  }}
                  className="mt-6 w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Start Free
                </button>
              </div>

              {/* Department */}
              <div className="p-6 rounded-2xl border-2 border-blue-600 bg-blue-50/20 flex flex-col justify-between relative shadow-md">
                <div className="absolute -top-3 right-5 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Popular
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Department</div>
                  <div className="text-3xl font-extrabold text-slate-900 mt-2">$290<span className="text-xs font-normal text-slate-500">/mo</span></div>
                  <p className="text-xs text-slate-500 mt-1">For academic departments</p>
                  <ul className="mt-6 space-y-3 text-xs text-slate-700">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Up to 2,500 students</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Live Vision Node Edge streaming</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Multi-teacher role authorization</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Priority neural model updates</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setShowPricingModal(false);
                    navigate('/login');
                  }}
                  className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-blue-600/20"
                >
                  Upgrade Department
                </button>
              </div>

              {/* Enterprise */}
              <div className="p-6 rounded-2xl border border-slate-200 flex flex-col justify-between hover:border-blue-500 transition-colors">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Campus Enterprise</div>
                  <div className="text-3xl font-extrabold text-slate-900 mt-2">Custom</div>
                  <p className="text-xs text-slate-500 mt-1">Full university deployment</p>
                  <ul className="mt-6 space-y-3 text-xs text-slate-600">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Unlimited students & auditoriums</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Native Canvas & Blackboard SIS API</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Custom dedicated edge hardware</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> 24/7 SLA & dedicated engineer</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setShowPricingModal(false);
                    setShowDemoModal(true);
                  }}
                  className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Contact Enterprise Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
