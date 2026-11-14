'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ResourceItem } from '@/lib/api';

interface ResourceActionStripProps {
  initialResource: ResourceItem;
  priceFormatted: string;
}

export default function ResourceActionStrip({
  initialResource,
  priceFormatted,
}: ResourceActionStripProps) {
  const [hasPurchased, setHasPurchased] = useState(Boolean(initialResource.user_has_purchased));
  const [downloadUrl, setDownloadUrl] = useState(initialResource.download_url);
  const [pendingOrder, setPendingOrder] = useState(initialResource.pending_order || null);

  const resourceSlug = initialResource.slug;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!resourceSlug) return;

    fetch(`${apiUrl}/api/resources/by-slug/${encodeURIComponent(resourceSlug)}/`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.user_has_purchased) {
            setHasPurchased(true);
            setDownloadUrl(data.download_url);
            setPendingOrder(null);
          } else if (data.pending_order) {
            setPendingOrder(data.pending_order);
            setHasPurchased(false);
          } else {
            setPendingOrder(null);
            setHasPurchased(false);
          }
        }
      })
      .catch(() => {});
  }, [resourceSlug, apiUrl]);

  const fullDownloadUrl = downloadUrl
    ? (downloadUrl.startsWith('http') ? downloadUrl : `${apiUrl}${downloadUrl}`)
    : null;

  return (
    <div
      className="resource-purchase-strip"
      style={{
        background: '#ffffff',
        border: pendingOrder?.status === 'pending_verification' ? '1.5px solid #f59e0b' : '1.5px solid #10b981',
        borderRadius: '8px',
        padding: '0.65rem 0.95rem',
        marginBottom: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        flexWrap: 'wrap',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: '#047857',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
          }}
        >
          Offline PDF
        </span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
          Complete FBISE Solved Guide:
        </span>
        <span
          style={{
            fontSize: '0.9rem',
            fontWeight: 900,
            color: '#047857',
            background: '#f0fdf4',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
          }}
        >
          PKR {priceFormatted}
        </span>
      </div>

      <div>
        {hasPurchased && fullDownloadUrl ? (
          <a
            href={fullDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#047857',
              color: '#ffffff',
              padding: '0.4rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
              borderRadius: '6px',
            }}
            title="Download verified PDF"
          >
            📥 Download PDF ↓
          </a>
        ) : pendingOrder?.status === 'pending_verification' ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#92400e',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              ⏳ Payment Verification Pending (Order #{pendingOrder.order_reference})
            </span>
            <Link
              href="/student/dashboard/"
              className="btn-primary-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                background: '#d97706',
                color: '#ffffff',
                padding: '0.35rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                textDecoration: 'none',
                borderRadius: '6px',
              }}
            >
              View Status in Dashboard →
            </Link>
          </div>
        ) : pendingOrder?.status === 'pending_payment' ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#1e40af',
                background: '#dbeafe',
                border: '1px solid #bfdbfe',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
              }}
            >
              💳 Order Pending Payment
            </span>
            <Link
              href={`/checkout/${resourceSlug}/`}
              className="btn-primary-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                background: '#2563eb',
                color: '#ffffff',
                padding: '0.35rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                textDecoration: 'none',
                borderRadius: '6px',
              }}
            >
              Complete Payment →
            </Link>
          </div>
        ) : (
          <Link
            href={`/checkout/${resourceSlug}/`}
            className="btn-primary-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#047857',
              color: '#ffffff',
              padding: '0.4rem 0.95rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
              borderRadius: '6px',
            }}
            title="Purchase complete subject PDF"
          >
            📥 Download Offline PDF (PKR {priceFormatted}) →
          </Link>
        )}
      </div>
    </div>
  );
}
