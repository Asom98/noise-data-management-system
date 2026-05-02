import React, { useState } from 'react';
import { useSettings, useTheme } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';

function Toggle({ checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ width: '40px', height: '22px', borderRadius: '11px', backgroundColor: checked ? '#2563EB' : '#E5E7EB', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '3px', left: checked ? '21px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  const theme = useTheme();
  return (
    <div style={{ backgroundColor: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: theme.textPrimary, margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: '13px', color: theme.textSecondary, marginTop: '4px', marginBottom: 0 }}>{subtitle}</p>}
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  );
}

function RowItem({ label, desc, children, last }) {
  const theme = useTheme();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '14px 0', borderBottom: last ? 'none' : `1px solid ${theme.borderLight}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: '500', color: theme.textPrimary }}>{label}</div>
        <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '2px' }}>{desc}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function ChipGroup({ options, value, onChange }) {
  const theme = useTheme();
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer',
            backgroundColor: value === opt.value ? theme.accentBg : theme.inputBg,
            color: value === opt.value ? theme.accent : theme.textSecondary,
            border: value === opt.value ? `1px solid ${theme.accentBorder}` : `1px solid ${theme.border}`,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function NumberInput({ value, onChange, min, max, unit, color }) {
  const theme = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
        min={min} max={max}
        style={{ width: '90px', padding: '7px 10px', border: `2px solid ${color ?? theme.border}`, borderRadius: '8px', fontSize: '15px', fontWeight: '600', color: color ?? theme.textSecondary, backgroundColor: theme.inputBg, outline: 'none', textAlign: 'center' }}
      />
      {unit && <span style={{ fontSize: '13px', color: theme.textSecondary }}>{unit}</span>}
    </div>
  );
}

export default function Settings() {
  const { t } = useLanguage();
  const { settings, updateSettings } = useSettings();
  const theme = useTheme();
  const [draft, setDraft] = useState(settings);
  const [activeSection, setActiveSection] = useState('notifications');
  const [saved, setSaved] = useState(false);

  const SUB_NAV = [
    { id: 'notifications', label: t.settings.navNotifications },
    { id: 'thresholds',    label: t.settings.navThresholds },
    { id: 'dashboard',     label: t.settings.navDashboard },
    { id: 'users',         label: t.settings.navUsers },
    { id: 'security',      label: t.settings.navSecurity },
  ];

  function set(key, value) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  function handleSave() {
    updateSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleCancel() {
    setDraft(settings);
  }

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(settings);
  const showFooter = ['notifications', 'thresholds', 'dashboard'].includes(activeSection);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: theme.textPrimary, margin: 0 }}>{t.settings.title}</h1>
        <p style={{ fontSize: '14px', color: theme.textSecondary, marginTop: '4px' }}>{t.settings.subtitle}</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Sidebar nav */}
        <div style={{ width: '200px', flexShrink: 0, backgroundColor: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '8px', alignSelf: 'flex-start' }}>
          {SUB_NAV.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} style={{
              width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: activeSection === item.id ? '600' : '400',
              backgroundColor: activeSection === item.id ? theme.accentBg : 'transparent',
              color: activeSection === item.id ? theme.accent : theme.textSecondary,
              display: 'block', marginBottom: '2px',
            }}>
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ── Notifications ─────────────────────────────── */}
          {activeSection === 'notifications' && (
            <SectionCard title={t.settings.notifTitle} subtitle={t.settings.notifSubtitle}>
              {[
                { label: t.settings.prefCriticalLabel,    desc: t.settings.prefCriticalDesc,    key: 'criticalAlerts' },
                { label: t.settings.prefDailyLabel,       desc: t.settings.prefDailyDesc,       key: 'dailySummary' },
                { label: t.settings.prefWeeklyLabel,      desc: t.settings.prefWeeklyDesc,      key: 'weeklyReport' },
                { label: t.settings.prefMaintenanceLabel, desc: t.settings.prefMaintenanceDesc, key: 'maintenanceReminders' },
              ].map((pref, idx, arr) => (
                <RowItem key={pref.key} label={pref.label} desc={pref.desc} last={idx === arr.length - 1}>
                  <Toggle checked={draft[pref.key]} onChange={v => set(pref.key, v)} />
                </RowItem>
              ))}
              {draft.criticalAlerts && (
                <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: theme.accentBg, borderRadius: '8px', fontSize: '12px', color: theme.accentText, lineHeight: 1.5 }}>
                  In-app toast notifications will appear when a sensor exceeds the critical threshold ({draft.criticalThreshold} dB).
                </div>
              )}
            </SectionCard>
          )}

          {/* ── Alert Thresholds ──────────────────────────── */}
          {activeSection === 'thresholds' && (
            <SectionCard title={t.settings.thresholdsTitle} subtitle={t.settings.thresholdsSubtitle}>
              {[
                { label: t.settings.thresholdHighLabel,     desc: t.settings.thresholdHighDesc,     key: 'highThreshold',     color: '#F97316' },
                { label: t.settings.thresholdCriticalLabel, desc: t.settings.thresholdCriticalDesc, key: 'criticalThreshold', color: '#EF4444' },
              ].map((thresh, idx, arr) => (
                <RowItem key={thresh.key} label={thresh.label} desc={thresh.desc} last={idx === arr.length - 1}>
                  <NumberInput value={draft[thresh.key]} onChange={v => set(thresh.key, v)} min={40} max={120} unit="dB" color={thresh.color} />
                </RowItem>
              ))}
            </SectionCard>
          )}

          {/* ── Dashboard prefs ───────────────────────────── */}
          {activeSection === 'dashboard' && (
            <>
              <SectionCard title={t.settings.dashboardTitle} subtitle={t.settings.dashboardSubtitle}>
                <RowItem label={t.settings.liveRefreshLabel} desc={t.settings.liveRefreshDesc}>
                  <ChipGroup
                    value={draft.liveRefreshInterval}
                    onChange={v => set('liveRefreshInterval', v)}
                    options={[
                      { label: `5 ${t.settings.seconds}`,  value: 5 },
                      { label: `10 ${t.settings.seconds}`, value: 10 },
                      { label: `30 ${t.settings.seconds}`, value: 30 },
                      { label: `60 ${t.settings.seconds}`, value: 60 },
                    ]}
                  />
                </RowItem>
                <RowItem label={t.settings.overviewRangeLabel} desc={t.settings.overviewRangeDesc} last>
                  <ChipGroup
                    value={draft.overviewDefaultRange}
                    onChange={v => set('overviewDefaultRange', v)}
                    options={[
                      { label: `1 ${t.settings.hours}`,  value: 1 },
                      { label: `6 ${t.settings.hours}`,  value: 6 },
                      { label: `24 ${t.settings.hours}`, value: 24 },
                    ]}
                  />
                </RowItem>
              </SectionCard>

              <SectionCard title={t.settings.darTitle} subtitle={t.settings.darSubtitle}>
                <RowItem label={t.settings.darOperationalLabel} desc={t.settings.darOperationalDesc}>
                  <NumberInput value={draft.darOperationalMin} onChange={v => set('darOperationalMin', v)} min={1} max={100} unit="%" color="#10B981" />
                </RowItem>
                <RowItem label={t.settings.darWarningLabel} desc={t.settings.darWarningDesc} last>
                  <NumberInput value={draft.darWarningMin} onChange={v => set('darWarningMin', v)} min={1} max={100} unit="%" color="#F97316" />
                </RowItem>
              </SectionCard>
            </>
          )}

          {/* ── Coming soon ───────────────────────────────── */}
          {(activeSection === 'users' || activeSection === 'security') && (
            <div style={{ backgroundColor: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '48px', textAlign: 'center', color: theme.textSecondary, fontSize: '14px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={theme.border} strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <p style={{ margin: 0 }}>
                {activeSection === 'users' ? t.settings.usersComingSoon : t.settings.securityComingSoon}
              </p>
            </div>
          )}

          {/* ── Save / Cancel footer ──────────────────────── */}
          {showFooter && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={handleCancel} disabled={!hasChanges} style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', backgroundColor: theme.inputBg, color: theme.textSecondary, border: `1px solid ${theme.border}`, cursor: hasChanges ? 'pointer' : 'default', opacity: hasChanges ? 1 : 0.5 }}>
                {t.settings.cancel}
              </button>
              <button onClick={handleSave} disabled={!hasChanges} style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', backgroundColor: saved ? '#10B981' : hasChanges ? theme.accent : theme.accentBorder, color: 'white', border: 'none', cursor: hasChanges ? 'pointer' : 'default', transition: 'background 0.2s' }}>
                {saved ? t.settings.saved : t.settings.saveChanges}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
