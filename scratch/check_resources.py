import sys
sys.path.append('backend')
from database import get_connection, fetch_all_dict

conn = get_connection()
cursor = conn.cursor()

cursor.execute('SELECT lab_id, lab_name, location FROM labs ORDER BY lab_id')
labs = fetch_all_dict(cursor)
for l in labs:
    cursor.execute('SELECT MIN(asset_code) as min_code, MAX(asset_code) as max_code, COUNT(*) as cnt FROM resources WHERE lab_id = ?', (l['lab_id'],))
    stats = fetch_all_dict(cursor)[0]
    print(f"Lab {l['lab_id']}: {l['lab_name']} -> {stats['cnt']} resources ({stats['min_code']} .. {stats['max_code']})")
