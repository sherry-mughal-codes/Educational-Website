'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';

interface PdfViewerProps {
  title: string;
  hasPdf: boolean;
  streamUrl?: string | null;
  fileSizeBytes?: number;
  pageCount?: number;
  classSlug?: string;
  subjectSlug?: string;
  resourceSlug?: string;
}

export default function PdfViewer({
  title,
  hasPdf,
  streamUrl,
  fileSizeBytes = 0,
  pageCount = 0,
  classSlug,
  subjectSlug,
  resourceSlug,
}: PdfViewerProps) {
  // Start with reader open on screen so student can read immediately without leaving site
  const [isOpen, setIsOpen] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  useEffect(() => {
    if (hasPdf && streamUrl) {
      trackEvent('view_pdf_notes_on_screen', {
        resource_title: title,
        page_count: pageCount,
      });
    }
  }, [hasPdf, streamUrl, title, pageCount]);

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
  const webReaderUrl = (classSlug && subjectSlug && resourceSlug)
    ? `/${classSlug}/${subjectSlug}/${resourceSlug}/reader/`
    : null;

  return (
    <>
      <section className="pdf-reader-section" aria-label="Online PDF Reader">
        <div className="pdf-reader-header">
          <div className="pdf-reader-info">
            <span className="pdf-badge">Official Document</span>
            <h2 className="pdf-reader-title">Online Study Notes Reader</h2>
            <p className="pdf-reader-desc">
              Read verified study material directly on this screen without leaving the website.
              {pageCount > 0 && ` (${pageCount} Pages)`}
              {formattedSize && ` • ${formattedSize}`}
            </p>
          </div>

          <div className="pdf-reader-actions">
            <button
              type="button"
              onClick={() => {
                const nextState = !isOpen;
                setIsOpen(nextState);
                if (nextState) {
                  trackEvent('toggle_reader_open', { resource_title: title });
                }
              }}
              className="btn-primary"
              title={isOpen ? 'Collapse reader' : 'Open online reader'}
            >
              {isOpen ? 'Collapse Reader ✕' : 'Read Notes Online 📖'}
            </button>

            {isOpen && (
              <button
                type="button"
                onClick={() => {
                  setIsTheaterMode(true);
                  trackEvent('expand_theater_reader', { resource_title: title });
                }}
                className="btn-outline-sm"
                title="Expand reader to full screen on website"
              >
                ⛶ Fullscreen Web Reader
              </button>
            )}

            {webReaderUrl && (
              <Link
                href={webReaderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline-sm"
                title="Open dedicated reader page on website"
                onClick={() => {
                  trackEvent('open_dedicated_web_reader', { resource_title: title });
                }}
              >
                Open in Dedicated Tab ↗
              </Link>
            )}
          </div>
        </div>

        {isOpen && (
          <div className="pdf-embed-wrapper" style={{ marginTop: '1rem', border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', height: '680px', background: '#0f172a' }}>
            <iframe
              src={`${fullStreamUrl}#toolbar=1&navpanes=0`}
              title={`Online Reader: ${title}`}
              className="pdf-iframe"
              style={{ width: '100%', height: '100%', border: 'none' }}
              loading="lazy"
            >
              <p className="pdf-fallback-text">
                Your browser does not support embedded PDF viewing.{' '}
                {webReaderUrl && (
                  <Link href={webReaderUrl} className="inline-link">
                    Open in website reader.
                  </Link>
                )}
              </p>
            </iframe>
          </div>
        )}
      </section>

      {/* On-Screen Theater Mode (Keeps student on website while giving 100% full-screen view) */}
      {isTheaterMode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#0f172a',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.625rem 1.25rem',
            background: '#1e293b',
            color: '#ffffff',
            borderBottom: '1px solid #334155',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', background: '#047857', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                FBISE Notes
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc' }}>
                {title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsTheaterMode(false)}
              style={{
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
              title="Close fullscreen reader"
            >
              ✕ Exit Fullscreen
            </button>
          </div>
          <iframe
            src={`${fullStreamUrl}#toolbar=1&navpanes=0`}
            title={`Fullscreen On-Screen Reader: ${title}`}
            style={{ width: '100%', flex: 1, border: 'none' }}
          />
        </div>
      )}
    </>
  );
}
