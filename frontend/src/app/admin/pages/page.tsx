'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminNav from '@/components/AdminNav';
import { adminGetMe, adminGetAllPages, adminUpdatePageContent, SitePageContentItem, PaymentAccountItem } from '@/lib/api';

export default function AdminPagesContentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'about' | 'contact' | 'payment'>('about');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // About form state
  const [aboutTitle, setAboutTitle] = useState('');
  const [aboutSubtitle, setAboutSubtitle] = useState('');
  const [missionTitle, setMissionTitle] = useState('');
  const [missionText, setMissionText] = useState('');
  const [curriculumHeading, setCurriculumHeading] = useState('');
  const [curriculumPointsText, setCurriculumPointsText] = useState('');
  const [principlesHeading, setPrinciplesHeading] = useState('');
  const [principlesPointsText, setPrinciplesPointsText] = useState('');
  const [noticeHeading, setNoticeHeading] = useState('');
  const [noticeText, setNoticeText] = useState('');

  // Contact form state
  const [contactTitle, setContactTitle] = useState('');
  const [contactSubtitle, setContactSubtitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [responseTime, setResponseTime] = useState('');
  const [location, setLocation] = useState('');
  const [inquiryHeading, setInquiryHeading] = useState('');
  const [inquiryStepsText, setInquiryStepsText] = useState('');

  // Payment Accounts & Steps state
  const [paymentTitle, setPaymentTitle] = useState('Payment Accounts & Instructions');
  const [paymentSubtitle, setPaymentSubtitle] = useState('Official Pakistani Receiving Accounts & Student Instructions');
  const [whatsappNumber, setWhatsappNumber] = useState('0300-1234567');
  const [paymentInstructionsText, setPaymentInstructionsText] = useState('');
  const [paymentNoticeText, setPaymentNoticeText] = useState('');
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountItem[]>([]);

  // Check auth & query tab
  useEffect(() => {
    adminGetMe()
      .then((data) => {
        if (!data || !data.authenticated || !data.user?.is_staff) {
          router.replace('/login/?returnUrl=/admin/pages/&error=admin_required');
        }
      })
      .catch(() => {
        router.replace('/login/?returnUrl=/admin/pages/&error=admin_required');
      });

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'payment' || tabParam === 'about' || tabParam === 'contact') {
        setActiveTab(tabParam as any);
      }
    }
  }, [router]);

  // Load pages data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await adminGetAllPages();
        if (res?.pages) {
          const ab = res.pages.about;
          if (ab) {
            setAboutTitle(ab.title || '');
            setAboutSubtitle(ab.subtitle || '');
            setMissionTitle(ab.data?.mission_title || '');
            setMissionText(ab.data?.mission_text || '');
            setCurriculumHeading(ab.data?.curriculum_heading || 'Curriculum Coverage');
            setCurriculumPointsText(Array.isArray(ab.data?.curriculum_points) ? ab.data.curriculum_points.join('\n') : '');
            setPrinciplesHeading(ab.data?.principles_heading || 'Platform Standards');
            setPrinciplesPointsText(Array.isArray(ab.data?.principles_points) ? ab.data.principles_points.join('\n') : '');
            setNoticeHeading(ab.data?.notice_heading || 'Independent Educational Notice');
            setNoticeText(ab.data?.notice_text || '');
          }

          const ct = res.pages.contact;
          if (ct) {
            setContactTitle(ct.title || '');
            setContactSubtitle(ct.subtitle || '');
            setEmail(ct.data?.email || '');
            setPhone(ct.data?.phone || '');
            setWhatsapp(ct.data?.whatsapp || '');
            setResponseTime(ct.data?.response_time || '');
            setLocation(ct.data?.location || '');
            setInquiryHeading(ct.data?.inquiry_heading || 'Reporting an Error or Note Correction');
            setInquiryStepsText(Array.isArray(ct.data?.inquiry_steps) ? ct.data.inquiry_steps.join('\n') : '');
          }

          const ps = res.pages.payment_settings;
          if (ps) {
            setPaymentTitle(ps.title || 'Payment Accounts & Instructions');
            setPaymentSubtitle(ps.subtitle || '');
            setWhatsappNumber(ps.data?.whatsapp_number || '0300-1234567');
            setPaymentNoticeText(ps.data?.notice_text || '');
            const steps = Array.isArray(ps.data?.instructions_steps)
              ? ps.data.instructions_steps.join('\n')
              : '';
            setPaymentInstructionsText(steps);
            setPaymentAccounts(Array.isArray(ps.data?.accounts) ? ps.data.accounts : []);
          }
        }
      } catch {
        setErrorMessage('Failed to load page content.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAddAccount = () => {
    const newAcc: PaymentAccountItem = {
      id: `acc-${Date.now()}`,
      provider: 'JazzCash',
      account_title: 'FBISE Educational Notes Official',
      account_number: '',
      iban: '',
      is_active: true,
      notes: 'Mobile Account',
    };
    setPaymentAccounts([...paymentAccounts, newAcc]);
  };

  const handleUpdateAccount = (index: number, field: keyof PaymentAccountItem, value: any) => {
    const updated = [...paymentAccounts];
    updated[index] = { ...updated[index], [field]: value };
    setPaymentAccounts(updated);
  };

  const handleRemoveAccount = (index: number) => {
    setPaymentAccounts(paymentAccounts.filter((_, i) => i !== index));
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const instructions_steps = paymentInstructionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      title: paymentTitle.trim(),
      subtitle: paymentSubtitle.trim(),
      data: {
        whatsapp_number: whatsappNumber.trim(),
        instructions_steps,
        notice_text: paymentNoticeText.trim(),
        accounts: paymentAccounts,
      },
    };

    const res = await adminUpdatePageContent('payment_settings', payload);
    setIsSaving(false);
    if (res.success) {
      setSuccessMessage('✓ Payment receiving accounts and instructions saved successfully and updated live on the checkout page.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setErrorMessage(res.error || 'Failed to update payment settings.');
    }
  };

  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const curriculum_points = curriculumPointsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const principles_points = principlesPointsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      title: aboutTitle.trim(),
      subtitle: aboutSubtitle.trim(),
      data: {
        mission_title: missionTitle.trim(),
        mission_text: missionText.trim(),
        curriculum_heading: curriculumHeading.trim(),
        curriculum_points,
        principles_heading: principlesHeading.trim(),
        principles_points,
        notice_heading: noticeHeading.trim(),
        notice_text: noticeText.trim(),
      },
    };

    const res = await adminUpdatePageContent('about', payload);
    setIsSaving(false);
    if (res.success) {
      setSuccessMessage('✓ About Us page content saved and live on the website.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error || 'Failed to update About page.');
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const inquiry_steps = inquiryStepsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      title: contactTitle.trim(),
      subtitle: contactSubtitle.trim(),
      data: {
        email: email.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        response_time: responseTime.trim(),
        location: location.trim(),
        inquiry_heading: inquiryHeading.trim(),
        inquiry_steps,
      },
    };

    const res = await adminUpdatePageContent('contact', payload);
    setIsSaving(false);
    if (res.success) {
      setSuccessMessage('✓ Contact Support page content saved and live on the website.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error || 'Failed to update Contact page.');
    }
  };

  return (
    <div className="admin-page-wrapper">
      <AdminNav />

      <main className="container admin-main-content">
        <div className="admin-header-row">
          <div>
            <h1 className="admin-heading">Site Content Management</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
              Edit and customize public informational pages (About Us and Contact Support) without changing application code.
            </p>
          </div>
          <div className="admin-actions-group">
            <Link
              href={activeTab === 'about' ? '/about/' : '/contact/'}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline-sm"
              title="Preview public page in new tab"
            >
              Preview Live Page ↗
            </Link>
          </div>
        </div>

        {/* Tab selection */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e2e8f0', margin: '1.25rem 0 1.5rem 0' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('about'); setSuccessMessage(null); setErrorMessage(null); }}
            style={{
              padding: '0.625rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.9375rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'about' ? '3px solid #047857' : '3px solid transparent',
              color: activeTab === 'about' ? '#047857' : '#64748b',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            📖 About Us Page
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('contact'); setSuccessMessage(null); setErrorMessage(null); }}
            style={{
              padding: '0.625rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.9375rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'contact' ? '3px solid #047857' : '3px solid transparent',
              color: activeTab === 'contact' ? '#047857' : '#64748b',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            ✉️ Contact Support Page
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('payment'); setSuccessMessage(null); setErrorMessage(null); }}
            style={{
              padding: '0.625rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.9375rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'payment' ? '3px solid #047857' : '3px solid transparent',
              color: activeTab === 'payment' ? '#047857' : '#64748b',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            💳 Payment Accounts &amp; Steps
          </button>
        </div>

        {/* Feedback alerts */}
        {successMessage && (
          <div className="alert-success" role="alert" style={{ marginBottom: '1.5rem' }}>
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="alert-error" role="alert" style={{ marginBottom: '1.5rem' }}>
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="admin-table-loading">
            <div className="spinner"></div>
            <p>Loading page content...</p>
          </div>
        ) : activeTab === 'about' ? (
          /* About Page Form */
          <form onSubmit={handleSaveAbout} className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📖</span> Edit About Us Page
            </h2>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Page Header Title <span className="req">*</span>
              </label>
              <input
                type="text"
                required
                value={aboutTitle}
                onChange={(e) => setAboutTitle(e.target.value)}
                className="form-input"
                placeholder="e.g. About FBISE Educational Platform"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Page Subtitle / Tagline
              </label>
              <textarea
                rows={2}
                value={aboutSubtitle}
                onChange={(e) => setAboutSubtitle(e.target.value)}
                className="form-textarea"
                placeholder="A concise summary of the platform's vision for matric students..."
              />
            </div>

            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#1e293b' }}>
                Mission Section
              </h3>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Mission Section Title</label>
                <input
                  type="text"
                  value={missionTitle}
                  onChange={(e) => setMissionTitle(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Our Educational Mission"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mission Description</label>
                <textarea
                  rows={4}
                  value={missionText}
                  onChange={(e) => setMissionText(e.target.value)}
                  className="form-textarea"
                  placeholder="Explain why this platform was created and how it helps students..."
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: '#1e293b' }}>
                  Curriculum Highlights
                </h3>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Section Heading</label>
                  <input
                    type="text"
                    value={curriculumHeading}
                    onChange={(e) => setCurriculumHeading(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bullet Points (One per line)</label>
                  <textarea
                    rows={6}
                    value={curriculumPointsText}
                    onChange={(e) => setCurriculumPointsText(e.target.value)}
                    className="form-textarea"
                    placeholder="Enter each curriculum feature on a new line..."
                  />
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: '#1e293b' }}>
                  Platform Standards &amp; Principles
                </h3>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Section Heading</label>
                  <input
                    type="text"
                    value={principlesHeading}
                    onChange={(e) => setPrinciplesHeading(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bullet Points (One per line)</label>
                  <textarea
                    rows={6}
                    value={principlesPointsText}
                    onChange={(e) => setPrinciplesPointsText(e.target.value)}
                    className="form-textarea"
                    placeholder="Enter each standard or principle on a new line..."
                  />
                </div>
              </div>
            </div>

            <div style={{ background: '#fffbeb', padding: '1.25rem', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: '#92400e' }}>
                Independent Educational Notice / Board Disclaimer
              </h3>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Notice Title</label>
                <input
                  type="text"
                  value={noticeHeading}
                  onChange={(e) => setNoticeHeading(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notice Description</label>
                <textarea
                  rows={3}
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                  className="form-textarea"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary btn-large"
              style={{ minWidth: '220px' }}
            >
              {isSaving ? 'Saving Changes...' : '💾 Save About Page'}
            </button>
          </form>
        ) : activeTab === 'contact' ? (
          /* Contact Page Form */
          <form onSubmit={handleSaveContact} className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>✉️</span> Edit Contact Support Page
            </h2>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Page Header Title <span className="req">*</span>
              </label>
              <input
                type="text"
                required
                value={contactTitle}
                onChange={(e) => setContactTitle(e.target.value)}
                className="form-input"
                placeholder="e.g. Contact Educational Support"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Page Subtitle
              </label>
              <textarea
                rows={2}
                value={contactSubtitle}
                onChange={(e) => setContactSubtitle(e.target.value)}
                className="form-textarea"
                placeholder="Brief instructions on how to reach out..."
              />
            </div>

            <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Academic Support Email <span className="req">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="e.g. support@fbise-notes.pk"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Phone / WhatsApp Support Number
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => { setWhatsapp(e.target.value); setPhone(e.target.value); }}
                  className="form-input"
                  placeholder="e.g. +92 300 1234567"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Expected Response Time
                </label>
                <input
                  type="text"
                  value={responseTime}
                  onChange={(e) => setResponseTime(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Within 24 business hours"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Operating Region / City
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Islamabad Capital Territory, Pakistan"
                />
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: '#1e293b' }}>
                Inquiry &amp; Error Reporting Guidance
              </h3>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Guidance Box Title</label>
                <input
                  type="text"
                  value={inquiryHeading}
                  onChange={(e) => setInquiryHeading(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Steps for Students / Parents (One per line)</label>
                <textarea
                  rows={4}
                  value={inquiryStepsText}
                  onChange={(e) => setInquiryStepsText(e.target.value)}
                  className="form-textarea"
                  placeholder="Specify class and subject&#10;Mention chapter number and topic&#10;Include order reference ID for payment queries"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary btn-large"
              style={{ minWidth: '220px' }}
            >
              {isSaving ? 'Saving Changes...' : '💾 Save Contact Page'}
            </button>
          </form>
        ) : (
          /* Payment Accounts & Verification Steps Form */
          <form onSubmit={handleSavePayment} className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>💳</span> Official Receiving Accounts &amp; Verification Steps
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1.5rem 0' }}>
              Configure official JazzCash, Easypaisa, and Bank accounts where students send payments, along with the custom steps and WhatsApp number for screenshot verification.
            </p>

            {/* WhatsApp Verification Number */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>💬</span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#166534' }}>
                  WhatsApp Screenshot Verification Number
                </h3>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#15803d', margin: '0 0 0.75rem 0' }}>
                Students will be instructed to send their payment transaction screenshot to this WhatsApp number. A one-tap WhatsApp button will be shown on the checkout page.
              </p>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  WhatsApp Number <span className="req">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="form-input"
                  placeholder="e.g. 0300-1234567 or +923001234567"
                  style={{ maxWidth: '360px' }}
                />
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: '#1e293b' }}>
                Custom Steps Shown to Students (One step per line)
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                Define the exact instructions students must follow. Use <code>{'{price}'}</code> to automatically display the resource price (e.g. 300) and <code>{'{whatsapp}'}</code> to display your WhatsApp number.
              </p>
              <textarea
                rows={5}
                required
                value={paymentInstructionsText}
                onChange={(e) => setPaymentInstructionsText(e.target.value)}
                className="form-textarea"
                placeholder="1. Pay PKR {price} on this number or bank account.&#10;2. Send screenshot on WhatsApp ({whatsapp}) and wait for verification.&#10;3. Enter your sender mobile number and Transaction ID (TID) below."
              />
            </div>

            {/* Receiving Accounts List */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    Official Receiving Accounts (JazzCash, Easypaisa, Bank / Raast)
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0.15rem 0 0 0' }}>
                    Add or edit the accounts where you accept student fee transfers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddAccount}
                  className="btn-outline-sm"
                  style={{ fontWeight: 700 }}
                >
                  + Add New Account
                </button>
              </div>

              {paymentAccounts.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#64748b', margin: '0 0 0.75rem 0', fontSize: '0.875rem' }}>No payment receiving accounts configured yet.</p>
                  <button type="button" onClick={handleAddAccount} className="btn-primary-sm">
                    + Add Your First Account
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {paymentAccounts.map((acc, index) => (
                    <div
                      key={acc.id || index}
                      style={{
                        padding: '1rem',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                          Account #{index + 1}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', cursor: 'pointer', color: '#334155' }}>
                            <input
                              type="checkbox"
                              checked={acc.is_active !== false}
                              onChange={(e) => handleUpdateAccount(index, 'is_active', e.target.checked)}
                              style={{ accentColor: '#047857' }}
                            />
                            Active (Visible on checkout)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveAccount(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            Provider / Bank Name <span className="req">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. JazzCash, Easypaisa, Meezan Bank"
                            value={acc.provider}
                            onChange={(e) => handleUpdateAccount(index, 'provider', e.target.value)}
                            className="form-input"
                            style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            Account Number / Mobile Number <span className="req">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 0300-1234567"
                            value={acc.account_number}
                            onChange={(e) => handleUpdateAccount(index, 'account_number', e.target.value)}
                            className="form-input"
                            style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            Account Title <span className="req">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. FBISE Notes Official"
                            value={acc.account_title}
                            onChange={(e) => handleUpdateAccount(index, 'account_title', e.target.value)}
                            className="form-input"
                            style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            IBAN / Raast ID (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. PK00MEZN..."
                            value={acc.iban || ''}
                            onChange={(e) => handleUpdateAccount(index, 'iban', e.target.value)}
                            className="form-input"
                            style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ marginTop: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          Account Note / Instructions (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Send as Mobile Account transfer or Raast transfer"
                          value={acc.notes || ''}
                          onChange={(e) => handleUpdateAccount(index, 'notes', e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Security Notice shown to Students
              </label>
              <textarea
                rows={2}
                value={paymentNoticeText}
                onChange={(e) => setPaymentNoticeText(e.target.value)}
                className="form-textarea"
                placeholder="Never share your mobile wallet PIN or password with anyone. FBISE staff will never ask for your account PIN."
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary btn-large"
              style={{ minWidth: '260px' }}
            >
              {isSaving ? 'Saving Payment Settings...' : '💾 Save Payment Accounts & Steps'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

