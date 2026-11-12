'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getOrderStatus } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';

interface OrderState {
  order_reference: string;
  status: string;
  is_paid: boolean;
  amount: string;
  currency: string;
  payment_gateway: string;
  gateway_reference?: string;
  created_at: string;
  paid_at?: string | null;
  resource?: {
    id: number;
    title: string;
    slug: string;
    download_url?: string | null;
    public_url?: string;
  };
}

function CheckoutResultContent() {
  const searchParams = useSearchParams();
  const orderRef = searchParams.get('order_ref') || searchParams.get('pp_BillReference') || '';

  const [order, setOrder] = useState<OrderState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!orderRef) {
      setErrorMessage('No order reference provided.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function verifyAndLoadOrder() {
      try {
        const orderData = await getOrderStatus(orderRef);
        if (!isMounted) return;

        if (!orderData) {
          setErrorMessage('Order record could not be found.');
          return;
        }

        setOrder(orderData);

        // GA4 purchase event (fires only on verified paid status, once per order reference)
        if (orderData.status === 'paid') {
          const firedKey = `ga4_purchased_${orderRef}`;
          if (typeof window !== 'undefined' && !sessionStorage.getItem(firedKey)) {
            sessionStorage.setItem(firedKey, '1');
            trackEvent('purchase', {
              transaction_id: orderRef,
              value: parseFloat(orderData.amount) || 100,
              currency: orderData.currency || 'PKR',
              items: [
                {
                  item_id: String(orderData.resource?.id || ''),
                  item_name: orderData.resource?.title || 'FBISE Study Notes',
                  price: parseFloat(orderData.amount) || 100,
                  currency: orderData.currency || 'PKR',
                  quantity: 1,
                },
              ],
            });
          }
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Network error while verifying payment status.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    verifyAndLoadOrder();

    return () => {
      isMounted = false;
    };
  }, [orderRef]);

  if (isLoading) {
    return (
      <div className="container checkout-result-wrapper">
        <div className="admin-table-loading">
          <div className="spinner"></div>
          <p>Verifying transaction record...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !order) {
    return (
      <div className="container checkout-result-wrapper">
        <div className="result-card error-state">
          <div className="result-icon-box error">⚠️</div>
          <h1 className="result-heading">Order Verification Failed</h1>
          <p className="result-desc">
            {errorMessage || 'We were unable to locate your payment record.'}
          </p>
          <div className="result-actions">
            <Link href="/" className="btn-primary">
              Return to Homepage
            </Link>
            <Link href="/student/dashboard/" className="btn-outline-sm">
              My Student Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = order.status === 'paid';
  const isPendingVerification = order.status === 'pending_verification';
  const isRejected = order.status === 'rejected';

  const fullDownloadUrl = order.resource?.download_url
    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${order.resource.download_url}`
    : null;

  return (
    <div className="container checkout-result-wrapper" style={{ padding: '2rem 1rem', maxWidth: '640px', margin: '0 auto' }}>
      <div
        className={`result-card ${
          isPaid
            ? 'success-state'
            : isPendingVerification
            ? 'pending-verification-state'
            : isRejected
            ? 'error-state'
            : 'pending-state'
        }`}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.75rem',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div
          className="result-icon-box"
          style={{
            fontSize: '2.5rem',
            marginBottom: '0.75rem',
          }}
        >
          {isPaid ? '✓' : isPendingVerification ? '⏳' : isRejected ? '✗' : '⏱'}
        </div>

        <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          {isPaid
            ? 'Payment Confirmed & Guide Unlocked!'
            : isPendingVerification
            ? 'Payment Submitted for Verification'
            : isRejected
            ? 'Payment Verification Declined'
            : 'Payment Pending Confirmation'}
        </h1>

        <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
          {isPaid
            ? `Your payment has been verified. You now have lifetime download access to ${order.resource?.title || 'your educational guide'}.`
            : isPendingVerification
            ? 'Your Transaction ID and payment details have been submitted. An administrator will verify the transfer in our official account statement (typically within 15 to 30 minutes). Once approved, your complete PDF study packet will be available for download.'
            : isRejected
            ? 'We were unable to verify this transaction against our bank statement. Please verify your Transaction ID and contact support if this was in error.'
            : `Your transaction is currently recorded as ${order.status}. It will update once the payment settles.`}
        </p>

        {/* Receipt summary card */}
        <div
          className="result-receipt-card"
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.25rem',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b' }}>Order Reference:</span>
            <code style={{ fontWeight: 700, color: '#0f172a' }}>{order.order_reference}</code>
          </div>
          {order.gateway_reference && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Transaction / TID:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{order.gateway_reference}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b' }}>Study Guide:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{order.resource?.title}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b' }}>Amount:</span>
            <span style={{ fontWeight: 800, color: '#047857' }}>
              {order.amount} {order.currency}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.8rem', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b' }}>Payment Option:</span>
            <span style={{ fontWeight: 600, color: '#334155' }}>{order.payment_gateway.toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>Status:</span>
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                background: isPaid ? '#ecfdf5' : isPendingVerification ? '#eff6ff' : '#fef2f2',
                color: isPaid ? '#065f46' : isPendingVerification ? '#1e40af' : '#991b1b',
                border: isPaid ? '1px solid #a7f3d0' : isPendingVerification ? '1px solid #bfdbfe' : '1px solid #fecaca',
              }}
            >
              {isPaid
                ? '● Paid (Access Active)'
                : isPendingVerification
                ? '⏳ Pending Admin Verification'
                : `○ ${order.status.toUpperCase()}`}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isPaid && fullDownloadUrl && (
            <a
              href={fullDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
              title="Download your complete PDF guide"
            >
              Download Complete PDF Now ↓
            </a>
          )}

          <Link
            href="/student/dashboard/"
            className="btn-primary"
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.9rem',
              background: isPaid ? '#334155' : '#047857',
            }}
          >
            My Student Dashboard →
          </Link>

          {order.resource?.public_url && (
            <Link
              href={order.resource.public_url}
              className="btn-outline-sm"
              style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
            >
              Read Online
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense fallback={<div className="container checkout-result-wrapper"><div className="spinner"></div></div>}>
      <CheckoutResultContent />
    </Suspense>
  );
}
