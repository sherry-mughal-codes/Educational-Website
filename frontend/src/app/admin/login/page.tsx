'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/api';

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
    <div className="admin-login-layout">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-login-icon" aria-hidden="true">🔐</div>
          <h1 className="admin-login-title">Administrator Sign-In</h1>
          <p className="admin-login-subtitle">
            Secure content-management portal for FBISE educational resources.
          </p>
        </div>

        {errorMessage && (
          <div className="alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="admin-username" className="form-label">
              Admin Username
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
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
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

        <div className="admin-login-footer">
          <p className="admin-security-note">
            Enforced by Django RBAC. Only staff and superusers can access administrative endpoints.
          </p>
        </div>
      </div>
    </div>
  );
}
