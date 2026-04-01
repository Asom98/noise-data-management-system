export const SENSOR_COLORS = [
  '#2563EB',
  '#10B981',
  '#8B5CF6',
  '#F97316',
  '#EF4444',
  '#0891B2',
  '#D97706',
];

export function getNoiseLevel(db) {
  if (db >= 80) return 'critical';
  if (db >= 70) return 'high';
  if (db >= 60) return 'moderate';
  return 'normal';
}

export function getNoiseLevelLabel(db) {
  if (db >= 80) return 'Critical';
  if (db >= 70) return 'High';
  if (db >= 60) return 'Moderate';
  return 'Normal';
}

export function getNoiseColor(db) {
  if (db >= 80) return '#EF4444';
  if (db >= 70) return '#F97316';
  if (db >= 60) return '#F59E0B';
  return '#10B981';
}

export function getNoiseBg(db) {
  if (db >= 80) return '#FEF2F2';
  if (db >= 70) return '#FFF7ED';
  if (db >= 60) return '#FFFBEB';
  return '#ECFDF5';
}

export function getSensorDisplayName(sensor_id, description) {
  if (description && description !== 'Real Malmö Yggio Sensor') {
    return description;
  }
  // Extract from sensor_id: strip DN000 prefix or use after last '-'
  return sensor_id
    .replace('DN000', 'DN')
    .replace('-Buller ', ' ')
    .substring(0, 20);
}

export const API_BASE = 'http://localhost:8000';
