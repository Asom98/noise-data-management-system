import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const CARDS = [
  {
    role: 'environmental_officer',
    title: 'Environmental Officer',
    subtitle: 'Full monitoring dashboard',
    description: 'Access noise alerts, live readings, sensor health reports and data exports.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 22a8 8 0 0 1 16 0"/><path d="M12 14a4 4 0 0 0-4 4"/><circle cx="12" cy="8" r="4"/>
        <path d="M22 22a6 6 0 0 0-6-6"/>
      </svg>
    ),
    accent: '#16A34A',
    accentLight: '#DCFCE7',
    accentBorder: '#BBF7D0',
    requiresLogin: true,
  },
  {
    role: 'it_staff',
    title: 'IT Staff',
    subtitle: 'Technical dashboard',
    description: 'Monitor sensor availability, database health and system diagnostics.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    accent: '#2563EB',
    accentLight: '#DBEAFE',
    accentBorder: '#BFDBFE',
    requiresLogin: true,
  },
  {
    role: 'citizen',
    title: 'Citizen',
    subtitle: 'Public view — no login needed',
    description: 'See current noise levels and sensor locations across Malmö.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
    accent: '#7C3AED',
    accentLight: '#EDE9FE',
    accentBorder: '#DDD6FE',
    requiresLogin: false,
  },
];

export default function LandingPage({ onNeedsLogin }) {
  const { loginAsGuest } = useAuth();
  const [loading, setLoading] = useState(null);
  const [hovered, setHovered] = useState(null);

  async function handleClick(card) {
    if (!card.requiresLogin) {
      setLoading(card.role);
      try { await loginAsGuest(); } finally { setLoading(null); }
    } else {
      onNeedsLogin(card.role);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 50%, #F0FDF4 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      boxSizing: 'border-box',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
        <div style={{
          width: '52px', height: '52px', backgroundColor: '#2563EB', borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: '800', fontSize: '22px', color: '#0F172A', lineHeight: 1.2, letterSpacing: '-0.3px' }}>Malmö Noise</div>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>Monitoring System</div>
        </div>
      </div>

      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: '48px', maxWidth: '480px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
          Welcome — who are you?
        </h1>
        <p style={{ fontSize: '16px', color: '#64748B', margin: 0, lineHeight: 1.6 }}>
          Select your role to enter the correct dashboard
        </p>
      </div>

      {/* Cards grid — auto-fit collapses to 1 column on small screens */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px',
        width: '100%',
        maxWidth: '860px',
      }}>
        {CARDS.map(card => {
          const isHovered = hovered === card.role;
          const isLoading = loading === card.role;
          return (
            <div
              key={card.role}
              onMouseEnter={() => setHovered(card.role)}
              onMouseLeave={() => setHovered(null)}
              style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '32px 28px',
                border: `2px solid ${isHovered ? card.accent : '#E2E8F0'}`,
                boxShadow: isHovered
                  ? `0 12px 40px rgba(0,0,0,0.12), 0 0 0 4px ${card.accentBorder}`
                  : '0 2px 16px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0px',
                transition: 'all 0.2s ease',
                transform: isHovered ? 'translateY(-4px)' : 'none',
                cursor: 'pointer',
              }}
              onClick={() => !isLoading && handleClick(card)}
            >
              {/* Icon */}
              <div style={{
                width: '60px', height: '60px', borderRadius: '16px',
                backgroundColor: card.accentLight,
                border: `1px solid ${card.accentBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: card.accent, marginBottom: '20px',
                transition: 'transform 0.2s',
                transform: isHovered ? 'scale(1.05)' : 'none',
              }}>
                {card.icon}
              </div>

              {/* Title */}
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '4px', letterSpacing: '-0.2px' }}>
                {card.title}
              </div>

              {/* Subtitle */}
              <div style={{ fontSize: '11px', fontWeight: '700', color: card.accent, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {card.subtitle}
              </div>

              {/* Description */}
              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.65, marginBottom: '28px', flex: 1 }}>
                {card.description}
              </div>

              {/* No-login badge */}
              {!card.requiresLogin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: card.accent, fontWeight: '600', marginBottom: '16px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  No login required
                </div>
              )}

              {/* Button */}
              <button
                onClick={e => { e.stopPropagation(); if (!isLoading) handleClick(card); }}
                disabled={isLoading}
                style={{
                  width: '100%', padding: '12px',
                  borderRadius: '12px', border: 'none',
                  cursor: isLoading ? 'default' : 'pointer',
                  backgroundColor: card.accent, color: 'white',
                  fontSize: '14px', fontWeight: '700',
                  letterSpacing: '0.01em',
                  opacity: isLoading ? 0.75 : 1,
                  transition: 'opacity 0.15s, transform 0.15s',
                  transform: isHovered && !isLoading ? 'scale(1.02)' : 'none',
                  boxShadow: `0 4px 14px ${card.accent}50`,
                }}
              >
                {isLoading ? 'Entering…' : card.requiresLogin ? 'Sign in' : 'Enter'}
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
