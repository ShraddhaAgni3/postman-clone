import json
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from . import models, schemas

# Helper to safely load JSON
def safe_json_load(text: Optional[str], default: Any) -> Any:
    if not text:
        return default
    try:
        return json.loads(text)
    except Exception:
        return default

# Helper to safely dump JSON
def safe_json_dumps(obj: Any) -> str:
    try:
        return json.dumps(obj)
    except Exception:
        return "[]"

# Conversion functions between DB Models and Pydantic Schemas
def request_db_to_schema(db_req: models.Request) -> schemas.Request:
    return schemas.Request(
        id=db_req.id,
        collection_id=db_req.collection_id,
        name=db_req.name,
        method=db_req.method,
        url=db_req.url,
        headers=safe_json_load(db_req.headers, []),
        params=safe_json_load(db_req.params, []),
        body_type=db_req.body_type,
        body_raw=db_req.body_raw,
        body_raw_type=db_req.body_raw_type,
        body_form_data=safe_json_load(db_req.body_form_data, []),
        body_urlencoded=safe_json_load(db_req.body_urlencoded, []),
        auth_type=db_req.auth_type,
        auth_config=safe_json_load(db_req.auth_config, {}),
        created_at=db_req.created_at,
        updated_at=db_req.updated_at
    )

def environment_db_to_schema(db_env: models.Environment) -> schemas.Environment:
    vars_list = []
    for v in db_env.variables:
        vars_list.append(schemas.EnvironmentVariable(
            id=v.id,
            environment_id=v.environment_id,
            key=v.key,
            value=v.value,
            enabled=v.enabled,
            created_at=v.created_at
        ))
    return schemas.Environment(
        id=db_env.id,
        name=db_env.name,
        variables=vars_list,
        created_at=db_env.created_at,
        updated_at=db_env.updated_at
    )

def history_db_to_schema(db_hist: models.History) -> schemas.History:
    return schemas.History(
        id=db_hist.id,
        method=db_hist.method,
        url=db_hist.url,
        headers=safe_json_load(db_hist.headers, []),
        params=safe_json_load(db_hist.params, []),
        body_type=db_hist.body_type,
        body_raw=db_hist.body_raw,
        auth_type=db_hist.auth_type,
        response_status=db_hist.response_status,
        response_status_text=db_hist.response_status_text,
        response_time_ms=db_hist.response_time_ms,
        response_size_bytes=db_hist.response_size_bytes,
        response_headers=safe_json_load(db_hist.response_headers, []),
        response_body=db_hist.response_body,
        sent_at=db_hist.sent_at
    )

# Collection CRUD
def get_collections_tree(db: Session) -> List[schemas.CollectionDetail]:
    db_collections = db.query(models.Collection).all()
    db_requests = db.query(models.Request).all()

    # Create mappings for quick lookup
    collections_map: Dict[int, schemas.CollectionDetail] = {}
    
    # 1. Initialize detail objects
    for col in db_collections:
        collections_map[col.id] = schemas.CollectionDetail(
            id=col.id,
            name=col.name,
            description=col.description,
            parent_id=col.parent_id,
            created_at=col.created_at,
            updated_at=col.updated_at,
            requests=[],
            children=[]
        )

    # 2. Distribute requests to respective collections
    for req in db_requests:
        if req.collection_id in collections_map:
            collections_map[req.collection_id].requests.append(request_db_to_schema(req))

    # 3. Build hierarchy tree
    root_collections: List[schemas.CollectionDetail] = []
    for col_id, col_detail in collections_map.items():
        if col_detail.parent_id is not None and col_detail.parent_id in collections_map:
            collections_map[col_detail.parent_id].children.append(col_detail)
        else:
            root_collections.append(col_detail)

    return root_collections

def create_collection(db: Session, collection: schemas.CollectionCreate) -> models.Collection:
    db_col = models.Collection(
        name=collection.name,
        description=collection.description,
        parent_id=collection.parent_id
    )
    db.add(db_col)
    db.commit()
    db.refresh(db_col)
    return db_col

def update_collection(db: Session, collection_id: int, col_update: schemas.CollectionUpdate) -> Optional[models.Collection]:
    db_col = db.query(models.Collection).filter(models.Collection.id == collection_id).first()
    if not db_col:
        return None
    
    if col_update.name is not None:
        db_col.name = col_update.name
    if col_update.description is not None:
        db_col.description = col_update.description
    if col_update.parent_id is not None:
        db_col.parent_id = col_update.parent_id if col_update.parent_id > 0 else None
        
    db.commit()
    db.refresh(db_col)
    return db_col

def delete_collection(db: Session, collection_id: int) -> bool:
    db_col = db.query(models.Collection).filter(models.Collection.id == collection_id).first()
    if not db_col:
        return False
    db.delete(db_col)
    db.commit()
    return True

# Request CRUD
def get_request(db: Session, request_id: int) -> Optional[schemas.Request]:
    db_req = db.query(models.Request).filter(models.Request.id == request_id).first()
    if not db_req:
        return None
    return request_db_to_schema(db_req)

