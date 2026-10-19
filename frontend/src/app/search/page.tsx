import type { Metadata } from 'next';
import Link from 'next/link';
import { searchResources, getClasses } from '@/lib/api';
import SearchBar from '@/components/SearchBar';
import Breadcrumbs from '@/components/Breadcrumbs';

interface SearchPageProps {
  searchParams: {
    q?: string;
    class?: string;
    subject?: string;
    type?: string;
  };
}

export const revalidate = 0; // Dynamic search

export const metadata: Metadata = {
  title: 'Search Study Notes & Model Papers | FBISE Resources',
  description: 'Search Class 9 and Class 10 FBISE notes, syllabus guidelines, and solved exercises across all subjects.',
  alternates: {
    canonical: '/search/',
  },
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || '';
  const classFilter = searchParams.class || '';
  const subjectFilter = searchParams.subject || '';
  const typeFilter = searchParams.type || '';

  const [searchData, classes] = await Promise.all([
    searchResources({
      q: query,
      class: classFilter,
      subject: subjectFilter,
      type: typeFilter,
    }),
    getClasses(),
  ]);

  const breadcrumbs = [
    { label: 'Search' },
  ];

  return (
    <div className="container">
      <Breadcrumbs items={breadcrumbs} />

      <header className="page-header">
        <h1 className="page-title">Search Educational Resources</h1>
        <p className="page-subtitle">
          Find curriculum-aligned notes, solved past papers, and textbook guides for Class 9 and Class 10.
        </p>

        <div className="search-bar-inline">
          <SearchBar initialQuery={query} />
        </div>
      </header>

      {/* Filter Controls */}
      <section className="search-filters-bar">
        <span className="filters-label">Filter By:</span>

        {/* Class Filter */}
        <div className="filter-group">
          <span className="filter-name">Grade:</span>
          <Link
            href={`/search?${new URLSearchParams({ ...(query && { q: query }), ...(subjectFilter && { subject: subjectFilter }), ...(typeFilter && { type: typeFilter }) }).toString()}`}
            className={`filter-chip ${!classFilter ? 'active' : ''}`}
          >
            All Grades
          </Link>
          {classes.map((cls) => (
            <Link
              key={cls.slug}
              href={`/search?${new URLSearchParams({ ...(query && { q: query }), class: cls.slug, ...(subjectFilter && { subject: subjectFilter }), ...(typeFilter && { type: typeFilter }) }).toString()}`}
              className={`filter-chip ${classFilter === cls.slug ? 'active' : ''}`}
            >
              Grade {cls.grade_number}
            </Link>
          ))}
        </div>

        {/* Type Filter */}
        <div className="filter-group">
          <span className="filter-name">Resource Type:</span>
          <Link
            href={`/search?${new URLSearchParams({ ...(query && { q: query }), ...(classFilter && { class: classFilter }), ...(subjectFilter && { subject: subjectFilter }) }).toString()}`}
            className={`filter-chip ${!typeFilter ? 'active' : ''}`}
          >
            All Types
          </Link>
          <Link
            href={`/search?${new URLSearchParams({ ...(query && { q: query }), ...(classFilter && { class: classFilter }), type: 'complete_notes' }).toString()}`}
            className={`filter-chip ${typeFilter === 'complete_notes' ? 'active' : ''}`}
          >
            Complete Notes
          </Link>
          <Link
            href={`/search?${new URLSearchParams({ ...(query && { q: query }), ...(classFilter && { class: classFilter }), type: 'model_paper' }).toString()}`}
            className={`filter-chip ${typeFilter === 'model_paper' ? 'active' : ''}`}
          >
            Model Papers
          </Link>
        </div>
      </section>

      {/* Search Results Summary */}
      <div className="search-results-header">
        <p className="results-count">
          Found <strong>{searchData.total_results}</strong> {searchData.total_results === 1 ? 'resource' : 'resources'}
          {query ? <span> for query &ldquo;<strong>{query}</strong>&rdquo;</span> : null}
        </p>
      </div>

      {/* Results List */}
      {searchData.results.length === 0 ? (
        <div className="empty-state-card">
          <p className="empty-state-title">No resources matched your criteria</p>
          <p className="empty-state-desc">
            Try broadening your search term (e.g. searching for &ldquo;Physics&rdquo; or &ldquo;Mathematics&rdquo;) or resetting your filters.
          </p>
          <div className="empty-state-actions">
            <Link href="/search/" className="btn-primary">
              Clear All Filters
            </Link>
          </div>
        </div>
      ) : (
        <div className="resources-grid">
          {searchData.results.map((res) => (
            <article key={res.id} className="resource-card">
              <div className="resource-card-meta">
                <span className="resource-badge badge-class">{res.class_name}</span>
                <span className="resource-badge badge-type">{res.resource_type_display}</span>
              </div>

              <h2 className="resource-title">
                <Link
                  href={res.url || `/${res.class_slug}/${res.subject_slug}/${res.slug}/`}
                  className="resource-title-link"
                >
                  {res.title}
                </Link>
              </h2>

              <p className="resource-desc">{res.description}</p>

              <div className="resource-footer">
                <div className="resource-details">
                  <span className="detail-item">
                    <span className="detail-icon" aria-hidden="true">📄</span>
                    {res.file_format}
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
                  title={`View notes for ${res.title}`}
                >
                  View Notes →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
