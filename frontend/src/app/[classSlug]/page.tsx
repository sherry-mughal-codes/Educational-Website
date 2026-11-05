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

  const getSubjectIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('physics')) return '⚛️';
    if (n.includes('chemistry')) return '🧪';
    if (n.includes('math')) return '📐';
    if (n.includes('bio')) return '🧬';
    if (n.includes('computer')) return '💻';
    if (n.includes('english')) return '📖';
    if (n.includes('pakistan') || n.includes('pak studies')) return '🗺️';
    if (n.includes('islam')) return '🕌';
    if (n.includes('urdu')) return '✍️';
    return '📚';
  };

  return (
    <div className="container">
      <Breadcrumbs items={breadcrumbs} />

      <header className="page-header">
        <span className="badge-pill">Federal Board Matriculation</span>
        <h1 className="page-title">{cls.name} Study Resources</h1>
        <p className="page-subtitle">{cls.description}</p>
      </header>

      <section className="section-block">
        <div className="section-header">
          <h2 className="section-title">Academic Subjects ({cls.subjects.length})</h2>
          <p className="section-subtitle">
            Select a subject below to access chapter outlines, syllabus summaries, and solved model exercises.
          </p>
        </div>

        {cls.subjects.length === 0 ? (
          <div className="card text-center" style={{ padding: '3rem 2rem' }}>
            <p className="card-title" style={{ marginBottom: '0.5rem' }}>No subjects registered yet</p>
            <p className="card-desc">
              Curriculum data for this class level is currently being populated.
            </p>
          </div>
        ) : (
          <div className="subjects-grid">
            {cls.subjects.map((sub) => (
              <div key={sub.slug} className="subject-card">
                <div className="subject-card-top">
                  <div className="subject-icon-wrap" aria-hidden="true">
                    {getSubjectIcon(sub.name)}
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
