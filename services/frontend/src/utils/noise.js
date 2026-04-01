export const SENSOR_COLORS = [
  '#2563EB',
  '#10B981',
  '#8B5CF6',
  '#F97316',
  '#EF4444',
  '#0891B2',
  '#D97706',
];

export function getNoiseLevel(db, thresholds) {
  const h = thresholds?.highThreshold ?? 70;
  const c = thresholds?.criticalThreshold ?? 80;
  if (db >= c) return 'critical';
  if (db >= h) return 'high';
  if (db >= h - 10) return 'moderate';
  return 'normal';
}

export function getNoiseLevelLabel(db, thresholds) {
  const h = thresholds?.highThreshold ?? 70;
  const c = thresholds?.criticalThreshold ?? 80;
  if (db >= c) return 'Critical';
  if (db >= h) return 'High';
  if (db >= h - 10) return 'Moderate';
  return 'Normal';
}

export function getNoiseColor(db, thresholds) {
  const h = thresholds?.highThreshold ?? 70;
  const c = thresholds?.criticalThreshold ?? 80;
  if (db >= c) return '#EF4444';
  if (db >= h) return '#F97316';
  if (db >= h - 10) return '#F59E0B';
  return '#10B981';
}

export function getNoiseBg(db, thresholds) {
  const h = thresholds?.highThreshold ?? 70;
  const c = thresholds?.criticalThreshold ?? 80;
  if (db >= c) return '#FEF2F2';
  if (db >= h) return '#FFF7ED';
  if (db >= h - 10) return '#FFFBEB';
  return '#ECFDF5';
}

// --- Settings (localStorage) ---
const SETTINGS_KEY = 'malmo_noise_settings';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function defaultSettings() {
  return {
    highThreshold: 70,
    criticalThreshold: 80,
    criticalAlerts: true,
    dailySummary: true,
    weeklyReport: true,
    maintenanceReminders: false,
  };
}

// --- CSV Export ---
export function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const v = row[h] ?? '';
        return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
      }).join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
