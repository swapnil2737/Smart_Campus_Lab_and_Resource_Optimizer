import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:5000/api"

def make_req(endpoint, method="GET", payload=None):
    url = f"{BASE_URL}{endpoint}"
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
    print("=================================================================")
    print("TESTING SINGLE TIME FIELD FORMATS & 8 AM - 8 PM BOUNDARIES")
    print("=================================================================")
    
    # 1. Health check
    status, health = make_req("/health")
    assert status == 200 and health.get("status") == "UP"
    print("[PASS] Backend & SQL Server connection UP")

    # 2. Get labs & users
    status, labs = make_req("/labs")
    lab_list = labs if isinstance(labs, list) else labs.get("labs", [])
    assert len(lab_list) > 0
    lab_id = lab_list[0]["id"]

    # Student & Faculty IDs
    student_id = 1
    faculty_id = 2

    ts = int(time.time())

    # Test cases: (start_str, end_str, expected_status, expected_success, label)
    test_cases = [
        # Arbitrary minute 12-hour AM/PM single strings requested by prompt
        ("10:33 AM", "11:20 AM", 201, True, "12-hour string: 10:33 AM to 11:20 AM"),
        ("10:47 AM", "12:15 PM", 201, True, "12-hour string: 10:47 AM to 12:15 PM"),
        ("10:59 AM", "1:00 PM", 201, True, "12-hour string: 10:59 AM to 1:00 PM"),
        ("8:15 AM", "9:45 AM", 201, True, "12-hour string: 8:15 AM to 9:45 AM"),
        ("10:00 AM", "12:00 PM", 201, True, "12-hour string: 10:00 AM to 12:00 PM"),
        ("12:45 PM", "1:17 PM", 201, True, "12-hour string: 12:45 PM to 1:17 PM"),
        ("3:38 PM", "5:00 PM", 201, True, "12-hour string: 3:38 PM to 5:00 PM"),
        ("7:56 PM", "8:00 PM", 201, True, "12-hour string: 7:56 PM to 8:00 PM"),
        ("6:00 PM", "8:00 PM", 201, True, "12-hour string: 6:00 PM to 8:00 PM (Boundary)"),
        ("8:00 AM", "8:00 PM", 201, True, "12-hour full window: 8:00 AM to 8:00 PM"),

        # 24-hour single strings
        ("08:15", "09:42", 201, True, "24-hour string: 08:15 to 09:42"),
        ("15:38", "19:55", 201, True, "24-hour string: 15:38 to 19:55"),
        ("10:33", "11:47", 201, True, "24-hour string: 10:33 to 11:47"),
        ("10:59", "12:38", 201, True, "24-hour string: 10:59 to 12:38"),

        # Invalid outside operating hours
        ("7:45 AM", "9:00 AM", 400, False, "Invalid Start before 8:00 AM (7:45 AM)"),
        ("6:00 PM", "8:15 PM", 400, False, "Invalid End after 8:00 PM (8:15 PM)"),
        ("07:30", "09:00", 400, False, "Invalid 24h start (07:30)"),
        ("19:00", "20:30", 400, False, "Invalid 24h end (20:30)"),

        # Invalid ordering / duration
        ("2:00 PM", "1:00 PM", 400, False, "Invalid: End before Start"),
        ("10:00 AM", "10:00 AM", 400, False, "Invalid: Zero duration")
    ]

    base_day = int(time.time() * 1000) % 10000

    for idx, (start_str, end_str, exp_status, exp_success, label) in enumerate(test_cases):
        test_date = f"2036-{(idx % 12 + 1):02d}-{((base_day + idx) % 25) + 1:02d}"

        # Test student booking
        payload = {
            "userId": student_id,
            "labId": lab_id,
            "date": test_date,
            "startTime": start_str,
            "endTime": end_str,
            "purpose": f"Test {label} {ts}",
            "studentCount": 1
        }
        
        status, res = make_req("/bookings", "POST", payload)
        success = res.get("success", False)
        print(f"[{'PASS' if status == exp_status and success == exp_success else 'FAIL'}] {label} -> HTTP {status}, Success={success}, Msg={res.get('message') or res.get('error')}")
        assert status == exp_status, f"Expected {exp_status} but got {status} for {label}: {res}"
        assert success == exp_success, f"Expected {exp_success} but got {success} for {label}: {res}"

    print("\n=================================================================")
    print("ALL SINGLE TIME FIELD TESTS PASSED SUCCESSFULLY! [100%]")
    print("=================================================================")

if __name__ == "__main__":
    run_tests()
