import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './pages/Overview';
import SensorMapPage from './pages/SensorMapPage';
import LiveReadings from './pages/LiveReadings';
import AlertsOutliers from './pages/AlertsOutliers';
import SensorHealth from './pages/SensorHealth';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import DatabaseExplorer from './pages/DatabaseExplorer';
import Admin from './pages/Admin';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { canAccess } from './utils/roles';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { SettingsProvider, useSettings, useTheme } from './context/SettingsContext';

// ─── Toast container (renders toasts from SettingsContext) ────────────────────

const TOAST_COLORS = {
  critical: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', icon: '#EF4444' },
  warning:  { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', icon: '#F59E0B' },
  info:     { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', icon: '#2563EB' },
};

function ToastContainer() {
  const { toasts, dismissToast } = useSettings();
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      zIndex: 9999, maxWidth: '360px',
    }}>
      {toasts.map(toast => {
        const c = TOAST_COLORS[toast.type] ?? TOAST_COLORS.info;
        return (
          <div key={toast.id} style={{
            backgroundColor: c.bg, border: `1px solid ${c.border}`,
            borderRadius: '10px', padding: '12px 16px',
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            animation: 'slideIn 0.2s ease',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span style={{ fontSize: '13px', color: c.text, flex: 1, lineHeight: 1.5 }}>{toast.message}</span>
            <button onClick={() => dismissToast(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: '0', lineHeight: 1, fontSize: '16px', opacity: 0.6 }}>✕</button>
          </div>
        );
      })}
      <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}

// ─── Placeholder pages ────────────────────────────────────────────────────────

function PlaceholderPage({ titleKey, descKey }) {
  const { t } = useLanguage();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>{t.sidebar[titleKey]}</h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>{t.placeholder[descKey]}</p>
      </div>
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', padding: '48px 24px',
        border: '1px solid #E5E7EB', textAlign: 'center', color: '#6B7280',
      }}>
        <p style={{ fontSize: '15px', margin: 0 }}>{t.placeholder.notImplemented}</p>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function Layout({ children }) {
  const theme = useTheme();
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: theme.pageBg, transition: 'background 0.2s' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header />
        <main style={{ flex: 1, backgroundColor: theme.pageBg, padding: '24px', overflowY: 'auto', transition: 'background 0.2s' }}>
          {children}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

// ─── AppRoutes (auth-aware) ───────────────────────────────────────────────────

function AppRoutes() {
  const { user, loading, showLanding, setShowLanding } = useAuth();
  const [expectedRole, setExpectedRole] = React.useState(null);

  if (loading) return <div style={{ minHeight: '100vh', backgroundColor: '#F3F4F6' }} />;

  // Step 1: show landing — user hasn't chosen a role yet (or just logged out)
  if (showLanding) return (
    <LandingPage onNeedsLogin={role => { setExpectedRole(role); setShowLanding(false); }} />
  );

  // Step 2: user picked a role that requires login but isn't authenticated yet
  if (!user) return <Login expectedRole={expectedRole} onLogin={() => {}} />;

  const can = (route) => canAccess(user.role, route);

  return (
    <HashRouter>
      <Routes>
        <Route path="/"              element={<Layout><Overview /></Layout>} />
        {can('/sensor-map')    && <Route path="/sensor-map"    element={<Layout><SensorMapPage /></Layout>} />}
        {can('/live-readings') && <Route path="/live-readings" element={<Layout><LiveReadings /></Layout>} />}
        {can('/alerts')        && <Route path="/alerts"        element={<Layout><AlertsOutliers /></Layout>} />}
        {can('/sensor-health') && <Route path="/sensor-health" element={<Layout><SensorHealth /></Layout>} />}
        {can('/reports')       && <Route path="/reports"       element={<Layout><Reports /></Layout>} />}
        {can('/settings')      && <Route path="/settings"      element={<Layout><Settings /></Layout>} />}
        {can('/database')      && <Route path="/database"      element={<Layout><DatabaseExplorer /></Layout>} />}
        {can('/admin')         && <Route path="/admin"         element={<Layout><Admin /></Layout>} />}
        {can('/notifications') && <Route path="/notifications" element={<Layout><PlaceholderPage titleKey="notifications" descKey="notificationsDesc" /></Layout>} />}
        {can('/system')        && <Route path="/system"        element={<Layout><PlaceholderPage titleKey="system" descKey="systemDesc" /></Layout>} />}
        <Route path="*"              element={<Layout><Overview /></Layout>} />
      </Routes>
    </HashRouter>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <SettingsProvider>
          <AppRoutes />
        </SettingsProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
