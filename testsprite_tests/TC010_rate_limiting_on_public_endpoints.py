import requests
import time

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_rate_limiting_on_public_endpoints():
    public_endpoints = [
        "/api/health-insurance",
        # Assuming other public endpoints to test rate limiting; Using health-insurance as example
        "/api/available-times/2026-01-25",
    ]

    # Number of calls to exceed typical rate limits (common limits are ~5-10 requests per second)
    num_requests = 20

    headers = {
        "Accept": "application/json",
    }

    for endpoint in public_endpoints:
        url = BASE_URL + endpoint
        success_responses = 0
        rate_limited_responses = 0
        other_error_responses = 0

        for i in range(num_requests):
            try:
                response = requests.get(url, headers=headers, timeout=TIMEOUT)
                status_code = response.status_code

                if status_code == 200:
                    success_responses += 1
                elif status_code in (429, 503):
                    rate_limited_responses += 1
                    # Check if response has rate limit message or fallback indication
                    try:
                        data = response.json()
                        assert ("rate limit" in str(data).lower() or
                                "too many requests" in str(data).lower() or
                                "fallback" in str(data).lower() or
                                "unavailable" in str(data).lower()), \
                            f"Rate limit response data unexpected: {data}"
                    except Exception:
                        # If no JSON or no message, still count as valid rate limit response
                        pass
                else:
                    other_error_responses += 1

            except requests.exceptions.RequestException as e:
                other_error_responses += 1

            # Small delay to avoid too fast request bursts (optional)
            time.sleep(0.1)

        # Assert at least some requests succeeded before rate limiting kicked in
        assert success_responses > 0, f"No successful requests for {endpoint}"

        # Assert some requests were rate limited/fell back to prevent abuse
        assert rate_limited_responses > 0, f"No rate limited responses detected for {endpoint}"

        # Assert no unexpected error responses
        assert other_error_responses == 0, f"Unexpected errors for {endpoint}: {other_error_responses}"

test_rate_limiting_on_public_endpoints()