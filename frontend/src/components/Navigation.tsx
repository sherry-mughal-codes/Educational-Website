'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Overview' },
    { href: '/about', label: 'About Board' },
    { href: '/resources', label: 'Study Resources' },
  ];

  return (
    <header className="navbar">
      <div className="container nav-container">
        <Link href="/" className="nav-brand">
          <span className="brand-badge">FBISE</span>
          <span className="brand-text">Class 9 & 10 Prep</span>
        </Link>
        <nav className="nav-links">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
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
      </div>
    </header>
  );
}
