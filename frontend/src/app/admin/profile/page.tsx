'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminGetMe, adminLogout, adminUpdateProfile, AdminUser } from '@/lib/api';
import AdminNav from '@/components/AdminNav';
import PasswordInput from '@/components/PasswordInput';

export default function AdminProfilePage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form editable state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    adminGetMe()
      .then((res) => {
        if (!res.authenticated || !res.user) {
          router.replace('/login/?returnUrl=/admin/profile/&error=admin_required');
          return;
        }
        setAdmin(res.user);
        setFullName(res.user.full_name || '');
        setEmail(res.user.email || '');
        setUsername(res.user.username || '');
      })
      .catch(() => {
        router.replace('/login/?returnUrl=/admin/profile/&error=admin_required');
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch {
      // ignore
    }
    router.push('/login/');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username.trim()) {
      setErrorMessage('Username is required.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        setErrorMessage('New password must be at least 8 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('New password and confirmation do not match.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await adminUpdateProfile({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim(),
        new_password: newPassword ? newPassword : undefined,
      });

      if (res.success && res.user) {
        setAdmin(res.user);
        setFullName(res.user.full_name || '');
        setEmail(res.user.email || '');
        setUsername(res.user.username || '');
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMessage('✓ Profile information updated successfully.');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || 'Failed to update profile information.');
      }
    } catch {
      setErrorMessage('A network error occurred while updating profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-page-wrapper">
        <AdminNav />
        <main className="container admin-content">
          <div className="admin-table-loading" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '0.75rem', color: '#64748b', fontSize: '0.875rem' }}>
              Loading administrator profile...
            </p>
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

      <main className="container admin-content" style={{ maxWidth: '820px', margin: '0 auto', padding: '1.25rem 1rem' }}>
        {/* Compact Page Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.85rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🛡️</span>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Administrator Profile
              </h1>
              <span style={{
                background: '#ecfdf5',
                color: '#047857',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.55rem',
                borderRadius: '9999px',
                border: '1px solid #a7f3d0',
              }}>
                Active Admin
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
              Manage personal credentials, contact email, and administrative preferences.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline-sm"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', fontWeight: 600 }}
            >
              Public Site ↗
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-outline-sm btn-logout-text"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', fontWeight: 600 }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="alert-success" role="alert" style={{ marginBottom: '1rem', padding: '0.65rem 0.95rem', fontSize: '0.85rem' }}>
            <span className="alert-icon">✓</span>
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="alert-error" role="alert" style={{ marginBottom: '1rem', padding: '0.65rem 0.95rem', fontSize: '0.85rem' }}>
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Compact Profile Header Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '1rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
            color: '#ffffff',
            fontSize: '1.2rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {admin.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {admin.full_name || admin.username}
              </span>
              <span style={{ color: '#64748b', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                @{admin.username}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600, marginTop: '0.1rem' }}>
              {roleTitle}
            </div>
          </div>
        </div>

        {/* Editable Profile Information Form */}
        <section style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
          marginBottom: '1.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Edit Personal Information
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Updates save directly to your administrator account
            </span>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                  placeholder="e.g. Administrator"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                  Username <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                  placeholder="admin"
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                placeholder="admin@fbise-notes.local"
              />
            </div>

            {/* Change Password Block */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                  Change Password (Optional)
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Leave blank to keep your current password
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                    New Password
                  </label>
                  <PasswordInput
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                    Confirm New Password
                  </label>
                  <PasswordInput
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary"
                style={{
                  background: '#047857',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                }}
              >
                {isSaving ? 'Saving Changes...' : '💾 Save Profile Changes'}
              </button>
            </div>
          </form>
        </section>

        {/* Compact Read-Only Metadata Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.65rem',
          marginBottom: '1.25rem',
        }}>
          <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              System Role
            </div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#047857', marginTop: '0.15rem' }}>
              {admin.is_superuser ? 'Superuser' : 'Staff Admin'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Privileges
            </div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginTop: '0.15rem' }}>
              Full Content &amp; User Control
            </div>
          </div>

          {admin.date_joined && (
            <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Account Created
              </div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginTop: '0.15rem' }}>
                {new Date(admin.date_joined).toLocaleDateString('en-PK', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
          )}
        </div>

        {/* Compact Admin Sections Shortcut Grid */}
        <section style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '1rem 1.25rem',
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.65rem 0' }}>
            Administrative Control Sections
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.6rem',
          }}>
            <Link
              href="/admin/resources/"
              style={{
                textDecoration: 'none',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <span style={{ fontSize: '1.15rem' }}>📚</span>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem' }}>Study Resources</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Manage notes, papers &amp; PDFs</div>
              </div>
            </Link>

            <Link
              href="/admin/practice/"
              style={{
                textDecoration: 'none',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <span style={{ fontSize: '1.15rem' }}>🎯</span>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem' }}>Practice Questions</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>MCQs &amp; chapter quizzes</div>
              </div>
            </Link>

            <Link
              href="/admin/structure/"
              style={{
                textDecoration: 'none',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <span style={{ fontSize: '1.15rem' }}>📑</span>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem' }}>Curriculum Structure</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Units, syllabus &amp; taxonomy</div>
              </div>
            </Link>

            <Link
              href="/admin/orders/"
              style={{
                textDecoration: 'none',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <span style={{ fontSize: '1.15rem' }}>💳</span>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem' }}>Orders &amp; Sales</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Payment receipts &amp; access</div>
              </div>
            </Link>

            <Link
              href="/admin/pages/"
              style={{
                textDecoration: 'none',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <span style={{ fontSize: '1.15rem' }}>📝</span>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8125rem' }}>Site Pages</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>About Us &amp; Contact info</div>
              </div>
            </Link>

            <Link
              href="/admin/resources/new/"
              style={{
                textDecoration: 'none',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px dashed #047857',
                background: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <span style={{ fontSize: '1.15rem' }}>➕</span>
              <div>
                <div style={{ fontWeight: 700, color: '#047857', fontSize: '0.8125rem' }}>Add New Resource</div>
                <div style={{ fontSize: '0.72rem', color: '#065f46' }}>Upload PDF or past paper</div>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
