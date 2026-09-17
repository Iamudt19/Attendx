import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Users, PlusCircle, CheckCircle2 } from 'lucide-react';
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
      setClasses(clsList);
      setSubjects(subList);
      if (clsList.length > 0) setSubClassId(clsList[0].id);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-500" />
            Classes & Subjects Directory
          </h1>
          <p className="text-xs text-slate-400">
            Manage institutional class sections, academic years, and enrolled subjects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSubjectModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-blue-400" />
            Add Subject
          </button>
          <button
            onClick={() => setShowClassModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Class
          </button>
        </div>
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading classes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map((cls) => {
            const classSubjects = subjects.filter((s) => s.class_id === cls.id);
            return (
              <div key={cls.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {cls.name} <span className="text-blue-400">{cls.section}</span>
                    </h2>
                    <p className="text-xs text-slate-400">Academic Year: {cls.academic_year}</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {cls.student_count || 0} Students
                  </div>
                </div>

                {/* Enrolled Subjects List */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Enrolled Subjects ({classSubjects.length})
                  </div>
                  {classSubjects.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No subjects added for this class yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {classSubjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-slate-200">{sub.name}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[11px]">
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

      {/* Add Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Add New Class Section</h3>
            <form onSubmit={handleCreateClass} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Class Name *</label>
                <input
                  type="text"
                  required
                  placeholder="CSE"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Section *</label>
                <input
                  type="text"
                  required
                  placeholder="Section A"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Academic Year *</label>
                <input
                  type="text"
                  required
                  placeholder="2026-27"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg">
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Add New Subject</h3>
            <form onSubmit={handleCreateSubject} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Class *</label>
                <select
                  value={subClassId}
                  onChange={(e) => setSubClassId(Number(e.target.value))}
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
                <label className="block text-slate-300 font-semibold mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Database Management Systems"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subject Code *</label>
                <input
                  type="text"
                  required
                  placeholder="DBMS101"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg">
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
