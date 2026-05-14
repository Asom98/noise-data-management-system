import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/roles';

export default function Login({ expectedRole, onLogin }) {
  const { login, logout, setShowLanding } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const expectedLabel = ROLES[expectedRole]?.label ?? expectedRole;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(username, password);
      // Admin can enter through any card; everyone else must match the selected card.
      if (user.role !== 'admin' && expectedRole && user.role !== expectedRole) {
        await logout();
        setError(`This login is for ${expectedLabel} accounts only. Your account does not have that role.`);
        return;
      }
      onLogin(user);
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        .login-root {
          min-height: 100vh;
          width: 100%;
          background: linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 50%, #F0FDF4 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          box-sizing: border-box;
        }
        .login-card {
          background: white;
          border-radius: 20px;
          padding: 44px 48px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.10);
          width: 100%;
          max-width: 420px;
        }
        @media (max-width: 480px) {
          .login-card { padding: 32px 24px; }
        }
      `}</style>
      <div className="login-root">
      <div className="login-card">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '36px' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#2563EB', borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(37,99,235,0.35)', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '18px', color: '#0F172A', letterSpacing: '-0.3px' }}>Malmö Noise</div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>Monitoring System</div>
          </div>
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.3px' }}>Sign in</h2>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
          {expectedLabel ? <>Signing in as <b style={{ color: '#0F172A' }}>{expectedLabel}</b></> : 'Enter your credentials to continue'}
        </p>

        <button
          type="button"
          onClick={() => setShowLanding(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', fontSize: '13px', color: '#6B7280', cursor: 'pointer', padding: 0, marginBottom: '16px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to role selection
        </button>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '14px', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #D1D5DB', fontSize: '14px', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#DC2626' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '13px', borderRadius: '12px', backgroundColor: '#2563EB', color: 'white', border: 'none', fontSize: '15px', fontWeight: '700', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '4px', boxShadow: '0 4px 14px rgba(37,99,235,0.4)', letterSpacing: '0.01em' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
      </div>
    </>
  );
}
