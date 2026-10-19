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

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getSubject(params.classSlug, params.subjectSlug);
  if (!data) return {};

  const title = `${data.class.name} ${data.subject.name} Notes & Model Papers | FBISE`;
  const description = `Download complete FBISE ${data.class.name} ${data.subject.name} study notes and solved model papers. Includes ${data.subject.total_chapters} chapters syllabus overview.`;

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
