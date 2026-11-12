export default function ClassLoading() {
  return (
    <div className="container" style={{ padding: '1.5rem 1rem' }}>
      {/* Breadcrumb Skeleton */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <div className="skeleton-box" style={{ width: '60px', height: '14px', borderRadius: '4px' }} />
        <div style={{ color: '#cbd5e1' }}>/</div>
        <div className="skeleton-box" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
      </div>

      {/* Class Banner Skeleton */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div className="skeleton-box" style={{ width: '180px', height: '28px', borderRadius: '6px', marginBottom: '0.75rem' }} />
        <div className="skeleton-box" style={{ width: '85%', height: '16px', borderRadius: '4px', marginBottom: '0.5rem' }} />
        <div className="skeleton-box" style={{ width: '60%', height: '16px', borderRadius: '4px' }} />
      </div>

      {/* Subject Cards Grid Skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
      }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="skeleton-box" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-box" style={{ width: '70%', height: '18px', borderRadius: '4px', marginBottom: '0.35rem' }} />
                <div className="skeleton-box" style={{ width: '40%', height: '12px', borderRadius: '4px' }} />
              </div>
            </div>
            <div className="skeleton-box" style={{ width: '100%', height: '12px', borderRadius: '4px' }} />
            <div className="skeleton-box" style={{ width: '90%', height: '12px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

