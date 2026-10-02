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
  GraduationCap
} from 'lucide-react';

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
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [showDemoModal, setShowDemoModal] = useState(false);
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

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-[#111827] font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#FBFBFB]/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold shadow-sm transition-transform group-hover:scale-105">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center">
              <span className="font-extrabold text-2xl tracking-tight text-slate-900">Attend</span>
              <span className="font-extrabold text-2xl tracking-tight text-blue-600">X</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-slate-600">
            {/* Platform Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setShowPlatformMenu(true)}
              onMouseLeave={() => setShowPlatformMenu(false)}
            >
              <button className="flex items-center gap-1 hover:text-slate-950 transition-colors py-2">
                Platform <ChevronDown className="w-4 h-4 opacity-70" />
              </button>
              {showPlatformMenu && (
                <div className="absolute top-full left-0 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div 
                    onClick={() => navigate('/login')}
                    className="p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                      <Scan className="w-4 h-4 text-blue-600" /> Multi-Face Neural Engine
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Simultaneous recognition of up to 200 faces per frame.</p>
                  </div>
                  <div 
                    onClick={() => navigate('/admin')}
                    className="p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" /> Institutional Admin Portal
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Multi-campus roster sync, role controls & SIS integration.</p>
                  </div>
                  <div 
                    onClick={() => navigate('/student/login')}
                    className="p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-600" /> Student Attendance Portal
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Personal attendance histories, percentage thresholds & alerts.</p>
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
              <button className="flex items-center gap-1 hover:text-slate-950 transition-colors py-2">
                Resources <ChevronDown className="w-4 h-4 opacity-70" />
              </button>
              {showResourcesMenu && (
                <div className="absolute top-full left-0 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <a 
                    href="#how-it-works"
                    className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors block"
                  >
                    How AttendX Works
                  </a>
                  <a 
                    href="#case-studies"
                    className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors block"
                  >
                    University Case Studies
                  </a>
                  <a 
                    href="#security"
                    className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors block"
                  >
                    Biometric Privacy & GDPR
                  </a>
                </div>
              )}
            </div>

            <a href="#case-studies" className="hover:text-slate-950 transition-colors">
              Customers
            </a>
            <a href="#pricing" className="hover:text-slate-950 transition-colors">
              Pricing
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="text-[15px] font-semibold text-slate-700 hover:text-slate-950 transition-colors px-3 py-2"
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
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[80px] leading-[1.08] tracking-[-0.03em] text-[#111827] font-normal">
            AI attendance teachers love.<br />
            <span className="italic font-serif">Accuracy you can prove.</span>
          </h1>

          <p className="text-base sm:text-lg md:text-[19px] text-slate-600 max-w-2xl mx-auto leading-relaxed pt-2 font-normal">
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
        <div className="w-full rounded-[28px] border border-slate-200/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] overflow-hidden bg-slate-950 relative min-h-[460px] md:min-h-[580px] flex flex-col justify-end">
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
            <div className="bg-white/95 backdrop-blur-xl p-6 sm:p-7 rounded-2xl border border-slate-100 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.2)] transition-all duration-300">
              <p className="font-serif text-[17px] sm:text-[18px] text-slate-900 leading-relaxed italic mb-5">
                "{activeStory.quote}"
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <img 
                    src={activeStory.avatarUrl} 
                    alt={activeStory.author}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <div className="text-[14px] font-bold text-slate-900">{activeStory.author}</div>
                    <div className="text-[12px] text-slate-500 font-medium">{activeStory.role}</div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowDemoModal(true)}
                  className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group/link transition-colors"
                >
                  <span>{activeStory.storyLinkText}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Dock / Customer Stories Selector Bar */}
          <div className="relative z-20 w-full bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
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
                        ? 'text-slate-950 bg-slate-100/80 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{story.logoText}</span>
                    {isActive && (
                      <span className="absolute bottom-[-17px] left-0 right-0 h-[2.5px] bg-slate-950 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid Below Hero */}
        <section className="w-full mt-24 pt-10 border-t border-slate-200/60">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl text-slate-900 font-normal">
              Engineered for high-volume classroom intelligence
            </h2>
            <p className="text-slate-600 mt-2 text-base">
              Say goodbye to proxy roll-calls and lost lecture minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 font-bold">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Sub-Second Multi-Face Capture</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Capture an entire auditorium in one wide camera shot. AttendX automatically isolates, aligns, and identifies 100+ students concurrently.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Anti-Spoofing & Liveness Proof</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Multi-angle 3D facial geometry prevents photo and video playback spoofing, guaranteeing 100% audit-proof roll calls.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 font-bold">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Instant SIS & Roster Sync</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Direct export to Banner, Canvas, Blackboard, or CSV. Students track their own attendance thresholds via personal portal login.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Portal Access Section */}
        <section className="w-full mt-20 bg-gradient-to-r from-slate-900 to-slate-950 text-white rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5" /> Instant Launch
            </div>
            <h3 className="font-serif text-3xl font-normal tracking-tight">
              Ready to modernize your classroom attendance?
            </h3>
            <p className="text-slate-400 text-sm sm:text-base">
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
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm px-6 py-3.5 rounded-xl border border-slate-700 transition-all flex items-center gap-2"
            >
              <GraduationCap className="w-4 h-4 text-blue-400" />
              <span>Student Portal</span>
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">AttendX</span>
            <span>© 2026 AttendX AI Inc. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-slate-900 transition-colors">Terms of Service</a>
            <a href="#security" className="hover:text-slate-900 transition-colors">Security</a>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {demoSubmitted ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-2xl font-normal text-slate-900">Demo Access Granted</h3>
                <p className="text-sm text-slate-600">
                  We've initialized a live test workspace for <strong>{email || 'your institution'}</strong>.
                </p>
                <button
                  onClick={() => {
                    setShowDemoModal(false);
                    navigate('/login');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Proceed to Login / Register
                </button>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};
