'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  studentGetMe,
  createOrder,
  getPaymentGateways,
  submitPaymentCallback,
  getPaymentSettings,
  PaymentSettingsResponse,
  PaymentAccountItem,
  StudentUser,
  GatewayItem,
  ResourceItem,
} from '@/lib/api';
import { trackEvent } from '@/lib/analytics';

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const resourceSlug = params?.resourceSlug as string;

  const [student, setStudent] = useState<StudentUser | null>(null);
  const [resource, setResource] = useState<ResourceItem | null>(null);
  const [gateways, setGateways] = useState<GatewayItem[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>('direct_transfer');
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettingsResponse | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Direct Transfer / Mobile Wallet Verification Fields
  const [senderPhone, setSenderPhone] = useState('');
  const [tid, setTid] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [alreadyOwned, setAlreadyOwned] = useState(false);

  useEffect(() => {
    // 1. Check student auth
    studentGetMe()
      .then((res) => {
        if (res.authenticated && res.user) {
          setStudent(res.user);
        }
      })
      .catch(() => {});

    // 2. Fetch gateways (JazzCash, Easypaisa, and Direct Transfer)
    getPaymentGateways()
      .then((gwList) => {
        const allowed = ['direct_transfer', 'jazzcash', 'easypaisa'];
        const filtered = (gwList || []).filter((gw) => allowed.includes(gw.id));
        setGateways(filtered);
        if (filtered.length > 0) {
          setSelectedGateway(filtered[0].id);
        }
      })
      .catch(() => {});

    // 2b. Fetch dynamic admin-configured receiving accounts and steps
    getPaymentSettings()
      .then((settings) => {
        if (settings) {
          setPaymentSettings(settings);
        }
      })
      .catch(() => {});

    // 3. Fetch resource data directly by unique slug
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${apiUrl}/api/resources/by-slug/${encodeURIComponent(resourceSlug)}/`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Resource not found');
        return res.json();
      })
      .then((resData: ResourceItem) => {
        setResource(resData);
        if (resData.user_has_purchased) {
          setAlreadyOwned(true);
        }
        setErrorMessage(null);
      })
      .catch(() => {
        fetch(`${apiUrl}/api/resources/?q=${encodeURIComponent(resourceSlug)}`, { cache: 'no-store' })
          .then((res) => res.json())
          .then((data) => {
            const match = (data.results || []).find((r: ResourceItem) => r.slug === resourceSlug);
            if (match) {
              fetch(`${apiUrl}/api/resources/${match.class_slug || match.class?.slug}/${match.subject_slug || match.subject?.slug}/${match.slug}/`, {
                credentials: 'include',
                cache: 'no-store',
              })
                .then((r) => r.json())
                .then((resData: ResourceItem) => {
                  setResource(resData);
                  if (resData.user_has_purchased) {
                    setAlreadyOwned(true);
                  }
                  setErrorMessage(null);
                })
                .catch(() => setErrorMessage('Failed to load study guide details.'));
            } else {
              setErrorMessage('Resource could not be found.');
            }
          })
          .catch(() => {
            setErrorMessage('Failed to connect to FBISE server.');
          });
      })
      .finally(() => setIsLoading(false));
  }, [resourceSlug]);

  const activeGw = gateways.find((g) => g.id === selectedGateway);
  const displayPrice = resource?.price ? Number(resource.price).toLocaleString('en-PK') : '...';

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) {
      router.push(`/student/login/?returnUrl=${encodeURIComponent(`/checkout/${resourceSlug}/`)}`);
      return;
    }

    if (!resource) {
      setErrorMessage('Resource details are loading. Please wait a moment and try again.');
      return;
    }

    const cleanPhone = senderPhone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid sender phone number (e.g. 03001234567).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setProcessingStep('Registering checkout order...');

    try {
      const priceNum = Number(resource.price || 0);
      trackEvent('begin_checkout', {
        currency: 'PKR',
        value: priceNum,
        items: [{ item_id: resource.id, item_name: resource.title, price: priceNum }],
      });

      const returnUrl = `${window.location.origin}/checkout/result/`;
      const result = await createOrder({
        resource_id: resource.id,
        gateway_id: selectedGateway,
        return_url: returnUrl,
        customer_note: customerNote.trim(),
      });

      if (result.already_owned) {
        setAlreadyOwned(true);
        setIsSubmitting(false);
        setProcessingStep(null);
        return;
      }

      if (!result.success || !result.order_reference) {
        setErrorMessage(result.error || 'Failed to initiate order.');
        setIsSubmitting(false);
        setProcessingStep(null);
        return;
      }

      const orderRef = result.order_reference;

      // If gateway is live with automated hosted checkout (e.g. corporate merchant portal)
      if (activeGw?.is_live && result.payment?.action_url) {
        window.location.href = result.payment.action_url;
        return;
      }

      // Authentic Pakistani verification workflow: submit TID and phone for administrator approval
      setProcessingStep('Submitting payment details for verification...');

      const callbackPayload = {
        order_reference: orderRef,
        amount: resource.price,
        sender_phone: senderPhone.trim(),
        transaction_id: tid.trim(),
        customer_note: customerNote.trim(),
      };

      const verifyRes = await submitPaymentCallback('direct_transfer', callbackPayload);

      if (verifyRes.success) {
        setProcessingStep('✓ Payment details submitted for verification! Redirecting to confirmation...');
        setTimeout(() => {
          router.push(`/checkout/result/?order_ref=${encodeURIComponent(orderRef)}&status=pending_verification`);
        }, 350);
      } else {
        setErrorMessage(verifyRes.error || 'Submission failed. Please check your transaction details.');
        setIsSubmitting(false);
        setProcessingStep(null);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'A network error occurred while establishing your checkout session. Please try again.');
      setIsSubmitting(false);
      setProcessingStep(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container checkout-wrapper" style={{ padding: '2rem 1rem' }}>
        <div className="admin-table-loading">
          <div className="spinner"></div>
          <p>Preparing secure checkout...</p>
        </div>
      </div>
    );
  }

  if (alreadyOwned && resource) {
    const fullDownloadUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${resource.download_url}`;
    const resourceUrl = `/${resource.class?.slug || 'class-9'}/${resource.subject?.slug || 'physics'}/${resource.slug}/`;

    return (
      <div className="container checkout-wrapper" style={{ padding: '1.5rem 1rem', maxWidth: '640px', margin: '0 auto' }}>
        <div className="checkout-already-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div className="already-icon" style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#047857' }}>✓</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>You Already Own This Guide</h1>
          <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 1.25rem 0' }}>
            Your student account has verified lifetime download access for <strong>{resource.title}</strong>.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={fullDownloadUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
              ⬇ Download Complete PDF
            </a>
            <Link href={resourceUrl} className="btn-outline-sm" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
              Read Online
            </Link>
            <Link href="/student/dashboard/" className="btn-outline-sm" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
              My Purchases
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Determine dynamic accounts and steps from admin settings
  const allAccounts = paymentSettings?.accounts?.filter((a) => a.is_active !== false) || [
    {
      id: 'default-1',
      provider: 'JazzCash / Easypaisa / Raast',
      account_number: '0300-8889999',
      account_title: 'FBISE Educational Notes Official',
      is_active: true,
      notes: 'Mobile Wallet / Raast',
    },
  ];

  // Filter accounts according to the student's selected payment tab
  const displayedAccounts = selectedGateway === 'jazzcash'
    ? (allAccounts.filter((a) => a.provider.toLowerCase().includes('jazz')).length > 0
        ? allAccounts.filter((a) => a.provider.toLowerCase().includes('jazz'))
        : allAccounts)
    : selectedGateway === 'easypaisa'
    ? (allAccounts.filter((a) => a.provider.toLowerCase().includes('easy')).length > 0
        ? allAccounts.filter((a) => a.provider.toLowerCase().includes('easy'))
        : allAccounts)
    : allAccounts;

  const rawWhatsApp = paymentSettings?.whatsapp_number || '0300-1234567';
  let cleanWhatsApp = rawWhatsApp.replace(/\D/g, '');
  if (cleanWhatsApp.startsWith('0')) cleanWhatsApp = '92' + cleanWhatsApp.slice(1);
  if (!cleanWhatsApp.startsWith('92')) cleanWhatsApp = '92' + cleanWhatsApp;

  const whatsappMsg = encodeURIComponent(
    `Assalam-o-Alaikum! I have paid PKR ${displayPrice} for ${resource?.title || 'FBISE Notes'}. Please find my payment screenshot attached for verification.`
  );
  const whatsappUrl = `https://wa.me/${cleanWhatsApp}?text=${whatsappMsg}`;

  const dynamicSteps = (paymentSettings?.instructions_steps && paymentSettings.instructions_steps.length > 0)
    ? paymentSettings.instructions_steps.map((step) =>
        step
          .replace(/\{price\}/g, String(displayPrice))
          .replace(/\{whatsapp\}/g, rawWhatsApp)
      )
    : [
        `Pay PKR ${displayPrice} on this number or bank account from the options below.`,
        `Send the transaction screenshot on this number (${rawWhatsApp}) on WhatsApp and wait for your verification.`,
        `Enter your sender mobile number and Transaction ID (TID) below and submit.`,
        `Your offline PDF download will be automatically unlocked as soon as verified by our team.`,
      ];

  return (
    <div className="container checkout-wrapper" style={{ padding: '1rem 1rem 2.5rem 1rem', maxWidth: '860px', margin: '0 auto' }}>
      <div className="breadcrumbs" style={{ margin: '0 0 0.85rem 0', fontSize: '0.78rem' }}>
        <Link href="/">Home</Link>
        <span>/</span>
        {resource?.class && (
          <>
            <Link href={`/${resource.class.slug}/`}>{resource.class.name}</Link>
            <span>/</span>
          </>
        )}
        {resource?.subject && (
          <>
            <Link href={`/${resource.class?.slug || 'class-9'}/${resource.subject.slug}/`}>{resource.subject.name}</Link>
            <span>/</span>
          </>
        )}
        <span>Checkout</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.15rem' }}>
        {/* Left Column: Resource Summary */}
        <div className="checkout-summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#047857', letterSpacing: '0.05em' }}>
            Order Summary
          </div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0.5rem 0 0.35rem 0', lineHeight: 1.3 }}>
            {resource?.title || 'FBISE Subject Notes'}
          </h1>

          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {resource?.class && <span className="badge-pill" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>{resource.class.name}</span>}
            {resource?.subject && <span className="badge-pill badge-neutral" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>{resource.subject.name}</span>}
            <span className="badge-pill badge-type" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>Complete PDF</span>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              What is included:
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: '#475569' }}>
              <li>✓ High-resolution complete offline PDF guide</li>
              <li>✓ Chapter-by-chapter solved textbook exercises</li>
              <li>✓ FBISE Student Learning Outcomes (SLO) conceptual Q&amp;As</li>
              <li>✓ Step-by-step solved numericals &amp; formula sheets</li>
              <li>✓ Lifetime access &amp; free syllabus updates</li>
            </ul>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
              <span>Price:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>PKR {displayPrice}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
              <span>Taxes / Processing:</span>
              <span style={{ color: '#047857', fontWeight: 600 }}>Free (Included)</span>
            </div>
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Total Amount:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#047857' }}>PKR {displayPrice}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Student Status & Secure Payment Options */}
        <div className="checkout-action-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.85rem 0' }}>
            Payment Method
          </h2>

          {errorMessage && (
            <div className="alert-error" role="alert" style={{ marginBottom: '0.85rem', padding: '0.65rem 0.85rem', fontSize: '0.825rem' }}>
              <span className="alert-icon">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {processingStep && (
            <div className="alert-success" style={{ marginBottom: '0.85rem', padding: '0.65rem 0.85rem', fontSize: '0.825rem', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
              <span className="alert-icon">⚡</span>
              <span>{processingStep}</span>
            </div>
          )}

          {!student ? (
            <div style={{ textAlign: 'center', padding: '1.25rem 0.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👤</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
                Sign in to complete purchase
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem 0' }}>
                Your study notes will be permanently attached to your student account for instant download.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Link
                  href={`/student/login/?returnUrl=${encodeURIComponent(`/checkout/${resourceSlug}/`)}`}
                  className="btn-primary w-full text-center"
                  style={{ padding: '0.55rem', fontSize: '0.875rem' }}
                >
                  Sign In to Continue →
                </Link>
                <Link
                  href={`/student/register/?returnUrl=${encodeURIComponent(`/checkout/${resourceSlug}/`)}`}
                  className="btn-outline-sm w-full text-center"
                  style={{ padding: '0.55rem', fontSize: '0.875rem' }}
                >
                  Create Student Account
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleStartPayment}>
              {/* Account Pill */}
              <div style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>Account:</span>
                <strong style={{ color: '#0f172a' }}>{student.full_name || student.email}</strong>
              </div>

              {/* Payment Gateway Radio List */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                  Choose Payment Method:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {gateways.map((gw) => (
                    <label
                      key={gw.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.65rem',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '8px',
                        border: selectedGateway === gw.id ? '2px solid #047857' : '1px solid #cbd5e1',
                        background: selectedGateway === gw.id ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="gateway"
                        value={gw.id}
                        checked={selectedGateway === gw.id}
                        onChange={() => {
                          setSelectedGateway(gw.id);
                          setErrorMessage(null);
                        }}
                        style={{ marginTop: '0.2rem', accentColor: '#047857' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                            {gw.id === 'jazzcash'
                              ? 'JazzCash'
                              : gw.id === 'easypaisa'
                              ? 'Easypaisa'
                              : 'Direct Bank / Raast / Wallet Transfer'}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: '#047857',
                              background: '#ecfdf5',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '4px',
                              border: '1px solid #a7f3d0',
                            }}
                          >
                            Verified Manual Transfer
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                          {gw.id === 'jazzcash'
                            ? 'Transfer via JazzCash mobile app or retail till & submit receipt TID.'
                            : gw.id === 'easypaisa'
                            ? 'Transfer via Easypaisa mobile app or retail shop & submit receipt TID.'
                            : 'Transfer funds via Bank, Raast, or Mobile Account directly.'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dynamic Receiving Accounts & Verification Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.825rem', marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>🏦</span> Official Receiving Accounts
                </div>

                {/* Displayed Accounts Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {displayedAccounts.map((acc, idx) => (
                    <div
                      key={acc.id || idx}
                      style={{
                        background: '#ffffff',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.78rem',
                        color: '#334155',
                        lineHeight: 1.5,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{acc.provider}</span>
                        {acc.notes && (
                          <span style={{ fontSize: '0.68rem', background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px', color: '#475569' }}>
                            {acc.notes}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
                        <div>
                          Account Number: <strong style={{ fontSize: '0.875rem', color: '#047857' }}>{acc.account_number}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(acc.account_number, acc.id || String(idx))}
                          style={{
                            background: copiedId === (acc.id || String(idx)) ? '#047857' : '#f1f5f9',
                            color: copiedId === (acc.id || String(idx)) ? '#ffffff' : '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            padding: '0.15rem 0.5rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {copiedId === (acc.id || String(idx)) ? '✓ Copied' : '📋 Copy'}
                        </button>
                      </div>
                      <div>Account Title: <strong>{acc.account_title}</strong></div>
                      {acc.iban && <div>IBAN / Raast: <strong>{acc.iban}</strong></div>}
                      <div>Amount: <strong style={{ color: '#047857' }}>PKR {displayPrice}</strong></div>
                    </div>
                  ))}
                </div>

                {/* Steps Section configured by Admin */}
                <div style={{ fontSize: '0.76rem', color: '#475569', marginBottom: '0.75rem', background: '#eff6ff', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '0.25rem' }}>
                    Payment &amp; Verification Steps:
                  </div>
                  <ol style={{ margin: '0.2rem 0 0 1.15rem', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {dynamicSteps.map((step, sIdx) => (
                      <li key={sIdx}>{step}</li>
                    ))}
                  </ol>

                  {/* One-Tap WhatsApp Screenshot Verification Button */}
                  <div style={{ marginTop: '0.65rem' }}>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#25D366',
                        color: '#ffffff',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        boxShadow: '0 1px 3px rgba(37, 211, 102, 0.3)',
                      }}
                    >
                      <span>💬</span> Send Screenshot on WhatsApp ({rawWhatsApp})
                    </a>
                  </div>
                </div>

                {/* Sender Mobile Number & TID Input */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                      Sender Phone Number <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 03001234567"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className="form-input"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                      Transaction ID (TID) <span style={{ color: '#64748b', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 83921084920 (optional)"
                      value={tid}
                      onChange={(e) => setTid(e.target.value)}
                      className="form-input"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                    />
                  </div>
                </div>

                {/* Additional Note / Payment Remarks */}
                <div style={{ marginTop: '0.65rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                    Note / Payment Details <span style={{ color: '#64748b', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Sent from Ali's JazzCash account, or transaction time / ATM branch details..."
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="form-textarea"
                    style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Security Banner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
                <span>🔒</span>
                <span>
                  {paymentSettings?.notice_text || 'Transfers are verified directly against our official bank statement by our administrative team. Never share your mobile wallet PIN or password.'}
                </span>
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={isSubmitting || !resource}
                style={{
                  background: '#047857',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting
                  ? 'Submitting Verification...'
                  : `Submit Payment for Verification (PKR ${displayPrice}) →`}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                <Link
                  href={`/${resource?.class?.slug || 'class-9'}/${resource?.subject?.slug || 'biology'}/${resource?.slug || resourceSlug}/`}
                  style={{ fontSize: '0.8rem', color: '#64748b', textDecoration: 'none' }}
                >
                  ← Cancel and return to study notes
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
