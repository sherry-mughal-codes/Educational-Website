'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AdminLoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const currentParams = new URLSearchParams(searchParams.toString());
    if (!currentParams.has('returnUrl')) {
      currentParams.set('returnUrl', '/admin/resources/');
    }
    router.replace(`/login/?${currentParams.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="container student-auth-layout">
      <div className="spinner" aria-label="Redirecting to sign-in..."></div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="container student-auth-layout"><div className="spinner"></div></div>}>
      <AdminLoginRedirect />
    </Suspense>
  );
}
