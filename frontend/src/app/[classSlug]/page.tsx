import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getClass } from '@/lib/api';
import Breadcrumbs from '@/components/Breadcrumbs';

interface PageProps {
  params: {
    classSlug: string;
  };
}

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const cls = await getClass(params.classSlug);
  if (!cls) return {};

  const title = `${cls.name} Notes, Syllabus & Model Papers | FBISE Federal Board`;
  const description = `Access comprehensive study notes, syllabus breakdown, and solved model papers for FBISE ${cls.name}. Fully aligned with Federal Board exams.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${cls.slug}/`,
    },
    openGraph: {
      title,
      description,
      url: `/${cls.slug}/`,
    },
  };
}

export default async function ClassPage({ params }: PageProps) {
  const cls = await getClass(params.classSlug);

  if (!cls) {
    notFound();
  }

  const breadcrumbs = [
    { label: cls.name, href: `/${cls.slug}/` },
  ];

  return (
    <div className="container">
      <Breadcrumbs items={breadcrumbs} />

      <header className="page-header">
        <span className="badge-pill">Grade Curriculum</span>
        <h1 className="page-title">{cls.name} Study Resources</h1>
        <p className="page-subtitle">{cls.description}</p>
      </header>

      <section className="section-block">
        <div className="section-header">
          <h2 className="section-title">Academic Subjects</h2>
          <p className="section-subtitle">
            Select a subject below to access chapter summaries, comprehensive notes, and solved model exercises.
          </p>
        </div>

        {cls.subjects.length === 0 ? (
          <div className="empty-state-card">
            <p className="empty-state-title">No subjects registered yet</p>
            <p className="empty-state-desc">
              Curriculum data for this class level is currently being populated.
            </p>
          </div>
        ) : (
          <div className="subjects-grid">
            {cls.subjects.map((sub) => (
              <div key={sub.slug} className="subject-card">
                <div className="subject-card-top">
                  <div className="subject-icon-wrap" aria-hidden="true">
                    📚
                  </div>
                  <span className="subject-code-badge">{sub.code || 'FBISE'}</span>
                </div>

                <h3 className="subject-name">
                  <Link href={`/${cls.slug}/${sub.slug}/`} className="subject-name-link">
                    {sub.name}
                  </Link>
                </h3>

                <p className="subject-desc">{sub.description}</p>

                <div className="subject-meta-info">
                  {sub.total_chapters > 0 && (
                    <span className="meta-tag">
                      {sub.total_chapters} Curriculum Units
                    </span>
                  )}
                  <span className="meta-tag">
                    {sub.published_resources_count || 0} Notes Available
                  </span>
                </div>

                <div className="subject-card-action">
                  <Link
                    href={`/${cls.slug}/${sub.slug}/`}
                    className="btn-outline-full"
                    title={`View ${sub.name} study notes for ${cls.name}`}
                  >
                    Explore {sub.name} Notes →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
