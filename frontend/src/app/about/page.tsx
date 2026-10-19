import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About the Platform',
  description: 'Learn about the FBISE Class 9 & 10 educational initiative and curriculum alignment.',
};

export default function AboutPage() {
  return (
    <div className="container">
      <section className="hero-section">
        <h1 className="hero-title">About FBISE Preparation</h1>
        <p className="hero-subtitle">
          Dedicated academic support for students affiliated with the Federal Board of Intermediate and Secondary Education.
        </p>
      </section>

      <div className="card">
        <h2 className="card-title">Curriculum Scope</h2>
        <p className="card-desc">
          This platform is architected to provide structured chapter-by-chapter study notes, solved exercises,
          and syllabus updates for:
        </p>
        <ul className="feature-list">
          <li className="feature-item">
            <span className="check-icon">✓</span>
            <span><strong>Class 9 (SSC Part I):</strong> Mathematics, Physics, Chemistry, Biology, Computer Science, English, Urdu, Islamiat, and Pakistan Studies.</span>
          </li>
          <li className="feature-item">
            <span className="check-icon">✓</span>
            <span><strong>Class 10 (SSC Part II):</strong> Comprehensive matriculation study guides and revision summaries.</span>
          </li>
          <li className="feature-item">
            <span className="check-icon">✓</span>
            <span><strong>Student-Centric Monetization:</strong> Affordable PKR 100 subject PDF downloads to sustain continuous platform operations.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
