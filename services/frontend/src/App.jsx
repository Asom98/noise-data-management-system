import React from 'react';
import SensorMap from './components/SensorMap';
import CurrentNoiseChart from './components/CurrentNoiseChart';
import HistoricalTrendChart from './components/HistoricalTrendChart'; // <-- Add this import

function App() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#111827' }}>Malmö Noise Monitoring Dashboard</h1>
        <p style={{ margin: 0, color: '#4b5563' }}>System Overview: Spatial and Quantitative Acoustic Analysis</p>
      </header>
      
      <main>
        <SensorMap />
        <CurrentNoiseChart />
        <HistoricalTrendChart /> {/* <-- Add the component here */}
      </main>
    </div>
  );
}

export default App;