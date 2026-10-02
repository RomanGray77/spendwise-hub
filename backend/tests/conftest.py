import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(tmp_path):
    app = create_app(f"sqlite:///{tmp_path / 'test.db'}")
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers(client):
    client.post("/auth/login", json={"username": "demo", "password": "spendboard"})
    return {}
