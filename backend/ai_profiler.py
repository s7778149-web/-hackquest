from openai import OpenAI
from dotenv import load_dotenv
import os
import json

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_attacker_profile(attacker_data: dict) -> dict:
    prompt = f"""
You are a cybersecurity expert analyzing a real honeypot attack.

Attack data:
IP Address: {attacker_data.get('ip_address', 'Unknown')}
Country: {attacker_data.get('country', 'Unknown')}
Protocol: {attacker_data.get('protocol', 'SSH')}
Port: {attacker_data.get('port', 2222)}
Commands: {attacker_data.get('commands', 'None')}
Tools: {attacker_data.get('tools_used', 'Unknown')}

Respond ONLY with this JSON:
{{
    "skill_level": "Script Kiddie or Intermediate or Advanced or Nation-State APT",
    "motivation": "Financial - DB theft or Espionage or Ransomware deploy or Credential harvest or Botnet recruitment",
    "threat_score": <number 1-100>,
    "tools_detected": "comma separated tools",
    "active_hours": "estimated UTC hours like 02:00-05:00 UTC",
    "attack_style": "brief attack style description",
    "ai_summary": "2-3 sentence professional analysis"
}}
"""
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a cybersecurity expert. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        result = response.choices[0].message.content.strip()
        result = result.replace("```json", "").replace("```", "").strip()
        return json.loads(result)

    except Exception as e:
        print(f"AI profiling error: {e}")
        commands = attacker_data.get('commands', '')
        protocol = attacker_data.get('protocol', 'SSH')
        country  = attacker_data.get('country', 'Unknown')

        if 'wget' in commands or 'curl' in commands:
            skill = 'Intermediate'
            score = 65
            motivation = 'Malware deployment'
            style = 'Downloads malicious payloads after gaining access'
        elif 'passwd' in commands or 'shadow' in commands:
            skill = 'Advanced'
            score = 78
            motivation = 'Credential harvest'
            style = 'Targets system credential files for data exfiltration'
        elif protocol == 'HTTP':
            skill = 'Script Kiddie'
            score = 42
            motivation = 'Credential harvest'
            style = 'Automated web form credential stuffing attack'
        elif protocol == 'FTP':
            skill = 'Script Kiddie'
            score = 38
            motivation = 'Unauthorized access'
            style = 'Brute force FTP credentials using common wordlists'
        else:
            skill = 'Intermediate'
            score = 55
            motivation = 'Credential harvest'
            style = 'Automated SSH brute force with credential stuffing'

        return {
            "skill_level": skill,
            "motivation": motivation,
            "threat_score": score,
            "tools_detected": "Automated scanner, Custom script",
            "active_hours": "00:00-06:00 UTC",
            "attack_style": style,
            "ai_summary": (
                f"Attacker from {country} targeting {protocol} service using automated tools. "
                f"Behavior pattern indicates {motivation.lower()} as primary objective. "
                f"Classified as {skill} level based on attack methodology and tool usage. "
                f"Immediate IP block and service hardening strongly recommended."
            )
        }

def analyze_all_unanalyzed(db):
    from models import Attacker
    try:
        unanalyzed = db.query(Attacker).filter(
            Attacker.ai_summary == 'Pending AI analysis...'
        ).all()
        print(f"🤖 Found {len(unanalyzed)} attackers to analyze...")
        for attacker in unanalyzed:
            print(f"Analyzing {attacker.ip_address}...")
            profile = generate_attacker_profile({
                'ip_address': attacker.ip_address,
                'country':    attacker.country,
                'protocol':   attacker.protocol,
                'port':       attacker.port,
                'commands':   attacker.commands,
                'tools_used': attacker.tools_used,
            })
            attacker.skill_level  = profile.get('skill_level', 'Unknown')
            attacker.motivation   = profile.get('motivation', 'Unknown')
            attacker.threat_score = float(profile.get('threat_score', 50))
            attacker.tools_used   = profile.get('tools_detected', attacker.tools_used)
            attacker.ai_summary   = profile.get('ai_summary', 'Analysis complete.')
            db.commit()
            print(f"✅ {attacker.ip_address} — {profile.get('skill_level')}")
        return len(unanalyzed)
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        return 0