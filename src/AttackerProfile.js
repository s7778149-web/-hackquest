import { useState } from 'react';

const SC = {'Script Kiddie':'#00ff9f','Intermediate':'#f9c74f','Advanced':'#ff6b35','Nation-State APT':'#ff0055','BLOCKED':'#ff0055','Unknown':'#888888'};
const tc = t => t>=70?'#ff0055':t>=45?'#f9c74f':'#00ff9f';

export default function AttackerProfile({ attacker, onBack }) {
  const [tab, setTab]           = useState('profile');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiData, setAiData]     = useState(null);
  const [blocked, setBlocked]   = useState(attacker?.skill === 'BLOCKED');
  const [msg, setMsg]           = useState('');
  const [msgCol, setMsgCol]     = useState('#00ff9f');

  const flash = (m, c='#00ff9f') => { setMsg(m); setMsgCol(c); setTimeout(()=>setMsg(''), 5000); };

  if (!attacker) return (
    <div style={{padding:40,textAlign:'center',color:'#555',fontFamily:"'Rajdhani',monospace"}}>
      <div style={{fontSize:36,marginBottom:14}}>🔍</div>
      <div>No attacker selected.</div>
      <button onClick={onBack} style={{marginTop:16,padding:'10px 22px',background:'#f9c74f',border:'none',borderRadius:6,cursor:'pointer',fontFamily:"'Rajdhani',monospace",fontWeight:700}}>← BACK</button>
    </div>
  );

  // Parse all fields from commands string
  const raw = typeof attacker.raw === 'string' ? attacker.raw :
              typeof attacker.commands === 'string' ? attacker.commands :
              Array.isArray(attacker.commands) ? attacker.commands.join(' | ') : '';

  const get = (k) => { const m = raw.match(new RegExp(`${k}:([^|\\n]+)`)); return m ? m[1].trim() : 'Unknown'; };
  const credM = raw.match(/user=([^\s|]+)\s+pass=([^\s|]+)/);

  const dev = {
    device:      attacker.device?.device      || get('Device'),
    os:          attacker.device?.os          || get('OS'),
    browser:     attacker.device?.browser     || get('Browser'),
    tool:        attacker.device?.tool        || get('Tool'),
    fingerprint: attacker.device?.fingerprint || get('FP'),
    language:    attacker.device?.language    || get('Lang'),
  };

  // Parse all credential attempts
  const creds = [];
  const credPattern = /user=([^\s|]+)\s+pass=([^\s|]+)/g;
  let m;
  while ((m = credPattern.exec(raw)) !== null) {
    creds.push({ username: m[1], password: m[2] });
  }
  if (creds.length === 0 && attacker.username) {
    creds.push({ username: attacker.username, password: attacker.password });
  }

  const runAI = async () => {
    setAnalyzing(true);
    flash('🤖 Running AI analysis...', '#9d4edd');
    try {
      const r = await fetch(`http://localhost:8000/ai/analyze/${attacker.id}`);
      const d = await r.json();
      if (d.profile) {
        setAiData(d.profile);
        flash('✅ AI Analysis complete!', '#00ff9f');
      } else {
        flash('⚠️ No profile returned. Check backend logs.', '#f9c74f');
      }
    } catch(e) {
      flash(`❌ AI failed: ${e.message}`, '#ff0055');
    }
    setAnalyzing(false);
  };

  const toggleBlock = async () => {
    const action = blocked ? 'unblock' : 'block';
    flash(`${blocked?'🔓 Unblocking':'🚫 Blocking'} ${attacker.ip}...`, blocked?'#00ff9f':'#ff0055');
    try {
      const r = await fetch(`http://localhost:8000/${action}/${attacker.ip}`, {method:'POST'});
      const d = await r.json();
      setBlocked(!blocked);
      flash(`✅ ${d.message}`, !blocked?'#ff0055':'#00ff9f');
    } catch {
      setBlocked(!blocked);
      flash(`✅ IP ${attacker.ip} ${blocked?'unblocked':'blocked'}!`, !blocked?'#ff0055':'#00ff9f');
    }
  };

  const TABS = [
    {id:'profile',  label:'🤖 AI Profile'},
    {id:'creds',    label:'🔑 Credentials'},
    {id:'device',   label:'💻 Device Info'},
    {id:'timeline', label:'🎬 Timeline'},
    {id:'raw',      label:'📋 Raw Data'},
  ];

  const skill  = aiData?.skill_level  || attacker.skill;
  const score  = aiData?.threat_score || attacker.threat;
  const motiv  = aiData?.motivation   || attacker.motivation;
  const tools  = aiData?.tools_detected || attacker.tools;
  const hours  = aiData?.active_hours || '—';
  const style_ = aiData?.attack_style || '—';
  const summ   = aiData?.ai_summary   || attacker.ai_summary;

  return (
    <div style={{minHeight:'100vh',background:'#050508',fontFamily:"'Rajdhani',monospace",color:'#c9d1d9'}}>

      {/* Message */}
      {msg && (
        <div style={{background:'#0a0a0f',borderBottom:`2px solid ${msgCol}`,padding:'9px 24px',fontSize:12,color:msgCol,textAlign:'center',fontWeight:600,letterSpacing:1,position:'sticky',top:0,zIndex:100}}>
          {msg}
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,padding:'13px 22px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'#050508',position:'sticky',top:msg?40:0,zIndex:50}}>
        <button onClick={onBack} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#aaa',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontFamily:"'Rajdhani',monospace",fontSize:12,fontWeight:700}}>← BACK</button>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:'#f9c74f',fontWeight:700}}>
            ATTACKER #{attacker.id} — {attacker.ip}
            {blocked && <span style={{marginLeft:10,fontSize:10,color:'#ff0055',background:'#ff005522',padding:'2px 8px',borderRadius:4}}>🚫 BLOCKED</span>}
          </div>
          <div style={{fontSize:10,color:'#555',marginTop:2}}>
            {attacker.country?.name||attacker.country} · {attacker.city!=='Unknown'?attacker.city+' · ':''}{attacker.protocol}:{attacker.port} · {dev.tool}
          </div>
        </div>
        <div style={{display:'flex',gap:7}}>
          <button onClick={runAI} disabled={analyzing} style={{background:'#9d4edd18',border:'1px solid #9d4edd33',color:'#9d4edd',padding:'6px 12px',borderRadius:6,cursor:'pointer',fontFamily:"'Rajdhani',monospace",fontSize:11,fontWeight:700}}>
            {analyzing?'⏳ AI...':'🤖 RUN AI'}
          </button>
          <button onClick={()=>window.open('http://localhost:8000/report/download','_blank')} style={{background:'#00ff9f18',border:'1px solid #00ff9f33',color:'#00ff9f',padding:'6px 12px',borderRadius:6,cursor:'pointer',fontFamily:"'Rajdhani',monospace",fontSize:11,fontWeight:700}}>📄 PDF</button>
          <button onClick={toggleBlock} style={{background:blocked?'#00ff9f18':'#ff005518',border:`1px solid ${blocked?'#00ff9f33':'#ff005533'}`,color:blocked?'#00ff9f':'#ff0055',padding:'6px 12px',borderRadius:6,cursor:'pointer',fontFamily:"'Rajdhani',monospace",fontSize:11,fontWeight:700}}>
            {blocked?'🔓 UNBLOCK':'🚫 BLOCK IP'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.06)',overflowX:'auto'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:'transparent',border:'none',cursor:'pointer',padding:'10px 18px',borderBottom:tab===t.id?'2px solid #f9c74f':'2px solid transparent',color:tab===t.id?'#f9c74f':'#555',fontSize:11,fontFamily:"'Rajdhani',monospace",fontWeight:700,letterSpacing:1,whiteSpace:'nowrap'}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:22,maxWidth:920,margin:'0 auto'}}>

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>
              {[
                ['SKILL',     skill,                        SC[skill]||'#aaa'],
                ['THREAT',    `${score}/100`,               tc(score)],
                ['PROTOCOL',  `${attacker.protocol}:${attacker.port}`,'#00b4d8'],
                ['ATTACK TOOL',dev.tool.split('(')[0],     '#ff6b35'],
              ].map(([l,v,c])=>(
                <div key={l} style={{background:'#0a0a0f',border:`1px solid ${c}33`,borderRadius:8,padding:12}}>
                  <div style={{fontSize:9,color:'#555',marginBottom:4,letterSpacing:1,fontWeight:600}}>{l}</div>
                  <div style={{fontSize:12,color:c,fontWeight:700,lineHeight:1.3}}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{background:'#0a0a0f',border:'1px solid rgba(249,199,79,0.1)',borderRadius:12,padding:18,marginBottom:14}}>
              <div style={{fontSize:10,color:'#555',letterSpacing:2,marginBottom:12,fontWeight:600}}>COMPLETE ATTACKER INFORMATION</div>
              {[
                ['IP ADDRESS',   attacker.ip,                                           "'Share Tech Mono',monospace"],
                ['COUNTRY',      attacker.country?.name||attacker.country||'Unknown',   null],
                ['CITY',         attacker.city||'Unknown',                              null],
                ['MOTIVATION',   motiv,                                                 null],
                ['TOOLS USED',   tools,                                                 null],
                ['ACTIVE HOURS', hours,                                                 null],
                ['ATTACK STYLE', style_,                                                null],
                ['CREDENTIALS',  creds.length>0?`${creds.length} attempt(s) — ${creds[0].username}/${creds[0].password}`:'N/A',null],
                ['FIRST SEEN',   `${attacker.date||''} ${attacker.time||''}`,           null],
              ].map(([l,v,f])=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',gap:10}}>
                  <span style={{fontSize:10,color:'#555',fontWeight:600,letterSpacing:1,flexShrink:0}}>{l}</span>
                  <span style={{fontFamily:f||"'Rajdhani',monospace",fontSize:11,color:'#ccc',fontWeight:600,textAlign:'right',maxWidth:'65%',wordBreak:'break-all'}}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{background:'#0a0a0f',borderRadius:10,padding:16,borderLeft:'3px solid #9d4edd',marginBottom:14}}>
              <div style={{fontSize:10,color:'#9d4edd',marginBottom:7,letterSpacing:2,fontWeight:700}}>🤖 AI ANALYSIS</div>
              <div style={{fontSize:13,color:'#888',lineHeight:1.7}}>
                {summ && !['Pending AI analysis...','AI analysis unavailable. Manual review required.'].includes(summ)
                  ? summ : '⚠️ Click "🤖 RUN AI" button above to generate AI analysis.'}
              </div>
            </div>

            <div style={{display:'flex',gap:10}}>
              <button onClick={runAI} disabled={analyzing} style={{flex:1,padding:12,background:'#9d4edd18',border:'1px solid #9d4edd33',borderRadius:8,color:'#9d4edd',fontSize:12,cursor:'pointer',fontFamily:"'Rajdhani',monospace",fontWeight:700}}>
                {analyzing?'⏳ ANALYZING...':'🤖 RUN AI ANALYSIS'}
              </button>
              <button onClick={()=>window.open('http://localhost:8000/report/download','_blank')} style={{flex:1,padding:12,background:'#00ff9f18',border:'1px solid #00ff9f33',borderRadius:8,color:'#00ff9f',fontSize:12,cursor:'pointer',fontFamily:"'Rajdhani',monospace",fontWeight:700}}>
                📄 PDF REPORT
              </button>
              <button onClick={toggleBlock} style={{flex:1,padding:12,background:blocked?'#00ff9f18':'#ff005518',border:`1px solid ${blocked?'#00ff9f33':'#ff005533'}`,borderRadius:8,color:blocked?'#00ff9f':'#ff0055',fontSize:12,cursor:'pointer',fontFamily:"'Rajdhani',monospace",fontWeight:700}}>
                {blocked?'🔓 UNBLOCK IP':'🚫 BLOCK IP'}
              </button>
            </div>
          </div>
        )}

        {/* CREDENTIALS TAB */}
        {tab === 'creds' && (
          <div>
            <div style={{fontSize:10,color:'#555',letterSpacing:2,marginBottom:12,fontWeight:600}}>
              ALL CREDENTIALS ATTEMPTED — {creds.length} ATTEMPT(S)
            </div>
            <div style={{background:'#0a0a0f',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'#0f0f1a'}}>
                    {['#','USERNAME','PASSWORD','STATUS','THREAT'].map(h=>(
                      <th key={h} style={{padding:'10px 14px',textAlign:'left',color:'#444',fontSize:10,letterSpacing:1,fontWeight:600,borderBottom:'1px solid rgba(255,255,255,0.08)'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {creds.length > 0 ? creds.map((c,i)=>(
                    <tr key={i} style={{background:i%2===0?'rgba(255,255,255,0.02)':'transparent',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <td style={{padding:'9px 14px',color:'#555',fontSize:11}}>{i+1}</td>
                      <td style={{padding:'9px 14px',color:'#f9c74f',fontFamily:"'Share Tech Mono',monospace",fontSize:11}}>{c.username}</td>
                      <td style={{padding:'9px 14px',color:'#aaa',fontFamily:"'Share Tech Mono',monospace",fontSize:11}}>{c.password}</td>
                      <td style={{padding:'9px 14px',fontSize:11,color:'#ff005566'}}>❌ FAILED</td>
                      <td style={{padding:'9px 14px',fontFamily:"'Orbitron',monospace",fontSize:11,color:tc(attacker.threat)}}>{attacker.threat}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} style={{padding:30,textAlign:'center',color:'#555',fontSize:12}}>No credentials parsed.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DEVICE INFO TAB */}
        {tab === 'device' && (
          <div>
            <div style={{fontSize:10,color:'#555',letterSpacing:2,marginBottom:12,fontWeight:600}}>CAPTURED DEVICE INFORMATION</div>
            <div style={{background:'#0a0a0f',border:'1px solid rgba(0,180,216,0.2)',borderRadius:12,padding:18,marginBottom:14}}>
              <div style={{fontSize:10,color:'#00b4d8',letterSpacing:2,marginBottom:12,fontWeight:700}}>💻 DEVICE FINGERPRINT</div>
              {[
                ['DEVICE TYPE',    dev.device,      '💻','#00b4d8'],
                ['OPERATING SYS',  dev.os,          '🖥️','#9d4edd'],
                ['BROWSER/CLIENT', dev.browser,     '🌐','#f9c74f'],
                ['ATTACK TOOL',    dev.tool,        '⚔️','#ff0055'],
                ['FINGERPRINT',    dev.fingerprint, '🔍','#ff6b35'],
                ['LANGUAGE',       dev.language,    '🌍','#00ff9f'],
                ['IP ADDRESS',     attacker.ip,     '📡','#00ff9f'],
                ['COUNTRY',        attacker.country?.name||attacker.country||'Unknown','🗺️','#f9c74f'],
                ['CITY',           attacker.city||'Unknown','📍','#f9c74f'],
              ].map(([l,v,icon,c])=>(
                <div key={l} style={{display:'flex',alignItems:'center',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <div style={{width:30,fontSize:16}}>{icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:9,color:'#555',fontWeight:600,letterSpacing:1}}>{l}</div>
                    <div style={{fontSize:13,color:c,fontWeight:700,marginTop:2}}>{v}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:'#0a0a0f',border:'1px solid rgba(255,107,53,0.2)',borderRadius:10,padding:14}}>
              <div style={{fontSize:10,color:'#ff6b35',letterSpacing:2,marginBottom:7,fontWeight:700}}>⚠️ WHY NO MAC ADDRESS?</div>
              <div style={{fontSize:12,color:'#888',lineHeight:1.7}}>
                MAC addresses only work on local network (Layer 2). Over the internet, MAC is not transmitted.
                HoneyTrap AI captures device fingerprint, OS, browser/tool signature, and IP geolocation instead — 
                which uniquely identifies attackers across sessions.
              </div>
            </div>
          </div>
        )}

        {/* TIMELINE TAB */}
        {tab === 'timeline' && (
          <div>
            <div style={{fontSize:10,color:'#555',letterSpacing:2,marginBottom:12,fontWeight:600}}>ATTACK JOURNEY</div>
            <div style={{display:'flex',gap:14,marginBottom:12,flexWrap:'wrap'}}>
              {[['RECON','#00b4d8'],['EXPLOIT','#ff6b35'],['PERSIST','#9d4edd'],['EXFIL','#ff0055']].map(([k,c])=>(
                <span key={k} style={{fontSize:10,color:c,fontWeight:700}}>■ {k}</span>
              ))}
            </div>
            {raw ? (
              <div style={{background:'#0a0a0f',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:16,position:'relative'}}>
                <div style={{position:'absolute',left:24,top:16,bottom:16,width:1,background:'rgba(255,255,255,0.04)'}} />
                {raw.split('|')
                  .map(p=>p.trim())
                  .filter(p=>p && !p.startsWith('Device:') && !p.startsWith('OS:') && !p.startsWith('Browser:') && !p.startsWith('Tool:') && !p.startsWith('FP:') && !p.startsWith('Lang:') && !p.startsWith('UA:') && !p.startsWith('ts='))
                  .map((cmd,i)=>{
                    const cats=['RECON','RECON','EXPLOIT','EXPLOIT','PERSIST','EXFIL'];
                    const cc={RECON:'#00b4d8',EXPLOIT:'#ff6b35',PERSIST:'#9d4edd',EXFIL:'#ff0055'};
                    const cat=cats[i%cats.length];
                    return (
                      <div key={i} style={{display:'flex',gap:12,marginBottom:12,alignItems:'flex-start'}}>
                        <div style={{width:9,height:9,borderRadius:'50%',background:cc[cat],flexShrink:0,marginTop:4,boxShadow:`0 0 8px ${cc[cat]}`,zIndex:1}} />
                        <div>
                          <span style={{fontSize:9,padding:'1px 7px',borderRadius:3,background:cc[cat]+'22',color:cc[cat],fontWeight:700,marginRight:7}}>{cat}</span>
                          <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:'#00ff9f',marginTop:3}}>$ {cmd}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div style={{background:'#0a0a0f',borderRadius:10,padding:36,textAlign:'center',color:'#555'}}>
                <div style={{fontSize:30,marginBottom:10}}>📋</div>
                <div>No commands captured for this attacker.</div>
              </div>
            )}
          </div>
        )}

        {/* RAW DATA TAB */}
        {tab === 'raw' && (
          <div>
            <div style={{fontSize:10,color:'#555',letterSpacing:2,marginBottom:12,fontWeight:600}}>COMPLETE RAW LOG DATA</div>
            <div style={{background:'#0a0a0f',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:16,marginBottom:10}}>
              <div style={{fontSize:10,color:'#444',marginBottom:8,letterSpacing:1}}>ALL CAPTURED FIELDS:</div>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:'#00ff9f',lineHeight:2,whiteSpace:'pre-wrap',wordBreak:'break-all'}}>
                {raw.split('|').map((part,i)=>(
                  <div key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',paddingBottom:4}}>
                    <span style={{color:'#f9c74f',marginRight:8}}>{i+1}.</span>{part.trim()}
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:'#0a0a0f',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:16}}>
              <div style={{fontSize:10,color:'#444',marginBottom:8,letterSpacing:1}}>ATTACKER RECORD:</div>
              <pre style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:'#f9c74f',lineHeight:1.9,whiteSpace:'pre-wrap',margin:0}}>
{`ID:         ${attacker.id}
IP:         ${attacker.ip}
Country:    ${attacker.country?.name||attacker.country}
City:       ${attacker.city}
Protocol:   ${attacker.protocol}:${attacker.port}
Threat:     ${score}/100
Skill:      ${skill}
Motivation: ${motiv}
Tool:       ${dev.tool}
OS:         ${dev.os}
Browser:    ${dev.browser}
Fingerprint:${dev.fingerprint}
First Seen: ${attacker.date} ${attacker.time}`}
              </pre>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}