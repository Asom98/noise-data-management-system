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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '40px 48px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#2563EB', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#111827' }}>Malmö Noise</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>Monitoring System</div>
          </div>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Sign in</h2>
        <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 24px' }}>
          {expectedLabel ? `Signing in as ${expectedLabel}` : 'Enter your credentials to continue'}
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
            style={{ padding: '11px', borderRadius: '8px', backgroundColor: '#2563EB', color: 'white', border: 'none', fontSize: '14px', fontWeight: '600', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '4px' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
