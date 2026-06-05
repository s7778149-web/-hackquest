 import { useState } from 'react';

function Settings({ onBack }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);

  // Profile settings
  const [name, setName] = useState(localStorage.getItem('name') || 'Admin User');
  const [email, setEmail] = useState(localStorage.getItem('email') || 'admin@honeytrap.ai');
  const [role] = useState(localStorage.getItem('role') || 'admin');

  // Security settings
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [twoFA, setTwoFA] = useState(false);

  // Notification settings
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [highThreatOnly, setHighThreatOnly] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [alertInterval, setAlertInterval] = useState('realtime');

  // Honeypot settings
  const [autoBlock, setAutoBlock] = useState(true);
  const [captureFiles, setCaptureFiles] = useState(true);
  const [maxSessions, setMaxSessions] = useState('100');
  const [retentionDays, setRetentionDays] = useState('30');

  const handleSave = () => {
    localStorage.setItem('name', name);
    localStorage.setItem('email', email);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const TABS = [
    { id: 'profile', label: '👤 Profile' },
    { id: 'security', label: '🔐 Security' },
    { id: 'notifications', label: '🔔 Alerts' },
    { id: 'honeypot', label: '🍯 Honeypot' },
    { id: 'system', label: '⚙️ System' },
  ];

  const Toggle = ({ value, onChange, label }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #ffffff07' }}>
      <span style={{ fontSize: 12, color: '#ccc' }}>{label}</span>
      <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, background: value ? '#f9c74f' : '#333', cursor: 'pointer', position: 'relative', transition: 'all 0.3s' }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: value ? '#050508' : '#666', transition: 'all 0.3s' }} />
      </div>
    </div>
  );

  const Input = ({ label, value, onChange, type = 'text', placeholder }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 10, color: '#888', display: 'block', marginBottom: 6, letterSpacing: 1 }}>{label}</label>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '11px 12px', background: '#050508', border: '1px solid #ffffff15', borderRadius: 6, color: '#f9c74f', fontSize: 13, fontFamily: 'Courier New, monospace', outline: 'none' }}
        onFocus={e => (e.target.style.borderColor = '#f9c74f66')}
        onBlur={e => (e.target.style.borderColor = '#ffffff15')}
      />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#050508', fontFamily: 'Courier New, monospace', color: '#c9d1d9' }}>

      {/* Success Banner */}
      {saved && (
        <div style={{ background: '#00ff9f22', borderBottom: '2px solid #00ff9f', padding: '8px 20px', fontSize: 11, color: '#00ff9f', textAlign: 'center' }}>
          ✅ Settings saved successfully!
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', borderBottom: '1px solid #ffffff0a' }}>
        <button onClick={onBack} style={{ background: '#ffffff0a', border: '1px solid #ffffff15', color: '#aaa', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'Courier New, monospace', fontSize: 11 }}>
          ← BACK
        </button>
        <div>
          <div style={{ fontSize: 16, color: '#f9c74f', fontWeight: 'bold' }}>⚙️ SETTINGS</div>
          <div style={{ fontSize: 9, color: '#555' }}>MANAGE YOUR HONEYTRAP AI PLATFORM</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', height: 'calc(100vh - 60px)' }}>

        {/* Sidebar Tabs */}
        <div style={{ borderRight: '1px solid #ffffff08', padding: '16px 0' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: activeTab === t.id ? '#f9c74f11' : 'transparent',
              border: 'none', borderLeft: activeTab === t.id ? '3px solid #f9c74f' : '3px solid transparent',
              color: activeTab === t.id ? '#f9c74f' : '#555',
              padding: '12px 20px', cursor: 'pointer',
              fontSize: 11, fontFamily: 'Courier New, monospace',
              transition: 'all 0.2s',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: 28, overflowY: 'auto', maxWidth: 600 }}>

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 20 }}>OPERATOR PROFILE</div>

              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, padding: 16, background: '#0a0a0f', border: '1px solid #f9c74f22', borderRadius: 10 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#f9c74f,#ff6b35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  👤
                </div>
                <div>
                  <div style={{ fontSize: 14, color: '#fff', fontWeight: 'bold' }}>{name}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{email}</div>
                  <div style={{ fontSize: 10, marginTop: 4, padding: '2px 8px', background: '#f9c74f22', border: '1px solid #f9c74f44', borderRadius: 4, color: '#f9c74f', display: 'inline-block' }}>
                    {role.toUpperCase()}
                  </div>
                </div>
              </div>

              <Input label="FULL NAME" value={name} onChange={setName} placeholder="Your name" />
              <Input label="EMAIL ADDRESS" value={email} onChange={setEmail} type="email" placeholder="your@email.com" />

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, color: '#888', display: 'block', marginBottom: 6, letterSpacing: 1 }}>ROLE</label>
                <div style={{ padding: '11px 12px', background: '#050508', border: '1px solid #ffffff15', borderRadius: 6, color: '#555', fontSize: 13 }}>
                  {role.toUpperCase()} — (Cannot be changed here)
                </div>
              </div>

              <button onClick={handleSave} style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg,#f9c74f,#ff6b35)', border: 'none', borderRadius: 6, color: '#050508', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Courier New, monospace' }}>
                💾 SAVE CHANGES
              </button>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 20 }}>SECURITY SETTINGS</div>

              <div style={{ background: '#0a0a0f', border: '1px solid #ffffff08', borderRadius: 8, padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#f9c74f', marginBottom: 16 }}>🔑 CHANGE PASSWORD</div>
                <Input label="CURRENT PASSWORD" value={currentPass} onChange={setCurrentPass} type="password" placeholder="••••••••" />
                <Input label="NEW PASSWORD" value={newPass} onChange={setNewPass} type="password" placeholder="••••••••" />
                <Input label="CONFIRM NEW PASSWORD" value={confirmPass} onChange={setConfirmPass} type="password" placeholder="••••••••" />
                {newPass && confirmPass && (
                  <div style={{ fontSize: 11, color: newPass === confirmPass ? '#00ff9f' : '#ff0055', marginBottom: 12 }}>
                    {newPass === confirmPass ? '✅ Passwords match' : '❌ Passwords do not match'}
                  </div>
                )}
                <button onClick={handleSave} style={{ width: '100%', padding: 12, background: '#f9c74f22', border: '1px solid #f9c74f44', borderRadius: 6, color: '#f9c74f', fontSize: 12, cursor: 'pointer', fontFamily: 'Courier New, monospace' }}>
                  UPDATE PASSWORD
                </button>
              </div>

              <div style={{ background: '#0a0a0f', border: '1px solid #ffffff08', borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 11, color: '#f9c74f', marginBottom: 8 }}>📱 TWO-FACTOR AUTHENTICATION</div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 16 }}>Adds an extra layer of security using Google Authenticator or Microsoft Authenticator.</div>
                <Toggle value={twoFA} onChange={setTwoFA} label="Enable Two-Factor Authentication (2FA)" />
                {twoFA && (
                  <div style={{ marginTop: 16, padding: 12, background: '#00ff9f11', border: '1px solid #00ff9f33', borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: '#00ff9f' }}>✅ 2FA Enabled — Connect real backend to activate QR code</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 20 }}>ALERT & NOTIFICATION SETTINGS</div>

              <div style={{ background: '#0a0a0f', border: '1px solid #ffffff08', borderRadius: 8, padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#f9c74f', marginBottom: 16 }}>🔔 ALERT PREFERENCES</div>
                <Toggle value={emailAlerts} onChange={setEmailAlerts} label="Email alerts for new attacks" />
                <Toggle value={highThreatOnly} onChange={setHighThreatOnly} label="Only alert for high threat (70+) attacks" />
                <Toggle value={soundAlerts} onChange={setSoundAlerts} label="Sound notifications" />
              </div>

              <div style={{ background: '#0a0a0f', border: '1px solid #ffffff08', borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 11, color: '#f9c74f', marginBottom: 16 }}>⏱️ ALERT FREQUENCY</div>
                {['realtime', 'every5min', 'hourly', 'daily'].map(opt => (
                  <div key={opt} onClick={() => setAlertInterval(opt)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #ffffff07', cursor: 'pointer' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${alertInterval === opt ? '#f9c74f' : '#333'}`, background: alertInterval === opt ? '#f9c74f' : 'transparent' }} />
                    <span style={{ fontSize: 12, color: alertInterval === opt ? '#f9c74f' : '#888' }}>
                      {opt === 'realtime' ? '⚡ Real-time (Recommended)' : opt === 'every5min' ? 'Every 5 minutes' : opt === 'hourly' ? 'Hourly digest' : 'Daily summary'}
                    </span>
                  </div>
                ))}
              </div>

              <button onClick={handleSave} style={{ width: '100%', marginTop: 20, padding: 12, background: 'linear-gradient(135deg,#f9c74f,#ff6b35)', border: 'none', borderRadius: 6, color: '#050508', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Courier New, monospace' }}>
                💾 SAVE SETTINGS
              </button>
            </div>
          )}

          {/* HONEYPOT TAB */}
          {activeTab === 'honeypot' && (
            <div>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 20 }}>HONEYPOT CONFIGURATION</div>

              <div style={{ background: '#0a0a0f', border: '1px solid #ffffff08', borderRadius: 8, padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#f9c74f', marginBottom: 16 }}>🍯 CAPTURE SETTINGS</div>
                <Toggle value={autoBlock} onChange={setAutoBlock} label="Auto-block IPs after attack detected" />
                <Toggle value={captureFiles} onChange={setCaptureFiles} label="Capture uploaded malware files" />
              </div>

              <div style={{ background: '#0a0a0f', border: '1px solid #ffffff08', borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 11, color: '#f9c74f', marginBottom: 16 }}>📊 LIMITS</div>
                <Input label="MAX SESSIONS PER DAY" value={maxSessions} onChange={setMaxSessions} placeholder="100" />
                <Input label="LOG RETENTION (DAYS)" value={retentionDays} onChange={setRetentionDays} placeholder="30" />
              </div>

              <button onClick={handleSave} style={{ width: '100%', marginTop: 20, padding: 12, background: 'linear-gradient(135deg,#f9c74f,#ff6b35)', border: 'none', borderRadius: 6, color: '#050508', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Courier New, monospace' }}>
                💾 SAVE SETTINGS
              </button>
            </div>
          )}

          {/* SYSTEM TAB */}
          {activeTab === 'system' && (
            <div>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: 1, marginBottom: 20 }}>SYSTEM INFORMATION</div>

              <div style={{ background: '#0a0a0f', border: '1px solid #ffffff08', borderRadius: 8, padding: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#f9c74f', marginBottom: 16 }}>📋 PLATFORM INFO</div>
                {[
                  ['Version', 'HoneyTrap AI v1.0.0'],
                  ['Frontend', 'React.js 18.x'],
                  ['Backend', 'FastAPI + Python 3.12'],
                  ['Database', 'PostgreSQL 16'],
                  ['Status', '● ONLINE'],
                  ['Uptime', '99.9%'],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #ffffff07' }}>
                    <span style={{ fontSize: 11, color: '#555' }}>{label}</span>
                    <span style={{ fontSize: 11, color: label === 'Status' ? '#00ff9f' : '#ccc' }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: '#ff005511', border: '1px solid #ff005533', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 11, color: '#ff0055', marginBottom: 8 }}>⚠️ DANGER ZONE</div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>These actions cannot be undone.</div>
                <button style={{ width: '100%', padding: 10, background: 'transparent', border: '1px solid #ff005544', borderRadius: 6, color: '#ff0055', fontSize: 11, cursor: 'pointer', fontFamily: 'Courier New, monospace', marginBottom: 8 }}>
                  🗑️ Clear All Attack Logs
                </button>
                <button style={{ width: '100%', padding: 10, background: 'transparent', border: '1px solid #ff005544', borderRadius: 6, color: '#ff0055', fontSize: 11, cursor: 'pointer', fontFamily: 'Courier New, monospace' }}>
                  💣 Reset All Honeypots
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Settings;
