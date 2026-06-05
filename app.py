from flask import Flask, render_template, request, redirect, session, jsonify
import sqlite3, bcrypt, random
from datetime import date

app = Flask(__name__)
app.secret_key = "hackquest_secret_123"
import os
DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hackquest.db")
# ── DATABASE ──────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        xp       INTEGER DEFAULT 0,
        avatar   TEXT DEFAULT '😎',
        bio      TEXT DEFAULT 'Just started hacking!'
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS solved (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        username     TEXT NOT NULL,
        challenge_id INTEGER NOT NULL
    )''')
    conn.commit()
    conn.close()

def get_user(username):
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username=?", (username,))
    u = c.fetchone()
    conn.close()
    return u

def add_user(username, password):
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("INSERT INTO users (username,password) VALUES (?,?)", (username, hashed))
    conn.commit()
    conn.close()

def check_password(password, hashed):
    return bcrypt.checkpw(password.encode(), hashed.encode())

def get_xp(username):
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("SELECT xp FROM users WHERE username=?", (username,))
    r = c.fetchone()
    conn.close()
    return r[0] if r else 0

def add_xp(username, amount):
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("UPDATE users SET xp=xp+? WHERE username=?", (amount, username))
    conn.commit()
    conn.close()

def get_solved(username):
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("SELECT challenge_id FROM solved WHERE username=?", (username,))
    rows = c.fetchall()
    conn.close()
    return [r[0] for r in rows]

def mark_solved(username, cid):
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("INSERT INTO solved (username,challenge_id) VALUES (?,?)", (username, cid))
    conn.commit()
    conn.close()

def get_leaderboard():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute('''SELECT u.username, u.xp, u.avatar, COUNT(s.id)
                 FROM users u LEFT JOIN solved s ON u.username=s.username
                 GROUP BY u.username ORDER BY u.xp DESC''')
    rows = c.fetchall()
    conn.close()
    return [{"name":r[0],"xp":r[1],"avatar":r[2],"solved":r[3]} for r in rows]

def get_rank(username):
    for i,p in enumerate(get_leaderboard()):
        if p["name"] == username: return i+1
    return "-"

def update_profile(username, avatar, bio):
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("UPDATE users SET avatar=?, bio=? WHERE username=?", (avatar, bio, username))
    conn.commit()
    conn.close()

def get_profile(username):
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("SELECT avatar, bio FROM users WHERE username=?", (username,))
    r = c.fetchone()
    conn.close()
    return r if r else ("😎", "Just started hacking!")

# ── CHALLENGES DATA ───────────────────────────────────────
challenges = [
    {"id":1,"title":"SQL Injection 101","category":"Web Hacking","difficulty":"Easy","xp":100,"icon":"💉",
     "desc":"A login form is vulnerable to SQL injection. Bypass it without knowing the password.",
     "hint":"Try entering:  ' OR '1'='1  as the username field.",
     "flag":"flag{sql_bypass_easy}"},
    {"id":2,"title":"Caesar Cipher Crack","category":"Cryptography","difficulty":"Easy","xp":100,"icon":"🔑",
     "desc":"Decode this secret message encrypted with Caesar Cipher (shift 3): 'KDFTXHVW LV IXQ'",
     "hint":"Shift each letter BACK by 3. H→E, D→A, F→C ...",
     "flag":"flag{hackquest_is_fun}"},
    {"id":3,"title":"XSS Cookie Stealer","category":"Web Hacking","difficulty":"Medium","xp":200,"icon":"🍪",
     "desc":"A website reflects user input without sanitizing. Inject a script to steal cookies.",
     "hint":"Try: <script>alert(document.cookie)</script> in a search box.",
     "flag":"flag{xss_cookie_stolen}"},
    {"id":4,"title":"Wireshark Packet Hunt","category":"Network","difficulty":"Medium","xp":200,"icon":"🦈",
     "desc":"Analyze this raw HTTP request and find the hidden password: POST /login | username=admin&password=s3cr3t_p4ss",
     "hint":"HTTP sends POST data in plain text — look at the request body carefully.",
     "flag":"flag{network_sniffed}"},
    {"id":5,"title":"Base64 Decode","category":"Cryptography","difficulty":"Easy","xp":100,"icon":"🔓",
     "desc":"Decode this Base64 string: ZmxhZ3tiYXNlNjRfaXNfbm90X2VuY3J5cHRpb259",
     "hint":"Python: import base64; base64.b64decode('ZmxhZ3tiYXNlNjRfaXNfbm90X2VuY3J5cHRpb259')",
     "flag":"flag{base64_is_not_encryption}"},
    {"id":6,"title":"Directory Traversal","category":"Web Hacking","difficulty":"Hard","xp":300,"icon":"📁",
     "desc":"Access a secret file on the server by manipulating the file path in the URL.",
     "hint":"Try: ../../../../etc/passwd in the path parameter.",
     "flag":"flag{traversal_master}"},
    {"id":7,"title":"Hash Cracking","category":"Cryptography","difficulty":"Medium","xp":200,"icon":"🔨",
     "desc":"A leaked database has this MD5 hash: 5f4dcc3b5aa765d61d8327deb882cf99. Crack it!",
     "hint":"Use a rainbow table or try common passwords. This is a very famous hash...",
     "flag":"flag{password_is_weak}"},
    {"id":8,"title":"Hidden in Plain Sight","category":"Forensics","difficulty":"Easy","xp":100,"icon":"🖼️",
     "desc":"Steganography hides data inside files. Find the flag hidden in the image metadata.",
     "hint":"Try: strings image.png | grep flag  OR check the EXIF metadata.",
     "flag":"flag{stego_master}"},
    {"id":9,"title":"Brute Force Login","category":"Web Hacking","difficulty":"Medium","xp":200,"icon":"🔓",
     "desc":"No rate limiting on the login. Username is 'admin'. Wordlist: [password, admin, 123456, letmein, admin123]",
     "hint":"Try each password manually. The correct one is very common!",
     "flag":"flag{brute_force_success}"},
    {"id":10,"title":"JWT Token Forge","category":"Web Hacking","difficulty":"Hard","xp":300,"icon":"🎫",
     "desc":"App uses JWT with algorithm:none vulnerability. Token: eyJhbGciOiJub25lIn0.eyJ1c2VyIjoiZ3Vlc3QifQ. Become admin.",
     "hint":"Decode the base64 payload, change 'guest' to 'admin', re-encode with alg:none.",
     "flag":"flag{jwt_forged}"},
    {"id":11,"title":"ARP Spoofing Concept","category":"Network","difficulty":"Hard","xp":300,"icon":"🕸️",
     "desc":"In an ARP spoofing attack on 192.168.1.0/24, what type of attack allows intercepting traffic?",
     "hint":"ARP spoofing maps the gateway IP to the attacker's MAC. Think about the attack name.",
     "flag":"flag{mitm_arp_spoof}"},
    {"id":12,"title":"Reverse Shell Basics","category":"Linux","difficulty":"Hard","xp":300,"icon":"💻",
     "desc":"A reverse shell connects BACK to the attacker. What netcat command opens a listener on port 4444?",
     "hint":"netcat listener syntax: nc -[flags] -p [port]. Think: listen + verbose + port.",
     "flag":"flag{nc_lvp_4444}"},
]

# ── QUIZ QUESTIONS ────────────────────────────────────────
questions = [
    {"question":"What does SQL stand for?","options":["Structured Query Language","Simple Query Logic","Secure Query Layer","System Query Link"],"answer":0,"explanation":"SQL = Structured Query Language — used to manage relational databases."},
    {"question":"Which attack injects malicious scripts into web pages?","options":["CSRF","XSS","Buffer Overflow","SQLi"],"answer":1,"explanation":"XSS (Cross-Site Scripting) injects scripts that run in victims' browsers."},
    {"question":"What port does HTTPS use by default?","options":["80","21","443","8080"],"answer":2,"explanation":"HTTPS uses port 443 with SSL/TLS encryption, while HTTP uses port 80."},
    {"question":"What does CTF stand for in cybersecurity?","options":["Capture The Flag","Cyber Threat Framework","Control Test File","Code Transfer Format"],"answer":0,"explanation":"CTF competitions challenge participants to find hidden flags in vulnerable systems."},
    {"question":"Which tool is used to scan open ports?","options":["Wireshark","Burp Suite","Nmap","Metasploit"],"answer":2,"explanation":"Nmap (Network Mapper) is the most popular port scanner used by security professionals."},
    {"question":"What is a Brute Force attack?","options":["Stealing cookies","Trying all password combinations","Injecting SQL","Sniffing packets"],"answer":1,"explanation":"Brute force systematically tries every possible combination until the correct one is found."},
    {"question":"What does VPN stand for?","options":["Virtual Private Network","Verified Public Node","Visual Packet Navigator","Virtual Protocol Net"],"answer":0,"explanation":"A VPN encrypts internet traffic and masks your IP address for privacy."},
    {"question":"Which layer does a firewall mainly operate on?","options":["Application","Physical","Network","Session"],"answer":2,"explanation":"Firewalls primarily work at the Network layer filtering IP packets based on rules."},
    {"question":"What is phishing?","options":["Port scanning","Fake communications to steal info","Encrypting data","Network sniffing"],"answer":1,"explanation":"Phishing tricks users into revealing sensitive info via fake emails or websites."},
    {"question":"What does 2FA stand for?","options":["Two Factor Authentication","Two File Access","Transfer File Auth","Two Firewall Access"],"answer":0,"explanation":"2FA adds a second verification step beyond just a password for better security."},
    {"question":"Which algorithm is used for password hashing?","options":["AES","RSA","bcrypt","Base64"],"answer":2,"explanation":"bcrypt is specifically designed for password hashing with built-in salting."},
    {"question":"What is social engineering?","options":["Building secure systems","Manipulating people to reveal info","Writing secure code","Scanning networks"],"answer":1,"explanation":"Social engineering exploits human psychology rather than technical vulnerabilities."},
    {"question":"What does OWASP stand for?","options":["Open Web App Security Project","Online Web Attack System","Open Worldwide Access Security","Official Web App Standards"],"answer":0,"explanation":"OWASP publishes the famous Top 10 list of most critical web security risks."},
    {"question":"What is a zero-day vulnerability?","options":["A bug fixed in zero days","An unknown flaw with no patch","A very old vulnerability","A fake vulnerability"],"answer":1,"explanation":"Zero-day vulnerabilities are unknown to the vendor with zero days to fix before exploitation."},
    {"question":"What does SSL/TLS provide?","options":["Faster internet","Encrypted communication","Free web hosting","Virus protection"],"answer":1,"explanation":"SSL/TLS encrypts data in transit, securing communications between browser and server."},
    {"question":"Which of these is NOT a type of malware?","options":["Ransomware","Trojan","Firewall","Spyware"],"answer":2,"explanation":"A firewall is a security tool, not malware. The others are all malicious software types."},
    {"question":"What is a Man-in-the-Middle attack?","options":["Attacker between two parties intercepting data","Attacking the middle server","Social engineering the IT manager","Cracking the main database"],"answer":0,"explanation":"MITM attacks intercept communications between two parties without their knowledge."},
    {"question":"What is the purpose of a DMZ in networking?","options":["Speed up internet","Isolate public-facing servers","Store passwords","Block all traffic"],"answer":1,"explanation":"A DMZ (Demilitarized Zone) isolates public-facing servers from the internal network."},
]

# ── AUTH ──────────────────────────────────────────────────
@app.route("/")
def home(): return redirect("/login")

@app.route("/login", methods=["GET","POST"])
def login():
    error = ""
    if request.method == "POST":
        u = request.form["username"]
        p = request.form["password"]
        user = get_user(u)
        if user and check_password(p, user[2]):
            session["user"] = u
            return redirect("/dashboard")
        error = "❌ Wrong username or password!"
    return render_template("login.html", error=error)

@app.route("/signup", methods=["GET","POST"])
def signup():
    error = ""
    if request.method == "POST":
        u,p,c = request.form["username"],request.form["password"],request.form["confirm"]
        if get_user(u):    error = "❌ Username already taken!"
        elif p != c:       error = "❌ Passwords do not match!"
        elif len(p) < 4:   error = "❌ Password too short!"
        else:
            add_user(u, p)
            session["user"] = u
            return redirect("/dashboard")
    return render_template("signup.html", error=error)

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")

# ── DASHBOARD ─────────────────────────────────────────────
@app.route("/dashboard")
def dashboard():
    if "user" not in session: return redirect("/login")
    u = session["user"]
    avatar, bio = get_profile(u)
    return render_template("dashboard.html",
        username=u, xp=get_xp(u),
        solved=len(get_solved(u)),
        total=len(challenges),
        rank=get_rank(u),
        avatar=avatar)

# ── PROFILE ───────────────────────────────────────────────
@app.route("/profile", methods=["GET","POST"])
def profile():
    if "user" not in session: return redirect("/login")
    u = session["user"]
    msg = ""
    if request.method == "POST":
        avatar = request.form.get("avatar","😎")
        bio    = request.form.get("bio","Just started hacking!")[:120]
        update_profile(u, avatar, bio)
        msg = "✅ Profile updated!"
    avatar, bio = get_profile(u)
    s = get_solved(u)
    solved_challenges = [c for c in challenges if c["id"] in s]
    return render_template("profile.html",
        username=u, xp=get_xp(u),
        solved=len(s), total=len(challenges),
        rank=get_rank(u), avatar=avatar, bio=bio,
        solved_challenges=solved_challenges, msg=msg)

# ── LEADERBOARD ───────────────────────────────────────────
@app.route("/leaderboard")
def leaderboard():
    if "user" not in session: return redirect("/login")
    return render_template("leaderboard.html",
        players=get_leaderboard(),
        current_user=session["user"])

# ── CHALLENGES ────────────────────────────────────────────
@app.route("/challenges")
def challenges_page():
    if "user" not in session: return redirect("/login")
    cat  = request.args.get("cat","all")
    diff = request.args.get("diff","all")
    listed = challenges
    if cat  != "all": listed = [c for c in listed if c["category"]  == cat]
    if diff != "all": listed = [c for c in listed if c["difficulty"] == diff]
    return render_template("challenges.html",
        challenges=listed,
        user_solved=get_solved(session["user"]),
        cat=cat, diff=diff)

@app.route("/challenges/<int:cid>", methods=["GET","POST"])
def challenge_view(cid):
    if "user" not in session: return redirect("/login")
    u = session["user"]
    c = next((x for x in challenges if x["id"]==cid), None)
    if not c: return redirect("/challenges")
    msg       = ""
    already   = cid in get_solved(u)
    show_hint = session.get(f"hint_{cid}", False)
    if request.method == "POST":
        if "show_hint" in request.form:
            session[f"hint_{cid}"] = True
            show_hint = True
        elif "flag" in request.form:
            fi = request.form["flag"].strip()
            if already:        msg = "✅ Already solved!"
            elif fi == c["flag"]:
                mark_solved(u, cid)
                add_xp(u, c["xp"])
                msg = f"🎉 Correct! +{c['xp']} XP earned!"
                already = True
            else:              msg = "❌ Wrong flag! Try again."
    return render_template("challenge_view.html",
        c=c, msg=msg, already=already, show_hint=show_hint)

# ── QUIZ ──────────────────────────────────────────────────
@app.route("/quiz")
def quiz():
    if "user" not in session: return redirect("/login")
    return render_template("quiz_start.html")

@app.route("/quiz/start", methods=["POST"])
def quiz_start():
    if "user" not in session: return redirect("/login")
    picked = random.sample(questions, 5)
    session["quiz_questions"] = picked
    session["quiz_index"]     = 0
    session["quiz_score"]     = 0
    return redirect("/quiz/question")

@app.route("/quiz/question", methods=["GET","POST"])
def quiz_question():
    if "user" not in session: return redirect("/login")
    qs    = session.get("quiz_questions", [])
    index = session.get("quiz_index", 0)
    if not qs or index >= len(qs): return redirect("/quiz/result")
    if request.method == "POST":
        sel = int(request.form["selected"])
        if sel == qs[index]["answer"]:
            session["quiz_score"]  = session.get("quiz_score",0)+1
            session["last_result"] = "correct"
        else:
            session["last_result"] = "wrong"
        session["last_explanation"] = qs[index].get("explanation","")
        session["quiz_index"] = index+1
        return redirect("/quiz/question")
    last_result      = session.pop("last_result",      None)
    last_explanation = session.pop("last_explanation", None)
    return render_template("quiz.html",
        question=qs[index], index=index,
        total=len(qs), last_result=last_result,
        last_explanation=last_explanation)

@app.route("/quiz/result")
def quiz_result():
    if "user" not in session: return redirect("/login")
    score     = session.get("quiz_score",0)
    total     = len(session.get("quiz_questions",[1]*5))
    xp_earned = score*50
    add_xp(session["user"], xp_earned)
    return render_template("quiz_result.html",
        score=score, total=total, xp_earned=xp_earned)

# ── FLASHCARDS ────────────────────────────────────────────
@app.route("/flashcards")
def flashcards():
    if "user" not in session: return redirect("/login")
    return render_template("flashcards.html")

# ── ROADMAP ───────────────────────────────────────────────
@app.route("/roadmap")
def roadmap():
    if "user" not in session: return redirect("/login")
    u = session["user"]
    return render_template("roadmap.html",
        xp=get_xp(u),
        solved=len(get_solved(u)))

# ── DICTIONARY ────────────────────────────────────────────
@app.route("/dictionary")
def dictionary():
    if "user" not in session: return redirect("/login")
    return render_template("dictionary.html")

# ── CERTIFICATE ───────────────────────────────────────────
@app.route("/certificate")
def certificate():
    if "user" not in session: return redirect("/login")
    u = session["user"]
    xp = get_xp(u)
    return render_template("certificate.html",
        username=u,
        xp=xp,
        solved=len(get_solved(u)),
        rank=get_rank(u),
        level=(xp//500)+1,
        avatar=get_profile(u)[0],
        date=date.today().strftime("%B %d, %Y"),
        total=len(challenges))

# ── HINT CHATBOT ──────────────────────────────────────────
@app.route("/hint_chat/<int:cid>", methods=["POST"])
def hint_chat(cid):
    c = next((x for x in challenges if x["id"] == cid), None)
    if not c: return jsonify({"reply": "Challenge not found."})
    msg = request.json.get("message","").lower().strip()
    if any(w in msg for w in ["hint","help","stuck","clue","how"]):
        reply = f"💡 Here's a hint: {c['hint']}"
    elif any(w in msg for w in ["category","type","what kind"]):
        reply = f"📂 This is a <strong>{c['category']}</strong> challenge."
    elif any(w in msg for w in ["xp","point","reward","worth"]):
        reply = f"⚡ This challenge is worth <strong>{c['xp']} XP</strong>!"
    elif any(w in msg for w in ["difficulty","hard","easy","level"]):
        reply = f"🎯 Difficulty: <strong>{c['difficulty']}</strong>"
    elif any(w in msg for w in ["flag","format","look like"]):
        reply = "🚩 Flag format: <code>flag{something_here}</code>"
    elif any(w in msg for w in ["hello","hi","hey"]):
        reply = "👾 Hey hacker! Ask me for a hint, difficulty, or flag format!"
    elif any(w in msg for w in ["tool","use","software","program"]):
        reply = f"🛠️ For {c['category']}, try: Burp Suite, Nmap, Wireshark, Python, CyberChef."
    elif any(w in msg for w in ["learn","study","read","resource"]):
        reply = "📚 Resources: HackTheBox, TryHackMe, PortSwigger Academy, OWASP.org"
    else:
        reply = "🤖 Try: <em>give me a hint</em>, <em>what tools should I use</em>, or <em>flag format</em>"
    return jsonify({"reply": reply})
# ── ADMIN PANEL ───────────────────────────────────────────
ADMIN_USERNAME = "levi"  # change this to YOUR username

@app.route("/admin")
def admin():
    if "user" not in session: return redirect("/login")
    if session["user"] != ADMIN_USERNAME: return redirect("/dashboard")
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("SELECT username, xp, avatar, bio FROM users ORDER BY xp DESC")
    users = c.fetchall()
    c.execute("SELECT s.username, s.challenge_id FROM solved s ORDER BY s.username")
    solved_rows = c.fetchall()
    conn.close()
    return render_template("admin.html", users=users, solved_rows=solved_rows, challenges=challenges)

@app.route("/admin/delete/<username>")
def admin_delete(username):
    if "user" not in session: return redirect("/login")
    if session["user"] != ADMIN_USERNAME: return redirect("/dashboard")
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("DELETE FROM users WHERE username=?", (username,))
    c.execute("DELETE FROM solved WHERE username=?", (username,))
    conn.commit()
    conn.close()
    return redirect("/admin")

@app.route("/admin/reset/<username>")
def admin_reset(username):
    if "user" not in session: return redirect("/login")
    if session["user"] != ADMIN_USERNAME: return redirect("/dashboard")
    new_pass = "hackquest123"
    hashed = bcrypt.hashpw(new_pass.encode(), bcrypt.gensalt()).decode()
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("UPDATE users SET password=? WHERE username=?", (hashed, username))
    conn.commit()
    conn.close()
    return redirect("/admin")

@app.route("/admin/addxp/<username>/<int:amount>")
def admin_addxp(username, amount):
    if "user" not in session: return redirect("/login")
    if session["user"] != ADMIN_USERNAME: return redirect("/dashboard")
    add_xp(username, amount)
    return redirect("/admin")

@app.route("/admin/removexp/<username>/<int:amount>")
def admin_removexp(username, amount):
    if "user" not in session: return redirect("/login")
    if session["user"] != ADMIN_USERNAME: return redirect("/dashboard")
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("UPDATE users SET xp=MAX(0,xp-?) WHERE username=?", (amount, username))
    conn.commit()
    conn.close()
    return redirect("/admin")

@app.route("/admin/clearsolved/<username>")
def admin_clearsolved(username):
    if "user" not in session: return redirect("/login")
    if session["user"] != ADMIN_USERNAME: return redirect("/dashboard")
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("DELETE FROM solved WHERE username=?", (username,))
    conn.commit()
    conn.close()
    return redirect("/admin")

# ── START ─────────────────────────────────────────────────
if __name__ == "__main__":
    
    init_db()
    app.run(debug=True)
