from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

# Helper models for key-value lists and auth
class KeyValueItem(BaseModel):
    key: str
    value: str
    enabled: bool = True
    type: Optional[str] = "text"  # For form-data: "text" or "file"

class AuthConfig(BaseModel):
    token: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None

# Environment Variable schemas
class EnvironmentVariableBase(BaseModel):
    key: str
    value: str
    enabled: bool = True

class EnvironmentVariableCreate(EnvironmentVariableBase):
    pass

class EnvironmentVariable(EnvironmentVariableBase):
    id: int
    environment_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Environment schemas
class EnvironmentBase(BaseModel):
    name: str

class EnvironmentCreate(EnvironmentBase):
    variables: List[EnvironmentVariableCreate] = []

class Environment(EnvironmentBase):
    id: int
    variables: List[EnvironmentVariable] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Request schemas (saved in collections)
class RequestBase(BaseModel):
    name: str
    method: str
    url: str
    headers: List[KeyValueItem] = []
    params: List[KeyValueItem] = []
    body_type: str = "none"
    body_raw: Optional[str] = None
    body_raw_type: Optional[str] = "JSON"
    body_form_data: List[KeyValueItem] = []
    body_urlencoded: List[KeyValueItem] = []
    auth_type: str = "none"
    auth_config: Optional[AuthConfig] = None

class RequestCreate(RequestBase):
    collection_id: int

class RequestUpdate(RequestBase):
    name: Optional[str] = None
    method: Optional[str] = None
    url: Optional[str] = None
    collection_id: Optional[int] = None

class Request(RequestBase):
    id: int
    collection_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Collection schemas
class CollectionBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None

class CollectionCreate(CollectionBase):
    pass

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None

# Nested collections and requests schema
class CollectionDetail(CollectionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    requests: List[Request] = []
    children: List["CollectionDetail"] = []

    class Config:
        from_attributes = True

# History schemas
class HistoryBase(BaseModel):
    method: str
    url: str
    headers: List[KeyValueItem] = []
    params: List[KeyValueItem] = []
    body_type: str = "none"
    body_raw: Optional[str] = None
    auth_type: str = "none"

class HistoryCreate(HistoryBase):
    response_status: int
    response_status_text: str
    response_time_ms: int
    response_size_bytes: int
    response_headers: List[KeyValueItem] = []
    response_body: Optional[str] = None

class History(HistoryCreate):
    id: int
    sent_at: datetime

    class Config:
        from_attributes = True

# Proxy runner payload and response
class ProxyRequest(BaseModel):
    method: str
    url: str
    headers: List[KeyValueItem] = []
    params: List[KeyValueItem] = []
    body_type: str = "none"
    body_raw: Optional[str] = None
    body_form_data: List[KeyValueItem] = []
    body_urlencoded: List[KeyValueItem] = []
    auth_type: str = "none"
    auth_config: Optional[AuthConfig] = None
    environment_id: Optional[int] = None  # To resolve variables

class ProxyResponse(BaseModel):
    status: int
    status_text: str
    time_ms: int
    size_bytes: int
    headers: List[KeyValueItem]
    body: Optional[str] = None
    error: Optional[str] = None
