import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE, getSensorDisplayName, downloadCSV } from '../utils/noise';
import { useLanguage } from '../context/LanguageContext';
import { useSettings, useTheme } from '../context/SettingsContext';

// Data Availability Rate colour thresholds
function darColor(pct) {
  if (pct >= 80) return '#10B981';
  if (pct >= 40) return '#F59E0B';
  return '#EF4444';
}

function StatusBadge({ status, t }) {
  const theme = useTheme();
  const map = {
    Operational: { color: '#10B981', bg: theme.tintGreen,  label: t.sensorHealth.statusOperational },
    Warning:     { color: '#F59E0B', bg: theme.tintAmber,  label: t.sensorHealth.statusWarning },
    Critical:    { color: '#EF4444', bg: theme.tintRed,    label: t.sensorHealth.statusCritical },
  };
  const s = map[status] || { color: theme.textSecondary, bg: theme.tableHeadBg, label: status };
  return (
    <span style={{ backgroundColor: s.bg, color: s.color, padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
      {s.label}
    </span>
  );
}

function AvailabilityBar({ pct }) {
  const theme = useTheme();
  const color = darColor(pct);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', backgroundColor: theme.border, borderRadius: '3px', overflow: 'hidden', maxWidth: '80px' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '12px', color: theme.textSecondary, minWidth: '38px' }}>{pct} %</span>
    </div>
  );
}

function MaxGapCell({ minutes }) {
  const theme = useTheme();
  if (minutes === null || minutes === undefined) {
    return <span style={{ fontSize: '12px', color: theme.textMuted }}>—</span>;
  }
  let label, color;
  if (minutes < 5)        { label = `${minutes} min`;   color = '#10B981'; }
  else if (minutes < 30)  { label = `${minutes} min`;   color = '#F59E0B'; }
  else if (minutes < 120) { label = `${Math.round(minutes)} min`; color = '#EF4444'; }
  else                    { label = `${(minutes / 60).toFixed(1)} h`; color = '#EF4444'; }
  return <span style={{ fontSize: '12px', color, fontWeight: '500' }}>{label}</span>;
}

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'help' }}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {show && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: '6px',
          backgroundColor: '#1F2937', color: 'white', fontSize: '11px', lineHeight: 1.5,
          padding: '6px 10px', borderRadius: '6px', whiteSpace: 'normal', width: '260px',
          zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {text}
        </div>
      )}
    </span>
  );
}

function reclassify(sensor, darOperationalMin, darWarningMin) {
  if (sensor.readings_24h === 0) return 'Critical';
  if (sensor.availability_pct >= darOperationalMin) return 'Operational';
  if (sensor.availability_pct >= darWarningMin) return 'Warning';
  return 'Critical';
}

