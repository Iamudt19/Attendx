import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  Users, 
  BarChart3, 
  Sliders,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';

export const HeroLanding: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'scan' | 'ledger' | 'export'>('scan');
  const [mockScanning, setMockScanning] = useState(false);
  const [detectedCount, setDetectedCount] = useState(42);

  const handleSimulateScan = () => {
    setMockScanning(true);
    setTimeout(() => {
      setDetectedCount(prev => (prev === 42 ? 46 : 42));
      setMockScanning(false);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] selection:bg-blue-600 selection:text-white transition-colors">
      {/* ── Swiss Hairline Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[var(--bg-main)]/90 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div 
              onClick={() => navigate('/')} 
              className="cursor-pointer flex items-center gap-2"
            >
              <Logo size="sm" showSubtitle={false} />
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] font-medium">
                v2.4
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[var(--text-secondary)]">
              <a href="#pipeline" className="hover:text-[var(--text-primary)] transition-colors">Architecture</a>
              <a href="#matrix" className="hover:text-[var(--text-primary)] transition-colors">Comparison Matrix</a>
              <a href="#institutions" className="hover:text-[var(--text-primary)] transition-colors">Institutions</a>
              <a href="#security" className="hover:text-[var(--text-primary)] transition-colors">Security & SIS</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle variant="slider" size="sm" />
            
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:inline-flex text-xs font-semibold px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Faculty Portal
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary text-xs font-semibold px-4 py-2 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Editorial Hero Section ────────────────────────────────────────── */}
      <section className="border-b border-[var(--border-color)] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
            
            {/* Left Column: Typographic Lead */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-surface)] text-[11px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                Optical Classroom Roll-Call System
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.08]">
                Verifiable attendance in two seconds.
              </h1>

              <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-xl font-normal leading-relaxed">
                Process high-density lecture halls from a single optical capture. Instant face recognition, multi-angle identity verification, and zero-proxy roster synchronization.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={() => navigate('/take-attendance')}
                  className="btn-primary text-sm px-6 py-3 flex items-center justify-center gap-2 font-semibold shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Roll-Call Scan</span>
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn-secondary text-sm px-6 py-3 flex items-center justify-center gap-2 font-medium"
                >
                  <span>Explore Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Monospace Empirical Metrics Bar */}
              <div className="pt-8 border-t border-[var(--border-color)] grid grid-cols-3 gap-4 font-mono">
                <div>
                  <div className="text-2xl font-bold text-[var(--text-primary)]">1.8s</div>
                  <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Scan Latency</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--text-primary)]">99.8%</div>
                  <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Verification</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--text-primary)]">0.0%</div>
                  <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">Proxy Vulnerability</div>
                </div>
              </div>
            </div>

            {/* Right Column: Authentic Product Scanner Rig */}
            <div className="lg:col-span-6">
              <div className="swiss-card rounded-xl overflow-hidden shadow-lg">
                {/* Window Bar */}
                <div className="bg-[var(--bg-inset)] px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                    <span className="ml-2 font-mono text-[11px] text-[var(--text-muted)]">
                      SESSION_ID: CSE-302_HALL-4
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-500 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    ONLINE
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-surface)] text-xs font-mono">
                  <button
                    onClick={() => setActiveTab('scan')}
                    className={`flex-1 py-2.5 px-4 text-left border-r border-[var(--border-color)] transition-colors ${
                      activeTab === 'scan' ? 'bg-[var(--bg-inset)] text-[var(--text-primary)] font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    01. Optical Detection
                  </button>
                  <button
                    onClick={() => setActiveTab('ledger')}
                    className={`flex-1 py-2.5 px-4 text-left border-r border-[var(--border-color)] transition-colors ${
                      activeTab === 'ledger' ? 'bg-[var(--bg-inset)] text-[var(--text-primary)] font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    02. Verified Ledger
                  </button>
                  <button
                    onClick={() => setActiveTab('export')}
                    className={`flex-1 py-2.5 px-4 text-left transition-colors ${
                      activeTab === 'export' ? 'bg-[var(--bg-inset)] text-[var(--text-primary)] font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    03. SIS Export
                  </button>
                </div>

                {/* Tab Content Display */}
                <div className="p-4 sm:p-6 bg-[var(--bg-surface)] min-h-[320px] flex flex-col justify-between">
                  {activeTab === 'scan' && (
                    <div className="space-y-4">
                      {/* Frame Viewport */}
                      <div className="relative rounded-lg overflow-hidden border border-[var(--border-color)] bg-zinc-950 aspect-video flex items-center justify-center">
                        <img 
                          src="/hero-scenic-1.jpg" 
                          alt="Lecture Hall Capture"
                          className="w-full h-full object-cover opacity-80"
                        />
                        {/* Detection Bounding Boxes */}
                        <div className="absolute top-1/4 left-1/4 border-2 border-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-emerald-300">
                          Alex Rivera (99.4%)
                        </div>
                        <div className="absolute top-1/3 right-1/3 border-2 border-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-emerald-300">
                          Sarah Jenkins (98.1%)
                        </div>
                        <div className="absolute bottom-1/4 right-1/4 border-2 border-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-amber-300">
                          Dev Patel (Review: 78%)
                        </div>

                        {mockScanning && (
                          <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-xs flex items-center justify-center font-mono text-xs text-white font-bold animate-pulse">
                            CALCULATING EMBEDDING DISTANCES...
                          </div>
                        )}
                      </div>

                      {/* Control Bar */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="font-mono text-xs text-[var(--text-secondary)]">
                          Recognized: <strong className="text-[var(--text-primary)]">{detectedCount} / 48 Enrolled</strong>
                        </div>
                        <button
                          onClick={handleSimulateScan}
                          disabled={mockScanning}
                          className="btn-secondary text-xs px-3 py-1.5 font-mono flex items-center gap-1.5"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>{mockScanning ? 'Processing...' : 'Simulate Recalibration'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'ledger' && (
                    <div className="space-y-2">
                      <div className="text-xs font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider pb-1 border-b border-[var(--border-color)] flex justify-between">
                        <span>Student Record</span>
                        <span>Status / Accuracy</span>
                      </div>
                      {[
                        { roll: 'CSE-001', name: 'Alex Rivera', status: 'PRESENT', acc: '99.4%', color: 'text-emerald-500' },
                        { roll: 'CSE-002', name: 'Sarah Jenkins', status: 'PRESENT', acc: '98.1%', color: 'text-emerald-500' },
                        { roll: 'CSE-003', name: 'Dev Patel', status: 'PRESENT', acc: '91.0%', color: 'text-emerald-500' },
                        { roll: 'CSE-004', name: 'Elena Rostova', status: 'PRESENT', acc: '97.6%', color: 'text-emerald-500' },
                        { roll: 'CSE-005', name: 'Marcus Chen', status: 'ABSENT', acc: 'Unmatched', color: 'text-rose-500' },
                      ].map((item) => (
                        <div key={item.roll} className="flex items-center justify-between py-1.5 border-b border-[var(--border-color)] text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--text-muted)]">{item.roll}</span>
                            <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={item.color}>{item.status}</span>
                            <span className="text-[var(--text-muted)]">{item.acc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'export' && (
                    <div className="space-y-4 py-4 text-center">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] font-mono">AttendX_CSE302_2026-10-03.xlsx</h4>
                        <p className="text-xs text-[var(--text-secondary)]">Formatted for Banner, Canvas, Blackboard, and custom SIS formats.</p>
                      </div>
                      <button
                        onClick={() => navigate('/history')}
                        className="btn-primary text-xs px-4 py-2 font-mono mx-auto"
                      >
                        Download Sample Ledger (.xlsx)
                      </button>
                    </div>
                  )}

                  {/* Rig Footer */}
                  <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                    <span>ALGORITHM: SFace-128D Cosine</span>
                    <span>TIMESTAMP: 2026-10-03 14:00 UTC</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Section 01: Three-Phase Precision Architecture ────────────────── */}
      <section id="pipeline" className="border-b border-[var(--border-color)] py-20 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
              Verification Pipeline
            </span>
            <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mt-1">
              How AttendX processes entire auditoriums in real-time.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="swiss-card p-6 rounded-lg space-y-3">
              <div className="font-mono text-xs font-bold text-[var(--text-muted)]">PHASE // 01</div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Optical Frame Ingestion</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Upload wide-angle classroom captures or stream live from standard webcams and lecture cameras. The engine automatically handles diverse lighting and seating depths.
              </p>
            </div>

            <div className="swiss-card p-6 rounded-lg space-y-3">
              <div className="font-mono text-xs font-bold text-[var(--text-muted)]">PHASE // 02</div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Biometric Vector Matching</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Faces are cropped, aligned, and matched against enrolled student embeddings with sub-pixel landmark calibration and cosine distance confidence scoring.
              </p>
            </div>

            <div className="swiss-card p-6 rounded-lg space-y-3">
              <div className="font-mono text-xs font-bold text-[var(--text-muted)]">PHASE // 03</div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Persistent Ledger Commit</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Attendance records are committed to your PostgreSQL database. Faculty can inspect low-confidence detections, make manual adjustments, and export formatted Excel sheets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 02: Empirical Comparison Matrix ──────────────────────── */}
      <section id="matrix" className="border-b border-[var(--border-color)] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
              Objective Comparison
            </span>
            <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mt-1">
              Operational benchmark against traditional methods.
            </h2>
          </div>

          <div className="swiss-card rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-inset)] font-mono text-[var(--text-muted)] uppercase">
                  <th className="p-4 font-bold">Metric / Capability</th>
                  <th className="p-4 font-bold">Paper Roll-Call</th>
                  <th className="p-4 font-bold">RFID / ID Cards</th>
                  <th className="p-4 font-bold text-blue-600 bg-blue-500/5">AttendX System</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)] font-mono">
                <tr>
                  <td className="p-4 font-bold text-[var(--text-primary)] font-sans">Time per 100 students</td>
                  <td className="p-4 text-[var(--text-secondary)]">12 – 15 minutes</td>
                  <td className="p-4 text-[var(--text-secondary)]">4 – 6 minutes (bottlenecks)</td>
                  <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold bg-blue-500/5">1.8 seconds</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-[var(--text-primary)] font-sans">Proxy Attendance Risk</td>
                  <td className="p-4 text-rose-500">Extremely High (sheet signing)</td>
                  <td className="p-4 text-rose-500">High (card passing)</td>
                  <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold bg-blue-500/5">0.0% (Biometric proof)</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-[var(--text-primary)] font-sans">Hardware Infrastructure</td>
                  <td className="p-4 text-[var(--text-secondary)]">Paper & Pens</td>
                  <td className="p-4 text-[var(--text-secondary)]">$400+ per door scanner</td>
                  <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold bg-blue-500/5">Any Phone / Webcam</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-[var(--text-primary)] font-sans">Audit Trail & SIS Sync</td>
                  <td className="p-4 text-rose-500">Manual manual entry</td>
                  <td className="p-4 text-[var(--text-secondary)]">Batch sync</td>
                  <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold bg-blue-500/5">Real-time PostgreSQL + Excel</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 03: Verified Institutional Stories ────────────────────── */}
      <section id="institutions" className="border-b border-[var(--border-color)] py-20 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
              Deployment Reports
            </span>
            <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mt-1">
              Trusted in large lecture halls and engineering departments.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="swiss-card p-6 rounded-lg space-y-4 flex flex-col justify-between">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                “We eliminated roll-call interruptions across 24 lecture halls. Faculty take one wide photo at the start of class and attendance is logged before the syllabus starts.”
              </p>
              <div className="pt-4 border-t border-[var(--border-color)]">
                <div className="font-bold text-xs text-[var(--text-primary)]">Dr. Benjamin Vance</div>
                <div className="text-[11px] font-mono text-[var(--text-muted)]">Dean of Academic Computing, Apex Tech</div>
              </div>
            </div>

            <div className="swiss-card p-6 rounded-lg space-y-4 flex flex-col justify-between">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                “Zero proxy attendance. The verification queue gives professors total confidence and the automatic Excel download syncs directly with our registrar.”
              </p>
              <div className="pt-4 border-t border-[var(--border-color)]">
                <div className="font-bold text-xs text-[var(--text-primary)]">Elena Rostova</div>
                <div className="text-[11px] font-mono text-[var(--text-muted)]">Director of Instructional Tech, Stanford AI Lab</div>
              </div>
            </div>

            <div className="swiss-card p-6 rounded-lg space-y-4 flex flex-col justify-between">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                “Switching from hardware badge scanners saved us over $14,000 in auditorium hardware while speeding up verification by 98%.”
              </p>
              <div className="pt-4 border-t border-[var(--border-color)]">
                <div className="font-bold text-xs text-[var(--text-primary)]">Marcus Chen</div>
                <div className="text-[11px] font-mono text-[var(--text-muted)]">VP of Academic Operations, Global Institute</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Swiss Action Banner ───────────────────────────────────────────── */}
      <section className="py-20 border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Ready to upgrade your classroom roll-call?
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Log in with your faculty credentials or explore the live attendance studio now.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate('/take-attendance')}
              className="btn-primary text-xs px-6 py-3 font-semibold flex items-center gap-2"
            >
              <span>Launch Take Attendance</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary text-xs px-6 py-3 font-medium"
            >
              <span>Faculty Dashboard</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Minimalist Swiss Footer ───────────────────────────────────────── */}
      <footer className="py-12 bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-2">
            <Logo size="sm" showSubtitle={false} />
            <span className="text-[var(--text-muted)]">© 2026 AttendX Systems. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <a href="#pipeline" className="hover:text-[var(--text-primary)]">Architecture</a>
            <a href="#matrix" className="hover:text-[var(--text-primary)]">Benchmarks</a>
            <a href="#security" className="hover:text-[var(--text-primary)]">Security</a>
            <span className="inline-flex items-center gap-1.5 text-emerald-500 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              All Systems Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
