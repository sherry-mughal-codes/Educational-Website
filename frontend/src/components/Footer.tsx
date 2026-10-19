import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-grid">
          {/* Brand & Mission */}
          <div className="footer-col brand-col">
            <div className="footer-brand">
              <span className="brand-badge">FBISE</span>
              <span className="brand-text">Study Notes Portal</span>
            </div>
            <p className="footer-desc">
              Dedicated academic preparation platform for Federal Board of Intermediate and
              Secondary Education (FBISE) Class 9 and Class 10 students. Aligned with current
              Student Learning Outcomes (SLO) curriculum.
            </p>
          </div>

          {/* Academic Portals */}
          <div className="footer-col">
            <h4 className="footer-heading">Matriculation Classes</h4>
            <ul className="footer-links">
              <li>
                <Link href="/class-9/" className="footer-link">
                  Class 9 (SSC Part I)
                </Link>
              </li>
              <li>
                <Link href="/class-10/" className="footer-link">
                  Class 10 (SSC Part II)
                </Link>
              </li>
              <li>
                <Link href="/search/" className="footer-link">
                  Search Study Resources
                </Link>
              </li>
            </ul>
          </div>

          {/* Information & Trust */}
          <div className="footer-col">
            <h4 className="footer-heading">Platform Info</h4>
            <ul className="footer-links">
              <li>
                <Link href="/about/" className="footer-link">
                  About Platform
                </Link>
              </li>
              <li>
                <Link href="/contact/" className="footer-link">
                  Academic Inquiries &amp; Contact
                </Link>
              </li>
              <li>
                <Link href="/disclaimer/" className="footer-link">
                  Educational &amp; Copyright Disclaimer
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="footer-col">
            <h4 className="footer-heading">Legal &amp; Privacy</h4>
            <ul className="footer-links">
              <li>
                <Link href="/privacy-policy/" className="footer-link">
                  Privacy Policy &amp; Cookies
                </Link>
              </li>
              <li>
                <Link href="/terms/" className="footer-link">
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">
            © {new Date().getFullYear()} FBISE Educational Platform. All rights reserved.
          </p>
          <p className="footer-disclaimer-note">
            Disclaimer: This platform is an independent educational resource and is not officially affiliated with or endorsed by the Federal Board of Intermediate and Secondary Education (FBISE) Islamabad.
          </p>
        </div>
      </div>
    </footer>
  );
}
