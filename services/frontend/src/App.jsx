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
        <Route path="*" element={<Layout><Overview /></Layout>} />
      </Routes>
    </HashRouter>
  );
}
