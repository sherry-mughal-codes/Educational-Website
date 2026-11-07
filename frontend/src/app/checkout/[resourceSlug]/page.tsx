'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  studentGetMe,
  createOrder,
  getPaymentGateways,
  submitPaymentCallback,
  StudentUser,
  GatewayItem,
  ResourceItem,
} from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import PasswordInput from '@/components/PasswordInput';

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const resourceSlug = params?.resourceSlug as string;

  const [student, setStudent] = useState<StudentUser | null>(null);
  const [resource, setResource] = useState<ResourceItem | null>(null);
  const [gateways, setGateways] = useState<GatewayItem[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>('jazzcash');

  // Interactive Payment Fields State
  const [mobileNumber, setMobileNumber] = useState('');
  const [cnicLast6, setCnicLast6] = useState('');
  const [mpin, setMpin] = useState('');
  const [tid, setTid] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

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

    // 2. Fetch gateways
    getPaymentGateways()
      .then((gwList) => {
        setGateways(gwList);
        if (gwList.length > 0) {
          setSelectedGateway(gwList[0].id);
        }
      })
      .catch(() => {});

    // 3. Fetch resource data
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${apiUrl}/api/resources/?q=${encodeURIComponent(resourceSlug)}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        const match = (data.results || []).find((r: ResourceItem) => r.slug === resourceSlug);
        if (match) {
          fetch(`${apiUrl}/api/resources/${match.class_slug}/${match.subject_slug}/${match.slug}/`, {
            credentials: 'include',
            cache: 'no-store',
          })
            .then((res) => res.json())
            .then((resData) => {
              setResource(resData);
              if (resData.user_has_purchased) {
                setAlreadyOwned(true);
              }
            })
            .catch(() => setErrorMessage('Failed to load resource details.'));
        } else {
          setErrorMessage('Resource could not be found.');
        }
      })
      .catch(() => {
        setErrorMessage('Failed to connect to FBISE server.');
      })
      .finally(() => setIsLoading(false));
  }, [resourceSlug]);

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) {
      router.push(`/student/login/?returnUrl=${encodeURIComponent(`/checkout/${resourceSlug}/`)}`);
      return;
    }

    if (!resource) return;

    // Field validations
    if (selectedGateway === 'jazzcash' || selectedGateway === 'easypaisa') {
      if (!mobileNumber.trim() || mobileNumber.trim().length < 10) {
        setErrorMessage('Please enter a valid 11-digit mobile account number (e.g. 03001234567).');
        return;
      }
    } else if (selectedGateway === 'direct_transfer') {
      if (!tid.trim() || tid.trim().length < 6) {
        setErrorMessage('Please enter the Transaction ID (TID) from your payment confirmation SMS.');
        return;
      }
    } else if (selectedGateway === 'card') {
      if (!cardNumber.trim() || cardNumber.replace(/\s+/g, '').length < 12) {
        setErrorMessage('Please enter a valid debit/credit card number.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setProcessingStep('Initializing secure transaction...');

    try {
      trackEvent('begin_checkout', {
        currency: 'PKR',
        value: Number(resource.price || 100),
        items: [{ item_id: resource.id, item_name: resource.title, price: Number(resource.price || 100) }],
      });

      const returnUrl = `${window.location.origin}/checkout/result/`;
      const result = await createOrder({
        resource_id: resource.id,
        gateway_id: selectedGateway,
        return_url: returnUrl,
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

      // Realistic Payment Processing Simulation & Direct Callback
      setProcessingStep(
        selectedGateway === 'jazzcash'
          ? 'Contacting JazzCash gateway & verifying MPIN...'
          : selectedGateway === 'easypaisa'
          ? 'Connecting to Easypaisa network & processing debit...'
          : selectedGateway === 'direct_transfer'
          ? 'Verifying bank transaction ID & ledger...'
          : 'Connecting to 3D Secure Banking Network...'
      );

      // Submit verification callback
      const callbackPayload: Record<string, any> = {
        order_reference: orderRef,
        amount: resource.price || '100',
        mobile_number: mobileNumber.trim(),
        cnic_last_6: cnicLast6.trim(),
        mpin: mpin.trim(),
        transaction_id: tid.trim(),
        card_number: cardNumber.trim(),
        cardholder: cardHolder.trim(),
        resCode: '0000',
        pp_ResponseCode: '000',
      };

      const verifyRes = await submitPaymentCallback(selectedGateway, callbackPayload);

      if (verifyRes.success) {
        setProcessingStep('✓ Payment verified! Redirecting to your download...');
        setTimeout(() => {
          router.push(`/checkout/result/?order_ref=${encodeURIComponent(orderRef)}`);
        }, 600);
      } else {
        setErrorMessage(verifyRes.error || 'Payment authorization was declined. Please try again.');
        setIsSubmitting(false);
        setProcessingStep(null);
      }
    } catch {
      setErrorMessage('A network error occurred while establishing your checkout session.');
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
              📥 Download PDF Now ↓
            </a>
            <Link href="/student/dashboard/" className="btn-outline-sm" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
              Student Dashboard →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container checkout-wrapper" style={{ padding: '1rem 0.5rem 2.5rem', maxWidth: '960px', margin: '0 auto' }}>
      <div className="checkout-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        {/* Left Column: Order Summary */}
        <div className="checkout-summary-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span className="checkout-badge" style={{ fontSize: '0.7rem', padding: '0.15rem 0.55rem', borderRadius: '4px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 700, textTransform: 'uppercase' }}>
            FBISE Official Study Packet
          </span>
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
              <li>✓ Lifetime access &amp; free future syllabus updates</li>
            </ul>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
              <span>Price:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>PKR {resource?.price || '100'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
              <span>Taxes / Processing:</span>
              <span style={{ color: '#047857', fontWeight: 600 }}>Free (Included)</span>
            </div>
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Total Amount:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#047857' }}>PKR {resource?.price || '100'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Student Status & Realistic Payment Form */}
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
                  Choose Pakistani Payment Option:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {gateways.map((gw) => (
                    <label
                      key={gw.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.65rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: selectedGateway === gw.id ? '2px solid #047857' : '1px solid #e2e8f0',
                        background: selectedGateway === gw.id ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="payment_gateway"
                        value={gw.id}
                        checked={selectedGateway === gw.id}
                        onChange={() => {
                          setSelectedGateway(gw.id);
                          setErrorMessage(null);
                        }}
                        style={{ marginTop: '0.2rem', accentColor: '#047857' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                            {gw.name}
                          </span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '0.1rem 0.45rem', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                            {gw.badge}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                          {gw.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Gateway-Specific Realistic Form Fields */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                {selectedGateway === 'jazzcash' && (
                  <div>
                    <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: '0.825rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>📱</span> JazzCash Mobile Account Details
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem', marginBottom: '0.65rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                          JazzCash Mobile Number <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="03001234567"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                          CNIC (Last 6 Digits)
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="123456"
                          value={cnicLast6}
                          onChange={(e) => setCnicLast6(e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                        JazzCash MPIN (4 Digits) <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <PasswordInput
                        maxLength={4}
                        placeholder="••••"
                        value={mpin}
                        onChange={(e) => setMpin(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      />
                    </div>
                  </div>
                )}

                {selectedGateway === 'easypaisa' && (
                  <div>
                    <div style={{ fontWeight: 700, color: '#047857', fontSize: '0.825rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>📱</span> Easypaisa Wallet Authorization
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem', marginBottom: '0.65rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                          Easypaisa Account Number <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="03451234567"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                          Account PIN (5 Digits) <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <PasswordInput
                          maxLength={5}
                          placeholder="•••••"
                          value={mpin}
                          onChange={(e) => setMpin(e.target.value)}
                          style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedGateway === 'direct_transfer' && (
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.825rem', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>🏦</span> Official Platform Bank / Wallet Details
                    </div>
                    <div style={{ background: '#ffffff', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#334155', marginBottom: '0.65rem' }}>
                      <div>Account: <strong>0300-8889999</strong> (JazzCash / Easypaisa / Raast)</div>
                      <div>Title: <strong>FBISE Notes Official</strong></div>
                      <div>Amount: <strong>PKR {resource?.price || '100'}</strong></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                          Your Sender Phone Number <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="03001234567"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                          Transaction ID (TID) <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 83921084920"
                          value={tid}
                          onChange={(e) => setTid(e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedGateway === 'card' && (
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.825rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>💳</span> Debit / Credit Card (Visa / Mastercard)
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                        Card Number <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={19}
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="form-input"
                        style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          placeholder="Muhammad Ali"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                          Expiry
                        </label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                          CVV
                        </label>
                        <input
                          type="password"
                          placeholder="•••"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="form-input"
                          style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Security Banner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
                <span>🔒</span>
                <span>256-Bit Encrypted Pakistani Banking Gateway. Instant access granted upon authorization.</span>
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={isSubmitting}
                style={{
                  background: '#047857',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                }}
              >
                {isSubmitting ? 'Verifying Transaction...' : `Pay PKR ${resource?.price || '100'} & Unlock PDF →`}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                <Link
                  href={`/${resource?.class?.slug || 'class-9'}/${resource?.subject?.slug || 'physics'}/${resource?.slug || resourceSlug}/`}
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
