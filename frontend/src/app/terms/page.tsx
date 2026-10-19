import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Terms of Use | FBISE Educational Platform',
  description: 'Terms and conditions governing the access and non-commercial educational use of study notes and materials.',
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
        <span className="badge-pill">Terms &amp; Conditions</span>
        <h1 className="page-title">Terms of Use</h1>
        <p className="page-subtitle">
          Please read these Terms of Use carefully before accessing study notes, model papers, or curriculum resources.
        </p>
      </header>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the FBISE Educational Platform, you agree to comply with and be bound
            by these Terms of Use. If you do not agree to these terms, you should not access the materials
            provided on this website.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Permitted Educational Use</h2>
          <p>
            All educational resources, study notes, syllabus reviews, and model question papers provided
            on this platform are intended strictly for personal, non-commercial self-study and revision by
            students and classroom teachers. You may:
          </p>
          <ul className="legal-list">
            <li>Read and review educational materials online for examination preparation.</li>
            <li>Reference notes in academic settings with appropriate citation.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Prohibited Activities</h2>
          <p>
            Users are explicitly prohibited from:
          </p>
          <ul className="legal-list">
            <li>Repackaging, reselling, or commercially exploiting any study notes or resources.</li>
            <li>Automated scraping, bulk downloading, or crawling of platform assets using bots without prior written consent.</li>
            <li>Misrepresenting affiliation with this platform or claiming ownership of compiled curriculum summaries.</li>
            <li>Attempting to compromise the security, integrity, or server infrastructure of the platform.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Intellectual Property &amp; Copyright</h2>
          <p>
            The website compilation, structural design, editorial guides, and unique annotations are
            protected by applicable copyright laws. Federal Board syllabus references and public examination
            standards remain the intellectual domain of their respective statutory bodies.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Disclaimer of Warranties</h2>
          <p>
            Materials are compiled with academic diligence but are provided &ldquo;as is&rdquo; without
            warranties of any kind. We do not warrant that all content is entirely error-free or that study
            materials guarantee specific examination grades. Final examination authority remains exclusively
            with the official examination board.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Modifications to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Updated versions will be posted
            directly to this page with an updated timestamp.
          </p>
        </section>
      </div>
    </div>
  );
}
