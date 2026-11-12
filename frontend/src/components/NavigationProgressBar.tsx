'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Complete and dismiss loader whenever route or search parameters change
  useEffect(() => {
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    setProgress(100);
    const timer = setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
    }, 200);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  // Ensure loader NEVER gets stuck: 1.5s max safety watchdog
  useEffect(() => {
    if (isLoading) {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
      safetyTimeoutRef.current = setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setIsLoading(false);
          setProgress(0);
        }, 150);
      }, 1500);

      return () => {
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current);
          safetyTimeoutRef.current = null;
        }
      };
    }
  }, [isLoading]);

  // Dismiss on browser back/forward, tab switch, or page show
  useEffect(() => {
    const handleDismiss = () => {
      setProgress(100);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 100);
    };

    window.addEventListener('popstate', handleDismiss);
    window.addEventListener('pageshow', handleDismiss);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleDismiss();
      }
    });

    return () => {
      window.removeEventListener('popstate', handleDismiss);
      window.removeEventListener('pageshow', handleDismiss);
    };
  }, []);

  // Intercept navigation link clicks with strict validation
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a') as HTMLAnchorElement | null;

      if (!anchor) return;

      const href = anchor.getAttribute('href');
      const targetAttr = anchor.getAttribute('target');
      const downloadAttr = anchor.getAttribute('download');

      // Only handle valid internal navigation links
      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('//') &&
        !href.startsWith('/api/') &&       // Ignore backend API/download endpoints
        !href.includes('#') &&             // Ignore in-page hash links
        (!targetAttr || targetAttr === '_self') &&
        !downloadAttr &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey &&
        !e.defaultPrevented
      ) {
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        const currentUrl = currentPath + currentSearch;

        // Clean trailing slash for accurate comparison
        const normalizedHref = href.replace(/\/+$/, '') || '/';
        const normalizedCurrent = currentUrl.replace(/\/+$/, '') || '/';

        if (normalizedHref !== normalizedCurrent) {
          setIsLoading(true);
          setProgress(30);

          setTimeout(() => setProgress((p) => (p > 0 && p < 80 ? 70 : p)), 120);
          setTimeout(() => setProgress((p) => (p > 0 && p < 90 ? 88 : p)), 350);
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
            transition: progress === 100 ? 'width 120ms ease-out, opacity 180ms ease-out' : 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: progress === 100 ? 0 : 1,
          }}
        />
      </div>

      {/* Floating loading pill badge - automatically dismissed on load */}
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
          padding: '0.4rem 0.85rem',
          borderRadius: '9999px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          letterSpacing: '0.01em',
          pointerEvents: 'none',
          opacity: progress === 100 ? 0 : 1,
          transition: 'opacity 180ms ease-out',
        }}
      >
        <span
          className="nav-loader-spinner"
          style={{
            width: '13px',
            height: '13px',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            borderTopColor: '#34d399',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'navSpin 0.6s linear infinite',
          }}
        />
        <span>Loading...</span>
      </div>
    </>
  );
}
