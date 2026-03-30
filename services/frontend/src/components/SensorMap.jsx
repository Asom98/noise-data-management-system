import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';

// CRITICAL: Leaflet will break visually without its core CSS
import 'leaflet/dist/leaflet.css'; 

const SensorMap = () => {
  const [sensors, setSensors] = useState([]);

  useEffect(() => {
    // Asynchronously fetch the spatial data from your FastAPI microservice
    axios.get('http://localhost:8000/api/sensors')
      .then(response => {
        setSensors(response.data);
      })
      .catch(error => console.error("❌ Error fetching sensors:", error));
  }, []);

  // Approximate center coordinates for Malmö City
  const malmoCenter = [55.6025, 13.0038];

  return (
    <div style={{ height: '500px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
      <MapContainer center={malmoCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
        {/* Modern, high-contrast basemap for municipal dashboards */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {/* Map over your API data and plot the GPS coordinates */}
        {sensors.map((sensor) => (
          <Marker key={sensor.sensor_id} position={[sensor.lat, sensor.lon]}>
            <Popup>
              <strong>{sensor.sensor_id.replace('DN000', '')}</strong><br />
              <em>{sensor.description}</em>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default SensorMap;