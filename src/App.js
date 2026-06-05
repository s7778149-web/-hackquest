import { useState } from 'react';
import Dashboard from './Dashboard';
import Register from './Register';

function App() {
  const [page, setPage] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('All fields required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('name', data.name);
        localStorage.setItem('role', data.role);
        setPage('dashboard');
      } else {
        setError(data.detail || 'Login failed!');
      }
    } catch {
      setError('Cannot connect to server! Is backend running?');
    }
    setLoading(false);
  };

  if (page === 'dashboard') return <Dashboard onLogout={() => { localStorage.clear(); setPage('login'); }} />;
  if (page === 'register') return <Register onSwitch={() => setPage('login')} />;

  return (
    <div className="bg-grid" style={{ minHeight:'100vh', background:'#050508', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>

      {/* Glow blobs */}
      <div style={{ position:'absolute', top:'15%', left:'8%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(249,199,79,0.05) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'15%', right:'8%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,0,85,0.04) 0%, transparent 70%)', pointerEvents:'none' }} />

      {/* Scanline */}
      <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.015) 2px, rgba(0,0,0,0.015) 4px)', pointerEvents:'none', zIndex:0 }} />

      {/* Card */}
      <div className="animate-fadeIn" style={{ width:'100%', maxWidth:440, background:'#0a0a0f', border:'1px solid rgba(249,199,79,0.15)', borderRadius:14, padding:44, position:'relative', zIndex:1, boxShadow:'0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(249,199,79,0.05)' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ fontSize:52, marginBottom:10, filter:'drop-shadow(0 0 20px #f9c74f)' }}>🍯</div>
          <div className="font-title glow-gold" style={{ fontSize:28, fontWeight:900, color:'#f9c74f', letterSpacing:6 }}>HONEYTRAP</div>
          <div style={{ fontSize:28, fontWeight:900, color:'#f9c74f', letterSpacing:6, fontFamily:"'Orbitron', monospace", textShadow:'0 0 20px #f9c74f88' }}>HONEYTRAP</div>
          <div className="badge badge-green animate-pulse" style={{ marginTop:12 }}>
            <span className="live-dot" style={{ width:6, height:6 }} />
            SYSTEM ONLINE
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="animate-slideDown" style={{ background:'#ff005511', border:'1px solid #ff005533', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#ff0055', marginBottom:18, fontFamily:'Rajdhani, monospace', fontWeight:600 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin}>

          {/* Email */}
          <div style={{ marginBottom:18 }}>
            <label className="label">Operator Email</label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:15, opacity:0.5 }}>👤</span>
              <input
                className="input"
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@honeytrap.ai"
                style={{ paddingLeft:40 }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom:28 }}>
            <label className="label">Access Key</label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:15, opacity:0.5 }}>🔑</span>
              <input
                className="input"
                type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingLeft:40, paddingRight:44 }}
              />
              <span onClick={() => setShowPass(!showPass)} style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', cursor:'pointer', opacity:0.5, fontSize:15 }}>
                {showPass ? '🙈' : '👁️'}
              </span>
            </div>
          </div>

          {/* Button */}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width:'100%', padding:14, fontSize:14, letterSpacing:3 }}>
            {loading
              ? <span className="animate-pulse" style={{ color:'#050508' }}>⏳ AUTHENTICATING...</span>
              : '🔐  ENTER SYSTEM'
            }
          </button>

        </form>

        {/* Switch */}
        <div style={{ marginTop:24, textAlign:'center', fontSize:12, color:'#555', fontFamily:'Rajdhani, monospace' }}>
          New operator?{' '}
          <span onClick={() => setPage('register')} style={{ color:'#f9c74f', cursor:'pointer', fontWeight:600 }}>
            CREATE ACCOUNT →
          </span>
        </div>

        {/* Footer */}
        <div style={{ marginTop:20, paddingTop:18, borderTop:'1px solid #ffffff08', display:'flex', justifyContent:'space-between', fontSize:10, color:'#333', fontFamily:'Rajdhani, monospace', letterSpacing:1 }}>
          <span>v1.0.0 BETA</span>
          <span style={{ color:'#ff005566' }}>⚠️ AUTHORIZED ACCESS ONLY</span>
        </div>

      </div>
    </div>
  );
}

export default App;
