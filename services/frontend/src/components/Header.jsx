import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/noise';
import { useLanguage } from '../context/LanguageContext';

export default function Header() {
  const { t, lang, toggleLanguage } = useLanguage();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage() {
    const text = query.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setQuery('');
    setOpen(true);
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/api/chat`, { messages: next });
      setMessages([...next, { role: 'assistant', content: res.data.response }]);
    } catch (e) {
      const errText = e.response?.data?.detail || e.message;
      setMessages([...next, { role: 'assistant', content: `Error: ${errText}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

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

      {/* Center: AI Search + Chat Panel */}
      <div ref={panelRef} style={{ flex: 1, maxWidth: '560px', position: 'relative' }}>
        {/* Input bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          border: '2px solid #2563EB',
          borderRadius: open && messages.length > 0 ? '10px 10px 0 0' : '10px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
        }}>
          <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', color: '#2563EB', fontSize: '16px', flexShrink: 0 }}>
            ✨
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            onFocus={() => messages.length > 0 && setOpen(true)}
            placeholder={t.header.searchPlaceholder}
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
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setOpen(false); }}
              title="Clear chat"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', color: '#9CA3AF', fontSize: '16px', lineHeight: 1 }}
            >
              ×
            </button>
          )}
          <button
            onClick={sendMessage}
            disabled={loading || !query.trim()}
            style={{
              backgroundColor: loading || !query.trim() ? '#93C5FD' : '#2563EB',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: loading || !query.trim() ? 'default' : 'pointer',
              flexShrink: 0,
            }}
          >
            {loading ? '...' : t.header.ask}
          </button>
        </div>

        {/* Chat panel dropdown */}
        {open && messages.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            border: '2px solid #2563EB',
            borderTop: '1px solid #E5E7EB',
            borderRadius: '0 0 12px 12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            maxHeight: '420px',
            overflowY: 'auto',
            zIndex: 200,
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '88%',
                  padding: '8px 12px',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  backgroundColor: msg.role === 'user' ? '#2563EB' : '#F3F4F6',
                  color: msg.role === 'user' ? '#ffffff' : '#111827',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '8px 14px',
                  borderRadius: '12px 12px 12px 2px',
                  backgroundColor: '#F3F4F6',
                  fontSize: '18px',
                  letterSpacing: '2px',
                  color: '#6B7280',
                }}>
                  ···
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Right: Language toggle + Bell + User */}
      <div style={{
        width: '180px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '16px',
      }}>
        {/* Language toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          overflow: 'hidden',
          fontSize: '12px',
          fontWeight: '600',
        }}>
          {['sv', 'en'].map((l) => (
            <button
              key={l}
              onClick={() => lang !== l && toggleLanguage()}
              style={{
                padding: '5px 10px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: lang === l ? '#2563EB' : 'white',
                color: lang === l ? 'white' : '#6B7280',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

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
            <div style={{ fontSize: '11px', color: '#6B7280', lineHeight: '1.2' }}>{t.header.admin}</div>
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
