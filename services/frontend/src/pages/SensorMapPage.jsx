import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Circle, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE, getNoiseColor, getSensorDisplayName } from '../utils/noise';
import { useLanguage } from '../context/LanguageContext';
import { useTheme, useSettings } from '../context/SettingsContext';

// Captures mouse coords from Leaflet events — renders nothing itself
function MapEventCapture({ onMove }) {
  useMapEvents({ mousemove(e) { onMove(e.latlng); } });
  return null;
}

export default function SensorMapPage() {
  const { t } = useLanguage();
  const theme = useTheme();
  const { settings } = useSettings();
  const [sensors, setSensors]       = useState([]);
  const [latest, setLatest]         = useState({});
  const [selected, setSelected]     = useState(null);
  const [showHeatZones, setShowHeatZones] = useState(true);
  const [loading, setLoading]       = useState(true);
  const [coords, setCoords]         = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sensorsRes, latestRes] = await Promise.all([
          axios.get(`${API_BASE}/api/sensors`),
          axios.get(`${API_BASE}/api/measurements/latest`),
        ]);
        const latestMap = {};
        latestRes.data.forEach((m) => { latestMap[m.sensor_id] = m; });
        setSensors(sensorsRes.data);
        setLatest(latestMap);
      } catch (e) {
        console.error('Map data fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const center = sensors.length > 0
    ? [sensors.reduce((s, x) => s + x.lat, 0) / sensors.length, sensors.reduce((s, x) => s + x.lon, 0) / sensors.length]
    : [55.6050, 13.0038];

  const mapFilter = settings.darkMode
    ? 'invert(92%) hue-rotate(180deg) brightness(0.85) contrast(1.05)'
    : 'none';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 112px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: theme.textPrimary, margin: 0 }}>{t.sensorMap.title}</h1>
          <p style={{ fontSize: '14px', color: theme.textSecondary, marginTop: '4px' }}>{t.sensorMap.subtitle}</p>
        </div>
        <button
          onClick={() => setShowHeatZones((v) => !v)}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            backgroundColor: showHeatZones ? theme.accentBg : theme.cardBg,
            color: showHeatZones ? theme.accent : theme.textSecondary,
            border: showHeatZones ? `1px solid ${theme.accentBorder}` : `1px solid ${theme.border}`,
            cursor: 'pointer',
          }}
        >
          {showHeatZones ? t.sensorMap.hideHeatZones : t.sensorMap.showHeatZones}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Map — wrapper is position:relative so coord overlay can sit outside the filter */}
        <div style={{ flex: 1, position: 'relative', minHeight: '400px' }}>
          <div
            style={{
              height: '100%',
              borderRadius: '12px',
              overflow: 'hidden',
              border: `1px solid ${theme.border}`,
              filter: mapFilter,
            }}
          >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: theme.textSecondary, backgroundColor: theme.tableHeadBg }}>{t.sensorMap.loading}</div>
          ) : (
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
              <MapEventCapture onMove={setCoords} />
              {sensors.map((sensor) => {
                const m = latest[sensor.sensor_id];
                const db = m ? m.value_db : null;
                const color = db != null ? getNoiseColor(db) : '#9CA3AF';
                const displayName = getSensorDisplayName(sensor.sensor_id, sensor.description);
                return (
                  <React.Fragment key={sensor.sensor_id}>
                    {showHeatZones && db != null && (
                      <Circle center={[sensor.lat, sensor.lon]} radius={400} pathOptions={{ color, fillColor: color, fillOpacity: 0.15, weight: 0 }} />
                    )}
                    <CircleMarker
                      center={[sensor.lat, sensor.lon]}
                      radius={10}
                      pathOptions={{ color: 'white', weight: 2, fillColor: color, fillOpacity: 0.9 }}
                      eventHandlers={{ click: () => setSelected({ sensor, measurement: m }) }}
                    >
                      <Tooltip permanent={false} direction="top" offset={[0, -8]}>
                        <div style={{ fontSize: '12px', fontWeight: '600' }}>
                          {displayName}
                          {db != null && <span style={{ color }}> {db} dB</span>}
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  </React.Fragment>
                );
              })}
            </MapContainer>
          )}
          </div>
          {/* Coordinate display — outside the filter div so dark mode doesn't invert it */}
          {coords && (
            <div style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 1000, backgroundColor: theme.cardBg, borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '12px', padding: '20px', border: `1px solid ${theme.border}`, flex: 1 }}>
            {selected ? (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: theme.textPrimary, margin: '0 0 12px 0' }}>{t.sensorMap.sensorDetails}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.sensorMap.sensorId}</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: theme.textPrimary, marginTop: '2px' }}>{selected.sensor.sensor_id}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.sensorMap.location}</div>
                    <div style={{ fontSize: '14px', color: theme.textPrimary, marginTop: '2px' }}>{getSensorDisplayName(selected.sensor.sensor_id, selected.sensor.description)}</div>
                  </div>
                  {selected.measurement && (
                    <>
                      <div>
                        <div style={{ fontSize: '11px', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.sensorMap.currentLevel}</div>
                        <div style={{ fontSize: '28px', fontWeight: '700', color: getNoiseColor(selected.measurement.value_db), marginTop: '2px' }}>{selected.measurement.value_db} dB</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.sensorMap.lastUpdated}</div>
                        <div style={{ fontSize: '13px', color: theme.textPrimary, marginTop: '2px' }}>{new Date(selected.measurement.ts).toLocaleTimeString('sv-SE')}</div>
                      </div>
                    </>
                  )}
                  <div>
                    <div style={{ fontSize: '11px', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.sensorMap.coordinates}</div>
                    <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '2px', fontFamily: 'monospace' }}>{selected.sensor.lat.toFixed(5)}, {selected.sensor.lon.toFixed(5)}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{ marginTop: '16px', width: '100%', padding: '8px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.cardBg, fontSize: '13px', color: theme.textSecondary, cursor: 'pointer' }}
                >
                  {t.sensorMap.clearSelection}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px', color: theme.textSecondary, textAlign: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="1.5" style={{ marginBottom: '8px' }}>
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
                </svg>
                <p style={{ fontSize: '13px', margin: 0 }}>{t.sensorMap.clickPrompt}</p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ backgroundColor: theme.cardBg, borderRadius: '12px', padding: '16px 20px', border: `1px solid ${theme.border}` }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: theme.textPrimary, margin: '0 0 12px 0' }}>{t.sensorMap.legend}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { color: '#10B981', bg: theme.tintGreen,  label: t.sensorMap.legendNormal,   range: '< 70 dB' },
                { color: '#F59E0B', bg: theme.tintAmber,  label: t.sensorMap.legendModerate, range: '70–80 dB' },
                { color: '#F97316', bg: theme.tintOrange, label: t.sensorMap.legendHigh,     range: '80–90 dB' },
                { color: '#EF4444', bg: theme.tintRed,    label: t.sensorMap.legendCritical, range: '90+ dB' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: theme.textSecondary, flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: '11px', color: item.color, backgroundColor: item.bg, padding: '2px 6px', borderRadius: '4px' }}>{item.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
