import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getPageContent } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Contact Academic Support & Inquiries | FBISE Platform',
  description: 'Reach our educational support team for syllabus feedback, study note inquiries, and platform assistance.',
  alternates: {
    canonical: '/contact/',
  },
};

export default async function ContactPage() {
  const content = await getPageContent('contact');
  const breadcrumbs = [{ label: 'Contact Us' }];

  const title = content?.title || 'Contact Educational Support';
  const subtitle = content?.subtitle || 'Have questions regarding syllabus alignment, note corrections, or platform navigation? Reach out to our academic team.';
  const data = content?.data || {};

  const email = data.email || 'support@fbise-notes.pk';
  const phone = data.phone || data.whatsapp || '+92 300 1234567';
  const responseTime = data.response_time || 'Within 24 business hours';
  const location = data.location || 'Islamabad Capital Territory, Pakistan';
  const inquiryHeading = data.inquiry_heading || 'When reporting an error or asking about notes:';
  const inquirySteps: string[] = Array.isArray(data.inquiry_steps) && data.inquiry_steps.length > 0
    ? data.inquiry_steps
    : [
        'Specify your Class (Class 9 or Class 10) and Subject (e.g. Physics, Chemistry).',
        'Mention the Chapter number and specific section or formula.',
        'For payment queries, provide your Order Reference ID and transaction proof.',
      ];

  return (
    <div className="container">
      <Breadcrumbs items={breadcrumbs} />

      <header className="page-header">
        <span className="badge-pill">Academic Inquiries</span>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </header>

      <div className="grid-2">
        <div className="card">
          <h2 className="card-title">Inquiry Channels</h2>
          <p className="card-desc">
            Direct your academic questions, curriculum feedback, or order inquiries through our official channels:
          </p>

          <ul className="feature-list">
            <li className="feature-item">
              <span className="check-icon">✉</span>
              <span>
                <strong>Academic Support Email:</strong><br />
                <a href={`mailto:${email}`} className="inline-link" style={{ fontWeight: 600 }}>
                  {email}
                </a>
              </span>
            </li>
            {phone && (
              <li className="feature-item">
                <span className="check-icon">📞</span>
                <span>
                  <strong>Phone / WhatsApp:</strong><br />
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{phone}</span>
                </span>
              </li>
            )}
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
                {location}
              </span>
            </li>
          </ul>
        </div>

        <div className="card">
          <h2 className="card-title">Feedback &amp; Error Reporting</h2>
          <p className="card-desc">
            We continuously verify our notes and model papers to maintain the highest standard of academic rigor:
          </p>

          <div className="guidance-box">
            <h3 className="guidance-title">{inquiryHeading}</h3>
            <ol className="guidance-list">
              {inquirySteps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
