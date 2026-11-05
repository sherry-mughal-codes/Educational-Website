'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { studentConfirmPasswordReset } from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!uid || !token) {
      setErrorMessage('Invalid or missing password reset link parameters. Please request a new link.');
      return;
    }

    if (!newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await studentConfirmPasswordReset({
        uid,
        token,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });

      if (result.success) {
        setSuccessMessage(result.message || 'Your password has been reset successfully.');
      } else {
        setErrorMessage(result.error || 'Failed to reset password. Link may have expired.');
      }
    } catch {
      setErrorMessage('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container student-auth-layout">
      <div className="student-auth-card">
        <div className="student-auth-header">
          <span className="student-auth-badge">Security</span>
          <h1 className="student-auth-title">Set New Password</h1>
          <p className="student-auth-subtitle">
            Enter a strong new password for your FBISE educational account.
          </p>
        </div>

        {successMessage && (
          <div className="alert-success" role="alert">
            <span className="alert-icon">✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {!successMessage ? (
          <form onSubmit={handleSubmit} className="student-auth-form">
            <div className="form-group">
              <label htmlFor="new-pw" className="form-label">
                New Password <span className="req">*</span>
              </label>
              <input
                id="new-pw"
                type="password"
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-pw" className="form-label">
                Confirm New Password <span className="req">*</span>
              </label>
              <input
                id="confirm-pw"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Re-enter new password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                className="form-input"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Updating Password...' : 'Save New Password →'}
            </button>
          </form>
        ) : (
          <div className="auth-done-box">
            <Link href="/student/login/" className="btn-primary w-full text-center">
              Proceed to Sign In →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="container student-auth-layout"><div className="spinner"></div></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
