import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getSubject } from '@/lib/api';
import Breadcrumbs from '@/components/Breadcrumbs';

interface PageProps {
  params: {
    classSlug: string;
    subjectSlug: string;
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getSubject(params.classSlug, params.subjectSlug);
  if (!data) return {};

  const hasModelPapers = data.resources?.some((r) => r.resource_type === 'model_paper');
  const title = hasModelPapers
    ? `${data.class.name} ${data.subject.name} Notes & Model Papers | FBISE`
    : `${data.class.name} ${data.subject.name} Study Notes | FBISE`;
  const description = `FBISE ${data.class.name} ${data.subject.name} curriculum notes and learning resources. Includes ${data.subject.total_chapters} chapters syllabus overview.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${data.class.slug}/${data.subject.slug}/`,
    },
    openGraph: {
      title,
      description,
      url: `/${data.class.slug}/${data.subject.slug}/`,
    },
  };
}

export default async function SubjectPage({ params }: PageProps) {
  const data = await getSubject(params.classSlug, params.subjectSlug);

  if (!data) {
    notFound();
  }

  const { class: cls, subject, resources } = data;

  const breadcrumbs = [
    { label: cls.name, href: `/${cls.slug}/` },
    { label: subject.name, href: `/${cls.slug}/${subject.slug}/` },
  ];

  return (
    <div className="container">
      <Breadcrumbs items={breadcrumbs} />

      <header className="page-header">
        <div className="badge-group">
          <span className="badge-pill">{cls.name}</span>
          <span className="badge-pill badge-neutral">{subject.code || 'FBISE'}</span>
        </div>
        <h1 className="page-title">{subject.name} Notes &amp; Resources</h1>
        <p className="page-subtitle">{subject.description}</p>
      </header>

      {/* Sleek Practice & Syllabus Action Bar */}
      <section style={{
        margin: '1.25rem 0 1.75rem 0',
        padding: '1.25rem 1.5rem',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: '1px solid #a7f3d0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ background: '#047857', color: '#ffffff', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
              Interactive Practice
            </span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#047857' }}>
              {subject.total_chapters > 0 ? `${subject.total_chapters} Chapters • ` : ''}Instant Solutions
            </span>
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#064e3b', margin: '0 0 0.15rem 0' }}>
            Practice {subject.name} Questions by Chapter
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#065f46', margin: 0, maxWidth: '620px' }}>
            {subject.syllabus_overview || `Self-test key concepts, solved numericals, and review questions for ${cls.name} ${subject.name}.`}
          </p>
        </div>

        <Link
          href={`/${cls.slug}/${subject.slug}/practice/`}
          className="btn-primary"
          style={{ padding: '0.625rem 1.25rem', borderRadius: '8px', fontSize: '0.875rem' }}
        >
          Start Chapter Practice 🎯
        </Link>
      </section>

      {/* Available Study Resources List */}
      <section className="section-block">
        <div className="section-header">
          <h2 className="section-title">Available Study Materials ({resources.length})</h2>
          <p className="section-subtitle">
            All materials below are verified for Federal Board matriculation examination preparation.
          </p>
        </div>

        {resources.length === 0 ? (
          <div className="empty-state-card">
            <p className="empty-state-title">No resources published for {subject.name} yet</p>
            <p className="empty-state-desc">
              Study notes for this subject are currently being reviewed by our subject specialists.
            </p>
            <Link href={`/${cls.slug}/`} className="btn-primary">
              Back to {cls.name} Subjects
            </Link>
          </div>
        ) : (
          <div className="resources-grid">
            {resources.map((res) => (
              <article key={res.id} className="resource-card">
                <div className="resource-card-meta">
                  <span className="resource-badge badge-type">{res.resource_type_display}</span>
                  <span className="resource-badge badge-neutral">{res.file_format}</span>
                </div>

                <h3 className="resource-title">
                  <Link
                    href={`/${cls.slug}/${subject.slug}/${res.slug}/`}
                    className="resource-title-link"
                  >
                    {res.title}
                  </Link>
                </h3>

                <p className="resource-desc">{res.description}</p>

                <div className="resource-footer">
                  <div className="resource-details">
                    {res.page_count > 0 && (
                      <span className="detail-item">
                        <span className="detail-icon" aria-hidden="true">📑</span>
                        {res.page_count} Pages
                      </span>
                    )}
                    <span className="detail-item">
                      <span className="detail-icon" aria-hidden="true">✓</span>
                      Complete Document
                    </span>
                  </div>
                  <Link
                    href={`/${cls.slug}/${subject.slug}/${res.slug}/`}
                    className="btn-primary-sm"
                    title={`Access ${res.title}`}
                  >
                    Open Resource →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
