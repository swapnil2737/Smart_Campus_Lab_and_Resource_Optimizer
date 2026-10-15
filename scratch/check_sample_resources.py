import sys
sys.path.append('backend')
from database import get_connection, fetch_all_dict

conn = get_connection()
cursor = conn.cursor()

cursor.execute('SELECT lab_id, lab_name, location FROM labs ORDER BY lab_id')
labs = fetch_all_dict(cursor)

for l in labs:
    cursor.execute('SELECT TOP 3 resource_id, lab_id, resource_type_id, asset_code, resource_name, serial_number, capacity, status FROM resources WHERE lab_id = ? ORDER BY resource_id', (l['lab_id'],))
    sample = fetch_all_dict(cursor)
    print(f"Lab {l['lab_id']} ({l['lab_name']}):")
    for s in sample:
        print("  ", s)
