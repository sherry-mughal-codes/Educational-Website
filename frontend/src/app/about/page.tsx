import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'About FBISE Educational Platform | Mission & Curriculum',
  description: 'Learn about the FBISE Class 9 & 10 study portal, our Student Learning Outcomes (SLO) curriculum alignment, and academic mission.',
  alternates: {
    canonical: '/about/',
  },
};

export default function AboutPage() {
  const breadcrumbs = [{ label: 'About Us' }];

  return (
    <div className="container">
      <Breadcrumbs items={breadcrumbs} />

      <header className="page-header">
        <span className="badge-pill">Academic Initiative</span>
        <h1 className="page-title">About FBISE Educational Platform</h1>
        <p className="page-subtitle">
          Empowering Federal Board matriculation students across Pakistan and abroad with high-quality,
          concept-driven study materials and exam preparation guides.
        </p>
      </header>

      <section className="info-section">
        <div className="card">
          <h2 className="card-title">Our Educational Mission</h2>
          <p className="card-desc">
            The transition from traditional rote-memorization to modern Student Learning Outcomes (SLO)
            has transformed matriculation assessments under the Federal Board of Intermediate and
            Secondary Education (FBISE), Islamabad. Our mission is to provide equal access to structured,
            concept-based academic notes, detailed textbook solutions, and solved model examination papers.
          </p>
        </div>

        <div className="grid-2">
          <div className="card">
            <h2 className="card-title">Curriculum Coverage</h2>
            <ul className="feature-list">
              <li className="feature-item">
                <span className="check-icon">✓</span>
                <span><strong>Class 9 (SSC Part I):</strong> Comprehensive notes for Physics, Chemistry, Mathematics, Biology, Computer Science, English, Urdu, Islamiat, and Pakistan Studies.</span>
              </li>
              <li className="feature-item">
                <span className="check-icon">✓</span>
                <span><strong>Class 10 (SSC Part II):</strong> Intensive board exam preparation guides, solved model papers, and review exercise solutions.</span>
              </li>
              <li className="feature-item">
                <span className="check-icon">✓</span>
                <span><strong>SLO-Based Methodology:</strong> Focus on understanding definitions, derivation principles, and practical application.</span>
              </li>
            </ul>
          </div>

          <div className="card">
            <h2 className="card-title">Platform Principles</h2>
            <ul className="feature-list">
              <li className="feature-item">
                <span className="check-icon">✓</span>
                <span><strong>Complete Subject Structure:</strong> Resources are structured as complete subject revision guides for unified, distraction-free study.</span>
              </li>
              <li className="feature-item">
                <span className="check-icon">✓</span>
                <span><strong>Authenticity:</strong> All materials are cross-referenced with National Curriculum guidelines and FBISE syllabus updates.</span>
              </li>
              <li className="feature-item">
                <span className="check-icon">✓</span>
                <span><strong>Independent Educational Initiative:</strong> Developed by educators to support student self-study.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Notice of Independent Status</h2>
          <p className="card-desc">
            This website is an independent educational portal. It is not affiliated with, endorsed by,
            or operated by the Federal Board of Intermediate and Secondary Education (FBISE) Islamabad.
            All official inquiries regarding examination registrations, roll number slips, and verified
            results should be directed to the official board portal at <a href="https://www.fbise.edu.pk" target="_blank" rel="noopener noreferrer" className="inline-link">fbise.edu.pk</a>.
          </p>
          <div className="actions-row">
            <Link href="/class-9/" className="btn-primary-sm">Browse Class 9 Notes</Link>
            <Link href="/class-10/" className="btn-primary-sm">Browse Class 10 Notes</Link>
            <Link href="/contact/" className="btn-outline-sm">Contact Support</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
