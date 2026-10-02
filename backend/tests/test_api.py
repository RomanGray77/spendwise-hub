from datetime import date


def test_local_frontend_origin_is_allowed(client):
    response = client.options(
        "/auth/me",
        headers={
            "Origin": "http://localhost:8080",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:8080"
    assert response.headers["access-control-allow-credentials"] == "true"


def test_login_and_protected_access(client, auth_headers):
    assert client.get("/auth/me", headers=auth_headers).json() == {"id": "user-1", "username": "demo"}
    assert client.get("/categories", headers=auth_headers).status_code == 200
    assert client.post("/auth/logout", headers=auth_headers).status_code == 204
    assert client.get("/categories").status_code == 401
    assert client.get("/auth/me").json() is None


def test_bad_credentials(client):
    response = client.post("/auth/login", json={"username": "demo", "password": "wrong"})
    assert response.status_code == 401
    assert response.json() == {"message": "Incorrect username or password."}


def test_seeded_transactions_and_summary(client, auth_headers):
    transactions = client.get("/transactions", headers=auth_headers).json()
    assert len(transactions) == 11
    categories = {item["name"]: item["id"] for item in client.get("/categories", headers=auth_headers).json()}
    assert set(categories) == {"Food", "Transport", "Housing", "Salary", "Entertainment", "Other"}
    assert client.get(f"/categories/{categories['Food']}", headers=auth_headers).json()["name"] == "Food"
    food = client.get(f"/transactions?categoryId={categories['Food']}", headers=auth_headers).json()
    assert len(food) == 3
    assert all(item["categoryId"] == categories["Food"] for item in food)
    result = client.get("/summary", params={"startDate": f"{date.today().year}-01-01", "endDate": f"{date.today().year}-12-31"}, headers=auth_headers)
    assert result.status_code == 200
    summary = result.json()
    assert summary["totalIncomeCents"] == 992000
    assert summary["totalExpenseCents"] == -401520
    assert summary["netBalanceCents"] == summary["totalIncomeCents"] + summary["totalExpenseCents"]


def test_data_persists_when_app_reconnects_to_database(tmp_path):
    from fastapi.testclient import TestClient
    from app.main import create_app

    database_url = f"sqlite:///{tmp_path / 'persistent.db'}"
    with TestClient(create_app(database_url)) as first_client:
        first_client.post("/auth/login", json={"username": "demo", "password": "spendboard"})
        created = first_client.post("/categories", json={"name": "Books"})
        assert created.status_code == 201

    with TestClient(create_app(database_url)) as second_client:
        second_client.post("/auth/login", json={"username": "demo", "password": "spendboard"})
        names = {item["name"] for item in second_client.get("/categories").json()}
        assert "Books" in names


def test_database_url_environment_variable_is_used(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import create_app

    database_path = tmp_path / "configured.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{database_path}")
    with TestClient(create_app()) as configured_client:
        assert configured_client.get("/health").status_code == 200
    assert database_path.exists()


def test_category_crud_and_in_use_conflict(client, auth_headers):
    created = client.post("/categories", json={"name": "  Books "}, headers=auth_headers)
    assert created.status_code == 201
    category = created.json()
    renamed = client.patch(f"/categories/{category['id']}", json={"name": "Reading"}, headers=auth_headers)
    assert renamed.json()["name"] == "Reading"
    assert client.delete(f"/categories/{category['id']}", headers=auth_headers).status_code == 204
    used_id = client.get("/categories", headers=auth_headers).json()[0]["id"]
    assert client.delete(f"/categories/{used_id}", headers=auth_headers).status_code == 409


def test_transaction_crud(client, auth_headers):
    category_id = client.get("/categories", headers=auth_headers).json()[0]["id"]
    payload = {"name": "Coffee", "categoryId": category_id, "amount": "-4.25", "date": "2026-09-20", "note": "  oat milk  "}
    created_response = client.post("/transactions", json=payload, headers=auth_headers)
    assert created_response.status_code == 201
    created = created_response.json()
    assert created["note"] == "oat milk"
    payload["amount"] = "-5.00"
    updated = client.put(f"/transactions/{created['id']}", json=payload, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["amountCents"] == -500
    assert client.delete(f"/transactions/{created['id']}", headers=auth_headers).status_code == 204
    assert client.delete(f"/transactions/{created['id']}", headers=auth_headers).status_code == 404


def test_validation_uses_spec_error_shape(client, auth_headers):
    response = client.post("/categories", json={"name": "   "}, headers=auth_headers)
    assert response.status_code == 400
    assert "message" in response.json()
