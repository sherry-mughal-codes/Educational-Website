'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '@/components/AdminNav';
import {
  adminGetStructure,
  adminCreateChapter,
  adminCreateSubject,
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
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);

  // Check auth
  useEffect(() => {
    adminGetMe()
      .then((data) => {
        if (!data || !data.authenticated || !data.user?.is_staff) {
          router.replace('/admin/login/');
        }
      })
      .catch(() => {
        router.replace('/admin/login/');
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
          </div>
          <div className="admin-actions-group">
            <button
              type="button"
              onClick={() => setShowSubjectModal(true)}
              className="btn-primary"
              title="Create a new academic subject in the catalog"
            >
              + Add New Subject
            </button>
            <Link
              href="/admin/resources/"
              className="btn-outline-sm"
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
                      <div className="subject-card-top">
                        <h2 className="subject-card-title">{cs.subject_name}</h2>
                        <span className="subject-chapter-count">
                          {cs.chapters.length > 0 ? `${cs.chapters.length} Chapters` : 'Curriculum Pack'}
                        </span>
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
                            No discrete chapters configured yet. Study notes apply to the entire subject syllabus.
                          </p>
                        )}
                      </div>

                      <div className="subject-card-footer">
                        <button
                          type="button"
                          onClick={() => openAddChapterModal(cs.id, cls.name, cs.subject_name, cs.chapters.length)}
                          className="btn-outline-sm w-full"
                          title={`Add chapter to ${cls.name} ${cs.subject_name}`}
                        >
                          + Add Chapter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
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
