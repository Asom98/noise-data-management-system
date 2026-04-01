import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE, getNoiseColor, getSensorDisplayName } from '../utils/noise';

export default function AlertsOutliers() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'high', 'low'

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await axios.get(`${API_BASE}/api/alerts`);
        setAlerts(res.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const highOutliers = alerts.filter((a) => a.alert_type === 'High' || a.alert_type === 'Critical');
  const lowOutliers = alerts.filter((a) => a.alert_type === 'Low');
  const criticalAlerts = alerts.filter((a) => a.alert_type === 'Critical');
  const warningAlerts = alerts.filter((a) => a.alert_type === 'High');

  const filtered = filter === 'high'
    ? highOutliers
    : filter === 'low'
    ? lowOutliers
    : alerts;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page title */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>Alerts & Outliers</h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Last 24 hours — anomalous noise readings</p>
      </div>

      {/* Active alert banners */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {criticalAlerts.length > 0 && (
            <div style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#EF4444' }}>
                Critical Alert: {criticalAlerts.length} sensor{criticalAlerts.length !== 1 ? 's' : ''} exceeding 80 dB in the last 24 hours
              </span>
            </div>
          )}
          {warningAlerts.length > 0 && (
            <div style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#B45309' }}>
                Warning: {warningAlerts.length} reading{warningAlerts.length !== 1 ? 's' : ''} between 70–80 dB detected
              </span>
            </div>
          )}
        </div>
      )}

      {/* Outliers table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
            Noise Reading Outliers
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                backgroundColor: filter === 'all' ? '#F3F4F6' : 'white',
                color: '#374151',
                border: '1px solid #E5E7EB',
              }}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('high')}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                backgroundColor: filter === 'high' ? '#FEF2F2' : 'white',
                color: '#EF4444',
                border: `1px solid ${filter === 'high' ? '#FECACA' : '#E5E7EB'}`,
              }}
            >
              {highOutliers.length} High outliers
            </button>
            <button
              onClick={() => setFilter('low')}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                backgroundColor: filter === 'low' ? '#EFF6FF' : 'white',
                color: '#2563EB',
                border: `1px solid ${filter === 'low' ? '#BFDBFE' : '#E5E7EB'}`,
              }}
            >
              {lowOutliers.length} Low outliers
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
            Loading alerts...
          </div>
        ) : error ? (
          <div style={{ padding: '20px', color: '#EF4444', fontSize: '14px' }}>
            Error: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
            No outliers found in the last 24 hours
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB' }}>
                  {['Sensor', 'Location', 'Reading', 'Type', 'Timestamp', 'Notes'].map((col) => (
                    <th key={col} style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#374151',
                      fontSize: '12px',
                      borderBottom: '1px solid #E5E7EB',
                      whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((alert, idx) => {
                  const color = getNoiseColor(alert.value_db);
                  const typeBg = alert.alert_type === 'Critical' ? '#FEF2F2'
                    : alert.alert_type === 'High' ? '#FFF7ED'
                    : '#EFF6FF';
                  const typeColor = alert.alert_type === 'Critical' ? '#EF4444'
                    : alert.alert_type === 'High' ? '#F97316'
                    : '#2563EB';
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontFamily: 'monospace', fontSize: '12px',
                          backgroundColor: '#EFF6FF', color: '#2563EB',
                          padding: '2px 6px', borderRadius: '4px',
                        }}>
                          {alert.sensor_id}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#374151' }}>
                        {getSensorDisplayName(alert.sensor_id, alert.description)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px', color }}>
                          {alert.value_db.toFixed(1)} dB
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          backgroundColor: typeBg,
                          color: typeColor,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}>
                          {alert.alert_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                        {new Date(alert.ts).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: '12px' }}>
                        —
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
