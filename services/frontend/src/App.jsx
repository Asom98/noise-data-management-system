import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './pages/Overview';
import SensorMapPage from './pages/SensorMapPage';
import LiveReadings from './pages/LiveReadings';
import AlertsOutliers from './pages/AlertsOutliers';
import SensorHealth from './pages/SensorHealth';
import DataAnalysis from './pages/DataAnalysis';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import DatabaseExplorer from './pages/DatabaseExplorer';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

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

function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header />
        <main style={{
          flex: 1,
          backgroundColor: '#F3F4F6',
          padding: '24px',
          overflowY: 'auto',
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout><Overview /></Layout>} />
          <Route path="/sensor-map" element={<Layout><SensorMapPage /></Layout>} />
          <Route path="/live-readings" element={<Layout><LiveReadings /></Layout>} />
          <Route path="/alerts" element={<Layout><AlertsOutliers /></Layout>} />
          <Route path="/sensor-health" element={<Layout><SensorHealth /></Layout>} />
          <Route path="/data-analysis" element={<Layout><DataAnalysis /></Layout>} />
          <Route path="/reports" element={<Layout><Reports /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />
          <Route path="/database" element={<Layout><DatabaseExplorer /></Layout>} />
          <Route path="/notifications" element={<Layout><PlaceholderPage titleKey="notifications" descKey="notificationsDesc" /></Layout>} />
          <Route path="/system" element={<Layout><PlaceholderPage titleKey="system" descKey="systemDesc" /></Layout>} />
          <Route path="*" element={<Layout><Overview /></Layout>} />
        </Routes>
      </HashRouter>
    </LanguageProvider>
  );
}
