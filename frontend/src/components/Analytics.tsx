'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { GA_MEASUREMENT_ID, IS_GA_ENABLED, IS_DEBUG_MODE, trackPageView, sanitizeUrl } from '@/lib/analytics';

/**
 * Route change tracker using App Router navigation hooks.
 * Wrapped in Suspense to satisfy Next.js useSearchParams requirements.
 */
function AnalyticsListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Exclude admin management routes from polluting public analytics reports
    if (!IS_GA_ENABLED || !pathname || pathname.startsWith('/admin')) return;

    const queryString = searchParams?.toString();
    const rawUrl = queryString ? `${pathname}?${queryString}` : pathname;
    const cleanUrl = sanitizeUrl(rawUrl);

    // Small delay allows document.title to be set by Next.js metadata
    const timer = setTimeout(() => {
      trackPageView(cleanUrl, document.title);
    }, 50);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}

/**
 * Main GA4 Analytics Component.
 * Injects gtag scripts only when NEXT_PUBLIC_GA_MEASUREMENT_ID is validly configured.
 * Configured with send_page_view: false to prevent duplicate page-views on initial load.
 */
export default function Analytics() {
  if (!IS_GA_ENABLED) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              send_page_view: false,
              debug_mode: ${IS_DEBUG_MODE}
            });
          `,
        }}
      />
      <Suspense fallback={null}>
        <AnalyticsListener />
      </Suspense>
    </>
  );
}
