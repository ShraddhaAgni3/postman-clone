import json
from sqlalchemy.orm import Session
from . import models, database

def seed_db(db: Session):
    # Only seed if no collections exist yet (prevent duplicates)
    if db.query(models.Collection).count() > 0:
        return

    print("Seeding database with sample collections, environments, and history...")

    # 1. Seed Environments
    staging_env = models.Environment(name="Staging Environment")
    db.add(staging_env)
    db.commit()
    db.refresh(staging_env)

    vars_staging = [
        models.EnvironmentVariable(environment_id=staging_env.id, key="baseUrl", value="https://jsonplaceholder.typicode.com", enabled=True),
        models.EnvironmentVariable(environment_id=staging_env.id, key="userId", value="1", enabled=True),
        models.EnvironmentVariable(environment_id=staging_env.id, key="token", value="staging-token-xyz-987", enabled=True)
    ]
    db.add_all(vars_staging)

    httpbin_env = models.Environment(name="HttpBin Environment")
    db.add(httpbin_env)
    db.commit()
    db.refresh(httpbin_env)

    vars_httpbin = [
        models.EnvironmentVariable(environment_id=httpbin_env.id, key="httpbinUrl", value="https://httpbin.org", enabled=True),
        models.EnvironmentVariable(environment_id=httpbin_env.id, key="apiKey", value="client-key-abc", enabled=True)
    ]
    db.add_all(vars_httpbin)
    db.commit()

    # 2. Seed Collections and saved requests
    placeholder_col = models.Collection(
        name="JSONPlaceholder Sandbox",
        description="Sample collection for testing REST operations against jsonplaceholder.typicode.com."
    )
    db.add(placeholder_col)
    db.commit()
    db.refresh(placeholder_col)

    # Saved requests under JSONPlaceholder Sandbox
    req_get_posts = models.Request(
        collection_id=placeholder_col.id,
        name="Get All Posts",
        method="GET",
        url="{{baseUrl}}/posts",
        headers=json.dumps([
            {"key": "Accept", "value": "application/json", "enabled": True},
            {"key": "Authorization", "value": "Bearer {{token}}", "enabled": True}
        ]),
        params=json.dumps([
            {"key": "userId", "value": "{{userId}}", "enabled": True}
        ]),
        body_type="none",
        auth_type="none"
    )

    req_create_post = models.Request(
        collection_id=placeholder_col.id,
        name="Create Post",
        method="POST",
        url="{{baseUrl}}/posts",
        headers=json.dumps([
            {"key": "Content-Type", "value": "application/json", "enabled": True}
        ]),
        body_type="raw",
        body_raw_type="JSON",
        body_raw='{\n  "title": "Next.js + FastAPI",\n  "body": "Postman Clone works!",\n  "userId": {{userId}}\n}',
        auth_type="none"
    )
    
    req_delete_post = models.Request(
        collection_id=placeholder_col.id,
        name="Delete Post",
        method="DELETE",
        url="{{baseUrl}}/posts/1",
        body_type="none",
        auth_type="none"
    )

    db.add_all([req_get_posts, req_create_post, req_delete_post])

    # Seeding HttpBin Playground collection
    httpbin_col = models.Collection(
        name="HttpBin Playground",
        description="Interact with various httpbin.org request inspector methods."
    )
    db.add(httpbin_col)
    db.commit()
    db.refresh(httpbin_col)

    req_bin_headers = models.Request(
        collection_id=httpbin_col.id,
        name="Inspect Request Headers",
        method="GET",
        url="{{httpbinUrl}}/headers",
        headers=json.dumps([
            {"key": "X-Client-Header", "value": "PostmanCloneApp", "enabled": True}
        ]),
        body_type="none"
    )

    req_bin_form = models.Request(
        collection_id=httpbin_col.id,
        name="Submit Form Data (URL Encoded)",
        method="POST",
        url="{{httpbinUrl}}/post",
        body_type="x-www-form-urlencoded",
        body_urlencoded=json.dumps([
            {"key": "username", "value": "guest_user", "enabled": True},
            {"key": "role", "value": "developer", "enabled": True}
        ])
    )
    
    req_bin_basic_auth = models.Request(
        collection_id=httpbin_col.id,
        name="Basic Authentication Check",
        method="GET",
        url="{{httpbinUrl}}/basic-auth/admin/secretpass",
        body_type="none",
        auth_type="basic",
        auth_config=json.dumps({
            "username": "admin",
            "password": "secretpass"
        })
    )

    db.add_all([req_bin_headers, req_bin_form, req_bin_basic_auth])
    db.commit()

    # 3. Seed History Logs
    hist1 = models.History(
        method="GET",
        url="https://jsonplaceholder.typicode.com/posts?userId=1",
        headers=json.dumps([
            {"key": "Accept", "value": "application/json", "enabled": True}
        ]),
        params=json.dumps([
            {"key": "userId", "value": "1", "enabled": True}
        ]),
        body_type="none",
        response_status=200,
        response_status_text="OK",
        response_time_ms=145,
        response_size_bytes=2420,
        response_headers=json.dumps([
            {"key": "content-type", "value": "application/json; charset=utf-8", "enabled": True},
            {"key": "cache-control", "value": "max-age=43200", "enabled": True}
        ]),
        response_body='[\n  {\n    "userId": 1,\n    "id": 1,\n    "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",\n    "body": "quia et suscipit\\nsuscipit recusandae consequuntur expedita et cum\\nreprehenderit molestiae ut ut quas totam\\nnostrum rerum est autem sunt rem eveniet architecto"\n  }\n]'
    )

    hist2 = models.History(
        method="POST",
        url="https://httpbin.org/post",
        body_type="x-www-form-urlencoded",
        response_status=200,
        response_status_text="OK",
        response_time_ms=280,
        response_size_bytes=452,
        response_headers=json.dumps([
            {"key": "content-type", "value": "application/json", "enabled": True}
        ]),
        response_body='{\n  "args": {},\n  "data": "",\n  "files": {},\n  "form": {\n    "role": "developer",\n    "username": "guest_user"\n  },\n  "headers": {\n    "Host": "httpbin.org"\n  },\n  "json": null,\n  "url": "https://httpbin.org/post"\n}'
    )

    db.add_all([hist1, hist2])
    db.commit()
    print("Database seeding completed successfully.")
