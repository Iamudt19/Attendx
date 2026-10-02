import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, UserPlus, Upload, ShieldCheck, Trash2, 
  Eye, AlertCircle, CheckCircle2, RefreshCw, X, Search 
} from 'lucide-react';
import { StudentService, ClassService } from '../services/api';
import { StudentItem, ClassItem } from '../types';
import { extractErrorMessage } from '../utils/error';

export const Students: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFilter = searchParams.get('search') || '';

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);
  const [localSearch, setLocalSearch] = useState<string>(searchFilter);

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

  // BUG-12: In-app confirmation modal for deleting face data instead of window.confirm
  const [confirmDelete, setConfirmDelete] = useState<{ studentId: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    setLocalSearch(searchFilter);
  }, [searchFilter]);

  useEffect(() => {
    const initData = async () => {
      try {
        const clsList = await ClassService.getClasses();
        setClasses(clsList);
        if (clsList.length > 0) {
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
      setStudents(data);
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

  const handleExecuteDeleteFaceData = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await StudentService.deleteFaceData(confirmDelete.studentId);
      showNotification(`Biometric face embeddings for ${confirmDelete.name} successfully deleted.`);
      setConfirmDelete(null);
      fetchStudents();
    } catch (err) {
      showNotification("Failed to delete biometric face data.", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Filter students based on local/URL search query
  const filteredStudents = students.filter(st => {
    if (!localSearch.trim()) return true;
    const q = localSearch.toLowerCase();
    return (
      st.name.toLowerCase().includes(q) ||
      st.student_id.toLowerCase().includes(q) ||
      st.roll_number.toLowerCase().includes(q) ||
      (st.email && st.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 text-slate-100 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl border text-xs font-semibold shadow-2xl flex items-center gap-2 animate-fade-in ${
          notification.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-emerald-400" />
            Student Directory & Biometric Profiles
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Register students, manage reference face embeddings, and track enrollment status.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
          type="button"
          aria-label="Register Student"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register Student</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, roll, or ID..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (e.target.value) {
                  setSearchParams({ search: e.target.value });
                } else {
                  setSearchParams({});
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 font-medium focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Cohort:</span>
            <select
              value={selectedClassId || ''}
              onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-medium focus:outline-none focus:border-emerald-500 transition-all"
            >
              <option value="">All Cohorts ({students.length} Total)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  {c.name} {c.section}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing: <span className="text-emerald-400 font-bold">{filteredStudents.length}</span> of {students.length}
        </div>
      </div>

      {/* Student List Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-xs font-mono flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Loading student roster & face embeddings...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs font-mono">
            No students found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px] font-mono">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Student ID</th>
                  <th className="py-3.5 px-4 font-bold">Roll No</th>
                  <th className="py-3.5 px-4 font-bold">Student Name</th>
                  <th className="py-3.5 px-4 font-bold">Email</th>
                  <th className="py-3.5 px-4 font-bold text-center">Face Embeddings</th>
                  <th className="py-3.5 px-4 font-bold text-center">Attendance Rate</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-emerald-400 font-mono text-xs">{st.student_id}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">{st.roll_number}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {st.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{st.name}</div>
                          {st.face_images && st.face_images.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {st.face_images.slice(0, 4).map((img, i) => (
                                <img key={i} src={img} alt="face preview" className="w-4 h-4 rounded-md object-cover border border-slate-700" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs font-mono">{st.email || '—'}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                          (st.face_count || 0) > 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${ (st.face_count || 0) > 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        {st.face_count || 0} Vectors
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className={`font-bold ${
                        st.attendance_percentage != null
                          ? st.attendance_percentage >= 75
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                          : 'text-slate-400'
                      }`}>
                        {st.attendance_percentage != null ? `${st.attendance_percentage}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/students/${st.id}`)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-slate-700"
                        title="View profile & attendance log"
                        aria-label={`View log for ${st.name}`}
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Log</span>
                      </button>
                      {(st.face_count || 0) > 0 && (
                        <button
                          onClick={() => setConfirmDelete({ studentId: st.id, name: st.name })}
                          className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold border border-rose-500/30 inline-flex items-center gap-1.5 transition-colors"
                          title="Delete face embeddings"
                          aria-label={`Wipe biometric data for ${st.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Wipe</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BUG-12: Styled In-App Confirmation Modal for deleting face data */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Biometric Face Data</h3>
                <p className="text-xs text-slate-400 font-mono">Irreversible Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to wipe all registered biometric face embeddings for{' '}
              <span className="text-white font-bold">{confirmDelete.name}</span>? They will no longer be recognized in classroom attendance captures until re-enrolled.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteFaceData}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Wiping...</span>
                  </>
                ) : (
                  <span>Yes, Delete Face Vectors</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-7 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Register New Student
              </h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{modalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1">Student ID *</label>
                  <input
                    type="text"
                    required
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    placeholder="STU099"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={newRollNumber}
                    onChange={(e) => setNewRollNumber(e.target.value)}
                    placeholder="2026CSE99"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Rahul Verma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1">Class *</label>
                  <select
                    value={newClassId}
                    onChange={(e) => setNewClassId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900">
                        {c.name} {c.section}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="rahul@student.edu"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-2">
                <label className="block text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
                  Upload Reference Photos (Optional)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      setFaceFiles(Array.from(e.target.files));
                    }
                  }}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Save & Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
