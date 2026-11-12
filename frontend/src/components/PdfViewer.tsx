'use client';

import { useState, useEffect, useRef } from 'react';
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
  userHasPurchased?: boolean;
  downloadUrl?: string | null;
  price?: string | number;
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
  userHasPurchased = false,
  downloadUrl,
  price = '100',
}: PdfViewerProps) {
  // Start with reader open on screen so student can read immediately without leaving site
  const [isOpen, setIsOpen] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  const inlineIframeRef = useRef<HTMLIFrameElement | null>(null);
  const theaterIframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (hasPdf && streamUrl) {
      trackEvent('view_pdf_notes_on_screen', {
        resource_title: title,
        page_count: pageCount,
        is_paid_user: userHasPurchased,
      });
    }
  }, [hasPdf, streamUrl, title, pageCount, userHasPurchased]);

  // Comprehensive keyboard shortcut & print protection for online reader
  useEffect(() => {
    if (!isOpen && !isTheaterMode) return;

    const blockShortcuts = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = (e.key || '').toLowerCase();

      // Block Save (Ctrl+S, Cmd+S), Print (Ctrl+P, Cmd+P), View Source (Ctrl+U),
      // Select All (Ctrl+A), Copy (Ctrl+C), DevTools (F12, Ctrl+Shift+I/J/C)
      if (
        (isCtrlOrMeta && (key === 's' || key === 'p' || key === 'u' || key === 'a' || key === 'c')) ||
        (isCtrlOrMeta && e.shiftKey && (key === 's' || key === 'i' || key === 'j' || key === 'c')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    window.addEventListener('keydown', blockShortcuts, true);
    window.addEventListener('contextmenu', blockContextMenu, true);

    return () => {
      window.removeEventListener('keydown', blockShortcuts, true);
      window.removeEventListener('contextmenu', blockContextMenu, true);
    };
  }, [isOpen, isTheaterMode]);

  const attachProtectionToIframe = (iframeEl: HTMLIFrameElement | null) => {
    if (!iframeEl) return;
    try {
      const win = iframeEl.contentWindow;
      if (win && win.location.hostname === window.location.hostname) {
        const blockShortcuts = (e: KeyboardEvent) => {
          const isCtrlOrMeta = e.ctrlKey || e.metaKey;
          const key = (e.key || '').toLowerCase();
          if (
            (isCtrlOrMeta && (key === 's' || key === 'p' || key === 'u' || key === 'a' || key === 'c')) ||
            (isCtrlOrMeta && e.shiftKey && (key === 's' || key === 'i' || key === 'j' || key === 'c')) ||
            e.key === 'F12'
          ) {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }
        };
        win.addEventListener('keydown', blockShortcuts, true);
        win.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; }, true);
      }
    } catch {
      // Cross-origin iframe: protected by top window captures and print CSS
    }
  };

  const formattedSize = fileSizeBytes > 0
    ? `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : null;

  if (!hasPdf || !streamUrl) {
    return (
      <div className="pdf-standby-banner" style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📖</div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>Online Study Notes</h3>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
          Study materials are being synchronized. Please check back shortly.
        </p>
      </div>
    );
  }

  // Force toolbar=0 & navpanes=0 to strictly suppress browser PDF download/print icons for unpaid reading
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const fullStreamUrl = streamUrl.startsWith('http') ? streamUrl : `${apiUrl}${streamUrl}`;
  const secureStreamUrl = `${fullStreamUrl}#toolbar=0&navpanes=0&scrollbar=1`;
  const fullDownloadUrl = downloadUrl
    ? `${apiUrl}${downloadUrl}`
    : null;

  return (
    <>
      <section className="pdf-reader-section pdf-reader-protected" aria-label="Online PDF Reader" style={{ margin: '1.5rem 0' }}>
        <div className="pdf-reader-header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1rem 1.25rem',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px 12px 0 0',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, background: '#047857', color: '#ffffff', padding: '0.1rem 0.45rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                Online Reader
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                {pageCount > 0 ? `${pageCount} Pages` : ''} {formattedSize ? `• ${formattedSize}` : ''}
              </span>
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              {title}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="btn-outline-sm"
              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
              title={isOpen ? 'Collapse reader' : 'Open online reader'}
            >
              {isOpen ? 'Collapse ✕' : 'Read Online 📖'}
            </button>

            {isOpen && (
              <button
                type="button"
                onClick={() => {
                  setIsTheaterMode(true);
                  trackEvent('expand_theater_reader', { resource_title: title });
                }}
                className="btn-outline-sm"
                style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
                title="Expand reader on website"
              >
                ⛶ Fullscreen
              </button>
            )}

            {/* STRICT PAYMENT GATED DOWNLOAD BUTTON */}
            {userHasPurchased && fullDownloadUrl ? (
              <a
                href={fullDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary-sm"
                style={{
                  fontSize: '0.8125rem',
                  padding: '0.4rem 0.85rem',
                  background: '#047857',
                  color: '#ffffff',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 700,
                  boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)',
                }}
                title="Download verified purchased PDF"
              >
                📥 Download PDF ↓
              </a>
            ) : resourceSlug ? (
              <Link
                href={`/checkout/${resourceSlug}/`}
                className="btn-outline-sm"
                style={{
                  fontSize: '0.8125rem',
                  padding: '0.4rem 0.85rem',
                  color: '#047857',
                  borderColor: '#047857',
                  background: '#f0fdf4',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
                title="Purchase complete subject PDF for offline download"
              >
                🔒 Download Offline PDF (PKR {price})
              </Link>
            ) : null}
          </div>
        </div>

        {isOpen && (
          <div
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            style={{
              border: '1px solid #e2e8f0',
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              overflow: 'hidden',
              height: '680px',
              background: '#0f172a',
              position: 'relative',
              userSelect: 'none',
            }}
          >
            <iframe
              ref={inlineIframeRef}
              src={secureStreamUrl}
              onLoad={() => attachProtectionToIframe(inlineIframeRef.current)}
              title={`Online Reader: ${title}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              loading="lazy"
            />
          </div>
        )}
      </section>

      {/* On-Screen Theater Mode (Keeps student on website while giving 100% full-screen view) */}
      {isTheaterMode && (
        <div
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          className="pdf-reader-protected"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#0f172a',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            userSelect: 'none',
          }}
        >
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* STRICT PAYMENT GATED DOWNLOAD BUTTON IN FULLSCREEN */}
              {userHasPurchased && fullDownloadUrl ? (
                <a
                  href={fullDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#047857',
                    color: '#ffffff',
                    textDecoration: 'none',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                  }}
                  title="Download verified PDF"
                >
                  📥 Download PDF
                </a>
              ) : resourceSlug ? (
                <Link
                  href={`/checkout/${resourceSlug}/`}
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    textDecoration: 'none',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                  }}
                >
                  🔒 Download Offline PDF (PKR {price})
                </Link>
              ) : null}

              <button
                type="button"
                onClick={() => setIsTheaterMode(false)}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
                title="Close fullscreen reader"
              >
                ✕ Close
              </button>
            </div>
          </div>
          <iframe
            ref={theaterIframeRef}
            src={secureStreamUrl}
            onLoad={() => attachProtectionToIframe(theaterIframeRef.current)}
            title={`Fullscreen On-Screen Reader: ${title}`}
            style={{ width: '100%', flex: 1, border: 'none' }}
          />
        </div>
      )}
    </>
  );
}