export default function SensorHealth() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const theme = useTheme();
  const [rawSensors, setRawSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reclassify on every render using current settings
  const sensors = rawSensors.map(s => ({
    ...s,
    status: reclassify(s, settings.darOperationalMin, settings.darWarningMin),
  }));

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await axios.get(`${API_BASE}/api/sensors/health`);
        setRawSensors(res.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const operational = sensors.filter((s) => s.status === 'Operational').length;
  const warning     = sensors.filter((s) => s.status === 'Warning').length;
  const critical    = sensors.filter((s) => s.status === 'Critical').length;
  const total       = sensors.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: theme.textPrimary, margin: 0 }}>{t.sensorHealth.title}</h1>
          <p style={{ fontSize: '14px', color: theme.textSecondary, marginTop: '4px' }}>{t.sensorHealth.subtitle}</p>
        </div>
        <button
          onClick={() => downloadCSV('sensor-health.csv', sensors.map((s) => ({
            sensor_id: s.sensor_id,
            location: getSensorDisplayName(s.sensor_id, s.description),
            availability_pct: s.availability_pct,
            readings_24h: s.readings_24h,
            max_gap_minutes: s.max_gap_minutes ?? '',
            status: s.status,
            last_seen: s.last_seen,
          })))}
          style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', backgroundColor: theme.accent, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {t.sensorHealth.exportReport}
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[
          { label: t.sensorHealth.statusOperational, count: operational, color: '#10B981', bg: theme.tintGreen, border: theme.tintGreenBorder },
          { label: t.sensorHealth.statusWarning,     count: warning,     color: '#F59E0B', bg: theme.tintAmber, border: theme.tintAmberBorder },
          { label: t.sensorHealth.statusCritical,    count: critical,    color: '#EF4444', bg: theme.tintRed,   border: theme.tintRedBorder },
          { label: t.sensorHealth.totalSensors,      count: total,       color: theme.textSecondary, bg: theme.tableHeadBg, border: theme.border },
        ].map((item) => (
          <div key={item.label} style={{ backgroundColor: item.bg, borderRadius: '12px', padding: '16px 20px', border: `1px solid ${item.border}` }}>
            <div style={{ fontSize: '13px', color: theme.textSecondary, fontWeight: '500' }}>{item.label}</div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: item.color, marginTop: '4px', lineHeight: 1 }}>
              {loading ? '—' : item.count}
            </div>
          </div>
        ))}
      </div>

      {/* Methodology note */}
      <div style={{ backgroundColor: theme.accentBg, border: `1px solid ${theme.accentBorder}`, borderRadius: '10px', padding: '12px 16px', fontSize: '12px', color: theme.accentText, lineHeight: 1.6 }}>
        <b>How health is measured:</b> Status is derived from the <b>Data Availability Rate (DAR)</b> — the ratio of observed readings to the 288 readings expected per sensor per 24 hours (one per 5-minute Yggio update cycle).
        DAR ≥ {settings.darOperationalMin} % → <b>Operational</b> · DAR {settings.darWarningMin}–{settings.darOperationalMin} % → <b>Degraded</b> · DAR &lt; {settings.darWarningMin} % or no data → <b>Poor</b>.
        Thresholds are configurable in <b>Settings → Dashboard</b>. The <b>Max Gap</b> column shows the longest consecutive silence in the last 24 h.
      </div>

      {/* Table */}
      <div style={{ backgroundColor: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: theme.textPrimary, margin: 0 }}>{t.sensorHealth.tableTitle}</h2>
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: theme.textSecondary, fontSize: '14px' }}>{t.sensorHealth.loading}</div>
        ) : error ? (
          <div style={{ padding: '20px', color: '#EF4444', fontSize: '14px' }}>Error: {error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: theme.tableHeadBg }}>
                  {[
                    { key: 'id',       label: t.sensorHealth.colSensorId },
                    { key: 'loc',      label: t.sensorHealth.colLocation },
                    { key: 'avail',    label: t.sensorHealth.colAvailability, hint: t.sensorHealth.availabilityHint },
                    { key: 'readings', label: t.sensorHealth.colReadings },
                    { key: 'gap',      label: t.sensorHealth.colMaxGap, hint: t.sensorHealth.maxGapHint },
                    { key: 'status',   label: t.sensorHealth.colStatus },
                    { key: 'seen',     label: t.sensorHealth.colLastSeen },
                  ].map((col) => (
                    <th key={col.key} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: '600', color: theme.textSecondary, fontSize: '12px', borderBottom: `1px solid ${theme.border}`, whiteSpace: 'nowrap' }}>
                      {col.hint ? (
                        <Tooltip text={col.hint}>{col.label}</Tooltip>
                      ) : col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sensors.map((sensor) => (
                  <tr key={sensor.sensor_id} style={{ borderBottom: `1px solid ${theme.borderLight}` }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', backgroundColor: theme.badgeBg, color: theme.badgeColor, padding: '2px 6px', borderRadius: '4px' }}>
                        {sensor.sensor_id}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: theme.textSecondary }}>
                      {getSensorDisplayName(sensor.sensor_id, sensor.description)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <AvailabilityBar pct={sensor.availability_pct} />
                    </td>
                    <td style={{ padding: '12px 16px', color: theme.textSecondary, fontSize: '12px' }}>
                      {sensor.readings_24h.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <MaxGapCell minutes={sensor.max_gap_minutes} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={sensor.status} t={t} />
                    </td>
                    <td style={{ padding: '12px 16px', color: theme.textSecondary, whiteSpace: 'nowrap', fontSize: '12px' }}>
                      {sensor.last_seen ? new Date(sensor.last_seen).toLocaleString('sv-SE') : t.sensorHealth.never}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
