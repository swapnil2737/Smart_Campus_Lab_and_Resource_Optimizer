import os
import sys
import uuid

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from app import app
from database import get_connection

def run_e2e_verification():
    print("=" * 70)
    print("SMART CAMPUS LAB - VERIFICATION OF WORKFLOW, NOTIFICATIONS & HISTORY")
    print("=" * 70)
    client = app.test_client()

    # Generate a unique day offset to prevent collision with any existing approved bookings
    unique_day = (uuid.uuid4().int % 20) + 10

    # ---------------------------------------------------------
    # TEST A: Student Request Workflow & Notification
    # ---------------------------------------------------------
    print("\n--- TEST A: Student Request Submission & Notifications ---")
    stud_login = client.post("/api/auth/login", json={
        "email": "aarav.patil@rit.edu",
        "password": "student123",
        "role": "Student"
    })
    assert stud_login.status_code == 200, f"Student login failed: {stud_login.get_json()}"
    student_user = stud_login.get_json()["user"]
    student_id = student_user["id"]
    print(f"1. Student logged in: ID={student_id}, Name={student_user['name']}")

    stud_req_payload = {
        "userId": student_id,
        "labId": 1,
        "purpose": "Cloud & AI Experimentation",
        "date": f"2026-12-{unique_day:02d}",
        "startTime": "09:00",
        "endTime": "11:00",
        "studentCount": 1
    }
    b_stud_res = client.post("/api/bookings", json=stud_req_payload)
    assert b_stud_res.status_code == 201, f"Student booking submission failed: {b_stud_res.get_json()}"
    stud_req_id = b_stud_res.get_json()["requestId"]
    stud_b_id = b_stud_res.get_json()["bookingId"]
    print(f"2. Student submitted booking: Request ID={stud_req_id}, Booking ID={stud_b_id}, Status={b_stud_res.get_json()['status']}")
    assert b_stud_res.get_json()["status"] == "PENDING"

    # Verify student notification created
    stud_notifs = client.get(f"/api/notifications/{student_id}").get_json()["data"]
    assert any(stud_req_id in n["message"] or "submitted" in n["message"].lower() for n in stud_notifs), "Student submission notification not found"
    print(f"3. Verified Student received submission notification: '{stud_notifs[0]['title']}'")

    # Verify admin received notification
    admin_notifs = client.get("/api/notifications").get_json()["data"]
    assert any(stud_req_id in n["message"] or student_user["name"] in n["message"] for n in admin_notifs), "Admin notification not found"
    print(f"4. Verified Admin received staff notification for new request: '{admin_notifs[0]['title']}'")

    # ---------------------------------------------------------
    # TEST B: Faculty Request Submission
    # ---------------------------------------------------------
    print("\n--- TEST B: Faculty Request Submission ---")
    fac_login = client.post("/api/auth/login", json={
        "email": "ganeshsir@rit.edu",
        "password": "faculty123",
        "role": "Faculty"
    })
    assert fac_login.status_code == 200, f"Faculty login failed: {fac_login.get_json()}"
    fac_user = fac_login.get_json()["user"]
    fac_id = fac_user["id"]
    print(f"1. Faculty logged in: ID={fac_id}, Name={fac_user['name']}")

    fac_req_payload = {
        "userId": fac_id,
        "labId": 2,
        "purpose": "Full Lab Reservation for Embedded Systems Exam",
        "date": f"2026-12-{unique_day:02d}",
        "startTime": "13:00",
        "endTime": "16:00",
        "studentCount": 20
    }
    b_fac_res = client.post("/api/bookings", json=fac_req_payload)
    assert b_fac_res.status_code == 201, f"Faculty booking submission failed: {b_fac_res.get_json()}"
    fac_req_id = b_fac_res.get_json()["requestId"]
    print(f"2. Faculty submitted request: Request ID={fac_req_id}, Priority={b_fac_res.get_json()['priority']}")

    # ---------------------------------------------------------
    # TEST C: Admin Approval
    # ---------------------------------------------------------
    print("\n--- TEST C: Admin Approval Flow ---")
    admin_login = client.post("/api/auth/login", json={
        "email": "admin01@rit.edu",
        "password": "admin123",
        "role": "Admin"
    })
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.get_json()}"
    admin_id = admin_login.get_json()["user"]["id"]
    print(f"1. Admin logged in: ID={admin_id}")

    # Admin approves Student Request (stud_req_id)
    appr_res = client.post(f"/api/bookings/{stud_req_id}/approve", json={"userId": admin_id})
    assert appr_res.status_code == 200, f"Approval failed: {appr_res.get_json()}"
    print(f"2. Admin approved request {stud_req_id}: Status={appr_res.get_json()['status']}")

    # Check student received approval notification
    stud_notifs2 = client.get(f"/api/notifications/{student_id}").get_json()["data"]
    appr_notif = next((n for n in stud_notifs2 if stud_req_id in n["message"] and "APPROVED" in n["message"]), None)
    assert appr_notif is not None, "Student approval notification not found"
    print(f"3. Verified Student received approval notification: '{appr_notif['message']}'")

    # ---------------------------------------------------------
    # TEST D: Admin Rejection
    # ---------------------------------------------------------
    print("\n--- TEST D: Admin Rejection Flow ---")
    # Admin rejects Faculty Request (fac_req_id) with specific reason
    rej_reason = "Lab undergoing hardware maintenance on selected afternoon"
    rej_res = client.post(f"/api/bookings/{fac_req_id}/reject", json={"userId": admin_id, "reason": rej_reason})
    assert rej_res.status_code == 200, f"Rejection failed: {rej_res.get_json()}"
    print(f"1. Admin rejected request {fac_req_id}: Status={rej_res.get_json()['status']}")

    # Check faculty received rejection notification with reason
    fac_notifs = client.get(f"/api/notifications/{fac_id}").get_json()["data"]
    rej_notif = next((n for n in fac_notifs if fac_req_id in n["message"] and "REJECTED" in n["message"]), None)
    assert rej_notif is not None, "Faculty rejection notification not found"
    assert rej_reason in rej_notif["message"], "Rejection reason missing in notification"
    print(f"2. Verified Faculty received rejection notification with reason: '{rej_notif['message']}'")

    # ---------------------------------------------------------
    # TEST E: Combined Booking History Verification
    # ---------------------------------------------------------
    print("\n--- TEST E: Combined Booking History Table Verification ---")
    
    # 1. Admin System-Wide Combined Bookings
    all_admin_bookings = client.get("/api/admin/booking-requests").get_json()
    assert isinstance(all_admin_bookings, list), "Admin booking requests must be a list"
    
    # Ensure no duplicates by checking ID uniqueness
    req_ids = [b["id"] for b in all_admin_bookings]
    assert len(req_ids) == len(set(req_ids)), "Duplicate rows detected in admin booking requests!"
    print(f"1. Admin combined table contains {len(all_admin_bookings)} records without duplicates.")

    # Verify both approved and rejected items exist in the single combined table
    stud_row = next((b for b in all_admin_bookings if b["id"] == stud_req_id), None)
    fac_row = next((b for b in all_admin_bookings if b["id"] == fac_req_id), None)
    assert stud_row is not None and stud_row["status"] == "APPROVED", f"Expected {stud_req_id} to be APPROVED in admin table"
    assert fac_row is not None and fac_row["status"] == "REJECTED", f"Expected {fac_req_id} to be REJECTED in admin table"
    print(f"2. Verified {stud_req_id} is APPROVED and {fac_req_id} is REJECTED in the combined Admin history table.")

    # 2. Student Own Combined Bookings
    stud_my = client.get(f"/api/bookings/my/{student_id}").get_json()
    assert "data" in stud_my, "Student my bookings response missing 'data' array"
    stud_data_ids = [b["id"] for b in stud_my["data"]]
    assert stud_req_id in stud_data_ids, f"{stud_req_id} missing in student combined history"
    # Ensure all records belong only to student_id
    assert all(b["userId"] == student_id for b in stud_my["data"]), "Foreign user booking records leaked in student history!"
    print(f"3. Verified Student combined history contains {len(stud_my['data'])} records belonging strictly to Student {student_id}.")

    # 3. Faculty Own Combined Bookings
    fac_my = client.get(f"/api/bookings/my/{fac_id}").get_json()
    assert "data" in fac_my, "Faculty my bookings response missing 'data' array"
    fac_data_ids = [b["id"] for b in fac_my["data"]]
    assert fac_req_id in fac_data_ids, f"{fac_req_id} missing in faculty combined history"
    assert all(b["userId"] == fac_id for b in fac_my["data"]), "Foreign user booking records leaked in faculty history!"
    print(f"4. Verified Faculty combined history contains {len(fac_my['data'])} records belonging strictly to Faculty {fac_id}.")

    # ---------------------------------------------------------
    # TEST F: Other Roles (Lab Assistant, Lab Availability, Auth)
    # ---------------------------------------------------------
    print("\n--- TEST F: Lab Assistant, Lab Availability & Health ---")
    la_stats = client.get("/api/lab-assistant/stats").get_json()
    assert "totalResources" in la_stats and la_stats["totalResources"] == 280, f"Expected 280 resources, got {la_stats}"
    print(f"1. Lab Assistant API returned {la_stats['totalResources']} total hardware resources.")

    labs_res = client.get("/api/labs").get_json()
    assert len(labs_res) == 14, f"Expected 14 labs, got {len(labs_res)}"
    print(f"2. Lab availability API returned {len(labs_res)} active laboratories.")

    print("\n" + "=" * 70)
    print("ALL TESTS (TEST A -> TEST F) PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    run_e2e_verification()
