export default function SubjectLoading() {
  return (
    <div className="container" style={{ padding: '1.5rem 1rem' }}>
      {/* Breadcrumb Skeleton */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <div className="skeleton-box" style={{ width: '50px', height: '14px', borderRadius: '4px' }} />
        <div style={{ color: '#cbd5e1' }}>/</div>
        <div className="skeleton-box" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
        <div style={{ color: '#cbd5e1' }}>/</div>
        <div className="skeleton-box" style={{ width: '100px', height: '14px', borderRadius: '4px' }} />
      </div>

      {/* Subject Header Banner Skeleton */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.75rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div className="skeleton-box" style={{ width: '80px', height: '20px', borderRadius: '4px' }} />
          <div className="skeleton-box" style={{ width: '100px', height: '20px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton-box" style={{ width: '240px', height: '32px', borderRadius: '6px', marginBottom: '0.75rem' }} />
        <div className="skeleton-box" style={{ width: '70%', height: '14px', borderRadius: '4px' }} />
      </div>

      {/* Resource Items Skeleton List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div className="skeleton-box" style={{ width: '60%', height: '20px', borderRadius: '4px', marginBottom: '0.5rem' }} />
              <div className="skeleton-box" style={{ width: '85%', height: '14px', borderRadius: '4px' }} />
            </div>
            <div className="skeleton-box" style={{ width: '130px', height: '36px', borderRadius: '6px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

