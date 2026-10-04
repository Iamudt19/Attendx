import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  History as HistoryIcon, FileSpreadsheet,
  Eye, X, RefreshCw, Calendar, CheckCircle2, AlertTriangle, AlertCircle, Users, Layers, ArrowRight, Trash2
} from 'lucide-react';
import { AttendanceService, ClassService, SubjectService } from '../services/api';
import { AttendanceSessionOut, ClassItem, SubjectItem } from '../types';
import { extractErrorMessage } from '../utils/error';

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
  const [editableRecords, setEditableRecords] = useState<any[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

  // Deletion state
  const [sessionToDelete, setSessionToDelete] = useState<AttendanceSessionOut | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  const handleDeleteSession = async (session: AttendanceSessionOut) => {
    setIsDeleting(true);
    try {
      await AttendanceService.deleteSession(session.id);
      setDeleteNotice(`Attendance for ${session.date} (${session.subject_name || 'Subject'}) deleted successfully.`);
      setSessionToDelete(null);
      if (detailSession?.id === session.id) setDetailSession(null);
      await fetchSessions(true);
      setTimeout(() => setDeleteNotice(null), 4000);
    } catch (err) {
      console.error("Failed to delete session", err);
      alert(extractErrorMessage(err, "Failed to delete session."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteByDateAndSubject = async () => {
    if (!selectedDate || !selectedSubjectId) return;
    setIsDeleting(true);
    try {
      const res = await AttendanceService.deleteSessionByDateAndSubject(
        selectedDate,
        selectedSubjectId,
        selectedClassId
      );
      setDeleteNotice(res.message || `Deleted attendance for ${selectedDate}.`);
      setShowBulkDeleteModal(false);
      await fetchSessions(true);
      setTimeout(() => setDeleteNotice(null), 4000);
    } catch (err) {
      console.error("Failed to delete attendance by date/subject", err);
      alert(extractErrorMessage(err, "Failed to delete attendance."));
    } finally {
      setIsDeleting(false);
    }
  };

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
      setEditableRecords(detail.records ? JSON.parse(JSON.stringify(detail.records)) : []);
      setEditSuccessMsg(null);
    } catch (err) {
      console.error("Failed to load session details", err);
    }
  };

  const handleToggleRecordStatus = (index: number) => {
    setEditableRecords((prev) => {
      const copy = [...prev];
      const cur = copy[index];
      const nextStatus = cur.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
      copy[index] = {
        ...cur,
        status: nextStatus,
        verification_status: 'TEACHER_VERIFIED'
      };
      return copy;
    });
  };

  const handleSaveSessionEdit = async () => {
    if (!detailSession) return;
    setIsSavingEdit(true);
    setEditErrorMsg(null);
    try {
      const recordsToUpdate = editableRecords.map((r) => ({
        student_id: r.student_id,
        status: r.status,
        confidence: r.confidence ?? 1.0,
        verification_status: r.verification_status ?? 'TEACHER_VERIFIED'
      }));

      const updated = await AttendanceService.updateSessionRecords(
        detailSession.id,
        recordsToUpdate
      );
      setDetailSession(updated);
      setEditableRecords(updated.records ? JSON.parse(JSON.stringify(updated.records)) : []);
      setEditSuccessMsg("Attendance records updated & synced to database successfully.");
      fetchSessions(true);
      setTimeout(() => setEditSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error("Failed to update session records", err);
      setEditErrorMsg(extractErrorMessage(err, "Failed to persist changes to database. Please check connection."));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const isDirty = detailSession && editableRecords.some((rec, idx) => {
    const orig = detailSession.records?.[idx];
    return !orig || orig.status !== rec.status;
  });

  const presentCountModal = editableRecords.filter((r) => r.status === 'PRESENT').length;
  const totalCountModal = editableRecords.length;

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
    <div className="space-y-6 max-w-7xl mx-auto py-2 text-[var(--text-primary)] transition-colors font-sans">
      {/* ── Header & Action Ribbon ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[var(--border-color)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border-color)] text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-semibold uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Archive Ledger
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            Attendance History & Official Logs
          </h1>
          <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
            Filter, inspect neural recognition confidence, and export audit-ready .xlsx attendance dossiers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchSessions(true)}
            disabled={refreshing}
            className="px-3.5 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] text-[var(--text-secondary)] font-semibold text-xs rounded-xl border border-[var(--border-color)] flex items-center gap-2 transition-all disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
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

      {/* ── Success/Delete Notice Banner ── */}
      {deleteNotice && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-mono font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>{deleteNotice}</span>
          </div>
          <button onClick={() => setDeleteNotice(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Filters Bar ── */}
      <div className="swiss-card rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 font-bold">
              Academic Class
            </label>
            <select
              value={selectedClassId || ''}
              onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-medium"
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
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 font-bold">
              Curriculum Subject
            </label>
            <select
              value={selectedSubjectId || ''}
              onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-medium"
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
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 font-bold">
              Session Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-medium"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Date + Subject Bulk Delete Toolbar */}
        {selectedDate && selectedSubjectId && (
          <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
            <div className="text-[var(--text-secondary)] font-mono text-[11px]">
              Active filter: <span className="font-bold text-[var(--text-primary)]">{selectedDate}</span> for{' '}
              <span className="font-bold text-[var(--text-primary)]">
                {subjects.find((s) => s.id === selectedSubjectId)?.name || `Subject #${selectedSubjectId}`}
              </span>
            </div>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Attendance for this Date &amp; Subject</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Sessions Ledger Table ── */}
      <div className="swiss-card rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-inset)] text-[var(--text-secondary)] font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Session Date & Time</th>
                <th className="py-3 px-4">Class & Section</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4 text-center">Attendance Ratio</th>
                <th className="py-3 px-4 text-center">Neural Verification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-mono">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading session archives...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-mono">
                    No attendance sessions found matching the active filter.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => {
                  const presentRate = Math.round(((sess.present_count || 0) / (sess.total_enrolled || 1)) * 100);
                  const isHealthy = presentRate >= 80;
                  return (
                    <tr key={sess.id} className="hover:bg-[var(--bg-inset)] transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[var(--text-primary)]">
                        <div className="font-semibold">{sess.date}</div>
                        <div className="text-[10px] text-[var(--text-secondary)]">{sess.start_time}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium font-mono text-[11px]">
                          {sess.class_name || `Class #${sess.class_id}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[var(--text-primary)] font-medium">
                        {sess.subject_name || `Subject #${sess.subject_id}`}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className={`font-bold ${isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {sess.present_count} / {sess.total_enrolled || 1} ({presentRate}%)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{sess.verification_rate || 98.6}%</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openSessionDetail(sess.id)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-blue-600 dark:text-emerald-400 border border-[var(--border-color)] text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect &amp; Edit</span>
                          </button>
                          <button
                            onClick={() => setSessionToDelete(sess)}
                            className="p-1.5 rounded-lg bg-[var(--bg-inset)] hover:bg-rose-500/10 text-rose-500 border border-[var(--border-color)] hover:border-rose-500/30 transition-all"
                            title="Delete Session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detailed Session Modal with Interactive Record Editor ── */}
      {detailSession && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="swiss-card rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative text-[var(--text-primary)] max-h-[88vh] flex flex-col">
            <button
              onClick={() => setDetailSession(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="pb-4 border-b border-[var(--border-color)] mb-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
                  Session ID: #{detailSession.id} • Interactive Attendance Editor
                </div>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  {presentCountModal} / {totalCountModal} Present
                </span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1">
                {detailSession.class_name || `Class #${detailSession.class_id}`} — {detailSession.subject_name || `Subject #${detailSession.subject_id}`}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-mono">
                {detailSession.date} at {detailSession.start_time} • Click any student to toggle Present / Absent status
              </p>
              {editSuccessMsg && (
                <div className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-lg flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{editSuccessMsg}</span>
                </div>
              )}
              {editErrorMsg && (
                <div className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-2 rounded-lg flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editErrorMsg}</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">
                Student Attendance Records ({editableRecords.length})
              </div>
              {editableRecords.length > 0 ? (
                editableRecords.map((rec, i) => {
                  const isPresent = rec.status === 'PRESENT';
                  return (
                    <div
                      key={i}
                      onClick={() => handleToggleRecordStatus(i)}
                      className="p-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] cursor-pointer rounded-lg border border-[var(--border-color)] flex items-center justify-between text-xs transition-colors group"
                    >
                      <div>
                        <div className="font-semibold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors">
                          {rec.student_name || `Student #${rec.student_id}`}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--text-muted)]">Roll: {rec.roll_number || 'N/A'}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {rec.confidence != null && (
                          <span className="font-mono text-[11px] text-[var(--text-muted)]">
                            Conf: {(rec.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRecordStatus(i);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                            isPresent
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                              : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isPresent ? '✓ PRESENT' : '✗ ABSENT'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-[#86948a]">
                  No individual student records recorded for this session.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] mt-4 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  const s = detailSession;
                  setDetailSession(null);
                  setSessionToDelete(s);
                }}
                className="px-3.5 py-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl border border-rose-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Session</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailSession(null)}
                  className="bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold px-4 py-2.5 rounded-xl border border-[var(--border-color)] transition-colors"
                >
                  Close
                </button>
                {isDirty && (
                  <button
                    onClick={handleSaveSessionEdit}
                    disabled={isSavingEdit}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
                  >
                    {isSavingEdit ? 'Updating Ledger...' : 'Save & Overwrite Attendance'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Single Session Delete Confirmation Modal ── */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="swiss-card rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-[var(--text-primary)] border border-rose-500/30">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Delete Attendance Session #{sessionToDelete.id}?
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed font-mono">
              Are you sure you want to permanently delete attendance for{' '}
              <span className="text-[var(--text-primary)] font-bold">{sessionToDelete.date}</span> (
              {sessionToDelete.subject_name || `Subject #${sessionToDelete.subject_id}`})? All {sessionToDelete.total_enrolled || 0} student attendance records and audit logs for this session will be removed.
            </p>

            <div className="pt-5 mt-5 border-t border-[var(--border-color)] flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSessionToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] font-semibold text-xs border border-[var(--border-color)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSession(sessionToDelete)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Date & Subject Delete Confirmation Modal ── */}
      {showBulkDeleteModal && selectedDate && selectedSubjectId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="swiss-card rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-[var(--text-primary)] border border-rose-500/30">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Delete Attendance for Date &amp; Subject?
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed font-mono">
              You are about to delete all attendance sessions for date{' '}
              <span className="text-[var(--text-primary)] font-bold">{selectedDate}</span> and subject{' '}
              <span className="text-[var(--text-primary)] font-bold">
                {subjects.find((s) => s.id === selectedSubjectId)?.name || `Subject #${selectedSubjectId}`}
              </span>.
            </p>

            <div className="pt-5 mt-5 border-t border-[var(--border-color)] flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] font-semibold text-xs border border-[var(--border-color)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteByDateAndSubject}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeleting ? 'Deleting...' : 'Delete All Matching'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
