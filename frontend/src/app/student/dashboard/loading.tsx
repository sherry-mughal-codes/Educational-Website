export default function DashboardLoading() {
  return (
    <div className="container student-dashboard-wrapper" style={{ padding: '2rem 1rem' }}>
      {/* Student Profile Header Skeleton */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
      }}>
        <div className="skeleton-box" style={{ width: '64px', height: '64px', borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton-box" style={{ width: '220px', height: '24px', borderRadius: '4px', marginBottom: '0.5rem' }} />
          <div className="skeleton-box" style={{ width: '160px', height: '14px', borderRadius: '4px' }} />
        </div>
      </div>

      {/* Cards Skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1.25rem',
            }}
          >
            <div className="skeleton-box" style={{ width: '100px', height: '14px', borderRadius: '4px', marginBottom: '0.75rem' }} />
            <div className="skeleton-box" style={{ width: '70%', height: '22px', borderRadius: '4px', marginBottom: '0.5rem' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '12px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

