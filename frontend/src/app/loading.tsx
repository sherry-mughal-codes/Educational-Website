export default function GlobalLoading() {
  return (
    <div className="container" style={{ padding: '3rem 1rem', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        maxWidth: '460px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
      }}>
        {/* Animated FBISE Spinner */}
        <div style={{ position: 'relative', width: '56px', height: '56px', margin: '0 auto 1.25rem' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3.5px solid #e2e8f0',
          }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3.5px solid transparent',
            borderTopColor: '#047857',
            borderRightColor: '#10b981',
            animation: 'navSpin 0.7s linear infinite',
          }} />
          <span style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
          }}>
            📚
          </span>
        </div>

        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
          Loading FBISE Material...
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
          Preparing notes, syllabus guidelines, and curriculum resources.
        </p>

        {/* Shimmer skeleton bar */}
        <div style={{
          height: '6px',
          width: '100%',
          background: '#f1f5f9',
          borderRadius: '9999px',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
            animation: 'skeletonShimmer 1.4s infinite',
          }} />
        </div>
      </div>
    </div>
  );
}

