import pytest
from fastapi.testclient import TestClient

from app import main
from app.store import Store


@pytest.fixture
def client():
    main.store = Store()
    return TestClient(main.app)


@pytest.fixture
def auth_headers(client):
    client.post("/auth/login", json={"username": "demo", "password": "spendboard"})
    return {}
