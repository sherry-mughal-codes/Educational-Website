'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname or searchParams change, navigation has finished
  useEffect(() => {
    if (isLoading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercept all clicks on internal links to provide instant 0ms visual feedback
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a') as HTMLAnchorElement | null;

      if (!anchor) return;

      const href = anchor.getAttribute('href');
      const targetAttr = anchor.getAttribute('target');
      const downloadAttr = anchor.getAttribute('download');

      // Only handle internal navigation links
      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('//') &&
        !href.startsWith('/#') &&
        !targetAttr &&
        !downloadAttr &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        // Only trigger if navigating to a different URL
        const currentUrl = window.location.pathname + window.location.search;
        if (href !== currentUrl) {
          setIsLoading(true);
          setProgress(25);

          // Animate progress incrementally
          const t1 = setTimeout(() => setProgress(60), 100);
          const t2 = setTimeout(() => setProgress(85), 300);

          return () => {
            clearTimeout(t1);
            clearTimeout(t2);
          };
        }
      }
    };

    document.addEventListener('click', handleLinkClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleLinkClick, { capture: true });
    };
  }, []);

  if (!isLoading && progress === 0) return null;

  return (
    <>
      {/* Top glowing progress bar */}
      <div
        className="top-page-progress-bar-container"
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3.5px',
          zIndex: 999999,
          pointerEvents: 'none',
          background: 'rgba(16, 185, 129, 0.1)',
        }}
      >
        <div
          className="top-page-progress-bar-fill"
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #10b981, #059669, #34d399)',
            boxShadow: '0 0 10px #10b981, 0 0 5px #059669',
            transition: progress === 100 ? 'width 150ms ease-out, opacity 200ms ease-out' : 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: progress === 100 ? 0 : 1,
          }}
        />
      </div>

      {/* Subtle floating loading pill badge so user clearly sees the page is loading */}
      <div
        className="nav-floating-loader"
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          top: '16px',
          right: '20px',
          zIndex: 999998,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(8px)',
          color: '#ffffff',
          padding: '0.45rem 0.95rem',
          borderRadius: '9999px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.8125rem',
          fontWeight: 600,
          letterSpacing: '0.01em',
          pointerEvents: 'none',
          animation: 'navFadeIn 0.15s ease-out',
        }}
      >
        <span
          className="nav-loader-spinner"
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            borderTopColor: '#34d399',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'navSpin 0.6s linear infinite',
          }}
        />
        <span>Loading page...</span>
      </div>
    </>
  );
}

