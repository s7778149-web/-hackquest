from flask import Flask, request, jsonify, render_template_string
import json, datetime, os, hashlib

app = Flask(__name__)
LOG_FILE = "/logs/http_honeypot.json"

def get_real_ip():
    """Get real attacker IP - checks ALL possible headers"""
    # ngrok sends real client IP in X-Forwarded-For
    xff = request.headers.get('X-Forwarded-For', '')
    if xff:
        # Can be comma separated - take FIRST one (original client)
        first_ip = xff.split(',')[0].strip()
        if first_ip:
            return first_ip
    
    # Try other headers
    for header in ['X-Real-IP', 'CF-Connecting-IP', 'True-Client-IP']:
        val = request.headers.get(header, '').strip()
        if val:
            return val
    
    return request.remote_addr or '0.0.0.0'

def detect_device(ua):
    """Detect device type, OS, browser and attack tools from User-Agent"""
    ua_lower = ua.lower()
    
    # Detect attack tools
    if 'hydra' in ua_lower:
        return 'Attack Tool', 'Kali Linux', 'Hydra', 'Hydra Brute Force'
    if 'sqlmap' in ua_lower:
        return 'Attack Tool', 'Kali Linux', 'SQLMap', 'SQLMap SQL Injection'
    if 'nmap' in ua_lower:
        return 'Scanner', 'Linux', 'Nmap', 'Nmap Port Scanner'
    if 'masscan' in ua_lower:
        return 'Scanner', 'Linux', 'Masscan', 'Masscan Port Scanner'
    if 'nikto' in ua_lower:
        return 'Scanner', 'Linux', 'Nikto', 'Nikto Web Scanner'
    if 'python-requests' in ua_lower or 'python/' in ua_lower:
        return 'Script', 'Python', 'Python Requests', 'Python Attack Script'
    if 'curl/' in ua_lower:
        return 'Terminal', 'Linux/Terminal', 'curl', 'curl HTTP Tool'
    if 'wget' in ua_lower:
        return 'Terminal', 'Linux/Terminal', 'wget', 'wget Download Tool'
    if 'go-http-client' in ua_lower:
        return 'Script', 'Go Runtime', 'Go HTTP', 'Go HTTP Scanner'
    if 'zgrab' in ua_lower:
        return 'Scanner', 'Linux', 'ZGrab', 'ZGrab Scanner'
    if 'burp' in ua_lower:
        return 'Attack Tool', 'Any', 'Burp Suite', 'Burp Suite Web Tester'

    # Detect OS
    if 'windows nt 10' in ua_lower or 'windows nt 11' in ua_lower:
        os_name = 'Windows 10/11'
    elif 'windows' in ua_lower:
        os_name = 'Windows'
    elif 'kali' in ua_lower:
        os_name = 'Kali Linux'
    elif 'ubuntu' in ua_lower:
        os_name = 'Ubuntu Linux'
    elif 'linux' in ua_lower:
        os_name = 'Linux'
    elif 'android' in ua_lower:
        os_name = 'Android'
    elif 'iphone' in ua_lower or 'ipad' in ua_lower:
        os_name = 'iOS'
    elif 'mac os x' in ua_lower or 'macos' in ua_lower:
        os_name = 'macOS'
    else:
        os_name = 'Unknown OS'

    # Detect device type
    if any(x in ua_lower for x in ['mobile', 'android', 'iphone', 'ipad']):
        device_type = 'Mobile'
    else:
        device_type = 'Desktop'

    # Detect browser
    if 'firefox/' in ua_lower:
        browser = 'Firefox'
    elif 'edg/' in ua_lower:
        browser = 'Edge'
    elif 'chrome/' in ua_lower:
        browser = 'Chrome'
    elif 'safari/' in ua_lower:
        browser = 'Safari'
    elif 'opera' in ua_lower:
        browser = 'Opera'
    else:
        browser = 'Unknown Browser'

    return device_type, os_name, browser, 'Browser'

def get_device_info():
    ua = request.headers.get('User-Agent', 'Unknown')
    device_type, os_name, browser, attack_tool = detect_device(ua)
    
    # Generate fingerprint from multiple headers
    fp_data = ''.join([
        ua,
        request.headers.get('Accept', ''),
        request.headers.get('Accept-Language', ''),
        request.headers.get('Accept-Encoding', ''),
        request.headers.get('Connection', ''),
    ])
    fingerprint = hashlib.sha256(fp_data.encode()).hexdigest()[:16]
    
    return {
        'device_type': device_type,
        'os': os_name,
        'browser': browser,
        'attack_tool': attack_tool,
        'user_agent': ua,
        'language': request.headers.get('Accept-Language', 'Unknown'),
        'fingerprint': fingerprint,
        'x_forwarded_for': request.headers.get('X-Forwarded-For', 'none'),
        'content_type': request.headers.get('Content-Type', 'Unknown'),
    }

