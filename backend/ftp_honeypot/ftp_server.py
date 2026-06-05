 
from twisted.protocols.ftp import FTPFactory, FTPRealm
from twisted.internet import reactor, defer
from twisted.cred.portal import Portal
from twisted.cred.checkers import InMemoryUsernamePasswordDatabaseDontUse
import json, datetime, os

LOG_FILE = "/logs/ftp_honeypot.json"

def log_event(event_type, ip, data):
    os.makedirs("/logs", exist_ok=True)
    entry = {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "event": event_type,
        "ip": ip,
        "data": data
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(entry) + "\n")
    print(f"[FTP HONEYPOT] {event_type} from {ip}: {data}")

from twisted.protocols.ftp import FTP
from twisted.internet.protocol import ServerFactory

class HoneyFTPProtocol(FTP):
    def connectionMade(self):
        ip = self.transport.getPeer().host
        log_event("ftp_connection", ip, {
            "protocol": "FTP",
            "port": 21
        })
        print(f"[FTP] New connection from {ip}")
        FTP.connectionMade(self)

    def ftp_USER(self, username):
        ip = self.transport.getPeer().host
        log_event("ftp_username", ip, {"username": username})
        print(f"[FTP] Username attempt: {username} from {ip}")
        return FTP.ftp_USER(self, username)

    def ftp_PASS(self, password):
        ip = self.transport.getPeer().host
        log_event("ftp_password", ip, {"password": password})
        print(f"[FTP] Password attempt: {password} from {ip}")
        return FTP.ftp_PASS(self, password)

class HoneyFTPFactory(FTPFactory):
    protocol = HoneyFTPProtocol

if __name__ == '__main__':
    os.makedirs("/logs", exist_ok=True)
    os.makedirs("/ftp_root", exist_ok=True)

    portal = Portal(
        FTPRealm("/ftp_root"),
        [InMemoryUsernamePasswordDatabaseDontUse(
            anonymous=b"",
            admin=b"admin123",
            root=b"toor",
            ftp=b"ftp",
            user=b"password"
        )]
    )

    factory = HoneyFTPFactory(portal)
    reactor.listenTCP(21, factory)
    print("[FTP HONEYPOT] Started on port 21")
    reactor.run()