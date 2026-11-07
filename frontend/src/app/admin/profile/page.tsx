'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminGetMe, adminLogout, AdminUser } from '@/lib/api';
import AdminNav from '@/components/AdminNav';

export default function AdminProfilePage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminGetMe()
      .then((res) => {
        if (!res.authenticated || !res.user) {
          router.replace('/admin/login/?returnUrl=/admin/profile/');
          return;
        }
        setAdmin(res.user);
      })
      .catch(() => {
        router.replace('/admin/login/?returnUrl=/admin/profile/');
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch {
      // ignore
    }
    router.push('/admin/login/');
  };

  if (isLoading) {
    return (
      <div className="admin-page-wrapper">
        <AdminNav />
        <main className="container admin-content">
          <div className="admin-table-loading" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading administrator profile...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  const roleTitle = admin.is_superuser
    ? 'Superuser / Full System Administrator'
    : admin.is_staff
    ? 'Staff Administrator'
    : 'Authorized Staff';

  return (
    <div className="admin-page-wrapper">
      <AdminNav />

      <main className="container admin-content" style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Page Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '1.25rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🛡️</span>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Administrator Profile
              </h1>
              <span style={{
                background: '#ecfdf5',
                color: '#047857',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                border: '1px solid #a7f3d0',
              }}>
                Active Admin
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
              Personal account details, security credentials, and administrative management access.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline-sm"
              style={{ fontWeight: 600 }}
            >
              View Public Site ↗
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-outline-sm btn-logout-text"
              style={{ fontWeight: 600 }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Personal Information Card */}
        <section style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            marginBottom: '2rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid #f1f5f9',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
              color: '#ffffff',
              fontSize: '1.75rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(4, 120, 87, 0.2)',
            }}>
              {admin.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                {admin.full_name || admin.username}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ color: '#64748b', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                  @{admin.username}
                </span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ color: '#047857', fontSize: '0.8125rem', fontWeight: 600 }}>
                  {roleTitle}
                </span>
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
            Personal Account Information
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}>
            <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Username
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                {admin.username}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Email Address
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                {admin.email || 'None registered (Superuser login)'}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                System Role &amp; Access Level
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#047857', marginTop: '0.25rem' }}>
                {roleTitle}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Staff Privileges
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#334155', marginTop: '0.25rem' }}>
                Full Administrative &amp; Content Management Access
              </div>
            </div>

            {admin.date_joined && (
              <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Account Created
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#334155', marginTop: '0.25rem' }}>
                  {new Date(admin.date_joined).toLocaleDateString('en-PK', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
            )}

            {admin.last_login && (
              <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  Last Active Session
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#334155', marginTop: '0.25rem' }}>
                  {new Date(admin.last_login).toLocaleDateString('en-PK', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Administrative Management Quick Actions */}
        <section style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Administrative Control Sections
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1.5rem 0' }}>
            Direct access to all portal content, interactive practice banks, and operational management.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
          }}>
            <Link
              href="/admin/resources/"
              style={{
                textDecoration: 'none',
                display: 'block',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📚</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', marginBottom: '0.25rem' }}>
                Study Resources
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Upload, edit, delete, and publish Federal Board notes, model papers, and past questions.
              </p>
            </Link>

            <Link
              href="/admin/practice/"
              style={{
                textDecoration: 'none',
                display: 'block',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎯</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', marginBottom: '0.25rem' }}>
                Practice &amp; Questions
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Manage interactive chapter topics, MCQs, True/False, numericals, and explanations.
              </p>
            </Link>

            <Link
              href="/admin/structure/"
              style={{
                textDecoration: 'none',
                display: 'block',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📑</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', marginBottom: '0.25rem' }}>
                Curriculum Structure
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Organize Class 9 &amp; 10 subjects, syllabus overviews, and chapter arrangements.
              </p>
            </Link>

            <Link
              href="/admin/orders/"
              style={{
                textDecoration: 'none',
                display: 'block',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💳</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', marginBottom: '0.25rem' }}>
                Orders &amp; Sales
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Review student payment receipts, order references, and verified download privileges.
              </p>
            </Link>

            <Link
              href="/admin/pages/"
              style={{
                textDecoration: 'none',
                display: 'block',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📝</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', marginBottom: '0.25rem' }}>
                Site Pages Content
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Edit live About Us and Contact information directly without code changes.
              </p>
            </Link>

            <Link
              href="/admin/resources/new/"
              style={{
                textDecoration: 'none',
                display: 'block',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px dashed #047857',
                background: '#f0fdf4',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>➕</div>
              <div style={{ fontWeight: 700, color: '#047857', fontSize: '1rem', marginBottom: '0.25rem' }}>
                Add New Resource
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#065f46', margin: 0, lineHeight: 1.4 }}>
                Publish a new textbook PDF, past paper, or revision note package to the website.
              </p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

