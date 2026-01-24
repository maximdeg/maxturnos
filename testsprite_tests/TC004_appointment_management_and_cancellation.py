import requests
import datetime
import time

BASE_URL = "http://localhost:3000"
HEADERS = {
    'Content-Type': 'application/json',
    # Add auth headers if necessary, e.g. 'Authorization': 'Bearer <token>'
}
TIMEOUT = 30

def test_appointment_management_and_cancellation():
    """
    Test appointment creation, cancellation (respecting 12-hour policy), viewing details,
    and sending WhatsApp notifications. Verify cancellation updates status and notifications.
    """
    appointment_id = None
    cancellation_token = None
    try:
        # Step 1: Create a new appointment (for testing, pick a date/time >12 hours from now)
        future_dt = datetime.datetime.utcnow() + datetime.timedelta(hours=13)
        date_str = future_dt.strftime("%Y-%m-%d")
        time_str = future_dt.strftime("%H:%M")

        # We need to craft a realistic appointment creation payload.
        # Since no exact schema is provided, we infer minimal required fields:
        # - patientName (string)
        # - patientPhone (string, used for WhatsApp)
        # - date (YYYY-MM-DD)
        # - time (HH:mm)
        # - visitType (string)
        # - healthInsurance (string)
        # - providerUsername (string) -- assuming needed to identify provider
        # According to PRD, patients can book without registration.

        # For the test, we pick dummy valid values:
        appointment_payload = {
            "patientName": "Test Patient",
            "patientPhone": "+1234567890",
            "date": date_str,
            "time": time_str,
            "visitType": "General Consultation",
            "healthInsurance": "Basic Health",
            # Assuming provider identification via username (required by system)
            "providerUsername": "testprovider"
        }

        # POST to appointment creation endpoint
        create_resp = requests.post(
            f"{BASE_URL}/api/appointments/create",
            headers=HEADERS,
            json=appointment_payload,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 201, f"Create appointment failed: {create_resp.status_code} {create_resp.text}"
        
        created_data = create_resp.json()
        appointment_id = created_data.get("id")
        cancellation_token = created_data.get("cancellationToken") or created_data.get("token")
        assert appointment_id, "No appointment ID returned"
        assert cancellation_token, "No cancellation token returned"

        # Verify WhatsApp confirmation notification sent:
        # Assuming API or appointment details contain a field indicating notification status.
        # If no direct API, do a GET to retrieve appointment and check status or notification logs.
        get_resp = requests.get(
            f"{BASE_URL}/api/appointments/{appointment_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert get_resp.status_code == 200, f"Get appointment details failed: {get_resp.status_code} {get_resp.text}"
        appointment_details = get_resp.json()
        assert appointment_details.get("status") == "confirmed", f"Unexpected status after creation: {appointment_details.get('status')}"
        # Check notification flag if available
        notifications = appointment_details.get("notifications", {})
        assert notifications.get("whatsappConfirmed") is True or notifications.get("whatsappSent") is True, "WhatsApp confirmation not sent"

        # Step 2: Attempt cancellation respecting 12-hour policy
        # cancellation allowed only if >12 hours before appointment time.
        # Our appointment is scheduled >13 hours ahead, so cancellation should succeed.

        cancel_resp = requests.post(
            f"{BASE_URL}/api/appointments/{appointment_id}/cancel",
            headers=HEADERS,
            json={"cancellationToken": cancellation_token},
            timeout=TIMEOUT
        )
        assert cancel_resp.status_code == 200, f"Cancellation failed: {cancel_resp.status_code} {cancel_resp.text}"
        cancel_data = cancel_resp.json()
        assert cancel_data.get("status") == "cancelled", "Appointment status not updated to cancelled after cancellation"
        assert cancel_data.get("notifications", {}).get("whatsappCancelled") is True or cancel_data.get("whatsappCancelled") is True, "WhatsApp cancellation notification not sent"

        # Step 3: Verify appointment details reflect cancellation status
        get_after_cancel_resp = requests.get(
            f"{BASE_URL}/api/appointments/{appointment_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert get_after_cancel_resp.status_code == 200, f"Get appointment after cancellation failed: {get_after_cancel_resp.status_code} {get_after_cancel_resp.text}"
        details_after_cancel = get_after_cancel_resp.json()
        assert details_after_cancel.get("status") == "cancelled", "Appointment status not cancelled after cancellation"
        
        # Step 4: Attempt to cancel an appointment within 12 hours (should fail)
        # Create second appointment within 11 hours from now
        near_dt = datetime.datetime.utcnow() + datetime.timedelta(hours=10, minutes=30)
        near_date_str = near_dt.strftime("%Y-%m-%d")
        near_time_str = near_dt.strftime("%H:%M")

        appointment_payload_near = {
            "patientName": "Test Patient",
            "patientPhone": "+1234567890",
            "date": near_date_str,
            "time": near_time_str,
            "visitType": "General Consultation",
            "healthInsurance": "Basic Health",
            "providerUsername": "testprovider"
        }
        create_near_resp = requests.post(
            f"{BASE_URL}/api/appointments/create",
            headers=HEADERS,
            json=appointment_payload_near,
            timeout=TIMEOUT
        )
        assert create_near_resp.status_code == 201, f"Create near appointment failed: {create_near_resp.status_code} {create_near_resp.text}"
        near_data = create_near_resp.json()
        near_appointment_id = near_data.get("id")
        near_cancellation_token = near_data.get("cancellationToken") or near_data.get("token")
        assert near_appointment_id, "No near appointment ID returned"
        assert near_cancellation_token, "No near cancellation token returned"

        try:
            # Try to cancel appointment within 12 hours (should see a failure with 400 or 403)
            cancel_near_resp = requests.post(
                f"{BASE_URL}/api/appointments/{near_appointment_id}/cancel",
                headers=HEADERS,
                json={"cancellationToken": near_cancellation_token},
                timeout=TIMEOUT
            )
            assert cancel_near_resp.status_code in (400, 403), "Cancellation within 12 hours should not be allowed"
            error_data = cancel_near_resp.json()
            error_msg = error_data.get("error") or error_data.get("message") or ""
            assert "12-hour" in error_msg.lower(), "Error message should mention 12-hour cancellation policy"
        finally:
            # Cleanup: delete near appointment forcibly if possible by admin API or mark cancelled.
            # If no direct delete API, best effort only.
            requests.post(
                f"{BASE_URL}/api/appointments/{near_appointment_id}/cancel",
                headers=HEADERS,
                json={"cancellationToken": near_cancellation_token},
                timeout=TIMEOUT
            )  # ignoring failure to clean

    finally:
        # Cleanup: Delete the original appointment if possible
        # If no delete endpoint available, at least no side effects left.
        if appointment_id:
            # Only cancel if not cancelled already?
            # But we cancelled it in test, so no action needed.
            pass

test_appointment_management_and_cancellation()