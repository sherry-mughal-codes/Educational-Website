import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Terms of Use | FBISE Educational Platform',
  description: 'Terms and conditions governing study notes, interactive practice, and PDF downloads.',
  alternates: {
    canonical: '/terms/',
  },
};

export default function TermsPage() {
  const breadcrumbs = [{ label: 'Terms of Use' }];

  return (
    <div className="container">
      <Breadcrumbs items={breadcrumbs} />

      <header className="page-header">
        <span className="badge-pill">Platform Guidelines</span>
        <h1 className="page-title">Terms of Use</h1>
        <p className="page-subtitle">
          Simple, fair terms for Federal Board students and teachers using our study notes and practice materials.
        </p>
      </header>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Educational Purpose &amp; Access</h2>
          <p>
            All study notes, model papers, and interactive chapter questions on this platform are designed for Federal Board (FBISE) Class 9 and Class 10 exam preparation.
            Online reading and chapter practice are free for all students.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Paid Offline PDF Packets</h2>
          <p>
            Students may optionally purchase verified, complete offline PDF guides.
            Purchased PDFs are licensed exclusively for the student&apos;s personal self-study and revision.
            Commercial redistribution, reselling, or public re-uploading of paid PDF files is prohibited.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Permitted &amp; Prohibited Use</h2>
          <ul className="legal-list">
            <li><strong>Permitted:</strong> Studying notes online, practicing interactive MCQs, downloading purchased packets, and referencing solutions in class.</li>
            <li><strong>Prohibited:</strong> Automated scraping of website content, attempting unauthorized access to admin systems, or misrepresenting official affiliation with the Federal Board.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Accuracy &amp; Independent Disclaimer</h2>
          <p>
            While our notes follow the official SLO curriculum benchmarks, examination grading and final marks remain solely under the authority of the Federal Board of Intermediate and Secondary Education (FBISE) Islamabad.
            This website is an independent educational portal and is not officially operated by the board.
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            Questions or feedback? Reach us through our <Link href="/contact/" className="inline-link">Contact Page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
