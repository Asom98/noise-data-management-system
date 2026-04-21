import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import { API_BASE, SENSOR_COLORS, downloadCSV } from '../utils/noise';
import { useLanguage } from '../context/LanguageContext';

function buildSeries(history, sensorKeys, colors, showPoints) {
  const labels = history.map(r => r.time);
  const series = sensorKeys.map((key, i) => ({
    name: key.replace('avg__', ''),
    type: 'line',
    data: history.map(r => r[key] ?? null),
    lineStyle: { color: colors[i % colors.length], width: 2 },
    itemStyle: { color: colors[i % colors.length] },
    symbol: showPoints ? 'circle' : 'none',
    symbolSize: 5,
    smooth: !showPoints,
  }));
  return { labels, series };
}

function ModeToggle({ showPoints, onChange }) {
  const btn = (active, label, onClick) => (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer',
      backgroundColor: active ? '#1D4ED8' : 'white',
      color: active ? 'white' : '#374151',
      border: active ? '1px solid #1D4ED8' : '1px solid #E5E7EB',
    }}>{label}</button>
  );
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {btn(!showPoints, 'Smooth', () => onChange(false))}
      {btn(showPoints, 'Data Points', () => onChange(true))}
    </div>
  );
}


function EChartsChartYPan({ history, sensorKeys, colors, showPoints }) {
  const chartRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    function onMouseDown(e) {
      if (e.button !== 0) return;
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    }

    function onMouseMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      const chart = chartRef.current?.getEchartsInstance();
      if (!chart) return;

      // Y pan
      if (dy !== 0) {
        const d0 = chart.convertFromPixel({ yAxisIndex: 0 }, 0);
        const d1 = chart.convertFromPixel({ yAxisIndex: 0 }, 1);
        const delta = dy * (d1 - d0);
        const [curMin, curMax] = chart.getModel().getComponent('yAxis', 0).axis.scale.getExtent();
        chart.setOption({ yAxis: { min: curMin + delta, max: curMax + delta } }, false);
      }

      // X pan via dataZoom percentages
      if (dx !== 0) {
        const opt = chart.getOption();
        const dz = opt.dataZoom[0];
        const start = dz.start ?? 0;
        const end = dz.end ?? 100;
        const span = end - start;
        const totalPoints = history.length;
        const visiblePoints = span / 100 * totalPoints;
        const gridWidth = chart.getWidth() - 80;
        const shiftPct = (-dx / gridWidth) * (visiblePoints / totalPoints) * 100;
        const newStart = Math.max(0, Math.min(start + shiftPct, 100 - span));
        chart.dispatchAction({ type: 'dataZoom', dataZoomIndex: 0, start: newStart, end: newStart + span });
      }
    }

    function onMouseUp() {
      isDragging = false;
    }

    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mousemove', onMouseMove, true);
    window.addEventListener('mouseup', onMouseUp, true);

    return () => {
      el.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('mousemove', onMouseMove, true);
      window.removeEventListener('mouseup', onMouseUp, true);
    };
  }, [history, sensorKeys]);

  if (!history.length || !sensorKeys.length) return null;
  const { labels, series } = buildSeries(history, sensorKeys, colors, showPoints);
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 10, right: 20, bottom: 60, left: 60 },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none', moveOnMouseMove: false },
      { type: 'slider', xAxisIndex: 0, bottom: 30, height: 20 },
    ],
    xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { formatter: v => `${Math.round(v)} dB`, fontSize: 11 } },
    series,
  };
  return (
    <div ref={containerRef} style={{ cursor: 'ns-resize' }}>
      <ReactECharts ref={chartRef} option={option} style={{ height: 320 }} notMerge />
    </div>
  );
}

