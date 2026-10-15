# scratch/audit_database.py
import os
import sys
sys.path.insert(0, os.path.abspath('.'))
import json
import pyodbc
from backend.database import get_connection, fetch_all_dict

def run_audit():
    conn = get_connection()
    cur = conn.cursor()

    report = {}

    # 1. Tables in DB
    cur.execute("""
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
    """)
    tables = [row['TABLE_NAME'] for row in fetch_all_dict(cur)]
    report['tables'] = {}

    for table in tables:
        cur.execute(f"SELECT COUNT(*) AS cnt FROM [{table}]")
        cnt = fetch_all_dict(cur)[0]['cnt']
        report['tables'][table] = cnt

    # 2. Check Primary Keys and Foreign Keys
    cur.execute("""
        SELECT 
            tc.TABLE_NAME, 
            kcu.COLUMN_NAME, 
            tc.CONSTRAINT_TYPE
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
            ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        WHERE tc.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
        ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_TYPE
    """)
    report['constraints'] = fetch_all_dict(cur)

    # 3. Check for Duplicate Labs
    cur.execute("""
        SELECT lab_name, COUNT(*) AS count
        FROM labs
        GROUP BY lab_name
        HAVING COUNT(*) > 1
    """)
    report['duplicate_labs'] = fetch_all_dict(cur)

    # 4. Check for Duplicate Users (email or employee_student_id)
    cur.execute("""
        SELECT email, COUNT(*) AS count
        FROM users
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email
        HAVING COUNT(*) > 1
    """)
    report['duplicate_user_emails'] = fetch_all_dict(cur)

    cur.execute("""
        SELECT employee_student_id, COUNT(*) AS count
        FROM users
        WHERE employee_student_id IS NOT NULL AND employee_student_id != ''
        GROUP BY employee_student_id
        HAVING COUNT(*) > 1
    """)
    report['duplicate_user_ids'] = fetch_all_dict(cur)

    # 5. Check for Duplicate Resources per lab (resource_name per lab)
    cur.execute("""
        SELECT lab_id, resource_name, COUNT(*) AS count
        FROM resources
        GROUP BY lab_id, resource_name
        HAVING COUNT(*) > 1
    """)
    report['duplicate_resources'] = fetch_all_dict(cur)

    # 6. Check for Duplicate Bookings
    cur.execute("""
        SELECT user_id, lab_id, start_time, end_time, status, COUNT(*) AS count
        FROM bookings
        GROUP BY user_id, lab_id, start_time, end_time, status
        HAVING COUNT(*) > 1
    """)
    report['duplicate_bookings'] = fetch_all_dict(cur)

    # 7. Check Labs and PC resources breakdown
    cur.execute("""
        SELECT 
            l.lab_id,
            l.lab_name,
            l.status AS lab_status,
            COUNT(r.resource_id) AS total_resources,
            COUNT(CASE WHEN r.status = 'AVAILABLE' THEN 1 END) AS avail_resources,
            COUNT(CASE WHEN r.status = 'MAINTENANCE' THEN 1 END) AS maint_resources
        FROM labs l
        LEFT JOIN resources r ON l.lab_id = r.lab_id
        GROUP BY l.lab_id, l.lab_name, l.status
        ORDER BY l.lab_id
    """)
    report['labs_breakdown'] = fetch_all_dict(cur)

    # 8. Check Notifications for duplicates
    cur.execute("""
        SELECT user_id, title, CAST(message AS NVARCHAR(500)) AS message_text, COUNT(*) AS count
        FROM notifications
        GROUP BY user_id, title, CAST(message AS NVARCHAR(500))
        HAVING COUNT(*) > 1
    """)
    report['duplicate_notifications'] = fetch_all_dict(cur)

    conn.close()
    return report

if __name__ == '__main__':
    audit_data = run_audit()
    print(json.dumps(audit_data, indent=2, default=str))
