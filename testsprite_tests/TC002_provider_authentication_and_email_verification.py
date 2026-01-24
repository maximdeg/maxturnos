import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30


def test_provider_authentication_and_email_verification():
    # Provider registration payload
    registration_payload = {
        "email": "testprovider@example.com",
        "password": "StrongPassword123!",
        "name": "Test Provider",
        "specialty": "Cardiology",
        "phone": "+1234567890"
    }
    headers = {"Content-Type": "application/json"}

    # Register provider
    reg_resp = requests.post(
        f"{BASE_URL}/api/auth/register",
        json=registration_payload,
        headers=headers,
        timeout=TIMEOUT,
    )
    assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"
    reg_data = reg_resp.json()
    assert "message" in reg_data

    # Attempt login before email verification - should fail
    login_payload = {
        "email": registration_payload["email"],
        "password": registration_payload["password"],
    }
    login_resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=login_payload,
        headers=headers,
        timeout=TIMEOUT,
    )
    # Expect 401 or 403 for unverified email
    assert login_resp.status_code in (401, 403), f"Login should fail before verification: {login_resp.text}"

    # Since no test endpoint to get verification token exists, skip email verification step
    # and do not attempt to login after verification.

    # Cleanup: delete the created provider account if such endpoint exists
    # Here, without token we cannot login, so skip cleanup.


test_provider_authentication_and_email_verification()
