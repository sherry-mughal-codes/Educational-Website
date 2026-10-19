'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminLogout } from '@/lib/api';

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch {
      // ignore
    }
    router.push('/admin/login/');
  };

  return (
    <header className="admin-nav-header">
      <div className="container admin-nav-inner">
        <div className="admin-nav-brand">
          <Link href="/admin/resources/" className="admin-nav-logo">
            <span className="admin-brand-icon">🛡️</span>
            <span className="admin-brand-title">FBISE Admin Console</span>
          </Link>
          <span className="admin-badge-role">Staff Access</span>
        </div>

        <nav className="admin-nav-links" aria-label="Admin Navigation">
          <Link
            href="/admin/resources/"
            className={`admin-nav-link ${pathname === '/admin/resources/' ? 'active' : ''}`}
          >
            Resources
          </Link>
          <Link
            href="/admin/structure/"
            className={`admin-nav-link ${pathname === '/admin/structure/' ? 'active' : ''}`}
          >
            Curriculum Structure
          </Link>
          <Link
            href="/admin/resources/new/"
            className={`admin-nav-link ${pathname === '/admin/resources/new/' ? 'active' : ''}`}
          >
            + Add Resource
          </Link>
        </nav>

        <div className="admin-nav-actions">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-link-public"
            title="Open public website in a new tab"
          >
            Public Site ↗
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="admin-btn-logout"
            title="Log out from admin session"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
