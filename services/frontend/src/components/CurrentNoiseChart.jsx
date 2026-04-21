import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const CurrentNoiseChart = () => {
  const [data, setData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = () => {
    axios.get('http://localhost:8000/api/measurements/latest')
      .then(response => {
        const formattedData = response.data.map(item => ({
          ...item,
          shortName: item.sensor_id.replace('DN000', '').replace('-Buller ', '').substring(0, 15) + '...',
          value_db: parseFloat(item.value_db).toFixed(1)
        }));
        
        formattedData.sort((a, b) => b.value_db - a.value_db);
        setData(formattedData);
        setLastUpdated(new Date()); // Record the exact time we pulled new data
      })
      .catch(error => console.error("❌ Error fetching measurements:", error));
  };

  useEffect(() => {
    // 1. Fetch data immediately when the component loads
    fetchData();

    // 2. Set up the polling interval (10000 ms = 10 seconds for testing)
    // In production, you will change this to 60000 (60 seconds)
    const intervalId = setInterval(() => {
      fetchData();
    }, 10000);

    // 3. Cleanup function to prevent memory leaks if the user leaves the page
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div style={{ height: '420px', width: '100%', marginTop: '24px', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#333' }}>Current Noise Levels (dB)</h3>
        {/* Visual indicator showing stakeholders exactly when the data last refreshed */}
        <span style={{ fontSize: '12px', color: '#10b981', backgroundColor: '#ecfdf5', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
          Live • Last updated: {lastUpdated.toLocaleTimeString('sv-SE')}
        </span>
      </div>
      
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
          <XAxis dataKey="shortName" tick={{ fontSize: 12, fill: '#666' }} angle={-45} textAnchor="end" />
          <YAxis label={{ value: 'Decibels (dB)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#666' } }} />
          <Tooltip cursor={{ fill: '#f5f5f5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
          
          {/* We added an animation duration so the bars slide up and down smoothly when data changes! */}
          <Bar dataKey="value_db" name="Latest Noise Level" fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={1500} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CurrentNoiseChart;