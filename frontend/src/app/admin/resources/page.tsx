'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/AdminNav';
import {
  adminGetResources,
  adminTogglePublish,
  adminDeleteResource,
  adminUploadPdf,
  adminGetStructure,
  adminGetMe,
  ResourceItem,
} from '@/lib/api';

export default function AdminResourcesPage() {
  const router = useRouter();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Dropdown options
  const [classList, setClassList] = useState<Array<{ slug: string; name: string }>>([]);
  const [subjectList, setSubjectList] = useState<Array<{ slug: string; name: string }>>([]);

  // Delete modal state
  const [resourceToDelete, setResourceToDelete] = useState<ResourceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick PDF upload state
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUploadResource, setTargetUploadResource] = useState<ResourceItem | null>(null);

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

  // Load structure for filter options
  useEffect(() => {
    adminGetStructure()
      .then((data) => {
        if (data) {
          setClassList(data.classes.map((c) => ({ slug: c.slug, name: c.name })));
          setSubjectList(data.subjects.map((s) => ({ slug: s.slug, name: s.name })));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch resources
  const loadResources = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminGetResources({
        q: searchQuery,
        class: selectedClass,
        subject: selectedSubject,
        status: selectedStatus,
      });
      setResources(data);
    } catch {
      setErrorMessage('Failed to load educational resources from database.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedClass, selectedSubject, selectedStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadResources();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadResources]);

  // Publish / Unpublish Toggle
  const handleTogglePublish = async (resource: ResourceItem) => {
    try {
      const res = await adminTogglePublish(resource.id);
      if (res.success) {
        setResources((prev) =>
          prev.map((r) =>
            r.id === resource.id ? { ...r, is_published: res.is_published } : r
          )
        );
        setSuccessMessage(`Resource is now ${res.is_published ? 'Published' : 'Unpublished'}.`);
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage(res.error || 'Failed to update publication status.');
      }
    } catch {
      setErrorMessage('Network error toggling publication status.');
    }
  };

  // Delete Resource confirmation
  const handleConfirmDelete = async () => {
    if (!resourceToDelete) return;
    setIsDeleting(true);
    try {
      const res = await adminDeleteResource(resourceToDelete.id);
      if (res.success) {
        setResources((prev) => prev.filter((r) => r.id !== resourceToDelete.id));
        setSuccessMessage(`Deleted "${resourceToDelete.title}" and cleaned up storage.`);
        setResourceToDelete(null);
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        setErrorMessage(res.error || 'Failed to delete resource.');
      }
    } catch {
      setErrorMessage('Network error deleting resource.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Trigger quick file upload
  const triggerPdfUpload = (resource: ResourceItem) => {
    setTargetUploadResource(resource);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUploadResource) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Invalid file type. Only PDF documents (.pdf) are permitted.');
      return;
    }

    setUploadingId(targetUploadResource.id);
    try {
      const res = await adminUploadPdf(targetUploadResource.id, file);
      if (res.success) {
        setResources((prev) =>
          prev.map((r) =>
            r.id === targetUploadResource.id
              ? { ...r, has_pdf: true, file_size_bytes: res.file_size_bytes }
              : r
          )
        );
        setSuccessMessage(`Successfully uploaded and validated PDF for "${targetUploadResource.title}".`);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || 'Failed to upload PDF. Existing document preserved.');
      }
    } catch {
      setErrorMessage('Network error during PDF upload.');
    } finally {
      setUploadingId(null);
      setTargetUploadResource(null);
    }
  };

  return (
    <div className="admin-page-wrapper">
      <AdminNav />

      {/* Hidden file input for quick PDF upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <main className="container admin-main-content">
        <div className="admin-header-row">
          <div>
            <h1 className="admin-heading">Educational Resources</h1>
          </div>
          <Link href="/admin/resources/new/" className="btn-primary" title="Create a new educational resource">
            + Add New Resource
          </Link>
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

        {/* Filter & Search Bar */}
        <div className="admin-filters-card">
          <div className="admin-filter-field search-field">
            <label htmlFor="resource-search" className="sr-only">
              Search Resources
            </label>
            <input
              id="resource-search"
              type="text"
              placeholder="Search by title, subject, or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="admin-filter-field">
            <label htmlFor="filter-class" className="sr-only">
              Filter by Class
            </label>
            <select
              id="filter-class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="form-select"
            >
              <option value="">All Classes</option>
              {classList.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-filter-field">
            <label htmlFor="filter-subject" className="sr-only">
              Filter by Subject
            </label>
            <select
              id="filter-subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="form-select"
            >
              <option value="">All Subjects</option>
              {subjectList.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-filter-field">
            <label htmlFor="filter-status" className="sr-only">
              Filter by Status
            </label>
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-select"
            >
              <option value="">All Statuses</option>
              <option value="published">Published Only</option>
              <option value="draft">Drafts Only</option>
            </select>
          </div>
        </div>

        {/* Resources Table */}
        <div className="admin-table-container">
          {isLoading ? (
            <div className="admin-table-loading">
              <div className="spinner"></div>
              <p>Loading educational resources...</p>
            </div>
          ) : resources.length === 0 ? (
            <div className="admin-empty-state">
              <p className="empty-title">No educational resources found.</p>
              <p className="empty-desc">
                Try modifying your search or filter criteria, or add your first resource.
              </p>
              <Link href="/admin/resources/new/" className="btn-outline-sm">
                Create Resource
              </Link>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Resource Title</th>
                  <th scope="col">Class &amp; Subject</th>
                  <th scope="col">Status</th>
                  <th scope="col">PDF Document</th>
                  <th scope="col" className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource.id}>
                    <td>
                      <div className="table-title-cell">
                        <span className="resource-title-text">{resource.title}</span>
                        <div className="resource-slug-sub">
                          <code>/{resource.slug}/</code>
                          {resource.is_published && resource.public_url && (
                            <Link
                              href={resource.public_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="table-link-public"
                              title="View published page on public website"
                            >
                              Public View ↗
                            </Link>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="table-taxonomy">
                        <span className="badge-pill badge-neutral">{resource.class_name}</span>
                        <span className="table-subject-name">{resource.subject_name}</span>
                        {resource.chapter_title && (
                          <span className="table-chapter-sub">• {resource.chapter_title}</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(resource)}
                        className={`status-btn ${resource.is_published ? 'btn-status-published' : 'btn-status-draft'}`}
                        title={resource.is_published ? 'Click to Unpublish from public site' : 'Click to Publish to public site'}
                      >
                        {resource.is_published ? '● Published' : '○ Draft'}
                      </button>
                    </td>

                    <td>
                      <div className="table-pdf-cell">
                        {resource.has_pdf ? (
                          <span className="pdf-status-ready" title="Valid PDF attached">
                            📄 Attached
                            {resource.file_size_bytes ? (
                              <span className="pdf-filesize">
                                {' '}({(resource.file_size_bytes / (1024 * 1024)).toFixed(1)} MB)
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="pdf-status-missing" title="No PDF file uploaded yet">
                            ⚠️ No PDF
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => triggerPdfUpload(resource)}
                          className="table-upload-btn"
                          disabled={uploadingId === resource.id}
                          title={resource.has_pdf ? 'Replace existing PDF document' : 'Upload PDF document'}
                        >
                          {uploadingId === resource.id ? 'Uploading...' : resource.has_pdf ? 'Replace PDF' : '+ Upload PDF'}
                        </button>
                      </div>
                    </td>

                    <td className="text-right">
                      <div className="table-actions">
                        <Link
                          href={`/admin/resources/${resource.id}/edit/`}
                          className="btn-icon"
                          title="Edit resource metadata"
                        >
                          ✏️ Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => setResourceToDelete(resource)}
                          className="btn-icon btn-icon-danger"
                          title="Delete resource permanently"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {resourceToDelete && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-box">
            <h3 id="modal-title" className="modal-title">
              Delete Educational Resource?
            </h3>
            <p className="modal-text">
              Are you sure you want to delete <strong>{resourceToDelete.title}</strong>?
            </p>
            <p className="modal-warning">
              This action permanently removes the resource record and cleans up the associated storage file.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setResourceToDelete(null)}
                className="btn-outline-sm"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
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
