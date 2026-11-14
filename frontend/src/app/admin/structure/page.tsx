'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '@/components/AdminNav';
import {
  adminGetStructure,
  adminCreateChapter,
  adminCreateSubject,
  adminUpdateClassSubject,
  adminBulkUpdateStructure,
  adminGetMe,
  ChapterItem,
} from '@/lib/api';

export default function AdminStructurePage() {
  const router = useRouter();

  const [classes, setClasses] = useState<Array<{
    id: number;
    name: string;
    grade_number: number;
    slug: string;
    class_subjects: Array<{
      id: number;
      subject_id: number;
      subject_name: string;
      subject_slug: string;
      total_chapters: number;
      syllabus_overview?: string;
      chapters: ChapterItem[];
      resources_count?: number;
    }>;
  }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: number; name: string; slug: string; code: string; icon_name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State for Adding a Chapter
  const [selectedClassSubject, setSelectedClassSubject] = useState<{ id: number; className: string; subjectName: string } | null>(null);
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterSlug, setChapterSlug] = useState('');
  const [chapterOverview, setChapterOverview] = useState('');
  const [isSubmittingChapter, setIsSubmittingChapter] = useState(false);

  // Modal State for Creating a New Subject
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectSlug, setSubjectSlug] = useState('');
  const [subjectIcon, setSubjectIcon] = useState('book');
  const [subjectDesc, setSubjectDesc] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);

  // Manual Editing of Total Chapters/Units Count
  const [editingChaptersCount, setEditingChaptersCount] = useState<{ [classSubId: number]: number }>({});
  const [savingChaptersCount, setSavingChaptersCount] = useState<number | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const handleUpdateChaptersCount = async (classSubId: number) => {
    const newCount = editingChaptersCount[classSubId];
    if (newCount === undefined || newCount < 0) return;
    setSavingChaptersCount(classSubId);
    setErrorMessage(null);
    try {
      const res = await adminUpdateClassSubject(classSubId, { total_chapters: newCount });
      if (res.success) {
        setSuccessMessage('Updated total chapters/units successfully.');
        setClasses((prev) =>
          prev.map((c) => ({
            ...c,
            class_subjects: c.class_subjects.map((cs) =>
              cs.id === classSubId ? { ...cs, total_chapters: newCount } : cs
            ),
          }))
        );
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(res.error || 'Failed to update total chapters.');
      }
    } catch {
      setErrorMessage('Network error updating total chapters.');
    } finally {
      setSavingChaptersCount(null);
    }
  };

  const handleSaveAllStructure = async () => {
    setIsSavingAll(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Build update list
    const updates: Array<{ id: number; total_chapters: number }> = [];
    classes.forEach((c) => {
      c.class_subjects.forEach((cs) => {
        const count = editingChaptersCount[cs.id] !== undefined ? editingChaptersCount[cs.id] : cs.total_chapters;
        updates.push({ id: cs.id, total_chapters: count });
      });
    });

    try {
      const res = await adminBulkUpdateStructure(updates);
      if (res.success) {
        setSuccessMessage('✓ Curriculum structure saved successfully! Updated chapter and unit counts are now live across the public site.');
        await loadStructure();
        setEditingChaptersCount({});
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || 'Failed to save curriculum structure.');
      }
    } catch {
      setErrorMessage('Network error saving curriculum structure.');
    } finally {
      setIsSavingAll(false);
    }
  };

  // Check auth
  useEffect(() => {
    adminGetMe()
      .then((data) => {
        if (!data || !data.authenticated || !data.user?.is_staff) {
          router.replace('/login/?returnUrl=/admin/structure/&error=admin_required');
        }
      })
      .catch(() => {
        router.replace('/login/?returnUrl=/admin/structure/&error=admin_required');
      });
  }, [router]);

  // Load structure
  const loadStructure = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminGetStructure();
      if (data) {
        setClasses(data.classes || []);
        setSubjects(data.subjects || []);
      }
    } catch {
      setErrorMessage('Failed to load curriculum structure.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStructure();
  }, [loadStructure]);

  // Open add chapter modal
  const openAddChapterModal = (classSubId: number, className: string, subjectName: string, existingChaptersCount: number) => {
    setSelectedClassSubject({ id: classSubId, className, subjectName });
    setChapterNumber(existingChaptersCount + 1);
    setChapterTitle('');
    setChapterSlug('');
    setChapterOverview('');
  };

  const handleTitleChange = (val: string) => {
    setChapterTitle(val);
    const slugified = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setChapterSlug(`ch-${chapterNumber}-${slugified}`);
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassSubject) return;
    if (!chapterTitle.trim()) {
      setErrorMessage('Chapter title is required.');
      return;
    }

    setIsSubmittingChapter(true);
    try {
      const result = await adminCreateChapter({
        class_subject_id: selectedClassSubject.id,
        chapter_number: chapterNumber,
        title: chapterTitle.trim(),
        slug: chapterSlug.trim(),
        overview: chapterOverview.trim(),
      });

      if (result.success) {
        setSuccessMessage(`Chapter ${chapterNumber}: "${chapterTitle}" added to ${selectedClassSubject.className} ${selectedClassSubject.subjectName}.`);
        setSelectedClassSubject(null);
        loadStructure();
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage(result.error || 'Failed to add chapter.');
      }
    } catch {
      setErrorMessage('Network error while adding chapter.');
    } finally {
      setIsSubmittingChapter(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      setErrorMessage('Subject name is required.');
      return;
    }

    setIsSubmittingSubject(true);
    try {
      const result = await adminCreateSubject({
        name: subjectName.trim(),
        slug: subjectSlug.trim() || undefined,
        code: subjectCode.trim(),
        icon_name: subjectIcon.trim(),
        description: subjectDesc.trim(),
        class_ids: selectedClassIds,
      });

      if (result.success) {
        setSuccessMessage(`Subject "${subjectName}" created successfully.`);
        setShowSubjectModal(false);
        setSubjectName('');
        setSubjectSlug('');
        setSubjectCode('');
        setSubjectDesc('');
        loadStructure();
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage(result.error || 'Failed to create subject.');
      }
    } catch {
      setErrorMessage('Network error while creating subject.');
    } finally {
      setIsSubmittingSubject(false);
    }
  };

  return (
    <div className="admin-page-wrapper">
      <AdminNav />

      <main className="container admin-main-content">
        <div className="admin-header-row">
          <div>
            <h1 className="admin-heading">Curriculum Structure Management</h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Configure subjects, discrete chapters, and textbook unit counts. Click &quot;Save Curriculum Structure&quot; to push all changes live to the public site.
            </p>
          </div>
          <div className="admin-actions-group" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleSaveAllStructure}
              disabled={isSavingAll}
              className="btn-primary"
              style={{
                background: '#047857',
                color: '#ffffff',
                fontWeight: 700,
                padding: '0.625rem 1.25rem',
                fontSize: '0.9375rem',
                boxShadow: '0 2px 4px rgba(4,120,87,0.2)',
              }}
              title="Save all chapter and unit counts live to the public site"
            >
              {isSavingAll ? 'Saving Structure...' : '💾 Save Curriculum Structure'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedClassIds(classes.map((c) => c.id));
                setShowSubjectModal(true);
              }}
              className="btn-outline-sm"
              style={{ padding: '0.625rem 1rem', fontSize: '0.875rem' }}
              title="Create a new academic subject in the catalog"
            >
              + Add New Subject
            </button>
            <Link
              href="/admin/resources/"
              className="btn-outline-sm"
              style={{ padding: '0.625rem 1rem', fontSize: '0.875rem' }}
              title="Return to resources"
            >
              ← Manage Resources
            </Link>
          </div>
        </div>

        {/* Status Alerts */}
        {successMessage && (
          <div className="alert-success" role="alert">
            <span className="alert-icon">✓</span>
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="admin-table-loading">
            <div className="spinner"></div>
            <p>Loading curriculum taxonomy...</p>
          </div>
        ) : (
          <div className="admin-structure-classes">
            {classes.map((cls) => (
              <section key={cls.id} className="admin-structure-class-card">
                <div className="structure-class-header">
                  <div className="class-badge-title">
                    <span className="badge-pill">{cls.name}</span>
                    <span className="structure-grade-info">Grade {cls.grade_number} FBISE</span>
                  </div>
                  <Link
                    href={`/${cls.slug}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="structure-public-link"
                    title="View public class page in new tab"
                  >
                    View Public Class Page ↗
                  </Link>
                </div>

                <div className="structure-subjects-grid">
                  {cls.class_subjects.map((cs) => (
                    <div key={cs.id} className="structure-subject-card">
                      <div className="subject-card-top" style={{ alignItems: 'flex-start' }}>
                        <div>
                          <h2 className="subject-card-title">{cs.subject_name}</h2>
                          <div style={{ marginTop: '0.35rem' }}>
                            {(cs.resources_count || 0) > 0 ? (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#047857',
                                background: '#d1fae5',
                                padding: '0.15rem 0.55rem',
                                borderRadius: '9999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}>
                                🟢 {(cs.resources_count || 0)} Live on Student Screen
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#64748b',
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                padding: '0.15rem 0.55rem',
                                borderRadius: '9999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}>
                                ⚪ No Notes Yet (Hidden from Students)
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="subject-chapter-count">
                          {cs.chapters.length > 0 ? `${cs.chapters.length} Created` : '0 Created'}
                        </span>
                      </div>

                      {/* Manual Editable Chapters/Units Count */}
                      <div style={{
                        margin: '0.65rem 0',
                        padding: '0.45rem 0.65rem',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}>
                        <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                          Syllabus Units / Chapters:
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editingChaptersCount[cs.id] !== undefined ? editingChaptersCount[cs.id] : cs.total_chapters}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setEditingChaptersCount((prev) => ({
                                ...prev,
                                [cs.id]: isNaN(val) ? 0 : Math.max(0, val),
                              }));
                            }}
                            style={{
                              width: '58px',
                              padding: '0.2rem 0.35rem',
                              fontSize: '0.8125rem',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              textAlign: 'center',
                              fontWeight: 700,
                            }}
                            title="Enter realistic number of units/chapters in textbook"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateChaptersCount(cs.id)}
                            disabled={savingChaptersCount === cs.id}
                            className="btn-outline-sm"
                            style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', fontWeight: 700 }}
                            title="Save new number of chapters for this subject"
                          >
                            {savingChaptersCount === cs.id ? '...' : 'Save'}
                          </button>
                        </div>
                      </div>

                      {/* Chapters list */}
                      <div className="subject-chapters-list">
                        {cs.chapters.length > 0 ? (
                          cs.chapters.map((ch) => (
                            <div key={ch.id} className="chapter-item-pill">
                              <span className="chapter-num">Ch {ch.number}</span>
                              <span className="chapter-title-text">{ch.title}</span>
                            </div>
                          ))
                        ) : (
                          <p className="no-chapters-hint">
                            No discrete chapters configured yet. Click below to add Chapter 1.
                          </p>
                        )}
                      </div>

                      <div className="subject-card-footer" style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => openAddChapterModal(cs.id, cls.name, cs.subject_name, cs.chapters.length)}
                          className="btn-outline-sm"
                          style={{ flex: 1, padding: '0.45rem 0.6rem' }}
                          title={`Add chapter to ${cls.name} ${cs.subject_name}`}
                        >
                          + Add Chapter
                        </button>
                        <Link
                          href="/admin/resources/new/"
                          className="btn-primary-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                            padding: '0.45rem 0.75rem',
                            fontSize: '0.8125rem',
                          }}
                          title={`Upload notes for ${cls.name} ${cs.subject_name}`}
                        >
                          + Upload Notes
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Bottom Sticky/Full-width Save Bar */}
            <div style={{
              marginTop: '2rem',
              padding: '1.25rem 1.5rem',
              background: '#ffffff',
              border: '2px dashed #10b981',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#065f46' }}>
                  Save All Curriculum Changes
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#475569' }}>
                  Updates all Class 9 and Class 10 unit/chapter counts permanently. Live immediately across student subject cards.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveAllStructure}
                disabled={isSavingAll}
                className="btn-primary btn-large"
                style={{
                  minWidth: '260px',
                  background: '#047857',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  padding: '0.75rem 1.75rem',
                  borderRadius: '8px',
                  boxShadow: '0 4px 10px rgba(4,120,87,0.25)',
                }}
              >
                {isSavingAll ? 'Saving Structure...' : '💾 Save Curriculum Structure'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Add Chapter Modal */}
      {selectedClassSubject && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-chapter-title">
          <div className="modal-box">
            <h3 id="modal-chapter-title" className="modal-title">
              Add Chapter to {selectedClassSubject.className} - {selectedClassSubject.subjectName}
            </h3>
            <form onSubmit={handleCreateChapter}>
              <div className="form-group">
                <label htmlFor="modal-ch-num" className="form-label">
                  Chapter Number <span className="req">*</span>
                </label>
                <input
                  id="modal-ch-num"
                  type="number"
                  min="1"
                  required
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(parseInt(e.target.value, 10) || 1)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-ch-title" className="form-label">
                  Chapter Title <span className="req">*</span>
                </label>
                <input
                  id="modal-ch-title"
                  type="text"
                  required
                  value={chapterTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Geometrical Optics"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-ch-slug" className="form-label">
                  Chapter Slug
                </label>
                <input
                  id="modal-ch-slug"
                  type="text"
                  value={chapterSlug}
                  onChange={(e) => setChapterSlug(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-ch-desc" className="form-label">
                  Chapter Overview / Scope <span className="text-muted">(Optional)</span>
                </label>
                <textarea
                  id="modal-ch-desc"
                  rows={2}
                  value={chapterOverview}
                  onChange={(e) => setChapterOverview(e.target.value)}
                  placeholder="Key concepts, formulas, and syllabus topics covered..."
                  className="form-textarea"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setSelectedClassSubject(null)}
                  className="btn-outline-sm"
                  disabled={isSubmittingChapter}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmittingChapter}
                >
                  {isSubmittingChapter ? 'Adding Chapter...' : 'Save Chapter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Subject Modal */}
      {showSubjectModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-subject-title">
          <div className="modal-box">
            <h3 id="modal-subject-title" className="modal-title">
              Create New Academic Subject
            </h3>
            <form onSubmit={handleCreateSubject}>
              <div className="form-group">
                <label htmlFor="modal-sub-name" className="form-label">
                  Subject Name <span className="req">*</span>
                </label>
                <input
                  id="modal-sub-name"
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => {
                    setSubjectName(e.target.value);
                    setSubjectSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)+/g, '')
                    );
                  }}
                  placeholder="e.g. Computer Science"
                  className="form-input"
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="modal-sub-code" className="form-label">
                    Subject Code
                  </label>
                  <input
                    id="modal-sub-code"
                    type="text"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    placeholder="e.g. CS"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-sub-icon" className="form-label">
                    Icon Identifier
                  </label>
                  <input
                    id="modal-sub-icon"
                    type="text"
                    value={subjectIcon}
                    onChange={(e) => setSubjectIcon(e.target.value)}
                    placeholder="e.g. laptop, flask, book"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-sub-desc" className="form-label">
                  Description
                </label>
                <textarea
                  id="modal-sub-desc"
                  rows={2}
                  value={subjectDesc}
                  onChange={(e) => setSubjectDesc(e.target.value)}
                  placeholder="Curriculum focus and board guidelines..."
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Assign to Class Levels:
                </label>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {classes.map((c) => (
                    <label key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedClassIds.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClassIds([...selectedClassIds, c.id]);
                          } else {
                            setSelectedClassIds(selectedClassIds.filter((id) => id !== c.id));
                          }
                        }}
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="btn-outline-sm"
                  disabled={isSubmittingSubject}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmittingSubject}
                >
                  {isSubmittingSubject ? 'Creating Subject...' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
