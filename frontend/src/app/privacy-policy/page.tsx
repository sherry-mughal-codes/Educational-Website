import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Privacy Policy | FBISE Educational Platform',
  description: 'How we collect, protect, and use student data on the FBISE Educational Platform.',
  alternates: {
    canonical: '/privacy-policy/',
  },
};

export default function PrivacyPolicyPage() {
  const breadcrumbs = [{ label: 'Privacy Policy' }];

  return (
    <div className="container">
      <Breadcrumbs items={breadcrumbs} />

      <header className="page-header">
        <span className="badge-pill">Transparency &amp; Trust</span>
        <h1 className="page-title">Privacy Policy</h1>
        <p className="page-subtitle">
          We respect the privacy of Federal Board students and are committed to keeping your educational data secure.
        </p>
      </header>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Free Browsing &amp; Reading</h2>
          <p>
            You do not need to register an account to browse subjects, read study notes online, or practice interactive chapter questions.
            Guest users can freely access published FBISE curriculum materials without submitting any personal data.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Information We Collect for Accounts &amp; Purchases</h2>
          <p>When you create a student account or order offline study packets, we collect only what is necessary:</p>
          <ul className="legal-list">
            <li><strong>Account Details:</strong> Full name, email address, and an encrypted password.</li>
            <li><strong>Payment Verification:</strong> Transaction reference IDs and payment receipts submitted for JazzCash, Easypaisa, or Bank Transfer orders. We never collect or store banking PINs or debit card details.</li>
            <li><strong>Learning Progress:</strong> Completed practice sessions and scores to help you track your exam readiness.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Website Traffic &amp; Google Analytics 4</h2>
          <p>
            We use Google Analytics 4 (GA4) with IP anonymization to understand overall site traffic (such as popular subjects and reading duration).
            GA4 collects anonymous device metrics and page views. No names, emails, or personal identifiers are ever sent to analytics.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Cookies</h2>
          <p>We use minimal technical cookies to:</p>
          <ul className="legal-list">
            <li>Keep your student session signed in while navigating notes and practice.</li>
            <li>Distinguish anonymous analytics sessions to improve website performance.</li>
          </ul>
          <p>You can clear or block cookies in your browser settings at any time.</p>
        </section>

        <section className="legal-section">
          <h2>5. Data Protection &amp; Student Rights</h2>
          <p>
            We do not sell, rent, or monetize student information with third parties or advertisers.
            You have the right to request a copy of your account data or ask for complete deletion of your student account by emailing{' '}
            <Link href="/contact/" className="inline-link">Academic Support</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
