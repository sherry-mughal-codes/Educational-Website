'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  studentGetMe,
  createOrder,
  submitManualPayment,
  getPaymentSettings,
  PaymentSettingsResponse,
  PaymentAccountItem,
  StudentUser,
  ResourceItem,
} from '@/lib/api';
import { trackEvent } from '@/lib/analytics';

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const resourceSlug = params?.resourceSlug as string;

  const [student, setStudent] = useState<StudentUser | null>(null);
  const [resource, setResource] = useState<ResourceItem | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettingsResponse | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Manual Payment Verification Fields
  const [selectedAccount, setSelectedAccount] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [tid, setTid] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [alreadyOwned, setAlreadyOwned] = useState(false);

  useEffect(() => {
    // 1. Check student auth
    studentGetMe()
      .then((res) => {
        if (res.authenticated && res.user) {
          setStudent(res.user);
          if (res.user.full_name) {
            setSenderName(res.user.full_name);
          }
        }
      })
      .catch(() => {});

    // 2. Fetch dynamic admin-configured receiving accounts and steps
    getPaymentSettings()
      .then((settings) => {
        if (settings) {
          setPaymentSettings(settings);
          const active = (settings.accounts || []).filter((a) => a.is_active !== false);
          if (active.length > 0) {
            setSelectedAccount(`${active[0].provider} - ${active[0].account_number}`);
          }
        }
      })
      .catch(() => {});

    // 3. Fetch resource data directly by unique slug
    async function loadResource() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      try {
        const directRes = await fetch(`${apiUrl}/api/resources/by-slug/${encodeURIComponent(resourceSlug)}/`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (directRes.ok) {
          const resData: ResourceItem = await directRes.json();
          setResource(resData);
          if (resData.user_has_purchased) {
            setAlreadyOwned(true);
          }
          setErrorMessage(null);
          return;
        }

        // Fallback search
        const searchRes = await fetch(`${apiUrl}/api/resources/?q=${encodeURIComponent(resourceSlug)}`, { cache: 'no-store' });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const match = (searchData.results || []).find((r: ResourceItem) => r.slug === resourceSlug);
          if (match) {
            const classSlug = match.class_slug || match.class?.slug;
            const subjectSlug = match.subject_slug || match.subject?.slug;
            const detailRes = await fetch(`${apiUrl}/api/resources/${classSlug}/${subjectSlug}/${match.slug}/`, {
              credentials: 'include',
              cache: 'no-store',
            });
            if (detailRes.ok) {
              const resData: ResourceItem = await detailRes.json();
              setResource(resData);
              if (resData.user_has_purchased) {
                setAlreadyOwned(true);
              }
              setErrorMessage(null);
              return;
            }
          }
        }
        setErrorMessage('Educational resource could not be found.');
      } catch {
        setErrorMessage('Failed to connect to FBISE server.');
      } finally {
        setIsLoading(false);
      }
    }

    loadResource();
  }, [resourceSlug]);

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

    // Client-side validations
    if (!selectedAccount.trim()) {
      setErrorMessage('Please select the receiving account where you sent the payment.');
      return;
    }

    if (!senderName.trim() || senderName.trim().length < 2) {
      setErrorMessage('Please enter the sender account name/title.');
      return;
    }

    const cleanPhone = senderPhone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid sender phone number (e.g. 03001234567, minimum 10 digits).');
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

      // 1. Create order
      const orderRes = await createOrder({
        resource_id: resource.id,
        customer_note: customerNote.trim(),
      });

      if (orderRes.already_owned) {
        setAlreadyOwned(true);
        setIsSubmitting(false);
        setProcessingStep(null);
        return;
      }

      if (orderRes.requires_email_verification) {
        setRequiresVerification(true);
        setErrorMessage(orderRes.error || 'Email verification is required before placing orders.');
        setIsSubmitting(false);
        setProcessingStep(null);
        return;
      }

      if (!orderRes.success || !orderRes.order_reference) {
        setErrorMessage(orderRes.error || 'Failed to create order.');
        setIsSubmitting(false);
        setProcessingStep(null);
        return;
      }

      const orderRef = orderRes.order_reference;

      // 2. Submit manual payment verification evidence
      setProcessingStep('Submitting payment evidence for verification...');

      const payload: Record<string, any> = {
        sender_name: senderName.trim(),
        sender_phone: cleanPhone,
        receiving_account: selectedAccount.trim(),
        amount: String(resource.price),
      };
      if (tid.trim()) {
        payload.transaction_id = tid.trim();
      }
      if (customerNote.trim()) {
        payload.customer_note = customerNote.trim();
      }

      const submitRes = await submitManualPayment(orderRef, payload);

      if (submitRes.success) {
        setProcessingStep('✓ Payment details submitted for verification! Redirecting to confirmation...');
        setTimeout(() => {
          router.push(`/checkout/result/?order_ref=${encodeURIComponent(orderRef)}&status=pending_verification`);
        }, 400);
      } else {
        setErrorMessage(submitRes.error || 'Payment submission failed. Please verify your transaction details.');
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

  // Determine active dynamic accounts and steps from admin settings
  const allAccounts: PaymentAccountItem[] = paymentSettings?.accounts?.filter((a) => a.is_active !== false) || [
    {
      id: 'default-1',
      provider: 'Bank / JazzCash / Easypaisa',
      account_number: '0300-8889999',
      account_title: 'FBISE Educational Notes Official',
      is_active: true,
      notes: 'Direct Bank / Mobile Wallet',
    },
  ];

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
        `Transfer PKR ${displayPrice} to any of our official receiving accounts below.`,
        `Take a clear screenshot of the completed transfer confirmation receipt.`,
        `Send the screenshot on our official WhatsApp number (${rawWhatsApp}) for fast approval.`,
        `Enter your sender name and mobile number below, then click Submit for administrator verification.`,
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
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Total Payable:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#047857' }}>PKR {displayPrice}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Payment & Verification Details */}
        <div className="checkout-action-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.85rem 0' }}>
            Manual Bank &amp; Wallet Transfer
          </h2>

          {errorMessage && (
            <div className="alert-error" role="alert" style={{ marginBottom: '0.85rem', padding: '0.65rem 0.85rem', fontSize: '0.825rem' }}>
              <span className="alert-icon">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {requiresVerification && (
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem', color: '#92400e', fontSize: '0.825rem' }}>
              <strong>Email Verification Required:</strong> Please check your inbox for our verification email or visit your{' '}
              <Link href="/student/dashboard/" style={{ textDecoration: 'underline', fontWeight: 700 }}>
                student dashboard
              </Link>{' '}
              to request a new verification link.
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
                <span style={{ color: '#64748b' }}>Student Account:</span>
                <strong style={{ color: '#0f172a' }}>{student.full_name || student.email}</strong>
              </div>

              {/* Official Receiving Accounts Card */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.825rem', marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>🏦</span> Step 1: Transfer Funds to Official Account
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {allAccounts.map((acc, idx) => (
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
                          Account / Number: <strong style={{ fontSize: '0.875rem', color: '#047857' }}>{acc.account_number}</strong>
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
                      {acc.iban && <div>IBAN / Raast ID: <strong>{acc.iban}</strong></div>}
                      <div>Exact Fee: <strong style={{ color: '#047857' }}>PKR {displayPrice}</strong></div>
                    </div>
                  ))}
                </div>

                {/* Verification Guidance */}
                <div style={{ fontSize: '0.76rem', color: '#475569', marginBottom: '0.75rem', background: '#eff6ff', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '0.25rem' }}>
                    Instructions &amp; Verification:
                  </div>
                  <ol style={{ margin: '0.2rem 0 0 1.15rem', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {dynamicSteps.map((step, sIdx) => (
                      <li key={sIdx}>{step}</li>
                    ))}
                  </ol>

                  {/* WhatsApp Support Button */}
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
              </div>

              {/* Step 2: Evidence Submission Form */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.825rem', marginBottom: '0.65rem' }}>
                  📝 Step 2: Enter Transaction Evidence
                </div>

                {/* Receiving Account Select */}
                <div style={{ marginBottom: '0.65rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                    Selected Receiving Account <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    required
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="form-select"
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem', width: '100%' }}
                  >
                    {allAccounts.map((acc, idx) => {
                      const val = `${acc.provider} - ${acc.account_number}`;
                      return (
                        <option key={acc.id || idx} value={val}>
                          {acc.provider} ({acc.account_number} - {acc.account_title})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Sender Name & Sender Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem', marginBottom: '0.65rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                      Sender Account Name / Title <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ali Khan"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="form-input"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                      Sender Phone / Mobile Number <span style={{ color: '#dc2626' }}>*</span>
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
                </div>

                {/* Transaction ID (TID) - Optional */}
                <div style={{ marginBottom: '0.65rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                    Transaction ID (TID) <span style={{ color: '#64748b', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210 (Optional - from bank/wallet SMS or receipt)"
                    value={tid}
                    onChange={(e) => setTid(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                  />
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                    You can enter the TID if available to speed up verification.
                  </div>
                </div>

                {/* Customer Note (Optional) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                    Note / Additional Details <span style={{ color: '#64748b', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Sent from brother's account, or time of transfer..."
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="form-textarea"
                    style={{ fontSize: '0.825rem', padding: '0.45rem 0.65rem', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Safety notice */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
                <span>🔒</span>
                <span>
                  {paymentSettings?.notice_text || 'Transfers are verified directly against our official account statement. An administrator will approve your order and unlock your download.'}
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
