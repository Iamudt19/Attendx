import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Users, PlusCircle, Sparkles, School, GraduationCap } from 'lucide-react';
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <School className="w-3.5 h-3.5" />
            Curriculum & Roster Schema
          </div>
          <h1 className="font-serif text-3xl font-normal text-slate-900 tracking-tight">
            Academic Classes & Course Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-sans mt-0.5">
            Manage institutional cohorts, sections, curriculum syllabi, and student class mappings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSubjectModal(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200/80 flex items-center gap-2 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" />
            Add Subject
          </button>
          <button
            onClick={() => setShowClassModal(true)}
            className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Class Section
          </button>
        </div>
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl shadow-sm text-slate-500 text-sm">
          Loading cohorts and course catalog...
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200/90 rounded-2xl shadow-sm text-slate-500 text-sm">
          No classes registered yet. Click "Add Class Section" to create your first academic group.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map((cls) => {
            const classSubjects = subjects.filter((s) => s.class_id === cls.id);
            return (
              <div key={cls.id} className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                      <h2 className="font-serif text-xl font-normal text-slate-900">
                        {cls.name} <span className="text-blue-600 font-sans font-semibold text-base">{cls.section}</span>
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Academic Session: <span className="font-semibold text-slate-700">{cls.academic_year}</span></p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                    <Users className="w-3.5 h-3.5" />
                    {cls.student_count || 0} Enrolled
                  </div>
                </div>

                {/* Enrolled Subjects List */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Enrolled Courses ({classSubjects.length})
                  </div>
                  {classSubjects.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 italic text-center">
                      No subjects configured for this section yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {classSubjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-blue-200 flex items-center justify-between text-xs transition-colors"
                        >
                          <span className="font-semibold text-slate-800">{sub.name}</span>
                          <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 font-mono text-[11px] font-semibold shadow-xs">
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="font-serif text-xl font-normal text-slate-900">Add Academic Section</h3>
              <p className="text-xs text-slate-500 mt-0.5">Define department, cohort code, and academic term.</p>
            </div>
            <form onSubmit={handleCreateClass} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Class / Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science & Eng"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Section Identifier *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Section A (Year 3)"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Academic Year *</label>
                <input
                  type="text"
                  required
                  placeholder="2026-27"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl text-xs shadow-sm transition-colors"
                >
                  Create Class Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="font-serif text-xl font-normal text-slate-900">Add Course Subject</h3>
              <p className="text-xs text-slate-500 mt-0.5">Attach a curriculum course to an existing student cohort.</p>
            </div>
            <form onSubmit={handleCreateSubject} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Section *</label>
                <select
                  value={subClassId}
                  onChange={(e) => setSubClassId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors font-medium"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.section}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Operating Systems"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS-401"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors font-mono uppercase"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl text-xs shadow-sm transition-colors"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
