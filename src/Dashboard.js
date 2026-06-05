import { useState, useEffect, useCallback } from 'react';
import AttackerProfile from './AttackerProfile';
import Settings from './Settings';

const FLAG = {
  'Russia':'🇷🇺','China':'🇨🇳','Romania':'🇷🇴','Brazil':'🇧🇷','Iran':'🇮🇷',
  'Nigeria':'🇳🇬','Ukraine':'🇺🇦','United States':'🇺🇸','Germany':'🇩🇪',
  'India':'🇮🇳','France':'🇫🇷','Netherlands':'🇳🇱','United Kingdom':'🇬🇧',
  'Canada':'🇨🇦','Australia':'🇦🇺','Pakistan':'🇵🇰','Bangladesh':'🇧🇩',
  'Indonesia':'🇮🇩','Vietnam':'🇻🇳','Thailand':'🇹🇭','Turkey':'🇹🇷',
  'Local Network':'🖥️','Unknown':'🌐',
};
const getFlag = c => FLAG[c] || '🌐';

const SKILL_C = {
  'Script Kiddie':'#00ff9f','Intermediate':'#f9c74f',
  'Advanced':'#ff6b35','Nation-State APT':'#ff0055',
  'BLOCKED':'#ff0055','Unknown':'#888888',
};

const DEMO_IPS = [
  '185.220.101.45','103.77.192.219','45.33.32.156',
  '91.108.4.1','177.54.128.12','196.52.43.117',
  '223.72.100.1','41.203.47.22','194.165.16.11',
];

const parseFields = (cmd) => {
  const str = typeof cmd === 'string' ? cmd : Array.isArray(cmd) ? cmd.join(' | ') : '';
  const get = (k) => { const m = str.match(new RegExp(`${k}:([^|\\n]+)`)); return m ? m[1].trim() : 'Unknown'; };
  const credM = str.match(/user=([^\s|]+)\s+pass=([^\s|]+)/);
  return {
    device:      get('Device'),
    os:          get('OS'),
    browser:     get('Browser'),
    tool:        get('Tool'),
    fingerprint: get('FP'),
    language:    get('Lang'),
    username:    credM ? credM[1] : '',
    password:    credM ? credM[2] : '',
  };
};

const mapA = (a) => {
  const f = parseFields(a.commands);
  return {
    id: a.id,
    ip: a.ip_address,
    country: { name: a.country || 'Unknown', flag: getFlag(a.country) },
    skill: a.skill_level || 'Unknown',
    protocol: a.protocol || 'SSH',
    port: a.port || 22,
    threat: a.threat_score || 50,
    motivation: a.motivation || 'Unknown',
    tools: a.tools_used || 'Unknown',
    time: new Date(a.created_at).toLocaleTimeString(),
    date: new Date(a.created_at).toLocaleDateString(),
    ai_summary: a.ai_summary || '',
    city: a.city || 'Unknown',
    raw: a.commands || '',
    ...f,
  };
};

const tc = t => t >= 70 ? '#ff0055' : t >= 45 ? '#f9c74f' : '#00ff9f';

