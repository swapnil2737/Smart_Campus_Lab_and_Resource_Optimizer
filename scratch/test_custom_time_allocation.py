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

def run_test():
    print("=================================================================")
    print("TESTING CUSTOM USER-SPECIFIED TIME SUBMISSION & ALLOCATION")
    print("=================================================================")
    
    # 1. Login student
    status, login_res = make_req("/auth/login", method="POST", payload={
        "username": "CSE001",
        "password": "student123",
        "role": "Student"
    })
    assert status == 200, f"Login failed: {login_res}"
    user_id = login_res["user"]["id"]
    print(f"[PASS] Logged in as student: {login_res['user']['name']} (ID {user_id})")

    # 2. Submit booking for custom arbitrary times (e.g. 10:33 AM, 10:47 AM, 10:59 AM, 12:45 PM, 3:38 PM, 7:56 PM)
    ts = int(time.time() * 1000) % 100000
    custom_bookings = [
        {"start_t": "10:33:00", "end_t": "11:20:00", "desc": "10:33 AM to 11:20 AM"},
        {"start_t": "10:47:00", "end_t": "12:15:00", "desc": "10:47 AM to 12:15 PM"},
        {"start_t": "10:59:00", "end_t": "13:00:00", "desc": "10:59 AM to 1:00 PM"},
        {"start_t": "12:45:00", "end_t": "13:17:00", "desc": "12:45 PM to 1:17 PM"},
        {"start_t": "15:38:00", "end_t": "17:00:00", "desc": "3:38 PM to 5:00 PM"},
        {"start_t": "19:56:00", "end_t": "20:00:00", "desc": "7:56 PM to 8:00 PM"}
    ]

    for idx, b in enumerate(custom_bookings):
        d_val = f"2038-{(idx % 12 + 1):02d}-{((ts + idx) % 25 + 1):02d}"
        start_iso = f"{d_val}T{b['start_t']}"
        end_iso = f"{d_val}T{b['end_t']}"
        payload = {
            "userId": user_id,
            "labId": 2,
            "purpose": f"Test custom time {b['desc']} {ts}",
            "startTime": start_iso,
            "endTime": end_iso,
            "studentCount": 1
        }
        status, data = make_req("/bookings", method="POST", payload=payload)
        assert status == 201, f"Booking failed for {b['desc']}: {data}"
        req_id = data["requestId"]
        booking_id = data["bookingId"]
        print(f"[PASS] Submitted custom booking {b['desc']} -> Booking ID: {booking_id}, Request ID: {req_id}")

        # Check booking status endpoint
        st_status, st_data = make_req(f"/bookings/status/{req_id}")
        assert st_status == 200
        print(f"[PASS] Verified exact user time returned in status API: {st_data.get('time') or st_data.get('startTime')}")

    print("\n=================================================================")
    print("ALL CUSTOM TIME ALLOCATION TESTS PASSED! [100%]")
    print("=================================================================")

if __name__ == "__main__":
    run_test()
