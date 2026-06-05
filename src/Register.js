import { useState } from 'react';

function Register({ onSwitch }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState('analyst');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirm) {
      setError('All fields are required!'); return;
    }
    if (password !== confirm) {
      setError('Passwords do not match!'); return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters!'); return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.detail || 'Registration failed!');
      }
    } catch (err) {
      setError('Cannot connect to server! Make sure backend is running.');
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div style={{ minHeight:'100vh', background:'#050508', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:'100%', maxWidth:420, background:'#0a0a0f', border:'1px solid #00ff9f33', borderRadius:12, padding:40, textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
          <div style={{ fontSize:20, color:'#00ff9f', fontWeight:'bold', marginBottom:8 }}>ACCOUNT CREATED!</div>
          <div style={{ fontSize:12, color:'#666', marginBottom:24 }}>Your operator account has been registered successfully.</div>
          <button onClick={onSwitch} style={{ width:'100%', padding:13, background:'linear-gradient(135deg, #f9c74f, #ff6b35)', border:'none', borderRadius:6, color:'#050508', fontSize:13, fontWeight:'bold', cursor:'pointer', fontFamily:'Courier New, monospace' }}>
            🔐 GO TO LOGIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'#050508', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>

      {/* Background grid */}
      <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(rgba(249,199,79,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(249,199,79,0.03) 1px, transparent 1px)`, backgroundSize:'40px 40px' }} />

      {/* Glow */}
      <div style={{ position:'absolute', top:'20%', right:'10%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(157,78,221,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />

      {/* Card */}
      <div style={{ width:'100%', maxWidth:440, background:'#0a0a0f', border:'1px solid #9d4edd33', borderRadius:12, padding:40, position:'relative', zIndex:1 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🍯</div>
          <div style={{ fontSize:22, fontWeight:'bold', color:'#f9c74f', letterSpacing:4 }}>HONEYTRAP</div>
          <div style={{ fontSize:10, color:'#444', letterSpacing:3, marginTop:4 }}>CREATE OPERATOR ACCOUNT</div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:'#ff005511', border:'1px solid #ff005544', borderRadius:6, padding:'10px 14px', fontSize:12, color:'#ff0055', marginBottom:16 }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleRegister}>

          {/* Name */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:10, color:'#888', display:'block', marginBottom:6, letterSpacing:2 }}>FULL NAME</label>
            <input
              type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Doe"
              style={{ width:'100%', padding:'11px 12px', background:'#050508', border:'1px solid #ffffff15', borderRadius:6, color:'#f9c74f', fontSize:13, fontFamily:'Courier New, monospace', outline:'none' }}
              onFocus={e => (e.target.style.borderColor='#f9c74f66')}
              onBlur={e => (e.target.style.borderColor='#ffffff15')}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:10, color:'#888', display:'block', marginBottom:6, letterSpacing:2 }}>EMAIL ADDRESS</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operator@honeytrap.ai"
              style={{ width:'100%', padding:'11px 12px', background:'#050508', border:'1px solid #ffffff15', borderRadius:6, color:'#f9c74f', fontSize:13, fontFamily:'Courier New, monospace', outline:'none' }}
              onFocus={e => (e.target.style.borderColor='#f9c74f66')}
              onBlur={e => (e.target.style.borderColor='#ffffff15')}
            />
          </div>

          {/* Role */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:10, color:'#888', display:'block', marginBottom:6, letterSpacing:2 }}>OPERATOR ROLE</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              style={{ width:'100%', padding:'11px 12px', background:'#050508', border:'1px solid #ffffff15', borderRadius:6, color:'#f9c74f', fontSize:13, fontFamily:'Courier New, monospace', outline:'none' }}
            >
              <option value="admin">👑 Admin — Full Access</option>
              <option value="analyst">🔍 Analyst — View & Analyze</option>
              <option value="viewer">👁️ Viewer — Read Only</option>
            </select>
          </div>

          {/* Password */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:10, color:'#888', display:'block', marginBottom:6, letterSpacing:2 }}>PASSWORD</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              style={{ width:'100%', padding:'11px 12px', background:'#050508', border:'1px solid #ffffff15', borderRadius:6, color:'#f9c74f', fontSize:13, fontFamily:'Courier New, monospace', outline:'none' }}
              onFocus={e => (e.target.style.borderColor='#f9c74f66')}
              onBlur={e => (e.target.style.borderColor='#ffffff15')}
            />
            {/* Password strength bar */}
            <div style={{ marginTop:6, height:3, background:'#ffffff10', borderRadius:2 }}>
              <div style={{ height:'100%', borderRadius:2, width: password.length === 0 ? '0%' : password.length < 6 ? '30%' : password.length < 10 ? '60%' : '100%', background: password.length < 6 ? '#ff0055' : password.length < 10 ? '#f9c74f' : '#00ff9f', transition:'all 0.3s' }} />
            </div>
            <div style={{ fontSize:9, color: password.length < 6 ? '#ff0055' : password.length < 10 ? '#f9c74f' : '#00ff9f', marginTop:3 }}>
              {password.length === 0 ? '' : password.length < 6 ? 'Weak' : password.length < 10 ? 'Medium' : '✅ Strong'}
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom:22 }}>
            <label style={{ fontSize:10, color:'#888', display:'block', marginBottom:6, letterSpacing:2 }}>CONFIRM PASSWORD</label>
            <input
              type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password"
              style={{ width:'100%', padding:'11px 12px', background:'#050508', border:`1px solid ${confirm && confirm !== password ? '#ff005566' : '#ffffff15'}`, borderRadius:6, color:'#f9c74f', fontSize:13, fontFamily:'Courier New, monospace', outline:'none' }}
              onFocus={e => (e.target.style.borderColor='#f9c74f66')}
              onBlur={e => (e.target.style.borderColor = confirm && confirm !== password ? '#ff005566' : '#ffffff15')}
            />
            {confirm && confirm !== password && (
              <div style={{ fontSize:9, color:'#ff0055', marginTop:3 }}>❌ Passwords do not match</div>
            )}
            {confirm && confirm === password && (
              <div style={{ fontSize:9, color:'#00ff9f', marginTop:3 }}>✅ Passwords match</div>
            )}
          </div>

          {/* Register Button */}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:13, background: loading ? '#1a1a0f' : 'linear-gradient(135deg, #9d4edd, #00b4d8)', border:'none', borderRadius:6, color:'#fff', fontSize:13, fontWeight:'bold', cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'Courier New, monospace', letterSpacing:2 }}>
            {loading ? '⏳ CREATING ACCOUNT...' : '🛡️ CREATE ACCOUNT'}
          </button>

        </form>

        {/* Switch to Login */}
        <div style={{ marginTop:20, textAlign:'center', fontSize:11, color:'#555' }}>
          Already have an account?{' '}
          <span onClick={onSwitch} style={{ color:'#f9c74f', cursor:'pointer' }}>
            LOGIN HERE
          </span>
        </div>

      </div>
    </div>
  );
}

export default Register;