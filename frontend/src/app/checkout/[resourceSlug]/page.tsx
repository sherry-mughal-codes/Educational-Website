'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  studentGetMe,
  createOrder,
  getPaymentGateways,
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
  const [selectedGateway, setSelectedGateway] = useState<string>('jazzcash');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    // 3. Fetch resource data via search or API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${apiUrl}/api/resources/?q=${encodeURIComponent(resourceSlug)}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        const match = (data.results || []).find((r: ResourceItem) => r.slug === resourceSlug);
        if (match) {
          // Fetch complete resource detail
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

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Dispatch begin_checkout event
      trackEvent('begin_checkout', {
        currency: 'PKR',
        value: Number(resource.price || 100),
        items: [
          {
            item_id: resource.id,
            item_name: resource.title,
            price: Number(resource.price || 100),
          },
        ],
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
        return;
      }

      if (!result.success || !result.payment) {
        setErrorMessage(result.error || 'Failed to initiate payment.');
        setIsSubmitting(false);
        return;
      }

      const payment = result.payment;

      if (payment.action_type === 'sandbox_simulation') {
        // Instant sandbox simulation: redirect directly to result verification
        router.push(`/checkout/result/?order_ref=${result.order_reference}&sandbox=1`);
      } else if (payment.action_type === 'form_post' && payment.form_data) {
        // Hosted gateway form POST (JazzCash / Easypaisa)
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = payment.action_url;
        form.style.display = 'none';

        for (const [key, val] of Object.entries(payment.form_data)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(val);
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
      } else if (payment.action_url) {
        window.location.href = payment.action_url;
      } else {
        router.push(`/checkout/result/?order_ref=${result.order_reference}`);
      }
    } catch {
      setErrorMessage('A network error occurred while establishing your checkout session.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container checkout-wrapper">
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
      <div className="container checkout-wrapper">
        <div className="checkout-already-card">
          <div className="already-icon" aria-hidden="true">✓</div>
          <h1 className="checkout-already-title">You Already Own This Guide</h1>
          <p className="checkout-already-desc">
            Your student account has verified lifetime download access for <strong>{resource.title}</strong>.
          </p>
          <div className="checkout-already-actions">
            <a href={fullDownloadUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Download PDF Now ↓
            </a>
            <Link href="/student/dashboard/" className="btn-outline-sm">
              My Student Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container checkout-wrapper">
      <div className="checkout-grid">
        {/* Left Column: Order Summary */}
        <div className="checkout-summary-card">
          <span className="checkout-badge">Official FBISE Study Packet</span>
          <h1 className="checkout-resource-title">{resource?.title || 'FBISE Subject Notes'}</h1>
          
          <div className="checkout-taxonomy">
            {resource?.class && <span className="badge-pill">{resource.class.name}</span>}
            {resource?.subject && <span className="badge-pill badge-neutral">{resource.subject.name}</span>}
            <span className="badge-pill badge-type">Complete Subject Guide</span>
          </div>

          <div className="checkout-features-list">
            <h3 className="features-subhead">What is included in this download:</h3>
            <ul className="checkout-benefits">
              <li>✓ High-resolution, complete offline PDF document ({resource?.page_count || 100}+ pages)</li>
              <li>✓ Full chapter-by-chapter solved textbook questions &amp; exercises</li>
              <li>✓ FBISE Student Learning Outcomes (SLO) conceptual questions &amp; answers</li>
              <li>✓ Step-by-step solved numericals and key formula sheets</li>
              <li>✓ Lifetime access &amp; free future syllabus updates for this subject</li>
            </ul>
          </div>

          <div className="checkout-price-box">
            <div className="price-row">
              <span className="price-label">Price:</span>
              <span className="price-val">PKR {resource?.price || '100'}</span>
            </div>
            <div className="price-row small">
              <span className="price-label">Currency:</span>
              <span className="price-val">PKR (Pakistani Rupee)</span>
            </div>
            <div className="price-row small">
              <span className="price-label">Taxes / Fees:</span>
              <span className="price-val">None (Included)</span>
            </div>
            <div className="price-divider"></div>
            <div className="price-row total">
              <span className="price-label">Total Amount:</span>
              <span className="price-val total-val">PKR {resource?.price || '100'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Student Status & Payment Selection */}
        <div className="checkout-action-card">
          <h2 className="checkout-action-heading">Payment Information</h2>

          {errorMessage && (
            <div className="alert-error" role="alert">
              <span className="alert-icon">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {!student ? (
            <div className="checkout-auth-prompt">
              <div className="prompt-icon">👤</div>
              <h3 className="prompt-title">Sign in to complete your purchase</h3>
              <p className="prompt-desc">
                Your purchased guide will be permanently attached to your student account for easy download on any device.
              </p>
              <div className="prompt-actions">
                <Link
                  href={`/student/login/?returnUrl=${encodeURIComponent(`/checkout/${resourceSlug}/`)}`}
                  className="btn-primary w-full text-center"
                >
                  Sign In to Continue →
                </Link>
                <Link
                  href={`/student/register/?returnUrl=${encodeURIComponent(`/checkout/${resourceSlug}/`)}`}
                  className="btn-outline-sm w-full text-center"
                >
                  Create Free Account
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleStartPayment} className="checkout-form">
              <div className="checkout-student-info">
                <span className="label-text">Logged in as:</span>
                <strong>{student.full_name || student.email}</strong>
                <span className="sub-text">{student.email}</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Select Payment Method <span className="req">*</span>
                </label>
                <div className="gateways-list">
                  {gateways.map((gw) => (
                    <label
                      key={gw.id}
                      className={`gateway-option ${selectedGateway === gw.id ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="payment_gateway"
                        value={gw.id}
                        checked={selectedGateway === gw.id}
                        onChange={() => setSelectedGateway(gw.id)}
                        className="gateway-radio"
                      />
                      <div className="gateway-details">
                        <div className="gateway-name-row">
                          <span className="gateway-name">{gw.name}</span>
                          <span className={`gateway-badge ${gw.id === 'sandbox' ? 'badge-dev' : 'badge-live'}`}>
                            {gw.badge}
                          </span>
                        </div>
                        <p className="gateway-desc">{gw.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="checkout-security-guarantee">
                <span className="lock-icon">🔒</span>
                <span>
                  Encrypted transaction. Payment is securely verified directly by FBISE servers before download access is granted.
                </span>
              </div>

              <button
                type="submit"
                className="btn-primary w-full btn-large"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Establishing Session...' : `Pay PKR ${resource?.price || '100'} Securely →`}
              </button>

              <div className="checkout-back-link">
                <Link href={`/${resource?.class?.slug || 'class-9'}/${resource?.subject?.slug || 'physics'}/${resource?.slug || resourceSlug}/`} className="text-muted">
                  ← Cancel and return to resource
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
