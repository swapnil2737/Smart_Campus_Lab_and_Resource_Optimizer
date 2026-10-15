import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from app import app

def test_booking_approval_and_rejection_flow():
    print("=== Testing Booking Flow: Submission, Approval, Rejection, and Retrieval ===")
    client = app.test_client()
    
    # 1. Login as Student (ID: 1)
    login_res = client.post("/api/auth/login", json={
        "email": "aarav.patil@rit.edu",
        "password": "student123",
        "role": "Student"
    })
    assert login_res.status_code == 200, f"Student login failed: {login_res.get_json()}"
    student_id = login_res.get_json()["user"]["id"]
    print(f"Logged in student: ID={student_id}")

    # 2. Student Submits Booking Request 1 (to be Approved)
    booking1_data = {
        "userId": student_id,
        "labId": 1,
        "purpose": "AI ML Project Work",
        "date": "2026-11-15",
        "startTime": "09:00",
        "endTime": "11:00",
        "studentCount": 1
    }
    b1_res = client.post("/api/bookings", json=booking1_data)
    assert b1_res.status_code == 201, f"Booking 1 creation failed: {b1_res.get_json()}"
    req1_id = b1_res.get_json()["requestId"]
    print(f"Created Booking 1: Request ID = {req1_id}")

    # Verify Booking 1 is in Student's Pending list
    my_res = client.get(f"/api/bookings/my/{student_id}")
    assert my_res.status_code == 200, f"Failed to get bookings: {my_res.get_json()}"
    my_data = my_res.get_json()
    pending_ids = [b["id"] for b in my_data["pending"]]
    assert req1_id in pending_ids, f"{req1_id} not found in pending list: {pending_ids}"
    print(f"Confirmed Booking 1 ({req1_id}) is in pending list.")

    # 3. Admin (ID: 55) Approves Booking 1
    approve_res = client.post(f"/api/bookings/{req1_id}/approve", json={
        "userId": 55
    })
    assert approve_res.status_code == 200, f"Approval failed: {approve_res.get_json()}"
    print(f"Admin approved Booking 1: {approve_res.get_json()}")

    # Verify Booking 1 moved from Pending to Approved in Student's bookings
    my_res2 = client.get(f"/api/bookings/my/{student_id}")
    my_data2 = my_res2.get_json()
    approved_ids = [b["id"] for b in my_data2["approved"]]
    pending_ids2 = [b["id"] for b in my_data2["pending"]]
    all_ids2 = [b["id"] for b in my_data2["data"]]
    
    assert req1_id in approved_ids, f"{req1_id} not found in approved list: {approved_ids}"
    assert req1_id not in pending_ids2, f"{req1_id} unexpectedly still in pending list!"
    assert req1_id in all_ids2, f"{req1_id} not found in all data history!"
    print(f"Verified Booking 1 ({req1_id}) is now in Student's Approved list & All Data history!")

    # 4. Student Submits Booking Request 2 (to be Rejected)
    booking2_data = {
        "userId": student_id,
        "labId": 2,
        "purpose": "Web Dev Workshop Practice",
        "date": "2026-11-16",
        "startTime": "14:00",
        "endTime": "16:00",
        "studentCount": 1
    }
    b2_res = client.post("/api/bookings", json=booking2_data)
    assert b2_res.status_code == 201, f"Booking 2 creation failed: {b2_res.get_json()}"
    req2_id = b2_res.get_json()["requestId"]
    print(f"Created Booking 2: Request ID = {req2_id}")

    # 5. Admin (ID: 55) Rejects Booking 2
    reject_res = client.post(f"/api/bookings/{req2_id}/reject", json={
        "userId": 55,
        "reason": "Lab reserved for University Exam"
    })
    assert reject_res.status_code == 200, f"Rejection failed: {reject_res.get_json()}"
    print(f"Admin rejected Booking 2: {reject_res.get_json()}")

    # Verify Booking 2 is in Rejected list and All Data history
    my_res3 = client.get(f"/api/bookings/my/{student_id}")
    my_data3 = my_res3.get_json()
    rejected_ids = [b["id"] for b in my_data3["rejected"]]
    pending_ids3 = [b["id"] for b in my_data3["pending"]]
    all_ids3 = [b["id"] for b in my_data3["data"]]

    assert req2_id in rejected_ids, f"{req2_id} not found in rejected list: {rejected_ids}"
    assert req2_id not in pending_ids3, f"{req2_id} unexpectedly still in pending list!"
    assert req2_id in all_ids3, f"{req2_id} not found in all data history!"
    print(f"Verified Booking 2 ({req2_id}) is now in Student's Rejected list & All Data history!")

    # 6. Faculty Flow
    fac_login = client.post("/api/auth/login", json={
        "email": "ganeshsir@rit.edu",
        "password": "faculty123",
        "role": "Faculty"
    })
    assert fac_login.status_code == 200, f"Faculty login failed: {fac_login.get_json()}"
    fac_id = fac_login.get_json()["user"]["id"]
    print(f"\nLogged in Faculty: ID={fac_id}")

    fac_booking = {
        "userId": fac_id,
        "labId": 3,
        "purpose": "Operating Systems Lab Practical Exam",
        "date": "2026-11-20",
        "startTime": "10:00",
        "endTime": "13:00",
        "studentCount": 20
    }
    fb_res = client.post("/api/bookings", json=fac_booking)
    assert fb_res.status_code == 201
    fac_req_id = fb_res.get_json()["requestId"]
    print(f"Created Faculty Booking: Request ID = {fac_req_id}")

    # Admin approves Faculty Booking
    fac_appr = client.post(f"/api/bookings/{fac_req_id}/approve", json={"userId": 55})
    assert fac_appr.status_code == 200

    fac_my = client.get(f"/api/bookings/my/{fac_id}").get_json()
    assert fac_req_id in [b["id"] for b in fac_my["approved"]]
    assert fac_req_id in [b["id"] for b in fac_my["data"]]
    print(f"Verified Faculty Booking ({fac_req_id}) is in Faculty's Approved list & All Data history!")

    print("\n============================================================")
    print("ALL BOOKING APPROVAL, REJECTION & HISTORY TESTS PASSED (100%)")
    print("============================================================")

if __name__ == "__main__":
    test_booking_approval_and_rejection_flow()
