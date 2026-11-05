import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getSubjectPracticeDirectory } from '@/lib/api';
import Breadcrumbs from '@/components/Breadcrumbs';

interface PageProps {
  params: {
    classSlug: string;
    subjectSlug: string;
  };
}

export const revalidate = 30;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getSubjectPracticeDirectory(params.classSlug, params.subjectSlug);
  if (!data) return {};

  const title = `${data.class_level.name} ${data.subject.name} Interactive Chapter Practice | FBISE`;
  const description = `Interactive chapter practice questions for Federal Board (FBISE) ${data.class_level.name} ${data.subject.name}. Practice MCQs, True/False, and Short Answers with step-by-step instant feedback.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${data.class_level.slug}/${data.subject.slug}/practice/`,
    },
    openGraph: {
      title,
      description,
      url: `/${data.class_level.slug}/${data.subject.slug}/practice/`,
    },
  };
}

export default async function SubjectPracticePage({ params }: PageProps) {
  const data = await getSubjectPracticeDirectory(params.classSlug, params.subjectSlug);

  if (!data) {
    notFound();
  }

  const { class_level: cls, subject, chapters, total_topics } = data;

  const breadcrumbs = [
    { label: cls.name, href: `/${cls.slug}/` },
    { label: subject.name, href: `/${cls.slug}/${subject.slug}/` },
    { label: 'Interactive Practice', href: `/${cls.slug}/${subject.slug}/practice/` },
  ];

  return (
    <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>
      <Breadcrumbs items={breadcrumbs} />

      {/* Header Banner */}
      <header style={{
        marginTop: '1.25rem',
        marginBottom: '2rem',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                background: '#ecfdf5',
                color: '#047857',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid #a7f3d0'
              }}>
                Interactive Learning &amp; Practice
              </span>
              <span style={{
                background: '#f1f5f9',
                color: '#475569',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
              }}>
                {cls.name}
              </span>
              <span style={{
                background: '#f1f5f9',
                color: '#475569',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
              }}>
                {subject.code || subject.name}
              </span>
            </div>

            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>
              {subject.name} Chapter Skills &amp; Practice
            </h1>
            <p style={{ fontSize: '1rem', color: '#475569', margin: 0, maxWidth: '680px', lineHeight: 1.6 }}>
              Strengthen conceptual understanding through targeted, question-by-question practice.
              Get immediate correctness feedback, SmartScore tracking, and full FBISE curriculum explanations.
            </p>
          </div>

          <div>
            <Link
              href={`/${cls.slug}/${subject.slug}/`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#047857',
                background: '#f0fdf4',
                padding: '0.75rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid #bbf7d0',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📄</span>
              <span>View Subject Study Notes</span>
            </Link>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid #f1f5f9',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
        }}>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Curriculum Units</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              {chapters.length} Chapters
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Interactive Practice Topics</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#047857' }}>
              {total_topics} Skills Available
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Feedback Mechanism</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              Instant &amp; Explained
            </div>
          </div>
        </div>
      </header>

      {/* Chapters & Topics List */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {chapters.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px dashed #cbd5e1',
            padding: '3rem 2rem',
            textAlign: 'center',
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155', margin: '0 0 0.5rem 0' }}>
              No practice topics published yet for {subject.name}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9375rem', margin: '0 0 1.5rem 0' }}>
              Our academic board is actively authoring SLO-based practice questions for this subject.
            </p>
            <Link
              href={`/${cls.slug}/${subject.slug}/`}
              style={{
                display: 'inline-block',
                background: '#047857',
                color: '#ffffff',
                fontWeight: 600,
                padding: '0.625rem 1.25rem',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              Browse Available Notes
            </Link>
          </div>
        ) : (
          chapters.map((chapter) => (
            <div
              key={chapter.id}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
              }}
            >
              {/* Chapter Header */}
              <div style={{
                background: '#f8fafc',
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}>
                <div>
                  <span style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#047857',
                    letterSpacing: '0.05em',
                  }}>
                    Chapter {chapter.chapter_number}
                  </span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0.25rem 0 0.25rem 0' }}>
                    {chapter.title}
                  </h2>
                  {chapter.overview && (
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                      {chapter.overview}
                    </p>
                  )}
                </div>

                <span style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#475569',
                  background: '#ffffff',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  border: '1px solid #e2e8f0',
                }}>
                  {chapter.topics.length} {chapter.topics.length === 1 ? 'Skill' : 'Skills'}
                </span>
              </div>

              {/* Topics inside Chapter */}
              <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {chapter.topics.length === 0 ? (
                  <div style={{ padding: '1rem 0', color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>
                    Practice questions for this unit are currently in preparation.
                  </div>
                ) : (
                  chapter.topics.map((topic, index) => {
                    const diffColors = {
                      beginner: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
                      intermediate: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
                      advanced: { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
                    }[topic.difficulty] || { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };

                    return (
                      <div
                        key={topic.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1rem',
                          padding: '1.25rem',
                          background: '#ffffff',
                          border: '1px solid #f1f5f9',
                          borderRadius: '12px',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                        }}
                      >
                        <div style={{ flex: '1 1 320px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#64748b',
                              background: '#f8fafc',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '4px',
                            }}>
                              Skill {chapter.chapter_number}.{topic.order || index + 1}
                            </span>
                            <span style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '4px',
                              background: diffColors.bg,
                              color: diffColors.text,
                              border: `1px solid ${diffColors.border}`,
                            }}>
                              {topic.difficulty}
                            </span>
                            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                              • {topic.question_count} {topic.question_count === 1 ? 'question' : 'questions'}
                            </span>
                          </div>

                          <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                            {topic.title}
                          </h3>

                          {topic.description && (
                            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                              {topic.description}
                            </p>
                          )}
                        </div>

                        {/* Practice Action & Student Status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {topic.status?.is_completed && (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              color: '#047857',
                              background: '#ecfdf5',
                              padding: '0.375rem 0.75rem',
                              borderRadius: '8px',
                              border: '1px solid #a7f3d0',
                            }}>
                              <span>✓</span>
                              <span>{Math.round(topic.status.accuracy_percentage)}% Accuracy</span>
                            </div>
                          )}

                          <Link
                            href={`/practice/${topic.slug}/`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              background: '#047857',
                              color: '#ffffff',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              padding: '0.625rem 1.25rem',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            <span>{topic.status?.attempted ? 'Practice Again' : 'Start Practice'}</span>
                            <span aria-hidden="true">→</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

