import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getPageContent } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'About FBISE Educational Platform | Mission & Curriculum',
  description: 'Learn about the FBISE Class 9 & 10 study portal, our Student Learning Outcomes (SLO) curriculum alignment, and academic mission.',
  alternates: {
    canonical: '/about/',
  },
};

export default async function AboutPage() {
  const content = await getPageContent('about');
  const breadcrumbs = [{ label: 'About Us' }];

  const title = content?.title || 'About FBISE Educational Platform';
  const subtitle = content?.subtitle || 'Empowering Federal Board matriculation students across Pakistan with verified, concept-driven study materials.';
  const data = content?.data || {};

  const missionTitle = data.mission_title || 'Our Educational Mission';
  const missionText = data.mission_text || 'We provide curriculum-aligned revision notes, solved model papers, and interactive chapter practice formulated strictly according to the latest Student Learning Outcomes (SLO) criteria of the Federal Board of Intermediate and Secondary Education (FBISE), Islamabad.';

  const curriculumHeading = data.curriculum_heading || 'Curriculum Coverage';
  const curriculumPoints: string[] = Array.isArray(data.curriculum_points) && data.curriculum_points.length > 0
    ? data.curriculum_points
    : [
        'Class 9 (SSC Part I): Comprehensive notes for Physics, Chemistry, Mathematics, Biology, Computer Science, English, Urdu, Islamiat, and Pakistan Studies.',
        'Class 10 (SSC Part II): Intensive board exam preparation guides, solved model papers, and review exercise solutions.',
        'Interactive Practice: Instant feedback MCQs, fill-in-the-blanks, and true/false questions for conceptual self-testing.',
      ];

  const principlesHeading = data.principles_heading || 'Platform Standards';
  const principlesPoints: string[] = Array.isArray(data.principles_points) && data.principles_points.length > 0
    ? data.principles_points
    : [
        'Strict Syllabus Alignment: Resources follow National Curriculum and Federal Board guidelines.',
        'Free Online Reading: Notes and practice questions are accessible directly in the browser.',
        'Independent Educational Initiative: Developed to support student self-study.',
      ];

  const noticeHeading = data.notice_heading || 'Notice of Independent Status';
  const noticeText = data.notice_text || 'This website is an independent educational portal. It is not affiliated with, endorsed by, or operated by the Federal Board of Intermediate and Secondary Education (FBISE) Islamabad. All official inquiries regarding examination registrations, roll number slips, and verified results should be directed to the official board portal at fbise.edu.pk.';

  return (
    <div className="container">
      <Breadcrumbs items={breadcrumbs} />

      <header className="page-header">
        <span className="badge-pill">Academic Initiative</span>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </header>

      <section className="info-section">
        <div className="card">
          <h2 className="card-title">{missionTitle}</h2>
          <p className="card-desc">{missionText}</p>
        </div>

        <div className="grid-2">
          <div className="card">
            <h2 className="card-title">{curriculumHeading}</h2>
            <ul className="feature-list">
              {curriculumPoints.map((pt, idx) => (
                <li key={idx} className="feature-item">
                  <span className="check-icon">✓</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2 className="card-title">{principlesHeading}</h2>
            <ul className="feature-list">
              {principlesPoints.map((pt, idx) => (
                <li key={idx} className="feature-item">
                  <span className="check-icon">✓</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">{noticeHeading}</h2>
          <p className="card-desc">
            {noticeText}{' '}
            <a href="https://www.fbise.edu.pk" target="_blank" rel="noopener noreferrer" className="inline-link">
              fbise.edu.pk
            </a>.
          </p>
          <div className="actions-row">
            <Link href="/class-9/" className="btn-primary-sm">Browse Class 9 Notes</Link>
            <Link href="/class-10/" className="btn-primary-sm">Browse Class 10 Notes</Link>
            <Link href="/contact/" className="btn-outline-sm">Contact Support</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
