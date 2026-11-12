'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { studentVerifyEmail, studentResendVerification } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !token) {
      setIsLoading(false);
      setErrorMessage('Invalid verification link. Missing authentication parameters.');
      return;
    }

    studentVerifyEmail(uid, token)
      .then((res) => {
        if (res.success) {
          setIsSuccess(true);
          setMessage(res.message || 'Email verified successfully! Your student account is now fully active.');
        } else {
          setIsSuccess(false);
          setErrorMessage(res.error || 'Verification token is invalid or has expired.');
        }
      })
      .catch(() => {
        setIsSuccess(false);
        setErrorMessage('A network error occurred while verifying your email. Please try again.');
      })
      .finally(() => setIsLoading(false));
  }, [uid, token]);

  const handleResend = async () => {
    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await studentResendVerification();
      if (res.success) {
        setResendStatus('A fresh verification link has been dispatched to your email.');
      } else {
        setResendStatus(res.error || 'Failed to resend verification email.');
      }
    } catch {
      setResendStatus('Network error while requesting verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '520px', margin: '0 auto' }}>
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}
      >
        {isLoading ? (
          <div>
            <div className="spinner" style={{ margin: '1rem auto' }}></div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Verifying your email address...
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
              Please wait while we validate your cryptographic token.
            </p>
          </div>
        ) : isSuccess ? (
          <div>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', color: '#047857' }}>✓</div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Email Verified Successfully!
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
              {message}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <Link
                href="/student/dashboard/"
                className="btn-primary"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
              >
                Go to Student Dashboard →
              </Link>
              <Link
                href="/"
                className="btn-outline-sm"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
              >
                Browse Federal Board Subjects
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', color: '#dc2626' }}>⚠️</div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Verification Failed
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
              {errorMessage}
            </p>

            {resendStatus && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.65rem',
                  fontSize: '0.8rem',
                  color: '#334155',
                  marginBottom: '1rem',
                }}
              >
                {resendStatus}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="btn-outline-sm"
                style={{ padding: '0.65rem', fontSize: '0.875rem' }}
              >
                {isResending ? 'Sending...' : 'Resend Verification Link'}
              </button>
              <Link
                href="/student/login/"
                className="btn-primary"
                style={{ padding: '0.65rem', fontSize: '0.875rem' }}
              >
                Sign In to Account →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '3rem 1rem', textAlign: 'center' }}><div className="spinner"></div></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

