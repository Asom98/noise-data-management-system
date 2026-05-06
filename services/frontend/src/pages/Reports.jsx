import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API_BASE, downloadCSV, getSensorDisplayName, getNoiseColor } from '../utils/noise';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/SettingsContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalDTInput(date) {
  // datetime-local input needs YYYY-MM-DDTHH:mm in local time
  const off = date.getTimezoneOffset() * 60000;
  return new Date(date - off).toISOString().slice(0, 16);
}

function defaultRange(hours = 24) {
  const to = new Date();
  const from = new Date(to.getTime() - hours * 3600000);
  return { from: toLocalDTInput(from), to: toLocalDTInput(to) };
}

function toISO(dtLocal) {
  return new Date(dtLocal).toISOString();
}

// ─── Report type config ───────────────────────────────────────────────────────

const REPORT_TYPES = [
  {
    id: 'summary',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    id: 'alerts',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  },
  {
    id: 'sensorHealth',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  },
  {
    id: 'rawReadings',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  },
];

const PRESETS = [
  { label: '1h',  hours: 1 },
  { label: '6h',  hours: 6 },
  { label: '24h', hours: 24 },
  { label: '7d',  hours: 168 },
  { label: '30d', hours: 720 },
];

// ─── Data fetchers ────────────────────────────────────────────────────────────

async function fetchSummary() {
  const res = await axios.get(`${API_BASE}/api/db/summary`);
  const d = res.data;
  const rows = d.per_sensor.map(s => ({
    sensor_id: s.sensor_id,
    location: getSensorDisplayName(s.sensor_id, s.description),
    records: s.record_count,
    avg_db: s.avg_db,
    min_db: s.min_db,
    max_db: s.max_db,
    last_seen: s.last_seen ? new Date(s.last_seen).toLocaleString('sv-SE') : '—',
  }));
  return {
    rows,
    columns: ['sensor_id', 'location', 'records', 'avg_db', 'min_db', 'max_db', 'last_seen'],
    headers: ['Sensor ID', 'Location', 'Records', 'Avg dB', 'Min dB', 'Max dB', 'Last seen'],
    meta: {
      'Total records': d.total_records,
      'Oldest': d.oldest ? new Date(d.oldest).toLocaleString('sv-SE') : '—',
      'Newest': d.newest ? new Date(d.newest).toLocaleString('sv-SE') : '—',
    },
  };
}

async function fetchAlerts(from_dt, to_dt) {
  const res = await axios.get(`${API_BASE}/api/alerts`, { params: { from_dt, to_dt } });
  const rows = res.data.map(a => ({
    sensor_id: a.sensor_id,
    location: getSensorDisplayName(a.sensor_id, a.description),
    value_db: a.value_db,
    alert_type: a.alert_type,
    timestamp: new Date(a.ts).toLocaleString('sv-SE'),
    _ts: a.ts,
  }));
  return {
    rows,
    columns: ['sensor_id', 'location', 'value_db', 'alert_type', 'timestamp'],
    headers: ['Sensor ID', 'Location', 'Reading (dB)', 'Alert type', 'Timestamp'],
  };
}

async function fetchSensorHealth() {
  const res = await axios.get(`${API_BASE}/api/sensors/health`);
  const rows = res.data.map(s => ({
    sensor_id: s.sensor_id,
    location: getSensorDisplayName(s.sensor_id, s.description),
    status: s.status,
    availability: `${s.availability_pct} %`,
    readings_24h: s.readings_24h,
    max_gap: s.max_gap_minutes != null ? `${s.max_gap_minutes} min` : '—',
    last_seen: s.last_seen ? new Date(s.last_seen).toLocaleString('sv-SE') : 'Never',
  }));
  return {
    rows,
    columns: ['sensor_id', 'location', 'status', 'availability', 'readings_24h', 'max_gap', 'last_seen'],
    headers: ['Sensor ID', 'Location', 'Status', 'Availability (24 h)', 'Readings (24 h)', 'Max Gap', 'Last seen'],
  };
}

async function fetchRawReadings(sensorId, from_dt, to_dt) {
  const params = { limit: 1000, from_dt, to_dt };
  if (sensorId !== 'all') params.sensor_id = sensorId;
  const res = await axios.get(`${API_BASE}/api/db/raw`, { params });
  const rows = res.data.rows.map(r => ({
    sensor_id: r.sensor_id,
    location: getSensorDisplayName(r.sensor_id, r.description),
    value_db: r.value_db,
    unit: r.unit,
    quality_flag: r.quality_flag,
    timestamp: new Date(r.ts).toLocaleString('sv-SE'),
    _ts: r.ts,
  }));
  return {
    rows,
    columns: ['sensor_id', 'location', 'value_db', 'unit', 'quality_flag', 'timestamp'],
    headers: ['Sensor ID', 'Location', 'Reading (dB)', 'Unit', 'Quality', 'Timestamp'],
  };
}

