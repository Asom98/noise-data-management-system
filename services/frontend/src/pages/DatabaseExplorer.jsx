import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import { API_BASE, SENSOR_COLORS } from '../utils/noise';

const QUALITY = { 0: { label: 'Normal', color: '#10B981' }, 1: { label: 'High', color: '#F97316' }, 2: { label: 'Critical', color: '#EF4444' } };
const PAGE_SIZE = 50;

function SummaryCard({ label, value, sub }) {
  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

export default function DatabaseExplorer() {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [selectedSensor, setSelectedSensor] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingRows, setLoadingRows] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/api/db/summary`)
      .then(r => setSummary(r.data))
      .catch(() => {})
      .finally(() => setLoadingSummary(false));
  }, []);

  useEffect(() => {
    setLoadingRows(true);
    const params = { limit: PAGE_SIZE, offset };
    if (selectedSensor) params.sensor_id = selectedSensor;
    axios.get(`${API_BASE}/api/db/raw`, { params })
      .then(r => { setRows(r.data.rows); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoadingRows(false));
  }, [selectedSensor, offset]);

  function onSensorChange(e) {
    setSelectedSensor(e.target.value);
    setOffset(0);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const barOption = summary ? {
    tooltip: { trigger: 'axis' },
    grid: { top: 10, right: 20, bottom: 60, left: 60 },
    xAxis: {
      type: 'category',
      data: summary.per_sensor.map(s => s.sensor_id.split('-')[0]),
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value', name: 'Records', axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar',
      data: summary.per_sensor.map((s, i) => ({
        value: s.record_count,
        itemStyle: { color: SENSOR_COLORS[i % SENSOR_COLORS.length] },
      })),
    }],
  } : null;

  const rangeOption = summary ? {
    tooltip: { trigger: 'axis' },
    grid: { top: 10, right: 20, bottom: 60, left: 60 },
    xAxis: {
      type: 'category',
      data: summary.per_sensor.map(s => s.sensor_id.split('-')[0]),
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value', name: 'dB', axisLabel: { formatter: v => `${v} dB`, fontSize: 11 } },
    series: [
      {
        name: 'Min',
        type: 'bar',
        stack: 'range',
        data: summary.per_sensor.map(s => s.min_db),
        itemStyle: { color: '#BFDBFE' },
      },
      {
        name: 'Avg',
        type: 'bar',
        stack: 'range',
        data: summary.per_sensor.map(s => parseFloat((s.avg_db - s.min_db).toFixed(1))),
        itemStyle: { color: '#3B82F6' },
      },
      {
        name: 'Max',
        type: 'bar',
        stack: 'range',
        data: summary.per_sensor.map(s => parseFloat((s.max_db - s.avg_db).toFixed(1))),
        itemStyle: { color: '#1D4ED8' },
      },
    ],
  } : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>Database Explorer</h1>
        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Live view of raw TimescaleDB data</p>
      </div>

      {/* Summary cards */}
      {loadingSummary ? (
        <div style={{ color: '#6B7280', textAlign: 'center', padding: '40px' }}>Loading summary...</div>
      ) : summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <SummaryCard label="Total Records" value={summary.total_records.toLocaleString()} />
            <SummaryCard label="Active Sensors" value={summary.per_sensor.length} />
            <SummaryCard
              label="Oldest Record"
              value={summary.oldest ? new Date(summary.oldest).toLocaleDateString('sv-SE') : '—'}
              sub={summary.oldest ? new Date(summary.oldest).toLocaleTimeString('sv-SE') : null}
            />
            <SummaryCard
              label="Latest Record"
              value={summary.newest ? new Date(summary.newest).toLocaleDateString('sv-SE') : '—'}
              sub={summary.newest ? new Date(summary.newest).toLocaleTimeString('sv-SE') : null}
            />
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #E5E7EB' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 12px' }}>Records per Sensor</h2>
              <ReactECharts option={barOption} style={{ height: 220 }} />
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #E5E7EB' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 12px' }}>dB Range per Sensor (min / avg / max)</h2>
              <ReactECharts option={rangeOption} style={{ height: 220 }} />
            </div>
          </div>

          {/* Per-sensor table */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>Sensor Summary</h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB' }}>
                  {['Sensor ID', 'Description', 'Records', 'Avg dB', 'Min dB', 'Max dB', 'Last Seen'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.per_sensor.map((s, i) => (
                  <tr key={s.sensor_id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '10px 16px', fontWeight: '500', color: SENSOR_COLORS[i % SENSOR_COLORS.length] }}>{s.sensor_id.split('-')[0]}</td>
                    <td style={{ padding: '10px 16px', color: '#374151' }}>{s.description || s.sensor_id}</td>
                    <td style={{ padding: '10px 16px', color: '#111827', fontWeight: '600' }}>{s.record_count.toLocaleString()}</td>
                    <td style={{ padding: '10px 16px', color: '#111827' }}>{s.avg_db} dB</td>
                    <td style={{ padding: '10px 16px', color: '#3B82F6' }}>{s.min_db} dB</td>
                    <td style={{ padding: '10px 16px', color: '#EF4444' }}>{s.max_db} dB</td>
                    <td style={{ padding: '10px 16px', color: '#6B7280' }}>{s.last_seen ? new Date(s.last_seen).toLocaleTimeString('sv-SE') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Raw data table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>Raw Measurements</h2>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>{total.toLocaleString()} records {selectedSensor ? `for ${selectedSensor.split('-')[0]}` : 'total'}</p>
          </div>
          <select
            value={selectedSensor}
            onChange={onSensorChange}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px', color: '#374151', backgroundColor: 'white', cursor: 'pointer' }}
          >
            <option value="">All sensors</option>
            {summary?.per_sensor.map(s => (
              <option key={s.sensor_id} value={s.sensor_id}>{s.sensor_id.split('-')[0]} — {s.description || s.sensor_id}</option>
            ))}
          </select>
        </div>

        {loadingRows ? (
          <div style={{ textAlign: 'center', color: '#6B7280', padding: '40px' }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6B7280', padding: '40px' }}>No data</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                {['Timestamp', 'Sensor', 'Description', 'Value', 'Quality'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const q = QUALITY[r.quality_flag] ?? QUALITY[0];
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                    <td style={{ padding: '9px 16px', color: '#6B7280', fontFamily: 'monospace' }}>{new Date(r.ts).toLocaleString('sv-SE')}</td>
                    <td style={{ padding: '9px 16px', fontWeight: '500', color: '#111827' }}>{r.sensor_id.split('-')[0]}</td>
                    <td style={{ padding: '9px 16px', color: '#374151' }}>{r.description || '—'}</td>
                    <td style={{ padding: '9px 16px', fontWeight: '600', color: r.value_db > 70 ? '#EF4444' : r.value_db > 60 ? '#F97316' : '#10B981' }}>{r.value_db} dB</td>
                    <td style={{ padding: '9px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', backgroundColor: `${q.color}18`, color: q.color }}>
                        {q.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderTop: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>Page {currentPage} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
                disabled={offset === 0}
                style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', border: '1px solid #E5E7EB', backgroundColor: offset === 0 ? '#F9FAFB' : 'white', color: offset === 0 ? '#9CA3AF' : '#374151', cursor: offset === 0 ? 'default' : 'pointer' }}
              >Previous</button>
              <button
                onClick={() => setOffset(o => o + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total}
                style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '13px', border: '1px solid #E5E7EB', backgroundColor: offset + PAGE_SIZE >= total ? '#F9FAFB' : 'white', color: offset + PAGE_SIZE >= total ? '#9CA3AF' : '#374151', cursor: offset + PAGE_SIZE >= total ? 'default' : 'pointer' }}
              >Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
