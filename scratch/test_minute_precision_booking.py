import urllib.request
import json
import datetime

BASE_URL = "http://127.0.0.1:5000/api"

def request_json(url, method="GET", payload=None):
    headers = {"Content-Type": "application/json"}
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

def run_tests():
    print("=== Testing Health Check ===")
    status, data = request_json(f"{BASE_URL}/health")
    print(f"Health: {status} - {data}")
    assert status == 200, "Health check failed"

    # Get labs/resources
    status, labs_data = request_json(f"{BASE_URL}/labs")
    labs = labs_data if isinstance(labs_data, list) else labs_data.get("labs", [])
    assert len(labs) > 0, "No labs found"
    lab_id = labs[0]["id"]
    print(f"Using Lab ID: {lab_id}")

    test_cases = [
        # Arbitrary minute examples from prompt
        ("08:15:00", "09:42:00", 201, True, "Valid 8:15 AM to 9:42 AM"),
        ("12:45:00", "13:17:00", 201, True, "Valid 12:45 PM to 1:17 PM"),
        ("15:38:00", "19:55:00", 201, True, "Valid 3:38 PM to 7:55 PM"),
        # Exact boundary tests
        ("08:00:00", "20:00:00", 201, True, "Boundary 8:00 AM to 8:00 PM (12 hours)"),
        # Invalid before 8:00 AM
        ("07:45:00", "09:00:00", 400, False, "Invalid Start before 8:00 AM (7:45 AM)"),
        # Invalid after 8:00 PM
        ("18:30:00", "20:05:00", 400, False, "Invalid End after 8:00 PM (8:05 PM)"),
        # Invalid start >= end
        ("10:30:00", "10:15:00", 400, False, "Invalid End before Start"),
        ("11:20:00", "11:20:00", 400, False, "Invalid Zero Duration")
    ]

    print("\n=== Running Booking Time Validations ===")
    user_id = 1 # student
    
    for idx, (start_t, end_t, exp_status, exp_success, label) in enumerate(test_cases):
        curr_date = f"2026-12-{idx+1:02d}"
        payload = {
            "userId": user_id,
            "labId": lab_id,
            "startTime": f"{curr_date}T{start_t}",
            "endTime": f"{curr_date}T{end_t}",
            "purpose": f"Minute precision test - {label}",
            "studentCount": 1
        }

        status, resp = request_json(f"{BASE_URL}/bookings", method="POST", payload=payload)
        success = resp.get("success", False)
        print(f"[{label}] -> Status: {status}, Success: {success}, Msg: {resp.get('message') or resp.get('error')}")
        
        assert status == exp_status, f"Expected status {exp_status} but got {status} for {label}"
        assert success == exp_success, f"Expected success {exp_success} but got {success} for {label}"

    print("\nAll minute-precision backend booking tests PASSED successfully!")

if __name__ == "__main__":
    run_tests()