// ─── Chart builders ───────────────────────────────────────────────────────────

function buildSummaryOption(rows, theme) {
  const locations = rows.map(r => r.location ?? r.sensor_id);
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => `${p[0].name}<br/><b>Avg: ${p[0].value} dB</b>` },
    grid: { top: 10, right: 60, bottom: 10, left: 200, containLabel: false },
    xAxis: { type: 'value', axisLabel: { formatter: v => `${v} dB`, fontSize: 11, color: theme.chartAxis }, splitLine: { lineStyle: { color: theme.chartGrid } } },
    yAxis: { type: 'category', data: locations, axisLabel: { fontSize: 11, color: theme.chartAxis } },
    series: [{
      type: 'bar',
      data: rows.map(r => ({
        value: r.avg_db,
        itemStyle: { color: r.avg_db >= 90 ? '#EF4444' : r.avg_db >= 80 ? '#F97316' : r.avg_db >= 70 ? '#F59E0B' : '#10B981', borderRadius: [0, 4, 4, 0] },
      })),
      label: { show: true, position: 'right', formatter: p => `${p.value} dB`, fontSize: 11, color: theme.chartAxis },
      barMaxWidth: 32,
    }],
  };
}

function buildAlertsOption(rows, theme) {
  const colorMap = { Critical: '#EF4444', High: '#F97316', Low: '#2563EB' };
  const groups = {};
  rows.forEach(r => {
    const k = r.alert_type ?? 'Unknown';
    if (!groups[k]) groups[k] = [];
    groups[k].push([r._ts ?? r.timestamp, r.value_db, r.location ?? r.sensor_id]);
  });
  const series = Object.entries(groups).map(([type, data]) => ({
    name: type,
    type: 'scatter',
    data: data.map(d => [d[0], d[1]]),
    symbolSize: 9,
    itemStyle: { color: colorMap[type] ?? theme.textMuted, opacity: 0.85 },
  }));
  return {
    tooltip: {
      trigger: 'item',
      formatter: p => `<b>${p.seriesName}</b><br/>${new Date(p.data[0]).toLocaleString('sv-SE')}<br/>${p.data[1]} dB`,
    },
    legend: { bottom: 0, textStyle: { fontSize: 11, color: theme.chartAxis } },
    grid: { top: 10, right: 20, bottom: 40, left: 20, containLabel: true },
    xAxis: { type: 'time', axisLabel: { fontSize: 10, color: theme.chartAxis }, splitLine: { lineStyle: { color: theme.chartGrid } } },
    yAxis: { type: 'value', axisLabel: { formatter: v => `${v} dB`, fontSize: 11, color: theme.chartAxis }, splitLine: { lineStyle: { color: theme.chartGrid } }, min: v => Math.max(0, Math.floor(v.min - 5)), max: v => Math.ceil(v.max + 5) },
    series,
  };
}

function buildSensorHealthOption(rows, theme) {
  const counts = {};
  rows.forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
  const colorMap = { Operational: '#10B981', Warning: '#F59E0B', Critical: '#EF4444' };
  const entries = Object.entries(counts);
  return {
    tooltip: { trigger: 'item', formatter: p => `<b>${p.name}</b>: ${p.value} sensor${p.value !== 1 ? 's' : ''}` },
    grid: { top: 10, right: 30, bottom: 10, left: 20, containLabel: true },
    xAxis: { type: 'value', axisLabel: { fontSize: 11, color: theme.chartAxis }, splitLine: { lineStyle: { color: theme.chartGrid } } },
    yAxis: { type: 'category', data: entries.map(([k]) => k), axisLabel: { fontSize: 12, fontWeight: 'bold', color: theme.chartAxis } },
    series: [{
      type: 'bar',
      data: entries.map(([k, v]) => ({ value: v, itemStyle: { color: colorMap[k] ?? theme.textMuted, borderRadius: [0, 6, 6, 0] } })),
      label: { show: true, position: 'right', fontSize: 13, fontWeight: 'bold', color: theme.chartAxis },
      barMaxWidth: 40,
    }],
  };
}

