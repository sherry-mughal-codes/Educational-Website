import BackendStatus from '@/components/BackendStatus';
import { GA_MEASUREMENT_ID, IS_GA_ENABLED, IS_DEBUG_MODE } from '@/lib/analytics';

export default function HomePage() {
  return (
    <div className="container">
      <section className="hero-section">
        <span className="phase-tag">Phase 1 Foundation Complete</span>
        <h1 className="hero-title">FBISE Class 9 &amp; 10 Platform</h1>
        <p className="hero-subtitle">
          Reproducible Docker development environment connecting Next.js App Router,
          Django backend, PostgreSQL database, and Google Analytics 4.
        </p>
      </section>

      {/* Live Backend & Database Verification Card */}
      <BackendStatus />

      {/* Stack & Architecture Overview */}
      <div className="grid-2">
        <div className="card">
          <h2 className="card-title">Docker Environment</h2>
          <p className="card-desc">
            All services are containerized with isolated networks and persistent storage:
          </p>
          <ul className="feature-list">
            <li className="feature-item">
              <span className="check-icon">✓</span>
              <span><strong>Frontend:</strong> Next.js 14 App Router (Port 3001)</span>
            </li>
            <li className="feature-item">
              <span className="check-icon">✓</span>
              <span><strong>Backend:</strong> Django 5.1 with CORS headers (Port 8000)</span>
            </li>
            <li className="feature-item">
              <span className="check-icon">✓</span>
              <span><strong>Database:</strong> PostgreSQL 16 Alpine with named volume persistence</span>
            </li>
            <li className="feature-item">
              <span className="check-icon">✓</span>
              <span><strong>Healthcheck:</strong> Native PostgreSQL readiness validation</span>
            </li>
          </ul>
        </div>

        <div className="card">
          <h2 className="card-title">Google Analytics 4 (GA4)</h2>
          <p className="card-desc">
            Ready for web stream tracking without hardcoded credentials:
          </p>
          <ul className="feature-list">
            <li className="feature-item">
              <span className="check-icon">✓</span>
              <span>
                <strong>Status:</strong>{' '}
                {IS_GA_ENABLED ? (
                  <span className="status-pill pill-success">Configured ({GA_MEASUREMENT_ID.slice(0, 4)}***)</span>
                ) : (
                  <span className="status-pill pill-pending">Standby (No measurement ID set)</span>
                )}
              </span>
            </li>
            <li className="feature-item">
              <span className="check-icon">✓</span>
              <span>
                <strong>Debug Mode:</strong>{' '}
                <span className={`status-pill ${IS_DEBUG_MODE ? 'pill-success' : 'pill-pending'}`}>
                  {IS_DEBUG_MODE ? 'Enabled (DebugView)' : 'Disabled'}
                </span>
              </span>
            </li>
            <li className="feature-item">
              <span className="check-icon">✓</span>
              <span><strong>Page-View Tracker:</strong> App Router route listener with duplicate prevention</span>
            </li>
            <li className="feature-item">
              <span className="check-icon">✓</span>
              <span><strong>PII Protection:</strong> Automatic stripping of forbidden student/payment keys</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
