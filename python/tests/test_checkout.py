import pytest
from fastapi.testclient import TestClient
import jwt
import time
from unittest.mock import patch, MagicMock

from app import app

client = TestClient(app)

def get_test_token(user_id="test_user", email="test@example.com"):
    """Generate a valid test token"""
    payload = {
        "sub": user_id,
        "email": email,
        "exp": time.time() + 3600
    }
    return jwt.encode(payload, "test_secret", algorithm="HS256")

@pytest.fixture
def mock_stripe():
    with patch("stripe.checkout.Session.create") as mock_create:
        mock_session = MagicMock()
        mock_session.id = "test_session_id"
        mock_create.return_value = mock_session
        yield mock_create

def test_create_checkout_session_success(mock_stripe):
    """Test successful checkout session creation"""
    token = get_test_token()
    response = client.post(
        "/api/create-checkout-session",
        headers={"Authorization": f"Bearer {token}"},
        json={"priceId": "price_123"}
    )
    assert response.status_code == 200
    assert response.json() == {"sessionId": "test_session_id"}
    mock_stripe.assert_called_once()

def test_create_checkout_session_no_auth():
    """Test checkout fails without authentication"""
    response = client.post(
        "/api/create-checkout-session",
        json={"priceId": "price_123"}
    )
    assert response.status_code == 401
    assert "unauthorized" in response.json()["error"]