'use client';

import { useEffect, useRef, ReactNode } from 'react';

export default function ReaderProtectionWrapper({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

    const iframe = containerRef.current?.querySelector('iframe');
    if (iframe) {
      try {
        const win = iframe.contentWindow;
        if (win && win.location.hostname === window.location.hostname) {
          win.addEventListener('keydown', blockShortcuts, true);
          win.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; }, true);
        }
      } catch {
        // Cross-origin iframe: protected by top window capture
      }
    }

    return () => {
      window.removeEventListener('keydown', blockShortcuts, true);
      window.removeEventListener('contextmenu', blockContextMenu, true);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      className="pdf-reader-protected"
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#0f172a', overflow: 'hidden', userSelect: 'none' }}
    >
      {children}
    </div>
  );
}

