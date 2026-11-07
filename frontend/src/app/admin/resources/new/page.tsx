'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '@/components/AdminNav';
import {
  adminCreateResource,
  adminGetStructure,
  adminGetMe,
  ChapterItem,
} from '@/lib/api';

export default function NewResourcePage() {
  const router = useRouter();

  // Structure Data
  const [classes, setClasses] = useState<Array<{
    id: number;
    name: string;
    slug: string;
    class_subjects: Array<{
      id: number;
      subject_id: number;
      subject_name: string;
      subject_slug: string;
      chapters: ChapterItem[];
    }>;
  }>>([]);

  // Form Fields
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [resourceType, setResourceType] = useState('complete_notes');
  const [description, setDescription] = useState('');
  const [contentPreview, setContentPreview] = useState('');
  const [pageCount, setPageCount] = useState<number>(0);
  const [authorAttribution, setAuthorAttribution] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [price, setPrice] = useState('100.00');
  const [isFree, setIsFree] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  useEffect(() => {
    adminGetStructure()
      .then((data) => {
        if (data && data.classes) {
          setClasses(data.classes);
          if (data.classes.length > 0) {
            const firstClass = data.classes[0];
            setSelectedClassId(String(firstClass.id));
            if (firstClass.class_subjects.length > 0) {
              setSelectedSubjectId(String(firstClass.class_subjects[0].subject_id));
            }
          }
        }
      })
      .catch(() => {
        setErrorMessage('Failed to load curriculum structure.');
      });
  }, []);

  // Compute current available subjects
  const currentClass = classes.find((c) => String(c.id) === selectedClassId);
  const availableClassSubjects = currentClass ? currentClass.class_subjects : [];

  // When class changes, reset subject to the first available
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newClassId = e.target.value;
    setSelectedClassId(newClassId);
    const targetClass = classes.find((c) => String(c.id) === newClassId);
    if (targetClass && targetClass.class_subjects.length > 0) {
      setSelectedSubjectId(String(targetClass.class_subjects[0].subject_id));
    } else {
      setSelectedSubjectId('');
    }
    setSelectedChapterId('');
  };

  // Compute available chapters for selected class & subject
  const currentClassSubject = availableClassSubjects.find(
    (cs) => String(cs.subject_id) === selectedSubjectId
  );
  const availableChapters = currentClassSubject ? currentClassSubject.chapters : [];

  // Auto-slugify title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setSlug(generatedSlug);
  };

  const handleAutoGenerateSummary = () => {
    const cName = currentClass ? currentClass.name : 'Class';
    const sName = availableClassSubjects.find((s) => String(s.subject_id) === selectedSubjectId)?.subject_name || 'Subject';
    const chName = selectedChapterId
      ? availableClassSubjects.find((s) => String(s.subject_id) === selectedSubjectId)?.chapters.find((ch) => String(ch.id) === selectedChapterId)?.title
      : '';
    const chPart = chName ? ` focused specifically on "${chName}"` : '';
    const typeLabel = resourceType === 'model_paper' ? 'Model Paper & Solved Exercises' : resourceType === 'chapter_notes' ? 'Chapter Guide' : 'Complete Subject Notes';

    const autoSummary = `Comprehensive ${cName} ${sName} study resource (${typeLabel})${chPart} prepared for Federal Board examination preparation.\n\nKey coverage includes:\n• Core conceptual explanations and essential definitions\n• Solved textbook review questions and numerical exercises\n• High-yield board exam preparation topics\n• Formulated strictly in accordance with the official Federal Board (FBISE) syllabus.`;

    setContentPreview(autoSummary);
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Resource title is required.');
      return;
    }
    if (!selectedClassId || !selectedSubjectId) {
      setErrorMessage('Both Class and Subject selections are required.');
      return;
    }

    const formData = new FormData();
    formData.append('class_level_id', selectedClassId);
    formData.append('subject_id', selectedSubjectId);
    if (selectedChapterId) {
      formData.append('chapter_id', selectedChapterId);
    }
    formData.append('title', title.trim());
    formData.append('slug', slug.trim());
    formData.append('resource_type', resourceType);
    formData.append('description', description.trim());
    formData.append('content_preview', contentPreview.trim());
    formData.append('page_count', String(pageCount));
    formData.append('author_attribution', authorAttribution.trim());
    formData.append('is_published', isPublished ? 'true' : 'false');
    formData.append('price', isFree ? '0.00' : price);
    formData.append('is_free', isFree ? 'true' : 'false');

    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Only PDF documents (.pdf) can be uploaded.');
        return;
      }
      formData.append('pdf_file', selectedFile);
    }

    setIsSubmitting(true);
    try {
      const result = await adminCreateResource(formData);
      if (result.success) {
        router.push('/admin/resources/');
      } else {
        setErrorMessage(result.error || 'Failed to create resource.');
      }
    } catch {
      setErrorMessage('Network error while communicating with backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-page-wrapper">
      <AdminNav />

      <main className="container admin-main-content">
        <div className="admin-header-row">
          <div>
            <h1 className="admin-heading">Create Educational Resource</h1>
          </div>
          <Link href="/admin/resources/" className="btn-outline-sm">
            ← Back to Resources
          </Link>
        </div>

        {errorMessage && (
          <div className="alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-form-card">
          <div className="form-grid-2">
            {/* Class Selection */}
            <div className="form-group">
              <label htmlFor="field-class" className="form-label">
                Class Level <span className="req">*</span>
              </label>
              <select
                id="field-class"
                value={selectedClassId}
                onChange={handleClassChange}
                required
                className="form-select"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div className="form-group">
              <label htmlFor="field-subject" className="form-label">
                Subject <span className="req">*</span>
              </label>
              <select
                id="field-subject"
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedChapterId('');
                }}
                required
                className="form-select"
              >
                {availableClassSubjects.length === 0 ? (
                  <option value="">No subjects configured for this class</option>
                ) : (
                  availableClassSubjects.map((cs) => (
                    <option key={cs.subject_id} value={cs.subject_id}>
                      {cs.subject_name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            {/* Optional Chapter */}
            <div className="form-group">
              <label htmlFor="field-chapter" className="form-label">
                Associated Chapter <span className="text-muted">(Optional)</span>
              </label>
              <select
                id="field-chapter"
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="form-select"
              >
                <option value="">Entire Subject Curriculum (No single chapter)</option>
                {availableChapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    Chapter {ch.number}: {ch.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource Type */}
            <div className="form-group">
              <label htmlFor="field-type" className="form-label">
                Resource Type <span className="req">*</span>
              </label>
              <select
                id="field-type"
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="form-select"
              >
                <option value="complete_notes">Complete Subject Notes</option>
                <option value="chapter_guide">Chapter Guide</option>
                <option value="model_paper">Model Paper &amp; Solutions</option>
                <option value="syllabus_breakdown">Syllabus Breakdown</option>
              </select>
            </div>
          </div>

          {/* Title & Slug */}
          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="field-title" className="form-label">
                Resource Title <span className="req">*</span>
              </label>
              <input
                id="field-title"
                type="text"
                required
                value={title}
                onChange={handleTitleChange}
                placeholder="e.g. Class 10 Physics Solved Notes 2026"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="field-slug" className="form-label">
                URL Slug <span className="req">*</span>
              </label>
              <input
                id="field-slug"
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="class-10-physics-solved-notes"
                className="form-input"
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="field-desc" className="form-label">
              Short Introduction / Lead Text <span className="req">*</span>
            </label>
            <textarea
              id="field-desc"
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide an overview of the curriculum content and student learning outcomes..."
              className="form-textarea"
            />
          </div>

          {/* Content Preview / Curriculum Scope & Summary */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label htmlFor="field-preview" className="form-label" style={{ margin: 0 }}>
                Curriculum Scope &amp; Summary
              </label>
              <button
                type="button"
                onClick={handleAutoGenerateSummary}
                className="btn-outline-sm"
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', fontWeight: 600, color: '#047857' }}
                title="Automatically generate curriculum scope and summary based on selected class, subject, and resource details"
              >
                ✨ Auto-Generate Summary
              </button>
            </div>
            <textarea
              id="field-preview"
              rows={4}
              value={contentPreview}
              onChange={(e) => setContentPreview(e.target.value)}
              placeholder="Curriculum scope, key topics covered, solved exercise details, and examination highlights..."
              className="form-textarea"
            />
          </div>

          <div className="form-grid-2">
            {/* Page Count */}
            <div className="form-group">
              <label htmlFor="field-pages" className="form-label">
                Document Page Count
              </label>
              <input
                id="field-pages"
                type="number"
                min="0"
                value={pageCount}
                onChange={(e) => setPageCount(parseInt(e.target.value, 10) || 0)}
                className="form-input"
              />
            </div>

            {/* Author Attribution */}
            <div className="form-group">
              <label htmlFor="field-author" className="form-label">
                Academic Attribution
              </label>
              <input
                id="field-author"
                type="text"
                value={authorAttribution}
                onChange={(e) => setAuthorAttribution(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Pricing Configuration */}
          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="field-price" className="form-label">
                Download Price (PKR) <span className="req">*</span>
              </label>
              <input
                id="field-price"
                type="number"
                step="1"
                min="0"
                disabled={isFree}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="form-input"
                title="Configured price for complete offline PDF download"
              />
              <span className="field-hint" style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                Base price: PKR 100 per PDF. Unlocked only after verified payment.
              </span>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label className="checkbox-label" htmlFor="field-is-free" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  id="field-is-free"
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="form-checkbox"
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Mark as Free (Complimentary download)</span>
              </label>
              <span className="field-hint" style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                If checked, verified students can download without payment.
              </span>
            </div>
          </div>

          {/* PDF File Upload Zone */}
          <div className="form-group upload-dropzone-group">
            <label className="form-label">
              Attach PDF Document <span className="text-muted">(Optional on creation)</span>
            </label>
            <div className="dropzone-box">
              <input
                id="field-pdf"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="dropzone-input"
              />
              <div className="dropzone-label">
                <span className="dropzone-icon">📄</span>
                {selectedFile ? (
                  <div className="dropzone-file-info">
                    <strong>{selectedFile.name}</strong>
                    <span>({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  </div>
                ) : (
                  <div>
                    <span className="dropzone-text">Click to choose PDF or drag and drop</span>
                    <span className="dropzone-sub">Max upload size: 50 MB. Verified with %PDF- magic bytes.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Publication Status Checkbox */}
          <div className="form-checkbox-group">
            <input
              id="field-published"
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="form-checkbox"
            />
            <label htmlFor="field-published" className="checkbox-label">
              Publish immediately to the public website
            </label>
          </div>

          {/* Actions */}
          <div className="form-action-row">
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Resource...' : 'Create &amp; Save Resource →'}
            </button>
            <Link href="/admin/resources/" className="btn-outline-sm">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
