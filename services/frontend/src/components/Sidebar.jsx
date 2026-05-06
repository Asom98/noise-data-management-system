import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { t } = useLanguage();
  const theme = useTheme();
  const { user, logout } = useAuth();

  const NAV_ITEMS = [
    { to: '/', label: t.sidebar.overview, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { to: '/sensor-map', label: t.sidebar.sensorMap, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg> },
    { to: '/live-readings', label: t.sidebar.liveReadings, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { to: '/alerts', label: t.sidebar.alerts, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
    { to: '/sensor-health', label: t.sidebar.sensorHealth, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
    { to: '/database', label: 'Database Explorer', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
    { to: '/reports', label: t.sidebar.reports, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
    { to: '/settings', label: t.sidebar.settings, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }] : []),
  ];

  const BOTTOM_ITEMS = [
    { to: '/notifications', label: t.sidebar.notifications, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> },
    { to: '/system', label: t.sidebar.system, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
  ];

  const navItemStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
    fontWeight: isActive ? '600' : '400',
    color: isActive ? theme.navActiveColor : theme.navColor,
    backgroundColor: isActive ? theme.navActiveBg : 'transparent',
    transition: 'background 0.15s, color 0.15s',
    textDecoration: 'none',
  });

  return (
    <aside style={{
      width: '260px', minWidth: '260px', height: '100vh',
      position: 'sticky', top: 0,
      backgroundColor: theme.sidebarBg,
      borderRight: `1px solid ${theme.border}`,
      display: 'flex', flexDirection: 'column',
      padding: '20px 12px', overflowY: 'auto',
      transition: 'background 0.2s, border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 12px 20px 12px' }}>
        <div style={{ width: '36px', height: '36px', backgroundColor: theme.accent, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '15px', color: theme.textPrimary, lineHeight: '1.2' }}>{t.sidebar.logo}</div>
          <div style={{ fontSize: '12px', color: theme.textSecondary, lineHeight: '1.2' }}>{t.sidebar.logoSub}</div>
        </div>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} style={({ isActive }) => navItemStyle(isActive)}>
            {item.icon}{item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ borderTop: `1px solid ${theme.border}`, margin: '12px 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {BOTTOM_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} style={({ isActive }) => navItemStyle(isActive)}>
            {item.icon}{item.label}
          </NavLink>
        ))}
      </div>

      <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: `1px solid ${theme.border}` }}>
        <div style={{ padding: '4px 12px 8px', fontSize: '11px', color: theme.textSecondary }}>
          Signed in as <b style={{ color: theme.textPrimary }}>{user?.username}</b>
        </div>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: '400', color: '#DC2626', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
