import requests
from datetime import datetime, timedelta
import json

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_available_times_calculation():
    session = requests.Session()
    headers = {"Content-Type": "application/json"}

    try:
        # Step 1: Create a new provider to test with (simulate registration)
        provider_data = {
            "username": "testprovider_availtimes",
            "email": "testprovider_availtimes@example.com",
            "password": "StrongPassw0rd!",
            "name": "Test Provider"
        }
        resp = session.post(f"{BASE_URL}/api/auth/register", json=provider_data, headers=headers, timeout=TIMEOUT)
        if resp.status_code == 409 or (resp.status_code == 400 and 'already registrado' in resp.text):
            # Provider already exists, continue
            pass
        else:
            assert resp.status_code == 201 or resp.status_code == 200, f"Provider registration failed: {resp.text}"
            provider_info = resp.json()
            assert "username" in provider_info, "Provider username not returned"

        # Step 2: Simulate verifying provider email if needed (assuming API for it)
        verify_payload = {"email": provider_data["email"]}
        verify_resp = session.post(f"{BASE_URL}/api/auth/verify-email", json=verify_payload, headers=headers, timeout=TIMEOUT)
        assert verify_resp.status_code in (200, 204), f"Email verification failed: {verify_resp.text}"

        # Step 3: Login provider to get auth token (likely JWT)
        login_payload = {"email": provider_data["email"], "password": provider_data["password"]}
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json=login_payload, headers=headers, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_json = login_resp.json()
        assert "token" in login_json or "accessToken" in login_json, "Auth token not returned on login"
        token = login_json.get("token") or login_json.get("accessToken")
        auth_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # Step 4: Set provider work schedule for a week (e.g. Monday to Friday 9:00-17:00)
        work_schedule = {
            "workDays": [
                {"dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00"},
                {"dayOfWeek": 2, "startTime": "09:00", "endTime": "17:00"},
                {"dayOfWeek": 3, "startTime": "09:00", "endTime": "17:00"},
                {"dayOfWeek": 4, "startTime": "09:00", "endTime": "17:00"},
                {"dayOfWeek": 5, "startTime": "09:00", "endTime": "17:00"}
            ]
        }
        ws_resp = session.put(f"{BASE_URL}/api/proveedor/work-schedule", json=work_schedule, headers=auth_headers, timeout=TIMEOUT)
        assert ws_resp.status_code in (200, 204), f"Setting work schedule failed: {ws_resp.text}"

        # Step 5: Mark one day as unavailable (e.g. tomorrow)
        tomorrow_date = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
        unavailable_days_payload = {"dates": [tomorrow_date]}
        ud_resp = session.post(f"{BASE_URL}/api/proveedor/unavailable-days", json=unavailable_days_payload, headers=auth_headers, timeout=TIMEOUT)
        assert ud_resp.status_code in (200, 201, 204), f"Setting unavailable days failed: {ud_resp.text}"

        # Step 6: Create an existing appointment for the provider on a specific date (day after tomorrow at 10:00)
        appointment_date = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
        appointment_payload = {
            "providerUsername": provider_data["username"],
            "patientName": "John Doe",
            "date": appointment_date,
            "time": "10:00",
            "visitType": "General Consultation",
            "healthInsurance": "None",
            "contactInfo": "john@example.com"
        }
        appt_resp = session.post(f"{BASE_URL}/api/appointments/create", json=appointment_payload, headers=auth_headers, timeout=TIMEOUT)
        assert appt_resp.status_code in (200, 201), f"Creating appointment failed: {appt_resp.text}"
        appt_info = appt_resp.json()
        assert "id" in appt_info, "Appointment creation response missing id"
        appointment_id = appt_info["id"]

        # Step 7: Call available times API for the provider on the unavailable day (tomorrow) - expect empty or no slots
        avail_resp_unavailable = session.get(f"{BASE_URL}/api/available-times/{tomorrow_date}", headers={"Content-Type": "application/json"}, timeout=TIMEOUT)
        assert avail_resp_unavailable.status_code == 200, f"Available times API failed for unavailable day: {avail_resp_unavailable.text}"
        slots_unavailable = avail_resp_unavailable.json()
        assert isinstance(slots_unavailable, list), "Available times response should be a list"
        assert len(slots_unavailable) == 0, "Expected 0 available slots for unavailable day"

        # Step 8: Call available times API for the provider on the appointment day (day after tomorrow)
        avail_resp = session.get(f"{BASE_URL}/api/available-times/{appointment_date}", headers={"Content-Type": "application/json"}, timeout=TIMEOUT)
        assert avail_resp.status_code == 200, f"Available times API failed: {avail_resp.text}"
        slots = avail_resp.json()
        assert isinstance(slots, list), "Available times response should be a list"

        # The slot "10:00" must not be available as there's an appointment
        for slot in slots:
            assert slot != "10:00", "Slot already booked should not be available"

        # Slots should fall within work schedule (9:00-17:00) in 20-minute intervals
        def is_valid_slot_time(t_str):
            try:
                t = datetime.strptime(t_str, "%H:%M")
                start = datetime.strptime("09:00", "%H:%M")
                end = datetime.strptime("17:00", "%H:%M")
                if not (start <= t < end):
                    return False
                # minutes % 20 == 0
                return t.minute % 20 == 0
            except:
                return False

        for slot in slots:
            assert is_valid_slot_time(slot), f"Slot {slot} not valid according to work schedule or 20min interval"

    finally:
        # Cleanup: delete created appointment
        try:
            session.delete(f"{BASE_URL}/api/appointments/{appointment_id}", headers=auth_headers, timeout=TIMEOUT)
        except:
            pass
        # Cleanup: delete provider account if API available (simulate deletion)
        try:
            session.delete(f"{BASE_URL}/api/proveedor/profile", headers=auth_headers, timeout=TIMEOUT)
        except:
            pass

test_available_times_calculation()
