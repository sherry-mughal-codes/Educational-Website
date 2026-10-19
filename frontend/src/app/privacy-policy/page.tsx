import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Privacy Policy & Cookie Disclosure | FBISE Platform',
  description: 'Detailed explanation of our data collection practices, Google Analytics usage, cookie policies, and student privacy protection.',
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
        <span className="badge-pill">Legal &amp; Transparency</span>
        <h1 className="page-title">Privacy Policy &amp; Cookie Disclosure</h1>
        <p className="page-subtitle">
          Last Updated: October 2026. This policy explains how we collect, handle, and safeguard
          information when you visit our educational portal.
        </p>
      </header>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Overview and Educational Scope</h2>
          <p>
            FBISE Educational Platform provides public syllabus notes and revision resources for
            students preparing for matriculation examinations. We are committed to transparency
            regarding data collection and respecting user privacy, especially that of students and minors.
          </p>
          <p className="disclaimer-callout">
            Note: The existence of this policy page represents our good-faith transparency regarding
            current data practices and does not independently constitute certification of statutory
            legal compliance. Users should review this policy periodically for updates.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Information We Collect</h2>
          <p>
            In Phase 1 and Phase 2 of our platform, we do not require account registration, login credentials,
            or student personal profiles. We do not collect:
          </p>
          <ul className="legal-list">
            <li>Student names, phone numbers, or national identity (CNIC/B-Form) numbers.</li>
            <li>Passwords, authentication tokens, or payment card details.</li>
            <li>Student school affiliations or examination roll numbers.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Google Analytics 4 (GA4) Traffic Measurement</h2>
          <p>
            When a measurement ID is configured by the site operator, this website utilizes Google
            Analytics 4 (GA4), a web analysis service provided by Google LLC (&ldquo;Google&rdquo;).
          </p>
          <p>
            GA4 uses cookies and client identifiers to collect anonymous information such as:
          </p>
          <ul className="legal-list">
            <li>Pages visited and routes navigated (e.g. <code>/class-9/physics/</code>).</li>
            <li>Approximate geographic region (country and city level).</li>
            <li>Device type, browser version, operating system, and screen resolution.</li>
            <li>Session duration and referral source.</li>
          </ul>
          <p>
            <strong>PII Sanitization Guarantee:</strong> Our application architecture enforces strict
            client-side filtering that strips sensitive fields (emails, passwords, names, and payment
            tokens) before any analytics event is dispatched. We do not pass personally identifiable
            information to Google Analytics.
          </p>
          <p>
            You may disable Google Analytics tracking by enabling &ldquo;Do Not Track&rdquo; in your
            browser settings or by utilizing the{' '}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-link"
            >
              Google Analytics Opt-out Browser Add-on
            </a>.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Cookies and Web Storage</h2>
          <p>
            Cookies are small text files placed on your device to ensure optimal website navigation.
            We use:
          </p>
          <ul className="legal-list">
            <li><strong>Essential Technical Cookies:</strong> Strictly required to maintain navigation state and cache static page assets.</li>
            <li><strong>Analytics Cookies:</strong> Placed by Google Analytics (such as <code>_ga</code> and <code>_ga_*</code>) to distinguish unique visits anonymously.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Advertising and Google AdSense Disclosure</h2>
          <p>
            To sustain continuous platform operations and provide free educational study guides, this
            platform may apply to serve advertisements through Google AdSense once approved.
          </p>
          <p>
            When Google AdSense is enabled:
          </p>
          <ul className="legal-list">
            <li>Third-party vendors, including Google, use cookies to serve ads based on a user&rsquo;s prior visits to this website or other websites.</li>
            <li>Google&rsquo;s use of advertising cookies enables it and its partners to serve ads to users based on their visit to our site and/or other sites on the Internet.</li>
            <li>Users may opt out of personalized advertising by visiting <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="inline-link">Google Ads Settings</a>.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Third-Party Links</h2>
          <p>
            Our website may contain links to external educational sources, including the official Federal
            Board portal (fbise.edu.pk). We do not control and are not responsible for the privacy
            practices or content of third-party websites.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Contact for Privacy Inquiries</h2>
          <p>
            For questions or concerns regarding this Privacy Policy, please contact our administrative
            team through our designated <a href="/contact/" className="inline-link">Contact Page</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
