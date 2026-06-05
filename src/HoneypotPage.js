 
import subprocess
import json
import re
from datetime import datetime
from database import SessionLocal
from models import Attacker, Honeypot
import requests

def get_cowrie_logs():
    try:
        result = subprocess.run(
            ['docker', 'logs', '--tail', '100', 'cowrie-honeypot'],
            capture_output=True, text=True
        )
        return result.stdout + result.stderr
    except Exception as e:
        print(f"Error getting logs: {e}")
        return ""

def parse_attacks(logs):
    attacks = []
    lines = logs.split('\n')

    for line in lines:
        # Detect new connections
        if 'New connection:' in line:
            try:
                ip_match = re.search(r'New connection: ([\d.]+):\d+', line)
                time_match = re.search(r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})', line)
                if ip_match:
                    attacks.append({
                        'type': 'connection',
                        'ip': ip_match.group(1),
                        'time': time_match.group(1) if time_match else str(datetime.now()),
                        'protocol': 'SSH',
                        'port': 2222,
                    })
            except:
                pass

        # Detect login attempts
        if 'login attempt' in line:
            try:
                cred_match = re.search(r"login attempt \[b'(.+?)'/b'(.+?)'\]", line)
                ip_match = re.search(r'([\d.]+)\]', line)
                success = 'succeeded' in line
                if cred_match:
                    attacks.append({
                        'type': 'login',
                        'username': cred_match.group(1),
                        'password': cred_match.group(2),
                        'ip': ip_match.group(1) if ip_match else 'unknown',
                        'success': success,
                        'protocol': 'SSH',
                        'port': 2222,
                    })
            except:
                pass

        # Detect commands
        if 'CMD:' in line:
            try:
                cmd_match = re.search(r'CMD: (.+)$', line)
                ip_match = re.search(r'([\d.]+)\]', line)
                if cmd_match:
                    attacks.append({
                        'type': 'command',
                        'command': cmd_match.group(1).strip(),
                        'ip': ip_match.group(1) if ip_match else 'unknown',
                        'protocol': 'SSH',
                        'port': 2222,
                    })
            except:
                pass

    return attacks

def get_ip_info(ip):
    try:
        # Skip private IPs
        if ip.startswith('172.') or ip.startswith('192.168.') or ip.startswith('10.'):
            return { 'country': 'Local Network', 'city': 'Local', 'isp': 'Internal' }
        res = requests.get(f'http://ip-api.com/json/{ip}', timeout=3)
        data = res.json()
        return {
            'country': data.get('country', 'Unknown'),
            'city': data.get('city', 'Unknown'),
            'isp': data.get('isp', 'Unknown'),
        }
    except:
        return { 'country': 'Unknown', 'city': 'Unknown', 'isp': 'Unknown' }

def save_attack_to_db(attack_data):
    db = SessionLocal()
    try:
        # Check if attacker already exists
        existing = db.query(Attacker).filter(
            Attacker.ip_address == attack_data['ip']
        ).first()

        if not existing:
            ip_info = get_ip_info(attack_data['ip'])
            attacker = Attacker(
                ip_address=attack_data['ip'],
                country=ip_info['country'],
                city=ip_info['city'],
                protocol=attack_data.get('protocol', 'SSH'),
                port=attack_data.get('port', 2222),
                skill_level='Unknown',
                threat_score=50.0,
                motivation='Unknown',
                tools_used='SSH Client',
                commands=attack_data.get('command', ''),
                ai_summary='Pending AI analysis...'
            )
            db.add(attacker)
            db.commit()
            print(f"✅ New attacker saved: {attack_data['ip']} from {ip_info['country']}")
        else:
            print(f"ℹ️ Attacker already exists: {attack_data['ip']}")

    except Exception as e:
        print(f"❌ Error saving attack: {e}")
        db.rollback()
    finally:
        db.close()

def sync_honeypot_logs():
    print("🍯 Syncing Cowrie honeypot logs...")
    logs = get_cowrie_logs()
    attacks = parse_attacks(logs)
    print(f"📊 Found {len(attacks)} events in logs")

    connections = [a for a in attacks if a['type'] == 'connection']
    for conn in connections:
        save_attack_to_db(conn)

    print(f"✅ Sync complete! {len(connections)} connections processed")
    return len(connections)