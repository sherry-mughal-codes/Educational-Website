'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { studentGetMe, studentLogout, StudentUser } from '@/lib/api';

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [student, setStudent] = useState<StudentUser | null>(null);

  useEffect(() => {
    // Check if user is logged in
    studentGetMe()
      .then((res) => {
        if (res.authenticated && res.user) {
          setStudent(res.user);
        } else {
          setStudent(null);
        }
      })
      .catch(() => setStudent(null));
  }, [pathname]);

  const handleLogout = async () => {
    await studentLogout();
    setStudent(null);
    window.location.href = '/';
  };

  const mainLinks = [
    { href: '/', label: 'Home' },
    { href: '/class-9/', label: 'Class 9' },
    { href: '/class-10/', label: 'Class 10' },
    { href: '/search/', label: 'Study Resources' },
    { href: '/about/', label: 'About' },
    { href: '/contact/', label: 'Contact' },
  ];

  return (
    <header className="navbar">
      <div className="container nav-container">
        {/* Brand */}
        <Link href="/" className="nav-brand" title="FBISE Educational Platform Home">
          <span className="brand-badge">FBISE</span>
          <span className="brand-text">Class 9 &amp; 10 Prep</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="nav-links desktop-nav" aria-label="Main Navigation">
          {mainLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
                id={`nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link.label}
              </Link>
            );
          })}

          {student ? (
            <div className="nav-student-group">
              <Link
                href="/student/dashboard/"
                className={`nav-link nav-link-highlight ${pathname.startsWith('/student/dashboard') ? 'active' : ''}`}
                title="View your purchased notes and downloads"
              >
                My Notes 📖
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="nav-btn-logout"
                title="Sign out of student account"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="nav-auth-group">
              <Link
                href="/student/login/"
                className={`nav-link ${pathname === '/student/login/' ? 'active' : ''}`}
                title="Sign in to your student account"
              >
                Sign In
              </Link>
              <Link
                href="/student/register/"
                className="btn-primary btn-sm"
                title="Create a free student account"
              >
                Register
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
          title="Toggle navigation menu"
        >
          <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`} />
          <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`} />
          <span className={`hamburger-bar ${mobileMenuOpen ? 'open' : ''}`} />
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer" id="mobile-nav-menu">
          <nav className="container mobile-nav-links" aria-label="Mobile Navigation">
            {mainLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="mobile-nav-divider" />

            {student ? (
              <>
                <Link
                  href="/student/dashboard/"
                  className="mobile-nav-link mobile-nav-highlight"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Notes &amp; Downloads 📖
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="mobile-nav-link text-left"
                >
                  Sign Out ({student.full_name || student.email})
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/student/login/"
                  className="mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Student Sign In
                </Link>
                <Link
                  href="/student/register/"
                  className="mobile-nav-link mobile-nav-highlight"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Create Student Account
                </Link>
              </>
            )}

            <div className="mobile-nav-divider" />
            <Link
              href="/contact/"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact &amp; Inquiries
            </Link>
            <Link
              href="/privacy-policy/"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Privacy Policy
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
