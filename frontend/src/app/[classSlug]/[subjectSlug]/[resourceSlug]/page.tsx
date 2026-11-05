import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getResource } from '@/lib/api';
import Breadcrumbs from '@/components/Breadcrumbs';
import PdfViewer from '@/components/PdfViewer';

interface PageProps {
  params: {
    classSlug: string;
    subjectSlug: string;
    resourceSlug: string;
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resource = await getResource(params.classSlug, params.subjectSlug, params.resourceSlug);
  if (!resource || !resource.class || !resource.subject) return {};

  const title = resource.meta_title || `${resource.title} | ${resource.class.name} FBISE`;
  const description = resource.meta_description || resource.description;
  const canonicalUrl = `/${resource.class.slug}/${resource.subject.slug}/${resource.slug}/`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'article',
    },
  };
}

export default async function ResourceDetailPage({ params }: PageProps) {
  const resource = await getResource(params.classSlug, params.subjectSlug, params.resourceSlug);

  if (!resource || !resource.class || !resource.subject) {
    notFound();
  }

  const { class: cls, subject } = resource;

  const breadcrumbs = [
    { label: cls.name, href: `/${cls.slug}/` },
    { label: subject.name, href: `/${cls.slug}/${subject.slug}/` },
    { label: resource.title },
  ];

  // Schema.org LearningResource Structured Data for SEO Rich Snippets
  const learningResourceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: resource.title,
    description: resource.description,
    educationalLevel: cls.name,
    learningResourceType: resource.resource_type_display,
    encodingFormat: 'application/pdf',
    author: {
      '@type': 'Organization',
      name: resource.author_attribution || 'FBISE Academic Panel',
    },
    inLanguage: 'en',
    isAccessibleForFree: true,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(learningResourceJsonLd) }}
      />

      <div className="container">
        <Breadcrumbs items={breadcrumbs} />

        <article className="resource-detail-layout">
          {/* Header */}
          <header className="resource-detail-header">
            <div className="badge-group">
              <span className="badge-pill">{cls.name}</span>
              <span className="badge-pill badge-neutral">{subject.name}</span>
              <span className="badge-pill badge-type">{resource.resource_type_display}</span>
            </div>

            <h1 className="resource-detail-title">{resource.title}</h1>

            <p className="resource-detail-lead">{resource.description}</p>

            <div className="resource-meta-bar">
              <div className="meta-bar-item">
                <span className="meta-bar-label">Format:</span>
                <span className="meta-bar-value">{resource.file_format} Document</span>
              </div>
              {resource.page_count > 0 && (
                <div className="meta-bar-item">
                  <span className="meta-bar-label">Length:</span>
                  <span className="meta-bar-value">{resource.page_count} Pages</span>
                </div>
              )}
              {subject.total_chapters && (
                <div className="meta-bar-item">
                  <span className="meta-bar-label">Curriculum:</span>
                  <span className="meta-bar-value">{subject.total_chapters} Chapters Covered</span>
                </div>
              )}
              <div className="meta-bar-item">
                <span className="meta-bar-label">Availability:</span>
                <span className="status-pill pill-success">Complete Subject Guide</span>
              </div>
            </div>
          </header>

          {/* Complete Subject Guide Purchase & Download Card */}
          <section className="resource-purchase-banner" aria-label="Purchase and Download">
            <div className="purchase-banner-left">
              <span className="purchase-badge">Complete Subject Guide</span>
              <h2 className="purchase-banner-title">Download Complete Offline PDF Packet</h2>
              <p className="purchase-banner-desc">
                Get the complete textbook-solved guide with all units,
                FBISE Student Learning Outcomes (SLO) benchmarks, and solved numericals in one verified document.
              </p>
              <div className="purchase-banner-features">
                <span>✓ High-Resolution Offline PDF</span>
                {resource.page_count > 0 && <span>✓ {resource.page_count} Pages</span>}
                <span>✓ Lifetime Access &amp; Free Updates</span>
              </div>
            </div>

            <div className="purchase-banner-right">
              <div className="purchase-pricing">
                <span className="price-tag-sub">One-Time Subject Price</span>
                <span className="price-tag-val">PKR {resource.price || '100'}</span>
              </div>

              {resource.user_has_purchased && resource.download_url ? (
                <div className="owned-action-box">
                  <span className="owned-indicator">✓ You Own This Subject</span>
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${resource.download_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary btn-large w-full text-center"
                    title="Download complete paid PDF"
                  >
                    Download PDF ↓
                  </a>
                </div>
              ) : (
                <Link
                  href={`/checkout/${resource.slug}/`}
                  className="btn-primary btn-large w-full text-center"
                  title="Purchase complete subject PDF"
                >
                  Purchase &amp; Download (PKR {resource.price || '100'}) →
                </Link>
              )}
            </div>
          </section>

          {/* Online PDF Reader Section */}
          <PdfViewer
            title={resource.title}
            hasPdf={Boolean(resource.has_pdf)}
            streamUrl={resource.pdf_stream_url}
            fileSizeBytes={resource.file_size_bytes}
            pageCount={resource.page_count}
            classSlug={cls.slug}
            subjectSlug={subject.slug}
            resourceSlug={resource.slug}
          />

          {/* Educational Content & Syllabus Alignment Preview */}
          <section className="resource-content-box">
            <h2 className="content-box-title">Resource Content &amp; Syllabus Coverage</h2>

            <div className="content-box-body">
              <p className="content-intro">
                This academic packet is formatted according to the official Federal Board of
                Intermediate and Secondary Education (FBISE) examination guidelines. It contains
                rigorous conceptual answers, solved numerical examples, and textbook exercise solutions.
              </p>

              {resource.content_preview ? (
                <div className="content-preview-text">
                  {resource.content_preview.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              ) : null}

              <div className="features-checklist">
                <h3 className="checklist-heading">What is included in this document:</h3>
                <ul className="feature-list">
                  <li className="feature-item">
                    <span className="check-icon">✓</span>
                    <span><strong>Student Learning Outcomes (SLO) Mapping:</strong> Every chapter topic addresses specific knowledge and analytical benchmarks mandated by the board.</span>
                  </li>
                  <li className="feature-item">
                    <span className="check-icon">✓</span>
                    <span><strong>Textbook Exercises Solved:</strong> Comprehensive step-by-step solutions to short questions, comprehensive questions, and review problems.</span>
                  </li>
                  <li className="feature-item">
                    <span className="check-icon">✓</span>
                    <span><strong>Exam Technique &amp; Formulas:</strong> Key definitions, formula sheets, derivation checklists, and high-yield examination tips.</span>
                  </li>
                  <li className="feature-item">
                    <span className="check-icon">✓</span>
                    <span><strong>Complete Subject Structure:</strong> Supplied as one unified subject packet for focused continuous revision.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Academic Attribution & Disclaimer */}
          <section className="attribution-card">
            <h3 className="attribution-title">Source Attribution &amp; Academic Standard</h3>
            <p className="attribution-text">
              Compiled and reviewed by <strong>{resource.author_attribution}</strong> in accordance
              with the National Curriculum Framework. Educational materials are published for academic
              revision and student self-study under Fair Use principles.
            </p>
          </section>

          {/* Genuine Related Resources */}
          {resource.related_resources && resource.related_resources.length > 0 && (
            <section className="related-resources-section">
              <h2 className="related-heading">
                Related {subject.name} Resources for {cls.name}
              </h2>
              <div className="related-grid">
                {resource.related_resources.map((rel) => (
                  <div key={rel.slug} className="related-card">
                    <span className="related-tag">{rel.resource_type_display}</span>
                    <h3 className="related-title">
                      <Link href={rel.url} className="related-link">
                        {rel.title}
                      </Link>
                    </h3>
                    <div className="related-meta">
                      <span>{rel.file_format}</span>
                      {rel.page_count > 0 && <span>• {rel.page_count} Pages</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Back Navigation */}
          <div className="back-nav-bar">
            <Link href={`/${cls.slug}/${subject.slug}/`} className="btn-outline-sm">
              ← Back to {subject.name} Subject Page
            </Link>
            <Link href={`/${cls.slug}/`} className="btn-outline-sm">
              All {cls.name} Subjects
            </Link>
          </div>
        </article>
      </div>
    </>
  );
}
