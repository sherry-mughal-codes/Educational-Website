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
        {/* Hero Section */}
        <section className="home-hero">
          <div className="badge-pill">Federal Board Matriculation Preparation</div>
          <h1 className="home-title">
            FBISE Class 9 &amp; Class 10 Study Notes
          </h1>
          <p className="home-subtitle">
            Curriculum-aligned revision notes, solved model papers, and comprehensive subject
            guides formulated according to the latest Student Learning Outcomes (SLO) criteria.
          </p>

          <div className="hero-search-container">
            <SearchBar placeholder="Search subjects, chapters, or model papers (e.g. Physics, Chemistry, Math)..." />
          </div>
        </section>

        {/* Class Selection & Discovery */}
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
                    <span className="class-tag">Grade {cls.grade_number}</span>
                    <h3 className="class-card-title">{cls.name}</h3>
                  </div>
                  <Link
                    href={`/${cls.slug}/`}
                    className="btn-primary"
                    title={`View all subjects for ${cls.name}`}
                  >
                    Explore Grade
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
                        {sub.name}
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
            <div className="empty-state-card">
              <p className="empty-state-title">No resources published yet</p>
              <p className="empty-state-desc">
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
                      View Notes
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Educational Standards Information */}
        <section className="standards-banner">
          <div className="standards-content">
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
          </div>
        </section>
      </div>
    </>
  );
}
