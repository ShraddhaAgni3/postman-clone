# Antigravity Postman Clone - SDE Fullstack Assignment

A fully functional developer workspace replicating the core design, user experience, and request workflows of the Postman desktop API client.

## Technical Stack

* **Frontend**: Next.js 15 (React 19, TypeScript, Vanilla CSS Modules)
* **Backend**: Python 3.10+ (FastAPI, HTTPX async client, Uvicorn server)
* **Database**: SQLite (SQLAlchemy ORM)

---

## Architectural Overview

Browsers block cross-origin requests (CORS) when executing HTTP calls to arbitrary target APIs directly. To solve this, the application uses a proxy architecture:
1. **Client** inputs method, URL (with template variables `{{var}}`), parameters, body, and auth inside the **Next.js frontend**.
2. Clicking **Send** triggers an API call to the **FastAPI backend proxy** (`POST /api/proxy`).
3. The **Proxy Runner** resolves the template variables against the active environment state, configures authorization tokens, executes the outbound network request asynchronously using `httpx`, and captures execution speed, size, headers, and body.
4. The proxy automatically registers the call record in the **History log database**, and returns the results to the client.

```
[ Next.js Frontend UI ]
      │ (Local REST calls)
      ▼
[ FastAPI Backend API ] ──(SQLAlchemy ORM)──► [ SQLite Database (postman_clone.db) ]
      │
      ├─► (Proxy Executer) ──(HTTPX Outbound Async)──► [ Target Public API ]
```

---

## Database Schema Design

The SQLite schema consists of five tables defining the relations between collections, requests, environments, environment variables, and history logs:

### 1. `collections`
Groups saved requests. Supports folder nesting.
* `id` (INTEGER, PK, Auto-increment)
* `name` (TEXT, Not Null)
* `description` (TEXT, Nullable)
* `parent_id` (INTEGER, Nullable, FK to `collections.id` on delete CASCADE)
* `created_at` / `updated_at` (TIMESTAMP)

### 2. `requests`
Saves request specifications inside a collection folder.
* `id` (INTEGER, PK, Auto-increment)
* `collection_id` (INTEGER, FK to `collections.id` on delete CASCADE)
* `name` (TEXT, Not Null)
* `method` (TEXT, Not Null) - e.g. `GET`, `POST`
* `url` (TEXT, Not Null)
* `headers` (TEXT) - JSON array of `{key, value, enabled}`
* `params` (TEXT) - JSON array of `{key, value, enabled}`
* `body_type` (TEXT) - `none`, `raw`, `form-data`, `x-www-form-urlencoded`
* `body_raw` / `body_raw_type` (TEXT)
* `body_form_data` / `body_urlencoded` (TEXT) - JSON arrays of key-values
* `auth_type` (TEXT) - `none`, `bearer`, `basic`
* `auth_config` (TEXT) - JSON representation of auth values

### 3. `environments`
Workspace profiles containing environment variables.
* `id` (INTEGER, PK, Auto-increment)
* `name` (TEXT, Not Null)

### 4. `environment_variables`
Variable key-value mapping under an environment.
* `id` (INTEGER, PK)
* `environment_id` (INTEGER, FK to `environments.id` on delete CASCADE)
* `key` / `value` (TEXT, Not Null)
* `enabled` (BOOLEAN, Default True)

### 5. `history`
Audit log of previous request executions.
* `id` (INTEGER, PK)
* `method` / `url` (TEXT)
* `headers` / `params` / `body_type` / `body_raw` / `auth_type` (TEXT)
* `response_status` (INTEGER)
* `response_status_text` (TEXT)
* `response_time_ms` (INTEGER)
* `response_size_bytes` (INTEGER)
* `response_headers` / `response_body` (TEXT)
* `sent_at` (TIMESTAMP)

---

## Setup Instructions

### Prerequisites
* Node.js v18.0.0 or higher
* Python v3.10 or higher
* `pip` package manager

### 1. Start the Backend API Proxy
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a Python virtual environment and activate it (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will start on `http://localhost:8000`. It will automatically initialize the database `postman_clone.db` and seed it with test collections, history logs, and variable environments.

### 2. Start the Frontend App
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install node packages:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Verification & Testing

To execute automated backend unit tests (covers API endpoints, environments, history tracking, and variables replacement):
1. Navigate to the `backend` folder.
2. Activate your virtual environment and run:
   ```bash
   pytest
   ```
