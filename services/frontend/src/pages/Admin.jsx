import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/noise';
import { useTheme } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/roles';

export default function Admin() {
  const theme = useTheme();
  const { user: me } = useAuth();

  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Add user form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole]         = useState('citizen');
  const [addError, setAddError]       = useState('');
  const [addLoading, setAddLoading]   = useState(false);

  function load() {
    setLoading(true);
    axios.get(`${API_BASE}/api/users`)
      .then(r => { setUsers(r.data); setError(''); })
      .catch(e => setError(e.response?.data?.detail ?? 'Failed to load users'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setAddError(''); setAddLoading(true);
    try {
      await axios.post(`${API_BASE}/api/users`, { username: newUsername, password: newPassword, role: newRole });
      setNewUsername(''); setNewPassword(''); setNewRole('user');
      load();
    } catch (e) {
      setAddError(e.response?.data?.detail ?? 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRemove(username) {
    if (!window.confirm(`Remove user "${username}"?`)) return;
    try {
      await axios.delete(`${API_BASE}/api/users/${encodeURIComponent(username)}`);
      load();
    } catch (e) {
      alert(e.response?.data?.detail ?? 'Failed to remove user');
    }
  }

  const input = {
    padding: '8px 10px', borderRadius: '8px', border: `1.5px solid ${theme.border}`,
    fontSize: '13px', color: theme.textPrimary, backgroundColor: theme.inputBg, outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: theme.textPrimary, margin: 0 }}>User Management</h1>
        <p style={{ fontSize: '14px', color: theme.textSecondary, marginTop: '4px' }}>Add, view, and remove system users</p>
      </div>

      {/* Add user card */}
      <div style={{ backgroundColor: theme.cardBg, borderRadius: '12px', padding: '24px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: theme.textPrimary, margin: '0 0 16px' }}>Add new user</h2>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: theme.textSecondary }}>Username</label>
            <input value={newUsername} onChange={e => setNewUsername(e.target.value)} required style={input} placeholder="username" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: theme.textSecondary }}>Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={input} placeholder="••••••••" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: theme.textSecondary }}>Role</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
              {Object.entries(ROLES).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={addLoading} style={{ padding: '8px 20px', borderRadius: '8px', backgroundColor: theme.accent, color: 'white', border: 'none', fontSize: '13px', fontWeight: '600', cursor: addLoading ? 'default' : 'pointer', opacity: addLoading ? 0.7 : 1 }}>
            {addLoading ? 'Adding…' : 'Add user'}
          </button>
        </form>
        {addError && <div style={{ marginTop: '10px', fontSize: '13px', color: '#DC2626' }}>{addError}</div>}
      </div>

      {/* Users table */}
      <div style={{ backgroundColor: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: theme.textPrimary, margin: 0 }}>
            Users <span style={{ fontSize: '13px', fontWeight: '400', color: theme.textSecondary }}>({users.length})</span>
          </h2>
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: theme.textSecondary }}>Loading…</div>
        ) : error ? (
          <div style={{ padding: '20px', color: '#DC2626' }}>{error}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: theme.tableHeadBg }}>
                {['Username', 'Role', 'Created', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: '600', color: theme.textSecondary, fontSize: '12px', borderBottom: `1px solid ${theme.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.username} style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: i % 2 === 1 ? theme.tableAltBg : theme.cardBg }}>
                  <td style={{ padding: '12px 16px', color: theme.textPrimary, fontWeight: u.username === me?.username ? '600' : '400' }}>
                    {u.username} {u.username === me?.username && <span style={{ fontSize: '11px', color: theme.textSecondary }}>(you)</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                      backgroundColor: u.role === 'admin' ? '#EFF6FF' : u.role === 'environmental_officer' ? '#F0FDF4' : u.role === 'it_staff' ? '#FFF7ED' : theme.tableHeadBg,
                      color: u.role === 'admin' ? '#2563EB' : u.role === 'environmental_officer' ? '#16A34A' : u.role === 'it_staff' ? '#EA580C' : theme.textSecondary }}>
                      {ROLES[u.role]?.label ?? u.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: theme.textSecondary, fontSize: '12px' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleString('sv-SE') : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {u.username !== me?.username && (
                      <button
                        onClick={() => handleRemove(u.username)}
                        style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
