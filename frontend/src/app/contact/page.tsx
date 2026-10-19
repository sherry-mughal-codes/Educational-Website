import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Contact Academic Support & Inquiries | FBISE Platform',
  description: 'Reach our educational support team for syllabus feedback, study note inquiries, and platform assistance.',
  alternates: {
    canonical: '/contact/',
  },
};

export default function ContactPage() {
  const breadcrumbs = [{ label: 'Contact Us' }];

  // Configurable contact details with clear deployment placeholders
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@fbise-notes.example.com';
  const responseTime = 'Within 24 to 48 business hours';

  return (
    <div className="container">
      <Breadcrumbs items={breadcrumbs} />

      <header className="page-header">
        <span className="badge-pill">Academic Inquiries</span>
        <h1 className="page-title">Contact Educational Support</h1>
        <p className="page-subtitle">
          Have questions regarding syllabus alignment, note corrections, or platform navigation?
          We welcome feedback from students, teachers, and parents.
        </p>
      </header>

      <div className="grid-2">
        <div className="card">
          <h2 className="card-title">Inquiry Channels</h2>
          <p className="card-desc">
            Please direct all academic and platform-related queries through our verified electronic communication channels:
          </p>

          <ul className="feature-list">
            <li className="feature-item">
              <span className="check-icon">✉</span>
              <span>
                <strong>Academic Support Email:</strong><br />
                <code className="metric-code">{contactEmail}</code>
                <span className="subtext-note">(Placeholder: Configure NEXT_PUBLIC_CONTACT_EMAIL upon domain deployment)</span>
              </span>
            </li>
            <li className="feature-item">
              <span className="check-icon">⏱</span>
              <span>
                <strong>Expected Response:</strong><br />
                {responseTime}
              </span>
            </li>
            <li className="feature-item">
              <span className="check-icon">📍</span>
              <span>
                <strong>Operating Region:</strong><br />
                Islamabad Capital Territory, Pakistan (Catering to Federal Board nationwide and overseas affiliations)
              </span>
            </li>
          </ul>
        </div>

        <div className="card">
          <h2 className="card-title">Feedback &amp; Error Reporting</h2>
          <p className="card-desc">
            To maintain the highest standard of academic rigor, we review all error submissions:
          </p>

          <div className="guidance-box">
            <h3 className="guidance-title">When reporting an error:</h3>
            <ol className="guidance-list">
              <li>Specify the exact Class and Subject (e.g. Class 9 Physics).</li>
              <li>Mention the Chapter number and topic title.</li>
              <li>Provide the specific equation, definition, or answer in question.</li>
              <li>Cite the relevant Federal Board textbook edition if applicable.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
