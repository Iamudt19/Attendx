import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  History as HistoryIcon, FileSpreadsheet,
  Eye, X, RefreshCw
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
  const [detailSession, setDetailSession] = useState<AttendanceSessionOut | null>(null);

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl text-slate-900 font-normal tracking-tight flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-blue-600" />
            Attendance History & Archives
          </h1>
          <p className="text-xs text-slate-500">
            View, filter, inspect, and export past classroom attendance sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSessions(true)}
            disabled={refreshing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 flex items-center gap-2 transition-all disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {selectedClassId && (
            <a
              href={AttendanceService.downloadExcelUrl(selectedClassId, selectedSubjectId)}
              download
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Class Excel</span>
            </a>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Filter by Class
          </label>
          <select
            value={selectedClassId || ''}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
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
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Filter by Subject
          </label>
          <select
            value={selectedSubjectId || ''}
            onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
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
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Filter by Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            Loading attendance history...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-14 text-slate-500 text-sm space-y-2">
            <HistoryIcon className="w-8 h-8 mx-auto text-slate-400" />
            <p className="font-semibold text-slate-800">No recorded attendance sessions matching filters.</p>
            <p className="text-xs text-slate-500">Take attendance and save a session to see it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Teacher</th>
                  <th className="py-3 px-4 text-center">Turnout</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sessions.map((sess) => {
                  const pct = sess.total_enrolled > 0
                    ? Math.round((sess.present_count / sess.total_enrolled) * 100)
                    : 0;
                  const pctBadge = pct >= 75
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : pct >= 50
                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                    : 'bg-rose-50 text-rose-700 border-rose-100';
                  return (
                    <tr key={sess.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {sess.date} <span className="text-slate-500 font-normal">({sess.start_time})</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{sess.class_name}</td>
                      <td className="py-3.5 px-4 text-slate-900 font-bold">{sess.subject_name}</td>
                      <td className="py-3.5 px-4 text-slate-500">{sess.teacher_name}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${pctBadge}`}>
                          {sess.present_count} / {sess.total_enrolled} ({pct}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => openSessionDetail(sess.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Details</span>
                        </button>
                        <a
                          href={AttendanceService.downloadExcelUrl(sess.class_id, sess.subject_id)}
                          download
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-100 inline-flex items-center gap-1 transition-colors"
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
      </div>

      {/* Session Details Modal */}
      {detailSession && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-serif text-2xl text-slate-900 font-normal">{detailSession.subject_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {detailSession.class_name} &bull; {detailSession.date} ({detailSession.start_time})
                  &nbsp;&bull;&nbsp;
                  <span className="text-emerald-600 font-semibold">
                    {detailSession.present_count} Present / {detailSession.total_enrolled} Enrolled
                  </span>
                </p>
              </div>
              <button
                onClick={() => setDetailSession(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Student ID</th>
                    <th className="py-2.5 px-4">Roll No</th>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {detailSession.records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 text-slate-500 font-mono">{r.student_code}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono">{r.roll_number}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{r.student_name}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            r.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500 text-xs">
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
