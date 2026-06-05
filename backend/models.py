 
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="analyst")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

class Attacker(Base):
    __tablename__ = "attackers"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, nullable=False)
    country = Column(String)
    city = Column(String)
    protocol = Column(String)
    port = Column(Integer)
    skill_level = Column(String)
    threat_score = Column(Float)
    motivation = Column(String)
    tools_used = Column(String)
    commands = Column(String)
    ai_summary = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Honeypot(Base):
    __tablename__ = "honeypots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    protocol = Column(String)
    port = Column(Integer)
    status = Column(String, default="active")
    hits = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())