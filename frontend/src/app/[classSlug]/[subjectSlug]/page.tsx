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

      {/* Syllabus & Exam Pattern Overview */}
      {subject.syllabus_overview && (
        <section className="info-callout-card">
          <div className="callout-icon" aria-hidden="true">📖</div>
          <div className="callout-body">
            <h2 className="callout-title">Federal Board Syllabus &amp; SLO Alignment</h2>
            <p className="callout-text">{subject.syllabus_overview}</p>
            {subject.total_chapters > 0 && (
              <p className="callout-meta">
                Curriculum Structure: <strong>{subject.total_chapters} Total Chapters / Units</strong>
              </p>
            )}
          </div>
        </section>
      )}

      {/* Interactive Practice Callout Card */}
      <section style={{
        margin: '1.5rem 0 2rem 0',
        padding: '1.5rem',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: '1px solid #a7f3d0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        boxShadow: '0 2px 4px rgba(4, 120, 87, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 300px' }}>
          <div style={{
            fontSize: '2rem',
            background: '#ffffff',
            borderRadius: '12px',
            width: '54px',
            height: '54px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            border: '1px solid #d1fae5',
            flexShrink: 0,
          }}>
            🎯
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{
                background: '#047857',
                color: '#ffffff',
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px',
                letterSpacing: '0.05em',
              }}>
                Interactive Learning
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#047857' }}>
                Instant Correctness &amp; Step-by-Step Solutions
              </span>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#064e3b', margin: '0 0 0.25rem 0' }}>
              Practice {subject.name} Questions by Chapter
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#065f46', margin: 0 }}>
              Master FBISE SLO concepts through interactive MCQs, fill-in-the-blanks, and numerical problems.
            </p>
          </div>
        </div>

        <div>
          <Link
            href={`/${cls.slug}/${subject.slug}/practice/`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#047857',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9375rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              textDecoration: 'none',
              boxShadow: '0 4px 6px -1px rgba(4, 120, 87, 0.2)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Practice Chapter Skills</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
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
