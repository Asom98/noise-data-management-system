import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const CARDS = [
  {
    role: 'environmental_officer',
    title: 'Environmental Officer',
    subtitle: 'Full monitoring dashboard',
    description: 'Access noise alerts, live readings, sensor health reports and data exports.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 22a8 8 0 0 1 16 0"/><path d="M12 14a4 4 0 0 0-4 4"/><circle cx="12" cy="8" r="4"/>
        <path d="M22 22a6 6 0 0 0-6-6"/>
      </svg>
    ),
    accent: '#16A34A',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    requiresLogin: true,
  },
  {
    role: 'it_staff',
    title: 'IT Staff',
    subtitle: 'Technical dashboard',
    description: 'Monitor sensor availability, database health and system diagnostics.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    accent: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    requiresLogin: true,
  },
  {
    role: 'citizen',
    title: 'Citizen',
    subtitle: 'Public view',
    description: 'See current noise levels and sensor locations across Malmö.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
    accent: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    requiresLogin: false,
  },
];

export default function LandingPage({ onNeedsLogin }) {
  const { loginAsGuest } = useAuth();
  const [loading, setLoading] = useState(null);

  async function handleClick(card) {
    if (!card.requiresLogin) {
      setLoading(card.role);
      try { await loginAsGuest(); } finally { setLoading(null); }
    } else {
      onNeedsLogin();
    }
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#F3F4F6',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
        <div style={{ width: '44px', height: '44px', backgroundColor: '#2563EB', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: '800', fontSize: '20px', color: '#111827', lineHeight: 1.2 }}>Malmö Noise</div>
          <div style={{ fontSize: '13px', color: '#6B7280' }}>Monitoring System</div>
        </div>
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0 0 8px', textAlign: 'center' }}>
        Welcome — who are you?
      </h1>
      <p style={{ fontSize: '15px', color: '#6B7280', margin: '0 0 40px', textAlign: 'center' }}>
        Select your role to enter the right dashboard
      </p>

      {/* Cards */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '900px' }}>
        {CARDS.map(card => (
          <div
            key={card.role}
            style={{
              backgroundColor: 'white', borderRadius: '16px', padding: '32px 28px',
              border: '1.5px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
              flex: '1 1 240px', maxWidth: '280px',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px',
              transition: 'box-shadow 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.13)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '14px', backgroundColor: card.bg, border: `1px solid ${card.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.accent }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>{card.title}</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: card.accent, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.subtitle}</div>
              <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>{card.description}</div>
            </div>
            {!card.requiresLogin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: card.accent, fontWeight: '600' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                No login required
              </div>
            )}
            <button
              onClick={() => handleClick(card)}
              disabled={loading === card.role}
              style={{
                marginTop: 'auto', width: '100%', padding: '11px',
                borderRadius: '10px', border: 'none', cursor: loading === card.role ? 'default' : 'pointer',
                backgroundColor: card.accent, color: 'white',
                fontSize: '14px', fontWeight: '600',
                opacity: loading === card.role ? 0.7 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {loading === card.role ? 'Entering…' : card.requiresLogin ? 'Sign in' : 'Enter'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
