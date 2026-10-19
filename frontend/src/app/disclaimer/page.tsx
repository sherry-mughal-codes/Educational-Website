import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Educational Disclaimer & Copyright Notice | FBISE Platform',
  description: 'Official copyright statement, educational fair use disclosure, and independent status notice.',
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
        <span className="badge-pill">Legal Notice</span>
        <h1 className="page-title">Educational Disclaimer &amp; Copyright Notice</h1>
        <p className="page-subtitle">
          Independent academic preparation platform statement and fair use disclosure.
        </p>
      </header>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Independent Educational Portal Status</h2>
          <p>
            <strong>FBISE Educational Platform</strong> is an independent academic revision initiative
            established to facilitate self-study for Class 9 and Class 10 students.
          </p>
          <div className="disclaimer-callout">
            <p>
              <strong>NON-AFFILIATION NOTICE:</strong> This platform is neither affiliated with,
              associated with, authorized by, sponsored by, nor in any way officially connected with
              the <strong>Federal Board of Intermediate and Secondary Education (FBISE), Islamabad</strong>,
              or any of its subsidiaries, regional branches, or academic committees.
            </p>
            <p className="subtext-note">
              The official portal for the Federal Board is located at{' '}
              <a href="https://www.fbise.edu.pk" target="_blank" rel="noopener noreferrer" className="inline-link">
                www.fbise.edu.pk
              </a>.
            </p>
          </div>
        </section>

        <section className="legal-section">
          <h2>2. Trademark &amp; Name Usage</h2>
          <p>
            The term &ldquo;FBISE&rdquo;, &ldquo;Federal Board&rdquo;, &ldquo;SSC Part I&rdquo;, and
            &ldquo;SSC Part II&rdquo; are used on this platform strictly in a descriptive nominative
            context to identify the intended academic curriculum and examination system to which these
            study guides pertain. Such usage does not imply sponsorship, certification, or endorsement.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Educational Fair Use &amp; Textbook Attribution</h2>
          <p>
            The study notes, solved mathematical exercises, and question guides published here are
            created for commentary, explanation, teaching, and scholarship under the Fair Use
            provisions of copyright law (including Section 57 of the Copyright Ordinance of Pakistan).
          </p>
          <ul className="legal-list">
            <li>Excerpts from National Book Foundation (NBF) and provincial textbook boards are cited purely for pedagogical illustrative purposes and contextual problem-solving.</li>
            <li>All unique conceptual explanations, summaries, and formula sheets are authored by our academic panel.</li>
            <li>No copyright infringement is intended. If you are a copyright holder and believe that any compiled resource exceeds fair educational quotation, please contact us for immediate review and resolution.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Examination Outcomes</h2>
          <p>
            While our study guides are aligned with the official Student Learning Outcomes (SLO) pattern,
            examination evaluation, grading criteria, and official marks distribution remain solely at the
            discretion of the Federal Board examination committees. We do not warrant specific scores,
            positions, or examination outcomes.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Takedown Requests and Academic Corrections</h2>
          <p>
            If you wish to submit an attribution request or suggest a content modification, please email
            our team via our <a href="/contact/" className="inline-link">Contact Page</a>. We commit
            to reviewing all inquiries expeditiously.
          </p>
        </section>
      </div>
    </div>
  );
}
