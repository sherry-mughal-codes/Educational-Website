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
      name: 'FBISE Educational Portal',
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
          <header className="resource-detail-header" style={{ marginBottom: '0.65rem' }}>
            <div className="badge-group" style={{ marginBottom: '0.35rem' }}>
              <span className="badge-pill" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>{cls.name}</span>
              <span className="badge-pill badge-neutral" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>{subject.name}</span>
              <span className="badge-pill badge-type" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>{resource.resource_type_display}</span>
            </div>

            <h1 className="resource-detail-title" style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem 0', lineHeight: 1.25 }}>
              {resource.title}
            </h1>

            {resource.description && (
              <p className="resource-detail-lead" style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.45rem 0', lineHeight: 1.45 }}>
                {resource.description}
              </p>
            )}

            <div className="resource-meta-bar" style={{ padding: '0.35rem 0.65rem', gap: '0.75rem', fontSize: '0.78rem' }}>
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
                  <span className="meta-bar-value">{subject.total_chapters} Chapters</span>
                </div>
              )}
              <div className="meta-bar-item">
                <span className="meta-bar-label">Status:</span>
                <span className="status-pill pill-success" style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem' }}>Verified Guide</span>
              </div>
            </div>
          </header>

          {/* Sleek, Compact Purchase & Download Action Strip */}
          <div className="resource-purchase-strip" style={{
            background: '#ffffff',
            border: '1.5px solid #10b981',
            borderRadius: '8px',
            padding: '0.55rem 0.85rem',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                Offline PDF
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                Complete FBISE Solved Guide:
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#047857', background: '#f0fdf4', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                PKR {resource.price ? Number(resource.price).toLocaleString('en-PK') : '300'}
              </span>
            </div>

            <div>
              {resource.user_has_purchased && resource.download_url ? (
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${resource.download_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#047857', color: '#ffffff', padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', borderRadius: '6px' }}
                  title="Download verified PDF"
                >
                  📥 Download PDF ↓
                </a>
              ) : (
                <Link
                  href={`/checkout/${resource.slug}/`}
                  className="btn-primary-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#047857', color: '#ffffff', padding: '0.4rem 0.95rem', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', borderRadius: '6px' }}
                  title="Purchase complete subject PDF"
                >
                  📥 Unlock Full PDF (PKR {resource.price ? Number(resource.price).toLocaleString('en-PK') : ''}) →
                </Link>
              )}
            </div>
          </div>

          {/* Online PDF Reader Section with Strict Payment-Gated Download */}
          <PdfViewer
            title={resource.title}
            hasPdf={Boolean(resource.has_pdf)}
            streamUrl={resource.pdf_stream_url}
            fileSizeBytes={resource.file_size_bytes}
            pageCount={resource.page_count}
            classSlug={cls.slug}
            subjectSlug={subject.slug}
            resourceSlug={resource.slug}
            userHasPurchased={Boolean(resource.user_has_purchased)}
            downloadUrl={resource.download_url}
            price={resource.price}
          />

          {/* Educational Content & Syllabus Alignment Preview (Brief & Usable) */}
          <section className="resource-content-box">
            <h2 className="content-box-title">Curriculum Scope &amp; Summary</h2>

            <div className="content-box-body">
              {resource.content_preview ? (
                <div className="content-preview-text">
                  {resource.content_preview.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <p className="content-intro" style={{ margin: 0 }}>
                  This verified study guide covers complete textbook review exercises, solved numericals,
                  key definitions, and exam preparation notes formulated strictly according to the Federal Board syllabus.
                </p>
              )}
            </div>
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
