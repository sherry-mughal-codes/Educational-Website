export default function CheckoutLoading() {
  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
      }}>
        <div className="skeleton-box" style={{ width: '180px', height: '24px', borderRadius: '4px', marginBottom: '0.75rem' }} />
        <div className="skeleton-box" style={{ width: '320px', height: '16px', borderRadius: '4px', marginBottom: '1.5rem' }} />

        {/* Order Summary Skeleton */}
        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <div className="skeleton-box" style={{ width: '100%', height: '18px', borderRadius: '4px', marginBottom: '0.5rem' }} />
          <div className="skeleton-box" style={{ width: '60%', height: '18px', borderRadius: '4px' }} />
        </div>

        {/* Form Fields Skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton-box" style={{ width: '100%', height: '42px', borderRadius: '6px' }} />
          <div className="skeleton-box" style={{ width: '100%', height: '42px', borderRadius: '6px' }} />
          <div className="skeleton-box" style={{ width: '140px', height: '44px', borderRadius: '6px', alignSelf: 'flex-end', marginTop: '0.5rem' }} />
        </div>
      </div>
    </div>
  );
}

