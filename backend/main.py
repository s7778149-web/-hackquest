from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import engine, get_db, Base
from models import User, Attacker, Honeypot
from auth import hash_password, verify_password, create_token
from pdf_generator import generate_report
from ai_profiler import generate_attacker_profile, analyze_all_unanalyzed
import models, subprocess, re, json, requests
from datetime import datetime

models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="HoneyTrap AI API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterSchema(BaseModel):
    name: str
    email: str
    password: str
    role: str = "analyst"

class LoginSchema(BaseModel):
    email: str
    password: str

class DemoAttackSchema(BaseModel):
    ip: str
    protocol: str = "HTTP"
    port: int = 8081
    username: str = "admin"
    password: str = "password123"

@app.get("/")
def root():
    return {"message": "HoneyTrap AI Backend Running! 🍯"}

@app.post("/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered!")
    user = User(name=data.name, email=data.email, password=hash_password(data.password), role=data.role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Account created!", "user_id": user.id}

@app.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials!")
    token = create_token({"sub": user.email, "role": user.role})
    return {"token": token, "name": user.name, "email": user.email, "role": user.role}

@app.get("/attackers")
def get_attackers(db: Session = Depends(get_db)):
    return db.query(Attacker).order_by(Attacker.created_at.desc()).limit(100).all()

@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    return {"total_attackers": db.query(Attacker).count()}

def get_ip_info(ip: str):
    try:
        private = ['127.', '172.16.', '172.17.', '172.18.', '172.19.',
                   '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
                   '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
                   '172.30.', '172.31.', '192.168.', '10.', '::1']
        if any(ip.startswith(p) for p in private) or ip in ['localhost', '0.0.0.0']:
            return {'country': 'Local Network', 'city': 'Local', 'isp': 'Internal', 'org': 'Internal', 'region': 'Local'}
        res = requests.get(
            f'http://ip-api.com/json/{ip}?fields=status,country,city,isp,org,lat,lon,regionName',
            timeout=5
        )
        data = res.json()
        if data.get('status') == 'success':
            return {
                'country': data.get('country', 'Unknown'),
                'city': data.get('city', 'Unknown'),
                'isp': data.get('isp', 'Unknown'),
                'org': data.get('org', 'Unknown'),
                'region': data.get('regionName', 'Unknown'),
            }
    except:
        pass
    return {'country': 'Unknown', 'city': 'Unknown', 'isp': 'Unknown', 'org': 'Unknown', 'region': 'Unknown'}

def get_cowrie_logs():
    try:
        result = subprocess.run(
            ['docker', 'logs', '--tail', '1000', 'cowrie-honeypot'],
            capture_output=True, text=True, timeout=15
        )
        return result.stdout + result.stderr
    except:
        return ""

def parse_cowrie(logs):
    attacks = []
    for line in logs.split('\n'):
        if 'login attempt' in line:
            try:
                cred = re.search(r"login attempt \[b?'?(.+?)'?/b?'?(.+?)'?\]", line)
                ip_m = re.search(r'([\d.]+)\]', line)
                if cred and ip_m:
                    attacks.append({
                        'type': 'login',
                        'ip': ip_m.group(1),
                        'username': cred.group(1),
                        'password': cred.group(2),
                    })
            except: pass
        if 'CMD:' in line:
            try:
                cmd_m = re.search(r'CMD: (.+)$', line)
                ip_m = re.search(r'([\d.]+)\]', line)
                if cmd_m and ip_m:
                    attacks.append({
                        'type': 'command',
                        'ip': ip_m.group(1),
                        'command': cmd_m.group(1).strip(),
                    })
            except: pass
    return attacks

# ── MAIN SYNC ROUTE ──────────────────────────────────
@app.get("/honeypot/sync")
def sync_honeypot(db: Session = Depends(get_db)):
    saved = 0
    errors = []

    # ══════════════════════════════════════════════
    # SSH SYNC — reads Cowrie logs
    # ══════════════════════════════════════════════
    try:
        logs = get_cowrie_logs()
        attacks = parse_cowrie(logs)

        # Group commands per IP
        ip_cmds = {}
        for a in attacks:
            if a['type'] == 'command':
                ip_cmds.setdefault(a['ip'], []).append(a['command'])

        # Save each unique login attempt (use username+password as key)
        processed_ssh = set()
        for a in attacks:
            if a['type'] != 'login':
                continue
            ip = a['ip']
            u = a['username']
            p = a['password']
            key = f"{ip}|{u}|{p}"
            if key in processed_ssh:
                continue
            processed_ssh.add(key)

            # Check if this exact attempt already in DB
            existing = db.query(Attacker).filter(
                Attacker.ip_address == ip,
                Attacker.protocol == 'SSH',
                Attacker.commands.contains(f'user={u} pass={p}')
            ).first()

            if not existing:
                ip_info = get_ip_info(ip)
                cmds = ip_cmds.get(ip, [])
                attacker = Attacker(
                    ip_address=ip,
                    country=ip_info['country'],
                    city=ip_info['city'],
                    protocol='SSH',
                    port=2222,
                    skill_level='Unknown',
                    threat_score=65.0,
                    motivation='Credential harvest',
                    tools_used='SSH Brute Force Tool',
                    commands=f'user={u} pass={p} | cmds: {",".join(cmds)}',
                    ai_summary='Pending AI analysis...'
                )
                db.add(attacker)
                try:
                    db.commit()
                    saved += 1
                    print(f"✅ SSH saved: {ip} | {u}/{p}")
                except Exception as e:
                    db.rollback()
                    errors.append(f"SSH commit error: {e}")
    except Exception as e:
        errors.append(f"SSH sync error: {e}")
        print(f"❌ SSH sync error: {e}")

    # ══════════════════════════════════════════════
    # HTTP SYNC — reads http_honeypot.json
    # Uses TIMESTAMP as unique key so EVERY attack is saved
    # ══════════════════════════════════════════════
    try:
        result = subprocess.run(
            ['docker', 'exec', 'http-honeypot', 'sh', '-c',
             'cat /logs/http_honeypot.json 2>/dev/null || echo ""'],
            capture_output=True, text=True, timeout=15
        )
        raw_output = result.stdout.strip()
        lines = [l.strip() for l in raw_output.split('\n') if l.strip()]
        print(f"📋 HTTP log lines found: {len(lines)}")

        for line in lines:
            try:
                event = json.loads(line)

                # Only process login attempts
                if event.get('event') != 'login_attempt':
                    continue

                ip = event.get('ip', '').strip()
                timestamp = event.get('timestamp', '')
                username = event.get('data', {}).get('username', '').strip()
                password = event.get('data', {}).get('password', '').strip()
                device_info = event.get('device_info', {})

                # Skip if no IP
                if not ip or ip in ['', '0.0.0.0', 'unknown']:
                    print(f"⚠️ Skipping - no IP in log: {line[:80]}")
                    continue

                # USE TIMESTAMP AS UNIQUE KEY
                # This ensures EVERY attack attempt is saved, even repeats
                existing = db.query(Attacker).filter(
                    Attacker.commands.contains(f'ts={timestamp}')
                ).first()

                if existing:
                    continue  # Already saved this exact event

                # Get device details
                device_type = device_info.get('device_type', 'Unknown')
                os_info = device_info.get('os', 'Unknown')
                browser = device_info.get('browser', 'Unknown')
                attack_tool = device_info.get('attack_tool', 'Browser')
                fingerprint = device_info.get('fingerprint', 'N/A')
                language = device_info.get('language', 'Unknown')
                ua = device_info.get('user_agent', 'Unknown')

                # Calculate threat score
                threat = 35
                if attack_tool in ['Hydra Brute Force', 'Python Attack Script']:
                    threat = 80
                elif attack_tool in ['curl HTTP Tool', 'wget Download Tool']:
                    threat = 65
                elif attack_tool in ['SQLMap SQL Injection', 'Nikto Web Scanner']:
                    threat = 85
                elif attack_tool == 'Browser':
                    threat = 45
                threat = min(95, threat + (len(password) % 10))

                ip_info = get_ip_info(ip)

                tools_desc = f"{attack_tool} | {browser} on {os_info}"
                cmds = (
                    f"POST /login user={username} pass={password} | "
                    f"ts={timestamp} | "
                    f"Device:{device_type} | "
                    f"OS:{os_info} | "
                    f"Browser:{browser} | "
                    f"Tool:{attack_tool} | "
                    f"Lang:{language} | "
                    f"FP:{fingerprint} | "
                    f"UA:{ua[:100]}"
                )

                attacker = Attacker(
                    ip_address=ip,
                    country=ip_info['country'],
                    city=ip_info['city'],
                    protocol='HTTP',
                    port=8081,
                    skill_level='Unknown',
                    threat_score=float(threat),
                    motivation='Credential harvest',
                    tools_used=tools_desc,
                    commands=cmds,
                    ai_summary='Pending AI analysis...'
                )
                db.add(attacker)
                try:
                    db.commit()
                    saved += 1
                    print(f"✅ HTTP saved: {ip} | {username}/{password} | {attack_tool} | {os_info}")
                except Exception as e:
                    db.rollback()
                    errors.append(f"HTTP commit error: {e}")

            except json.JSONDecodeError as e:
                print(f"⚠️ JSON parse error: {e} | line: {line[:60]}")
            except Exception as e:
                print(f"⚠️ HTTP event error: {e}")
                errors.append(str(e))

    except subprocess.TimeoutExpired:
        errors.append("Docker exec timed out")
        print("❌ Docker exec timed out")
    except Exception as e:
        errors.append(f"HTTP sync error: {e}")
        print(f"❌ HTTP sync error: {e}")

    print(f"🎯 Sync complete: {saved} new attacks saved")
    return {
        "message": f"Sync complete! {saved} new attacks saved.",
        "new_attackers_saved": saved,
        "errors": errors
    }

# ── HONEYPOT STATUS ROUTES ───────────────────────────
@app.get("/honeypot/status")
def honeypot_status():
    result = subprocess.run(['docker','ps','--filter','name=cowrie-honeypot','--format','{{.Status}}'], capture_output=True, text=True)
    status = result.stdout.strip()
    return {"name":"Cowrie SSH","status":"running" if "Up" in status else "stopped","port":2222,"protocol":"SSH","docker_status":status}

@app.get("/honeypot/logs")
def get_logs():
    logs = get_cowrie_logs()
    return {"total": len(parse_cowrie(logs)), "events": parse_cowrie(logs)[:50]}

@app.get("/honeypot/start")
def start_honeypot():
    r = subprocess.run(['docker','start','cowrie-honeypot'], capture_output=True, text=True)
    return {"message": "Started!", "output": r.stdout}

@app.get("/honeypot/stop")
def stop_honeypot():
    r = subprocess.run(['docker','stop','cowrie-honeypot'], capture_output=True, text=True)
    return {"message": "Stopped!", "output": r.stdout}

@app.get("/honeypot/http/status")
def http_status():
    result = subprocess.run(['docker','ps','--filter','name=http-honeypot','--format','{{.Status}}'], capture_output=True, text=True)
    status = result.stdout.strip()
    return {"name":"HTTP Honeypot","status":"running" if "Up" in status else "stopped","port":8081,"protocol":"HTTP"}

@app.get("/honeypot/http/logs")
def get_http_logs():
    try:
        result = subprocess.run(
            ['docker','exec','http-honeypot','sh','-c','cat /logs/http_honeypot.json 2>/dev/null || echo ""'],
            capture_output=True, text=True, timeout=10
        )
        lines = [l for l in result.stdout.strip().split('\n') if l.strip()]
        events = []
        for line in lines:
            try: events.append(json.loads(line))
            except: pass
        return {"total": len(events), "events": events[-100:]}
    except Exception as e:
        return {"error": str(e), "events": []}

@app.get("/honeypot/ftp/status")
def ftp_status():
    result = subprocess.run(['docker','ps','--filter','name=ftp-honeypot','--format','{{.Status}}'], capture_output=True, text=True)
    status = result.stdout.strip()
    return {"name":"FTP Honeypot","status":"running" if "Up" in status else "stopped","port":2121,"protocol":"FTP"}

@app.get("/honeypot/ftp/logs")
def get_ftp_logs():
    try:
        result = subprocess.run(['docker','exec','ftp-honeypot','sh','-c','cat /logs/ftp_honeypot.json 2>/dev/null || echo ""'], capture_output=True, text=True)
        lines = [l for l in result.stdout.strip().split('\n') if l.strip()]
        events = []
        for line in lines: 
            try: events.append(json.loads(line))
            except: pass
        return {"total": len(events), "events": events[-20:]}
    except Exception as e:
        return {"error": str(e), "events": []}

@app.get("/honeypot/all-status")
def all_status():
    def check(name, port, proto):
        r = subprocess.run(['docker','ps','--filter',f'name={name}','--format','{{.Status}}'], capture_output=True, text=True)
        s = r.stdout.strip()
        return {"name":name,"status":"running" if "Up" in s else "stopped","port":port,"protocol":proto}
    return {
        "ssh":  check("cowrie-honeypot", 2222, "SSH"),
        "http": check("http-honeypot",   8081, "HTTP"),
        "ftp":  check("ftp-honeypot",    2121, "FTP"),
    }

# ── AI ROUTES ────────────────────────────────────────
@app.get("/ai/analyze/{attacker_id}")
def analyze_attacker(attacker_id: int, db: Session = Depends(get_db)):
    attacker = db.query(Attacker).filter(Attacker.id == attacker_id).first()
    if not attacker:
        raise HTTPException(status_code=404, detail="Attacker not found!")
    profile = generate_attacker_profile({
        'ip_address': attacker.ip_address,
        'country': attacker.country,
        'protocol': attacker.protocol,
        'port': attacker.port,
        'commands': attacker.commands,
        'tools_used': attacker.tools_used,
    })
    attacker.skill_level  = profile.get('skill_level', 'Unknown')
    attacker.motivation   = profile.get('motivation', 'Unknown')
    attacker.threat_score = float(profile.get('threat_score', 50))
    attacker.tools_used   = profile.get('tools_detected', attacker.tools_used)
    attacker.ai_summary   = profile.get('ai_summary', 'Analysis complete.')
    db.commit()
    return {"message": "AI analysis complete!", "attacker_ip": attacker.ip_address, "profile": profile}

@app.get("/ai/analyze-all")
def analyze_all(db: Session = Depends(get_db)):
    count = analyze_all_unanalyzed(db)
    return {"message": f"AI analyzed {count} attackers!", "count": count}

# ── DEMO ATTACK ─────────────────────────────────────
@app.post("/demo/attack")
def demo_attack(data: DemoAttackSchema, db: Session = Depends(get_db)):
    ip_info = get_ip_info(data.ip)
    ts = datetime.now().isoformat()
    attacker = Attacker(
        ip_address=data.ip,
        country=ip_info['country'],
        city=ip_info['city'],
        protocol=data.protocol,
        port=data.port,
        skill_level='Unknown',
        threat_score=float(50 + abs(hash(data.ip + ts)) % 40),
        motivation='Credential harvest',
        tools_used='Web Browser | Chrome | Windows',
        commands=(
            f"POST /login user={data.username} pass={data.password} | "
            f"ts={ts} | Device:Desktop | OS:Windows | "
            f"Browser:Chrome | Tool:Browser | Lang:en-US | FP:demo{abs(hash(ts))%9999:04d}"
        ),
        ai_summary='Pending AI analysis...'
    )
    db.add(attacker)
    db.commit()
    return {"message": f"Demo attack from {data.ip}", "country": ip_info['country'], "city": ip_info['city']}

# ── BLOCK / UNBLOCK ──────────────────────────────────
@app.post("/block/{ip}")
def block_ip(ip: str, db: Session = Depends(get_db)):
    # Update database
    attackers = db.query(Attacker).filter(Attacker.ip_address == ip).all()
    for a in attackers:
        a.skill_level = "BLOCKED"
        if not str(a.motivation or '').startswith("BLOCKED"):
            a.motivation = "BLOCKED — " + str(a.motivation or 'Unknown')
    db.commit()

    results = {}

    # Windows Firewall - Inbound block
    try:
        r1 = subprocess.run([
            'netsh', 'advfirewall', 'firewall', 'add', 'rule',
            f'name=HoneyTrap_IN_{ip.replace(".", "_")}',
            'dir=in', 'action=block', f'remoteip={ip}', 'enable=yes', 'profile=any'
        ], capture_output=True, text=True, timeout=10)
        results['firewall_in'] = 'added' if r1.returncode == 0 else r1.stderr.strip()
    except Exception as e:
        results['firewall_in'] = str(e)

    # Windows Firewall - Outbound block
    try:
        r2 = subprocess.run([
            'netsh', 'advfirewall', 'firewall', 'add', 'rule',
            f'name=HoneyTrap_OUT_{ip.replace(".", "_")}',
            'dir=out', 'action=block', f'remoteip={ip}', 'enable=yes', 'profile=any'
        ], capture_output=True, text=True, timeout=10)
        results['firewall_out'] = 'added' if r2.returncode == 0 else r2.stderr.strip()
    except Exception as e:
        results['firewall_out'] = str(e)

    # Also block in Docker honeypot container
    try:
        r3 = subprocess.run([
            'docker', 'exec', 'http-honeypot', 'sh', '-c',
            f'echo "{ip}" >> /logs/blocked_ips.txt'
        ], capture_output=True, text=True, timeout=5)
        results['docker_block'] = 'added' if r3.returncode == 0 else r3.stderr.strip()
    except Exception as e:
        results['docker_block'] = str(e)

    print(f"🚫 BLOCKED: {ip} | Results: {results}")
    return {
        "message": f"IP {ip} has been blocked!",
        "ip": ip,
        "status": "blocked",
        "firewall_rules": results
    }

@app.post("/unblock/{ip}")
def unblock_ip(ip: str, db: Session = Depends(get_db)):
    # Update database
    attackers = db.query(Attacker).filter(Attacker.ip_address == ip).all()
    for a in attackers:
        a.skill_level = "Unknown"
        if str(a.motivation or '').startswith("BLOCKED — "):
            a.motivation = a.motivation.replace("BLOCKED — ", "")
    db.commit()

    results = {}

    # Remove inbound rule
    try:
        r1 = subprocess.run([
            'netsh', 'advfirewall', 'firewall', 'delete', 'rule',
            f'name=HoneyTrap_IN_{ip.replace(".", "_")}'
        ], capture_output=True, text=True, timeout=10)
        results['firewall_in'] = 'removed' if r1.returncode == 0 else 'not found'
    except Exception as e:
        results['firewall_in'] = str(e)

    # Remove outbound rule
    try:
        r2 = subprocess.run([
            'netsh', 'advfirewall', 'firewall', 'delete', 'rule',
            f'name=HoneyTrap_OUT_{ip.replace(".", "_")}'
        ], capture_output=True, text=True, timeout=10)
        results['firewall_out'] = 'removed' if r2.returncode == 0 else 'not found'
    except Exception as e:
        results['firewall_out'] = str(e)

    # Remove from Docker block list
    try:
        r3 = subprocess.run([
            'docker', 'exec', 'http-honeypot', 'sh', '-c',
            f'sed -i "/{ip}/d" /logs/blocked_ips.txt 2>/dev/null || true'
        ], capture_output=True, text=True, timeout=5)
        results['docker_block'] = 'removed'
    except Exception as e:
        results['docker_block'] = str(e)

    print(f"✅ UNBLOCKED: {ip} | Results: {results}")
    return {
        "message": f"IP {ip} has been unblocked!",
        "ip": ip,
        "status": "unblocked",
        "firewall_rules": results
    }

@app.get("/blocked-ips")
def get_blocked_ips(db: Session = Depends(get_db)):
    blocked = db.query(Attacker).filter(Attacker.skill_level == "BLOCKED").all()
    return {"total": len(blocked), "ips": list(set(a.ip_address for a in blocked))}

# ── PDF REPORT ───────────────────────────────────────
@app.get("/report/download")
def download_report(db: Session = Depends(get_db)):
    attackers = db.query(Attacker).order_by(Attacker.created_at.desc()).all()
    attacker_list = [{
        'ip_address': a.ip_address, 'country': a.country, 'city': a.city,
        'protocol': a.protocol, 'port': a.port, 'skill_level': a.skill_level,
        'threat_score': a.threat_score, 'motivation': a.motivation,
        'tools_used': a.tools_used, 'ai_summary': a.ai_summary,
        'created_at': str(a.created_at),
    } for a in attackers]
    pdf_bytes = generate_report(attacker_list, {'total_attackers': len(attacker_list)})
    filename = f"honeytrap_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={filename}"})