import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import Analytics from '@/components/Analytics';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import NavigationProgressBar from '@/components/NavigationProgressBar';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'),
  title: {
    template: '%s | FBISE Educational Platform',
    default: 'FBISE Study Notes & Model Papers | Class 9 & 10 Prep',
  },
  description:
    'Official curriculum-aligned study notes, solved textbook exercises, and model papers for Federal Board (FBISE) Class 9 and Class 10 students.',
  keywords: [
    'FBISE',
    'Federal Board Islamabad',
    'Class 9 notes',
    'Class 10 notes',
    'solved model papers',
    'matric preparation',
    'FBISE SLO notes',
    'physics notes',
    'chemistry notes',
    'mathematics solutions',
  ],
  authors: [{ name: 'FBISE Educational Preparation' }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    siteName: 'FBISE Educational Platform',
    title: 'FBISE Class 9 & 10 Study Notes & Model Papers',
    description: 'Comprehensive curriculum-aligned study notes and model papers for Federal Board students.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FBISE Class 9 & 10 Study Notes & Model Papers',
    description: 'Comprehensive curriculum-aligned study notes and model papers for Federal Board students.',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {adsenseClientId && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body>
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        <Analytics />
        <Navigation />
        <main className="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
