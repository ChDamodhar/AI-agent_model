import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON, func, ForeignKey
from sqlalchemy.orm import sessionmaker, scoped_session, relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session

from dotenv import load_dotenv

# Load environment variables from .env file
from pathlib import Path

# Load environment variables from the project's .env file located at the repository root
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=env_path)

# Database URL – expects environment variable DATABASE_URL (e.g., Neon PostgreSQL)
DATABASE_URL = os.getenv("DATABASE_URL") or "sqlite:///./test.db"

engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

Base = declarative_base()

# Example models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String, unique=True, index=True, nullable=False)
    filename = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    meta_json = Column(JSON, nullable=True)

class PipelineRun(Base):
    __tablename__ = "pipeline_runs"
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String, ForeignKey("datasets.file_id"), nullable=False)
    status = Column(String, nullable=False, default="pending")
    job_id = Column(String, unique=True, index=True, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)
    meta_json = Column(JSON, nullable=True)

# Report model – stores generated analysis reports (PDF, PPTX, etc.)
class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    report_type = Column(String, nullable=False)  # e.g., pdf, pptx
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    meta_json = Column(JSON, nullable=True)
    dataset = relationship("Dataset", backref="reports")

# ModelResult model – stores trained model artifacts and evaluation metrics
class ModelResult(Base):
    __tablename__ = "model_results"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    model_name = Column(String, nullable=False)
    model_path = Column(String, nullable=False)
    parameters = Column(JSON, nullable=True)
    metrics = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    dataset = relationship("Dataset", backref="model_results")

# ChatMessage model – stores chat history for Dataset Copilot
class ChatMessage(Base):
    __tablename__ = "chat_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", backref="chat_messages")
    dataset = relationship("Dataset", backref="chat_messages")


    # Relationship to Dataset (optional)
    dataset = relationship("Dataset", backref="pipeline_runs")


def init_db():
    """Create tables if they don't exist."""
    Base.metadata.create_all(bind=engine)

# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
