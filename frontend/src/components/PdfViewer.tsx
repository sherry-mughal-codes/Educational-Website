'use client';

import { useState } from 'react';

interface PdfViewerProps {
  title: string;
  hasPdf: boolean;
  streamUrl?: string | null;
  fileSizeBytes?: number;
  pageCount?: number;
}

export default function PdfViewer({
  title,
  hasPdf,
  streamUrl,
  fileSizeBytes = 0,
  pageCount = 0,
}: PdfViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formattedSize = fileSizeBytes > 0
    ? `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : null;

  if (!hasPdf || !streamUrl) {
    return (
      <div className="pdf-standby-banner">
        <div className="standby-icon" aria-hidden="true">📖</div>
        <div className="standby-text">
          <h3 className="standby-title">Online Study Notes Format</h3>
          <p className="standby-desc">
            Complete revision notes and chapter summaries are available directly in the syllabus overview below.
            Verified high-resolution PDF digitization is synchronized by our academic panel.
          </p>
        </div>
      </div>
    );
  }

  const fullStreamUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${streamUrl}`;

  return (
    <section className="pdf-reader-section" aria-label="Online PDF Reader">
      <div className="pdf-reader-header">
        <div className="pdf-reader-info">
          <span className="pdf-badge">Official Document</span>
          <h2 className="pdf-reader-title">Online PDF Reader &amp; Preview</h2>
          <p className="pdf-reader-desc">
            Read complete verified study material online without downloading.
            {pageCount > 0 && ` (${pageCount} Pages)`}
            {formattedSize && ` • ${formattedSize}`}
          </p>
        </div>

        <div className="pdf-reader-actions">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="btn-primary"
            title={isOpen ? 'Collapse online reader' : 'Open online reader'}
          >
            {isOpen ? 'Close Reader ✕' : 'Read Notes Online 📖'}
          </button>
          <a
            href={fullStreamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline-sm"
            title="Open PDF directly in a new browser tab"
          >
            Open in New Tab ↗
          </a>
        </div>
      </div>

      {isOpen && (
        <div className="pdf-embed-wrapper">
          <iframe
            src={`${fullStreamUrl}#toolbar=1&navpanes=0`}
            title={`Online Reader: ${title}`}
            className="pdf-iframe"
            loading="lazy"
          >
            <p className="pdf-fallback-text">
              Your browser does not support embedded PDF viewing.{' '}
              <a href={fullStreamUrl} target="_blank" rel="noopener noreferrer" className="inline-link">
                Click here to view the PDF directly.
              </a>
            </p>
          </iframe>
        </div>
      )}
    </section>
  );
}