export default function Dashboard({ onLogout }) {
  const [attackers, setAttackers]       = useState([]);
  const [selected, setSelected]         = useState(null);
  const [tab, setTab]                   = useState('map');
  const [stats, setStats]               = useState({ total:0, blocked:0, ssh:0, countries:0 });
  const [alert, setAlert]               = useState(null);
  const [viewing, setViewing]           = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastSync, setLastSync]         = useState(null);
  const [syncing, setSyncing]           = useState(false);
  const [loading, setLoading]           = useState(true);
  const [hpStatus, setHpStatus]         = useState({});
  const [httpLogs, setHttpLogs]         = useState([]);
  const [syncMsg, setSyncMsg]           = useState('');

  const showAlert = (msg) => { setAlert(msg); setTimeout(() => setAlert(null), 5000); };

  const fetchData = useCallback(async () => {
    try {
      setSyncing(true);
      setSyncMsg('Syncing...');

      // 1. Sync honeypot logs
      const syncRes = await fetch('http://localhost:8000/honeypot/sync');
      const syncData = await syncRes.json();
      if (syncData.new_attackers_saved > 0) {
        setSyncMsg(`+${syncData.new_attackers_saved} new attacks!`);
        setTimeout(() => setSyncMsg(''), 4000);
      } else {
        setSyncMsg('');
      }

      // 2. Fetch all attackers
      const aRes = await fetch('http://localhost:8000/attackers');
      const aData = await aRes.json();

      if (Array.isArray(aData)) {
        const mapped = aData.map(mapA);
        setAttackers(prev => {
          const prevIds = new Set(prev.map(x => x.id));
          const newOnes = mapped.filter(x => !prevIds.has(x.id));
          if (newOnes.length > 0) {
            const n = newOnes[0];
            showAlert(`🚨 NEW ATTACK — ${n.country.flag} ${n.ip} | ${n.tool} | ${n.protocol}:${n.port}`);
            setSelected(n);
          }
          return mapped;
        });

        const countries = new Set(mapped.map(a => a.country.name)).size;
        setStats({
          total: mapped.length,
          blocked: mapped.filter(a => a.skill === 'BLOCKED').length,
          ssh: mapped.filter(a => a.protocol === 'SSH').length,
          countries,
        });
        if (mapped.length > 0 && !selected) setSelected(mapped[0]);
      }

      // 3. Honeypot status
      try {
        const sr = await fetch('http://localhost:8000/honeypot/all-status');
        setHpStatus(await sr.json());
      } catch {}

      // 4. HTTP raw logs
      try {
        const lr = await fetch('http://localhost:8000/honeypot/http/logs');
        const ld = await lr.json();
        setHttpLogs(ld.events || []);
      } catch {}

      setLastSync(new Date().toLocaleTimeString());
      setSyncing(false);
      setLoading(false);
    } catch(e) {
      console.error('Fetch error:', e);
      setSyncing(false);
      setLoading(false);
    }
  }, []);

  const simulate = async () => {
    const ip = DEMO_IPS[Math.floor(Math.random() * DEMO_IPS.length)];
    try {
      const r = await fetch('http://localhost:8000/demo/attack', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ ip, protocol:'HTTP', port:8081, username:'admin', password:'admin123' })
      });
      const d = await r.json();
      showAlert(`✅ Demo attack from ${ip} — ${d.country || ''}!`);
      setTimeout(fetchData, 1000);
    } catch(e) { showAlert(`❌ ${e.message}`); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const t = setInterval(fetchData, 10000);
    return () => clearInterval(t);
  }, [fetchData]);

  if (showSettings) return <Settings onBack={() => setShowSettings(false)} />;
  if (viewing && selected) return (
    <AttackerProfile attacker={selected} onBack={() => { setViewing(false); fetchData(); }} />
  );

  const TABS = [
    {id:'map',    label:'🗺️ Live Map'},
    {id:'ai',     label:'🤖 AI Profile'},
    {id:'timeline',label:'🎬 Replay'},
    {id:'hp',     label:'🍯 Honeypots'},
    {id:'logs',   label:'📋 Raw Logs'},
  ];

  return (
    <div style={{minHeight:'100vh',background:'#050508',color:'#c9d1d9',fontFamily:"'Rajdhani',monospace"}}>

      {/* Alert */}
      {alert && (
        <div style={{background:'#0d0208',borderBottom:'2px solid #ff0055',padding:'8px 24px',fontSize:12,color:'#ff0055',textAlign:'center',fontWeight:600,letterSpacing:1,position:'sticky',top:0,zIndex:100}}>
          {alert}
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',height:56,borderBottom:'1px solid rgba(255,255,255,0.06)',background:'#050508',position:'sticky',top:alert?40:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:24,filter:'drop-shadow(0 0 10px #f9c74f)'}}>🍯</span>
          <div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:15,fontWeight:900,color:'#f9c74f',letterSpacing:4}}>HONEYTRAP</div>
            <div style={{fontSize:9,color:'#444',letterSpacing:3}}>AI SECURITY PLATFORM</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:syncing?'#f9c74f':'#00ff9f',fontWeight:600}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:syncing?'#f9c74f':'#00ff9f',display:'inline-block',boxShadow:`0 0 8px ${syncing?'#f9c74f':'#00ff9f'}`}} />
            {syncing ? 'SYNCING' : 'LIVE'}
          </div>
          {syncMsg && <span style={{fontSize:10,color:'#00ff9f',fontWeight:600}}>{syncMsg}</span>}
          {lastSync && <span style={{fontSize:10,color:'#333'}}>Synced: {lastSync}</span>}
          <button onClick={fetchData} style={{background:'#00ff9f18',border:'1px solid #00ff9f33',color:'#00ff9f',padding:'5px 12px',borderRadius:5,cursor:'pointer',fontSize:11,fontFamily:"'Rajdhani',monospace",fontWeight:700}}>🔄 SYNC</button>
          <button onClick={simulate} style={{background:'#ff6b3518',border:'1px solid #ff6b3533',color:'#ff6b35',padding:'5px 12px',borderRadius:5,cursor:'pointer',fontSize:11,fontFamily:"'Rajdhani',monospace",fontWeight:700}}>🎯 SIMULATE</button>
          <button onClick={() => setShowSettings(true)} style={{background:'#f9c74f18',border:'1px solid #f9c74f33',color:'#f9c74f',padding:'5px 12px',borderRadius:5,cursor:'pointer',fontSize:11,fontFamily:"'Rajdhani',monospace",fontWeight:700}}>⚙️</button>
          <button onClick={() => window.open('http://localhost:8000/report/download','_blank')} style={{background:'#9d4edd18',border:'1px solid #9d4edd33',color:'#9d4edd',padding:'5px 12px',borderRadius:5,cursor:'pointer',fontSize:11,fontFamily:"'Rajdhani',monospace",fontWeight:700}}>📄 PDF</button>
          <button onClick={onLogout} style={{background:'#ff005518',border:'1px solid #ff005533',color:'#ff0055',padding:'5px 12px',borderRadius:5,cursor:'pointer',fontSize:11,fontFamily:"'Rajdhani',monospace",fontWeight:700}}>⏻</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        {[['TOTAL CAPTURED',stats.total,'#ff0055'],['BLOCKED IPs',stats.blocked,'#00ff9f'],['SSH ATTACKS',stats.ssh,'#9d4edd'],['COUNTRIES',stats.countries,'#f9c74f']].map(([l,v,c],i)=>(
          <div key={i} style={{padding:'10px 20px',borderRight:i<3?'1px solid rgba(255,255,255,0.06)':'none'}}>
            <div style={{fontSize:10,color:'#444',letterSpacing:2,marginBottom:3,fontWeight:600}}>{l}</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:24,fontWeight:700,color:c,lineHeight:1}}>{String(v).padStart(4,'0')}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.06)',overflowX:'auto',background:'#050508'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:'transparent',border:'none',cursor:'pointer',padding:'11px 20px',borderBottom:tab===t.id?'2px solid #f9c74f':'2px solid transparent',color:tab===t.id?'#f9c74f':'#555',fontSize:11,whiteSpace:'nowrap',fontFamily:"'Rajdhani',monospace",fontWeight:700,letterSpacing:1,transition:'all 0.2s'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 270px',height:'calc(100vh - 170px)'}}>

        {/* Left */}
        <div style={{padding:18,overflowY:'auto',borderRight:'1px solid rgba(255,255,255,0.06)'}}>

          {loading && (
            <div style={{textAlign:'center',padding:60,color:'#555'}}>
              <div style={{fontSize:36,marginBottom:14}}>🍯</div>
              <div style={{fontSize:13,letterSpacing:2}}>LOADING...</div>
            </div>
          )}

          {!loading && attackers.length === 0 && (
            <div style={{textAlign:'center',padding:50,color:'#555'}}>
              <div style={{fontSize:36,marginBottom:14}}>🎯</div>
              <div style={{fontSize:13,letterSpacing:2,marginBottom:8}}>WAITING FOR ATTACKERS</div>
              <div style={{fontSize:11,color:'#444',marginBottom:20}}>
                Attack <span style={{color:'#f9c74f',fontFamily:"'Share Tech Mono',monospace"}}>http://localhost:8081</span> or click SIMULATE
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                <button onClick={fetchData} style={{padding:'10px 20px',background:'#00ff9f18',border:'1px solid #00ff9f33',borderRadius:8,color:'#00ff9f',cursor:'pointer',fontFamily:"'Rajdhani',monospace",fontWeight:700}}>🔄 SYNC NOW</button>
                <button onClick={simulate} style={{padding:'10px 20px',background:'#ff005518',border:'1px solid #ff005533',borderRadius:8,color:'#ff0055',cursor:'pointer',fontFamily:"'Rajdhani',monospace",fontWeight:700}}>🎯 SIMULATE</button>
              </div>
            </div>
          )}

          {/* MAP TAB */}
          {!loading && tab === 'map' && attackers.length > 0 && (
            <div>
              <div style={{fontSize:10,color:'#444',letterSpacing:2,marginBottom:12,fontWeight:600}}>CAPTURED ATTACKERS — CLICK TO VIEW FULL PROFILE</div>
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                {attackers.map(a => (
                  <div key={a.id}
                    onClick={() => { setSelected(a); setViewing(true); }}
                    style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',background:selected?.id===a.id?'rgba(249,199,79,0.06)':'#0a0a0f',border:`1px solid ${selected?.id===a.id?'rgba(249,199,79,0.3)':'rgba(255,255,255,0.06)'}`,borderRadius:10,cursor:'pointer',transition:'all 0.2s'}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(249,199,79,0.15)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=selected?.id===a.id?'rgba(249,199,79,0.3)':'rgba(255,255,255,0.06)'}
                  >
                    <span style={{fontSize:22}}>{a.country.flag}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                        <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:'#e0e0e0',fontWeight:700}}>{a.ip}</span>
                        {a.skill==='BLOCKED' && <span style={{fontSize:9,color:'#ff0055',background:'#ff005522',padding:'1px 6px',borderRadius:3,fontWeight:700}}>🚫 BLOCKED</span>}
                      </div>
                      <div style={{fontSize:11,color:'#555',fontWeight:600}}>
                        {a.country.name}{a.city&&a.city!=='Unknown'?` · ${a.city}`:''} · {a.protocol}:{a.port}
                      </div>
                      <div style={{fontSize:10,color:'#444',marginTop:2}}>
                        ⚔️ {a.tool} | 💻 {a.os} | 🕐 {a.date} {a.time}
                      </div>
                      {a.username && (
                        <div style={{fontSize:10,color:'#f9c74f44',marginTop:2,fontFamily:"'Share Tech Mono',monospace"}}>
                          👤 {a.username} / {a.password}
                        </div>
                      )}
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:700,color:tc(a.threat)}}>{a.threat}/100</div>
                      <div style={{fontSize:10,color:SKILL_C[a.skill]||'#aaa',fontWeight:600,marginTop:2}}>{a.skill}</div>
                    </div>
                    <span style={{color:'#f9c74f',opacity:0.4,fontSize:16}}>›</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI PROFILE TAB */}
          {!loading && tab === 'ai' && selected && (
            <div>
              <div style={{fontSize:10,color:'#444',letterSpacing:2,marginBottom:12,fontWeight:600}}>AI ATTACKER PROFILE</div>
              <div style={{background:'#0a0a0f',border:'1px solid rgba(249,199,79,0.1)',borderRadius:12,padding:18}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:14,paddingBottom:12,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  <div>
                    <div style={{fontSize:9,color:'#444',letterSpacing:2,marginBottom:5,fontWeight:600}}>ATTACKER #{selected.id}</div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:20}}>{selected.country.flag}</span>
                      <div>
                        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:14,color:'#fff',fontWeight:700}}>{selected.ip}</div>
                        <div style={{fontSize:11,color:'#666'}}>{selected.country.name}{selected.city&&selected.city!=='Unknown'?` · ${selected.city}`:''}</div>
                        <div style={{fontSize:10,color:'#555',marginTop:1}}>⚔️ {selected.tool} | 💻 {selected.os}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:28,fontWeight:900,color:tc(selected.threat)}}>{selected.threat}</div>
                    <div style={{fontSize:9,color:'#444',letterSpacing:1,fontWeight:600}}>THREAT</div>
                  </div>
                </div>
                {[
                  ['SKILL',    selected.skill,                          SKILL_C[selected.skill]||'#aaa'],
                  ['MOTIVATION',selected.motivation,                   '#c9d1d9'],
                  ['TOOLS',    selected.tools,                         '#00b4d8'],
                  ['VECTOR',   `${selected.protocol}:${selected.port}`,'#ff6b35'],
                  ['CREDS',    selected.username?`${selected.username} / ${selected.password}`:'N/A','#f9c74f'],
                  ['DEVICE',   `${selected.device||'Unknown'} · ${selected.browser||'Unknown'}`,'#9d4edd'],
                  ['SEEN',     `${selected.date} ${selected.time}`,    '#555'],
                ].map(([l,v,c])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',gap:8}}>
                    <span style={{fontSize:10,color:'#555',fontWeight:600,letterSpacing:1,flexShrink:0}}>{l}</span>
                    <span style={{fontFamily:"'Rajdhani',monospace",fontSize:11,color:c,fontWeight:600,textAlign:'right',maxWidth:'60%',wordBreak:'break-word'}}>{v}</span>
                  </div>
                ))}
                <div style={{marginTop:12,padding:12,background:'#050508',borderRadius:8,borderLeft:'3px solid #9d4edd'}}>
                  <div style={{fontSize:10,color:'#9d4edd',marginBottom:5,letterSpacing:2,fontWeight:700}}>🤖 AI ANALYSIS</div>
                  <div style={{fontSize:12,color:'#888',lineHeight:1.7}}>
                    {selected.ai_summary && !['Pending AI analysis...','AI analysis unavailable. Manual review required.'].includes(selected.ai_summary)
                      ? selected.ai_summary
                      : 'Click "VIEW FULL PROFILE" → RUN AI ANALYSIS'}
                  </div>
                </div>
                <button onClick={()=>setViewing(true)} style={{width:'100%',marginTop:12,padding:10,background:'rgba(249,199,79,0.08)',border:'1px solid rgba(249,199,79,0.2)',borderRadius:8,color:'#f9c74f',fontSize:12,cursor:'pointer',fontFamily:"'Rajdhani',monospace",fontWeight:700,letterSpacing:2}}>
                  🔍 VIEW FULL PROFILE
                </button>
              </div>
            </div>
          )}

          {/* TIMELINE TAB */}
          {!loading && tab === 'timeline' && selected && (
            <div>
              <div style={{fontSize:10,color:'#444',letterSpacing:2,marginBottom:12,fontWeight:600}}>ATTACK REPLAY — {selected.ip}</div>
              {selected.raw ? (
                <div style={{background:'#0a0a0f',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:16,position:'relative'}}>
                  <div style={{position:'absolute',left:24,top:16,bottom:16,width:1,background:'rgba(255,255,255,0.04)'}} />
                  {selected.raw.split('|').filter(p=>p.trim()&&!p.includes('Device:')&&!p.includes('OS:')&&!p.includes('Browser:')&&!p.includes('Tool:')&&!p.includes('FP:')&&!p.includes('Lang:')&&!p.includes('UA:')).map((cmd,i)=>{
                    const cats=['RECON','RECON','EXPLOIT','EXPLOIT','PERSIST','EXFIL'];
                    const cc={RECON:'#00b4d8',EXPLOIT:'#ff6b35',PERSIST:'#9d4edd',EXFIL:'#ff0055'};
                    const cat=cats[i%cats.length];
                    return (
                      <div key={i} style={{display:'flex',gap:12,marginBottom:12,alignItems:'flex-start'}}>
                        <div style={{width:9,height:9,borderRadius:'50%',background:cc[cat],flexShrink:0,marginTop:4,zIndex:1}} />
                        <div>
                          <span style={{fontSize:9,padding:'1px 7px',borderRadius:3,background:cc[cat]+'22',color:cc[cat],fontWeight:700,marginRight:7}}>{cat}</span>
                          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:'#00ff9f',marginTop:3}}>$ {cmd.trim()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{background:'#0a0a0f',borderRadius:10,padding:36,textAlign:'center',color:'#555'}}>
                  <div style={{fontSize:30,marginBottom:10}}>📋</div>
                  <div>No commands captured yet.</div>
                </div>
              )}
            </div>
          )}

          {/* HONEYPOTS TAB */}
          {tab === 'hp' && (
            <div>
              <div style={{fontSize:10,color:'#444',letterSpacing:2,marginBottom:12,fontWeight:600}}>ACTIVE HONEYPOTS</div>
              {[
                {k:'ssh', name:'SSH Server', port:2222, proto:'SSH', desc:'Cowrie — OpenSSH 7.2 simulation', color:'#00ff9f'},
                {k:'http',name:'HTTP Login', port:8081, proto:'HTTP',desc:'Flask — Fake company login page',  color:'#00b4d8'},
                {k:'ftp', name:'FTP Server', port:2121, proto:'FTP', desc:'Twisted — vsftpd 2.3 simulation',  color:'#f9c74f'},
              ].map((h,i)=>{
                const isUp = hpStatus[h.k]?.status === 'running';
                return (
                  <div key={i} style={{background:'#0a0a0f',border:`1px solid ${h.color}22`,borderRadius:10,padding:14,marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                      <div>
                        <div style={{fontSize:13,color:h.color,fontWeight:700}}>🍯 {h.name}</div>
                        <div style={{fontSize:11,color:'#555',fontWeight:600}}>{h.proto} — Port {h.port}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end',marginBottom:3}}>
                          <span style={{width:6,height:6,borderRadius:'50%',background:isUp?h.color:'#ff0055',display:'inline-block'}} />
                          <span style={{fontSize:10,color:isUp?h.color:'#ff0055',fontWeight:600}}>{isUp?'ACTIVE':'STOPPED'}</span>
                        </div>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:16,fontWeight:700,color:'#f9c74f'}}>
                          {attackers.filter(a=>a.protocol===h.proto).length}
                        </div>
                        <div style={{fontSize:9,color:'#555',fontWeight:600}}>CAPTURED</div>
                      </div>
                    </div>
                    <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:'#444',background:'#050508',padding:'5px 10px',borderRadius:4,marginBottom:h.proto==='HTTP'?8:0}}>
                      &gt; {h.desc}
                    </div>
                    {h.proto==='HTTP' && (
                      <div style={{display:'flex',gap:7}}>
                        <button onClick={()=>window.open('https://calmiest-cristopher-rainy.ngrok-free.dev','_blank')} style={{flex:1,padding:'6px',background:`${h.color}11`,border:`1px solid ${h.color}33`,borderRadius:5,color:h.color,fontSize:10,cursor:'pointer',fontFamily:"'Rajdhani',monospace",fontWeight:700}}>
                          🌐 LIVE HONEYPOT
                        </button>
                        <button onClick={simulate} style={{flex:1,padding:'6px',background:'#ff005511',border:'1px solid #ff005533',borderRadius:5,color:'#ff0055',fontSize:10,cursor:'pointer',fontFamily:"'Rajdhani',monospace",fontWeight:700}}>
                          🎯 SIMULATE
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{background:'#0a0a1a',border:'1px solid #f9c74f33',borderRadius:10,padding:12}}>
                <div style={{fontSize:10,color:'#f9c74f',fontWeight:700,marginBottom:5}}>🌍 LIVE PUBLIC URL</div>
                <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:'#00ff9f',marginBottom:5}}>https://calmiest-cristopher-rainy.ngrok-free.dev</div>
                <div style={{fontSize:10,color:'#555'}}>Real attackers on internet can find and attack this!</div>
              </div>
            </div>
          )}

          {/* RAW LOGS TAB */}
          {tab === 'logs' && (
            <div>
              <div style={{fontSize:10,color:'#444',letterSpacing:2,marginBottom:12,fontWeight:600}}>
                RAW HTTP LOGS — EVERY REQUEST ({httpLogs.length} total)
              </div>
              {httpLogs.length === 0 ? (
                <div style={{textAlign:'center',padding:40,color:'#555',fontSize:12}}>
                  No HTTP logs yet. Attack the honeypot!
                  <br/><br/>
                  <code style={{color:'#f9c74f',fontSize:11}}>curl -X POST http://localhost:8081/login -d "username=admin&password=admin"</code>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {httpLogs.slice().reverse().map((log,i)=>(
                    <div key={i} style={{background:'#0a0a0f',border:`1px solid ${log.event==='login_attempt'?'rgba(255,0,85,0.2)':'rgba(255,255,255,0.06)'}`,borderRadius:8,padding:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                        <span style={{fontSize:11,color:log.event==='login_attempt'?'#ff0055':'#00b4d8',fontWeight:700}}>
                          {log.event==='login_attempt'?'🔴 LOGIN ATTEMPT':log.event==='page_visit'?'🟡 PAGE VISIT':'🟠 PROBE'}
                        </span>
                        <span style={{fontSize:10,color:'#444'}}>{log.timestamp?.replace('T',' ')?.slice(0,19)} UTC</span>
                      </div>
                      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:'#f9c74f',marginBottom:3}}>
                        📡 IP: {log.ip}
                      </div>
                      {log.data?.username && (
                        <div style={{fontSize:11,color:'#888',marginBottom:3}}>
                          👤 <span style={{color:'#f9c74f'}}>{log.data.username}</span> / 🔑 <span style={{color:'#aaa'}}>{log.data.password}</span>
                        </div>
                      )}
                      {log.device_info && (
                        <div style={{fontSize:10,color:'#555'}}>
                          ⚔️ {log.device_info.attack_tool} | 💻 {log.device_info.os} | 🌐 {log.device_info.browser} | 🔍 {log.device_info.fingerprint}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Panel */}
        <div style={{display:'flex',flexDirection:'column',overflow:'hidden',background:'#050508'}}>
          <div style={{padding:'9px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:11,color:'#444',fontWeight:600,letterSpacing:2}}>LIVE FEED</span>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:'#f9c74f'}}>● {attackers.length}</span>
          </div>
          {attackers.length === 0 ? (
            <div style={{padding:20,textAlign:'center',color:'#333',fontSize:11}}>
              <div style={{fontSize:22,marginBottom:8}}>🎯</div>
              <div>No attackers yet</div>
              <button onClick={simulate} style={{marginTop:10,padding:'7px 14px',background:'#ff005518',border:'1px solid #ff005533',borderRadius:5,color:'#ff0055',cursor:'pointer',fontSize:11,fontFamily:"'Rajdhani',monospace",fontWeight:700}}>🎯 SIMULATE</button>
            </div>
          ) : (
            <div style={{flex:1,overflowY:'auto'}}>
              {attackers.slice().reverse().map(a=>(
                <div key={a.id}
                  onClick={()=>{setSelected(a);setTab('ai');}}
                  style={{padding:'9px 12px',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer',background:selected?.id===a.id?'rgba(249,199,79,0.04)':'transparent',transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                  onMouseLeave={e=>e.currentTarget.style.background=selected?.id===a.id?'rgba(249,199,79,0.04)':'transparent'}
                >
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                    <span style={{fontSize:16}}>{a.country.flag}</span>
                    <span style={{fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:700,color:tc(a.threat)}}>{a.threat}</span>
                  </div>
                  <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:'#bbb',marginBottom:1}}>{a.ip}</div>
                  <div style={{fontSize:10,color:'#555',fontWeight:600}}>{a.protocol}:{a.port}</div>
                  <div style={{fontSize:9,color:'#444'}}>{a.tool}</div>
                  <div style={{fontSize:9,color:'#333'}}>{a.date} {a.time}</div>
                  {a.skill==='BLOCKED' && <div style={{fontSize:9,color:'#ff0055',fontWeight:700,marginTop:2}}>🚫 BLOCKED</div>}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}