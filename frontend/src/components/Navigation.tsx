'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainLinks = [
    { href: '/', label: 'Home' },
    { href: '/class-9/', label: 'Class 9' },
    { href: '/class-10/', label: 'Class 10' },
    { href: '/search/', label: 'Search' },
    { href: '/about/', label: 'About' },
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
