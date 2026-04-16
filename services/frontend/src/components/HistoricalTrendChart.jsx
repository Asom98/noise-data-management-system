import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import axios from 'axios';

const HistoricalTrendChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/api/measurements/history')
      .then(response => {
        setData(response.data);
      })
      .catch(error => console.error("❌ Error fetching history:", error));
  }, []);

  // Professional color palette matching your Figma design
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ef4444'];
  const WHO_LIMIT = 70; // Set the threshold from your design

  return (
    <div style={{ marginTop: '24px', padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '4px', color: '#111827', fontSize: '18px' }}>Noise Levels Overview</h3>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Average decibel readings by sensor (24h)</p>
      </div>
      
      <div style={{ height: '400px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f3f4f6" />
            
            <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
            
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
            
            {/* The Critical WHO Threshold Line from your Figma */}
            <ReferenceLine y={WHO_LIMIT} stroke="#ef4444" strokeDasharray="4 4" label={{ position: 'insideTopLeft', value: 'WHO Limit (70dB)', fill: '#ef4444', fontSize: 12 }} />
            
            {data.length > 0 && Object.keys(data[0])
              .filter(key => key !== 'time')
              .map((sensorName, index) => (
                <Line
                  key={sensorName}
                  type="linear"
                  dataKey={sensorName} 
                  stroke={colors[index % colors.length]} 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6 }}
                  connectNulls={true}
                />
              ))
            }
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* The Warning Alert Box from your Figma Design */}
      <div style={{ marginTop: '20px', padding: '12px 16px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#d97706', fontWeight: 'bold' }}>⚠️ Alert:</span>
        <span style={{ color: '#92400e', fontSize: '14px' }}>
          Historical data indicates one or more sensors approached or exceeded the WHO recommended limit ({WHO_LIMIT}dB).
        </span>
      </div>

    </div>
  );
};

export default HistoricalTrendChart;