def create_request(db: Session, request: schemas.RequestCreate) -> schemas.Request:
    db_req = models.Request(
        collection_id=request.collection_id,
        name=request.name,
        method=request.method,
        url=request.url,
        headers=safe_json_dumps([h.dict() for h in request.headers]),
        params=safe_json_dumps([p.dict() for p in request.params]),
        body_type=request.body_type,
        body_raw=request.body_raw,
        body_raw_type=request.body_raw_type,
        body_form_data=safe_json_dumps([f.dict() for f in request.body_form_data]),
        body_urlencoded=safe_json_dumps([u.dict() for u in request.body_urlencoded]),
        auth_type=request.auth_type,
        auth_config=safe_json_dumps(request.auth_config.dict() if request.auth_config else {})
    )
    db.add(db_req)
    db.commit()
    db.refresh(db_req)
    return request_db_to_schema(db_req)

def update_request(db: Session, request_id: int, request: schemas.RequestUpdate) -> Optional[schemas.Request]:
    db_req = db.query(models.Request).filter(models.Request.id == request_id).first()
    if not db_req:
        return None

    # Map update parameters
    if request.name is not None:
        db_req.name = request.name
    if request.method is not None:
        db_req.method = request.method
    if request.url is not None:
        db_req.url = request.url
    if request.collection_id is not None:
        db_req.collection_id = request.collection_id
        
    # Optional fields from request body base
    db_req.headers = safe_json_dumps([h.dict() for h in request.headers])
    db_req.params = safe_json_dumps([p.dict() for p in request.params])
    db_req.body_type = request.body_type
    db_req.body_raw = request.body_raw
    db_req.body_raw_type = request.body_raw_type
    db_req.body_form_data = safe_json_dumps([f.dict() for f in request.body_form_data])
    db_req.body_urlencoded = safe_json_dumps([u.dict() for u in request.body_urlencoded])
    db_req.auth_type = request.auth_type
    db_req.auth_config = safe_json_dumps(request.auth_config.dict() if request.auth_config else {})

    db.commit()
    db.refresh(db_req)
    return request_db_to_schema(db_req)

def delete_request(db: Session, request_id: int) -> bool:
    db_req = db.query(models.Request).filter(models.Request.id == request_id).first()
    if not db_req:
        return False
    db.delete(db_req)
    db.commit()
    return True

# Environment CRUD
def get_environments(db: Session) -> List[schemas.Environment]:
    db_envs = db.query(models.Environment).all()
    return [environment_db_to_schema(env) for env in db_envs]

def get_environment(db: Session, environment_id: int) -> Optional[schemas.Environment]:
    db_env = db.query(models.Environment).filter(models.Environment.id == environment_id).first()
    if not db_env:
        return None
    return environment_db_to_schema(db_env)

def create_environment(db: Session, env: schemas.EnvironmentCreate) -> schemas.Environment:
    db_env = models.Environment(name=env.name)
    db.add(db_env)
    db.commit()
    db.refresh(db_env)
    
    # Save variables
    for var in env.variables:
        db_var = models.EnvironmentVariable(
            environment_id=db_env.id,
            key=var.key,
            value=var.value,
            enabled=var.enabled
        )
        db.add(db_var)
    db.commit()
    db.refresh(db_env)
    return environment_db_to_schema(db_env)

def update_environment(db: Session, environment_id: int, env: schemas.EnvironmentCreate) -> Optional[schemas.Environment]:
    db_env = db.query(models.Environment).filter(models.Environment.id == environment_id).first()
    if not db_env:
        return None
    
    db_env.name = env.name
    
    # Remove existing variables and add new ones (simple rewrite)
    db.query(models.EnvironmentVariable).filter(models.EnvironmentVariable.environment_id == environment_id).delete()
    
    for var in env.variables:
        db_var = models.EnvironmentVariable(
            environment_id=environment_id,
            key=var.key,
            value=var.value,
            enabled=var.enabled
        )
        db.add(db_var)
        
    db.commit()
    db.refresh(db_env)
    return environment_db_to_schema(db_env)

def delete_environment(db: Session, environment_id: int) -> bool:
    db_env = db.query(models.Environment).filter(models.Environment.id == environment_id).first()
    if not db_env:
        return False
    db.delete(db_env)
    db.commit()
    return True

# History CRUD
def get_history(db: Session, limit: int = 100) -> List[schemas.History]:
    db_history = db.query(models.History).order_by(models.History.sent_at.desc()).limit(limit).all()
    return [history_db_to_schema(h) for h in db_history]

def create_history_entry(db: Session, hist: schemas.HistoryCreate) -> schemas.History:
    db_hist = models.History(
        method=hist.method,
        url=hist.url,
        headers=safe_json_dumps([h.dict() for h in hist.headers]),
        params=safe_json_dumps([p.dict() for p in hist.params]),
        body_type=hist.body_type,
        body_raw=hist.body_raw,
        auth_type=hist.auth_type,
        response_status=hist.response_status,
        response_status_text=hist.response_status_text,
        response_time_ms=hist.response_time_ms,
        response_size_bytes=hist.response_size_bytes,
        response_headers=safe_json_dumps([rh.dict() for rh in hist.response_headers]),
        response_body=hist.response_body
    )
    db.add(db_hist)
    db.commit()
    db.refresh(db_hist)
    return history_db_to_schema(db_hist)

def clear_history(db: Session) -> bool:
    db.query(models.History).delete()
    db.commit()
    return True