function KpiCard({ title, value, subtitle, borderHighlight, icon }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      border: borderHighlight ? `2px solid ${borderHighlight}` : '1px solid #E5E7EB',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>{title}</span>
        {icon && <div style={{ color: '#6B7280' }}>{icon}</div>}
      </div>
      <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827', lineHeight: 1 }}>
        {value}
      </div>
      {subtitle && <div style={{ fontSize: '12px', color: '#6B7280' }}>{subtitle}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, hours, setHours, loading, history, onExport, showPoints, onTogglePoints, children }) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 2px' }}>{title}</h2>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <ModeToggle showPoints={showPoints} onChange={onTogglePoints} />
          <div style={{ width: '1px', height: '20px', backgroundColor: '#E5E7EB' }} />
          {[{ label: '1h', value: 1 }, { label: '6h', value: 6 }, { label: '24h', value: 24 }, { label: '3d', value: 72 }, { label: '7d', value: 168 }].map(opt => (
            <button key={opt.value} onClick={() => setHours(opt.value)} style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              backgroundColor: hours === opt.value ? '#EFF6FF' : 'white',
              color: hours === opt.value ? '#2563EB' : '#374151',
              border: hours === opt.value ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
            }}>{opt.label}</button>
          ))}
          <button onClick={onExport} style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', backgroundColor: 'white', color: '#374151', border: '1px solid #E5E7EB', cursor: 'pointer' }}>
            Export
          </button>
        </div>
      </div>
      {loading
        ? <div style={{ textAlign: 'center', color: '#6B7280', padding: '60px 0' }}>Loading...</div>
        : history.length === 0
          ? <div style={{ textAlign: 'center', color: '#6B7280', padding: '60px 0', fontSize: '14px' }}>No data</div>
          : children}
    </div>
  );
}

export default function Overview() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [hours2, setHours2] = useState(24);
  const [history2, setHistory2] = useState([]);
  const [keys2, setKeys2] = useState([]);
  const [loading2, setLoading2] = useState(true);
  const [showPoints2, setShowPoints2] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await axios.get(`${API_BASE}/api/stats`);
        setStats(res.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetch2() {
      setLoading2(true);
      try {
        const res = await axios.get(`${API_BASE}/api/measurements/history?hours=${hours2}`);
        const data = res.data;
        setHistory2(data);
        if (data.length > 0) {
          const keySet = new Set();
          data.forEach(row => Object.keys(row).forEach(k => { if (k.startsWith('avg__')) keySet.add(k); }));
          setKeys2([...keySet]);
        }
      } catch (e) { /* silent */ }
      finally { setLoading2(false); }
    }
    fetch2();
    const interval = setInterval(fetch2, 60000);
    return () => clearInterval(interval);
  }, [hours2]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6B7280' }}>
        {t.overview.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '16px', color: '#DC2626' }}>
        {t.overview.errorLoading} {error}
      </div>
    );
  }

  const filteredKeys2 = keys2.filter(k => k.startsWith('avg__'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>{t.overview.title}</h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>{t.overview.subtitle}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <KpiCard
          title={t.overview.activeSensors}
          value={stats?.active_sensors ?? '—'}
          subtitle={t.overview.activeSensorsSubtitle}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>}
        />
        <KpiCard
          title={t.overview.avgNoise}
          value={stats?.avg_noise_db != null ? `${stats.avg_noise_db} dB` : '—'}
          subtitle={t.overview.avgNoiseSubtitle}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
        />
        <KpiCard
          title={t.overview.activeAlerts}
          value={stats?.active_alerts ?? '—'}
          subtitle={t.overview.activeAlertsSubtitle}
          borderHighlight={stats?.active_alerts > 0 ? '#F97316' : undefined}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stats?.active_alerts > 0 ? '#F97316' : 'currentColor'} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        />
        <KpiCard
          title={t.overview.sensorHealth}
          value={stats?.sensor_health_pct != null ? `${stats.sensor_health_pct}%` : '—'}
          subtitle={t.overview.sensorHealthSubtitle}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
        />
      </div>

      <ChartCard
        title={`${t.overview.chartTitle} — Y-axis drag pan`}
        subtitle="Drag up/down to pan Y-axis · Scroll to zoom X · Drag slider"
        hours={hours2}
        setHours={setHours2}
        loading={loading2}
        history={history2}
        onExport={() => downloadCSV('noise-overview-ypan.csv', history2)}
        showPoints={showPoints2}
        onTogglePoints={setShowPoints2}
      >
        <EChartsChartYPan history={history2} sensorKeys={filteredKeys2} colors={SENSOR_COLORS} showPoints={showPoints2} />
      </ChartCard>
    </div>
  );
}
