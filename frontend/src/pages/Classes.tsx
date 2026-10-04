import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Users, PlusCircle, School, GraduationCap, 
  X, CheckCircle2, Edit3, Trash2, Layers, AlertCircle, Save 
} from 'lucide-react';
import { ClassService, SubjectService } from '../services/api';
import { ClassItem, SubjectItem } from '../types';
import { extractErrorMessage } from '../utils/error';

export const Classes: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Create Class Modal State
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [className, setClassName] = useState<string>('');
  const [section, setSection] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>('2026-27');

  // Edit Class Modal State
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editClassName, setEditClassName] = useState<string>('');
  const [editClassSection, setEditClassSection] = useState<string>('');
  const [editAcademicYear, setEditAcademicYear] = useState<string>('');

  // Create Subject Modal State
  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [subName, setSubName] = useState<string>('');
  const [subCode, setSubCode] = useState<string>('');
  const [subClassId, setSubClassId] = useState<number>(0);

  // Edit Subject Modal State
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [editSubName, setEditSubName] = useState<string>('');
  const [editSubCode, setEditSubCode] = useState<string>('');
  const [editSubClassId, setEditSubClassId] = useState<number>(0);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clsList, subList] = await Promise.all([
        ClassService.getClasses(),
        SubjectService.getSubjects()
      ]);
      setClasses(clsList || []);
      setSubjects(subList || []);
      if (clsList && clsList.length > 0 && subClassId === 0) {
        setSubClassId(clsList[0].id);
      }
    } catch (err) {
      console.error("Failed to load classes/subjects", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Class Actions ──────────────────────────────────────────────────────────
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ClassService.createClass({ name: className, section, academic_year: academicYear });
      setShowClassModal(false);
      setClassName('');
      setSection('');
      showToast('Class created successfully!');
      fetchData();
    } catch (err: any) {
      showToast(extractErrorMessage(err, 'Failed to create class.'), 'error');
    }
  };

  const handleOpenEditClass = (cls: ClassItem) => {
    setEditingClass(cls);
    setEditClassName(cls.name);
    setEditClassSection(cls.section);
    setEditAcademicYear(cls.academic_year);
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    try {
      await ClassService.updateClass(editingClass.id, {
        name: editClassName,
        section: editClassSection,
        academic_year: editAcademicYear
      });
      setEditingClass(null);
      showToast(`Class "${editClassName}" updated successfully!`);
      fetchData();
    } catch (err: any) {
      showToast(extractErrorMessage(err, 'Failed to update class.'), 'error');
    }
  };

  const handleDeleteClass = async (classId: number, classNameStr: string) => {
    if (!window.confirm(`Are you sure you want to delete class "${classNameStr}"? This may affect enrolled students.`)) {
      return;
    }
    try {
      await ClassService.deleteClass(classId);
      showToast(`Class "${classNameStr}" deleted.`);
      fetchData();
    } catch (err: any) {
      showToast(extractErrorMessage(err, 'Failed to delete class.'), 'error');
    }
  };

  // ── Subject Actions ────────────────────────────────────────────────────────
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await SubjectService.createSubject({ name: subName, code: subCode, class_id: subClassId });
      setShowSubjectModal(false);
      setSubName('');
      setSubCode('');
      showToast('Subject added successfully!');
      fetchData();
    } catch (err: any) {
      showToast(extractErrorMessage(err, 'Failed to create subject.'), 'error');
    }
  };

  const handleOpenEditSubject = (sub: SubjectItem) => {
    setEditingSubject(sub);
    setEditSubName(sub.name);
    setEditSubCode(sub.code);
    setEditSubClassId(sub.class_id);
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    try {
      await SubjectService.updateSubject(editingSubject.id, {
        name: editSubName,
        code: editSubCode,
        class_id: editSubClassId
      });
      setEditingSubject(null);
      showToast(`Subject "${editSubName}" updated successfully!`);
      fetchData();
    } catch (err: any) {
      showToast(extractErrorMessage(err, 'Failed to update subject.'), 'error');
    }
  };

  const handleDeleteSubject = async (subjectId: number, subjectNameStr: string) => {
    if (!window.confirm(`Are you sure you want to delete subject "${subjectNameStr}"?`)) {
      return;
    }
    try {
      await SubjectService.deleteSubject(subjectId);
      showToast(`Subject "${subjectNameStr}" deleted.`);
      fetchData();
    } catch (err: any) {
      showToast(extractErrorMessage(err, 'Failed to delete subject.'), 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 text-[var(--text-primary)] font-sans">
      {/* ── Toast Notification Banner ── */}
      {toastMessage && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg transition-all animate-in fade-in ${
          toastMessage.type === 'success'
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400'
        }`}>
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-current opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[var(--border-color)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border-color)] text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-semibold uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Curriculum & Roster Schema
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Academic Classes & Course Directory
          </h1>
          <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
            Manage institutional cohorts, sections, curriculum syllabi, and student class mappings.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSubjectModal(true)}
            className="px-3.5 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] text-[var(--text-primary)] rounded-xl text-xs font-semibold border border-[var(--border-color)] flex items-center gap-2 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Add Subject</span>
          </button>
          <button
            onClick={() => setShowClassModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class Section</span>
          </button>
        </div>
      </div>

      {/* ── Classes Grid ── */}
      {loading ? (
        <div className="text-center py-16 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm text-[var(--text-secondary)] font-mono text-sm">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading cohorts and course catalog...
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm text-[var(--text-secondary)] font-mono text-sm">
          No classes registered yet. Click "Add Class Section" to create your first academic group.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map((cls) => {
            const classSubjects = subjects.filter((s) => s.class_id === cls.id);
            return (
              <div key={cls.id} className="swiss-card rounded-2xl p-6 space-y-4 shadow-md hover:border-emerald-500/40 transition-all">
                <div className="flex items-start justify-between border-b border-[var(--border-color)] pb-3 gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        {cls.name} <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm font-semibold">Section {cls.section}</span>
                      </h2>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                      Session: <span className="font-semibold text-[var(--text-primary)]">{cls.academic_year}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-[var(--bg-inset)] text-emerald-600 dark:text-emerald-400 border border-[var(--border-color)] text-xs font-mono font-semibold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {cls.student_count || 0} Enrolled
                    </div>
                    {/* Class Actions */}
                    <button
                      onClick={() => handleOpenEditClass(cls)}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-blue-600 hover:bg-[var(--bg-inset)] transition-colors"
                      title="Edit Class Section"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls.id, cls.name)}
                      className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-500 hover:bg-[var(--bg-inset)] transition-colors"
                      title="Delete Class Section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Enrolled Subjects List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      Enrolled Courses ({classSubjects.length})
                    </div>
                  </div>

                  {classSubjects.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] font-mono italic">No curriculum subjects mapped yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {classSubjects.map((sub) => (
                        <div
                          key={sub.id}
                          className="group px-3 py-1.5 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] flex items-center gap-2 transition-all hover:border-blue-500/30"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="font-semibold">{sub.name}</span>
                          <span className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-surface)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                            {sub.code}
                          </span>
                          {/* Subject Inline Edit & Delete Controls */}
                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity ml-1 pl-1 border-l border-[var(--border-color)]">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSubject(sub)}
                              className="p-0.5 text-[var(--text-secondary)] hover:text-blue-500 rounded"
                              title="Edit Subject"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubject(sub.id, sub.name)}
                              className="p-0.5 text-[var(--text-secondary)] hover:text-rose-500 rounded"
                              title="Delete Subject"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="swiss-card rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-[var(--text-primary)]">
            <button
              onClick={() => setShowClassModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Create Academic Class</h3>
                <p className="text-xs text-[var(--text-secondary)]">Define new cohort section and academic year</p>
              </div>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. CSE"
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                    Section *
                  </label>
                  <input
                    type="text"
                    required
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g. Section A"
                    className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                    Academic Year *
                  </label>
                  <input
                    type="text"
                    required
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="e.g. 2026-27"
                    className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-inset)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-surface)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all font-sans"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Class Modal ── */}
      {editingClass && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="swiss-card rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-[var(--text-primary)]">
            <button
              onClick={() => setEditingClass(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Edit Class Section</h3>
                <p className="text-xs text-[var(--text-secondary)]">Update class name, section, and academic year</p>
              </div>
            </div>

            <form onSubmit={handleUpdateClass} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                    Section *
                  </label>
                  <input
                    type="text"
                    required
                    value={editClassSection}
                    onChange={(e) => setEditClassSection(e.target.value)}
                    className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                    Academic Year *
                  </label>
                  <input
                    type="text"
                    required
                    value={editAcademicYear}
                    onChange={(e) => setEditAcademicYear(e.target.value)}
                    className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-inset)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-surface)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all font-sans flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Subject Modal ── */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="swiss-card rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-[var(--text-primary)]">
            <button
              onClick={() => setShowSubjectModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Add Curriculum Subject</h3>
                <p className="text-xs text-[var(--text-secondary)]">Map subject code to academic class section</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="e.g. Database Management Systems"
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value)}
                    placeholder="e.g. DBMS101"
                    className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                    Class Section *
                  </label>
                  <select
                    value={subClassId}
                    onChange={(e) => setSubClassId(Number(e.target.value))}
                    className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 font-medium"
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
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-inset)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-surface)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all font-sans"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Subject Modal ── */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="swiss-card rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-[var(--text-primary)]">
            <button
              onClick={() => setEditingSubject(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--bg-inset)] hover:bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Edit Curriculum Subject</h3>
                <p className="text-xs text-[var(--text-secondary)]">Update subject title, code, or class mapping</p>
              </div>
            </div>

            <form onSubmit={handleUpdateSubject} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={editSubName}
                  onChange={(e) => setEditSubName(e.target.value)}
                  className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={editSubCode}
                    onChange={(e) => setEditSubCode(e.target.value)}
                    className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-1 font-bold">
                    Class Section *
                  </label>
                  <select
                    value={editSubClassId}
                    onChange={(e) => setEditSubClassId(Number(e.target.value))}
                    className="w-full bg-[var(--bg-inset)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-medium"
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
                  onClick={() => setEditingSubject(null)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-inset)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-surface)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all font-sans flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
