import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE, getNoiseColor, getNoiseBg, getNoiseLevelLabel, getSensorDisplayName } from '../utils/noise';
import { useLanguage } from '../context/LanguageContext';

function SensorCard({ sensor_id, description, value_db, prev_db, ts }) {
  const displayName = getSensorDisplayName(sensor_id, description);
  const color = value_db != null ? getNoiseColor(value_db) : '#9CA3AF';
  const bg = value_db != null ? getNoiseBg(value_db) : '#F9FAFB';
  const delta = value_db != null && prev_db != null ? (value_db - prev_db).toFixed(1) : null;

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '16px 20px',
      border: '1px solid #E5E7EB',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: '11px', fontWeight: '600', color: '#2563EB',
          backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace',
        }}>
          {sensor_id}
        </span>
        {ts && <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(ts).toLocaleTimeString()}</span>}
      </div>
      <div style={{ fontSize: '13px', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {displayName}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '36px', fontWeight: '700', color, lineHeight: 1 }}>
          {value_db != null ? value_db.toFixed(1) : '—'}
        </span>
        <span style={{ fontSize: '14px', color: '#6B7280' }}>dB</span>
        {delta !== null && (
          <span style={{
            fontSize: '12px', fontWeight: '500',
            color: parseFloat(delta) > 0 ? '#EF4444' : parseFloat(delta) < 0 ? '#10B981' : '#6B7280',
            display: 'flex', alignItems: 'center', gap: '2px',
          }}>
            {parseFloat(delta) > 0 ? '↑' : parseFloat(delta) < 0 ? '↓' : '→'}
            {Math.abs(parseFloat(delta))}
          </span>
        )}
      </div>
      {value_db != null && (
        <div style={{
          display: 'inline-block', fontSize: '11px', fontWeight: '600',
          color, backgroundColor: bg, padding: '3px 8px', borderRadius: '4px', alignSelf: 'flex-start',
        }}>
          {getNoiseLevelLabel(value_db)}
        </div>
      )}
    </div>
  );
}

export default function LiveReadings() {
  const { t } = useLanguage();
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const prevRef = useRef({});

  async function fetchData() {
    try {
      const [latestRes, sensorsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/measurements/latest`),
        axios.get(`${API_BASE}/api/sensors`),
      ]);
      const sensorsMap = {};
      sensorsRes.data.forEach((s) => { sensorsMap[s.sensor_id] = s; });
      const newReadings = latestRes.data.map((m) => ({
        ...m,
        description: m.description || sensorsMap[m.sensor_id]?.description,
        prev_db: prevRef.current[m.sensor_id],
      }));
      const newPrevMap = {};
      latestRes.data.forEach((m) => { newPrevMap[m.sensor_id] = m.value_db; });
      prevRef.current = newPrevMap;
      setReadings(newReadings);
    } catch (e) {
      console.error('Live readings fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>{t.liveReadings.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: '#10B981', animation: 'pulse 2s infinite',
            }} />
            <span style={{ fontSize: '13px', color: '#6B7280' }}>{t.liveReadings.liveIndicator}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#6B7280', fontSize: '14px', padding: '40px 0', textAlign: 'center' }}>
          {t.liveReadings.loading}
        </div>
      ) : readings.length === 0 ? (
        <div style={{ color: '#6B7280', fontSize: '14px', padding: '40px 0', textAlign: 'center' }}>
          {t.liveReadings.noData}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          {readings.map((r) => <SensorCard key={r.sensor_id} {...r} />)}
        </div>
      )}

      <div style={{
        backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px',
        border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>{t.liveReadings.guidelines}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: t.liveReadings.levelNormal,   range: '< 60 dB',   color: '#10B981', bg: '#ECFDF5', desc: t.liveReadings.descNormal },
            { label: t.liveReadings.levelModerate, range: '60–70 dB',  color: '#F59E0B', bg: '#FFFBEB', desc: t.liveReadings.descModerate },
            { label: t.liveReadings.levelHigh,     range: '70–80 dB',  color: '#F97316', bg: '#FFF7ED', desc: t.liveReadings.descHigh },
            { label: t.liveReadings.levelCritical, range: '80+ dB',    color: '#EF4444', bg: '#FEF2F2', desc: t.liveReadings.descCritical },
          ].map((g) => (
            <div key={g.label} style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: g.bg, border: `1px solid ${g.color}33` }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: g.color }}>{g.label}</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: g.color, margin: '2px 0' }}>{g.range}</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>{g.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
