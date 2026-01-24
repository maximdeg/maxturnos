import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_email_service_for_verification():
    url = f"{BASE_URL}/api/auth/verify-email"
    payload = {
        "email": "testprovider@example.com"
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200 or response.status_code == 202, f"Unexpected status code: {response.status_code}"
        json_response = response.json()
        # Check presence of the message key and that it's a non-empty string
        assert "message" in json_response, "Response JSON missing 'message'"
        assert isinstance(json_response["message"], str) and len(json_response["message"].strip()) > 0, f"Invalid message content: {json_response['message']}"
    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

test_email_service_for_verification()