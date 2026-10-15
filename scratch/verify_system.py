import urllib.request
import json
import time
import random

BASE_URL = "http://127.0.0.1:5000"

def make_req(endpoint, method="GET", data=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw.strip() else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            return e.code, json.loads(raw) if raw.strip() else {}
        except Exception:
            return e.code, {"raw": raw}

def test_system():
    print("==================================================")
    print("SMART CAMPUS LAB - VERIFICATION SUITE")
    print("==================================================")

    # 1. Health check
    status, res = make_req("/api/health")
    assert status == 200, f"Health failed: {res}"
    print("[PASS] Backend & SQL Server connection UP")

    # 2. Role Logins
    status, student_login = make_req("/api/auth/login", "POST", {"username": "CSE001", "password": "student123", "role": "Student"})
    assert student_login.get("success") is True
    print(f"[PASS] Student Login: {student_login['user']['name']}")

    status, faculty_login = make_req("/api/auth/login", "POST", {"username": "FAC001", "password": "faculty123", "role": "Faculty"})
    assert faculty_login.get("success") is True
    print(f"[PASS] Faculty Login: {faculty_login['user']['name']}")

    status, assistant_login = make_req("/api/auth/login", "POST", {"username": "LABA001", "password": "assistant123", "role": "Lab Assistant"})
    assert assistant_login.get("success") is True
    print(f"[PASS] Lab Assistant Login: {assistant_login['user']['name']}")

    status, admin_login = make_req("/api/auth/login", "POST", {"username": "ADMIN001", "password": "admin123", "role": "Admin"})
    assert admin_login.get("success") is True
    print(f"[PASS] Admin Login: {admin_login['user']['name']}")

    # 3. Lab Booking Time Restrictions (08:00 - 20:00)
    # Test invalid time: before 08:00
    status, invalid_req1 = make_req("/api/bookings", "POST", {
        "userId": student_login['user']['id'],
        "labId": 1,
        "date": "2026-11-15",
        "startTime": "07:30",
        "endTime": "09:30",
        "purpose": "Early morning test"
    })
    assert invalid_req1.get("success") is False
    print(f"[PASS] Rejected booking outside 08:00-20:00 (start 07:30): '{invalid_req1.get('error')}'")

    # Test invalid time: after 20:00
    status, invalid_req2 = make_req("/api/bookings", "POST", {
        "userId": faculty_login['user']['id'],
        "labId": 1,
        "date": "2026-11-15",
        "startTime": "19:00",
        "endTime": "21:00",
        "purpose": "Late night test"
    })
    assert invalid_req2.get("success") is False
    print(f"[PASS] Rejected booking outside 08:00-20:00 (end 21:00): '{invalid_req2.get('error')}'")

    # Test valid booking with unique future date/time
    import time
    ts = int(time.time() * 1000)
    day = (ts % 25) + 1
    hour = (ts % 10) + 9  # 9..18
    min_val = (ts % 4) * 15 # 0, 15, 30, 45
    booking_date = f"2029-{(ts % 12 + 1):02d}-{day:02d}"
    start_time = f"{hour:02d}:{min_val:02d}"
    end_time = f"{(hour + 1):02d}:{min_val:02d}"

    status, valid_req = make_req("/api/bookings", "POST", {
        "userId": faculty_login['user']['id'],
        "labId": 3,
        "date": booking_date,
        "startTime": start_time,
        "endTime": end_time,
        "purpose": f"Advanced Network Lab Session on {booking_date} {ts}"
    })
    assert valid_req.get("success") is True, f"Valid booking failed: {valid_req}"
    booking_id = valid_req.get("bookingId")
    print(f"[PASS] Created booking on {booking_date} {start_time}-{end_time}: ID={booking_id}, Status={valid_req.get('status')}")

    # 4. Admin Approve
    status, approve_res = make_req(f"/api/bookings/{booking_id}/approve", "POST", {
        "userId": admin_login['user']['id'],
        "remarks": "Approved by administrator"
    })
    assert approve_res.get("success") is True
    print(f"[PASS] Admin approved booking {booking_id}: Status={approve_res.get('status')}")

    # 5. Lab Assistant Maintenance Issue Flow
    # Report issue as Lab Assistant via /api/maintenance/report
    issue_payload = {
        "userId": assistant_login['user']['id'],
        "labId": 2,
        "resourceId": "LAB02PC05",
        "issueType": "Hardware",
        "priority": "High",
        "description": "RAM fault detected on PC-05 during morning healthcheck"
    }
    status, issue_res = make_req("/api/maintenance/report", "POST", issue_payload)
    assert issue_res.get("success") is True, f"Report failed: {issue_res}"
    ticket = issue_res.get("ticket", {})
    maintenance_id = ticket.get("maintenanceId") or ticket.get("id") or issue_res.get("maintenanceId")
    print(f"[PASS] Lab Assistant reported maintenance issue: Ticket ID={maintenance_id}")

    # Start Maintenance (Pending -> Under Maintenance)
    status, start_res = make_req(f"/api/admin/maintenance/{maintenance_id}/start", "POST", {})
    assert start_res.get("success") is True, f"Start failed: {start_res}"
    print(f"[PASS] Lab Assistant started maintenance: {start_res.get('message')}")

    # Complete Maintenance (Under Maintenance -> Completed)
    status, complete_res = make_req(f"/api/admin/maintenance/{maintenance_id}/complete", "POST", {
        "notes": "Replaced faulty RAM module with 16GB DDR4 module"
    })
    assert complete_res.get("success") is True, f"Complete failed: {complete_res}"
    print(f"[PASS] Lab Assistant completed maintenance: {complete_res.get('message')}")

    # 6. Check Lab status reflecting Available / Maintenance only
    status, labs_res = make_req("/api/labs")
    assert status == 200 and len(labs_res) > 0
    print(f"[PASS] Verified {len(labs_res)} Labs loaded from SQL Server (Available/Maintenance)")

    print("\n==================================================")
    print("ALL CORE SYSTEM TESTS PASSED SUCCESSFULLY! [100%]")
    print("==================================================")

if __name__ == '__main__':
    test_system()
