import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import { API_BASE, getSensorDisplayName } from '../utils/noise';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/SettingsContext';

const METRIC_CONFIG = {
  laeq: { color: '#2563EB', label: 'LAeq', desc: 'Equivalent average level (1 min)' },
  lamax: { color: '#EF4444', label: 'LAmax', desc: 'Highest 1-second peak' },
  lamin: { color: '#10B981', label: 'LAmin', desc: 'Lowest 1-second reading' },
};

const TIME_OPTIONS = [
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '3d', hours: 72 },
  { label: '7d', hours: 168 },
];

function MetricToggle({ metrics, visible, onToggle }) {
  const theme = useTheme();
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {Object.entries(metrics).map(([key, cfg]) => {
        const on = visible[key];
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
              fontWeight: on ? '600' : '400',
              border: `2px solid ${cfg.color}`,
              backgroundColor: on ? cfg.color : theme.inputBg,
              color: on ? 'white' : cfg.color,
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              width: '14px', height: '3px', borderRadius: '2px',
              backgroundColor: on ? 'white' : cfg.color, display: 'inline-block',
            }} />
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

function AcousticChart({ data, visible, chartRef, containerRef }) {
  const theme = useTheme();
  if (!data.length) return null;

  const labels = data.map(r => r.time);

  const series = Object.entries(METRIC_CONFIG)
    .filter(([key]) => visible[key])
    .map(([key, cfg]) => ({
      name: cfg.label,
      type: 'line',
      data: data.map(r => r[key] ?? null),
      lineStyle: { color: cfg.color, width: 2.5 },
      itemStyle: { color: cfg.color },
      symbol: 'circle',
      symbolSize: 4,
      smooth: false,
      connectNulls: false,
    }));

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const time = params[0]?.axisValue ?? '';
        const lines = params.map(p =>
          `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:5px"></span>` +
          `<b>${p.seriesName}</b>: ${p.value != null ? p.value + ' dB' : '—'}`
        ).join('<br/>');
        return `<div style="font-size:12px"><b>${time}</b><br/>${lines}</div>`;
      },
    },
    legend: {
      show: false,
    },
    grid: { top: 16, right: 24, bottom: 60, left: 64 },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none', moveOnMouseMove: false },
      { type: 'slider', xAxisIndex: 0, bottom: 8, height: 20 },
    ],
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { fontSize: 11, color: theme.chartAxis },
      axisLine: { lineStyle: { color: theme.border } },
    },
    yAxis: {
      type: 'value',
      name: 'dB',
      nameTextStyle: { color: theme.chartAxis, fontSize: 11 },
      axisLabel: { formatter: v => `${Math.round(v)} dB`, fontSize: 11, color: theme.chartAxis },
      splitLine: { lineStyle: { color: theme.chartGrid } },
      min: value => Math.max(0, Math.floor(value.min - 5)),
      max: value => Math.ceil(value.max + 5),
    },
    series,
  };

  return (
    <div ref={containerRef} style={{ cursor: 'crosshair' }}>
      <ReactECharts ref={chartRef} option={option} style={{ height: 380 }} notMerge />
    </div>
  );
}

