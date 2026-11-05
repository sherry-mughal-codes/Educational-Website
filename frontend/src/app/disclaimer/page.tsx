import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Educational Disclaimer | FBISE Platform',
  description: 'Official copyright statement, fair use disclosure, and independent educational status.',
  alternates: {
    canonical: '/disclaimer/',
  },
};

export default function DisclaimerPage() {
  const breadcrumbs = [{ label: 'Disclaimer & Copyright' }];

  return (
    <div className="container">
      <Breadcrumbs items={breadcrumbs} />

      <header className="page-header">
        <span className="badge-pill">Legal &amp; Attribution</span>
        <h1 className="page-title">Educational Disclaimer</h1>
        <p className="page-subtitle">
          Independent academic preparation portal statement and fair educational use notice.
        </p>
      </header>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Independent Status Notice</h2>
          <p>
            <strong>FBISE Educational Platform</strong> is an independent academic revision initiative developed to help matriculation students excel in Federal Board exams.
          </p>
          <div className="disclaimer-callout" style={{ margin: '1rem 0' }}>
            <p style={{ margin: 0 }}>
              <strong>Notice:</strong> This website is an independent educational portal and is not officially affiliated with, endorsed by, or operated by the <strong>Federal Board of Intermediate and Secondary Education (FBISE), Islamabad</strong>.
              For official board registrations, roll numbers, and verified results, please visit the official board portal at{' '}
              <a href="https://www.fbise.edu.pk" target="_blank" rel="noopener noreferrer" className="inline-link" style={{ fontWeight: 700 }}>
                www.fbise.edu.pk
              </a>.
            </p>
          </div>
        </section>

        <section className="legal-section">
          <h2>2. Syllabus &amp; Fair Use Attribution</h2>
          <p>
            Curriculum outlines, chapter names, and textbook problem references follow the official National Curriculum standards for Federal Board Class 9 and Class 10.
            All explanatory notes, solved answers, and review questions are published strictly for educational commentary, teaching, and non-commercial self-study under Fair Use principles.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Feedback &amp; Content Corrections</h2>
          <p>
            If you believe any content requires correction, updated SLO alignment, or attribution review, please let us know via our{' '}
            <Link href="/contact/" className="inline-link">Contact Page</Link>. We review all academic suggestions promptly.
          </p>
        </section>
      </div>
    </div>
  );
}
