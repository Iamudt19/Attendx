import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, CheckCircle2, AlertCircle, AlertTriangle,
  Calendar, Clock, BookOpen, Layers, RefreshCw, BarChart2, Filter,
  Eye, Check, X, ShieldCheck, ChevronRight, User, Award, ArrowUpRight,
  Calculator, Sparkles, Sliders
} from 'lucide-react';
import { StudentUser, StudentAttendanceDashboardResponse, StudentSubjectAttendance, StudentLectureLog } from '../types';
import { StudentPortalService, getStorageUrl } from '../services/api';
import { extractErrorMessage } from '../utils/error';

interface StudentAttendanceViewProps {
  student: StudentUser;
  onNavigateToScan: () => void;
}

export const StudentAttendanceView: React.FC<StudentAttendanceViewProps> = ({
  student,
  onNavigateToScan,
}) => {
  const [data, setData] = useState<StudentAttendanceDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | 'ALL'>('ALL');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Bunk & Shortage Simulator State
  const [simTargetPct, setSimTargetPct] = useState(75);
  const [simFutureClasses, setSimFutureClasses] = useState(2);
  const [simAction, setSimAction] = useState<'miss' | 'attend'>('miss');
  const [simSubjectId, setSimSubjectId] = useState<number | 'ALL'>('ALL');

  const fetchDashboard = useCallback(async (subId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await StudentPortalService.getAttendanceDashboard(subId);
      setData(res);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to fetch attendance records.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(selectedSubjectId === 'ALL' ? undefined : selectedSubjectId);
  }, [fetchDashboard, selectedSubjectId]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="font-mono text-xs text-[var(--text-secondary)]">Loading student academic dossier & attendance telemetry...</div>
      </div>
    );
  }

  const overallPct = data?.overall_percentage ?? 0;
  const isEligible = overallPct >= 75;
  const isWarning = overallPct >= 65 && overallPct < 75;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── ERROR ALERT ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchDashboard(selectedSubjectId === 'ALL' ? undefined : selectedSubjectId)}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 font-bold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── HERO METRICS OVERVIEW ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Percentage Card */}
        <div className="swiss-card p-6 rounded-2xl md:col-span-2 relative overflow-hidden flex flex-col justify-between border border-[var(--border-color)]">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold">
                Academic Term Roll-Call
              </span>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Overall Attendance</h2>
              <p className="text-xs text-[var(--text-secondary)] font-mono">
                {data?.class_name ? `Cohort: ${data.class_name} (${data.section || 'A'})` : 'Enrolled Cohort'}
              </p>
            </div>

            {/* Status Pill */}
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border ${
              isEligible
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : isWarning
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
            }`}>
              {isEligible ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{isEligible ? 'EXAM ELIGIBLE (≥75%)' : isWarning ? 'WARNING (<75%)' : 'CRITICAL RISK (<65%)'}</span>
            </span>
          </div>

          {/* Large Metric Display & Progress Bar */}
          <div className="my-5 space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-extrabold font-mono tracking-tight text-[var(--text-primary)]">
                {overallPct}%
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                ({data?.attended || 0} / {data?.total_classes || 0} Lectures Attended)
              </span>
            </div>

            {/* Dual Target Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 bg-[var(--bg-inset)] rounded-full overflow-hidden relative border border-[var(--border-color)]">
                {/* 75% Institutional Threshold Marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 opacity-80"
                  style={{ left: '75%' }}
                  title="75% Institutional Target"
                />
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isEligible
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : isWarning
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : 'bg-gradient-to-r from-rose-500 to-red-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, overallPct))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
                <span>0%</span>
                <span className="text-blue-500 font-bold">▲ 75% Requirement</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Recovery Guidance */}
          {!isEligible && (data?.required_classes_for_target || 0) > 0 ? (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>
                Need to attend the next <strong>{data?.required_classes_for_target}</strong> consecutive lectures to reach 75% exam threshold.
              </span>
            </div>
          ) : (
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              <span>You meet the institutional attendance criteria for semester examinations.</span>
            </div>
          )}
        </div>

        {/* Present Card */}
        <div className="swiss-card p-5 rounded-2xl flex flex-col justify-between border border-[var(--border-color)]">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Present Lectures</span>
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              {data?.attended || 0}
            </div>
            <div className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
              Biometrically verified via YuNet AI
            </div>
          </div>
          <div className="pt-2 border-t border-[var(--border-color)] text-[10px] font-mono text-emerald-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Neural vector validated</span>
          </div>
        </div>

        {/* Absent Card */}
        <div className="swiss-card p-5 rounded-2xl flex flex-col justify-between border border-[var(--border-color)]">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">Missed Lectures</span>
            <X className="w-4 h-4 text-rose-500" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
              {data?.missed || 0}
            </div>
            <div className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
              Unmarked or absent sessions
            </div>
          </div>
          <div className="pt-2 border-t border-[var(--border-color)] text-[10px] font-mono text-[var(--text-muted)]">
            Total Classes Held: {data?.total_classes || 0}
          </div>
        </div>
      </div>

      {/* ── BUNK & ATTENDANCE SHORTAGE SIMULATOR WIDGET ─────────────────────── */}
      <div className="swiss-card p-6 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Attendance Shortage Simulator &amp; "Bunk" Calculator</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                  Live Tool
                </span>
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Forecast your exam eligibility if you skip or attend upcoming lectures.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)] font-mono font-medium">Select Subject:</span>
            <select
              value={simSubjectId}
              onChange={(e) => setSimSubjectId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="text-xs p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono font-bold"
            >
              <option value="ALL">All Subjects (Overall Aggregate)</option>
              {data?.subjects?.map((s) => (
                <option key={s.subject_id} value={s.subject_id}>
                  {s.subject_code} - {s.subject_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic calculations for selected subject or overall */}
        {(() => {
          let curAttended = data?.attended || 0;
          let curTotal = data?.total_classes || 0;
          let subName = 'Overall Attendance';

          if (simSubjectId !== 'ALL' && data?.subjects) {
            const foundSub = data.subjects.find((s) => s.subject_id === simSubjectId);
            if (foundSub) {
              curAttended = foundSub.attended;
              curTotal = foundSub.total_classes;
              subName = foundSub.subject_name;
            }
          }

          const curPct = curTotal > 0 ? Number(((curAttended / curTotal) * 100).toFixed(1)) : 100;
          const targetFrac = simTargetPct / 100;
          const isSafe = curPct >= simTargetPct;

          // Bunks allowed:
          const maxBunkable = Math.max(0, Math.floor((curAttended - targetFrac * curTotal) / (targetFrac || 0.75)));
          // Lectures needed to recover:
          const neededToRecover = Math.max(0, Math.ceil((targetFrac * curTotal - curAttended) / (1 - targetFrac || 0.25)));

          // Forecast:
          const futureTotal = curTotal + simFutureClasses;
          const futureAttended = simAction === 'attend' ? curAttended + simFutureClasses : curAttended;
          const forecastPct = futureTotal > 0 ? Number(((futureAttended / futureTotal) * 100).toFixed(1)) : 100;
          const forecastSafe = forecastPct >= simTargetPct;

          return (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                isSafe
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {isSafe ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span>{subName}: {curPct}% ({curAttended}/{curTotal} held)</span>
                  </div>
                  <p className="text-xs opacity-90">
                    {isSafe
                      ? `🎉 Safe: You can miss up to ${maxBunkable} more lecture${maxBunkable === 1 ? '' : 's'} in this subject without falling below ${simTargetPct}%.`
                      : `⚠️ Shortage: You need to attend ${neededToRecover} consecutive lecture${neededToRecover === 1 ? '' : 's'} to get back above ${simTargetPct}%.`}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono text-2xl font-extrabold">{curPct}%</div>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
                    {isSafe ? 'Eligible' : 'Shortage Alert'}
                  </span>
                </div>
              </div>

              {/* Slider Controls */}
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <span>Simulate next:</span>
                    <span className="font-mono text-blue-500 font-bold">
                      {simAction === 'miss' ? `Skip ${simFutureClasses} Lectures` : `Attend ${simFutureClasses} Lectures`}
                    </span>
                  </span>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSimAction('miss')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                        simAction === 'miss'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      If I Skip
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimAction('attend')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                        simAction === 'attend'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      If I Attend
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min={1}
                  max={12}
                  value={simFutureClasses}
                  onChange={(e) => setSimFutureClasses(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />

                <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)] pt-1">
                  <span>Projected New Attendance:</span>
                  <span className={`font-bold text-sm ${forecastSafe ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {forecastPct}% ({futureAttended}/{futureTotal} classes) · {forecastSafe ? '✓ Exam Eligible' : '⚠ Shortage Risk'}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── SUBJECT CURRICULUM BREAKDOWN ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Curriculum Subjects &amp; Course Analytics
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Track attendance percentage and exam eligibility individually for each subject.
            </p>
          </div>

          <button
            onClick={() => fetchDashboard(selectedSubjectId === 'ALL' ? undefined : selectedSubjectId)}
            className="btn-secondary text-xs px-3 py-1.5 font-mono flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {/* Subject Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {data?.subjects?.map((sub: StudentSubjectAttendance) => {
            const isSubEligible = sub.percentage >= 75;
            const isSelected = selectedSubjectId === sub.subject_id;
            return (
              <div
                key={sub.subject_id}
                onClick={() => setSelectedSubjectId(isSelected ? 'ALL' : sub.subject_id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/20 shadow-md'
                    : 'swiss-card hover:border-[var(--border-color-hover)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {sub.subject_code}
                    </span>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] mt-1.5 line-clamp-1">
                      {sub.subject_name}
                    </h4>
                  </div>
                  <span className={`text-sm font-extrabold font-mono ${
                    isSubEligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}>
                    {sub.percentage}%
                  </span>
                </div>

                {/* Subject Progress Bar */}
                <div className="w-full h-1.5 bg-[var(--bg-inset)] rounded-full overflow-hidden my-2.5">
                  <div
                    className={`h-full rounded-full ${
                      isSubEligible ? 'bg-emerald-500' : sub.percentage >= 65 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(3, sub.percentage))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                  <span>{sub.attended} of {sub.total_classes} Classes</span>
                  <span className={isSubEligible ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                    {isSubEligible ? '✓ Eligible' : '⚠ Below 75%'}
                  </span>
                </div>
              </div>
            );
          })}
          {(!data?.subjects || data.subjects.length === 0) && (
            <div className="col-span-full p-8 text-center text-xs text-[var(--text-muted)] font-mono swiss-card rounded-xl">
              No curriculum subjects mapped to your cohort section yet.
            </div>
          )}
        </div>
      </div>

      {/* ── VISUAL ANALYTICS: MONTHLY TRENDS ──────────────────────────────────── */}
      {data?.monthly_analytics && data.monthly_analytics.length > 0 && (
        <div className="swiss-card p-5 rounded-2xl border border-[var(--border-color)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              Monthly Attendance Trends &amp; Distribution
            </h3>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              Term Timeline Analytics
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
            {data.monthly_analytics.map((m) => (
              <div key={m.month} className="p-3 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-color)] text-center space-y-1.5">
                <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase font-bold">{m.month}</div>
                <div className="text-lg font-bold font-mono text-[var(--text-primary)]">{m.percentage}%</div>
                <div className="w-full h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      m.percentage >= 75 ? 'bg-emerald-500' : m.percentage >= 65 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, m.percentage))}%` }}
                  />
                </div>
                <div className="text-[10px] font-mono text-[var(--text-secondary)]">
                  {m.present}/{m.total} lectures
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LECTURE LOGS & HISTORY LEDGER ────────────────────────────────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Lecture Roll-Call History ({data?.history?.length || 0})
            </h3>
          </div>

          {/* Subject Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] font-mono"
            >
              <option value="ALL">All Subjects Filter</option>
              {data?.subjects?.map((sub) => (
                <option key={sub.subject_id} value={sub.subject_id}>
                  {sub.subject_code} · {sub.subject_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="swiss-card rounded-xl overflow-x-auto border border-[var(--border-color)]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[var(--bg-inset)] border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase">
              <tr>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Subject Course</th>
                <th className="py-3 px-4">Instructor / Faculty</th>
                <th className="py-3 px-4">AI Verification</th>
                <th className="py-3 px-4 text-right">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {data?.history?.map((item: StudentLectureLog) => {
                const isPresent = item.status === 'PRESENT';
                return (
                  <tr key={item.session_id} className="hover:bg-[var(--bg-inset)]/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[var(--text-primary)]">{item.date}</div>
                      <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.start_time || 'Classroom Session'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[var(--text-primary)]">{item.subject_name}</div>
                      <div className="text-[10px] text-blue-500 font-bold">{item.subject_code}</div>
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {item.teacher_name || 'Department Faculty'}
                    </td>
                    <td className="py-3 px-4">
                      {isPresent ? (
                        <div className="space-y-0.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{Math.round((item.confidence || 0.95) * 100)}% Match</span>
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {item.verification_status === 'TEACHER_VERIFIED' ? 'Teacher Verified' : 'Neural SFace Match'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-3 py-1 rounded-full font-bold text-xs inline-flex items-center gap-1 ${
                        isPresent
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}>
                        {isPresent ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        <span>{item.status}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(!data?.history || data.history.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-[var(--text-muted)]">
                    No attendance sessions logged for this cohort yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
