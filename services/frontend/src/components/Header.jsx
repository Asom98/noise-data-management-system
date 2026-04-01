import React, { useState } from 'react';

export default function Header() {
  const [query, setQuery] = useState('');

  return (
    <header style={{
      height: '64px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #E5E7EB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Left spacer */}
      <div style={{ width: '120px' }} />

      {/* Center: AI Search */}
      <div style={{
        flex: 1,
        maxWidth: '560px',
        display: 'flex',
        alignItems: 'center',
        border: '2px solid #2563EB',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
      }}>
        <div style={{
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          color: '#2563EB',
          fontSize: '16px',
          flexShrink: 0,
        }}>
          ✨
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask AI about sensor data, noise levels, or get insights..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '13px',
            color: '#111827',
            padding: '10px 4px',
            backgroundColor: 'transparent',
          }}
        />
        <button
          onClick={() => {}}
          style={{
            backgroundColor: '#2563EB',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Ask
        </button>
      </div>

      {/* Right: Bell + User */}
      <div style={{
        width: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '16px',
      }}>
        {/* Bell with red dot */}
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <div style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '8px',
            height: '8px',
            backgroundColor: '#EF4444',
            borderRadius: '50%',
            border: '1.5px solid white',
          }} />
        </div>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', lineHeight: '1.2' }}>John Doe</div>
            <div style={{ fontSize: '11px', color: '#6B7280', lineHeight: '1.2' }}>Admin</div>
          </div>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}
