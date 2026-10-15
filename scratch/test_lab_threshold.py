import urllib.request
import json
import pyodbc
import os
import sys

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

def test_threshold_logic():
    print("=" * 60)
    print("TESTING 5-PC LAB MAINTENANCE THRESHOLD LOGIC")
    print("=" * 60)

    conn = get_db_conn()
    cursor = conn.cursor()

    # Pick Lab 1 (Apple Lab) for test
    lab_id = 1

    # First, reset all Lab 1 PCs to AVAILABLE
    cursor.execute("UPDATE resources SET status = 'AVAILABLE' WHERE lab_id = ?", (lab_id,))
    cursor.execute("UPDATE labs SET status = 'ACTIVE' WHERE lab_id = ?", (lab_id,))
    conn.commit()

    # Case 1: 0 PCs in Maintenance
    status, labs = make_req("/api/labs")
    lab1 = next((l for l in labs if l["id"] == lab_id), None)
    assert lab1 is not None
    assert lab1["status"] == "Available", f"Expected Available, got {lab1['status']}"
    assert lab1["maintenanceResources"] == 0
    assert lab1["availableResources"] == 20
    print("[PASS] Case 1 (0 PCs in Maint): Lab 1 status = Available (20/20 Available, 0 Maint)")

    # Case 2: 3 PCs in Maintenance (1 to 4 PCs -> Lab stays Available)
    cursor.execute("UPDATE TOP (3) resources SET status = 'MAINTENANCE' WHERE lab_id = ?", (lab_id,))
    conn.commit()

    status, labs = make_req("/api/labs")
    lab1 = next((l for l in labs if l["id"] == lab_id), None)
    assert lab1["status"] == "Available", f"Expected Available for 3 failed PCs, got {lab1['status']}"
    assert lab1["maintenanceResources"] == 3
    assert lab1["availableResources"] == 17
    print("[PASS] Case 2 (3 PCs in Maint): Lab 1 status = Available (17/20 Available, 3 Maint)")

    # Check that individual failed PCs are returned with status 'Maintenance'
    status, resources = make_req(f"/api/resources?labId={lab_id}")
    maint_pcs = [r for r in resources if r["labId"] == lab_id and r["status"] == "Maintenance"]
    avail_pcs = [r for r in resources if r["labId"] == lab_id and r["status"] == "Available"]
    assert len(maint_pcs) == 3, f"Expected 3 maint PCs, got {len(maint_pcs)}"
    assert len(avail_pcs) == 17, f"Expected 17 avail PCs, got {len(avail_pcs)}"
    print(f"[PASS] Case 2 (All View): 3 failed PCs marked Maintenance ({[p['id'] for p in maint_pcs]}), 17 available PCs visible")

    # Case 3: Exactly 5 PCs in Maintenance (Threshold reached -> Lab becomes Maintenance)
    cursor.execute("UPDATE resources SET status = 'AVAILABLE' WHERE lab_id = ?", (lab_id,))
    cursor.execute("UPDATE TOP (5) resources SET status = 'MAINTENANCE' WHERE lab_id = ?", (lab_id,))
    conn.commit()

    status, labs = make_req("/api/labs")
    lab1 = next((l for l in labs if l["id"] == lab_id), None)
    assert lab1["status"] == "Maintenance", f"Expected Maintenance for 5 failed PCs, got {lab1['status']}"
    assert lab1["maintenanceResources"] == 5
    assert lab1["availableResources"] == 15
    print("[PASS] Case 3 (5 PCs in Maint): Lab 1 status = Maintenance (Threshold triggered)")

    # Case 4: 8 PCs in Maintenance (6-20 PCs -> Lab stays Maintenance)
    cursor.execute("UPDATE resources SET status = 'AVAILABLE' WHERE lab_id = ?", (lab_id,))
    cursor.execute("UPDATE TOP (8) resources SET status = 'MAINTENANCE' WHERE lab_id = ?", (lab_id,))
    conn.commit()

    status, labs = make_req("/api/labs")
    lab1 = next((l for l in labs if l["id"] == lab_id), None)
    assert lab1["status"] == "Maintenance", f"Expected Maintenance for 8 failed PCs, got {lab1['status']}"
    assert lab1["maintenanceResources"] == 8
    assert lab1["availableResources"] == 12
    print("[PASS] Case 4 (8 PCs in Maint): Lab 1 status = Maintenance (8/20 in Maint)")

    # Case 5: Restoring PCs back (e.g. down to 2 PCs) -> Lab returns to Available
    cursor.execute("UPDATE resources SET status = 'AVAILABLE' WHERE lab_id = ?", (lab_id,))
    cursor.execute("UPDATE TOP (2) resources SET status = 'MAINTENANCE' WHERE lab_id = ?", (lab_id,))
    conn.commit()

    status, labs = make_req("/api/labs")
    lab1 = next((l for l in labs if l["id"] == lab_id), None)
    assert lab1["status"] == "Available", f"Expected Available after restoring, got {lab1['status']}"
    assert lab1["maintenanceResources"] == 2
    assert lab1["availableResources"] == 18
    print("[PASS] Case 5 (Restored to 2 PCs in Maint): Lab 1 dynamically returns to Available")

    # Clean up: reset test lab PCs to AVAILABLE
    cursor.execute("UPDATE resources SET status = 'AVAILABLE' WHERE lab_id = ?", (lab_id,))
    conn.commit()
    conn.close()

    print("\n" + "=" * 60)
    print("ALL 5-PC LAB MAINTENANCE THRESHOLD TESTS PASSED! [100%]")
    print("=" * 60)

if __name__ == "__main__":
    test_threshold_logic()
