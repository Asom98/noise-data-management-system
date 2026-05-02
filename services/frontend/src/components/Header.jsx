import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSettings, useTheme } from '../context/SettingsContext';

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

export default function Header() {
  const { t, lang, toggleLanguage } = useLanguage();
  const { settings, updateSettings } = useSettings();
  const theme = useTheme();
  const [query, setQuery] = useState('');

  function toggleDark() {
    updateSettings({ ...settings, darkMode: !settings.darkMode });
  }

  return (
    <header style={{
      height: '64px',
      backgroundColor: theme.headerBg,
      borderBottom: `1px solid ${theme.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      transition: 'background 0.2s, border-color 0.2s',
    }}>
      {/* Left spacer */}
      <div style={{ width: '120px' }} />

      {/* Center: AI Search */}
      <div style={{
        flex: 1, maxWidth: '560px', display: 'flex', alignItems: 'center',
        border: `2px solid ${theme.accent}`, borderRadius: '10px',
        overflow: 'hidden', backgroundColor: theme.inputBg,
      }}>
        <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', color: theme.accent, fontSize: '16px', flexShrink: 0 }}>
          ✨
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t.header.searchPlaceholder}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: '13px', color: theme.textPrimary, padding: '10px 4px', backgroundColor: 'transparent' }}
        />
        <button onClick={() => {}} style={{ backgroundColor: theme.accent, color: 'white', border: 'none', padding: '10px 16px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', flexShrink: 0 }}>
          {t.header.ask}
        </button>
      </div>

      {/* Right controls */}
      <div style={{ width: '220px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          title={settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${theme.border}`,
            backgroundColor: theme.cardBg, color: theme.textSecondary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'background 0.15s',
          }}
        >
          {settings.darkMode ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Language toggle */}
        <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden', fontSize: '12px', fontWeight: '600' }}>
          {['sv', 'en'].map(l => (
            <button
              key={l}
              onClick={() => lang !== l && toggleLanguage()}
              style={{
                padding: '5px 10px', border: 'none', cursor: 'pointer',
                backgroundColor: lang === l ? theme.accent : theme.cardBg,
                color: lang === l ? 'white' : theme.textSecondary,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Bell */}
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: '#EF4444', borderRadius: '50%', border: `1.5px solid ${theme.headerBg}` }} />
        </div>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: theme.textPrimary, lineHeight: '1.2' }}>John Doe</div>
            <div style={{ fontSize: '11px', color: theme.textSecondary, lineHeight: '1.2' }}>{t.header.admin}</div>
          </div>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: theme.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}
