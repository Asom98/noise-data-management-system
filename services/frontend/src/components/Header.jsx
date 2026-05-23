import React from 'react';
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
  const { lang, toggleLanguage } = useLanguage();
  const { settings, updateSettings } = useSettings();
  const theme = useTheme();
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
      justifyContent: 'flex-end',
      padding: '0 24px',
      gap: '12px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      transition: 'background 0.2s, border-color 0.2s',
    }}>
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
    </header>
  );
}
