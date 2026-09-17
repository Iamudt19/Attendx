import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Upload, ShieldCheck, Trash2, 
  Eye, AlertCircle, CheckCircle2, RefreshCw, X 
} from 'lucide-react';
import { StudentService, ClassService } from '../services/api';
import { StudentItem, ClassItem } from '../types';

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
      }, 1500);
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to create student.");
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
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Students Directory & Face Registration
          </h1>
          <p className="text-xs text-slate-400">
            Register students, manage reference face photos for AI recognition, and enforce biometric privacy.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Register New Student
        </button>
      </div>

      {/* Class Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Class Filter:</label>
          <select
            value={selectedClassId || ''}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-400">Total Enrolled: {students.length}</div>
      </div>

      {/* Student List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading student directory...</div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">No students registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">Face Embeddings</th>
                  <th className="py-3 px-4 text-center">Attendance %</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono">{st.student_id}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{st.roll_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{st.name}</td>
                    <td className="py-3 px-4 text-slate-400">{st.email || 'N/A'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          (st.face_count || 0) > 0
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {st.face_count || 0} Registered
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-extrabold text-emerald-400">
                        {st.attendance_percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/students/${st.id}`)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold border border-slate-700 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" /> View Log
                      </button>
                      {(st.face_count || 0) > 0 && (
                        <button
                          onClick={() => handleDeleteFaceData(st.id, st.name)}
                          className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[11px] font-semibold border border-rose-500/20 inline-flex items-center gap-1"
                          title="Privacy compliance: Delete biometric face data"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Wipe Face Data
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                Register Student & Face Images
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {modalError}
              </div>
            )}

            {modalSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                {modalSuccess}
              </div>
            )}

            <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Student ID *</label>
                  <input
                    type="text"
                    required
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    placeholder="STU099"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={newRollNumber}
                    onChange={(e) => setNewRollNumber(e.target.value)}
                    placeholder="2026CSE99"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Rahul Verma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Class *</label>
                  <select
                    value={newClassId}
                    onChange={(e) => setNewClassId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="rahul@student.edu"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Upload 3-5 reference photos */}
              <div className="border-t border-slate-800 pt-3 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Upload Reference Face Photos (3–5 Photos recommended)
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
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-blue-400 hover:file:bg-slate-700"
                />
                <p className="text-[10px] text-slate-500">
                  Requirements: Single front-facing clear photograph per file. System validates usable faces automatically.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50"
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
