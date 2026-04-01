import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE, getSensorDisplayName, downloadCSV } from '../utils/noise';

function StatusBadge({ status }) {
  const map = {
    Operational: { color: '#10B981', bg: '#ECFDF5' },
    Warning: { color: '#F59E0B', bg: '#FFFBEB' },
    Critical: { color: '#EF4444', bg: '#FEF2F2' },
    'Maintenance Due': { color: '#6B7280', bg: '#F3F4F6' },
  };
  const s = map[status] || map['Maintenance Due'];
  return (
    <span style={{
      backgroundColor: s.bg,
      color: s.color,
      padding: '3px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
    }}>
      {status}
    </span>
  );
}

function BatteryBar({ pct }) {
  const color = pct > 60 ? '#10B981' : pct > 30 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        flex: 1,
        height: '6px',
        backgroundColor: '#E5E7EB',
        borderRadius: '3px',
        overflow: 'hidden',
        maxWidth: '80px',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: '3px',
          transition: 'width 0.3s',
        }} />
      </div>
      <span style={{ fontSize: '12px', color: '#374151', minWidth: '30px' }}>{pct}%</span>
    </div>
  );
}

export default function SensorHealth() {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await axios.get(`${API_BASE}/api/sensors/health`);
        setSensors(res.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const operational = sensors.filter((s) => s.status === 'Operational').length;
  const warning = sensors.filter((s) => s.status === 'Warning').length;
  const critical = sensors.filter((s) => s.status === 'Critical').length;
  const total = sensors.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>Sensor Health</h1>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Status overview for all registered sensors</p>
        </div>
        <button
          onClick={() => downloadCSV('sensor-health.csv', sensors.map((s) => ({
            sensor_id: s.sensor_id,
            location: getSensorDisplayName(s.sensor_id, s.description),
            battery_pct: s.battery_pct,
            signal: s.signal,
            status: s.status,
            last_seen: s.last_seen,
          })))}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            backgroundColor: '#2563EB',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export Report
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: 'Operational', count: operational, color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
          { label: 'Warning', count: warning, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Critical', count: critical, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
          { label: 'Total Sensors', count: total, color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
        ].map((item) => (
          <div key={item.label} style={{
            backgroundColor: item.bg,
            borderRadius: '12px',
            padding: '16px 20px',
            border: `1px solid ${item.border}`,
          }}>
            <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>{item.label}</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: item.color, marginTop: '4px', lineHeight: 1 }}>
              {loading ? '—' : item.count}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Sensor Status Table</h2>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: '20px', color: '#EF4444', fontSize: '14px' }}>Error: {error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB' }}>
                  {['Sensor ID', 'Location', 'Battery', 'Signal', 'Status', 'Last Seen'].map((col) => (
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
                {sensors.map((sensor) => (
                  <tr key={sensor.sensor_id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontFamily: 'monospace', fontSize: '12px',
                        backgroundColor: '#EFF6FF', color: '#2563EB',
                        padding: '2px 6px', borderRadius: '4px',
                      }}>
                        {sensor.sensor_id}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#374151' }}>
                      {getSensorDisplayName(sensor.sensor_id, sensor.description)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <BatteryBar pct={sensor.battery_pct} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: '12px',
                        color: sensor.signal === 'Strong' ? '#10B981' : sensor.signal === 'Moderate' ? '#F59E0B' : '#EF4444',
                        fontWeight: '500',
                      }}>
                        {sensor.signal}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={sensor.status} />
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {sensor.last_seen ? new Date(sensor.last_seen).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
