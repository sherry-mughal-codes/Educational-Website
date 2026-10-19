'use client';

import { useState, useEffect, useCallback } from 'react';

interface HealthData {
  status: string;
  service: string;
  database: string;
  timestamp: string;
  error?: string;
}

export default function BackendStatus() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/health/`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to backend');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return (
    <div className="status-card" id="backend-status-card">
      <div className="status-header">
        <div className="status-title-group">
          <span className="status-indicator-dot" data-state={loading ? 'loading' : error ? 'error' : 'ok'} />
          <h3 className="status-title">System & Database Status</h3>
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="btn-refresh"
          id="btn-refresh-status"
        >
          {loading ? 'Checking...' : 'Check Connection'}
        </button>
      </div>

      <div className="status-body">
        <div className="status-metric">
          <span className="metric-label">API Endpoint</span>
          <code className="metric-code">{apiUrl}/api/health/</code>
        </div>

        <div className="status-metric">
          <span className="metric-label">Backend Service</span>
          <span className={`status-pill ${error ? 'pill-error' : loading ? 'pill-pending' : 'pill-success'}`}>
            {loading ? 'Connecting...' : error ? 'Offline' : data?.service || 'Online'}
          </span>
        </div>

        <div className="status-metric">
          <span className="metric-label">PostgreSQL Database</span>
          <span className={`status-pill ${data?.database === 'connected' ? 'pill-success' : 'pill-error'}`}>
            {loading ? 'Checking...' : data?.database || (error ? 'Unreachable' : 'Degraded')}
          </span>
        </div>

        {data?.timestamp && (
          <div className="status-metric">
            <span className="metric-label">Last Checked</span>
            <span className="metric-value">{new Date(data.timestamp).toLocaleTimeString()}</span>
          </div>
        )}

        {error && (
          <div className="status-alert alert-error">
            <strong>Connection Failed:</strong> {error}
            <div className="alert-hint">
              Ensure Django container is running and port 8000 is accessible.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
