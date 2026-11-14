'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { studentLogin } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import PasswordInput from '@/components/PasswordInput';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '';
  const errorParam = searchParams.get('error') || '';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedIdent = identifier.trim();
    if (!trimmedIdent || !password) {
      setErrorMessage('Please enter your email or username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await studentLogin(trimmedIdent, password);
      if (result.success && result.user) {
        trackEvent('login', { method: 'unified' });
        const isAdmin = Boolean(result.user.is_staff || result.role === 'admin');
        
        if (isAdmin) {
          if (returnUrl && returnUrl.startsWith('/admin')) {
            router.push(returnUrl);
          } else {
            router.push('/admin/resources/');
          }
        } else {
          if (returnUrl && !returnUrl.startsWith('/admin')) {
            router.push(returnUrl);
          } else {
            router.push('/student/dashboard/');
          }
        }
      } else {
        setErrorMessage(result.error || 'Invalid credentials or inactive account.');
      }
    } catch {
      setErrorMessage('A network error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container student-auth-layout">
      <div className="student-auth-card">
        <div className="student-auth-header">
          <span className="student-auth-badge">Account Portal</span>
          <h1 className="student-auth-title">Sign In to Your Account</h1>
          <p className="student-auth-subtitle">
            Sign in with your credentials to access study notes, offline downloads, or manage educational resources.
          </p>
        </div>

        {errorParam === 'admin_required' && (
          <div className="alert-warning" role="alert" style={{ marginBottom: '1.25rem' }}>
            <span className="alert-icon">🔒</span>
            <span>
              <strong>Staff Access Required:</strong> Please sign in with an administrator account to access administrative features.
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="alert-error" role="alert" style={{ marginBottom: '1.25rem' }}>
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="student-auth-form">
          <div className="form-group">
            <label htmlFor="login-identifier" className="form-label">
              Email Address or Username <span className="req">*</span>
            </label>
            <input
              id="login-identifier"
              type="text"
              required
              autoComplete="username"
              placeholder="e.g. student@example.com or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
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
            <Link
              href={`/student/register/${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
              className="inline-link"
            >
              Create student account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container student-auth-layout"><div className="spinner"></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
