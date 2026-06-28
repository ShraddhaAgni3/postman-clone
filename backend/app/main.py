from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

from .database import engine, Base, get_db, SessionLocal
from . import schemas, crud, proxy
from .seed import seed_db

# Create SQLite database tables if they do not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Postman Clone API Backend",
    description="Backend services for executing proxy API calls and persisting collections/environments.",
    version="1.0.0"
)

# Enable CORS for Next.js web application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend URL e.g. http://localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_populate():
    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Postman Clone API Backend is running."}

# --- Proxy request runner endpoint ---
@app.post("/api/proxy", response_model=schemas.ProxyResponse)
async def execute_proxy_request(req: schemas.ProxyRequest, db: Session = Depends(get_db)):
    return await proxy.run_proxy_request(db, req)

# --- Collections endpoints ---
@app.get("/api/collections", response_model=List[schemas.CollectionDetail])
def read_collections(db: Session = Depends(get_db)):
    return crud.get_collections_tree(db)

@app.post("/api/collections", response_model=schemas.CollectionDetail)
def create_new_collection(collection: schemas.CollectionCreate, db: Session = Depends(get_db)):
    db_col = crud.create_collection(db, collection)
    # Convert created DB model to details response schema
    return schemas.CollectionDetail(
        id=db_col.id,
        name=db_col.name,
        description=db_col.description,
        parent_id=db_col.parent_id,
        created_at=db_col.created_at,
        updated_at=db_col.updated_at,
        requests=[],
        children=[]
    )

@app.put("/api/collections/{collection_id}", response_model=schemas.CollectionDetail)
def update_existing_collection(collection_id: int, collection: schemas.CollectionUpdate, db: Session = Depends(get_db)):
    db_col = crud.update_collection(db, collection_id, collection)
    if not db_col:
        raise HTTPException(status_code=404, detail="Collection not found")
    # Return updated structure (requests/children will resolve in parent trees)
    return schemas.CollectionDetail(
        id=db_col.id,
        name=db_col.name,
        description=db_col.description,
        parent_id=db_col.parent_id,
        created_at=db_col.created_at,
        updated_at=db_col.updated_at,
        requests=[],
        children=[]
    )

@app.delete("/api/collections/{collection_id}")
def delete_existing_collection(collection_id: int, db: Session = Depends(get_db)):
    success = crud.delete_collection(db, collection_id)
    if not success:
        raise HTTPException(status_code=404, detail="Collection not found")
    return {"message": "Collection deleted successfully"}

# --- Requests endpoints ---
@app.get("/api/requests/{request_id}", response_model=schemas.Request)
def read_request_by_id(request_id: int, db: Session = Depends(get_db)):
    req = crud.get_request(db, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return req

@app.post("/api/requests", response_model=schemas.Request)
def create_new_request(request: schemas.RequestCreate, db: Session = Depends(get_db)):
    return crud.create_request(db, request)

@app.put("/api/requests/{request_id}", response_model=schemas.Request)
def update_existing_request(request_id: int, request: schemas.RequestUpdate, db: Session = Depends(get_db)):
    updated_req = crud.update_request(db, request_id, request)
    if not updated_req:
        raise HTTPException(status_code=404, detail="Request not found")
    return updated_req

@app.delete("/api/requests/{request_id}")
def delete_existing_request(request_id: int, db: Session = Depends(get_db)):
    success = crud.delete_request(db, request_id)
    if not success:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request deleted successfully"}

# --- Environments endpoints ---
@app.get("/api/environments", response_model=List[schemas.Environment])
def read_environments(db: Session = Depends(get_db)):
    return crud.get_environments(db)

@app.get("/api/environments/{environment_id}", response_model=schemas.Environment)
def read_environment_by_id(environment_id: int, db: Session = Depends(get_db)):
    env = crud.get_environment(db, environment_id)
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    return env

@app.post("/api/environments", response_model=schemas.Environment)
def create_new_environment(env: schemas.EnvironmentCreate, db: Session = Depends(get_db)):
    return crud.create_environment(db, env)

@app.put("/api/environments/{environment_id}", response_model=schemas.Environment)
def update_existing_environment(environment_id: int, env: schemas.EnvironmentCreate, db: Session = Depends(get_db)):
    updated_env = crud.update_environment(db, environment_id, env)
    if not updated_env:
        raise HTTPException(status_code=404, detail="Environment not found")
    return updated_env

@app.delete("/api/environments/{environment_id}")
def delete_existing_environment(environment_id: int, db: Session = Depends(get_db)):
    success = crud.delete_environment(db, environment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Environment not found")
    return {"message": "Environment deleted successfully"}

# --- History endpoints ---
@app.get("/api/history", response_model=List[schemas.History])
def read_history(limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_history(db, limit)

@app.delete("/api/history")
def clear_all_history(db: Session = Depends(get_db)):
    crud.clear_history(db)
    return {"message": "History cleared successfully"}

# --- Placeholder / Coming Soon routes ---
@app.get("/api/placeholders/{module}")
def read_module_placeholder(module: str):
    modules = {
        "mock-servers": "Mock Servers allow you to simulate API endpoints without spinning up a backend. This feature is coming soon.",
        "collaboration": "Team Workspaces and real-time collaboration features are coming soon.",
        "documentation": "Automated API documentation generation and sharing are coming soon.",
        "monitors": "Monitors let you run request collections on a schedule to inspect API health. This feature is coming soon."
    }
    msg = modules.get(module.lower(), "This advanced Postman workspace feature is coming soon.")
    return {"status": "placeholder", "feature": module, "message": msg}
