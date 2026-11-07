import Link from 'next/link';
import { getClasses, searchResources } from '@/lib/api';
import SearchBar from '@/components/SearchBar';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const [classes, recentData] = await Promise.all([
    getClasses(),
    searchResources({}),
  ]);

  const recentResources = recentData.results.slice(0, 6);

  // Subject icon mapping helper for clean academic visual markers
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

  // Schema.org Website Structured Data for Search Engine Rich Results
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FBISE Educational Platform',
    url: 'http://localhost:3001',
    description: 'Federal Board of Intermediate and Secondary Education Class 9 and Class 10 study notes and model papers.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'http://localhost:3001/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      <div className="container">
        {/* Main Hero Section (IXL-Inspired Academic Welcome & Quick Navigation) */}
        <section className="home-hero">
          <span className="home-hero-badge">Federal Board Islamabad • SSC Part I &amp; II Preparation</span>
          <h1 className="home-title">
            FBISE Class 9 &amp; Class 10 Study Notes
          </h1>
          <p className="home-subtitle">
            Curriculum-aligned revision notes, solved model papers, and comprehensive textbook
            guides formulated according to the latest Student Learning Outcomes (SLO) criteria.
          </p>

          <div className="hero-search-container">
            <SearchBar placeholder="Search subjects, chapters, or model papers (e.g. Physics, Chemistry, Math)..." />
          </div>

          {/* Quick Grade Selector Tiles */}
          <div className="hero-grade-tiles" aria-label="Select Matriculation Grade">
            {classes.map((cls) => {
              const activeSubjects = cls.subjects.filter(
                (sub) => (sub.resources_count || sub.published_resources_count || 0) > 0
              );
              return (
                <Link
                  key={cls.id}
                  href={`/${cls.slug}/`}
                  className="hero-grade-tile"
                  title={`Explore ${cls.name} Curriculum & Study Notes`}
                >
                  <div className="hero-grade-icon" aria-hidden="true">
                    {cls.grade_number}
                  </div>
                  <div className="hero-grade-info">
                    <div className="hero-grade-title">{cls.name}</div>
                    <div className="hero-grade-sub">
                      {activeSubjects.length} {activeSubjects.length === 1 ? 'Subject' : 'Subjects'} with Notes • Federal Board Syllabus
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Grade Selection & Core Subjects Discovery */}
        <section className="section-block">
          <div className="section-header">
            <h2 className="section-title">Select Your Academic Grade</h2>
            <p className="section-subtitle">
              Browse syllabus breakdowns and study materials tailored to each matriculation level.
            </p>
          </div>

          <div className="grid-2">
            {classes.map((cls) => {
              const activeSubjects = cls.subjects.filter(
                (sub) => (sub.resources_count || sub.published_resources_count || 0) > 0
              );
              return (
                <div key={cls.id} className="class-card">
                  <div className="class-card-header">
                    <div>
                      <span className="class-tag">Grade {cls.grade_number} (SSC-{cls.grade_number === 9 ? 'I' : 'II'})</span>
                      <h3 className="class-card-title">{cls.name}</h3>
                    </div>
                    <Link
                      href={`/${cls.slug}/`}
                      className="btn-primary"
                      title={`View subjects for ${cls.name}`}
                    >
                      Explore Grade →
                    </Link>
                  </div>

                  <p className="class-card-desc">{cls.description}</p>

                  <div className="class-card-subjects">
                    <h4 className="subjects-heading">
                      Available Subjects ({activeSubjects.length}):
                    </h4>
                    {activeSubjects.length === 0 ? (
                      <p style={{ fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic', margin: '0.5rem 0' }}>
                        No subjects with uploaded resources yet.
                      </p>
                    ) : (
                      <div className="subject-tags-list">
                        {activeSubjects.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/${cls.slug}/${sub.slug}/`}
                            className="subject-tag-chip"
                            title={`${sub.name} for ${cls.name}`}
                          >
                            <span aria-hidden="true">{getSubjectIcon(sub.name)}</span> {sub.name}
                            {(sub.resources_count || sub.published_resources_count) ? (
                              <span className="tag-count">({sub.resources_count || sub.published_resources_count})</span>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Interactive Learning & Practice Highlight (Clean, Concise Callout) */}
        <section style={{
          marginTop: '1.25rem',
          padding: '1.15rem 1.25rem',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          border: '1px solid #a7f3d0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 2px 4px rgba(4, 120, 87, 0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: '1 1 320px' }}>
            <div style={{
              fontSize: '2.25rem',
              background: '#ffffff',
              borderRadius: '14px',
              width: '60px',
              height: '60px',
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
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                }}>
                  Interactive Practice
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#047857' }}>
                  Federal Board Exam Prep
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#064e3b', margin: '0 0 0.25rem 0' }}>
                Master Concepts with Chapter-Wise Practice
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#065f46', margin: 0, maxWidth: '560px' }}>
                Solve interactive MCQs, fill-in-the-blanks, and numerical questions with immediate answers and step-by-step explanations.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href="/class-9/"
              className="btn-primary"
              style={{ padding: '0.625rem 1.25rem', borderRadius: '8px' }}
            >
              Class 9 Practice →
            </Link>
            <Link
              href="/class-10/"
              className="btn-outline-sm"
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '8px',
                background: '#ffffff',
                borderColor: '#10b981',
                color: '#047857',
                fontWeight: 700,
              }}
            >
              Class 10 Practice →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