function buildRawReadingsOption(rows, theme) {
  // rows are DESC from API; reverse for time-ascending chart
  const sorted = [...rows].reverse();
  // Group by sensor for multi-line
  const sensors = [...new Set(sorted.map(r => r.sensor_id))];
  const COLORS = ['#2563EB', '#10B981', '#8B5CF6', '#F97316', '#EF4444'];
  const series = sensors.map((sid, i) => {
    const pts = sorted.filter(r => r.sensor_id === sid);
    return {
      name: sid.split('-')[0],
      type: 'line',
      data: pts.map(r => [r._ts ?? r.timestamp, r.value_db]),
      lineStyle: { color: COLORS[i % COLORS.length], width: 2 },
      itemStyle: { color: COLORS[i % COLORS.length] },
      symbol: 'circle', symbolSize: 4, smooth: false,
    };
  });
  return {
    tooltip: {
      trigger: 'axis',
      formatter: params => {
        const t = new Date(params[0]?.data[0]).toLocaleString('sv-SE');
        return `<b>${t}</b><br/>` + params.map(p => `${p.marker}${p.seriesName}: <b>${p.data[1]} dB</b>`).join('<br/>');
      },
    },
    legend: { bottom: 0, textStyle: { fontSize: 11, color: theme.chartAxis } },
    grid: { top: 10, right: 20, bottom: 50, left: 20, containLabel: true },
    dataZoom: [{ type: 'inside', xAxisIndex: 0 }, { type: 'slider', xAxisIndex: 0, bottom: 4, height: 18 }],
    xAxis: { type: 'time', axisLabel: { fontSize: 10, color: theme.chartAxis }, splitLine: { lineStyle: { color: theme.chartGrid } } },
    yAxis: { type: 'value', axisLabel: { formatter: v => `${Math.round(v)} dB`, fontSize: 11, color: theme.chartAxis }, splitLine: { lineStyle: { color: theme.chartGrid } }, min: v => Math.max(0, Math.floor(v.min - 5)), max: v => Math.ceil(v.max + 5) },
    series,
  };
}

function getChartOption(type, rows, theme) {
  if (!rows || rows.length === 0) return null;
  if (type === 'summary')      return buildSummaryOption(rows, theme);
  if (type === 'alerts')       return buildAlertsOption(rows, theme);
  if (type === 'sensorHealth') return buildSensorHealthOption(rows, theme);
  if (type === 'rawReadings')  return buildRawReadingsOption(rows, theme);
  return null;
}

// ─── PDF builder ──────────────────────────────────────────────────────────────

function buildPdf({ title, rangeLabel, headers, rows, columns, meta, chartImg }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;

  // Header bar
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('Malmö Noise Monitoring System', 10, 12);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleString('sv-SE'), W - 10, 12, { align: 'right' });

  // Title + range
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(15); doc.setFont('helvetica', 'bold');
  doc.text(title, 10, 28);

  let y = 34;
  if (rangeLabel) {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
    doc.text(rangeLabel, 10, y); y += 5;
  }
  if (meta) {
    const metaStr = Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join('   ·   ');
    doc.setFontSize(8); doc.setTextColor(107, 114, 128);
    doc.text(metaStr, 10, y); y += 5;
  }

  // Chart image
  if (chartImg) {
    const imgH = 72;
    doc.addImage(chartImg, 'PNG', 10, y, W - 20, imgH);
    y += imgH + 4;
  }

  // Table
  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows.map(row => columns.map(col => { const v = row[col]; return v != null ? String(v) : '—'; })),
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [55, 65, 81] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 10, right: 10 },
    tableLineColor: [229, 231, 235], tableLineWidth: 0.1,
    didDrawPage: (data) => {
      const pg = doc.getNumberOfPages();
      doc.setFontSize(7); doc.setTextColor(156, 163, 175);
      doc.text(`Page ${data.pageNumber}`, W - 10, 205, { align: 'right' });
      doc.text('Generated by Malmö Noise Dashboard', 10, 205);
    },
  });
  return doc;
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

function StepLabel({ n, label }) {
  const theme = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: theme.accent, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>{n}</div>
      <span style={{ fontSize: '15px', fontWeight: '600', color: theme.textPrimary }}>{label}</span>
    </div>
  );
}

