import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { 
  History as HistoryIcon, FileSpreadsheet,
  Eye, X, RefreshCw, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { AttendanceService, ClassService, SubjectService } from '../services/api';
import { AttendanceSessionOut, ClassItem, SubjectItem } from '../types';

export const History: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlSessionId = searchParams.get('session_id');

  const [sessions, setSessions] = useState<AttendanceSessionOut[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [detailSession, setDetailSession] = useState<AttendanceSessionOut | null>(null);

  // BUG-14: Pagination controls
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  useEffect(() => {
    const initFilters = async () => {
      try {
        const [clsData, subData] = await Promise.all([
          ClassService.getClasses(),
          SubjectService.getSubjects()
        ]);
        setClasses(clsData);
        setSubjects(subData);
      } catch (err) {
        console.error("Filter init error", err);
      }
    };
    initFilters();
  }, []);

  const openSessionDetail = useCallback(async (sessionId: number) => {
    try {
      const detail = await AttendanceService.getSessionDetail(sessionId);
      setDetailSession(detail);
    } catch (err) {
      console.error("Failed to load session details", err);
    }
  }, []);

  // BUG-15: Automatically open session details if session_id is passed in URL
  useEffect(() => {
    if (urlSessionId) {
      openSessionDetail(Number(urlSessionId));
    }
  }, [urlSessionId, openSessionDetail]);

  const fetchSessions = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await AttendanceService.getSessions({
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
        date: selectedDate || undefined
      });
      setSessions(data);
      setCurrentPage(1);
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

  // Paginated sessions slice
  const totalPages = Math.ceil(sessions.length / pageSize) || 1;
  const paginatedSessions = sessions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 text-slate-100 pb-12">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <HistoryIcon className="w-7 h-7 text-emerald-400" />
            Attendance History & Archives
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Filter, inspect, audit, and export past classroom attendance sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchSessions(true)}
            disabled={refreshing}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 flex items-center gap-2 transition-all disabled:opacity-50"
            title="Refresh list"
            type="button"
            aria-label="Refresh attendance sessions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {selectedClassId && (
            <a
              href={AttendanceService.downloadExcelUrl(selectedClassId, selectedSubjectId)}
              download
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 hover:brightness-110 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Class Excel</span>
            </a>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Filter by Class Cohort
          </label>
          <select
            value={selectedClassId || ''}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium transition-all"
          >
            <option value="">All Classrooms</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900">
                {c.name} {c.section}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Filter by Subject
          </label>
          <select
            value={selectedSubjectId || ''}
            onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium transition-all"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900">
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Filter by Lecture Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium transition-all"
          />
        </div>
      </div>

      {/* Sessions Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-xs font-mono flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Loading attendance session logs...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs font-mono space-y-2">
            <HistoryIcon className="w-8 h-8 mx-auto text-slate-600 mb-1" />
            <p className="font-semibold text-slate-300">No recorded attendance sessions match your filter.</p>
            <p className="text-[11px] text-slate-500">Run a session in Attendance Canvas to archive it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px] font-mono">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Date &amp; Time</th>
                  <th className="py-3.5 px-4 font-bold">Class</th>
                  <th className="py-3.5 px-4 font-bold">Subject</th>
                  <th className="py-3.5 px-4 font-bold">Teacher</th>
                  <th className="py-3.5 px-4 font-bold text-center">Turnout</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {paginatedSessions.map((sess) => {
                  const pct = sess.total_enrolled > 0
                    ? Math.round((sess.present_count / sess.total_enrolled) * 100)
                    : 0;
                  const pctBadge = pct >= 75
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : pct >= 50
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                  return (
                    <tr key={sess.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-white">{sess.date}</span>{' '}
                        <span className="text-slate-500 text-[11px]">({sess.start_time})</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{sess.class_name}</td>
                      <td className="py-3.5 px-4 text-white font-semibold">{sess.subject_name}</td>
                      <td className="py-3.5 px-4 text-slate-400">{sess.teacher_name}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${pctBadge}`}>
                          {sess.present_count} / {sess.total_enrolled} ({pct}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => openSessionDetail(sess.id)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-slate-700"
                          aria-label={`View details for session ${sess.id}`}
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Details</span>
                        </button>
                        <a
                          href={AttendanceService.downloadExcelUrl(sess.class_id, sess.subject_id)}
                          download
                          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold border border-emerald-500/30 inline-flex items-center gap-1.5 transition-colors"
                          aria-label={`Export excel for session ${sess.id}`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Excel</span>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* BUG-14: Pagination Bar */}
        {sessions.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400 font-mono">
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sessions.length)} of {sessions.length} sessions
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors border border-slate-700"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-white font-bold px-1">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors border border-slate-700"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {detailSession && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white">{detailSession.subject_name}</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {detailSession.class_name} &bull; {detailSession.date} ({detailSession.start_time})
                  &nbsp;&bull;&nbsp;
                  <span className="text-emerald-400 font-semibold">
                    {detailSession.present_count} Present / {detailSession.total_enrolled} Enrolled
                  </span>
                </p>
              </div>
              <button
                onClick={() => setDetailSession(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close session details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 border border-slate-800 rounded-2xl bg-slate-950/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 sticky top-0 text-[11px] font-mono">
                  <tr>
                    <th className="py-2.5 px-4 font-bold">Student ID</th>
                    <th className="py-2.5 px-4 font-bold">Roll No</th>
                    <th className="py-2.5 px-4 font-bold">Name</th>
                    <th className="py-2.5 px-4 font-bold text-center">Status</th>
                    <th className="py-2.5 px-4 font-bold text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {detailSession.records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-emerald-400 font-mono">{r.student_code}</td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono">{r.roll_number}</td>
                      <td className="py-2.5 px-4 font-bold text-white">{r.student_name}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                            r.status === 'PRESENT'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400 font-mono text-xs">
                        {r.verification_status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
