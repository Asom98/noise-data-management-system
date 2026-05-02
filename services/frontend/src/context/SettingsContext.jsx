import React, { createContext, useContext, useState, useCallback } from 'react';
import { loadSettings, saveSettings } from '../utils/noise';

// ─── Theme tokens ─────────────────────────────────────────────────────────────

export const LIGHT = {
  pageBg:        '#F3F4F6',
  cardBg:        '#ffffff',
  sidebarBg:     '#ffffff',
  headerBg:      '#ffffff',
  inputBg:       '#ffffff',
  border:        '#E5E7EB',
  borderLight:   '#F3F4F6',
  textPrimary:   '#111827',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',
  accent:        '#2563EB',
  accentBg:      '#EFF6FF',
  accentBorder:  '#BFDBFE',
  accentText:    '#1D4ED8',
  navActiveBg:   '#EFF6FF',
  navActiveColor:'#2563EB',
  navColor:      '#374151',
  tableHeadBg:   '#F9FAFB',
  tableAltBg:    '#F9FAFB',
  badgeBg:       '#EFF6FF',
  badgeColor:    '#2563EB',
  shadow:        '0 1px 3px rgba(0,0,0,0.08)',
  chartAxis:     '#6B7280',
  chartGrid:     '#F3F4F6',
  // Semantic tinted panels — status cards, alert banners, guideline boxes
  tintGreen:       '#ECFDF5',
  tintGreenBorder: '#A7F3D0',
  tintAmber:       '#FFFBEB',
  tintAmberBorder: '#FDE68A',
  tintOrange:      '#FFF7ED',
  tintRed:         '#FEF2F2',
  tintRedBorder:   '#FECACA',
};

export const DARK = {
  pageBg:        '#0F172A',
  cardBg:        '#1E293B',
  sidebarBg:     '#1E293B',
  headerBg:      '#1E293B',
  inputBg:       '#0F172A',
  border:        '#334155',
  borderLight:   '#263347',
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted:     '#64748B',
  accent:        '#60A5FA',
  accentBg:      '#172554',
  accentBorder:  '#1D4ED8',
  accentText:    '#93C5FD',
  navActiveBg:   '#172554',
  navActiveColor:'#60A5FA',
  navColor:      '#CBD5E1',
  tableHeadBg:   '#0F172A',
  tableAltBg:    '#162032',
  badgeBg:       '#172554',
  badgeColor:    '#60A5FA',
  shadow:        '0 1px 3px rgba(0,0,0,0.4)',
  chartAxis:     '#94A3B8',
  chartGrid:     '#334155',
  // Semantic tinted panels — dark mode versions
  tintGreen:       '#052E16',
  tintGreenBorder: '#065F46',
  tintAmber:       '#3B1F07',
  tintAmberBorder: '#78350F',
  tintOrange:      '#3B1507',
  tintRed:         '#3B0A0A',
  tintRedBorder:   '#7F1D1D',
};

// ─── Context ──────────────────────────────────────────────────────────────────

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => loadSettings());
  const [toasts, setToasts] = useState([]);

  function updateSettings(next) {
    setSettings(next);
    saveSettings(next);
  }

  const addToast = useCallback((message, type = 'critical') => {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts, { id, message, type }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 6000);
  }, []);

  function dismissToast(id) {
    setToasts(ts => ts.filter(t => t.id !== id));
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, toasts, addToast, dismissToast }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function useTheme() {
  const { settings } = useSettings();
  return settings.darkMode ? DARK : LIGHT;
}
