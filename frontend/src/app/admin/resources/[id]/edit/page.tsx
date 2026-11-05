'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '@/components/AdminNav';
import {
  adminGetResource,
  adminUpdateResource,
  adminUploadPdf,
  adminTogglePublish,
  adminDeleteResource,
  adminGetMe,
  ResourceItem,
} from '@/lib/api';

export default function EditResourcePage() {
  const router = useRouter();
  const params = useParams();
  const resourceId = params?.id as string;

  const [resource, setResource] = useState<ResourceItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [resourceType, setResourceType] = useState('complete_notes');
  const [description, setDescription] = useState('');
  const [contentPreview, setContentPreview] = useState('');
  const [pageCount, setPageCount] = useState<number>(0);
  const [authorAttribution, setAuthorAttribution] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [price, setPrice] = useState('100.00');
  const [isFree, setIsFree] = useState(false);

  // PDF replacement state
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Load resource
  useEffect(() => {
    if (!resourceId) return;
    setIsLoading(true);
    adminGetResource(resourceId)
      .then((data) => {
        if (!data) {
          setErrorMessage('Resource not found.');
          return;
        }
        setResource(data);
        setTitle(data.title || '');
        setSlug(data.slug || '');
        setResourceType(data.resource_type || 'complete_notes');
        setDescription(data.description || '');
        setContentPreview(data.content_preview || '');
        setPageCount(data.page_count || 0);
        setAuthorAttribution(data.author_attribution || '');
        setMetaTitle(data.meta_title || '');
        setMetaDescription(data.meta_description || '');
        setIsPublished(Boolean(data.is_published));
        setPrice(data.price ? String(data.price) : '100.00');
        setIsFree(Boolean(data.is_free));
      })
      .catch(() => {
        setErrorMessage('Failed to load resource data.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [resourceId]);

  // Save metadata
  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!title.trim()) {
      setErrorMessage('Title is required.');
      return;
    }

    setIsSavingMetadata(true);
    try {
      const result = await adminUpdateResource(resourceId, {
        title: title.trim(),
        slug: slug.trim(),
        resource_type: resourceType,
        description: description.trim(),
        content_preview: contentPreview.trim(),
        page_count: pageCount,
        author_attribution: authorAttribution.trim(),
        meta_title: metaTitle.trim(),
        meta_description: metaDescription.trim(),
        is_published: isPublished,
        price: isFree ? '0.00' : price,
        is_free: isFree,
      });

      if (result.success) {
        setSuccessMessage('Resource metadata saved successfully.');
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage(result.error || 'Failed to save resource metadata.');
      }
    } catch {
      setErrorMessage('Network error while saving resource.');
    } finally {
      setIsSavingMetadata(false);
    }
  };

  // Safe Replace PDF
  const handleReplacePdf = async () => {
    if (!replacementFile) {
      setErrorMessage('Please select a valid PDF file to upload.');
      return;
    }

    if (!replacementFile.name.toLowerCase().endsWith('.pdf') && replacementFile.type !== 'application/pdf') {
      setErrorMessage('Invalid file format. Only PDF files are allowed.');
      return;
    }

    setIsUploadingPdf(true);
    setErrorMessage(null);
    try {
      const res = await adminUploadPdf(resourceId, replacementFile);
      if (res.success) {
        setSuccessMessage('PDF document successfully uploaded and validated. Previous PDF safely archived/replaced.');
        setReplacementFile(null);
        if (resource) {
          setResource({
            ...resource,
            has_pdf: true,
            file_size_bytes: res.file_size_bytes,
          });
        }
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || 'Failed to upload PDF. Existing document was preserved.');
      }
    } catch {
      setErrorMessage('Network error during PDF replacement.');
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // Instant Toggle Publish
  const handleTogglePublish = async () => {
    try {
      const res = await adminTogglePublish(resourceId);
      if (res.success) {
        setIsPublished(Boolean(res.is_published));
        setSuccessMessage(`Resource is now ${res.is_published ? 'Published' : 'Draft'}.`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(res.error || 'Failed to toggle publication status.');
      }
    } catch {
      setErrorMessage('Network error toggling status.');
    }
  };

  // Delete Resource
  const handleDeleteResource = async () => {
    setIsDeleting(true);
    try {
      const res = await adminDeleteResource(resourceId);
      if (res.success) {
        router.push('/admin/resources/');
      } else {
        setErrorMessage(res.error || 'Failed to delete resource.');
      }
    } catch {
      setErrorMessage('Network error deleting resource.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-page-wrapper">
        <AdminNav />
        <div className="container admin-table-loading">
          <div className="spinner"></div>
          <p>Loading resource details...</p>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="admin-page-wrapper">
        <AdminNav />
        <div className="container admin-empty-state">
          <p className="empty-title">Resource Not Found</p>
          <Link href="/admin/resources/" className="btn-outline-sm">
            ← Return to Resources
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-wrapper">
      <AdminNav />

      <main className="container admin-main-content">
        <div className="admin-header-row">
          <div>
            <h1 className="admin-heading">Edit Resource: {resource.title}</h1>
            <div className="admin-subheading-badges">
              <span className="badge-pill badge-neutral">{resource.class_name}</span>
              <span className="badge-pill badge-neutral">{resource.subject_name}</span>
              <span className={`status-pill ${isPublished ? 'pill-success' : 'pill-draft'}`}>
                {isPublished ? '● Published' : '○ Draft'}
              </span>
            </div>
          </div>

          <div className="admin-actions-group">
            <button
              type="button"
              onClick={handleTogglePublish}
              className={`btn-outline-sm ${isPublished ? 'btn-unpublish' : 'btn-publish'}`}
              title={isPublished ? 'Unpublish resource from public site' : 'Publish resource to public site'}
            >
              {isPublished ? 'Unpublish Resource' : 'Publish Resource'}
            </button>
            <Link
              href="/admin/resources/"
              className="btn-outline-sm"
              title="Return to resources list"
            >
              ← Back to List
            </Link>
          </div>
        </div>

        {/* Alerts */}
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

        <div className="admin-edit-layout">
          {/* Main Metadata Form */}
          <form onSubmit={handleSaveMetadata} className="admin-form-card edit-main-form">
            <h2 className="admin-card-title">Resource Metadata</h2>

            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="edit-title" className="form-label">
                  Title <span className="req">*</span>
                </label>
                <input
                  id="edit-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-slug" className="form-label">
                  URL Slug <span className="req">*</span>
                </label>
                <input
                  id="edit-slug"
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="edit-type" className="form-label">
                  Resource Type <span className="req">*</span>
                </label>
                <select
                  id="edit-type"
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

              <div className="form-group">
                <label htmlFor="edit-pages" className="form-label">
                  Page Count
                </label>
                <input
                  id="edit-pages"
                  type="number"
                  min="0"
                  value={pageCount}
                  onChange={(e) => setPageCount(parseInt(e.target.value, 10) || 0)}
                  className="form-input"
                />
              </div>
            </div>

            {/* Pricing Configuration */}
            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="edit-price" className="form-label">
                  Download Price (PKR) <span className="req">*</span>
                </label>
                <input
                  id="edit-price"
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
                <label className="checkbox-label" htmlFor="edit-is-free" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
                  <input
                    id="edit-is-free"
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

            <div className="form-group">
              <label htmlFor="edit-desc" className="form-label">
                Introduction / Description <span className="req">*</span>
              </label>
              <textarea
                id="edit-desc"
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-preview" className="form-label">
                Curriculum Summary &amp; Study Notes Preview
              </label>
              <textarea
                id="edit-preview"
                rows={5}
                value={contentPreview}
                onChange={(e) => setContentPreview(e.target.value)}
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-author" className="form-label">
                Academic Attribution
              </label>
              <input
                id="edit-author"
                type="text"
                value={authorAttribution}
                onChange={(e) => setAuthorAttribution(e.target.value)}
                className="form-input"
              />
            </div>

            {/* SEO Metadata Override */}
            <h3 className="admin-section-subhead">SEO Metadata (Optional Overrides)</h3>
            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="edit-meta-title" className="form-label">
                  Custom Meta Title
                </label>
                <input
                  id="edit-meta-title"
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Defaults to title + subject + class FBISE"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-meta-desc" className="form-label">
                  Custom Meta Description
                </label>
                <input
                  id="edit-meta-desc"
                  type="text"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Defaults to description"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-checkbox-group">
              <input
                id="edit-published"
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="form-checkbox"
              />
              <label htmlFor="edit-published" className="checkbox-label">
                Resource is Published to Public Website
              </label>
            </div>

            <div className="form-action-row">
              <button
                type="submit"
                className="btn-primary"
                disabled={isSavingMetadata}
              >
                {isSavingMetadata ? 'Saving Changes...' : 'Save Metadata Changes'}
              </button>
            </div>
          </form>

          {/* Sidebar: PDF Document & Destructive Actions */}
          <aside className="admin-edit-sidebar">
            {/* PDF File Management Card */}
            <div className="admin-form-card">
              <h2 className="admin-card-title">PDF Document Management</h2>

              <div className="pdf-sidebar-status">
                {resource.has_pdf ? (
                  <div className="pdf-status-box success">
                    <div className="pdf-status-icon">📄</div>
                    <div className="pdf-status-details">
                      <strong>Valid PDF Attached</strong>
                      {resource.file_size_bytes ? (
                        <p className="pdf-sidebar-filesize">
                          Size: {(resource.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="pdf-status-box warning">
                    <div className="pdf-status-icon">⚠️</div>
                    <div className="pdf-status-details">
                      <strong>No PDF Attached</strong>
                      <p className="pdf-sidebar-filesize">Upload a PDF below to enable online reading.</p>
                    </div>
                  </div>
                )}

                {resource.has_pdf && resource.public_url && (
                  <div className="pdf-sidebar-preview-link">
                    <Link
                      href={resource.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline-sm w-full text-center"
                      title="Open online reader on public page"
                    >
                      Preview on Public Page ↗
                    </Link>
                  </div>
                )}
              </div>

              {/* PDF Safe Replacement Box */}
              <div className="pdf-replacement-section">
                <h3 className="replacement-heading">
                  {resource.has_pdf ? 'Replace PDF Document' : 'Upload PDF Document'}
                </h3>
                <p className="replacement-note">
                  Validates file format (%PDF- magic bytes) and size (&lt; 50MB).
                  <strong> If upload fails, existing PDF remains completely untouched.</strong>
                </p>

                <div className="replacement-input-group">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setReplacementFile(e.target.files?.[0] || null)}
                    className="form-input-file"
                  />
                  {replacementFile && (
                    <div className="selected-replacement-file">
                      <span>Selected: <strong>{replacementFile.name}</strong></span>
                      <span>({(replacementFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleReplacePdf}
                    disabled={!replacementFile || isUploadingPdf}
                    className="btn-primary w-full"
                    title="Upload and validate replacement PDF"
                  >
                    {isUploadingPdf ? 'Validating & Uploading...' : resource.has_pdf ? 'Replace PDF' : 'Upload PDF'}
                  </button>
                </div>
              </div>
            </div>

            {/* Destructive Actions Card */}
            <div className="admin-form-card danger-card">
              <h2 className="admin-card-title text-danger">Danger Zone</h2>
              <p className="danger-text">
                Deleting this resource permanently removes it from the catalog and safely deletes the PDF file from storage.
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn-danger w-full"
                title="Permanently delete this educational resource"
              >
                Delete Resource Permanently
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-delete-title">
          <div className="modal-box">
            <h3 id="modal-delete-title" className="modal-title">
              Delete Educational Resource?
            </h3>
            <p className="modal-text">
              Are you sure you want to delete <strong>{resource.title}</strong>?
            </p>
            <p className="modal-warning">
              This action cannot be undone. The database record and associated PDF file will be removed permanently.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn-outline-sm"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteResource}
                className="btn-danger"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