def log_event(event_type, ip, data):
    """Log EVERY event with unique timestamp - never skip duplicates"""
    os.makedirs("/logs", exist_ok=True)
    device_info = get_device_info()
    entry = {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "event": event_type,
        "ip": ip,
        "device_info": device_info,
        "data": data
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")
        f.flush()  # Force write immediately
    print(f"[HONEYPOT] {event_type} | IP={ip} | Tool={device_info['attack_tool']} | OS={device_info['os']}")

LOGIN_PAGE = """<!DOCTYPE html>
<html>
<head>
    <title>SecureCorp Admin Portal</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;display:flex;justify-content:center;align-items:center;min-height:100vh}
        .box{background:white;padding:48px 40px;border-radius:12px;box-shadow:0 4px 32px rgba(0,0,0,0.12);width:400px}
        .logo{text-align:center;margin-bottom:6px;font-size:40px}
        h2{text-align:center;color:#1a1a2e;font-size:24px;margin-bottom:4px;font-weight:700}
        .sub{text-align:center;color:#999;font-size:13px;margin-bottom:32px}
        label{display:block;font-size:11px;font-weight:700;color:#555;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.8px}
        input{width:100%;padding:13px 16px;border:1.5px solid #e0e0e0;border-radius:8px;font-size:14px;margin-bottom:20px;outline:none;transition:all 0.2s}
        input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,0.1)}
        button{width:100%;padding:14px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;letter-spacing:0.3px}
        button:hover{opacity:0.92}
        .footer{text-align:center;margin-top:20px;font-size:12px;color:#bbb}
        .badge{position:fixed;bottom:12px;right:12px;font-size:10px;color:#ccc;background:#f5f5f5;padding:4px 8px;border-radius:4px}
    </style>
</head>
<body>
    <div class="box">
        <div class="logo">🏢</div>
        <h2>SecureCorp Admin</h2>
        <div class="sub">Employee Portal — Internal Use Only</div>
        <form method="POST" action="/login">
            <label>Username / Email</label>
            <input type="text" name="username" placeholder="admin@securecorp.com" autocomplete="off" />
            <label>Password</label>
            <input type="password" name="password" placeholder="••••••••••••" />
            <button type="submit">Sign In →</button>
        </form>
        <div class="footer">Need help? Contact IT Support: ext. 4200</div>
    </div>
    <div class="badge">SecureCorp Portal v2.4.1</div>
</body>
</html>"""

SESSION_EXPIRED = """<!DOCTYPE html>
<html>
<head><title>Session Expired</title>
<style>
    body{font-family:sans-serif;background:#f0f2f5;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
    .box{background:white;padding:44px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.1);text-align:center;max-width:420px}
    h2{color:#dc2626;margin-bottom:12px}p{color:#666;line-height:1.6;margin-bottom:6px}
    a{display:inline-block;margin-top:20px;padding:11px 28px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600}
    .code{background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 14px;font-family:monospace;font-size:12px;color:#dc2626;margin-top:12px;display:inline-block}
</style>
</head>
<body>
    <div class="box">
        <h2>⚠️ Session Expired</h2>
        <p>Your session has expired or you are not authorized to access this resource.</p>
        <p>Please sign in again or contact your administrator.</p>
        <div class="code">ERR: SESSION_EXPIRED_403</div><br/>
        <a href="/">← Return to Login</a>
    </div>
</body>
</html>"""

@app.route('/')
def home():
    ip = get_real_ip()
    log_event("page_visit", ip, {"path": "/"})
    return render_template_string(LOGIN_PAGE)

@app.route('/login', methods=['POST'])
def login():
    ip = get_real_ip()
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '').strip()
    log_event("login_attempt", ip, {
        "username": username,
        "password": password,
    })
    return render_template_string(SESSION_EXPIRED)

@app.route('/admin')
@app.route('/wp-admin')
@app.route('/administrator')
@app.route('/phpmyadmin')
@app.route('/admin.php')
@app.route('/login.php')
@app.route('/.env')
@app.route('/config.php')
@app.route('/backup')
def fake_admin():
    ip = get_real_ip()
    log_event("admin_probe", ip, {"path": request.path})
    return render_template_string(LOGIN_PAGE)

@app.route('/api/check')
def check():
    ip = get_real_ip()
    return jsonify({
        "status": "honeypot_active",
        "your_real_ip": ip,
        "remote_addr": request.remote_addr,
        "x_forwarded_for": request.headers.get('X-Forwarded-For', 'none'),
        "x_real_ip": request.headers.get('X-Real-IP', 'none'),
        "all_headers": dict(request.headers),
        "device": get_device_info()
    })

@app.route('/api/logs/count')
def log_count():
    try:
        count = 0
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, 'r') as f:
                count = sum(1 for l in f if l.strip())
        return jsonify({"total": count, "file": LOG_FILE})
    except Exception as e:
        return jsonify({"error": str(e), "total": 0})

if __name__ == '__main__':
    print("[HTTP HONEYPOT] Starting on 0.0.0.0:8080")
    app.run(host='0.0.0.0', port=8080, debug=False)