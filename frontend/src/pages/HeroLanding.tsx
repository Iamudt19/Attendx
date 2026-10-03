import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  ArrowRight,
  Sliders,
  FileSpreadsheet,
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
              <span className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] font-medium">
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

          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle variant="slider" size="sm" />
            
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:inline-flex text-xs font-semibold px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Faculty Portal
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary text-xs font-semibold px-3.5 sm:px-4 py-2 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
            >
              <span className="hidden sm:inline">Launch Studio</span>
              <span className="sm:hidden">Launch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Editorial Hero Section ────────────────────────────────────────── */}
      <section className="border-b border-[var(--border-color)] relative overflow-hidden">
        {/* Subtle dot-grid texture for visual depth */}
        <div
          className="absolute inset-0 pointer-events-none -z-10 opacity-[0.035] dark:opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            color: 'var(--text-primary)',
          }}
        />
        {/* Ambient radial glow — desktop only, keep mobile clean */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="hidden lg:block absolute -top-32 right-0 w-[450px] h-[450px] bg-blue-600/15 rounded-full blur-[120px] dark:bg-blue-500/20" />
          <div className="hidden lg:block absolute top-1/2 left-0 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px] dark:bg-indigo-500/15" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-12 lg:pt-20 lg:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-start">

            {/* ── Left Column: Typographic Lead ─────── */}
            <div className="lg:col-span-6 space-y-5 sm:space-y-6">

              {/* Live status pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] text-[11px] font-mono tracking-widest uppercase rounded-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                LIVE · Optical Roll-Call System
              </div>

              {/* Headline — punchy two-line layout */}
              <div className="space-y-1">
                <h1 className="text-[2.6rem] sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.05]">
                  Attendance.
                </h1>
                <h1 className="text-[2.6rem] sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                  Verified in{' '}
                  <span className="relative inline-block">
                    <span className="text-blue-600 dark:text-blue-400">1.8 seconds.</span>
                    <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-blue-600/30 dark:bg-blue-400/30 rounded-full" />
                  </span>
                </h1>
              </div>

              <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-md font-normal leading-relaxed">
                One photo. Entire lecture hall marked. Face recognition, biometric vector matching, and zero-proxy roster sync — no hardware required.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={() => navigate('/take-attendance')}
                  className="py-3.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-[0_2px_16px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] rounded-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Roll-Call Scan</span>
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="py-3.5 px-6 bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] text-[var(--text-primary)] font-medium text-sm border border-[var(--border-color)] flex items-center justify-center gap-2 transition-all rounded-sm"
                >
                  <span>Explore Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Key metrics — bold stat blocks */}
              <div className="pt-5 border-t border-[var(--border-color)]">
                <div className="grid grid-cols-3 gap-0 font-mono">
                  <div className="pr-4 border-r border-[var(--border-color)]">
                    <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tabular-nums">1.8s</div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-1">Scan latency</div>
                  </div>
                  <div className="px-4 border-r border-[var(--border-color)]">
                    <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">99.8%</div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-1">Verified match</div>
                  </div>
                  <div className="pl-4">
                    <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">0%</div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-1">Proxy rate</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Column + Mobile Product Rig ─────────────────── */}
            <div className="lg:col-span-6">
              <div className="border border-[var(--border-color)] rounded-sm overflow-hidden shadow-sm bg-[var(--bg-surface)]">

                {/* Window / session bar */}
                <div className="bg-[var(--bg-inset)] px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 font-mono text-[11px] text-[var(--text-muted)]">
                      SESSION · CSE-302 · HALL-4
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-500 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-surface)] text-[11px] font-mono">
                  {(['scan', 'ledger', 'export'] as const).map((tab, i) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2.5 px-2 sm:px-4 text-center sm:text-left transition-colors border-r last:border-r-0 border-[var(--border-color)] ${
                        activeTab === tab
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="hidden sm:inline">{`0${i + 1}. `}</span>
                      {tab === 'scan' ? 'Optical' : tab === 'ledger' ? 'Ledger' : 'Export'}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-3 sm:p-5 bg-[var(--bg-surface)] min-h-[280px] flex flex-col justify-between">
                  {activeTab === 'scan' && (
                    <div className="space-y-3">
                      {/* Camera frame */}
                      <div className="relative rounded-sm overflow-hidden border border-[var(--border-color)] bg-zinc-950 aspect-video">
                        <img
                          src="/hero-scenic-1.jpg"
                          alt="Lecture Hall Capture"
                          className="w-full h-full object-cover opacity-70"
                        />
                        {/* Scan overlay lines */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-400/60" />
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-400/60" />
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-400/60" />
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-400/60" />
                        </div>
                        {/* Detection Bounding Boxes */}
                        <div className="absolute top-[22%] left-[18%] border border-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded-sm text-[9px] sm:text-[10px] font-mono text-emerald-300 leading-tight">
                          <div>Alex Rivera</div>
                          <div className="text-emerald-400/70">99.4%</div>
                        </div>
                        <div className="absolute top-[35%] right-[22%] border border-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded-sm text-[9px] sm:text-[10px] font-mono text-emerald-300 leading-tight">
                          <div>S. Jenkins</div>
                          <div className="text-emerald-400/70">98.1%</div>
                        </div>
                        <div className="absolute bottom-[22%] right-[18%] border border-amber-400 bg-amber-500/10 px-1 py-0.5 rounded-sm text-[9px] sm:text-[10px] font-mono text-amber-300 leading-tight">
                          <div>Dev Patel</div>
                          <div className="text-amber-400/70">78% ⚠</div>
                        </div>
                        {mockScanning && (
                          <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm flex items-center justify-center font-mono text-[10px] sm:text-xs text-white font-bold animate-pulse">
                            COMPUTING EMBEDDING DISTANCES...
                          </div>
                        )}
                      </div>

                      {/* Recognized bar */}
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-xs text-[var(--text-secondary)]">
                          Recognized:{' '}
                          <strong className="text-[var(--text-primary)]">{detectedCount} / 48</strong>
                        </div>
                        <button
                          onClick={handleSimulateScan}
                          disabled={mockScanning}
                          className="text-[11px] font-mono px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors rounded-sm disabled:opacity-50"
                        >
                          <Sliders className="w-3 h-3" />
                          {mockScanning ? 'Processing…' : 'Re-scan'}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'ledger' && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-widest pb-1.5 border-b border-[var(--border-color)] flex justify-between">
                        <span>Student</span>
                        <span>Status · Acc.</span>
                      </div>
                      {[
                        { roll: 'CSE-001', name: 'Alex Rivera', status: 'PRESENT', acc: '99.4%', ok: true },
                        { roll: 'CSE-002', name: 'Sarah Jenkins', status: 'PRESENT', acc: '98.1%', ok: true },
                        { roll: 'CSE-003', name: 'Dev Patel', status: 'PRESENT', acc: '91.0%', ok: true },
                        { roll: 'CSE-004', name: 'Elena Rostova', status: 'PRESENT', acc: '97.6%', ok: true },
                        { roll: 'CSE-005', name: 'Marcus Chen', status: 'ABSENT', acc: '—', ok: false },
                      ].map((item) => (
                        <div key={item.roll} className="flex items-center justify-between py-1.5 border-b border-[var(--border-color)] text-[11px] font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--text-muted)] text-[10px]">{item.roll}</span>
                            <span className="font-medium text-[var(--text-primary)]">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className={item.ok ? 'text-emerald-500' : 'text-rose-500'}>{item.status}</span>
                            <span className="text-[var(--text-muted)]">{item.acc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'export' && (
                    <div className="space-y-4 py-6 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div className="text-center space-y-1">
                        <h4 className="text-xs font-bold text-[var(--text-primary)] font-mono">AttendX_CSE302_2026-10-03.xlsx</h4>
                        <p className="text-[11px] text-[var(--text-secondary)]">Compatible with Banner, Canvas, Blackboard, and custom SIS formats.</p>
                      </div>
                      <button
                        onClick={() => navigate('/history')}
                        className="text-xs font-mono px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors rounded-sm"
                      >
                        Download Sample Ledger (.xlsx)
                      </button>
                    </div>
                  )}

                  {/* Rig Footer */}
                  <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                    <span>ALGO: SFace-128D Cosine</span>
                    <span>2026-10-03 · 14:00 UTC</span>
                  </div>
                </div>
              </div>

              {/* Mobile-only: Biometric status chip below the rig */}
              <div className="mt-3 lg:hidden flex items-center justify-between px-3 py-2.5 border border-[var(--border-color)] bg-[var(--bg-inset)] rounded-sm font-mono text-[11px]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SFace-128D · Biometric engine active
                </div>
                <button
                  onClick={() => navigate('/take-attendance')}
                  className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
                >
                  Try now <ArrowRight className="w-3 h-3" />
                </button>
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
