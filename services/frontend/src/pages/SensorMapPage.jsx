import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Circle, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE, getNoiseColor, getSensorDisplayName } from '../utils/noise';

function MapCoordDisplay() {
  const [coords, setCoords] = useState(null);
  useMapEvents({
    mousemove(e) {
      setCoords(e.latlng);
    },
  });
  if (!coords) return null;
  return (
    <div style={{
      position: 'absolute',
      bottom: '12px',
      left: '12px',
      zIndex: 1000,
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderRadius: '6px',
      padding: '4px 8px',
      fontSize: '11px',
      color: '#374151',
      border: '1px solid #E5E7EB',
    }}>
      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
    </div>
  );
}

function getLegendColor(db) {
  if (db > 75) return '#EF4444';
  if (db >= 65) return '#F97316';
  return '#10B981';
}

export default function SensorMapPage() {
  const [sensors, setSensors] = useState([]);
  const [latest, setLatest] = useState({});
  const [selected, setSelected] = useState(null);
  const [showHeatZones, setShowHeatZones] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sensorsRes, latestRes] = await Promise.all([
          axios.get(`${API_BASE}/api/sensors`),
          axios.get(`${API_BASE}/api/measurements/latest`),
        ]);
        const latestMap = {};
        latestRes.data.forEach((m) => {
          latestMap[m.sensor_id] = m;
        });
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
    ? [
        sensors.reduce((s, x) => s + x.lat, 0) / sensors.length,
        sensors.reduce((s, x) => s + x.lon, 0) / sensors.length,
      ]
    : [55.6050, 13.0038]; // Malmö default

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 112px)' }}>
      {/* Page title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>Sensor Map</h1>
          <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Live sensor locations and noise levels</p>
        </div>
        <button
          onClick={() => setShowHeatZones((v) => !v)}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            backgroundColor: showHeatZones ? '#EFF6FF' : 'white',
            color: showHeatZones ? '#2563EB' : '#374151',
            border: showHeatZones ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
            cursor: 'pointer',
          }}
        >
          {showHeatZones ? 'Hide Heat Zones' : 'Show Heat Zones'}
        </button>
      </div>

      {/* Main content: map + right panel */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Map */}
        <div style={{
          flex: 1,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #E5E7EB',
          position: 'relative',
          minHeight: '400px',
        }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280', backgroundColor: '#F9FAFB' }}>
              Loading map data...
            </div>
          ) : (
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <MapCoordDisplay />
              {sensors.map((sensor) => {
                const m = latest[sensor.sensor_id];
                const db = m ? m.value_db : null;
                const color = db != null ? getNoiseColor(db) : '#9CA3AF';
                const displayName = getSensorDisplayName(sensor.sensor_id, sensor.description);
                return (
                  <React.Fragment key={sensor.sensor_id}>
                    {showHeatZones && db != null && (
                      <Circle
                        center={[sensor.lat, sensor.lon]}
                        radius={400}
                        pathOptions={{
                          color: color,
                          fillColor: color,
                          fillOpacity: 0.15,
                          weight: 0,
                        }}
                      />
                    )}
                    <CircleMarker
                      center={[sensor.lat, sensor.lon]}
                      radius={10}
                      pathOptions={{
                        color: 'white',
                        weight: 2,
                        fillColor: color,
                        fillOpacity: 0.9,
                      }}
                      eventHandlers={{
                        click: () => setSelected({ sensor, measurement: m }),
                      }}
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

        {/* Right panel */}
        <div style={{
          width: '300px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {/* Sensor details or placeholder */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E5E7EB',
            flex: 1,
          }}>
            {selected ? (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 12px 0' }}>
                  Sensor Details
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sensor ID</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginTop: '2px' }}>
                      {selected.sensor.sensor_id}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</div>
                    <div style={{ fontSize: '14px', color: '#111827', marginTop: '2px' }}>
                      {getSensorDisplayName(selected.sensor.sensor_id, selected.sensor.description)}
                    </div>
                  </div>
                  {selected.measurement && (
                    <>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Level</div>
                        <div style={{
                          fontSize: '28px',
                          fontWeight: '700',
                          color: getNoiseColor(selected.measurement.value_db),
                          marginTop: '2px',
                        }}>
                          {selected.measurement.value_db} dB
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Updated</div>
                        <div style={{ fontSize: '13px', color: '#111827', marginTop: '2px' }}>
                          {new Date(selected.measurement.ts).toLocaleTimeString()}
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coordinates</div>
                    <div style={{ fontSize: '12px', color: '#374151', marginTop: '2px', fontFamily: 'monospace' }}>
                      {selected.sensor.lat.toFixed(5)}, {selected.sensor.lon.toFixed(5)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    marginTop: '16px',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: 'white',
                    fontSize: '13px',
                    color: '#6B7280',
                    cursor: 'pointer',
                  }}
                >
                  Clear Selection
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px', color: '#6B7280', textAlign: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" style={{ marginBottom: '8px' }}>
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                  <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
                </svg>
                <p style={{ fontSize: '13px', margin: 0 }}>Click a sensor on the map to view details</p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid #E5E7EB',
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: '0 0 12px 0' }}>Noise Level Legend</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { color: '#10B981', bg: '#ECFDF5', label: 'Normal', range: '< 65 dB' },
                { color: '#F97316', bg: '#FFF7ED', label: 'Moderate', range: '65–75 dB' },
                { color: '#EF4444', bg: '#FEF2F2', label: 'High', range: '> 75 dB' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    backgroundColor: item.color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>{item.label}</span>
                  <span style={{
                    fontSize: '11px', color: item.color,
                    backgroundColor: item.bg, padding: '2px 6px', borderRadius: '4px',
                  }}>{item.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
