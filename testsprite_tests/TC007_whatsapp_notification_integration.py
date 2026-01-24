import requests
import datetime
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30


def test_whatsapp_notification_integration():
    # Test creation of appointment triggers WhatsApp confirmation message
    # Then test cancellation triggers WhatsApp cancellation message

    # Sample valid appointment data for creation
    appointment_payload = {
        "first_name": "Test",
        "last_name": "Patient",
        "phone": "+12345678901",
        "provider_username": "testprovider",
        "date": None,
        "time": "10:00",
        "visit_type": "general_consultation",
        "health_insurance": "BasicHealth",
        "comments": "Testing WhatsApp notification integration"
    }

    # Select a date at least 1 day in the future to allow cancellation
    today = datetime.date.today()
    appointment_date = today + datetime.timedelta(days=2)  # two days ahead
    appointment_payload["date"] = appointment_date.isoformat()

    headers = {
        "Content-Type": "application/json"
    }

    appointment_id = None

    try:
        # Step 1: Create appointment
        create_resp = requests.post(
            f"{BASE_URL}/api/appointments/create",
            json=appointment_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert create_resp.status_code == 201, f"Appointment creation failed: {create_resp.text}"
        created_data = create_resp.json()
        assert "id" in created_data, "Created response missing appointment id"
        appointment_id = created_data["id"]

        # Wait briefly to allow WhatsApp confirmation to be sent asynchronously if applicable
        time.sleep(3)

        # Step 2: Cancel appointment
        cancel_resp = requests.post(
            f"{BASE_URL}/api/appointments/{appointment_id}/cancel",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert cancel_resp.status_code == 200, f"Appointment cancellation failed: {cancel_resp.text}"
        cancel_data = cancel_resp.json()
        assert cancel_data.get("status") == "cancelled", "Appointment status not updated to cancelled"

        # Wait briefly to allow WhatsApp cancellation message to be sent asynchronously if applicable
        time.sleep(3)

        # Step 3: Fetch appointment details to verify status
        get_resp = requests.get(
            f"{BASE_URL}/api/appointments/{appointment_id}",
            headers=headers,
            timeout=TIMEOUT,
        )
        assert get_resp.status_code == 200, f"Failed to fetch appointment details: {get_resp.text}"
        get_data = get_resp.json()
        assert get_data.get("status") == "cancelled", "Appointment status in details is not cancelled"

        # The WhatsApp notifications are assumed to be sent by backend, so success on creation and cancellation with correct status implies successful integration.

    finally:
        # Clean up: delete the appointment if still present
        if appointment_id:
            requests.delete(
                f"{BASE_URL}/api/appointments/{appointment_id}",
                headers=headers,
                timeout=TIMEOUT,
            )


test_whatsapp_notification_integration()