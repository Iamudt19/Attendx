import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Users, PlusCircle, Sparkles, School, GraduationCap, X, CheckCircle2 } from 'lucide-react';
import { ClassService, SubjectService } from '../services/api';
import { ClassItem, SubjectItem } from '../types';

export const Classes: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Class Modal State
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [className, setClassName] = useState<string>('');
  const [section, setSection] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('2026-27');

  // New Subject Modal State
  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [subName, setSubName] = useState<string>('');
  const [subCode, setSubCode] = useState<string>('');
  const [subClassId, setSubClassId] = useState<number>(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clsList, subList] = await Promise.all([
        ClassService.getClasses(),
        SubjectService.getSubjects()
      ]);
      setClasses(clsList || []);
      setSubjects(subList || []);
      if (clsList && clsList.length > 0) setSubClassId(clsList[0].id);
    } catch (err) {
      console.error("Failed to load classes/subjects", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ClassService.createClass({ name: className, section, academic_year: academicYear });
      setShowClassModal(false);
      setClassName('');
      setSection('');
      fetchData();
    } catch (err) {
      alert("Failed to create class.");
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await SubjectService.createSubject({ name: subName, code: subCode, class_id: subClassId });
      setShowSubjectModal(false);
      setSubName('');
      setSubCode('');
      fetchData();
    } catch (err) {
      alert("Failed to create subject.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 text-[#e5e1e4]">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#3c4a42]/30">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c1b1d] border border-[#3c4a42]/40 text-[#4edea3] text-[11px] font-mono font-semibold uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
            Curriculum & Roster Schema
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Academic Classes & Course Directory
          </h1>
          <p className="text-xs text-[#86948a] font-mono mt-0.5">
            Manage institutional cohorts, sections, curriculum syllabi, and student class mappings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSubjectModal(true)}
            className="px-3.5 py-2 bg-[#1c1b1d] hover:bg-[#252427] text-[#bbcabf] rounded-xl text-xs font-semibold border border-[#3c4a42]/40 flex items-center gap-2 transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-blue-400" />
            <span>Add Subject</span>
          </button>
          <button
            onClick={() => setShowClassModal(true)}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class Section</span>
          </button>
        </div>
      </div>

      {/* ── Classes Grid ── */}
      {loading ? (
        <div className="text-center py-16 bg-[#141416] border border-[#3c4a42]/30 rounded-2xl shadow-xl text-[#86948a] font-mono text-sm">
          <div className="w-6 h-6 border-2 border-[#4edea3] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading cohorts and course catalog...
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 bg-[#141416] border border-[#3c4a42]/30 rounded-2xl shadow-xl text-[#86948a] font-mono text-sm">
          No classes registered yet. Click "Add Class Section" to create your first academic group.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map((cls) => {
            const classSubjects = subjects.filter((s) => s.class_id === cls.id);
            return (
              <div key={cls.id} className="bg-[#141416] border border-[#3c4a42]/30 rounded-2xl p-6 space-y-4 shadow-xl hover:border-[#4edea3]/40 transition-all">
                <div className="flex items-center justify-between border-b border-[#3c4a42]/30 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-400" />
                      <h2 className="text-lg font-bold text-white">
                        {cls.name} <span className="text-[#4edea3] font-mono text-sm">Section {cls.section}</span>
                      </h2>
                    </div>
                    <p className="text-[11px] text-[#86948a] font-mono mt-0.5">
                      Session: <span className="font-semibold text-slate-300">{cls.academic_year}</span>
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-[#1c1b1d] text-[#4edea3] border border-[#3c4a42]/40 text-xs font-mono font-semibold flex items-center gap-1.5 shadow-xs">
                    <Users className="w-3.5 h-3.5" />
                    {cls.student_count || 0} Enrolled
                  </div>
                </div>

                {/* Enrolled Subjects List */}
                <div className="space-y-2">
                  <div className="text-[10px] font-mono font-bold text-[#86948a] uppercase tracking-wider">
                    Enrolled Courses ({classSubjects.length})
                  </div>
                  {classSubjects.length === 0 ? (
                    <p className="text-xs text-[#86948a] font-mono italic">No curriculum subjects mapped yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {classSubjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="px-3 py-1.5 rounded-lg bg-[#1c1b1d] border border-[#3c4a42]/40 text-xs text-slate-200 flex items-center gap-2"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-semibold">{sub.name}</span>
                          <span className="text-[10px] font-mono text-[#86948a] bg-[#201f22] px-1.5 py-0.5 rounded border border-[#3c4a42]/30">
                            {sub.code}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Class Modal ── */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#141416] border border-[#3c4a42]/50 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-[#e5e1e4]">
            <button
              onClick={() => setShowClassModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#201f22] hover:bg-[#2a2a2c] flex items-center justify-center text-[#86948a] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Create Academic Class</h3>
                <p className="text-xs text-[#86948a]">Define new cohort section and academic year</p>
              </div>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#86948a] mb-1 font-bold">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full bg-[#1c1b1d] border border-[#3c4a42]/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#86948a] mb-1 font-bold">
                    Section *
                  </label>
                  <input
                    type="text"
                    required
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g. A or 3B"
                    className="w-full bg-[#1c1b1d] border border-[#3c4a42]/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#86948a] mb-1 font-bold">
                    Academic Year *
                  </label>
                  <input
                    type="text"
                    required
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="e.g. 2026-27"
                    className="w-full bg-[#1c1b1d] border border-[#3c4a42]/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#201f22] text-[#bbcabf] text-xs font-semibold hover:bg-[#2a2a2c] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Subject Modal ── */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#141416] border border-[#3c4a42]/50 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-[#e5e1e4]">
            <button
              onClick={() => setShowSubjectModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#201f22] hover:bg-[#2a2a2c] flex items-center justify-center text-[#86948a] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Add Curriculum Subject</h3>
                <p className="text-xs text-[#86948a]">Map subject code to academic class section</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#86948a] mb-1 font-bold">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="e.g. Neural Networks & Deep Learning"
                  className="w-full bg-[#1c1b1d] border border-[#3c4a42]/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#86948a] mb-1 font-bold">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value)}
                    placeholder="e.g. CS402"
                    className="w-full bg-[#1c1b1d] border border-[#3c4a42]/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#86948a] mb-1 font-bold">
                    Class Section *
                  </label>
                  <select
                    value={subClassId}
                    onChange={(e) => setSubClassId(Number(e.target.value))}
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

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#201f22] text-[#bbcabf] text-xs font-semibold hover:bg-[#2a2a2c] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
