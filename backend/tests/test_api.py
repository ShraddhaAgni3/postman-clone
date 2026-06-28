import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

# Setup isolated test database in backend directory
TEST_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_postman_clone.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "running" in response.json()["message"]

def test_collections_crud(client):
    # Create Collection
    create_response = client.post("/api/collections", json={
        "name": "Test Suite",
        "description": "Integration Test Collection"
    })
    assert create_response.status_code == 200
    data = create_response.json()
    assert data["name"] == "Test Suite"
    assert data["id"] is not None
    collection_id = data["id"]

    # Read/List Collections
    list_response = client.get("/api/collections")
    assert list_response.status_code == 200
    assert len(list_response.json()) > 0
    assert any(c["id"] == collection_id for c in list_response.json())

    # Update Collection
    update_response = client.put(f"/api/collections/{collection_id}", json={
        "name": "Test Suite Renamed",
        "description": "Updated Integration Test Collection"
    })
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Test Suite Renamed"

    # Delete Collection
    delete_response = client.delete(f"/api/collections/{collection_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "Collection deleted successfully"

def test_requests_crud(client):
    # 1. Create a parent collection first
    col_response = client.post("/api/collections", json={"name": "Temp Collection"})
    col_id = col_response.json()["id"]

    # 2. Create saved request
    req_payload = {
        "collection_id": col_id,
        "name": "Fetch Mock Posts",
        "method": "GET",
        "url": "{{baseUrl}}/posts",
        "headers": [{"key": "X-Test", "value": "TestValue", "enabled": True}],
        "params": [{"key": "limit", "value": "5", "enabled": True}],
        "body_type": "none",
        "auth_type": "none"
    }
    create_response = client.post("/api/requests", json=req_payload)
    assert create_response.status_code == 200
    req_data = create_response.json()
    assert req_data["name"] == "Fetch Mock Posts"
    assert req_data["id"] is not None
    request_id = req_data["id"]

    # 3. Read request
    get_response = client.get(f"/api/requests/{request_id}")
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Fetch Mock Posts"

    # 4. Update request
    req_payload["name"] = "Fetch Mock Posts Updated"
    req_payload["method"] = "POST"
    update_response = client.put(f"/api/requests/{request_id}", json=req_payload)
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Fetch Mock Posts Updated"
    assert update_response.json()["method"] == "POST"

    # 5. Delete request
    delete_response = client.delete(f"/api/requests/{request_id}")
    assert delete_response.status_code == 200

def test_environments_crud(client):
    # Create Environment with variables
    env_payload = {
        "name": "Local Sandbox",
        "variables": [
            {"key": "baseUrl", "value": "https://api.local", "enabled": True},
            {"key": "secretKey", "value": "12345", "enabled": False}
        ]
    }
    create_response = client.post("/api/environments", json=env_payload)
    assert create_response.status_code == 200
    env_data = create_response.json()
    assert env_data["name"] == "Local Sandbox"
    assert len(env_data["variables"]) == 2
    env_id = env_data["id"]

    # List environments
    list_response = client.get("/api/environments")
    assert list_response.status_code == 200
    assert len(list_response.json()) > 0

    # Delete environment
    delete_response = client.delete(f"/api/environments/{env_id}")
    assert delete_response.status_code == 200

def test_proxy_variable_replacement(client):
    # 1. Create a staging environment
    env_response = client.post("/api/environments", json={
        "name": "Staging Setup",
        "variables": [
            {"key": "testUrl", "value": "https://httpbin.org/get", "enabled": True},
            {"key": "userHeader", "value": "TestingAgent", "enabled": True}
        ]
    })
    env_id = env_response.json()["id"]

    # 2. Fire request resolving via testUrl
    proxy_payload = {
        "method": "GET",
        "url": "{{testUrl}}",
        "headers": [{"key": "User-Agent", "value": "{{userHeader}}", "enabled": True}],
        "params": [{"key": "check", "value": "success", "enabled": True}],
        "body_type": "none",
        "environment_id": env_id
    }
    proxy_response = client.post("/api/proxy", json=proxy_payload)
    assert proxy_response.status_code == 200
    data = proxy_response.json()
    assert data["status"] == 200
    
    # 3. Read request history to verify it was recorded automatically
    history_response = client.get("/api/history")
    assert history_response.status_code == 200
    assert len(history_response.json()) > 0
