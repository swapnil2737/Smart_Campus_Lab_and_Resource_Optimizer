import urllib.request
import json
import pyodbc
import time
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:5000"

def get_db_conn():
    conn_str = (
        "DRIVER={ODBC Driver 17 for SQL Server};"
        "SERVER=.\\SQLEXPRESS;"
        "DATABASE=smart_campus_lab;"
        "Trusted_Connection=yes;"
    )
    return pyodbc.connect(conn_str)

def make_req(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def test_all():
    print("=" * 65)
    print("TESTING 12-HOUR REQUEST EXPIRY & 8 AM-8 PM TIME PICKER")
    print("=" * 65)

    conn = get_db_conn()
    cursor = conn.cursor()

    # Get users
    cursor.execute("SELECT user_id, full_name FROM users WHERE role_id = (SELECT role_id FROM roles WHERE role_name = 'STUDENT')")
    student = cursor.fetchone()
    student_id = student[0]

    cursor.execute("SELECT user_id, full_name FROM users WHERE role_id = (SELECT role_id FROM roles WHERE role_name = 'FACULTY')")
    faculty = cursor.fetchone()
    faculty_id = faculty[0]

    cursor.execute("SELECT user_id, full_name FROM users WHERE role_id = (SELECT role_id FROM roles WHERE role_name = 'ADMINISTRATOR')")
    admin = cursor.fetchone()
    admin_id = admin[0]

    ts = int(time.time())

    # =========================================================
    # PART 1: TIME RESTRICTIONS TESTS (08:00 - 20:00)
    # =========================================================
    print("\n--- PART 1: 8:00 AM to 8:00 PM Operating Hours Validation ---")

    epoch_ms = int(time.time() * 1000)
    y = 2030 + (epoch_ms % 10)
    d1 = f"{y}-01-{(epoch_ms % 20) + 1:02d}"
    d2 = f"{y}-02-{(epoch_ms % 20) + 1:02d}"
    d3 = f"{y}-03-{(epoch_ms % 20) + 1:02d}"
    d4 = f"{y}-04-{(epoch_ms % 20) + 1:02d}"
    d5 = f"{y}-05-{(epoch_ms % 20) + 1:02d}"
    d6 = f"{y}-06-{(epoch_ms % 20) + 1:02d}"
    d7 = f"{y}-07-{(epoch_ms % 20) + 1:02d}"
    d8 = f"{y}-08-{(epoch_ms % 20) + 1:02d}"

    # 1. Earliest valid booking: 08:00 to 09:00 (8:00 AM - 9:00 AM)
    status, res = make_req("/api/bookings", "POST", {
        "userId": student_id,
        "labId": 4,
        "date": d1,
        "startTime": "08:00",
        "endTime": "09:00",
        "purpose": f"Morning Study Session {ts}"
    })
    assert res.get("success") is True, f"8:00 AM booking failed: {res}"
    print(f"[PASS] 1. Earliest start time 8:00 AM accepted (Booking ID: {res.get('bookingId')})")

    # 2. Reject booking before 8:00 AM (e.g. 07:30)
    status, res = make_req("/api/bookings", "POST", {
        "userId": student_id,
        "labId": 4,
        "date": d2,
        "startTime": "07:30",
        "endTime": "09:00",
        "purpose": f"Early Study Session {ts}"
    })
    assert status == 400 and "8:00 AM and 8:00 PM" in res.get("error", "")
    print(f"[PASS] 2. Rejected start time before 8:00 AM: '{res.get('error')}'")

    # 3. Valid daytime booking: 10:00 to 12:00 (10:00 AM - 12:00 PM)
    status, res = make_req("/api/bookings", "POST", {
        "userId": faculty_id,
        "labId": 4,
        "date": d3,
        "startTime": "10:00",
        "endTime": "12:00",
        "purpose": f"Daytime Lecture {ts}"
    })
    assert res.get("success") is True, f"Daytime booking failed: {res}"
    print(f"[PASS] 3. Valid daytime booking accepted (Booking ID: {res.get('bookingId')})")

    # 4. Latest valid closing boundary: 19:00 to 20:00 (7:00 PM - 8:00 PM)
    status, res = make_req("/api/bookings", "POST", {
        "userId": faculty_id,
        "labId": 4,
        "date": d4,
        "startTime": "19:00",
        "endTime": "20:00",
        "purpose": f"Evening Lab Session {ts}"
    })
    assert res.get("success") is True, f"8:00 PM closing boundary booking failed: {res}"
    print(f"[PASS] 4. Closing boundary 8:00 PM accepted (Booking ID: {res.get('bookingId')})")

    # 5. Reject booking ending after 8:00 PM (e.g. 20:30)
    status, res = make_req("/api/bookings", "POST", {
        "userId": student_id,
        "labId": 4,
        "date": d5,
        "startTime": "19:00",
        "endTime": "20:30",
        "purpose": f"Late Night Session {ts}"
    })
    assert status == 400 and "8:00 AM and 8:00 PM" in res.get("error", "")
    print(f"[PASS] 5. Rejected end time after 8:00 PM: '{res.get('error')}'")

    # 6. Reject end time <= start time (e.g. 14:00 to 13:00)
    status, res = make_req("/api/bookings", "POST", {
        "userId": student_id,
        "labId": 4,
        "date": d6,
        "startTime": "14:00",
        "endTime": "13:00",
        "purpose": f"Negative Duration Session {ts}"
    })
    assert status == 400
    print(f"[PASS] 6. Rejected invalid time ordering (end time before start time)")

    # =========================================================
    # PART 2: 12-HOUR REQUEST EXPIRY TESTS
    # =========================================================
    print("\n--- PART 2: 12-Hour Request Expiry Tests ---")

    # Case 1: New Student request remains PENDING before 12 hours
    status, s_req = make_req("/api/bookings", "POST", {
        "userId": student_id,
        "labId": 5,
        "date": d7,
        "startTime": "09:00",
        "endTime": "11:00",
        "purpose": f"Student Pending Test {ts}"
    })
    s_booking_id = s_req.get("bookingId")
    assert s_req.get("status") == "PENDING"
    print(f"[PASS] 1. New Student request remains PENDING: ID={s_booking_id}")

    # Case 2: New Faculty request remains PENDING before 12 hours
    status, f_req = make_req("/api/bookings", "POST", {
        "userId": faculty_id,
        "labId": 5,
        "date": d8,
        "startTime": "14:00",
        "endTime": "16:00",
        "purpose": f"Faculty Pending Test {ts}"
    })
    f_booking_id = f_req.get("bookingId")
    assert f_req.get("status") == "PENDING"
    print(f"[PASS] 2. New Faculty request remains PENDING: ID={f_booking_id}")

    # Verify both exist in Admin pending list
    status, pending_res = make_req("/api/bookings/pending")
    pending_list = pending_res.get("data", []) if isinstance(pending_res, dict) else pending_res
    pending_ids = [p["bookingId"] for p in pending_list]
    assert s_booking_id in pending_ids
    assert f_booking_id in pending_ids
    print(f"[PASS] Both requests present in Admin pending requests list")

    # Case 3: Simulate 12.5 hours passing on the Student request by updating created_at in SQL Server
    past_time = datetime.now() - timedelta(hours=13)
    cursor.execute("UPDATE bookings SET created_at = ? WHERE booking_id = ?", (past_time, s_booking_id))
    conn.commit()

    # Trigger fetch of pending requests (backend triggers auto-expiration)
    status, pending_res_after = make_req("/api/bookings/pending")
    pending_list_after = pending_res_after.get("data", []) if isinstance(pending_res_after, dict) else pending_res_after
    pending_ids_after = [p["bookingId"] for p in pending_list_after]

    # Case 4: Expired request disappears from active pending list
    assert s_booking_id not in pending_ids_after, "Expired request still in pending list!"
    print(f"[PASS] 3 & 4. 13-hour old request automatically transitioned to EXPIRED and removed from Admin pending list")

    # Verify it remains in user's booking history with status EXPIRED
    status, my_bookings = make_req(f"/api/bookings/my/{student_id}")
    history_item = next((b for b in my_bookings.get("data", []) if b["bookingId"] == s_booking_id), None)
    assert history_item is not None
    assert history_item["status"] == "EXPIRED"
    print(f"[PASS] 4b. Expired request preserved in booking history with status: '{history_item['status']}'")

    # Case 5: Approved requests do not expire even if created > 12h ago
    # First approve the faculty booking
    status, app_res = make_req(f"/api/bookings/{f_booking_id}/approve", "POST", {
        "userId": admin_id,
        "remarks": "Approved promptly"
    })
    assert app_res.get("success") is True
    # Now set created_at of approved booking to 20 hours ago
    past_time_20h = datetime.now() - timedelta(hours=20)
    cursor.execute("UPDATE bookings SET created_at = ? WHERE booking_id = ?", (past_time_20h, f_booking_id))
    conn.commit()

    # Fetch pending and verify approved booking remains APPROVED
    status, _ = make_req("/api/bookings/pending")
    cursor.execute("SELECT status FROM bookings WHERE booking_id = ?", (f_booking_id,))
    f_status = cursor.fetchone()[0]
    assert f_status == "APPROVED", f"Approved booking should not expire, got {f_status}"
    print(f"[PASS] 5. Approved request older than 12 hours does NOT expire (Status remains: {f_status})")

    # Case 6: Expired request cannot be approved or rejected as pending
    status, try_approve = make_req(f"/api/bookings/{s_booking_id}/approve", "POST", {
        "userId": admin_id,
        "remarks": "Attempting to approve expired"
    })
    assert try_approve.get("success") is False
    assert "expired" in try_approve.get("message", "").lower()
    print(f"[PASS] 6. Expired request successfully blocked from approval: '{try_approve.get('message')}'")

    status, try_reject = make_req(f"/api/bookings/{s_booking_id}/reject", "POST", {
        "userId": admin_id,
        "reason": "Attempting to reject expired"
    })
    assert try_reject.get("success") is False
    assert "expired" in try_reject.get("message", "").lower()
    print(f"[PASS] 6b. Expired request successfully blocked from rejection: '{try_reject.get('message')}'")

    conn.close()

    print("\n" + "=" * 65)
    print("ALL 12-HOUR EXPIRY & 8 AM - 8 PM TIME TESTS PASSED! [100%]")
    print("=" * 65)

if __name__ == "__main__":
    test_all()
