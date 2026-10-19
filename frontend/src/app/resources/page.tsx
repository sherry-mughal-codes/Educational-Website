import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Educational Resources Overview',
  description: 'Preview of upcoming FBISE Class 9 and 10 notes and model papers.',
};

export default function ResourcesPage() {
  return (
    <div className="container">
      <section className="hero-section">
        <h1 className="hero-title">Educational Resources</h1>
        <p className="hero-subtitle">
          Demonstrating client-side Next.js route transitions and GA4 page view tracking.
        </p>
      </section>

      <div className="card">
        <h2 className="card-title">Future Resource Catalog</h2>
        <p className="card-desc">
          In Phase 2 and subsequent phases, this section will host verified FBISE educational assets:
        </p>
        <ul className="feature-list">
          <li className="feature-item">
            <span className="check-icon">✓</span>
            <span><strong>Model Papers:</strong> FBISE SLO (Student Learning Outcomes) based sample papers.</span>
          </li>
          <li className="feature-item">
            <span className="check-icon">✓</span>
            <span><strong>Chapter Summaries:</strong> Key definitions, formulas, and conceptual explanations.</span>
          </li>
          <li className="feature-item">
            <span className="check-icon">✓</span>
            <span><strong>PDF Bundles:</strong> High-resolution downloadable revision packets.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
