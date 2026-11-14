'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/AdminNav';
import {
  adminGetOrders,
  adminApproveOrder,
  adminRejectOrder,
  adminRefundOrder,
  adminGetMe,
  OrderItem,
} from '@/lib/api';

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [paidOrdersCount, setPaidOrdersCount] = useState(0);
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState('0.00');

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');

  // Modals state
  const [selectedOrderForApprove, setSelectedOrderForApprove] = useState<OrderItem | null>(null);
  const [isProcessingApprove, setIsProcessingApprove] = useState(false);

  const [selectedOrderForReject, setSelectedOrderForReject] = useState<OrderItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Transaction ID not found in bank ledger or amount mismatched.');
  const [isProcessingReject, setIsProcessingReject] = useState(false);

  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<OrderItem | null>(null);
  const [refundReason, setRefundReason] = useState('Customer requested refund / duplicate charge');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Verify staff admin authentication
  useEffect(() => {
    adminGetMe()
      .then((data) => {
        if (!data || !data.authenticated || !data.user?.is_staff) {
          router.replace('/login/?returnUrl=/admin/orders/&error=admin_required');
        }
      })
      .catch(() => {
        router.replace('/login/?returnUrl=/admin/orders/&error=admin_required');
      });
  }, [router]);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminGetOrders({
        q: searchQuery,
        status: statusFilter,
        gateway: gatewayFilter,
      });

      if (data) {
        setOrders(data.orders || []);
        setTotalOrders(data.total_orders || 0);
        setPaidOrdersCount(data.paid_orders_count || 0);
        setPendingVerificationCount(data.pending_verification_count || 0);
        setTotalRevenue(data.total_revenue_pkr || '0.00');
      }
    } catch {
      setErrorMessage('Failed to load orders from database.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, gatewayFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadOrders]);

  const handleConfirmApprove = async () => {
    if (!selectedOrderForApprove) return;

    setIsProcessingApprove(true);
    try {
      const res = await adminApproveOrder(selectedOrderForApprove.id);
      if (res.success) {
        setSuccessMessage(`Order ${selectedOrderForApprove.order_reference} approved successfully. Student download access unlocked.`);
        setSelectedOrderForApprove(null);
        loadOrders();
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage(res.error || 'Failed to approve order.');
      }
    } catch {
      setErrorMessage('Network error approving payment.');
    } finally {
      setIsProcessingApprove(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedOrderForReject) return;

    setIsProcessingReject(true);
    try {
      const res = await adminRejectOrder(selectedOrderForReject.id, rejectionReason);
      if (res.success) {
        setSuccessMessage(`Order ${selectedOrderForReject.order_reference} marked as rejected.`);
        setSelectedOrderForReject(null);
        loadOrders();
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage(res.error || 'Failed to reject order.');
      }
    } catch {
      setErrorMessage('Network error rejecting payment.');
    } finally {
      setIsProcessingReject(false);
    }
  };

  const handleConfirmRefund = async () => {
    if (!selectedOrderForRefund) return;

    setIsProcessingRefund(true);
    try {
      const res = await adminRefundOrder(selectedOrderForRefund.id, refundReason);
      if (res.success) {
        setSuccessMessage(`Order ${selectedOrderForRefund.order_reference} marked as refunded and access revoked.`);
        setSelectedOrderForRefund(null);
        loadOrders();
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage(res.error || 'Failed to refund order.');
      }
    } catch {
      setErrorMessage('Network error processing refund.');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  return (
    <div className="admin-page-wrapper">
      <AdminNav />

      <main className="container admin-main-content">
        <div className="admin-header-row">
          <div>
            <h1 className="admin-heading">Orders &amp; Sales Management</h1>
            <p className="admin-subheading-badges" style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
              <span className="badge-pill badge-neutral">Total Orders: {totalOrders}</span>
              <span className="badge-pill badge-neutral">Paid: {paidOrdersCount}</span>
              {pendingVerificationCount > 0 && (
                <span
                  className="badge-pill"
                  style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: 700 }}
                >
                  ⏳ Pending Verification: {pendingVerificationCount}
                </span>
              )}
              <span className="badge-pill badge-type">Revenue: PKR {totalRevenue}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href="/admin/pages/?tab=payment"
              className="btn-outline-sm"
              title="Configure receiving bank/wallet accounts and checkout instructions"
              style={{ fontWeight: 700, color: '#047857', borderColor: '#047857' }}
            >
              ⚙️ Receiving Accounts &amp; Steps
            </Link>
            <Link href="/admin/resources/" className="btn-outline-sm" title="Manage resources catalog">
              ← Manage Resources
            </Link>
          </div>
        </div>

        {/* Status Alerts */}
        {successMessage && (
          <div className="alert-success" role="alert">
            <span className="alert-icon">✓</span>
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Filters Card */}
        <div className="admin-filters-card">
          <div className="admin-filter-field search-field">
            <label htmlFor="order-search" className="sr-only">
              Search Orders
            </label>
            <input
              id="order-search"
              type="text"
              placeholder="Search by order ref, TID, phone, student, or resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="admin-filter-field">
            <label htmlFor="filter-status" className="sr-only">
              Filter by Status
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
            >
              <option value="">All Statuses</option>
              <option value="pending_verification">Pending Verification (Needs Approval)</option>
              <option value="paid">Paid (Verified)</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Pending Checkout</option>
              <option value="failed">Failed / Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div className="admin-filter-field">
            <label htmlFor="filter-gateway" className="sr-only">
              Filter by Gateway
            </label>
            <select
              id="filter-gateway"
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value)}
              className="form-select"
            >
              <option value="">All Methods</option>
              <option value="manual_transfer">Manual Bank / Wallet Transfer</option>
              <option value="direct_transfer">Direct Transfer</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="admin-table-container">
          {isLoading ? (
            <div className="admin-table-loading">
              <div className="spinner"></div>
              <p>Loading student orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="admin-empty-state">
              <p className="empty-title">No orders found.</p>
              <p className="empty-desc">No transaction records match the specified search or filter criteria.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Order Reference / TID</th>
                  <th scope="col">Student</th>
                  <th scope="col">Resource</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Payment Method</th>
                  <th scope="col">Status</th>
                  <th scope="col">Date</th>
                  <th scope="col" className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <code className="order-code">{o.order_reference}</code>
                      {o.transaction_id && (
                        <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 600 }}>
                          TID: {o.transaction_id}
                        </div>
                      )}
                      {o.is_duplicate_tid && (
                        <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #f87171', borderRadius: '4px', padding: '0.1rem 0.35rem', fontSize: '0.68rem', fontWeight: 700, display: 'inline-block', marginTop: '0.15rem' }}>
                          ⚠️ Duplicate TID Reused!
                        </span>
                      )}
                      {o.receiving_account && (
                        <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600 }}>
                          To: {o.receiving_account}
                        </div>
                      )}
                      {o.sender_name && (
                        <div style={{ fontSize: '0.72rem', color: '#334155' }}>
                          Sender: {o.sender_name}
                        </div>
                      )}
                      {o.sender_phone && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Phone: {o.sender_phone}
                        </div>
                      )}
                      {o.payment_screenshot_url && (
                        <a
                          href={o.payment_screenshot_url.startsWith('http') ? o.payment_screenshot_url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${o.payment_screenshot_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-block', marginTop: '0.2rem', fontSize: '0.72rem', color: '#2563eb', textDecoration: 'underline', fontWeight: 600 }}
                        >
                          📷 View Receipt Screenshot
                        </a>
                      )}
                      {o.customer_note && (
                        <div style={{ fontSize: '0.72rem', color: '#065f46', background: '#ecfdf5', padding: '0.2rem 0.45rem', borderRadius: '4px', marginTop: '0.25rem', border: '1px solid #a7f3d0', lineHeight: 1.3 }}>
                          📝 <strong>Note:</strong> {o.customer_note}
                        </div>
                      )}
                    </td>
                    <td>
                      <div>
                        <strong>{o.student_name || 'Student'}</strong>
                        <div className="text-muted text-xs">{o.student_email}</div>
                      </div>
                    </td>
                    <td>
                      <span className="order-resource-name">{o.resource_title}</span>
                    </td>
                    <td>
                      <strong>
                        {o.amount} {o.currency}
                      </strong>
                    </td>
                    <td>
                      <span className="badge-pill badge-neutral">{o.payment_gateway.toUpperCase()}</span>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          o.status === 'paid'
                            ? 'pill-success'
                            : o.status === 'pending_verification'
                            ? 'pill-draft'
                            : o.status === 'rejected'
                            ? 'pill-failed'
                            : o.status === 'refunded'
                            ? 'pill-refunded'
                            : 'pill-failed'
                        }`}
                        style={
                          o.status === 'pending_verification'
                            ? { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }
                            : undefined
                        }
                      >
                        {o.status === 'pending_verification'
                          ? '⏳ Needs Verification'
                          : o.status_display}
                      </span>
                    </td>
                    <td>
                      <span className="text-muted" style={{ fontSize: '0.78rem' }}>
                        {new Date(o.created_at).toLocaleDateString('en-PK', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="text-right">
                      {o.status === 'pending_verification' && (
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForApprove(o)}
                            className="btn-outline-sm"
                            style={{
                              background: '#ecfdf5',
                              borderColor: '#a7f3d0',
                              color: '#065f46',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                            }}
                            title="Verify and unlock student download access"
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForReject(o)}
                            className="btn-outline-sm"
                            style={{
                              background: '#fef2f2',
                              borderColor: '#fecaca',
                              color: '#991b1b',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                            }}
                            title="Reject invalid transaction ID"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}

                      {o.status === 'paid' && (
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForRefund(o)}
                          className="btn-icon btn-icon-danger"
                          title="Revoke download access and record refund"
                        >
                          Revoke / Refund
                        </button>
                      )}

                      {o.status === 'rejected' && o.rejection_reason && (
                        <span style={{ fontSize: '0.72rem', color: '#991b1b' }} title={o.rejection_reason}>
                          Rejected
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Approve Modal */}
      {selectedOrderForApprove && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-approve-title">
          <div className="modal-box">
            <h3 id="modal-approve-title" className="modal-title" style={{ color: '#065f46' }}>
              ✓ Confirm Bank Transfer &amp; Unlock Access
            </h3>
            <p className="modal-text">
              Order: <strong>{selectedOrderForApprove.order_reference}</strong> ({selectedOrderForApprove.student_email})
            </p>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '0.85rem', fontSize: '0.825rem' }}>
              <div>Amount to Verify: <strong>PKR {selectedOrderForApprove.amount}</strong></div>
              <div>Submitted TID: <strong style={{ color: '#1e40af' }}>{selectedOrderForApprove.transaction_id || 'Not provided'}</strong></div>
              {selectedOrderForApprove.is_duplicate_tid && (
                <div style={{ color: '#b91c1c', fontWeight: 700, marginTop: '0.25rem', background: '#fef2f2', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #f87171' }}>
                  ⚠️ ALERT: This exact Transaction ID exists on another order! Verify actual bank statement carefully before approving.
                </div>
              )}
              {selectedOrderForApprove.receiving_account && (
                <div>Platform Receiving Account: <strong style={{ color: '#047857' }}>{selectedOrderForApprove.receiving_account}</strong></div>
              )}
              {selectedOrderForApprove.sender_name && (
                <div>Sender Account Title / Name: <strong>{selectedOrderForApprove.sender_name}</strong></div>
              )}
              <div>Sender Mobile: <strong>{selectedOrderForApprove.sender_phone || 'None'}</strong></div>
              <div>Study Guide: <strong>{selectedOrderForApprove.resource_title}</strong></div>
              {selectedOrderForApprove.payment_screenshot_url && (
                <div style={{ marginTop: '0.4rem' }}>
                  <a
                    href={selectedOrderForApprove.payment_screenshot_url.startsWith('http') ? selectedOrderForApprove.payment_screenshot_url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${selectedOrderForApprove.payment_screenshot_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 700 }}
                  >
                    📷 View Uploaded Receipt Screenshot (Opens in New Tab)
                  </a>
                </div>
              )}
              {selectedOrderForApprove.customer_note && (
                <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px dashed #cbd5e1', color: '#065f46' }}>
                  📝 Customer Note: <strong>&quot;{selectedOrderForApprove.customer_note}&quot;</strong>
                </div>
              )}
            </div>
            <p className="modal-warning" style={{ fontSize: '0.8rem' }}>
              Confirm that the submitted TID matches your official JazzCash, Easypaisa, or Bank statement. Approving will immediately unlock download access for the student and dispatch an email confirmation.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setSelectedOrderForApprove(null)}
                className="btn-outline-sm"
                disabled={isProcessingApprove}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                className="btn-primary"
                style={{ background: '#047857' }}
                disabled={isProcessingApprove}
              >
                {isProcessingApprove ? 'Verifying...' : 'Confirm & Unlock Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {selectedOrderForReject && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-reject-title">
          <div className="modal-box">
            <h3 id="modal-reject-title" className="modal-title" style={{ color: '#991b1b' }}>
              ✗ Reject Payment Verification
            </h3>
            <p className="modal-text">
              Order: <strong>{selectedOrderForReject.order_reference}</strong> ({selectedOrderForReject.student_email})
            </p>
            <div style={{ background: '#fef2f2', padding: '0.65rem', borderRadius: '6px', border: '1px solid #fecaca', marginBottom: '0.85rem', fontSize: '0.8rem' }}>
              <div>TID: <strong>{selectedOrderForReject.transaction_id || 'Not provided'}</strong></div>
              <div>Amount: <strong>PKR {selectedOrderForReject.amount}</strong></div>
              {selectedOrderForReject.receiving_account && (
                <div>To Account: <strong>{selectedOrderForReject.receiving_account}</strong></div>
              )}
              {selectedOrderForReject.sender_name && (
                <div>Sender Name: <strong>{selectedOrderForReject.sender_name}</strong></div>
              )}
              <div>Sender Phone: <strong>{selectedOrderForReject.sender_phone || 'None'}</strong></div>
              {selectedOrderForReject.payment_screenshot_url && (
                <div style={{ marginTop: '0.3rem' }}>
                  <a
                    href={selectedOrderForReject.payment_screenshot_url.startsWith('http') ? selectedOrderForReject.payment_screenshot_url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${selectedOrderForReject.payment_screenshot_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#991b1b', textDecoration: 'underline', fontWeight: 600 }}
                  >
                    📷 View Uploaded Receipt Screenshot
                  </a>
                </div>
              )}
              {selectedOrderForReject.customer_note && (
                <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px dashed #fecaca', color: '#991b1b' }}>
                  📝 Customer Note: <strong>&quot;{selectedOrderForReject.customer_note}&quot;</strong>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="reject-reason" className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Rejection Reason (Dispatched to Student via Email):
              </label>
              <textarea
                id="reject-reason"
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="form-textarea"
                style={{ fontSize: '0.825rem' }}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setSelectedOrderForReject(null)}
                className="btn-outline-sm"
                disabled={isProcessingReject}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="btn-danger"
                disabled={isProcessingReject}
              >
                {isProcessingReject ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund / Revocation Modal */}
      {selectedOrderForRefund && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-refund-title">
          <div className="modal-box">
            <h3 id="modal-refund-title" className="modal-title">
              Record Refund &amp; Revoke Access?
            </h3>
            <p className="modal-text">
              Order: <strong>{selectedOrderForRefund.order_reference}</strong> ({selectedOrderForRefund.student_email})
            </p>
            <p className="modal-warning">
              This action marks the order as <strong>Refunded</strong> and deactivates the student&apos;s download grant for{' '}
              <strong>{selectedOrderForRefund.resource_title}</strong>.
            </p>

            <div className="form-group">
              <label htmlFor="refund-reason" className="form-label">
                Revocation Reason / Note:
              </label>
              <textarea
                id="refund-reason"
                rows={2}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="form-textarea"
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setSelectedOrderForRefund(null)}
                className="btn-outline-sm"
                disabled={isProcessingRefund}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                className="btn-danger"
                disabled={isProcessingRefund}
              >
                {isProcessingRefund ? 'Processing...' : 'Confirm Refund & Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
