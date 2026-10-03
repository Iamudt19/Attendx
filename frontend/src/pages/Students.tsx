import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Upload, ShieldCheck, Trash2, 
  Eye, AlertCircle, CheckCircle2, RefreshCw, X, Search, Sparkles
} from 'lucide-react';
import { StudentService, ClassService } from '../services/api';
import { StudentItem, ClassItem } from '../types';
import { extractErrorMessage } from '../utils/error';

export const Students: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Student & Face Upload Modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newStudentId, setNewStudentId] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newRollNumber, setNewRollNumber] = useState<string>('');
  const [newClassId, setNewClassId] = useState<number>(0);
  const [newEmail, setNewEmail] = useState<string>('');

  const [faceFiles, setFaceFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const clsList = await ClassService.getClasses();
        setClasses(clsList || []);
        if (clsList && clsList.length > 0) {
          setNewClassId(clsList[0].id);
        }
      } catch (err) {
        console.error("Failed to load classes", err);
      }
    };
    initData();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await StudentService.getStudents(selectedClassId);
      setStudents(data || []);
    } catch (err) {
      console.error("Failed to load students", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClassId]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassId) {
      setModalError("Please select a Class.");
      return;
    }

    setSubmitting(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      const createdStudent = await StudentService.createStudent({
        student_id: newStudentId,
        name: newName,
        roll_number: newRollNumber,
        class_id: newClassId,
        email: newEmail || undefined
      });

      if (faceFiles.length > 0) {
        const uploadRes = await StudentService.uploadFaceImages(createdStudent.id, faceFiles);
        if (uploadRes.warnings && uploadRes.warnings.length > 0) {
          setModalError(`Student created, but image warnings: ${uploadRes.warnings.join(' ')}`);
        } else {
          setModalSuccess(`Successfully created student and registered ${uploadRes.registered_images} reference face(s)!`);
        }
      } else {
        setModalSuccess("Student created successfully!");
      }

      fetchStudents();
      setTimeout(() => {
        setShowAddModal(false);
        setNewStudentId('');
        setNewName('');
        setNewRollNumber('');
        setNewEmail('');
        setFaceFiles([]);
        setModalSuccess(null);
      }, 1200);
    } catch (err: any) {
      setModalError(extractErrorMessage(err, "Failed to create student."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFaceData = async (studentId: number, name: string) => {
    if (!window.confirm(`Are you sure you want to purge all biometric face embeddings for ${name}?`)) return;
    try {
      await StudentService.deleteFaceData(studentId);
      fetchStudents();
    } catch (err) {
      alert("Failed to delete face data.");
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 text-[var(--text-primary)] transition-colors font-sans">
      {/* ── Title & Actions ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[var(--border-color)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border-color)] text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-semibold uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Roster & Vector Database
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            Student Directory & Biometric Profiles
          </h1>
          <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
            Register student profiles, verify multi-angle SFace reference embeddings, and monitor attendance thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchStudents()}
            className="p-2.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] text-[var(--text-secondary)] rounded-xl border border-[var(--border-color)] transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Student</span>
          </button>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="swiss-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 shadow-xl">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, roll number, or institutional ID..."
            className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="sm:w-64">
          <select
            value={selectedClassId || ''}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="">All Classrooms</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section} ({c.academic_year})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Student Roster Table ── */}
      <div className="swiss-card rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-inset)] text-[var(--text-secondary)] font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Student Profile</th>
                <th className="py-3.5 px-4">Institutional ID</th>
                <th className="py-3.5 px-4">Class & Section</th>
                <th className="py-3.5 px-4 text-center">Biometric Status</th>
                <th className="py-3.5 px-4 text-center">Attendance %</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-mono">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading student directory...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)] font-mono">
                    No students found matching current query.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const hasFace = st.face_registration_complete || (st.embeddings_count && st.embeddings_count > 0);
                  const attRatio = st.attendance_percentage || 100;
                  return (
                    <tr key={st.id} className="hover:bg-[var(--bg-inset)] transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs font-mono">
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors">
                              {st.name}
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] font-mono">Roll: {st.roll_number}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[var(--text-secondary)]">
                        {st.student_id}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium font-mono text-[11px]">
                          {classes.find(c => c.id === st.class_id)
                            ? `${classes.find(c => c.id === st.class_id)?.name} ${classes.find(c => c.id === st.class_id)?.section}`
                            : `Class #${st.class_id}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {hasFace ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Enrolled ({st.embeddings_count || 6} vectors)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] font-mono">
                            <AlertCircle className="w-3 h-3" />
                            <span>Pending Scan</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className={`font-bold ${attRatio >= 85 ? 'text-emerald-600 dark:text-emerald-400' : attRatio >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {attRatio}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/students/${st.id}`)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] text-blue-600 dark:text-emerald-400 border border-[var(--border-color)] text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>

                          {hasFace && (
                            <button
                              onClick={() => handleDeleteFaceData(st.id, st.name)}
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                              title="Purge Biometrics"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* ── Add Student Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="swiss-card rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative text-[var(--text-primary)]">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#201f22] hover:bg-[#2a2a2c] flex items-center justify-center text-[#86948a] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Register Student Profile</h3>
                <p className="text-xs text-[#86948a]">Create roster record & optional face reference scan</p>
              </div>
            </div>

            {modalError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#86948a] mb-1 font-bold">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-[#1c1b1d] border border-[#3c4a42]/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#86948a] mb-1 font-bold">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    placeholder="e.g. STU101"
                    className="w-full bg-[#1c1b1d] border border-[#3c4a42]/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#86948a] mb-1 font-bold">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRollNumber}
                    onChange={(e) => setNewRollNumber(e.target.value)}
                    placeholder="e.g. 21CS042"
                    className="w-full bg-[#1c1b1d] border border-[#3c4a42]/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#86948a] mb-1 font-bold">
                    Class & Section *
                  </label>
                  <select
                    value={newClassId}
                    onChange={(e) => setNewClassId(Number(e.target.value))}
                    className="w-full bg-[#1c1b1d] border border-[#3c4a42]/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#86948a] mb-1 font-bold">
                  Reference Face Photos (Optional)
                </label>
                <div className="border border-dashed border-[#3c4a42]/60 rounded-xl p-4 text-center bg-[#1c1b1d]/50 hover:bg-[#1c1b1d] transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) setFaceFiles(Array.from(e.target.files));
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <div className="text-xs text-slate-300 font-medium">
                    {faceFiles.length > 0
                      ? `${faceFiles.length} photo(s) selected for neural embedding`
                      : 'Drag & drop 1-5 portrait photos or click to browse'}
                  </div>
                  <div className="text-[10px] text-[#86948a] mt-0.5">
                    Clear lighting, front & side profile recommended
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#201f22] text-[#bbcabf] text-xs font-semibold hover:bg-[#2a2a2c] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
