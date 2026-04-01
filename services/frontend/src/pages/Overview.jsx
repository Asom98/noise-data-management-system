import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { API_BASE, SENSOR_COLORS, getNoiseColor } from '../utils/noise';

function KpiCard({ title, value, subtitle, borderHighlight, icon }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      border: borderHighlight ? `2px solid ${borderHighlight}` : '1px solid #E5E7EB',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>{title}</span>
        {icon && <div style={{ color: '#6B7280' }}>{icon}</div>}
      </div>
      <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827', lineHeight: 1 }}>
        {value}
      </div>
      {subtitle && <div style={{ fontSize: '12px', color: '#6B7280' }}>{subtitle}</div>}
    </div>
  );
}

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [sensorKeys, setSensorKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, histRes] = await Promise.all([
          axios.get(`${API_BASE}/api/stats`),
          axios.get(`${API_BASE}/api/measurements/history`),
        ]);
        setStats(statsRes.data);
        const data = histRes.data;
        setHistory(data);
        if (data.length > 0) {
          const keys = Object.keys(data[0]).filter((k) => k !== 'time');
          setSensorKeys(keys);
        }
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6B7280' }}>
        Loading dashboard data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '16px', color: '#DC2626' }}>
        Error loading data: {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page title */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>Overview</h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>System-wide noise monitoring summary</p>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
      }}>
        <KpiCard
          title="Active Sensors"
          value={stats?.active_sensors ?? '—'}
          subtitle="With GPS coordinates"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          }
        />
        <KpiCard
          title="Avg. Noise Level"
          value={stats?.avg_noise_db != null ? `${stats.avg_noise_db} dB` : '—'}
          subtitle="Current average across sensors"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          }
        />
        <KpiCard
          title="Active Alerts"
          value={stats?.active_alerts ?? '—'}
          subtitle="Sensors above 70 dB"
          borderHighlight={stats?.active_alerts > 0 ? '#F97316' : undefined}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stats?.active_alerts > 0 ? '#F97316' : 'currentColor'} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          }
        />
        <KpiCard
          title="Sensor Health"
          value={stats?.sensor_health_pct != null ? `${stats.sensor_health_pct}%` : '—'}
          subtitle="Active in last 2 hours"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          }
        />
      </div>

      {/* Line Chart */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #E5E7EB',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Noise Levels Overview</h2>
            <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>Last 1 hour — 1 minute averages</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '500',
              backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
            }}>Last 1h</button>
            <button style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '13px',
              backgroundColor: 'white', color: '#374151', border: '1px solid #E5E7EB',
            }}>Filters</button>
            <button style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '13px',
              backgroundColor: 'white', color: '#374151', border: '1px solid #E5E7EB',
            }}>Export</button>
          </div>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6B7280', padding: '60px 0', fontSize: '14px' }}>
            No historical data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6B7280' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} domain={['auto', 'auto']} unit=" dB" width={55} />
              <Tooltip
                contentStyle={{ fontSize: '12px', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                formatter={(v, name) => [`${v} dB`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="5 5" label={{ value: '70 dB', fill: '#EF4444', fontSize: 11 }} />
              {sensorKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={SENSOR_COLORS[i % SENSOR_COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
