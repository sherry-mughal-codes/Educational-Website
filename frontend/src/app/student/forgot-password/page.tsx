'use client';

import { useState } from 'react';
import Link from 'next/link';
import { studentRequestPasswordReset } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await studentRequestPasswordReset(email.trim().toLowerCase());
      if (result.success) {
        setSuccessMessage(
          result.message || 'If an account exists with this email address, password reset instructions have been dispatched.'
        );
      } else {
        setErrorMessage(result.error || 'Failed to dispatch reset instructions.');
      }
    } catch {
      setErrorMessage('A network error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container student-auth-layout">
      <div className="student-auth-card">
        <div className="student-auth-header">
          <span className="student-auth-badge">Account Recovery</span>
          <h1 className="student-auth-title">Reset Password</h1>
          <p className="student-auth-subtitle">
            Enter your registered email address to receive password reset instructions.
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
              <label htmlFor="reset-email" className="form-label">
                Email Address <span className="req">*</span>
              </label>
              <input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Sending Instructions...' : 'Send Password Reset Link →'}
            </button>
          </form>
        ) : (
          <div className="auth-done-box">
            <p className="auth-done-note">
              Please check your inbox (and spam folder) for an email with your secure password reset link.
            </p>
            <Link href="/student/login/" className="btn-outline-sm w-full text-center">
              ← Return to Sign In
            </Link>
          </div>
        )}

        <div className="student-auth-footer">
          <p>
            Remember your password?{' '}
            <Link href="/student/login/" className="inline-link">
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
