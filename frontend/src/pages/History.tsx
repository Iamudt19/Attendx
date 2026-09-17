import React, { useState, useEffect } from 'react';
import { 
  History as HistoryIcon, FileSpreadsheet, Filter, 
  Search, Eye, Calendar, CheckCircle2, XCircle, X 
} from 'lucide-react';
import { AttendanceService, ClassService, SubjectService } from '../services/api';
import { AttendanceSessionOut, ClassItem, SubjectItem } from '../types';

export const History: React.FC = () => {
  const [sessions, setSessions] = useState<AttendanceSessionOut[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
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

  const fetchSessions = async () => {
    setLoading(true);
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
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [selectedClassId, selectedSubjectId, selectedDate]);

  const openSessionDetail = async (sessionId: number) => {
    try {
      const detail = await AttendanceService.getSessionDetail(sessionId);
      setDetailSession(detail);
    } catch (err) {
      console.error("Failed to load session details", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-blue-500" />
            Attendance History
          </h1>
          <p className="text-xs text-slate-400">
            View, filter, inspect, and export past classroom attendance sessions.
          </p>
        </div>

        {selectedClassId && (
          <a
            href={AttendanceService.downloadExcelUrl(selectedClassId, selectedSubjectId)}
            download
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Class Excel
          </a>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Filter by Class
          </label>
          <select
            value={selectedClassId || ''}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Filter by Subject
          </label>
          <select
            value={selectedSubjectId || ''}
            onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
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
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Filter by Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading attendance history...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No recorded attendance sessions matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Teacher</th>
                  <th className="py-3 px-4 text-center">Present / Enrolled</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {sessions.map((sess) => {
                  const pct = sess.total_enrolled > 0 ? Math.round((sess.present_count / sess.total_enrolled) * 100) : 0;
                  return (
                    <tr key={sess.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {sess.date} <span className="text-slate-400 font-normal">({sess.start_time})</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{sess.class_name}</td>
                      <td className="py-3.5 px-4 text-slate-300 font-semibold">{sess.subject_name}</td>
                      <td className="py-3.5 px-4 text-slate-400">{sess.teacher_name}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {sess.present_count} / {sess.total_enrolled} ({pct}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => openSessionDetail(sess.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold border border-slate-700 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          View Details
                        </button>
                        <a
                          href={AttendanceService.downloadExcelUrl(sess.class_id, sess.subject_id)}
                          download
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-[11px] font-semibold border border-emerald-500/30 inline-flex items-center gap-1"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Excel
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{detailSession.subject_name}</h3>
                <p className="text-xs text-slate-400">
                  {detailSession.class_name} • Date: {detailSession.date} ({detailSession.start_time})
                </p>
              </div>
              <button
                onClick={() => setDetailSession(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Student ID</th>
                    <th className="py-2.5 px-4">Roll No</th>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {detailSession.records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 text-slate-400">{r.student_code}</td>
                      <td className="py-2.5 px-4 text-slate-400">{r.roll_number}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-200">{r.student_name}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            r.status === 'PRESENT'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400 text-[11px]">
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
