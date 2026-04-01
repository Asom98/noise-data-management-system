import React from 'react';
import axios from 'axios';
import { API_BASE, downloadCSV } from '../utils/noise';

const SCHEDULED = [
  { name: 'Daily Noise Summary', freq: 'Every day at 08:00', status: 'Active', next: 'Tomorrow 08:00' },
  { name: 'Weekly Analysis Report', freq: 'Every Monday at 09:00', status: 'Active', next: 'Mon 09:00' },
  { name: 'Monthly Sensor Health', freq: 'First of each month', status: 'Active', next: '1st Apr 08:00' },
];

const RECENT = [
  { name: 'Daily Noise Summary', date: '31 Mar 2026', type: 'PDF', size: '1.2 MB' },
  { name: 'Weekly Analysis Report', date: '30 Mar 2026', type: 'PDF', size: '3.4 MB' },
  { name: 'Sensor Health Report', date: '28 Mar 2026', type: 'CSV', size: '0.8 MB' },
  { name: 'Daily Noise Summary', date: '28 Mar 2026', type: 'PDF', size: '1.1 MB' },
];

function ActionCard({ icon, iconBg, title, desc, buttonLabel, buttonColor, onButtonClick }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid #E5E7EB',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      alignItems: 'center',
      textAlign: 'center',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        backgroundColor: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>{title}</div>
        <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>{desc}</div>
      </div>
      <button onClick={onButtonClick} style={{
        padding: '8px 20px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '500',
        backgroundColor: buttonColor,
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        marginTop: '4px',
      }}>
        {buttonLabel}
      </button>
    </div>
  );
}

export default function Reports() {
  async function handleGenerateReport() {
    const res = await axios.get(`${API_BASE}/api/reports/data`);
    downloadCSV(`malmo-noise-report-${new Date().toISOString().slice(0, 10)}.csv`, res.data);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>Reports</h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Generate, schedule, and manage noise monitoring reports</p>
      </div>

      {/* Action cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <ActionCard
          iconBg="#EFF6FF"
          buttonColor="#2563EB"
          title="Generate Report"
          desc="Create a new report from current data"
          buttonLabel="Generate Now"
          onButtonClick={handleGenerateReport}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
          }
        />
        <ActionCard
          iconBg="#ECFDF5"
          buttonColor="#10B981"
          title="Schedule Report"
          desc="Set up automated recurring reports"
          buttonLabel="Set Schedule"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          }
        />
        <ActionCard
          iconBg="#F5F3FF"
          buttonColor="#8B5CF6"
          title="Email Report"
          desc="Send reports directly to recipients"
          buttonLabel="Configure Email"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          }
        />
      </div>

      {/* Scheduled reports */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Scheduled Reports</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              {['Report Name', 'Frequency', 'Status', 'Next Run', 'Actions'].map((col) => (
                <th key={col} style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '12px',
                  borderBottom: '1px solid #E5E7EB',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCHEDULED.map((r) => (
              <tr key={r.name} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '12px 16px', fontWeight: '500', color: '#111827' }}>{r.name}</td>
                <td style={{ padding: '12px 16px', color: '#6B7280' }}>{r.freq}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ backgroundColor: '#ECFDF5', color: '#10B981', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#374151' }}>{r.next}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    backgroundColor: 'white',
                    color: '#374151',
                    border: '1px solid #E5E7EB',
                    cursor: 'pointer',
                    marginRight: '4px',
                  }}>
                    Edit
                  </button>
                  <button style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    backgroundColor: 'white',
                    color: '#EF4444',
                    border: '1px solid #FECACA',
                    cursor: 'pointer',
                  }}>
                    Pause
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent reports */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Recent Reports</h2>
          <button style={{
            fontSize: '13px',
            color: '#2563EB',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '500',
          }}>
            View All
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              {['Report Name', 'Date', 'Format', 'Size', 'Actions'].map((col) => (
                <th key={col} style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '12px',
                  borderBottom: '1px solid #E5E7EB',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '12px 16px', color: '#111827', fontWeight: '500' }}>{r.name}</td>
                <td style={{ padding: '12px 16px', color: '#6B7280' }}>{r.date}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    backgroundColor: r.type === 'PDF' ? '#FEF2F2' : '#ECFDF5',
                    color: r.type === 'PDF' ? '#EF4444' : '#10B981',
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                  }}>
                    {r.type}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#6B7280' }}>{r.size}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={handleGenerateReport} style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                    backgroundColor: '#EFF6FF', color: '#2563EB',
                    border: '1px solid #BFDBFE', cursor: 'pointer',
                  }}>
                    Download Latest
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
