'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getOrderStatus, sandboxSimulatePay } from '@/lib/api';
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
  const isSandbox = searchParams.get('sandbox') === '1';

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
        // If this is a sandbox simulation redirect, trigger the backend sandbox payment grant
        if (isSandbox) {
          await sandboxSimulatePay(orderRef);
        }

        // Always independently query server-side order status
        const orderData = await getOrderStatus(orderRef);
        if (!isMounted) return;

        if (!orderData) {
          setErrorMessage('Order record could not be found.');
          return;
        }

        setOrder(orderData);

        // GA4 purchase event idempotency guard (prevent duplicates on page refresh)
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
  }, [orderRef, isSandbox]);

  if (isLoading) {
    return (
      <div className="container checkout-result-wrapper">
        <div className="admin-table-loading">
          <div className="spinner"></div>
          <p>Verifying transaction with banking network...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !order) {
    return (
      <div className="container checkout-result-wrapper">
        <div className="result-card error-state">
          <div className="result-icon-box error">⚠️</div>
          <h1 className="result-heading">Payment Verification Failed</h1>
          <p className="result-desc">
            {errorMessage || 'We were unable to verify your payment status.'}
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
  const fullDownloadUrl = order.resource?.download_url
    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${order.resource.download_url}`
    : null;

  return (
    <div className="container checkout-result-wrapper">
      <div className={`result-card ${isPaid ? 'success-state' : 'pending-state'}`}>
        <div className={`result-icon-box ${isPaid ? 'success' : 'pending'}`}>
          {isPaid ? '✓' : '⏱'}
        </div>

        <h1 className="result-heading">
          {isPaid ? 'Payment Confirmed & Guide Unlocked!' : 'Payment Pending or Incomplete'}
        </h1>

        <p className="result-desc">
          {isPaid
            ? `Your payment has been verified. You now have lifetime download access to ${order.resource?.title || 'your educational guide'}.`
            : `Your transaction is currently marked as ${order.status}. If your account was debited, your order will update automatically once the bank callback settles.`}
        </p>

        {/* Receipt summary box */}
        <div className="result-receipt-card">
          <div className="receipt-row">
            <span className="receipt-label">Order Reference:</span>
            <code className="receipt-value">{order.order_reference}</code>
          </div>
          {order.gateway_reference && (
            <div className="receipt-row">
              <span className="receipt-label">Transaction Reference:</span>
              <span className="receipt-value">{order.gateway_reference}</span>
            </div>
          )}
          <div className="receipt-row">
            <span className="receipt-label">Study Guide:</span>
            <span className="receipt-value font-bold">{order.resource?.title}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Amount Paid:</span>
            <span className="receipt-value font-bold highlight">
              {order.amount} {order.currency}
            </span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Payment Method:</span>
            <span className="receipt-value">{order.payment_gateway.toUpperCase()}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Status:</span>
            <span className={`status-pill ${isPaid ? 'pill-success' : 'pill-draft'}`}>
              {isPaid ? '● Paid (Access Active)' : `○ ${order.status}`}
            </span>
          </div>
        </div>

        <div className="result-actions">
          {isPaid && fullDownloadUrl ? (
            <a
              href={fullDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary btn-large"
              title="Download your purchased complete PDF guide"
            >
              Download Complete PDF Now ↓
            </a>
          ) : null}

          <Link href="/student/dashboard/" className="btn-outline-sm">
            Go to Student Dashboard →
          </Link>
          {order.resource?.public_url && (
            <Link href={order.resource.public_url} className="btn-outline-sm">
              Read Online View
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