export default function AcousticMetrics() {
  const { t } = useLanguage();
  const theme = useTheme();

  const [sensors, setSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [hours, setHours] = useState(1);
  const [data, setData] = useState([]);
  const [visible, setVisible] = useState({ laeq: true, lamax: true, lamin: true });
  const [loadingSensors, setLoadingSensors] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [noAcousticData, setNoAcousticData] = useState(false);

  const chartRef = useRef(null);
  const containerRef = useRef(null);

  // Fetch sensors with acoustic data
  useEffect(() => {
    async function fetchSensors() {
      setLoadingSensors(true);
      try {
        const res = await axios.get(`${API_BASE}/api/sensors/acoustic`);
        setSensors(res.data);
        if (res.data.length > 0) setSelectedSensor(res.data[0].sensor_id);
        setNoAcousticData(res.data.length === 0);
      } catch (e) {
        console.error('Failed to load acoustic sensors:', e);
      } finally {
        setLoadingSensors(false);
      }
    }
    fetchSensors();
  }, []);

  // Fetch acoustic history when sensor or time range changes
  useEffect(() => {
    if (!selectedSensor) return;
    let cancelled = false;
    async function fetchData() {
      setLoadingData(true);
      try {
        const res = await axios.get(
          `${API_BASE}/api/measurements/acoustic?sensor_id=${encodeURIComponent(selectedSensor)}&hours=${hours}`
        );
        if (!cancelled) setData(res.data);
      } catch (e) {
        console.error('Failed to load acoustic data:', e);
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [selectedSensor, hours]);

  // XY drag pan on the chart
  useEffect(() => {
    let isDragging = false, prevX = 0, prevY = 0;

    function onMouseDown(e) {
      if (e.button !== 0) return;
      isDragging = true; prevX = e.clientX; prevY = e.clientY;
    }
    function onMouseMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX; prevY = e.clientY;
      const chart = chartRef.current?.getEchartsInstance();
      if (!chart) return;
      if (dy !== 0) {
        const d0 = chart.convertFromPixel({ yAxisIndex: 0 }, 0);
        const d1 = chart.convertFromPixel({ yAxisIndex: 0 }, 1);
        const delta = dy * (d1 - d0);
        const [curMin, curMax] = chart.getModel().getComponent('yAxis', 0).axis.scale.getExtent();
        chart.setOption({ yAxis: { min: curMin + delta, max: curMax + delta } }, false);
      }
      if (dx !== 0) {
        const opt = chart.getOption();
        const dz = opt.dataZoom[0];
        const start = dz.start ?? 0;
        const end = dz.end ?? 100;
        const span = end - start;
        const gridWidth = chart.getWidth() - 88;
        const shiftPct = (-dx / gridWidth) * (span / 100 * data.length / data.length) * 100;
        const newStart = Math.max(0, Math.min(start + shiftPct, 100 - span));
        chart.dispatchAction({ type: 'dataZoom', dataZoomIndex: 0, start: newStart, end: newStart + span });
      }
    }
    function onMouseUp() { isDragging = false; }

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
  }, [data]);

  function toggleMetric(key) {
    setVisible(v => ({ ...v, [key]: !v[key] }));
  }

  const selectedSensorInfo = sensors.find(s => s.sensor_id === selectedSensor);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: theme.textPrimary, margin: 0 }}>
          {t.acousticMetrics.title}
        </h1>
        <p style={{ fontSize: '14px', color: theme.textSecondary, marginTop: '4px' }}>
          {t.acousticMetrics.subtitle}
        </p>
      </div>

      {loadingSensors ? (
        <div style={{ color: theme.textSecondary, textAlign: 'center', padding: '48px 0' }}>
          {t.acousticMetrics.loadingSensors}
        </div>
      ) : noAcousticData ? (
        /* No acoustic sensors yet */
        <div style={{
          backgroundColor: theme.cardBg, borderRadius: '12px', padding: '48px 32px',
          border: `1px solid ${theme.border}`, textAlign: 'center',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
            <path d="M9 19V6l12-3v13M9 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-3c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/>
          </svg>
          <p style={{ fontSize: '15px', fontWeight: '600', color: theme.textSecondary, margin: '0 0 8px' }}>
            {t.acousticMetrics.noSensorsTitle}
          </p>
          <p style={{ fontSize: '13px', color: theme.textSecondary, margin: 0, maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
            {t.acousticMetrics.noSensorsDesc}
          </p>
        </div>
      ) : (
        <>
          {/* Metric legend cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {Object.entries(METRIC_CONFIG).map(([key, cfg]) => (
              <div key={key} style={{
                backgroundColor: theme.cardBg, borderRadius: '10px', padding: '14px 18px',
                border: `1px solid ${cfg.color}33`,
                borderLeft: `4px solid ${cfg.color}`,
                opacity: visible[key] ? 1 : 0.45,
                transition: 'opacity 0.2s',
              }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: cfg.color }}>{cfg.label}</div>
                <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '2px' }}>{cfg.desc}</div>
              </div>
            ))}
          </div>

          {/* Chart card */}
          <div style={{
            backgroundColor: theme.cardBg, borderRadius: '12px', padding: '20px 24px',
            border: `1px solid ${theme.border}`, boxShadow: theme.shadow,
          }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Sensor selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', color: theme.textSecondary, fontWeight: '500' }}>
                    {t.acousticMetrics.sensor}:
                  </span>
                  <select
                    value={selectedSensor ?? ''}
                    onChange={e => setSelectedSensor(e.target.value)}
                    style={{
                      padding: '6px 10px', borderRadius: '8px', fontSize: '13px',
                      border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg,
                      color: theme.textPrimary, cursor: 'pointer', minWidth: '260px',
                    }}
                  >
                    {sensors.map(s => (
                      <option key={s.sensor_id} value={s.sensor_id}>
                        {s.sensor_id} — {getSensorDisplayName(s.sensor_id, s.description)}
                      </option>
                    ))}
                  </select>
                  {sensors.length > 0 && (
                    <span style={{
                      fontSize: '11px', color: theme.badgeColor, backgroundColor: theme.badgeBg,
                      padding: '2px 8px', borderRadius: '4px', fontWeight: '600',
                    }}>
                      {sensors.length} {t.acousticMetrics.sensorsWithData}
                    </span>
                  )}
                </div>

                {/* Metric toggles */}
                <MetricToggle metrics={METRIC_CONFIG} visible={visible} onToggle={toggleMetric} />
              </div>

              {/* Time range */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {TIME_OPTIONS.map(opt => (
                  <button
                    key={opt.hours}
                    onClick={() => setHours(opt.hours)}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                      backgroundColor: hours === opt.hours ? theme.accentBg : theme.inputBg,
                      color: hours === opt.hours ? theme.accent : theme.textSecondary,
                      border: hours === opt.hours ? `1px solid ${theme.accentBorder}` : `1px solid ${theme.border}`,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart or state */}
            {loadingData ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '380px', color: theme.textSecondary }}>
                {t.acousticMetrics.loadingData}
              </div>
            ) : data.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '380px', color: theme.textMuted, gap: '8px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <span style={{ fontSize: '14px' }}>{t.acousticMetrics.noDataInRange}</span>
              </div>
            ) : (
              <AcousticChart
                data={data}
                visible={visible}
                chartRef={chartRef}
                containerRef={containerRef}
              />
            )}

            <div style={{ marginTop: '8px', fontSize: '11px', color: theme.textMuted, textAlign: 'right' }}>
              {t.acousticMetrics.dragHint}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
