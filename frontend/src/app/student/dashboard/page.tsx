'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { studentGetDashboard, studentLogout, StudentDashboardData } from '@/lib/api';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    studentGetDashboard()
      .then((res) => {
        if (!res) {
          router.replace('/student/login/?returnUrl=/student/dashboard/');
          return;
        }
        setData(res);
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
