import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { API_BASE, SENSOR_COLORS, downloadCSV } from '../utils/noise';
import { useLanguage } from '../context/LanguageContext';

function getBandCounts(data, sensorKeys) {
  const bands = { '<60': 0, '60-70': 0, '70-80': 0, '80+': 0 };
  data.forEach((row) => {
    sensorKeys.forEach((key) => {
      const v = row[key];
      if (v == null) return;
      if (v < 60) bands['<60']++;
      else if (v < 70) bands['60-70']++;
      else if (v < 80) bands['70-80']++;
      else bands['80+']++;
    });
  });
  return [
    { band: '< 60 dB', count: bands['<60'],   fill: '#10B981' },
    { band: '60-70 dB', count: bands['60-70'], fill: '#F59E0B' },
    { band: '70-80 dB', count: bands['70-80'], fill: '#F97316' },
    { band: '80+ dB',   count: bands['80+'],   fill: '#EF4444' },
  ];
}

export default function DataAnalysis() {
  const { t } = useLanguage();
  const [history, setHistory]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [activeTemplate, setActiveTemplate] = useState('timeseries');
  const [hours, setHours]                   = useState(1);
  const [viewMode, setViewMode]             = useState('avg');

  const TEMPLATES = [
    { id: 'timeseries', label: t.dataAnalysis.templateTimeseries, type: t.dataAnalysis.typeLineChart },
    { id: 'peak',       label: t.dataAnalysis.templatePeak,       type: t.dataAnalysis.typeBarChart },
    { id: 'comparison', label: t.dataAnalysis.templateComparison, type: t.dataAnalysis.typeLineChart },
    { id: 'weekly',     label: t.dataAnalysis.templateWeekly,     type: t.dataAnalysis.typeAreaChart },
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/api/measurements/history?hours=${hours}`);
        setHistory(res.data);
      } catch (e) {
        console.error('Data analysis fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [hours]);

  const displayKeys = history.length > 0
    ? Object.keys(history[0]).filter((k) => k.startsWith(viewMode === 'avg' ? 'avg__' : 'max__'))
    : [];

  const bandData = getBandCounts(history, displayKeys);

  function renderChart() {
    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#6B7280', fontSize: '14px' }}>{t.dataAnalysis.loading}</div>;
    if (history.length === 0) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#6B7280', fontSize: '14px' }}>{t.dataAnalysis.noData}</div>;

    const commonProps = { data: history, margin: { top: 5, right: 20, left: 0, bottom: 5 } };

    if (activeTemplate === 'weekly') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6B7280' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} unit=" dB" width={55} />
            <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} formatter={(v, n) => [`${v} dB`, n.replace(/^avg__|^max__/, '')]} />
            <Legend wrapperStyle={{ fontSize: '12px' }} formatter={(v) => v.replace(/^avg__|^max__/, '')} />
            {displayKeys.map((key, i) => (
              <Area key={key} type="monotone" dataKey={key} name={key.replace(/^avg__|^max__/, '')} stroke={SENSOR_COLORS[i % SENSOR_COLORS.length]} fill={SENSOR_COLORS[i % SENSOR_COLORS.length] + '22'} dot={false} strokeWidth={2} connectNulls />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (activeTemplate === 'peak') {
      const avgData = history.map((row) => {
        const vals = displayKeys.map((k) => row[k]).filter((v) => v != null);
        const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        return { time: row.time, avg: avg != null ? parseFloat(avg.toFixed(1)) : null };
      });
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={avgData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6B7280' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} unit=" dB" width={55} />
            <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} formatter={(v) => [`${v} dB`, viewMode === 'avg' ? t.dataAnalysis.modeAvg : t.dataAnalysis.modePeak]} />
            <Bar dataKey="avg" fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6B7280' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} unit=" dB" width={55} />
          <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} formatter={(v, n) => [`${v} dB`, n.replace(/^avg__|^max__/, '')]} />
          <Legend wrapperStyle={{ fontSize: '12px' }} formatter={(v) => v.replace(/^avg__|^max__/, '')} />
          {displayKeys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key} name={key.replace(/^avg__|^max__/, '')} stroke={SENSOR_COLORS[i % SENSOR_COLORS.length]} dot={false} strokeWidth={2} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>{t.dataAnalysis.title}</h1>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>{t.dataAnalysis.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', backgroundColor: '#2563EB', color: 'white', border: 'none', cursor: 'pointer' }}>{t.dataAnalysis.newAnalysis}</button>
          <button style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', backgroundColor: 'white', color: '#374151', border: '1px solid #E5E7EB', cursor: 'pointer' }}>{t.dataAnalysis.filters}</button>
          <button onClick={() => downloadCSV('dataanalys.csv', history)} style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', backgroundColor: 'white', color: '#374151', border: '1px solid #E5E7EB', cursor: 'pointer' }}>{t.dataAnalysis.exportAll}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ width: '240px', flexShrink: 0, backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 12px 0' }}>{t.dataAnalysis.templatesTitle}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {TEMPLATES.map((tmpl) => (
              <button key={tmpl.id} onClick={() => setActiveTemplate(tmpl.id)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: activeTemplate === tmpl.id ? '#EFF6FF' : 'transparent' }}>
                <div style={{ fontSize: '13px', fontWeight: activeTemplate === tmpl.id ? '600' : '400', color: activeTemplate === tmpl.id ? '#2563EB' : '#374151' }}>{tmpl.label}</div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{tmpl.type}</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: '20px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>{t.dataAnalysis.timeRange}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[{ label: t.dataAnalysis.last1h, value: 1 }, { label: t.dataAnalysis.last6h, value: 6 }, { label: t.dataAnalysis.last24h, value: 24 }].map((opt) => (
                <button key={opt.value} onClick={() => setHours(opt.value)} style={{ width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', backgroundColor: hours === opt.value ? '#F3F4F6' : 'transparent', color: hours === opt.value ? '#111827' : '#6B7280', fontWeight: hours === opt.value ? '600' : '400' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
                {TEMPLATES.find((tmpl) => tmpl.id === activeTemplate)?.label || t.dataAnalysis.defaultChartTitle}
              </h2>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[{ label: t.dataAnalysis.modeAvg, mode: 'avg' }, { label: t.dataAnalysis.modePeak, mode: 'peak' }].map((btn) => (
                  <button key={btn.mode} onClick={() => setViewMode(btn.mode)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: viewMode === btn.mode ? '600' : '400', backgroundColor: viewMode === btn.mode ? '#EFF6FF' : 'white', color: viewMode === btn.mode ? '#2563EB' : '#6B7280', border: '1px solid #E5E7EB', cursor: 'pointer' }}>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
            {renderChart()}
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>{t.dataAnalysis.distributionTitle}</h2>
            {loading ? (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '14px' }}>{t.dataAnalysis.loadingDist}</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bandData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="band" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} formatter={(v) => [v, t.dataAnalysis.tooltipReadings]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {bandData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
