'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/AdminNav';
import { adminGetOrders, adminRefundOrder, adminGetMe, OrderItem } from '@/lib/api';

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [paidOrdersCount, setPaidOrdersCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState('0.00');

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');

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
          router.replace('/admin/login/');
        }
      })
      .catch(() => {
        router.replace('/admin/login/');
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

  const handleConfirmRefund = async () => {
    if (!selectedOrderForRefund) return;

    setIsProcessingRefund(true);
    try {
      const res = await adminRefundOrder(selectedOrderForRefund.id, refundReason);
      if (res.success) {
        setSuccessMessage(`Order ${selectedOrderForRefund.order_reference} marked as refunded and access revoked.`);
        setSelectedOrderForRefund(null);
        loadOrders();
        setTimeout(() => setSuccessMessage(null), 4000);
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
            <p className="admin-subheading-badges">
              <span className="badge-pill badge-neutral">Total Orders: {totalOrders}</span>
              <span className="badge-pill badge-neutral">Paid: {paidOrdersCount}</span>
              <span className="badge-pill badge-type">Revenue: PKR {totalRevenue}</span>
            </p>
          </div>
          <Link href="/admin/resources/" className="btn-outline-sm" title="Manage resources catalog">
            ← Manage Resources
          </Link>
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
              placeholder="Search by order ref, student email, or resource..."
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
              <option value="paid">Paid (Verified)</option>
              <option value="pending">Pending Payment</option>
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
              <option value="">All Gateways</option>
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">Easypaisa</option>
              <option value="sandbox">Sandbox (Test)</option>
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
                  <th scope="col">Order Reference</th>
                  <th scope="col">Student</th>
                  <th scope="col">Resource</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Gateway</th>
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
                      {o.gateway_reference && (
                        <div className="text-muted text-xs">Txn: {o.gateway_reference}</div>
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
                            : o.status === 'pending'
                            ? 'pill-draft'
                            : o.status === 'refunded'
                            ? 'pill-refunded'
                            : 'pill-failed'
                        }`}
                      >
                        {o.status_display}
                      </span>
                    </td>
                    <td>
                      <span className="text-muted">
                        {new Date(o.created_at).toLocaleDateString('en-PK', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="text-right">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

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

