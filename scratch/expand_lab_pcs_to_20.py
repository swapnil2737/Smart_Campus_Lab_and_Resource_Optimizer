import sys
sys.path.append('backend')
from database import get_connection, fetch_all_dict

conn = get_connection()
cursor = conn.cursor()

# 1. Update labs capacity to 20
cursor.execute("UPDATE labs SET capacity = 20")
print(f"Updated labs table capacity to 20 across all {cursor.rowcount} labs.")

# 2. Query all labs
cursor.execute("SELECT lab_id, lab_name FROM labs ORDER BY lab_id")
labs = fetch_all_dict(cursor)

inserted_count = 0
for l in labs:
    lab_id = l['lab_id']
    lab_name = l['lab_name']
    
    for pc_num in range(11, 21):
        asset_code = f"LAB{lab_id:02d}PC{pc_num:02d}"
        resource_name = f"{lab_name} PC {pc_num}"
        serial_number = f"SN{lab_id:02d}{pc_num:02d}"
        
        # Check if already exists
        cursor.execute("SELECT resource_id FROM resources WHERE asset_code = ?", (asset_code,))
        existing = cursor.fetchone()
        if not existing:
            cursor.execute("""
                INSERT INTO resources (
                    lab_id, resource_type_id, asset_code, resource_name,
                    serial_number, capacity, status, version, created_at
                ) VALUES (
                    ?, 1, ?, ?,
                    ?, 1, 'AVAILABLE', 1, GETDATE()
                )
            """, (lab_id, asset_code, resource_name, serial_number))
            inserted_count += 1

conn.commit()
print(f"Successfully inserted {inserted_count} new PC resources (PCs 11-20 for all 14 labs).")

# 3. Verification
cursor.execute("SELECT COUNT(*) AS total_resources FROM resources")
total = fetch_all_dict(cursor)[0]['total_resources']
print(f"Total resources in SQL Server now: {total}")

for l in labs:
    cursor.execute("SELECT COUNT(*) AS cnt, MIN(asset_code) as min_code, MAX(asset_code) as max_code FROM resources WHERE lab_id = ?", (l['lab_id'],))
    stats = fetch_all_dict(cursor)[0]
    print(f"  Lab {l['lab_id']} ({l['lab_name']}): {stats['cnt']} PCs ({stats['min_code']} .. {stats['max_code']})")
