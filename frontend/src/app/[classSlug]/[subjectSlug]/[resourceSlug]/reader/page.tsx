import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getResource } from '@/lib/api';
import ReaderProtectionWrapper from '@/components/ReaderProtectionWrapper';

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

  return {
    title: `Reader: ${resource.title} | ${resource.class.name} FBISE`,
    description: `Read official FBISE study notes and model paper for ${resource.title} online.`,
  };
}

export default async function DedicatedReaderPage({ params }: PageProps) {
  const resource = await getResource(params.classSlug, params.subjectSlug, params.resourceSlug);

  if (!resource || !resource.has_pdf || !resource.pdf_stream_url || !resource.class || !resource.subject) {
    notFound();
  }

  const { class: cls, subject } = resource;
  // Strictly enforce toolbar=0 & navpanes=0 to prevent browser download/print buttons
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const fullStreamUrl = resource.pdf_stream_url.startsWith('http')
    ? resource.pdf_stream_url
    : `${apiUrl}${resource.pdf_stream_url}`;
  const secureStreamUrl = `${fullStreamUrl}#toolbar=0&navpanes=0&scrollbar=1`;
  const backUrl = `/${cls.slug}/${subject.slug}/${resource.slug}/`;

  return (
    <ReaderProtectionWrapper>
      {/* Top Reader Bar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.625rem 1.25rem',
        background: '#1e293b',
        color: '#ffffff',
        borderBottom: '1px solid #334155',
        flexShrink: 0,
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <Link
            href={backUrl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              background: '#334155',
              color: '#f8fafc',
              textDecoration: 'none',
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 700,
            }}
            title="Return to resource overview"
          >
            ← Back to Notes
          </Link>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', background: '#047857', color: '#ffffff', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                {cls.name}
              </span>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 600 }}>
                {subject.name}
              </span>
            </div>
            <h1 style={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: '#ffffff',
              margin: '0.15rem 0 0 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {resource.title}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {resource.page_count > 0 && (
            <span style={{ fontSize: '0.8125rem', color: '#cbd5e1', background: '#334155', padding: '0.25rem 0.625rem', borderRadius: '6px' }}>
              📑 {resource.page_count} Pages
            </span>
          )}

          {/* STRICT PAYMENT GATED DOWNLOAD BUTTON */}
          {resource.user_has_purchased && resource.download_url ? (
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${resource.download_url}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#047857',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '0.375rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 700,
              }}
              title="Download verified PDF"
            >
              📥 Download PDF ↓
            </a>
          ) : (
            <Link
              href={`/checkout/${resource.slug}/`}
              style={{
                background: '#047857',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '0.375rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: 700,
              }}
            >
              🔒 Download Offline PDF (PKR {resource.price ? Number(resource.price).toLocaleString('en-PK') : '100'})
            </Link>
          )}
        </div>
      </header>

      {/* Embedded Reader Canvas */}
      <main
        onContextMenu={(e) => e.preventDefault()}
        style={{ flex: 1, width: '100%', height: 'calc(100vh - 54px)', background: '#0f172a' }}
      >
        <iframe
          src={secureStreamUrl}
          title={`Website Reader: ${resource.title}`}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </main>
    </ReaderProtectionWrapper>
  );
}
