import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container not-found-container">
      <div className="not-found-card">
        <span className="error-code">404</span>
        <h1 className="not-found-title">Educational Resource Not Found</h1>
        <p className="not-found-desc">
          The requested study notes, subject page, or curriculum resource does not exist
          or has not been published yet. Please check the URL or use the navigation below.
        </p>
        <div className="not-found-actions">
          <Link href="/" className="btn-primary">
            Return to Homepage
          </Link>
          <Link href="/class-9/" className="btn-outline-sm">
            Class 9 Notes
          </Link>
          <Link href="/class-10/" className="btn-outline-sm">
            Class 10 Notes
          </Link>
          <Link href="/search/" className="btn-outline-sm">
            Search All Resources
          </Link>
        </div>
      </div>
    </div>
  );
}
