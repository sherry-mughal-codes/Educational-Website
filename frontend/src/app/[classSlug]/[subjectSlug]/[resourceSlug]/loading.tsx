export default function ResourceLoading() {
  return (
    <div className="container" style={{ padding: '1.5rem 1rem' }}>
      {/* Breadcrumb Skeleton */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <div className="skeleton-box" style={{ width: '50px', height: '14px', borderRadius: '4px' }} />
        <div style={{ color: '#cbd5e1' }}>/</div>
        <div className="skeleton-box" style={{ width: '70px', height: '14px', borderRadius: '4px' }} />
        <div style={{ color: '#cbd5e1' }}>/</div>
        <div className="skeleton-box" style={{ width: '150px', height: '14px', borderRadius: '4px' }} />
      </div>

      {/* Resource Detail Header Skeleton */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div className="skeleton-box" style={{ width: '90px', height: '22px', borderRadius: '4px' }} />
          <div className="skeleton-box" style={{ width: '70px', height: '22px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton-box" style={{ width: '360px', height: '28px', borderRadius: '6px', marginBottom: '0.5rem' }} />
        <div className="skeleton-box" style={{ width: '75%', height: '14px', borderRadius: '4px' }} />
      </div>

      {/* Offline PDF Action Strip Skeleton */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div className="skeleton-box" style={{ width: '220px', height: '20px', borderRadius: '4px' }} />
        <div className="skeleton-box" style={{ width: '180px', height: '36px', borderRadius: '6px' }} />
      </div>

      {/* Online PDF Reader Box Skeleton */}
      <div style={{
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        height: '540px',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          border: '3px solid rgba(255, 255, 255, 0.2)',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'navSpin 0.7s linear infinite',
          marginBottom: '1rem',
        }} />
        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 0.35rem 0' }}>
          Opening Online FBISE Study Guide...
        </p>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
          Establishing secure, protected document reading session.
        </p>
      </div>
    </div>
  );
}

