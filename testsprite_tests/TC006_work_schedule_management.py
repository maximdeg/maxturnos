import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

# Replace with a valid JWT token for provider authentication
AUTH_TOKEN = ""  # e.g. "Bearer eyJhbGciOiJI..."


def test_work_schedule_management():
    assert AUTH_TOKEN, "AUTH_TOKEN must be set with a valid JWT token before running the test"
    headers = {
        "Content-Type": "application/json"
    }

    headers["Authorization"] = AUTH_TOKEN

    # Sample valid work schedule payload: weekly schedule with time ranges for each weekday
    valid_schedule_payload = {
        "workSchedule": {
            "monday": [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "18:00"}],
            "tuesday": [{"start": "09:00", "end": "13:00"}],
            "wednesday": [{"start": "10:00", "end": "14:00"}],
            "thursday": [{"start": "09:00", "end": "12:00"}, {"start": "13:00", "end": "17:00"}],
            "friday": [{"start": "09:00", "end": "15:00"}],
            "saturday": [],
            "sunday": []
        }
    }

    # Sample invalid work schedule payload: time range end before start
    invalid_schedule_payload = {
        "workSchedule": {
            "monday": [{"start": "13:00", "end": "09:00"}],  # Invalid time range
            "tuesday": [],
            "wednesday": [],
            "thursday": [],
            "friday": [],
            "saturday": [],
            "sunday": []
        }
    }

    try:
        # 2. Set a valid weekly work schedule
        response_set_valid = requests.put(
            f"{BASE_URL}/api/proveedor/work-schedule",
            json=valid_schedule_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert response_set_valid.status_code == 200, f"Expected 200 OK for valid schedule, got {response_set_valid.status_code}"
        data = response_set_valid.json()
        assert "workSchedule" in data, "Response missing 'workSchedule' key"
        # Verify the returned schedule matches what we sent
        assert data["workSchedule"] == valid_schedule_payload["workSchedule"], "Mismatch in stored work schedule"

        # 3. Retrieve the current work schedule to verify correct storage
        response_get = requests.get(
            f"{BASE_URL}/api/proveedor/work-schedule",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert response_get.status_code == 200, f"Expected 200 OK for get schedule, got {response_get.status_code}"
        data_get = response_get.json()
        assert "workSchedule" in data_get, "Response missing 'workSchedule' key on GET"
        assert data_get["workSchedule"] == valid_schedule_payload["workSchedule"], "GET schedule mismatch with set schedule"

        # 4. Attempt to set an invalid work schedule - expect validation error (e.g. 400 Bad Request)
        response_set_invalid = requests.put(
            f"{BASE_URL}/api/proveedor/work-schedule",
            json=invalid_schedule_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert response_set_invalid.status_code == 400, f"Expected 400 Bad Request for invalid schedule, got {response_set_invalid.status_code}"
        error_data = response_set_invalid.json()
        assert "error" in error_data or "message" in error_data, "Error response missing error description"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"


test_work_schedule_management()
