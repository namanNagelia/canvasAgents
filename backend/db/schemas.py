from sqlalchemy import create_engine, Column, String
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.dialects.postgresql import UUID
import os
import dotenv
import uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy import DateTime
dotenv.load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(DATABASE_URL)

engine = create_engine(DATABASE_URL)

Base = declarative_base()

# To PUSH: alembic revision --autogenerate -m "Added role column to users" && alembic upgrade head


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)


class LLMSession(Base):
    __tablename__ = "llm_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False)
    session_id = Column(String, nullable=False)
    # List of {"request": "...", "response": {...}}
    conversation = Column(JSONB, default=[])
    files = relationship("UploadedFile", back_populates="session")
    user = relationship("User", back_populates="sessions")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey(
        "llm_sessions.id"), nullable=False)
    content = Column(String, nullable=False)
    session = relationship("LLMSession", back_populates="files")
    base64 = Column(String, nullable=False)
    fileType = Column(String, nullable=False)
    session = relationship("LLMSession", back_populates="files")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


Session = sessionmaker(bind=engine)
session = Session()

# Base.metadata.create_all(engine)

# print("Database schema created successfully!")
