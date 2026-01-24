import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Replace these with valid provider credentials or create/register user dynamically if needed.
PROVIDER_USERNAME = None
PROVIDER_EMAIL = None
PROVIDER_PASSWORD = "TestPass123!"
NEW_PASSWORD = "NewTestPass123!"
HEADERS = {"Content-Type": "application/json"}
AUTH_TOKEN = None

def register_provider():
    register_url = f"{BASE_URL}/api/auth/register"
    unique_username = f"testprovider_{uuid.uuid4().hex[:8]}"
    unique_email = f"{unique_username}@example.com"
    payload = {
        "username": unique_username,
        "email": unique_email,
        "password": PROVIDER_PASSWORD,
        "name": "Test Provider"
    }
    resp = requests.post(register_url, json=payload, timeout=TIMEOUT, headers=HEADERS)
    resp.raise_for_status()
    return unique_username, unique_email

def login_provider(email, password):
    login_url = f"{BASE_URL}/api/auth/login"
    resp = requests.post(login_url, json={"email": email, "password": password}, timeout=TIMEOUT, headers=HEADERS)
    resp.raise_for_status()
    data = resp.json()
    token = data.get("token")
    assert token, "Login failed to provide token"
    return token

def get_profile(token):
    url = f"{BASE_URL}/api/proveedor/profile"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()

def update_profile(token, updated_fields):
    url = f"{BASE_URL}/api/proveedor/profile"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.put(url, json=updated_fields, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()

def get_work_schedule(token):
    url = f"{BASE_URL}/api/proveedor/work-schedule"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()

def update_work_schedule(token, schedule_payload):
    url = f"{BASE_URL}/api/proveedor/work-schedule"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.put(url, json=schedule_payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()

def get_unavailable_days(token):
    url = f"{BASE_URL}/api/proveedor/unavailable-days"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()

def update_unavailable_days(token, unavailable_days_payload):
    url = f"{BASE_URL}/api/proveedor/unavailable-days"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.put(url, json=unavailable_days_payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()

def change_password(token, current_password, new_password):
    url = f"{BASE_URL}/api/proveedor/profile/password"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "currentPassword": current_password,
        "newPassword": new_password,
    }
    resp = requests.put(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()

def delete_provider(token, username):
    # Assuming there is an endpoint or method to delete a test provider account for cleanup.
    # If no such endpoint exists, skip this step.
    pass

def test_provider_profile_management():
    global AUTH_TOKEN, PROVIDER_USERNAME, PROVIDER_EMAIL

    # 1. Register new provider user for test
    PROVIDER_USERNAME, PROVIDER_EMAIL = register_provider()
    assert PROVIDER_USERNAME is not None

    try:
        # 2. Login to get auth token
        AUTH_TOKEN = login_provider(PROVIDER_EMAIL, PROVIDER_PASSWORD)
        assert AUTH_TOKEN is not None

        # 3. Retrieve current profile and validate fields exist
        profile = get_profile(AUTH_TOKEN)
        assert "username" in profile and profile["username"] == PROVIDER_USERNAME

        # 4. Update profile info and verify reflection
        new_name = profile.get("name", "Test Provider Updated") + " Updated"
        updated_profile = update_profile(AUTH_TOKEN, {"name": new_name})
        assert updated_profile.get("name") == new_name

        # 5. Confirm profile change is immediate by getting profile again
        profile_after_update = get_profile(AUTH_TOKEN)
        assert profile_after_update.get("name") == new_name

        # 6. Get current work schedule
        current_schedule = get_work_schedule(AUTH_TOKEN)
        assert isinstance(current_schedule, list)

        # 7. Update work schedule with sample weekly availability
        new_schedule = [
            {"dayOfWeek": 1, "startTime": "09:00", "endTime": "13:00"},
            {"dayOfWeek": 3, "startTime": "14:00", "endTime": "18:00"},
            {"dayOfWeek": 5, "startTime": "08:00", "endTime": "12:00"}
        ]
        updated_schedule = update_work_schedule(AUTH_TOKEN, new_schedule)
        assert len(updated_schedule) == len(new_schedule)
        for item in updated_schedule:
            assert "dayOfWeek" in item and "startTime" in item and "endTime" in item

        # 8. Get unavailable days list
        unavailable_days = get_unavailable_days(AUTH_TOKEN)
        assert isinstance(unavailable_days, list)

        # 9. Update unavailable days with example dates
        from datetime import datetime, timedelta
        date1 = (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d")
        date2 = (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d")
        new_unavailable_days = [date1, date2]
        updated_unavail = update_unavailable_days(AUTH_TOKEN, new_unavailable_days)
        # Expect the response to reflect updated unavailable days
        assert set(updated_unavail) >= set(new_unavailable_days)

        # 10. Change password and verify success
        password_change_resp = change_password(AUTH_TOKEN, PROVIDER_PASSWORD, NEW_PASSWORD)
        assert "message" in password_change_resp

        # 11. Verify login with new password works
        new_token = login_provider(PROVIDER_EMAIL, NEW_PASSWORD)
        assert new_token is not None

        # 12. Change back password to original for cleanup
        password_change_resp_back = change_password(new_token, NEW_PASSWORD, PROVIDER_PASSWORD)
        assert "message" in password_change_resp_back

    finally:
        # Cleanup if there is a delete provider or logout endpoint
        # No specific delete endpoint mentioned; skipping provider deletion
        pass

test_provider_profile_management()
