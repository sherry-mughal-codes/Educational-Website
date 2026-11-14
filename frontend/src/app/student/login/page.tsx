'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function StudentLoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    const destination = params ? `/login/?${params}` : '/login/';
    router.replace(destination);
  }, [router, searchParams]);

  return (
    <div className="container student-auth-layout">
      <div className="spinner" aria-label="Redirecting to sign-in..."></div>
    </div>
  );
}

export default function StudentLoginPage() {
  return (
    <Suspense fallback={<div className="container student-auth-layout"><div className="spinner"></div></div>}>
      <StudentLoginRedirect />
    </Suspense>
  );
}
