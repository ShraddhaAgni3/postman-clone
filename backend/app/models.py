import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from .database import Base

class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    parent_id = Column(Integer, ForeignKey("collections.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Nested sub-collections / folders relationship
    children = relationship("Collection", back_populates="parent", cascade="all, delete-orphan")
    parent = relationship("Collection", back_populates="children", remote_side=[id])
    requests = relationship("Request", back_populates="collection", cascade="all, delete-orphan")

class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    method = Column(String, nullable=False)  # GET, POST, PUT, DELETE, etc.
    url = Column(String, nullable=False)
    
    # Store dynamic fields as serialized JSON text
    headers = Column(Text, default="[]")  # e.g., [{"key": "Authorization", "value": "Bearer token", "enabled": true}]
    params = Column(Text, default="[]")   # e.g., [{"key": "id", "value": "1", "enabled": true}]
    
    body_type = Column(String, default="none")  # none, raw, form-data, x-www-form-urlencoded
    body_raw = Column(Text, nullable=True)
    body_raw_type = Column(String, default="JSON")  # JSON, Text, HTML, XML
    body_form_data = Column(Text, default="[]")  # e.g., [{"key": "username", "value": "admin", "enabled": true, "type": "text"}]
    body_urlencoded = Column(Text, default="[]")  # e.g., [{"key": "redirect", "value": "home", "enabled": true}]
    
    auth_type = Column(String, default="none")  # none, bearer, basic
    auth_config = Column(Text, default="{}")   # JSON text representation of auth configuration
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    collection = relationship("Collection", back_populates="requests")

class Environment(Base):
    __tablename__ = "environments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    variables = relationship("EnvironmentVariable", back_populates="environment", cascade="all, delete-orphan")

class EnvironmentVariable(Base):
    __tablename__ = "environment_variables"

    id = Column(Integer, primary_key=True, index=True)
    environment_id = Column(Integer, ForeignKey("environments.id", ondelete="CASCADE"), nullable=False)
    key = Column(String, nullable=False)
    value = Column(String, nullable=False)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    environment = relationship("Environment", back_populates="variables")

class History(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    method = Column(String, nullable=False)
    url = Column(String, nullable=False)
    headers = Column(Text, default="[]")
    params = Column(Text, default="[]")
    body_type = Column(String, default="none")
    body_raw = Column(Text, nullable=True)
    auth_type = Column(String, default="none")
    
    # Response statistics
    response_status = Column(Integer)
    response_status_text = Column(String)
    response_time_ms = Column(Integer)
    response_size_bytes = Column(Integer)
    response_headers = Column(Text, default="[]")
    response_body = Column(Text, nullable=True)
    
    sent_at = Column(DateTime, default=func.now())
