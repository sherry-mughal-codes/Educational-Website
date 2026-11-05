'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  studentGetDashboard,
  studentLogout,
  StudentDashboardData,
  getStudentPracticeProgress,
  StudentPracticeProgress,
} from '@/lib/api';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [practiceProgress, setPracticeProgress] = useState<StudentPracticeProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      studentGetDashboard(),
      getStudentPracticeProgress(),
    ])
      .then(([dashRes, progRes]) => {
        if (!dashRes) {
          router.replace('/student/login/?returnUrl=/student/dashboard/');
          return;
        }
        setData(dashRes);
        setPracticeProgress(progRes);
      })
      .catch(() => {
        setErrorMessage('Failed to load student dashboard. Please ensure you are logged in.');
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await studentLogout();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="container student-dashboard-wrapper">
        <div className="admin-table-loading">
          <div className="spinner"></div>
          <p>Loading your student dashboard and notes...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container student-dashboard-wrapper">
        <div className="admin-empty-state">
          <p className="empty-title">Session Expired or Login Required</p>
          <p className="empty-desc">Please sign in to access your purchased study guides and account details.</p>
          <Link href="/student/login/?returnUrl=/student/dashboard/" className="btn-primary">
            Sign In to Account →
          </Link>
        </div>
      </div>
    );
  }

  const { student, purchases, orders } = data;

  return (
    <div className="container student-dashboard-wrapper">
      {/* Student Profile Header */}
      <header className="dashboard-header-card">
        <div className="dashboard-profile-info">
          <div className="dashboard-avatar" aria-hidden="true">
            {student.full_name ? student.full_name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div>
            <div className="dashboard-name-row">
              <h1 className="dashboard-title">{student.full_name || 'FBISE Student'}</h1>
              <span className="badge-pill badge-neutral">Student Account</span>
            </div>
            <p className="dashboard-email">{student.email}</p>
            {student.date_joined && (
              <p className="dashboard-member-since">
                Member since {new Date(student.date_joined).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        <div className="dashboard-actions">
          <Link href="/class-9/" className="btn-outline-sm" title="Browse Class 9 notes">
            Class 9
          </Link>
          <Link href="/class-10/" className="btn-outline-sm" title="Browse Class 10 notes">
            Class 10
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="btn-outline-sm btn-logout-text"
            title="Log out of student account"
          >
            Sign Out
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="alert-error" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Interactive Practice & Chapter Mastery Section */}
      <section className="dashboard-section" style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.75rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '1rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🎯</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Interactive Practice &amp; Mastery
              </h2>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
              Your progress in FBISE chapter skills, instant feedback MCQs, and numerical exercises.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link
              href="/class-9/physics/practice/"
              className="btn-outline-sm"
              style={{ fontWeight: 600 }}
            >
              Practice Class 9 Skills →
            </Link>
            <Link
              href="/class-10/physics/practice/"
              className="btn-outline-sm"
              style={{ fontWeight: 600 }}
            >
              Practice Class 10 Skills →
            </Link>
          </div>
        </div>

        {/* Practice Stats Counters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Skills Completed</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
              {practiceProgress?.total_sessions_completed || 0}
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Questions Solved</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
              {practiceProgress?.total_questions_attempted || 0}
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Overall Accuracy</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857', marginTop: '0.25rem' }}>
              {practiceProgress?.overall_accuracy ? `${practiceProgress.overall_accuracy}%` : '0%'}
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>SmartScore Points</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857', marginTop: '0.25rem' }}>
              {practiceProgress?.total_score || 0} pts
            </div>
          </div>
        </div>

        {/* Recent Practice Sessions */}
        {practiceProgress && practiceProgress.recent_sessions.length > 0 && (
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>
              Recently Practiced Skills
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {practiceProgress.recent_sessions.slice(0, 5).map((s) => (
                <div
                  key={s.session_uuid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                    fontSize: '0.875rem',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{s.topic_title}</span>
                    <span style={{ color: '#64748b', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                      ({s.subject_name}, {s.class_name})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: 600, color: '#047857' }}>
                      {Math.round(s.accuracy_percentage)}% Accuracy
                    </span>
                    <Link
                      href={`/practice/${s.topic_slug}/`}
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: '#047857',
                        textDecoration: 'none',
                      }}
                    >
                      Practice Again →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Main Content Sections: Purchased Notes & Downloads */}
      <section className="dashboard-section">
        <div className="section-title-bar">
          <h2 className="dashboard-section-heading">
            My Purchased Notes &amp; Downloads ({purchases.length})
          </h2>
          <span className="section-subtext">Verified lifetime offline PDF download access</span>
        </div>

        {purchases.length === 0 ? (
          <div className="dashboard-empty-card">
            <div className="empty-icon" aria-hidden="true">📚</div>
            <h3 className="empty-card-heading">No Purchased Notes Yet</h3>
            <p className="empty-card-desc">
              You haven&apos;t purchased any complete subject guides yet. You can read notes online for free,
              or purchase a complete, high-resolution FBISE solved textbook packet for offline revision.
            </p>
            <div className="empty-card-actions">
              <Link href="/class-9/" className="btn-primary btn-sm">
                Explore Class 9 Notes
              </Link>
              <Link href="/class-10/" className="btn-primary btn-sm">
                Explore Class 10 Notes
              </Link>
            </div>
          </div>
        ) : (
          <div className="purchased-grid">
            {purchases.map((p) => {
              const fullDownloadUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${p.download_url}`;
              const formattedSize = p.file_size_bytes > 0
                ? `${(p.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
                : null;

              return (
                <div key={p.purchase_id} className="purchased-card">
                  <div className="purchased-card-top">
                    <div className="badge-group">
                      <span className="badge-pill">{p.class_name}</span>
                      <span className="badge-pill badge-neutral">{p.subject_name}</span>
                    </div>
                    <span className="status-pill pill-success">✓ Verified Purchase</span>
                  </div>

                  <h3 className="purchased-title">
                    <Link href={p.public_url} className="purchased-title-link">
                      {p.title}
                    </Link>
                  </h3>

                  <div className="purchased-meta">
                    <span>{p.file_format} Document</span>
                    {p.page_count > 0 && <span>• {p.page_count} Pages</span>}
                    {formattedSize && <span>• {formattedSize}</span>}
                  </div>

                  <div className="purchased-card-footer">
                    <a
                      href={fullDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary btn-sm"
                      title="Download the complete protected PDF document to your device"
                    >
                      Download PDF ↓
                    </a>
                    <Link
                      href={p.public_url}
                      className="btn-outline-sm"
                      title="Open interactive online reading view in browser"
                    >
                      Read Online 📖
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Purchase History & Orders Table */}
      <section className="dashboard-section">
        <div className="section-title-bar">
          <h2 className="dashboard-section-heading">Order &amp; Payment History</h2>
          <span className="section-subtext">All transactions associated with this student account</span>
        </div>

        {orders.length === 0 ? (
          <p className="no-orders-text">No order records found.</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Order Reference</th>
                  <th scope="col">Study Resource</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Payment Gateway</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <code className="order-code">{o.order_reference}</code>
                    </td>
                    <td>
                      <span className="order-resource-name">{o.resource_title}</span>
                    </td>
                    <td>
                      <span className="order-amount-text">
                        {o.amount} {o.currency}
                      </span>
                    </td>
                    <td>
                      <span className="order-gateway-badge">{o.payment_gateway.toUpperCase()}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${
                        o.status === 'paid' ? 'pill-success' :
                        o.status === 'pending' ? 'pill-draft' :
                        o.status === 'refunded' ? 'pill-refunded' : 'pill-failed'
                      }`}>
                        {o.status_display}
                      </span>
                    </td>
                    <td className="text-right text-muted">
                      {new Date(o.created_at).toLocaleDateString('en-PK', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

