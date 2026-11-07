'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await adminLogin(username.trim(), password);
      if (result.success) {
        router.push('/admin/resources/');
      } else {
        setErrorMessage(result.error || 'Invalid credentials or unauthorized account.');
      }
    } catch {
      setErrorMessage('A network error occurred while communicating with the authentication service.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container student-auth-layout">
      <div className="student-auth-card">
        <div className="student-auth-header">
          <span className="student-auth-badge">Staff Console</span>
          <h1 className="student-auth-title">Administrator Sign-In</h1>
          <p className="student-auth-subtitle">
            Secure content-management and academic publishing portal for FBISE.
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
            <label htmlFor="admin-username" className="form-label">
              Admin Username <span className="req">*</span>
            </label>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              placeholder="e.g. admin"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-password" className="form-label">
              Password <span className="req">*</span>
            </label>
            <PasswordInput
              id="admin-password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying Credentials...' : 'Sign In to Console →'}
          </button>
        </form>

        <div className="student-auth-footer">
          <p>
            Authorized academic personnel only.{' '}
            <Link href="/" className="inline-link">
              Return to Public Site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
