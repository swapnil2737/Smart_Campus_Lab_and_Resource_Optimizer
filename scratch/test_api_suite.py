import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from app import app
from database import get_connection

def run_tests():
    print("=" * 60)
    print("SMART CAMPUS LAB - END-TO-END BACKEND & SQL SERVER TEST SUITE")
    print("=" * 60)

    client = app.test_client()

    # 1. Health check
    res = client.get("/api/health")
    print(f"\n1. GET /api/health: Status {res.status_code}")
    print("   Response:", res.get_json())
    assert res.status_code == 200, "Health check failed"

    # 2. DB Test
    res = client.get("/api/db-test")
    print(f"\n2. GET /api/db-test: Status {res.status_code}")
    print("   Response:", res.get_json())
    assert res.status_code == 200, "DB test failed"

    # 3. Login Tests for all 4 roles
    roles_credentials = [
        ("Student", "aarav.patil@rit.edu", "student123"),
        ("Faculty", "ganeshsir@rit.edu", "faculty123"),
        ("Lab Assistant", "assistant01@rit.edu", "assistant123"),
        ("Admin", "admin01@rit.edu", "admin123"),
    ]

    logged_in_users = {}

    for role_name, username, password in roles_credentials:
        payload = {
            "email": username,
            "password": password,
            "role": role_name
        }
        res = client.post("/api/auth/login", json=payload)
        data = res.get_json()
        print(f"\n3. POST /api/auth/login ({role_name}): Status {res.status_code}")
        print("   Response:", data)
        assert res.status_code == 200, f"Login failed for {role_name}"
        assert data["success"] is True, f"Success flag false for {role_name}"
        logged_in_users[role_name] = data["user"]

    # 4. Failed Login Tests
    # 4a. Invalid Password
    res = client.post("/api/auth/login", json={"email": "admin01@rit.edu", "password": "wrongpassword", "role": "Admin"})
    print(f"\n4a. Wrong Password Login: Status {res.status_code}")
    print("   Response:", res.get_json())
    assert res.status_code == 401, "Expected 401 for wrong password"

    # 4b. Role Mismatch
    res = client.post("/api/auth/login", json={"email": "admin01@rit.edu", "password": "admin123", "role": "Student"})
    print(f"\n4b. Role Mismatch Login: Status {res.status_code}")
    print("   Response:", res.get_json())
    assert res.status_code == 403, "Expected 403 for role mismatch"

    # 4c. Nonexistent User
    res = client.post("/api/auth/login", json={"email": "unknown@rit.edu", "password": "pass", "role": "Student"})
    print(f"\n4c. Nonexistent User: Status {res.status_code}")
    print("   Response:", res.get_json())
    assert res.status_code == 401, "Expected 401 for user not found"

    # 5. User Registration Test
    import uuid
    random_id = uuid.uuid4().hex[:5]
    new_user_payload = {
        "name": f"Test Student {random_id}",
        "email": f"test.student.{random_id}@rit.edu",
        "password": "Password@123",
        "role": "Student",
        "student_id": f"TEST{random_id.upper()}",
        "department": "CSE",
        "phone": "9998887776"
    }
    res = client.post("/api/auth/register", json=new_user_payload)
    print(f"\n5. POST /api/auth/register: Status {res.status_code}")
    print("   Response:", res.get_json())
    assert res.status_code == 201, "Registration failed"

    # Test login with registered user
    res = client.post("/api/auth/login", json={
        "email": new_user_payload["email"],
        "password": new_user_payload["password"],
        "role": "Student"
    })
    print(f"\n5b. POST /api/auth/login (Newly Registered User): Status {res.status_code}")
    print("   Response:", res.get_json())
    assert res.status_code == 200, "Login for newly registered user failed"

    # 6. Labs Listing
    res = client.get("/api/labs")
    labs = res.get_json()
    print(f"\n6. GET /api/labs: Status {res.status_code}, Found {len(labs)} labs")
    assert res.status_code == 200 and len(labs) > 0, "Failed to load labs"

    # 7. Resources Listing
    res = client.get("/api/resources")
    resources = res.get_json()
    print(f"\n7. GET /api/resources: Status {res.status_code}, Found {len(resources)} resources")
    assert res.status_code == 200 and len(resources) > 0, "Failed to load resources"

    # 8. Admin Dashboard Stats
    res = client.get("/api/admin/dashboard-stats")
    stats = res.get_json()
    print(f"\n8. GET /api/admin/dashboard-stats: Status {res.status_code}")
    print("   Stats:", stats)
    assert res.status_code == 200, "Failed to load dashboard stats"

    # 9. Admin Users List
    res = client.get("/api/admin/users")
    users = res.get_json()
    print(f"\n9. GET /api/admin/users: Status {res.status_code}, Total users: {len(users)}")
    assert res.status_code == 200 and len(users) > 0, "Failed to load users"

    # 10. Check Booking Conflict / Availability
    target_lab_id = labs[0]["id"]
    res = client.get(f"/api/bookings/check-conflict?labId={target_lab_id}&startTime=2026-11-01T10:00:00&endTime=2026-11-01T12:00:00")
    print(f"\n10. GET /api/bookings/check-conflict: Status {res.status_code}")
    print("    Response:", res.get_json())
    assert res.status_code == 200, "Conflict check failed"

    # 11. Create Booking
    student_user_id = logged_in_users["Student"]["id"]
    booking_payload = {
        "userId": student_user_id,
        "labId": target_lab_id,
        "purpose": "Automated Python and SQL Server integration test",
        "startTime": "2026-11-01T10:00:00",
        "endTime": "2026-11-01T12:00:00",
        "studentCount": 5
    }
    res = client.post("/api/bookings", json=booking_payload)
    print(f"\n11. POST /api/bookings: Status {res.status_code}")
    booking_res = res.get_json()
    print("    Response:", booking_res)
    assert res.status_code == 201, "Booking creation failed"
    req_id = booking_res["requestId"]

    # 12. Check My Bookings
    res = client.get(f"/api/bookings/my/{student_user_id}")
    my_bookings = res.get_json()
    print(f"\n12. GET /api/bookings/my/{student_user_id}: Status {res.status_code}")
    print(f"    Pending bookings: {len(my_bookings.get('pending', []))}")
    assert res.status_code == 200, "My bookings failed"

    # 13. Check Booking Status
    res = client.get(f"/api/bookings/status/{req_id}")
    status_data = res.get_json()
    print(f"\n13. GET /api/bookings/status/{req_id}: Status {res.status_code}")
    print("    Status Data:", status_data)
    assert res.status_code == 200, "Booking status check failed"

    # 14. Lab Assistant Stats & Schedule
    res = client.get("/api/lab-assistant/stats")
    print(f"\n14a. GET /api/lab-assistant/stats: Status {res.status_code}")
    print("     Stats:", res.get_json())
    assert res.status_code == 200, "Lab assistant stats failed"

    res = client.get("/api/lab-assistant/schedule/today")
    print(f"\n14b. GET /api/lab-assistant/schedule/today: Status {res.status_code}")
    assert res.status_code == 200, "Today schedule failed"

    # 15. Maintenance
    res = client.get("/api/maintenance")
    print(f"\n15. GET /api/maintenance: Status {res.status_code}, Records: {len(res.get_json())}")
    assert res.status_code == 200, "Maintenance load failed"

    print("\n" + "=" * 60)
    print("ALL API & SQL SERVER TESTS PASSED SUCCESSFULLY! (100% GREEN)")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
