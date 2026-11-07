'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { studentRegister } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import PasswordInput from '@/components/PasswordInput';

function StudentRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/student/dashboard/';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters in length.');
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await studentRegister({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        password_confirm: passwordConfirm,
      });

      if (result.success) {
        // Dispatch GA4 sign_up event without PII
        trackEvent('sign_up', { method: 'email' });
        router.push(returnUrl);
      } else {
        setErrorMessage(result.error || 'Registration could not be completed.');
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
          <span className="student-auth-badge">Student Portal</span>
          <h1 className="student-auth-title">Create Student Account</h1>
          <p className="student-auth-subtitle">
            Sign up to access verified FBISE notes and purchase complete subject PDF guides.
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
            <label htmlFor="reg-name" className="form-label">
              Full Name <span className="req">*</span>
            </label>
            <input
              id="reg-name"
              type="text"
              required
              autoComplete="name"
              placeholder="e.g. Muhammad Ali"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">
              Email Address <span className="req">*</span>
            </label>
            <input
              id="reg-email"
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

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="reg-password" className="form-label">
                Password <span className="req">*</span>
              </label>
              <PasswordInput
                id="reg-password"
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm" className="form-label">
                Confirm Password <span className="req">*</span>
              </label>
              <PasswordInput
                id="reg-confirm"
                required
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Complete Registration →'}
          </button>
        </form>

        <div className="student-auth-footer">
          <p>
            Already have an account?{' '}
            <Link href={`/student/login/${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`} className="inline-link">
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StudentRegisterPage() {
  return (
    <Suspense fallback={<div className="container student-auth-layout"><div className="spinner"></div></div>}>
      <StudentRegisterForm />
    </Suspense>
  );
}
