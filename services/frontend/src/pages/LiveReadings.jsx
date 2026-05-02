import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE, getNoiseColor, getNoiseBg, getNoiseLevelLabel, getSensorDisplayName } from '../utils/noise';
import { useLanguage } from '../context/LanguageContext';
import { useSettings, useTheme } from '../context/SettingsContext';

function SensorCard({ sensor_id, description, value_db, prev_db, ts, t, thresholds }) {
  const theme = useTheme();
  const displayName = getSensorDisplayName(sensor_id, description);
  const color = value_db != null ? getNoiseColor(value_db, thresholds) : theme.textMuted;
  const bg    = value_db != null ? getNoiseBg(value_db, thresholds)    : theme.tableHeadBg;
  const delta = value_db != null && prev_db != null ? (value_db - prev_db).toFixed(1) : null;

  return (
    <div style={{ backgroundColor: theme.cardBg, borderRadius: '12px', padding: '16px 20px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: theme.badgeColor, backgroundColor: theme.badgeBg, padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
          {sensor_id}
        </span>
        {ts && <span style={{ fontSize: '11px', color: theme.textMuted }}>{new Date(ts).toLocaleTimeString('sv-SE')}</span>}
      </div>
      <div style={{ fontSize: '13px', color: theme.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {displayName}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '36px', fontWeight: '700', color, lineHeight: 1 }}>
          {value_db != null ? value_db.toFixed(1) : '—'}
        </span>
        <span style={{ fontSize: '14px', color: theme.textSecondary }}>dB</span>
        {delta !== null && (
          <span style={{ fontSize: '20px', fontWeight: '600', color: parseFloat(delta) > 0 ? '#EF4444' : parseFloat(delta) < 0 ? '#10B981' : theme.textSecondary, display: 'flex', alignItems: 'center', gap: '2px' }}>
            {parseFloat(delta) > 0 ? '↑' : parseFloat(delta) < 0 ? '↓' : '→'}
            <span style={{ fontSize: '13px', fontWeight: '500' }}>{Math.abs(parseFloat(delta))}</span>
          </span>
        )}
      </div>
      {value_db != null && (
        <div style={{ display: 'inline-block', fontSize: '11px', fontWeight: '600', color, backgroundColor: bg, padding: '3px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>
          {getNoiseLevelLabel(value_db, thresholds, t)}
        </div>
      )}
    </div>
  );
}

export default function LiveReadings() {
  const { t } = useLanguage();
  const { settings, addToast } = useSettings();
  const theme = useTheme();
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const prevRef = useRef({});
  const alreadyToastedRef = useRef(new Set());

  const thresholds = { highThreshold: settings.highThreshold, criticalThreshold: settings.criticalThreshold };

  // Ticking clock
  useEffect(() => {
    function tick() { setCurrentTime(new Date().toLocaleTimeString('sv-SE')); }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function fetchData() {
    try {
      const [latestRes, sensorsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/measurements/latest`),
        axios.get(`${API_BASE}/api/sensors`),
      ]);
      const sensorsMap = {};
      sensorsRes.data.forEach(s => { sensorsMap[s.sensor_id] = s; });

      const newReadings = latestRes.data.map(m => ({
        ...m,
        description: m.description || sensorsMap[m.sensor_id]?.description,
        prev_db: prevRef.current[m.sensor_id],
      }));

      // Fire toast for any sensor newly above criticalThreshold
      if (settings.criticalAlerts) {
        newReadings.forEach(m => {
          if (m.value_db != null && m.value_db >= settings.criticalThreshold) {
            const key = `${m.sensor_id}-${m.ts}`;
            if (!alreadyToastedRef.current.has(key)) {
              alreadyToastedRef.current.add(key);
              const name = getSensorDisplayName(m.sensor_id, m.description);
              addToast(`${name} reported ${m.value_db.toFixed(1)} dB — above critical threshold (${settings.criticalThreshold} dB)`, 'critical');
              // Keep the set from growing unboundedly
              if (alreadyToastedRef.current.size > 200) alreadyToastedRef.current.clear();
            }
          }
        });
      }

      const newPrevMap = {};
      latestRes.data.forEach(m => { newPrevMap[m.sensor_id] = m.value_db; });
      prevRef.current = newPrevMap;
      setReadings(newReadings);
    } catch (e) {
      console.error('Live readings fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  // Re-create interval whenever liveRefreshInterval setting changes
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, settings.liveRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [settings.liveRefreshInterval, settings.criticalThreshold, settings.criticalAlerts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: theme.textPrimary, margin: 0 }}>{t.liveReadings.title}</h1>
            <span style={{ fontSize: '18px', fontWeight: '600', color: theme.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{currentTime}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '13px', color: theme.textSecondary }}>
              {t.liveReadings.liveIndicator.replace('10', settings.liveRefreshInterval)}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: theme.textSecondary, fontSize: '14px', padding: '40px 0', textAlign: 'center' }}>{t.liveReadings.loading}</div>
      ) : readings.length === 0 ? (
        <div style={{ color: theme.textSecondary, fontSize: '14px', padding: '40px 0', textAlign: 'center' }}>{t.liveReadings.noData}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          {readings.map(r => <SensorCard key={r.sensor_id} {...r} t={t} thresholds={thresholds} />)}
        </div>
      )}

      {/* Evaluation guidelines — reflect current threshold settings */}
      <div style={{ backgroundColor: theme.cardBg, borderRadius: '12px', padding: '20px 24px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: theme.textPrimary, margin: '0 0 16px 0' }}>{t.liveReadings.guidelines}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: t.liveReadings.levelNormal,   range: `< ${settings.highThreshold - 10} dB`,                                              color: '#10B981', bg: theme.tintGreen,  desc: t.liveReadings.descNormal },
            { label: t.liveReadings.levelModerate, range: `${settings.highThreshold - 10}–${settings.highThreshold} dB`,                      color: '#F59E0B', bg: theme.tintAmber,  desc: t.liveReadings.descModerate },
            { label: t.liveReadings.levelHigh,     range: `${settings.highThreshold}–${settings.criticalThreshold} dB`,                       color: '#F97316', bg: theme.tintOrange, desc: t.liveReadings.descHigh },
            { label: t.liveReadings.levelCritical, range: `${settings.criticalThreshold}+ dB`,                                                color: '#EF4444', bg: theme.tintRed,    desc: t.liveReadings.descCritical },
          ].map(g => (
            <div key={g.label} style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: g.bg, border: `1px solid ${g.color}33` }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: g.color }}>{g.label}</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: g.color, margin: '2px 0' }}>{g.range}</div>
              <div style={{ fontSize: '12px', color: theme.textSecondary }}>{g.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
