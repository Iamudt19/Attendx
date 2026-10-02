import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Upload, ShieldCheck, Trash2, 
  Eye, AlertCircle, CheckCircle2, RefreshCw, X 
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

  const handleDeleteFaceData = async (studentId: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete all biometric face embeddings for ${name}?`)) return;
    try {
      await StudentService.deleteFaceData(studentId);
      alert(`Biometric face data for ${name} deleted.`);
      fetchStudents();
    } catch (err) {
      alert("Failed to delete face data.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl text-slate-900 font-normal tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Student Directory & Biometric Profiles
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Register students, manage reference face photos, and track attendance thresholds.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register Student</span>
        </button>
      </div>

      {/* Class Filter Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Cohort Filter:</label>
          <select
            value={selectedClassId || ''}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="">All Cohorts ({students.length} Total)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-500">
          Enrolled in view: <span className="text-slate-900 font-bold">{students.length}</span>
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading student directory...</div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No students registered in this cohort.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-100 font-medium">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-700 font-mono text-xs">{st.student_id}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">{st.roll_number}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-xs">
                          {st.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{st.name}</div>
                          {st.face_images && st.face_images.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {st.face_images.slice(0, 4).map((img, i) => (
                                <img key={i} src={img} alt="face" className="w-3.5 h-3.5 rounded object-cover border border-slate-200" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{st.email || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          (st.face_count || 0) > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${ (st.face_count || 0) > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {st.face_count || 0} Vectors
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-900">
                        {st.attendance_percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/students/${st.id}`)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Log</span>
                      </button>
                      {(st.face_count || 0) > 0 && (
                        <button
                          onClick={() => handleDeleteFaceData(st.id, st.name)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 inline-flex items-center gap-1 transition-colors"
                          title="Delete face vectors"
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

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-7 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-serif text-2xl text-slate-900 font-normal flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Register Student
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {modalError}
              </div>
            )}

            {modalSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                {modalSuccess}
              </div>
            )}

            <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Student ID *</label>
                  <input
                    type="text"
                    required
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    placeholder="STU099"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={newRollNumber}
                    onChange={(e) => setNewRollNumber(e.target.value)}
                    placeholder="2026CSE99"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Rahul Verma"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Class *</label>
                  <select
                    value={newClassId}
                    onChange={(e) => setNewClassId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="rahul@student.edu"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
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
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50"
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
