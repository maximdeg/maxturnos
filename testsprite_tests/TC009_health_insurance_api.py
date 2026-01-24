import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_health_insurance_api():
    url = f"{BASE_URL}/api/health-insurance"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Request to health insurance API failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(data, list), f"Response JSON is not a list, got type {type(data)}"

    # Each item should be a dict representing a valid health insurance option
    for item in data:
        assert isinstance(item, dict), f"Health insurance item is not a dict: {item}"
        # Common possible keys based on typical insurance option structure
        # "id", "name", "visit_types" (assumed as filter field)
        # Validate minimal expected keys existence
        assert "id" in item, f"Missing 'id' in insurance item: {item}"
        assert "name" in item, f"Missing 'name' in insurance item: {item}"
        # If visit types filtering is expected, check visit_types key presence and type
        if "visit_types" in item:
            assert isinstance(item["visit_types"], list), "'visit_types' should be a list"

    # Additional: Check that all returned insurances have at least one visit type (if visit_types exist)
    # This matches the description: filtered by visit type
    for item in data:
        if "visit_types" in item:
            assert any(item["visit_types"]), "Insurance item has empty visit_types list"

test_health_insurance_api()