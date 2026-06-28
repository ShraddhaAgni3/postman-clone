import time
import re
import json
import httpx
from typing import Dict, List, Any, Tuple
from sqlalchemy.orm import Session
from . import schemas, crud, models

def resolve_variables_string(text: str, variables: Dict[str, str]) -> str:
    if not text:
        return text
    # Matches {{variable_name}}
    pattern = r"\{\{\s*([^}\s]+)\s*\}\}"
    def replace(match):
        var_name = match.group(1)
        # Return the variable value if available, else keep the original placeholder
        return variables.get(var_name, match.group(0))
    return re.sub(pattern, replace, text)

def resolve_variables_in_object(obj: Any, variables: Dict[str, str]) -> Any:
    if isinstance(obj, str):
        return resolve_variables_string(obj, variables)
    elif isinstance(obj, list):
        return [resolve_variables_in_object(item, variables) for item in obj]
    elif isinstance(obj, dict):
        return {key: resolve_variables_in_object(val, variables) for key, val in obj.items()}
    return obj

async def run_proxy_request(db: Session, req: schemas.ProxyRequest) -> schemas.ProxyResponse:
    # 1. Fetch variables for environment if environment_id is provided
    variables: Dict[str, str] = {}
    if req.environment_id:
        db_env = db.query(models.Environment).filter(models.Environment.id == req.environment_id).first()
        if db_env:
            for var in db_env.variables:
                if var.enabled:
                    variables[var.key] = var.value

    # 2. Resolve variables on request fields
    resolved_url = resolve_variables_string(req.url, variables)
    resolved_method = req.method.upper()
    
    # Ensure URL has a scheme (default to http)
    if resolved_url and not resolved_url.startswith(("http://", "https://")):
        resolved_url = "http://" + resolved_url

    resolved_headers = []
    for h in req.headers:
        if h.enabled:
            resolved_headers.append(schemas.KeyValueItem(
                key=resolve_variables_string(h.key, variables),
                value=resolve_variables_string(h.value, variables),
                enabled=True
            ))

    resolved_params = []
    for p in req.params:
        if p.enabled:
            resolved_params.append(schemas.KeyValueItem(
                key=resolve_variables_string(p.key, variables),
                value=resolve_variables_string(p.value, variables),
                enabled=True
            ))

    # Resolve Body
    resolved_body_raw = resolve_variables_string(req.body_raw, variables) if req.body_raw else None
    
    resolved_form_data = []
    for f in req.body_form_data:
        if f.enabled:
            resolved_form_data.append(schemas.KeyValueItem(
                key=resolve_variables_string(f.key, variables),
                value=resolve_variables_string(f.value, variables),
                enabled=True,
                type=f.type
            ))

    resolved_urlencoded = []
    for u in req.body_urlencoded:
        if u.enabled:
            resolved_urlencoded.append(schemas.KeyValueItem(
                key=resolve_variables_string(u.key, variables),
                value=resolve_variables_string(u.value, variables),
                enabled=True
            ))

    # 3. Construct HTTPX request arguments
    client_headers: Dict[str, str] = {}
    for h in resolved_headers:
        if h.key:
            client_headers[h.key] = h.value

    # Handle Authorization Tab
    auth_type = req.auth_type
    auth_config = req.auth_config
    auth_obj = None

    if auth_type == "bearer" and auth_config and auth_config.token:
        token_val = resolve_variables_string(auth_config.token, variables)
        client_headers["Authorization"] = f"Bearer {token_val}"
    elif auth_type == "basic" and auth_config:
        username_val = resolve_variables_string(auth_config.username or "", variables)
        password_val = resolve_variables_string(auth_config.password or "", variables)
        auth_obj = (username_val, password_val)

    # Build query parameters
    client_params: Dict[str, str] = {}
    for p in resolved_params:
        if p.key:
            client_params[p.key] = p.value

    # Build client body payload
    client_data = None
    client_files = None
    client_content = None

    if req.body_type == "raw" and resolved_body_raw:
        client_content = resolved_body_raw.encode("utf-8")
        # Ensure Content-Type header exists if raw text is JSON and header not set manually
        if "content-type" not in {k.lower() for k in client_headers.keys()}:
            client_headers["Content-Type"] = "application/json"
    elif req.body_type == "x-www-form-urlencoded":
        client_data = {}
        for u in resolved_urlencoded:
            if u.key:
                client_data[u.key] = u.value
    elif req.body_type == "form-data":
        # Using client_data for standard fields in multipart
        client_data = {}
        for f in resolved_form_data:
            if f.key:
                client_data[f.key] = f.value

    # 4. Fire Outbound Request
    start_time = time.perf_counter()
    response_status = 0
    response_status_text = "Unknown Error"
    response_time_ms = 0
    response_size_bytes = 0
    response_headers_list: List[schemas.KeyValueItem] = []
    response_body_text = None
    error_msg = None

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.request(
                method=resolved_method,
                url=resolved_url,
                headers=client_headers,
                params=client_params,
                auth=auth_obj,
                data=client_data,
                files=client_files,
                content=client_content
            )
            
            end_time = time.perf_counter()
            response_time_ms = int((end_time - start_time) * 1000)
            response_status = response.status_code
            response_status_text = response.reason_phrase
            response_size_bytes = len(response.content)
            
            # Read response body (safely try utf-8, fallback to representation)
            try:
                response_body_text = response.text
            except Exception:
                response_body_text = str(response.content)

            # Gather response headers
            for k, v in response.headers.items():
                response_headers_list.append(schemas.KeyValueItem(
                    key=k,
                    value=v,
                    enabled=True
                ))

    except httpx.TimeoutException:
        end_time = time.perf_counter()
        response_time_ms = int((end_time - start_time) * 1000)
        response_status = 504
        response_status_text = "Gateway Timeout"
        error_msg = "Request timed out after 30 seconds."
    except httpx.InvalidURL as e:
        end_time = time.perf_counter()
        response_time_ms = int((end_time - start_time) * 1000)
        response_status = 400
        response_status_text = "Bad Request"
        error_msg = f"Invalid URL: {str(e)}"
    except Exception as e:
        end_time = time.perf_counter()
        response_time_ms = int((end_time - start_time) * 1000)
        response_status = 0
        response_status_text = "Error"
        error_msg = f"Network Error: {str(e)}"

    # 5. Automatically create History entry in SQLite
    # Save the original request definition (preserving environment variable formats for reconstruction)
    history_create = schemas.HistoryCreate(
        method=req.method,
        url=req.url,
        headers=req.headers,
        params=req.params,
        body_type=req.body_type,
        body_raw=req.body_raw,
        auth_type=req.auth_type,
        response_status=response_status,
        response_status_text=response_status_text,
        response_time_ms=response_time_ms,
        response_size_bytes=response_size_bytes,
        response_headers=response_headers_list,
        response_body=response_body_text or error_msg
    )
    crud.create_history_entry(db, history_create)

    # 6. Return response
    return schemas.ProxyResponse(
        status=response_status,
        status_text=response_status_text,
        time_ms=response_time_ms,
        size_bytes=response_size_bytes,
        headers=response_headers_list,
        body=response_body_text,
        error=error_msg
    )
