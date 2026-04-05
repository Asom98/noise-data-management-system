import React, { useState } from 'react';
import { loadSettings, saveSettings } from '../utils/noise';
import { useLanguage } from '../context/LanguageContext';

function Toggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ width: '40px', height: '22px', borderRadius: '11px', backgroundColor: checked ? '#2563EB' : '#E5E7EB', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '3px', left: checked ? '21px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
    </div>
  );
}

export default function Settings() {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState('notifications');
  const [settings, setSettings] = useState(() => loadSettings());
  const [saved, setSaved] = useState(false);

  const SUB_NAV = [
    { id: 'notifications', label: t.settings.navNotifications },
    { id: 'thresholds',    label: t.settings.navThresholds },
    { id: 'users',         label: t.settings.navUsers },
    { id: 'security',      label: t.settings.navSecurity },
  ];

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>{t.settings.title}</h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>{t.settings.subtitle}</p>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ width: '200px', flexShrink: 0, backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '8px', alignSelf: 'flex-start' }}>
          {SUB_NAV.map((item) => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: activeSection === item.id ? '600' : '400', backgroundColor: activeSection === item.id ? '#EFF6FF' : 'transparent', color: activeSection === item.id ? '#2563EB' : '#374151', display: 'block', marginBottom: '2px' }}>
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeSection === 'notifications' && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>{t.settings.notifTitle}</h2>
                <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>{t.settings.notifSubtitle}</p>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  { label: t.settings.prefCriticalLabel,    desc: t.settings.prefCriticalDesc,    key: 'criticalAlerts' },
                  { label: t.settings.prefDailyLabel,       desc: t.settings.prefDailyDesc,       key: 'dailySummary' },
                  { label: t.settings.prefWeeklyLabel,      desc: t.settings.prefWeeklyDesc,      key: 'weeklyReport' },
                  { label: t.settings.prefMaintenanceLabel, desc: t.settings.prefMaintenanceDesc, key: 'maintenanceReminders' },
                ].map((pref, idx, arr) => (
                  <div key={pref.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: idx < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{pref.label}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{pref.desc}</div>
                    </div>
                    <Toggle checked={settings[pref.key]} onChange={(v) => setSettings((s) => ({ ...s, [pref.key]: v }))} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'thresholds' && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>{t.settings.thresholdsTitle}</h2>
                <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>{t.settings.thresholdsSubtitle}</p>
              </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { label: t.settings.thresholdHighLabel,     desc: t.settings.thresholdHighDesc,     key: 'highThreshold',     color: '#F97316' },
                  { label: t.settings.thresholdCriticalLabel, desc: t.settings.thresholdCriticalDesc, key: 'criticalThreshold', color: '#EF4444' },
                ].map((thresh) => (
                  <div key={thresh.key}>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#111827', display: 'block', marginBottom: '6px' }}>{thresh.label}</label>
                    <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>{thresh.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="number" value={settings[thresh.key]} onChange={(e) => setSettings((s) => ({ ...s, [thresh.key]: Number(e.target.value) }))} min={40} max={120}
                        style={{ width: '100px', padding: '8px 12px', border: `2px solid ${thresh.color}`, borderRadius: '8px', fontSize: '16px', fontWeight: '600', color: thresh.color, outline: 'none', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: '14px', color: '#6B7280' }}>dB</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeSection === 'users' || activeSection === 'security') && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '40px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <p style={{ margin: 0 }}>
                {activeSection === 'users' ? t.settings.usersComingSoon : t.settings.securityComingSoon}
              </p>
            </div>
          )}

          {(activeSection === 'notifications' || activeSection === 'thresholds') && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', backgroundColor: 'white', color: '#374151', border: '1px solid #E5E7EB', cursor: 'pointer' }}>{t.settings.cancel}</button>
              <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', backgroundColor: saved ? '#10B981' : '#2563EB', color: 'white', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
                {saved ? t.settings.saved : t.settings.saveChanges}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
