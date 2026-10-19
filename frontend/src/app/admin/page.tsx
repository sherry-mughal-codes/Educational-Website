'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminGetMe } from '@/lib/api';

export default function AdminRootPage() {
  const router = useRouter();

  useEffect(() => {
    adminGetMe()
      .then((data) => {
        if (data && data.authenticated && data.user?.is_staff) {
          router.replace('/admin/resources/');
        } else {
          router.replace('/admin/login/');
        }
      })
      .catch(() => {
        router.replace('/admin/login/');
      });
  }, [router]);

  return (
    <div className="admin-loading-container">
      <div className="spinner" aria-label="Authenticating session..."></div>
      <p className="admin-loading-text">Verifying administrative credentials...</p>
    </div>
  );
}
