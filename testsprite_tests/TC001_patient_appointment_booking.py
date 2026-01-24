import requests
import datetime

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}


def test_patient_appointment_booking():
    # Helper function to create a valid appointment payload
    def create_valid_appointment_payload():
        # We pick a date 3 days ahead for appointment
        date_obj = datetime.date.today() + datetime.timedelta(days=3)
        date_str = date_obj.isoformat()

        # Changed visit_type and health_insurance to valid known options
        visit_type = "Consulta General"
        health_insurance = "OSDE"

        # Pick a time, e.g., 10:00 AM
        time = "10:00"

        payload = {
            "date": date_str,
            "time": time,
            "visit_type": visit_type,
            "health_insurance": health_insurance,
            "patient_name": "Test Patient",
            "patient_phone": "+1234567890",
            "patient_email": "test.patient@example.com",
            "provider_username": "drsmith"
        }
        return payload

    # Endpoint for creating an appointment (assumed from PRD - app/api/appointments/create/route.ts)
    url_create_appointment = f"{BASE_URL}/api/appointments/create"

    # --- Test successful booking with valid data ---
    appointment_payload = create_valid_appointment_payload()
    response = requests.post(url_create_appointment, json=appointment_payload, headers=HEADERS, timeout=TIMEOUT)
    assert response.status_code == 201 or response.status_code == 200, f"Expected 201 or 200, got {response.status_code}"
    appointment_data = response.json()
    assert "id" in appointment_data, "Response JSON should contain 'id'"
    appointment_id = appointment_data["id"]

    # --- Test validation errors for incomplete data ---
    incomplete_payloads = [
        {},  # Empty payload
        {"date": "", "time": "", "visit_type": "", "health_insurance": ""},  # empty fields
        {"date": "invalid-date", "time": "25:00", "visit_type": "X", "health_insurance": "Y"},  # invalid formats
        {"date": appointment_payload["date"]},  # missing fields
        {"time": appointment_payload["time"]},  # missing fields
    ]

    for invalid_payload in incomplete_payloads:
        resp = requests.post(url_create_appointment, json=invalid_payload, headers=HEADERS, timeout=TIMEOUT)
        assert resp.status_code == 400 or resp.status_code == 422, (
            f"Expected 400 or 422 for invalid input, got {resp.status_code} with payload {invalid_payload}"
        )
        json_resp = resp.json()
        # We expect some error message or errors in response
        assert any(key in json_resp for key in ("errors", "message", "error")), (
            f"Error response missing expected keys for payload {invalid_payload}"
        )

    # --- Test validation error for missing mandatory fields one by one ---
    mandatory_fields = ["date", "time", "visit_type", "health_insurance"]
    for field in mandatory_fields:
        invalid_payload = appointment_payload.copy()
        invalid_payload.pop(field)
        resp = requests.post(url_create_appointment, json=invalid_payload, headers=HEADERS, timeout=TIMEOUT)
        assert resp.status_code == 400 or resp.status_code == 422, (
            f"Expected 400 or 422 when missing field {field}, got {resp.status_code}"
        )
        json_resp = resp.json()
        assert any(key in json_resp for key in ("errors", "message", "error")), (
            f"Error response missing expected keys when missing field {field}"
        )

    # --- Test validation error for invalid date (past date) ---
    past_date_payload = appointment_payload.copy()
    past_date_payload["date"] = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    resp = requests.post(url_create_appointment, json=past_date_payload, headers=HEADERS, timeout=TIMEOUT)
    assert resp.status_code == 400 or resp.status_code == 422, f"Expected 400 or 422 for past date, got {resp.status_code}"
    json_resp = resp.json()
    assert any(key in json_resp for key in ("errors", "message", "error")), "Missing error keys for past date validation"

    # --- Test validation error for invalid time (e.g., outside provider working hours) ---
    invalid_time_payload = appointment_payload.copy()
    invalid_time_payload["time"] = "03:00"  # Assuming 3 AM not valid time slot
    resp = requests.post(url_create_appointment, json=invalid_time_payload, headers=HEADERS, timeout=TIMEOUT)
    assert resp.status_code == 400 or resp.status_code == 422, f"Expected 400 or 422 for invalid time, got {resp.status_code}"
    json_resp = resp.json()
    assert any(key in json_resp for key in ("errors", "message", "error")), "Missing error keys for invalid time validation"

    # Cleanup: delete the created appointment to maintain test isolation
    try:
        url_delete = f"{BASE_URL}/api/appointments/{appointment_id}/cancel"
        # Use DELETE or POST depending on API (assumed POST here)
        del_resp = requests.post(url_delete, headers=HEADERS, timeout=TIMEOUT)
        assert del_resp.status_code == 200 or del_resp.status_code == 204, f"Failed to delete appointment {appointment_id}"
    except Exception:
        # fail silently, test main assertions already passed
        pass


test_patient_appointment_booking()
