'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { studentLogin } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import PasswordInput from '@/components/PasswordInput';

function StudentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/student/dashboard/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await studentLogin(email.trim().toLowerCase(), password);
      if (result.success) {
        trackEvent('login', { method: 'email' });
        router.push(returnUrl);
      } else {
        setErrorMessage(result.error || 'Invalid credentials or inactive account.');
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
          <span className="student-auth-badge">Student Portal</span>
          <h1 className="student-auth-title">Sign In to Your Account</h1>
          <p className="student-auth-subtitle">
            Access your purchased study notes, offline PDF downloads, and order history.
          </p>
        </div>

        {errorMessage && (
          <div className="alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="student-auth-form">
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Email Address <span className="req">*</span>
            </label>
            <input
              id="login-email"
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

          <div className="form-group">
            <div className="label-with-aside">
              <label htmlFor="login-password" className="form-label">
                Password <span className="req">*</span>
              </label>
              <Link href="/student/forgot-password/" className="form-forgot-link">
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In to Account →'}
          </button>
        </form>

        <div className="student-auth-footer">
          <p>
            Do not have an account yet?{' '}
            <Link href={`/student/register/${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`} className="inline-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StudentLoginPage() {
  return (
    <Suspense fallback={<div className="container student-auth-layout"><div className="spinner"></div></div>}>
      <StudentLoginForm />
    </Suspense>
  );
}
