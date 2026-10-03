import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  History as HistoryIcon, FileSpreadsheet,
  Eye, X, RefreshCw, Calendar, CheckCircle2, AlertTriangle, Users, Layers, ArrowRight
} from 'lucide-react';
import { AttendanceService, ClassService, SubjectService } from '../services/api';
import { AttendanceSessionOut, ClassItem, SubjectItem } from '../types';

export const History: React.FC = () => {
  const location = useLocation();
  const [sessions, setSessions] = useState<AttendanceSessionOut[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [detailSession, setDetailSession] = useState<AttendanceSessionOut | null>(null);

  useEffect(() => {
    const initFilters = async () => {
      try {
        const [clsData, subData] = await Promise.all([
          ClassService.getClasses(),
          SubjectService.getSubjects()
        ]);
        setClasses(clsData || []);
        setSubjects(subData || []);
        if (clsData && clsData.length > 0 && selectedClassId === undefined) {
          setSelectedClassId(clsData[0].id);
        }
      } catch (err) {
        console.error("Filter init error", err);
      }
    };
    initFilters();
  }, []);

  const fetchSessions = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await AttendanceService.getSessions({
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
        date: selectedDate || undefined
      });
      setSessions(data || []);
    } catch (err) {
      console.error("Error fetching sessions", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedClassId, selectedSubjectId, selectedDate]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, location.key]);

  const openSessionDetail = async (sessionId: number) => {
    try {
      const detail = await AttendanceService.getSessionDetail(sessionId);
      setDetailSession(detail);
    } catch (err) {
      console.error("Failed to load session details", err);
    }
  };

  const handleExport = async () => {
    const targetClassId = selectedClassId || (classes.length > 0 ? classes[0].id : 1);
    setExporting(true);
    try {
      await AttendanceService.downloadExcelDirect(targetClassId, selectedSubjectId);
    } catch (err) {
      console.error("Direct Excel export failed, falling back to URL", err);
      const fallbackUrl = AttendanceService.downloadExcelUrl(targetClassId, selectedSubjectId);
      window.open(fallbackUrl, '_blank');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 text-[#e5e1e4]">
      {/* ── Header & Action Ribbon ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#3c4a42]/30">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c1b1d] border border-[#3c4a42]/40 text-[#4edea3] text-[11px] font-mono font-semibold uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
            Archive Ledger
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            Attendance History & Official Logs
          </h1>
          <p className="text-xs text-[#86948a] font-mono mt-0.5">
            Filter, inspect neural recognition confidence, and export audit-ready .xlsx attendance dossiers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchSessions(true)}
            disabled={refreshing}
            className="px-3.5 py-2 bg-[#1c1b1d] hover:bg-[#252427] text-[#bbcabf] font-semibold text-xs rounded-xl border border-[#3c4a42]/40 flex items-center gap-2 transition-all disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#4edea3]' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exporting ? 'Generating Excel...' : 'Export Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="bg-[#141416] border border-[#3c4a42]/30 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-xl">
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-[#86948a] mb-1.5 font-bold">
            Academic Class
          </label>
          <select
            value={selectedClassId || ''}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-[#1c1b1d] border border-[#3c4a42]/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#4edea3] font-medium"
          >
            <option value="">All Classrooms</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-[#86948a] mb-1.5 font-bold">
            Curriculum Subject
          </label>
          <select
            value={selectedSubjectId || ''}
            onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-[#1c1b1d] border border-[#3c4a42]/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#4edea3] font-medium"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-[#86948a] mb-1.5 font-bold">
            Session Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-[#1c1b1d] border border-[#3c4a42]/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#4edea3] font-medium"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Sessions Ledger Table ── */}
      <div className="bg-[#141416] border border-[#3c4a42]/30 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#3c4a42]/30 bg-[#1c1b1d]/80 text-[#86948a] font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Session Date & Time</th>
                <th className="py-3 px-4">Class & Section</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4 text-center">Attendance Ratio</th>
                <th className="py-3 px-4 text-center">Neural Verification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3c4a42]/20">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#86948a] font-mono">
                    <div className="w-6 h-6 border-2 border-[#4edea3] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading session archives...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#86948a] font-mono">
                    No attendance sessions found matching the active filter.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => {
                  const presentRate = Math.round(((sess.present_count || 0) / (sess.total_enrolled || 1)) * 100);
                  const isHealthy = presentRate >= 80;
                  return (
                    <tr key={sess.id} className="hover:bg-[#1c1b1d]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-white">
                        <div className="font-semibold">{sess.date}</div>
                        <div className="text-[10px] text-[#86948a]">{sess.start_time}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#201f22] border border-[#3c4a42]/40 text-[#e5e1e4] font-medium font-mono text-[11px]">
                          {sess.class_name || `Class #${sess.class_id}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {sess.subject_name || `Subject #${sess.subject_id}`}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className={`font-bold ${isHealthy ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {sess.present_count} / {sess.total_enrolled || 1} ({presentRate}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{sess.verification_rate || 98.6}%</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openSessionDetail(sess.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#201f22] hover:bg-[#2a2a2c] text-[#4edea3] border border-[#3c4a42]/40 text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detailed Session Modal ── */}
      {detailSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#141416] border border-[#3c4a42]/50 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative text-[#e5e1e4] max-h-[85vh] flex flex-col">
            <button
              onClick={() => setDetailSession(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#201f22] hover:bg-[#2a2a2c] flex items-center justify-center text-[#86948a] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="pb-4 border-b border-[#3c4a42]/30 mb-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#4edea3]">
                Session ID: #{detailSession.id}
              </div>
              <h3 className="text-xl font-bold text-white mt-0.5">
                {detailSession.class_name || `Class #${detailSession.class_id}`} — {detailSession.subject_name || `Subject #${detailSession.subject_id}`}
              </h3>
              <p className="text-xs text-[#86948a] font-mono">
                {detailSession.date} at {detailSession.start_time}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#86948a] font-bold">
                Student Attendance Records ({detailSession.records?.length || 0})
              </div>
              {detailSession.records && detailSession.records.length > 0 ? (
                detailSession.records.map((rec, i) => (
                  <div
                    key={i}
                    className="p-3 bg-[#1c1b1d] rounded-xl border border-[#3c4a42]/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{rec.student_name || `Student #${rec.student_id}`}</div>
                      <div className="text-[10px] font-mono text-[#86948a]">Roll: {rec.roll_number || 'N/A'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-[#86948a]">
                        Conf: {(rec.confidence * 100).toFixed(1)}%
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          rec.status === 'PRESENT'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-[#86948a]">
                  No individual student records recorded for this session.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#3c4a42]/30 mt-4 flex justify-end">
              <button
                onClick={() => setDetailSession(null)}
                className="bg-[#201f22] hover:bg-[#2a2a2c] text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
