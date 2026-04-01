import React, { useState } from 'react';
import { loadSettings, saveSettings } from '../utils/noise';

const SUB_NAV = [
  { id: 'notifications', label: 'Notifications' },
  { id: 'thresholds', label: 'Thresholds' },
  { id: 'users', label: 'Users & Access' },
  { id: 'security', label: 'Security' },
];

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: '40px',
        height: '22px',
        borderRadius: '11px',
        backgroundColor: checked ? '#2563EB' : '#E5E7EB',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: 'white',
        position: 'absolute',
        top: '3px',
        left: checked ? '21px' : '3px',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState('notifications');
  const [settings, setSettings] = useState(() => loadSettings());
  const [saved, setSaved] = useState(false);

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Configure notifications, thresholds, and system preferences</p>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Left sub-nav */}
        <div style={{
          width: '200px',
          flexShrink: 0,
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          padding: '8px',
          alignSelf: 'flex-start',
        }}>
          {SUB_NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeSection === item.id ? '600' : '400',
                backgroundColor: activeSection === item.id ? '#EFF6FF' : 'transparent',
                color: activeSection === item.id ? '#2563EB' : '#374151',
                display: 'block',
                marginBottom: '2px',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeSection === 'notifications' && (
            <>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Notification Preferences</h2>
                  <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Choose which notifications you receive</p>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {[
                    { label: 'Critical Alerts', desc: 'Immediate notification when sensors exceed critical threshold', key: 'criticalAlerts' },
                    { label: 'Daily Summary', desc: 'Daily digest of noise levels and sensor status', key: 'dailySummary' },
                    { label: 'Weekly Report', desc: 'Weekly analysis report with trends and insights', key: 'weeklyReport' },
                    { label: 'Maintenance Reminders', desc: 'Alerts when sensors are due for maintenance checks', key: 'maintenanceReminders' },
                  ].map((pref, idx, arr) => (
                    <div key={pref.label} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px 0',
                      borderBottom: idx < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{pref.label}</div>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{pref.desc}</div>
                      </div>
                      <Toggle checked={settings[pref.key]} onChange={(v) => setSettings((s) => ({ ...s, [pref.key]: v }))} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeSection === 'thresholds' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Alert Thresholds</h2>
                <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Set the dB levels that trigger alerts</p>
              </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { label: 'High Noise Level', desc: 'Triggers a warning alert', key: 'highThreshold', color: '#F97316' },
                  { label: 'Critical Noise Level', desc: 'Triggers a critical alert', key: 'criticalThreshold', color: '#EF4444' },
                ].map((t) => (
                  <div key={t.label}>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#111827', display: 'block', marginBottom: '6px' }}>
                      {t.label}
                    </label>
                    <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>{t.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="number"
                        value={settings[t.key]}
                        onChange={(e) => setSettings((s) => ({ ...s, [t.key]: Number(e.target.value) }))}
                        min={40}
                        max={120}
                        style={{
                          width: '100px',
                          padding: '8px 12px',
                          border: `2px solid ${t.color}`,
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: t.color,
                          outline: 'none',
                          textAlign: 'center',
                        }}
                      />
                      <span style={{ fontSize: '14px', color: '#6B7280' }}>dB</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeSection === 'users' || activeSection === 'security') && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              padding: '40px',
              textAlign: 'center',
              color: '#6B7280',
              fontSize: '14px',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <p style={{ margin: 0 }}>
                {activeSection === 'users' ? 'User & access management' : 'Security settings'} coming soon
              </p>
            </div>
          )}

          {/* Save button */}
          {(activeSection === 'notifications' || activeSection === 'thresholds') && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button style={{
                padding: '8px 20px', borderRadius: '8px', fontSize: '13px',
                fontWeight: '500', backgroundColor: 'white', color: '#374151',
                border: '1px solid #E5E7EB', cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: '8px 20px', borderRadius: '8px', fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: saved ? '#10B981' : '#2563EB',
                  color: 'white', border: 'none', cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