function Card({ children, style }) {
  const theme = useTheme();
  return <div style={{ backgroundColor: theme.cardBg, borderRadius: '12px', padding: '20px 24px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow, ...style }}>{children}</div>;
}

function DateRangePicker({ range, onChange, disabled }) {
  const theme = useTheme();
  const [activePreset, setActivePreset] = useState('24h');

  function applyPreset(p) {
    setActivePreset(p.label);
    onChange(defaultRange(p.hours));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Preset chips */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button
            key={p.label}
            disabled={disabled}
            onClick={() => applyPreset(p)}
            style={{
              padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: disabled ? 'default' : 'pointer',
              backgroundColor: activePreset === p.label ? theme.accentBg : theme.inputBg,
              color: activePreset === p.label ? theme.accent : theme.textSecondary,
              border: activePreset === p.label ? `1px solid ${theme.accentBorder}` : `1px solid ${theme.border}`,
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setActivePreset('custom')}
          disabled={disabled}
          style={{
            padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: disabled ? 'default' : 'pointer',
            backgroundColor: activePreset === 'custom' ? theme.accentBg : theme.inputBg,
            color: activePreset === 'custom' ? theme.accent : theme.textSecondary,
            border: activePreset === 'custom' ? `1px solid ${theme.accentBorder}` : `1px solid ${theme.border}`,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          Custom range
        </button>
      </div>
      {/* Date inputs — always visible */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <input
          type="datetime-local"
          value={range.from}
          disabled={disabled}
          onChange={e => { setActivePreset('custom'); onChange({ ...range, from: e.target.value }); }}
          style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, fontSize: '13px', color: theme.textPrimary, backgroundColor: theme.inputBg, cursor: disabled ? 'default' : 'text' }}
        />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        <input
          type="datetime-local"
          value={range.to}
          disabled={disabled}
          onChange={e => { setActivePreset('custom'); onChange({ ...range, to: e.target.value }); }}
          style={{ padding: '6px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, fontSize: '13px', color: theme.textPrimary, backgroundColor: theme.inputBg, cursor: disabled ? 'default' : 'text' }}
        />
      </div>
    </div>
  );
}

function PreviewTable({ headers, rows, columns }) {
  const theme = useTheme();
  const [showAll, setShowAll] = useState(false);
  const preview = showAll ? rows : rows.slice(0, 12);
  return (
    <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: theme.accentBg }}>
            {headers.map(h => (
              <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: '600', color: theme.accent, fontSize: '11px', whiteSpace: 'nowrap', borderBottom: `1px solid ${theme.accentBorder}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${theme.borderLight}`, backgroundColor: i % 2 === 1 ? theme.tableAltBg : theme.cardBg }}>
              {columns.map(col => (
                <td key={col} style={{ padding: '8px 14px', color: theme.textSecondary, whiteSpace: 'nowrap' }}>{row[col] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 12 && (
        <div
          onClick={() => setShowAll(v => !v)}
          style={{ padding: '8px 14px', backgroundColor: theme.tableHeadBg, borderTop: `1px solid ${theme.borderLight}`, fontSize: '12px', color: theme.accent, cursor: 'pointer', textAlign: 'center' }}
        >
          {showAll ? `▲ Show fewer rows` : `▼ Show all ${rows.length} rows`}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Reports() {
  const { t } = useLanguage();
  const theme = useTheme();
  const chartRef = useRef(null);

  const [reportType, setReportType]       = useState(null);
  const [range, setRange]                 = useState(() => defaultRange(24));
  const [sensorId, setSensorId]           = useState('all');
  const [allSensors, setAllSensors]       = useState([]);
  const [result, setResult]               = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/api/sensors`).then(r => setAllSensors(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setSensorId('all');
    setResult(null); setError(null);
  }, [reportType]);

  useEffect(() => {
    if (!reportType) return;
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      const from = toISO(range.from);
      const to   = toISO(range.to);
      try {
        let data = null;
        if (reportType === 'summary')          data = await fetchSummary();
        else if (reportType === 'alerts')      data = await fetchAlerts(from, to);
        else if (reportType === 'sensorHealth') data = await fetchSensorHealth();
        else if (reportType === 'rawReadings') data = await fetchRawReadings(sensorId, from, to);
        if (!cancelled) setResult(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [reportType, range, sensorId]);

  function handleDownloadCSV() {
    if (!result) return;
    downloadCSV(`malmo-noise-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`, result.rows);
  }

  function handleDownloadPDF() {
    if (!result) return;
    const chartInstance = chartRef.current?.getEchartsInstance?.();
    const chartImg = chartInstance
      ? chartInstance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' }).replace('data:image/png;base64,', '')
      : null;

    const typeLabel = t.reports.types[reportType] ?? reportType;
    const rangeLabel = `Period: ${new Date(range.from).toLocaleString('sv-SE')} → ${new Date(range.to).toLocaleString('sv-SE')}`;
    const doc = buildPdf({
      title: `${typeLabel} — Malmö Noise Monitoring`,
      rangeLabel,
      headers: result.headers,
      rows: result.rows,
      columns: result.columns,
      meta: result.meta ?? null,
      chartImg,
    });
    doc.save(`malmo-noise-${reportType}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const needsSensor   = reportType === 'rawReadings';
  const noTimeFilter  = reportType === 'sensorHealth' || reportType === 'summary';
  const sensorList    = allSensors;
  const chartOption   = result ? getChartOption(reportType, result.rows, theme) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: theme.textPrimary, margin: 0 }}>{t.reports.title}</h1>
        <p style={{ fontSize: '14px', color: theme.textSecondary, marginTop: '4px' }}>{t.reports.subtitle}</p>
      </div>

      {/* Step 1 — Report type */}
      <Card>
        <StepLabel n="1" label={t.reports.step1} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {REPORT_TYPES.map(rt => {
            const active = reportType === rt.id;
            return (
              <button
                key={rt.id}
                onClick={() => setReportType(rt.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  padding: '16px 10px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                  border: active ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`,
                  backgroundColor: active ? theme.accentBg : theme.inputBg,
                  color: active ? theme.accent : theme.textSecondary,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ color: active ? theme.accent : theme.textSecondary }}>{rt.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>{t.reports.types[rt.id]}</span>
                <span style={{ fontSize: '11px', color: theme.textMuted, lineHeight: 1.3 }}>{t.reports.descs[rt.id]}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Step 2 — Filters */}
      {reportType && (
        <Card>
          <StepLabel n="2" label={t.reports.step2} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'flex-start' }}>

            {/* Date range picker */}
            {!noTimeFilter ? (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: theme.textSecondary, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t.reports.timeRange}
                </div>
                <DateRangePicker range={range} onChange={setRange} disabled={false} />
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: theme.textMuted, margin: 0, alignSelf: 'center' }}>
                {t.reports.noFiltersNeeded}
              </p>
            )}

            {/* Sensor picker */}
            {needsSensor && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: theme.textSecondary, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t.reports.sensor}
                </div>
                {sensorList.length === 0 ? (
                  <span style={{ fontSize: '13px', color: theme.textMuted }}>{t.reports.noAcousticSensors}</span>
                ) : (
                  <select
                    value={sensorId}
                    onChange={e => setSensorId(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: '8px', fontSize: '13px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textPrimary, minWidth: '280px', cursor: 'pointer' }}
                  >
                    {reportType === 'rawReadings' && <option value="all">{t.reports.allSensors}</option>}
                    {sensorList.map(s => (
                      <option key={s.sensor_id} value={s.sensor_id}>
                        {s.sensor_id} — {getSensorDisplayName(s.sensor_id, s.description)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Step 3 — Chart + Table + Download */}
      {reportType && (
        <Card>
          <StepLabel n="3" label={t.reports.step3} />

          {loading && (
            <div style={{ textAlign: 'center', color: theme.textSecondary, padding: '60px 0', fontSize: '14px' }}>{t.reports.loading}</div>
          )}
          {error && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', color: '#DC2626', fontSize: '13px' }}>{error}</div>
          )}
          {!loading && !error && result && result.rows.length === 0 && (
            <div style={{ textAlign: 'center', color: theme.textMuted, padding: '60px 0', fontSize: '14px' }}>{t.reports.noData}</div>
          )}
          {!loading && !error && result && result.rows.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Download bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: theme.textSecondary }}>
                  <b style={{ color: theme.textPrimary }}>{result.rows.length}</b> {t.reports.rowsReady}
                  {!noTimeFilter && (
                    <span style={{ marginLeft: '10px', fontSize: '12px', color: theme.textMuted }}>
                      {new Date(range.from).toLocaleString('sv-SE')} → {new Date(range.to).toLocaleString('sv-SE')}
                    </span>
                  )}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleDownloadCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', backgroundColor: theme.inputBg, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {t.reports.downloadCsv}
                  </button>
                  <button onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', backgroundColor: theme.accent, color: 'white', border: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {t.reports.downloadPdf}
                  </button>
                </div>
              </div>

              {/* Chart */}
              {chartOption && (
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: '10px', overflow: 'hidden', backgroundColor: theme.cardBg }}>
                  <div style={{ padding: '10px 16px', borderBottom: `1px solid ${theme.border}`, fontSize: '12px', fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t.reports.chartTitle}
                  </div>
                  <ReactECharts
                    ref={chartRef}
                    option={chartOption}
                    style={{ height: reportType === 'summary' ? Math.max(160, result.rows.length * 40) : 300, padding: '8px' }}
                    notMerge
                  />
                </div>
              )}

              {/* Table */}
              <PreviewTable headers={result.headers} rows={result.rows} columns={result.columns} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
