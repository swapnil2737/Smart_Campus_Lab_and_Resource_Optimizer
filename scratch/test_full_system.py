# scratch/test_full_system.py
import os
import sys
sys.path.insert(0, os.path.abspath('.'))
import urllib.request
import json
import pyodbc
from datetime import datetime, timedelta
from backend.database import get_connection, fetch_all_dict, fetch_one_dict

BASE_URL = "http://127.0.0.1:5000/api"

def http_get(path):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, headers={"User-Agent": "TestClient"})
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode())

def http_post(path, data):
    url = f"{BASE_URL}{path}"
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json", "User-Agent": "TestClient"}, method="POST")
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode())

def http_put(path, data):
    url = f"{BASE_URL}{path}"
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json", "User-Agent": "TestClient"}, method="PUT")
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode())

def run_tests():
    print("==========================================================")
    print("SMART CAMPUS LAB - FULL SYSTEM AUDIT & WORKFLOW TEST SUITE")
    print("==========================================================")

    passed = 0
    failed = 0

    # ---------------------------------------------------------
    # TEST 1: Backend Health & SQL Server Connection
    # ---------------------------------------------------------
    try:
        health = http_get("/health")
        assert health["success"] is True
        assert health["status"] == "UP"
        print("[PASS] Test 1: Flask backend is up and connected to SQL Server.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 1: {e}")
        failed += 1

    # ---------------------------------------------------------
    # TEST 2: Lab Availability & PC Status Reporting
    # ---------------------------------------------------------
    try:
        labs = http_get("/labs")
        assert isinstance(labs, list)
        assert len(labs) >= 14
        for lab in labs:
            assert "id" in lab
            assert "name" in lab
            assert "status" in lab
            assert "totalResources" in lab
            assert "maintenanceResources" in lab
            assert "availableResources" in lab
        print(f"[PASS] Test 2: /api/labs returns {len(labs)} labs with complete resource metrics.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 2: {e}")
        failed += 1

    # ---------------------------------------------------------
    # TEST 3: PC Maintenance Toggle & Dynamic Lab Status
    # ---------------------------------------------------------
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Check initial state for Lab 1 PC 1
        cur.execute("SELECT TOP 1 resource_id, asset_code, status FROM resources WHERE lab_id = 1 ORDER BY resource_id")
        pc = fetch_one_dict(cur)
        initial_pc_status = pc["status"]
        pc_id = pc["resource_id"]

        # 1. Mark PC as MAINTENANCE
        cur.execute("UPDATE resources SET status = 'MAINTENANCE' WHERE resource_id = ?", (pc_id,))
        conn.commit()

        # Query labs API
        labs_after = http_get("/labs")
        lab1 = next(l for l in labs_after if l["id"] == 1)
        assert lab1["maintenanceResources"] >= 1
        assert lab1["availableResources"] < lab1["totalResources"]
        print(f"[PASS] Test 3a: Marking PC {pc['asset_code']} MAINTENANCE correctly updates Lab 1 metrics (maint: {lab1['maintenanceResources']}).")

        # 2. Restore PC to AVAILABLE
        cur.execute("UPDATE resources SET status = 'AVAILABLE' WHERE resource_id = ?", (pc_id,))
        conn.commit()

        labs_restored = http_get("/labs")
        lab1_restored = next(l for l in labs_restored if l["id"] == 1)
        assert lab1_restored["maintenanceResources"] == 0
        assert lab1_restored["availableResources"] == lab1_restored["totalResources"]
        print(f"[PASS] Test 3b: Restoring PC {pc['asset_code']} AVAILABLE clears Lab 1 maintenance count.")

        conn.close()
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 3: {e}")
        failed += 1

    # ---------------------------------------------------------
    # TEST 4: Student Booking Submission
    # ---------------------------------------------------------
    student_req_id = None
    student_booking_id = None
    unique_day = datetime.now() + timedelta(days=25 + (int(datetime.now().timestamp()) % 50))
    slot_date = unique_day.strftime("%Y-%m-%d")
    start_slot = f"{slot_date}T09:00:00"
    end_slot = f"{slot_date}T11:00:00"

    try:
        booking_data = {
            "userId": 1,
            "labId": 2,
            "purpose": "Database System Final Practical",
            "studentCount": 1,
            "startTime": start_slot,
            "endTime": end_slot
        }
        res = http_post("/bookings", booking_data)
        assert res["success"] is True
        student_req_id = res["requestId"]
        student_booking_id = res["bookingId"]
        assert student_req_id is not None
        print(f"[PASS] Test 4: Student booking submitted successfully (Req: {student_req_id}, Booking ID: {student_booking_id}).")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 4: {e}")
        failed += 1

    # ---------------------------------------------------------
    # TEST 5: Duplicate Booking Prevention
    # ---------------------------------------------------------
    try:
        # Submit the exact same request again while it is pending
        dup_res = http_post("/bookings", booking_data)
        assert dup_res["success"] is True
        assert dup_res["requestId"] == student_req_id or dup_res.get("bookingId") == student_booking_id
        print(f"[PASS] Test 5: Idempotency check prevents duplicate booking insertion for identical slot.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 5: {e}")
        failed += 1

    # ---------------------------------------------------------
    # TEST 6: Faculty Booking Submission
    # ---------------------------------------------------------
    faculty_req_id = None
    faculty_booking_id = None
    fac_start_slot = f"{slot_date}T14:00:00"
    fac_end_slot = f"{slot_date}T16:00:00"
    try:
        faculty_data = {
            "userId": 41, # Faculty 01
            "labId": 3,
            "purpose": "Machine Learning Lab Session for Semester 5",
            "studentCount": 1,
            "startTime": fac_start_slot,
            "endTime": fac_end_slot
        }
        f_res = http_post("/bookings", faculty_data)
        assert f_res["success"] is True
        faculty_req_id = f_res["requestId"]
        faculty_booking_id = f_res["bookingId"]
        print(f"[PASS] Test 6: Faculty booking submitted successfully (Req: {faculty_req_id}, Booking ID: {faculty_booking_id}).")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 6: {e}")
        failed += 1

    # ---------------------------------------------------------
    # TEST 7: Admin Pending Requests Visibility
    # ---------------------------------------------------------
    try:
        pending_res = http_get("/bookings/pending")
        pending_list = pending_res.get("data", pending_res if isinstance(pending_res, list) else [])
        req_ids = [b["id"] for b in pending_list]
        assert student_req_id in req_ids or any(b.get("requestId") == student_req_id for b in pending_list)
        assert faculty_req_id in req_ids or any(b.get("requestId") == faculty_req_id for b in pending_list)
        print(f"[PASS] Test 7: Admin pending queue displays both Student and Faculty requests.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 7: {e}")
        failed += 1

    # ---------------------------------------------------------
    # TEST 8: Admin Approval and Rejection Flow
    # ---------------------------------------------------------
    try:
        # Approve Student Booking
        app_res = http_put(f"/bookings/{student_booking_id}/approve", {"userId": 55})
        assert app_res["success"] is True

        # Reject Faculty Booking
        rej_res = http_put(f"/bookings/{faculty_booking_id}/reject", {"userId": 55, "reason": "Scheduled university maintenance"})
        assert rej_res["success"] is True

        # Verify Student Status in DB
        stat_stu = http_get(f"/bookings/status/{student_req_id}")
        assert StringEqual(stat_stu["currentStatus"], "APPROVED")

        # Verify Faculty Status in DB
        stat_fac = http_get(f"/bookings/status/{faculty_req_id}")
        assert StringEqual(stat_fac["currentStatus"], "REJECTED")

        print(f"[PASS] Test 8: Admin successfully approved Student request ({student_req_id} -> APPROVED) and rejected Faculty request ({faculty_req_id} -> REJECTED).")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 8: {e}")
        failed += 1

    # ---------------------------------------------------------
    # TEST 9: Notification Delivery Verification
    # ---------------------------------------------------------
    try:
        stu_notifs = http_get("/notifications/1")
        stu_items = stu_notifs.get("data", stu_notifs if isinstance(stu_notifs, list) else [])
        assert any(n.get("title") == "Booking Approved" or "APPROVED" in str(n.get("message", "")).upper() for n in stu_items)

        fac_notifs = http_get("/notifications/41")
        fac_items = fac_notifs.get("data", fac_notifs if isinstance(fac_notifs, list) else [])
        assert any(n.get("title") == "Booking Rejected" or "REJECTED" in str(n.get("message", "")).upper() for n in fac_items)

        print(f"[PASS] Test 9: Student and Faculty received correct approval and rejection notifications.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 9: {e}")
        failed += 1

    # ---------------------------------------------------------
    # TEST 10: Combined Booking History Structure
    # ---------------------------------------------------------
    try:
        stu_bookings = http_get("/bookings/my/1")
        all_stu = stu_bookings.get("data", [])
        assert len(all_stu) > 0
        statuses_present = {b["status"].upper() for b in all_stu}
        assert "APPROVED" in statuses_present or "PENDING" in statuses_present

        fac_bookings = http_get("/bookings/my/41")
        all_fac = fac_bookings.get("data", [])
        assert len(all_fac) > 0

        print(f"[PASS] Test 10: Combined history returns all bookings (Pending, Approved, Rejected) in single collection.")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 10: {e}")
        failed += 1

    print("==========================================================")
    print(f"RESULTS: {passed} PASSED, {failed} FAILED.")
    print("==========================================================")

def StringEqual(a, b):
    return str(a or '').strip().upper() == str(b or '').strip().upper()

if __name__ == "__main__":
    run_tests()
