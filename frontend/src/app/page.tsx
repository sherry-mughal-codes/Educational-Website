import Link from 'next/link';
import { getClasses, searchResources } from '@/lib/api';
import SearchBar from '@/components/SearchBar';

export const revalidate = 60; // Refresh data every 60 seconds

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
            {classes.map((cls) => (
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
                    {cls.subjects.length} Subjects • Federal Board Syllabus
                  </div>
                </div>
              </Link>
            ))}
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
            {classes.map((cls) => (
              <div key={cls.id} className="class-card">
                <div className="class-card-header">
                  <div>
                    <span className="class-tag">Grade {cls.grade_number} (SSC-{cls.grade_number === 9 ? 'I' : 'II'})</span>
                    <h3 className="class-card-title">{cls.name}</h3>
                  </div>
                  <Link
                    href={`/${cls.slug}/`}
                    className="btn-primary"
                    title={`View all subjects for ${cls.name}`}
                  >
                    Explore Grade →
                  </Link>
                </div>

                <p className="class-card-desc">{cls.description}</p>

                <div className="class-card-subjects">
                  <h4 className="subjects-heading">
                    Core Subjects ({cls.subjects.length}):
                  </h4>
                  <div className="subject-tags-list">
                    {cls.subjects.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/${cls.slug}/${sub.slug}/`}
                        className="subject-tag-chip"
                        title={`${sub.name} for ${cls.name}`}
                      >
                        <span aria-hidden="true">{getSubjectIcon(sub.name)}</span> {sub.name}
                        {sub.resources_count ? (
                          <span className="tag-count">({sub.resources_count})</span>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How The Platform Works (IXL-Style Structured Academic Guidance) */}
        <section className="section-block">
          <div className="section-header">
            <h2 className="section-title">How To Use This Platform</h2>
            <p className="section-subtitle">
              A straightforward, distraction-free workflow designed for matriculation exam success.
            </p>
          </div>

          <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-accent-subtle)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem', border: '1px solid var(--border-brand)' }}>
                1
              </div>
              <h3 className="card-title" style={{ margin: 0, fontSize: '1.15rem' }}>Select Your Class &amp; Subject</h3>
              <p className="card-desc">
                Navigate directly to Class 9 or Class 10 to view the official FBISE curriculum outline, core subjects, and syllabus structure.
              </p>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-accent-subtle)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem', border: '1px solid var(--border-brand)' }}>
                2
              </div>
              <h3 className="card-title" style={{ margin: 0, fontSize: '1.15rem' }}>Read Notes Online For Free</h3>
              <p className="card-desc">
                Access chapter summaries, key definitions, formulas, and solved review exercises directly in your browser without any registration.
              </p>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-accent-subtle)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem', border: '1px solid var(--border-brand)' }}>
                3
              </div>
              <h3 className="card-title" style={{ margin: 0, fontSize: '1.15rem' }}>Offline PDF Revision Packets</h3>
              <p className="card-desc">
                Students can optionally unlock complete, high-resolution offline PDF study guides for comprehensive revision on any phone or laptop.
              </p>
            </div>
          </div>
        </section>

        {/* Recently Published Study Resources */}
        <section className="section-block">
          <div className="section-header-flex">
            <div>
              <h2 className="section-title">Published Study Resources</h2>
              <p className="section-subtitle">
                Complete subject study notes and solved Federal Board model papers.
              </p>
            </div>
            <Link href="/search/" className="view-all-link" title="Search all resources">
              Browse All Resources →
            </Link>
          </div>

          {recentResources.length === 0 ? (
            <div className="card text-center" style={{ padding: '3rem 2rem' }}>
              <p className="card-title" style={{ marginBottom: '0.5rem' }}>No resources published yet</p>
              <p className="card-desc">
                Curriculum assets are being verified by our academic panel. Please check back shortly.
              </p>
            </div>
          ) : (
            <div className="resources-grid">
              {recentResources.map((res) => (
                <article key={res.id} className="resource-card">
                  <div className="resource-card-meta">
                    <span className="resource-badge badge-class">{res.class_name}</span>
                    <span className="resource-badge badge-type">{res.resource_type_display}</span>
                  </div>

                  <h3 className="resource-title">
                    <Link
                      href={res.url || `/${res.class_slug}/${res.subject_slug}/${res.slug}/`}
                      className="resource-title-link"
                    >
                      {res.title}
                    </Link>
                  </h3>

                  <p className="resource-desc">{res.description}</p>

                  <div className="resource-footer">
                    <div className="resource-details">
                      <span className="detail-item">
                        <span className="detail-icon" aria-hidden="true">📄</span>
                        {res.file_format} Format
                      </span>
                      {res.page_count > 0 && (
                        <span className="detail-item">
                          <span className="detail-icon" aria-hidden="true">📑</span>
                          {res.page_count} Pages
                        </span>
                      )}
                    </div>
                    <Link
                      href={res.url || `/${res.class_slug}/${res.subject_slug}/${res.slug}/`}
                      className="btn-outline-sm"
                      title={`Read notes for ${res.title}`}
                    >
                      View Notes →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Educational Standards & SLO Alignment */}
        <section className="standards-banner">
          <span className="standards-tag">FBISE Academic Quality Standard</span>
          <h2 className="standards-title">Student Learning Outcomes (SLO) Curriculum</h2>
          <p className="standards-desc">
            All notes and model questions on this platform adhere to the National Curriculum
            framework and Federal Board assessment policies. Materials prioritize conceptual
            comprehension, analytical deduction, and solved textbook exercises.
          </p>
          <div className="standards-links">
            <Link href="/about/" className="standards-link">
              Learn About Our Standards →
            </Link>
            <Link href="/disclaimer/" className="standards-link">
              Curriculum Attribution &amp; Disclaimer →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
