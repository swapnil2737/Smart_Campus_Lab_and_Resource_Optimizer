from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, date, time
import uuid
import os
import re
from werkzeug.security import generate_password_hash, check_password_hash

from database import (
    get_connection,
    get_db_connection,
    fetch_one_dict,
    fetch_all_dict,
    close_db,
    test_connection,
    DB_NAME
)
from team_a_service import submit_to_team_a, get_team_a_status

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return response


# =========================================================
# HELPER FUNCTIONS & SERIALIZATION
# =========================================================

def error_response(message, status_code=500):
    return jsonify({
        "success": False,
        "message": message
    }), status_code


def format_datetime(value):
    return value.isoformat() if value else None


def format_date(value):
    return value.strftime("%Y-%m-%d") if value else None


def format_time_range(start_value, end_value):
    if not start_value or not end_value:
        return ""
    return f"{start_value.strftime('%H:%M')} - {end_value.strftime('%H:%M')}"


def display_lab_status(status):
    value = str(status or "").upper()
    mapping = {
        "ACTIVE": "Available",
        "AVAILABLE": "Available",
        "MAINTENANCE": "Maintenance",
        "BUSY": "Busy",
        "FULL": "Full",
        "INACTIVE": "Inactive"
    }
    return mapping.get(value, value.title() if value else "Unknown")


def display_resource_status(status):
    value = str(status or "").upper()
    mapping = {
        "AVAILABLE": "Available",
        "OCCUPIED": "Occupied",
        "RESERVED": "Reserved",
        "MAINTENANCE": "Maintenance",
        "OFFLINE": "Offline"
    }
    return mapping.get(value, value.title() if value else "Unknown")


def db_lab_status(status):
    value = str(status or "").strip().upper()
    if value in {"AVAILABLE", "ACTIVE"}:
        return "ACTIVE"
    if value == "MAINTENANCE":
        return "MAINTENANCE"
    if value in {"BUSY", "FULL", "INACTIVE"}:
        return value
    return value


def canonical_role(value):
    value = str(value or "").strip().upper().replace("-", "_").replace(" ", "_")
    aliases = {
        "ADMIN": "ADMINISTRATOR",
        "ADMINISTRATOR": "ADMINISTRATOR",
        "LABASSISTANT": "LAB_ASSISTANT",
        "LAB_ASSISTANT": "LAB_ASSISTANT",
        "FACULTY": "FACULTY",
        "STUDENT": "STUDENT"
    }
    return aliases.get(value, value)


def frontend_role(role_name):
    role = canonical_role(role_name)
    return {
        "STUDENT": "Student",
        "FACULTY": "Faculty",
        "LAB_ASSISTANT": "Lab Assistant",
        "ADMINISTRATOR": "Admin"
    }.get(role, str(role_name).title())


def maintenance_status_for_frontend(status):
    value = str(status or "").upper()
    return {
        "SCHEDULED": "Pending",
        "ACTIVE": "Under Maintenance",
        "COMPLETED": "Completed"
    }.get(value, value.title())


def maintenance_status_for_db(status):
    value = str(status or "").strip().upper()
    return {
        "PENDING": "SCHEDULED",
        "UNDER MAINTENANCE": "ACTIVE",
        "COMPLETED": "COMPLETED"
    }.get(value, value)


def verify_password(stored_password, provided_password):
    if not stored_password or not provided_password:
        return False
    if str(stored_password) == str(provided_password):
        return True
    try:
        return check_password_hash(str(stored_password), str(provided_password))
    except Exception:
        return False


def create_notification(cursor, user_id, title, message, notif_type="INFO"):
    """Helper to insert a notification into the SQL Server notifications table."""
    try:
        cursor.execute("""
            INSERT INTO notifications (user_id, title, message, type, status, created_at)
            VALUES (?, ?, ?, ?, 'UNREAD', GETDATE())
        """, (user_id, title, message, notif_type))
    except Exception as e:
        print("Notification insert warning:", e)


# =========================================================
# HEALTH & DB DIAGNOSTIC
# =========================================================

@app.get("/api/health")
def health():
    db_result = test_connection()
    if db_result["success"]:
        return jsonify({
            "success": True,
            "status": "UP",
            "message": "Smart Campus Lab backend is running and connected to SQL Server",
            "database": db_result["database"]
        })
    else:
        return jsonify({
            "success": False,
            "status": "DEGRADED",
            "message": "Backend is running, but SQL Server connection failed.",
            "database": db_result["database"],
            "error": db_result["message"]
        }), 500


@app.get("/api/db-test")
def db_test():
    result = test_connection()
    status_code = 200 if result["success"] else 500
    return jsonify(result), status_code


# =========================================================
# AUTHENTICATION (LOGIN, REGISTER, LOGOUT)
# =========================================================

@app.post("/api/login")
@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}

    username_or_email = str(data.get("email") or data.get("username") or "").strip()
    password = data.get("password")
    role = data.get("role")

    if not username_or_email or password is None:
        return error_response("Username/email and password are required.", 400)

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        query = """
            SELECT
                u.user_id,
                u.email,
                u.full_name,
                u.password_hash,
                u.employee_student_id,
                u.department,
                u.status,
                r.role_id,
                r.role_name
            FROM users u
            JOIN roles r
                ON u.role_id = r.role_id
            WHERE (u.email = ? OR u.employee_student_id = ?)
        """

        cursor.execute(query, (username_or_email, username_or_email))
        user = fetch_one_dict(cursor)

        if not user:
            return error_response("Invalid username or password.", 401)

        if str(user["status"]).upper() != "ACTIVE":
            return error_response("User account is inactive. Please contact administration.", 403)

        if not verify_password(user["password_hash"], password):
            return error_response("Invalid username or password.", 401)

        if role:
            if canonical_role(user["role_name"]) != canonical_role(role):
                return error_response("Selected role does not match the account.", 403)

        # Log session into user_sessions table
        try:
            ip_addr = request.remote_addr or "127.0.0.1"
            ua = (request.user_agent.string if request.user_agent else "Browser")[:250]
            cursor.execute("""
                INSERT INTO user_sessions (user_id, login_time, ip_address, user_agent, status)
                VALUES (?, GETDATE(), ?, ?, 'ACTIVE')
            """, (user["user_id"], ip_addr, ua))
            conn.commit()
        except Exception as sess_err:
            print("Session log warning:", sess_err)

        user_role_str = frontend_role(user["role_name"])

        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": {
                "id": user["user_id"],
                "userId": user["user_id"],
                "username": user["employee_student_id"] or user["email"],
                "email": user["email"],
                "name": user["full_name"],
                "department": user["department"],
                "role": user_role_str
            }
        }), 200

    except Exception as error:
        print("LOGIN ERROR:", error)
        return error_response("Login failed due to a database error.", 500)

    finally:
        close_db(cursor, conn)


@app.post("/api/register")
@app.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}

    full_name = str(data.get("name") or data.get("full_name") or "").strip()
    email = str(data.get("email") or "").strip()
    password = data.get("password")
    role_input = str(data.get("role") or "Student").strip()
    employee_student_id = str(data.get("employee_student_id") or data.get("student_id") or data.get("username") or "").strip()
    department = str(data.get("department") or "General").strip()
    phone = str(data.get("phone") or "").strip()

    if not full_name or not email or not password:
        return error_response("Full name, email, and password are required.", 400)

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Check duplicate email
        cursor.execute("SELECT TOP 1 user_id FROM users WHERE email = ?", (email,))
        if cursor.fetchone():
            return error_response("Email already registered.", 409)

        # Check duplicate employee_student_id if provided
        if employee_student_id:
            cursor.execute("SELECT TOP 1 user_id FROM users WHERE employee_student_id = ?", (employee_student_id,))
            if cursor.fetchone():
                return error_response("Student / Employee ID already exists.", 409)

        # Lookup role_id
        canon = canonical_role(role_input)
        cursor.execute("SELECT TOP 1 role_id, role_name FROM roles WHERE role_name = ?", (canon,))
        role_row = fetch_one_dict(cursor)
        if not role_row:
            cursor.execute("SELECT TOP 1 role_id, role_name FROM roles WHERE role_name = 'STUDENT'")
            role_row = fetch_one_dict(cursor)

        role_id = role_row["role_id"] if role_row else 1
        role_name = role_row["role_name"] if role_row else "STUDENT"

        if not employee_student_id:
            prefix = "STU" if role_name == "STUDENT" else "EMP"
            employee_student_id = f"{prefix}{uuid.uuid4().hex[:6].upper()}"

        pwd_hash = generate_password_hash(str(password))

        insert_query = """
            INSERT INTO users (
                role_id,
                email,
                full_name,
                password_hash,
                employee_student_id,
                department,
                phone,
                status
            )
            OUTPUT INSERTED.user_id, INSERTED.role_id, INSERTED.email, INSERTED.full_name, INSERTED.employee_student_id, INSERTED.department, INSERTED.status
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        """

        cursor.execute(insert_query, (
            role_id,
            email,
            full_name,
            pwd_hash,
            employee_student_id,
            department,
            phone or None
        ))

        new_user = fetch_one_dict(cursor)

        # Welcome notification
        create_notification(
            cursor,
            new_user["user_id"],
            "Welcome to Smart Campus Lab",
            f"Hello {full_name}, your account has been registered successfully as {frontend_role(role_name)}.",
            "SUCCESS"
        )

        conn.commit()

        return jsonify({
            "success": True,
            "message": "User registered successfully",
            "user": {
                "id": new_user["user_id"],
                "userId": new_user["user_id"],
                "username": new_user["employee_student_id"],
                "email": new_user["email"],
                "name": new_user["full_name"],
                "department": new_user["department"],
                "role": frontend_role(role_name)
            }
        }), 201

    except Exception as error:
        if conn:
            conn.rollback()
        print("REGISTER ERROR:", error)
        return error_response("Registration failed due to a database error.", 500)

    finally:
        close_db(cursor, conn)


@app.post("/api/forgot-password")
@app.post("/api/auth/forgot-password")
@app.post("/api/auth/reset-password")
def forgot_password():
    data = request.get_json(silent=True) or {}
    email_or_user = str(data.get("email") or data.get("username") or data.get("emailOrUsername") or "").strip()
    new_password = str(data.get("newPassword") or data.get("password") or "").strip()

    if not email_or_user or not new_password:
        return error_response("Email/Username and new password are required.", 400)

    if len(new_password) < 4:
        return error_response("Password must be at least 4 characters long.", 400)

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT TOP 1 user_id, email, full_name, status
            FROM users
            WHERE (email = ? OR employee_student_id = ?)
        """, (email_or_user, email_or_user))

        user = fetch_one_dict(cursor)

        if not user:
            return error_response("No user account found with that email or username.", 404)

        if str(user["status"]).upper() != "ACTIVE":
            return error_response("User account is inactive. Please contact administration.", 403)

        pwd_hash = generate_password_hash(new_password)

        cursor.execute("""
            UPDATE users
            SET password_hash = ?
            WHERE user_id = ?
        """, (pwd_hash, user["user_id"]))

        # Insert security notification
        create_notification(
            cursor,
            user["user_id"],
            "Password Changed",
            "Your account password was updated successfully. If you did not make this change, please alert campus admin immediately.",
            "WARNING"
        )

        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Password has been reset successfully for {user['full_name']}. You can now login with your new password."
        }), 200

    except Exception as error:
        if conn:
            conn.rollback()
        print("FORGOT PASSWORD ERROR:", error)
        return error_response("Unable to reset password due to a database error.", 500)

    finally:
        close_db(cursor, conn)


@app.post("/api/logout")
@app.post("/api/auth/logout")
def logout():
    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    }), 200


# =========================================================
# LABS
# =========================================================

def query_labs(cursor):
    cursor.execute("""
        SELECT
            l.lab_id,
            l.lab_name,
            l.department,
            l.building,
            l.floor,
            l.room_number,
            l.location,
            l.capacity,
            CASE
                WHEN l.status = 'MAINTENANCE' THEN 'MAINTENANCE'
                WHEN COUNT(r.resource_id) > 0 AND COUNT(CASE WHEN r.status = 'AVAILABLE' THEN 1 END) = 0 THEN 'MAINTENANCE'
                ELSE l.status
            END AS status,
            COUNT(r.resource_id) AS total_resources,
            COUNT(CASE WHEN r.status = 'AVAILABLE' THEN 1 END) AS available_resources,
            COUNT(CASE WHEN r.status = 'MAINTENANCE' THEN 1 END) AS maintenance_resources
        FROM labs l
        LEFT JOIN resources r
            ON r.lab_id = l.lab_id
        GROUP BY
            l.lab_id,
            l.lab_name,
            l.department,
            l.building,
            l.floor,
            l.room_number,
            l.location,
            l.capacity,
            l.status
        ORDER BY l.lab_id
    """)
    return fetch_all_dict(cursor)


def map_lab(lab):
    total = lab["total_resources"] if lab["total_resources"] > 0 else (lab["capacity"] or 0)
    avail = lab["available_resources"] if lab["total_resources"] > 0 else (lab["capacity"] or 0)
    maint = lab["maintenance_resources"] if lab["total_resources"] > 0 else 0
    return {
        "id": lab["lab_id"],
        "name": lab["lab_name"],
        "department": lab["department"],
        "building": lab["building"],
        "floor": lab["floor"],
        "roomNumber": lab["room_number"],
        "location": lab["location"],
        "capacity": avail,
        "totalCapacity": total,
        "totalResources": total,
        "availableResources": avail,
        "maintenanceResources": maint,
        "total": total,
        "status": display_lab_status(lab["status"]),
        "util": 0
    }


@app.get("/api/labs")
@app.get("/api/admin/labs")
def get_labs():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()
        labs = query_labs(cursor)
        return jsonify([map_lab(lab) for lab in labs])

    except Exception as error:
        print("LABS ERROR:", error)
        return error_response("Unable to load laboratories.", 500)

    finally:
        close_db(cursor, conn)


@app.patch("/api/admin/labs/<int:lab_id>/status")
def update_lab_status(lab_id):
    data = request.get_json(silent=True) or {}
    target_status = db_lab_status(data.get("status"))
    reason = str(data.get("reason") or "").strip()

    allowed = {"ACTIVE", "MAINTENANCE", "BUSY", "FULL", "INACTIVE"}

    if target_status not in allowed:
        return error_response("Invalid laboratory status.", 400)

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT TOP 1 lab_id, lab_name, status FROM labs WHERE lab_id = ?",
            (lab_id,)
        )
        lab = fetch_one_dict(cursor)

        if not lab:
            return error_response("Lab not found.", 404)

        cursor.execute(
            "UPDATE labs SET status = ? WHERE lab_id = ?",
            (target_status, lab_id)
        )

        conn.commit()

        return jsonify({
            "success": True,
            "lab": {
                "id": lab_id,
                "name": lab["lab_name"],
                "status": display_lab_status(target_status),
                "reason": reason
            }
        })

    except Exception as error:
        if conn:
            conn.rollback()
        print("UPDATE LAB ERROR:", error)
        return error_response("Unable to update laboratory status.", 500)

    finally:
        close_db(cursor, conn)


# =========================================================
# RESOURCES
# =========================================================

def query_resources(cursor, lab_id=None):
    query = """
        SELECT
            r.resource_id,
            r.asset_code,
            r.resource_name,
            r.serial_number,
            r.capacity,
            r.status,
            r.created_at,
            rt.type AS resource_type,
            l.lab_id,
            l.lab_name
        FROM resources r
        JOIN resource_types rt
            ON r.resource_type_id = rt.resource_type_id
        JOIN labs l
            ON r.lab_id = l.lab_id
    """

    params = []

    if lab_id is not None:
        query += " WHERE l.lab_id = ? "
        params.append(lab_id)

    query += " ORDER BY r.resource_id"

    cursor.execute(query, params)
    return fetch_all_dict(cursor)


def map_resource(resource):
    return {
        "id": resource["asset_code"],
        "resourceId": resource["resource_id"],
        "name": resource["resource_name"] or resource["asset_code"],
        "type": resource["resource_type"],
        "lab": resource["lab_name"],
        "labId": resource["lab_id"],
        "status": display_resource_status(resource["status"]),
        "specs": (
            f"Serial: {resource['serial_number'] or 'N/A'}"
            f" | Capacity: {resource['capacity'] or 1}"
        ),
        "lastUpdated": format_datetime(resource["created_at"])
    }


@app.get("/api/resources")
def get_resources():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()
        resources = query_resources(cursor)
        return jsonify([map_resource(resource) for resource in resources])

    except Exception as error:
        print("RESOURCES ERROR:", error)
        return error_response("Unable to load resources.", 500)

    finally:
        close_db(cursor, conn)


@app.get("/api/admin/resources")
def admin_resources():
    lab_filter = request.args.get("lab")

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        lab_id = None
        if lab_filter and lab_filter.lower() != "all":
            try:
                lab_id = int(lab_filter)
            except ValueError:
                cursor.execute(
                    "SELECT TOP 1 lab_id FROM labs WHERE lab_name = ?",
                    (lab_filter,)
                )
                lab = fetch_one_dict(cursor)
                lab_id = lab["lab_id"] if lab else -1

        resources = query_resources(cursor, lab_id)
        return jsonify([map_resource(resource) for resource in resources])

    except Exception as error:
        print("ADMIN RESOURCES ERROR:", error)
        return error_response("Unable to load resources.", 500)

    finally:
        close_db(cursor, conn)


@app.patch("/api/admin/resources/<path:resource_id>/status")
def update_resource_status(resource_id):
    data = request.get_json(silent=True) or {}
    new_status = str(data.get("status") or "").strip().upper()
    reason = str(data.get("reason") or "").strip()

    allowed = {"AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE", "OFFLINE"}

    if new_status not in allowed:
        return error_response("Invalid resource status.", 400)

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT TOP 1
                r.resource_id,
                r.asset_code,
                r.status,
                r.lab_id
            FROM resources r
            WHERE r.asset_code = ?
        """, (resource_id,))

        resource = fetch_one_dict(cursor)

        if not resource:
            return error_response("Resource not found.", 404)

        cursor.execute(
            "UPDATE resources SET status = ? WHERE resource_id = ?",
            (new_status, resource["resource_id"])
        )

        conn.commit()

        return jsonify({
            "success": True,
            "resource": {
                "id": resource["asset_code"],
                "status": display_resource_status(new_status),
                "reason": reason
            }
        })

    except Exception as error:
        if conn:
            conn.rollback()
        print("UPDATE RESOURCE ERROR:", error)
        return error_response("Unable to update resource status.", 500)

    finally:
        close_db(cursor, conn)


# =========================================================
# MAINTENANCE
# =========================================================

def query_maintenance(cursor):
    cursor.execute("""
        SELECT
            m.maintenance_id,
            m.resource_id,
            m.created_by,
            m.start_time,
            m.end_time,
            m.reason,
            m.status,
            m.cost,
            m.notes,
            r.asset_code,
            r.resource_name,
            r.status AS resource_status,
            l.lab_id,
            l.lab_name,
            u.full_name AS created_by_name
        FROM maintenance m
        JOIN resources r
            ON m.resource_id = r.resource_id
        JOIN labs l
            ON r.lab_id = l.lab_id
        LEFT JOIN users u
            ON m.created_by = u.user_id
        ORDER BY m.start_time DESC
    """)
    return fetch_all_dict(cursor)


def map_maintenance(record):
    raw_reason = str(record.get("reason") or "Maintenance required").strip()
    issue_type = "Maintenance"
    issue_desc = raw_reason
    if ":" in raw_reason:
        parts = raw_reason.split(":", 1)
        issue_type = parts[0].strip() or "Maintenance"
        issue_desc = parts[1].strip() or raw_reason

    return {
        "id": f"MNT-{record['maintenance_id']}",
        "maintenanceId": record["maintenance_id"],
        "resourceId": record["resource_id"],
        "targetId": record["asset_code"],
        "type": "Resource",
        "lab": record["lab_name"],
        "issueType": issue_type,
        "issue": issue_desc,
        "description": issue_desc,
        "status": maintenance_status_for_frontend(record["status"]),
        "priority": "Medium",
        "reportedBy": record["created_by_name"] or "System",
        "reportedAt": format_datetime(record["start_time"]),
        "assignedTo": "Campus Maintenance Team",
        "resolvedAt": format_datetime(record["end_time"]) if str(record["status"]).upper() == "COMPLETED" else None,
        "resolutionNotes": record["notes"] or ""
    }


@app.get("/api/maintenance")
@app.get("/api/admin/maintenance")
def get_maintenance():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()
        records = query_maintenance(cursor)
        return jsonify([map_maintenance(record) for record in records])

    except Exception as error:
        print("MAINTENANCE ERROR:", error)
        return error_response("Unable to load maintenance records.", 500)

    finally:
        close_db(cursor, conn)


def insert_maintenance_ticket(
    cursor,
    resource_id,
    reason,
    created_by=None,
    status="SCHEDULED"
):
    cursor.execute("""
        INSERT INTO maintenance (
            resource_id,
            created_by,
            start_time,
            end_time,
            reason,
            status,
            cost,
            notes
        )
        OUTPUT INSERTED.maintenance_id
        VALUES (?, ?, GETDATE(), NULL, ?, ?, 0, NULL)
    """, (
        resource_id,
        created_by,
        reason,
        status
    ))

    row = cursor.fetchone()
    return row[0] if row else None


def find_resource_id(cursor, resource_id_text):
    cursor.execute("""
        SELECT TOP 1
            r.resource_id,
            r.asset_code,
            r.lab_id,
            r.status,
            l.lab_name
        FROM resources r
        JOIN labs l
            ON r.lab_id = l.lab_id
        WHERE r.asset_code = ?
    """, (resource_id_text,))

    return fetch_one_dict(cursor)


@app.post("/api/admin/maintenance")
def create_maintenance_ticket():
    data = request.get_json(silent=True) or {}

    target_id = str(data.get("targetId") or "").strip()
    target_type = str(data.get("type") or "Resource").strip()
    lab_name = str(data.get("lab") or "").strip()
    issue = str(data.get("issue") or "").strip()
    priority = str(data.get("priority") or "Medium").strip()

    if not target_id or not issue:
        return error_response("Target ID and issue description are required.", 400)

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        resource = find_resource_id(cursor, target_id)

        if target_type.upper() == "LAB":
            cursor.execute("""
                SELECT TOP 1
                    r.resource_id,
                    r.asset_code,
                    r.lab_id,
                    l.lab_name
                FROM resources r
                JOIN labs l
                    ON r.lab_id = l.lab_id
                WHERE l.lab_name = ?
                ORDER BY r.resource_id
            """, (lab_name,))

            resource = fetch_one_dict(cursor)

            if not resource:
                return error_response("No resources were found for the selected laboratory.", 404)

            cursor.execute(
                "UPDATE labs SET status = 'MAINTENANCE' WHERE lab_id = ?",
                (resource["lab_id"],)
            )

        if not resource:
            return error_response("Resource not found.", 404)

        maintenance_id = insert_maintenance_ticket(
            cursor,
            resource["resource_id"],
            issue,
            None,
            "SCHEDULED"
        )

        cursor.execute(
            "UPDATE resources SET status = 'MAINTENANCE' WHERE resource_id = ?",
            (resource["resource_id"],)
        )

        conn.commit()

        return jsonify({
            "success": True,
            "ticket": {
                "id": f"MNT-{maintenance_id}",
                "maintenanceId": maintenance_id,
                "type": target_type,
                "targetId": target_id,
                "lab": resource["lab_name"],
                "issueType": "Maintenance",
                "issue": issue,
                "status": "Pending",
                "priority": priority,
                "reportedBy": "System Administrator",
                "reportedAt": datetime.now().isoformat(),
                "assignedTo": "Campus Maintenance Team",
                "resolutionNotes": ""
            },
            "message": "Maintenance ticket created successfully."
        })

    except Exception as error:
        if conn:
            conn.rollback()
        print("CREATE MAINTENANCE ERROR:", error)
        return error_response("Unable to create maintenance ticket.", 500)

    finally:
        close_db(cursor, conn)


@app.post("/api/admin/maintenance/<path:maintenance_id>/start")
@app.post("/api/lab-assistant/maintenance/<path:maintenance_id>/start")
@app.post("/api/maintenance/<path:maintenance_id>/start")
@app.patch("/api/admin/maintenance/<path:maintenance_id>/start")
@app.patch("/api/lab-assistant/maintenance/<path:maintenance_id>/start")
@app.patch("/api/maintenance/<path:maintenance_id>/start")
@app.put("/api/admin/maintenance/<path:maintenance_id>/start")
@app.put("/api/lab-assistant/maintenance/<path:maintenance_id>/start")
@app.put("/api/maintenance/<path:maintenance_id>/start")
def start_maintenance(maintenance_id):
    conn = None
    cursor = None

    # Parse numeric ID from string if needed (e.g. MNT-1 -> 1)
    clean_id_str = re.sub(r'^[^\d]*', '', str(maintenance_id).strip())
    if not clean_id_str.isdigit():
        return error_response("Invalid maintenance ticket ID.", 400)
    parsed_id = int(clean_id_str)

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT TOP 1
                m.maintenance_id,
                m.resource_id,
                r.lab_id
            FROM maintenance m
            JOIN resources r
                ON m.resource_id = r.resource_id
            WHERE m.maintenance_id = ?
        """, (parsed_id,))

        ticket = fetch_one_dict(cursor)

        if not ticket:
            return error_response("Maintenance ticket not found.", 404)

        cursor.execute("""
            UPDATE maintenance
            SET status = 'ACTIVE',
                start_time = GETDATE()
            WHERE maintenance_id = ?
        """, (parsed_id,))

        cursor.execute(
            "UPDATE resources SET status = 'MAINTENANCE' WHERE resource_id = ?",
            (ticket["resource_id"],)
        )

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Maintenance started successfully."
        })

    except Exception as error:
        if conn:
            conn.rollback()
        print("START MAINTENANCE ERROR:", error)
        return error_response("Unable to start maintenance.", 500)

    finally:
        close_db(cursor, conn)


@app.post("/api/admin/maintenance/<path:maintenance_id>/complete")
@app.post("/api/lab-assistant/maintenance/<path:maintenance_id>/complete")
@app.post("/api/maintenance/<path:maintenance_id>/complete")
@app.patch("/api/admin/maintenance/<path:maintenance_id>/complete")
@app.patch("/api/lab-assistant/maintenance/<path:maintenance_id>/complete")
@app.patch("/api/maintenance/<path:maintenance_id>/complete")
@app.put("/api/admin/maintenance/<path:maintenance_id>/complete")
@app.put("/api/lab-assistant/maintenance/<path:maintenance_id>/complete")
@app.put("/api/maintenance/<path:maintenance_id>/complete")
def complete_maintenance(maintenance_id):
    data = request.get_json(silent=True) or {}
    notes = str(
        data.get("resolutionNotes")
        or data.get("notes")
        or "Resolved and verified."
    ).strip()

    clean_id_str = re.sub(r'^[^\d]*', '', str(maintenance_id).strip())
    if not clean_id_str.isdigit():
        return error_response("Invalid maintenance ticket ID.", 400)
    parsed_id = int(clean_id_str)

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT TOP 1
                m.maintenance_id,
                m.resource_id,
                r.lab_id
            FROM maintenance m
            JOIN resources r
                ON m.resource_id = r.resource_id
            WHERE m.maintenance_id = ?
        """, (parsed_id,))

        ticket = fetch_one_dict(cursor)

        if not ticket:
            return error_response("Maintenance ticket not found.", 404)

        cursor.execute("""
            UPDATE maintenance
            SET status = 'COMPLETED',
                end_time = GETDATE(),
                notes = ?
            WHERE maintenance_id = ?
        """, (notes, parsed_id))

        cursor.execute("""
            UPDATE resources
            SET status = 'AVAILABLE'
            WHERE resource_id = ?
              AND NOT EXISTS (
                  SELECT 1
                  FROM maintenance m
                  WHERE m.resource_id = ?
                    AND m.maintenance_id <> ?
                    AND m.status IN ('SCHEDULED', 'ACTIVE')
              )
        """, (
            ticket["resource_id"],
            ticket["resource_id"],
            parsed_id
        ))

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Maintenance completed successfully."
        })

    except Exception as error:
        if conn:
            conn.rollback()
        print("COMPLETE MAINTENANCE ERROR:", error)
        return error_response("Unable to complete maintenance.", 500)

    finally:
        close_db(cursor, conn)


@app.post("/api/lab-assistant/maintenance/report")
@app.post("/api/admin/maintenance/report")
@app.post("/api/maintenance/report")
@app.post("/api/maintenance/issue")
def report_maintenance_issue():
    data = request.get_json(silent=True) or {}

    resource_id_text = str(data.get("resourceId") or "").strip()
    issue_type = str(data.get("issueType") or "Other").strip()
    description = str(data.get("description") or "").strip()
    priority = str(data.get("priority") or "Medium").strip()

    if not resource_id_text or not description:
        return error_response("Resource ID and description are required.", 400)

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        resource = find_resource_id(cursor, resource_id_text)

        if not resource:
            return error_response("Resource not found.", 404)

        if str(resource["status"]).upper() == "RESERVED":
            return error_response("Resource is currently reserved by the scheduling system.", 409)

        reason = f"{issue_type}: {description}"

        maintenance_id = insert_maintenance_ticket(
            cursor,
            resource["resource_id"],
            reason,
            None,
            "SCHEDULED"
        )

        cursor.execute(
            "UPDATE resources SET status = 'MAINTENANCE' WHERE resource_id = ?",
            (resource["resource_id"],)
        )

        conn.commit()

        return jsonify({
            "success": True,
            "ticket": {
                "id": f"MNT-{maintenance_id}",
                "maintenanceId": maintenance_id,
                "targetId": resource["asset_code"],
                "lab": resource["lab_name"],
                "issueType": issue_type,
                "issue": description,
                "status": "Pending",
                "priority": priority,
                "reportedBy": "Lab Assistant",
                "reportedAt": datetime.now().isoformat(),
                "assignedTo": "Hardware Support",
                "resolutionNotes": ""
            },
            "message": "Maintenance issue reported successfully.",
            "resourceStatusMessage": f"{resource['asset_code']} has been marked for maintenance."
        })

    except Exception as error:
        if conn:
            conn.rollback()
        print("REPORT MAINTENANCE ERROR:", error)
        return error_response("Unable to report maintenance issue.", 500)

    finally:
        close_db(cursor, conn)


# =========================================================
# BOOKING CONFLICT & CHECK
# =========================================================

def check_booking_conflict(cursor, lab_id, start_time, end_time, exclude_booking_id=None):
    """
    Checks for overlapping APPROVED bookings in SQL Server.
    Strict interval overlap condition:
        existing.start_time < requested.end_time AND existing.end_time > requested.start_time
    PENDING requests do NOT block other users from requesting the same lab/time.
    """
    query = """
        SELECT TOP 1
            booking_id,
            idempotency_key,
            status,
            start_time,
            end_time
        FROM bookings
        WHERE lab_id = ?
          AND status IN (
              'APPROVED',
              'CONFIRMED',
              'ACCEPTED'
          )
          AND start_time < ?
          AND end_time > ?
    """
    params = [lab_id, end_time, start_time]

    if exclude_booking_id:
        query += " AND booking_id <> ? "
        params.append(exclude_booking_id)

    query += " ORDER BY start_time"

    cursor.execute(query, params)
    return fetch_one_dict(cursor)


@app.get("/api/bookings/check-conflict")
@app.get("/api/bookings/check-availability")
def booking_conflict():
    lab_id = request.args.get("labId", type=int)
    start_time_text = request.args.get("startTime")
    end_time_text = request.args.get("endTime")

    if not lab_id or not start_time_text or not end_time_text:
        return error_response("labId, startTime and endTime are required.", 400)

    try:
        start_dt = datetime.fromisoformat(start_time_text)
        end_dt = datetime.fromisoformat(end_time_text)
    except ValueError:
        return error_response("Invalid date/time format.", 400)

    if end_dt <= start_dt:
        return jsonify({
            "success": True,
            "available": False,
            "message": "End time must be after start time."
        })

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT TOP 1
                l.lab_id,
                l.capacity,
                CASE
                    WHEN l.status = 'MAINTENANCE' THEN 'MAINTENANCE'
                    WHEN (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id) > 0 
                         AND (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id AND r.status = 'AVAILABLE') = 0 
                         THEN 'MAINTENANCE'
                    ELSE l.status
                END AS status,
                (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id) AS total_res,
                (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id AND r.status = 'AVAILABLE') AS avail_res,
                (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id AND r.status = 'MAINTENANCE') AS maint_res
            FROM labs l
            WHERE l.lab_id = ?
        """, (lab_id,))
        lab = fetch_one_dict(cursor)

        if not lab:
            return error_response("Lab not found.", 404)

        if str(lab["status"]).upper() != "ACTIVE":
            is_maint = str(lab["status"]).upper() == "MAINTENANCE"
            return jsonify({
                "success": True,
                "available": False,
                "message": "This lab is currently under maintenance." if is_maint else "This lab is currently unavailable."
            })

        conflict = check_booking_conflict(
            cursor,
            lab_id,
            start_dt,
            end_dt
        )

        if conflict:
            return jsonify({
                "success": True,
                "available": False,
                "message": "This lab already has a conflicting booking.",
                "bookingId": conflict["booking_id"],
                "requestId": conflict["idempotency_key"]
            })

        avail_count = lab["avail_res"] if lab["total_res"] > 0 else (lab["capacity"] or 0)
        maint_count = lab["maint_res"] or 0

        info_msg = "Laboratory available for selected time."
        if maint_count > 0:
            info_msg = f"Laboratory available ({avail_count} of {lab['total_res']} PCs working, {maint_count} in maintenance)."

        return jsonify({
            "success": True,
            "available": True,
            "message": info_msg,
            "availableCapacity": avail_count,
            "totalCapacity": lab["total_res"] or lab["capacity"] or 0,
            "maintenanceCount": maint_count
        })

    except Exception as error:
        print("CONFLICT CHECK ERROR:", error)
        return error_response("Unable to check booking availability.", 500)

    finally:
        close_db(cursor, conn)


# =========================================================
# CREATE BOOKING
# =========================================================

@app.post("/api/bookings")
def create_booking():
    data = request.get_json(silent=True) or {}

    user_id = data.get("userId") or data.get("user_id")
    lab_id = data.get("labId") or data.get("lab_id") or data.get("lab")
    purpose = str(data.get("purpose") or "").strip()
    start_time = data.get("startTime")
    end_time = data.get("endTime")
    student_count = data.get("studentCount", 1)

    # If date and separate time strings provided:
    date_val = data.get("date")
    if date_val and start_time and "T" not in str(start_time):
        start_time = f"{date_val}T{start_time}:00" if len(str(start_time)) == 5 else f"{date_val}T{start_time}"
    if date_val and end_time and "T" not in str(end_time):
        end_time = f"{date_val}T{end_time}:00" if len(str(end_time)) == 5 else f"{date_val}T{end_time}"

    if user_id is None or lab_id is None or not start_time or not end_time:
        return error_response("Missing required booking information.", 400)

    try:
        user_id = int(user_id)
        lab_id = int(lab_id)
        student_count = int(student_count)
        start_dt = datetime.fromisoformat(str(start_time))
        end_dt = datetime.fromisoformat(str(end_time))
    except (ValueError, TypeError) as parse_err:
        return error_response(f"Invalid booking values: {parse_err}", 400)

    if end_dt <= start_dt:
        return error_response("End time must be after start time.", 400)

    if student_count < 1:
        return error_response("Student count must be at least 1.", 400)

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 1. User exists
        cursor.execute("""
            SELECT TOP 1
                u.user_id,
                u.full_name,
                u.status,
                r.role_name
            FROM users u
            JOIN roles r
                ON u.role_id = r.role_id
            WHERE u.user_id = ?
        """, (user_id,))

        user = fetch_one_dict(cursor)

        if not user:
            return error_response("User not found.", 404)

        if str(user["status"]).upper() != "ACTIVE":
            return error_response("User account is not active.", 403)

        role = canonical_role(user["role_name"])

        # 2. Lab exists
        cursor.execute("""
            SELECT TOP 1
                l.lab_id,
                l.lab_name,
                l.capacity,
                CASE
                    WHEN l.status = 'MAINTENANCE' THEN 'MAINTENANCE'
                    WHEN (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id) > 0 
                         AND (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id AND r.status = 'AVAILABLE') = 0 
                         THEN 'MAINTENANCE'
                    ELSE l.status
                END AS status,
                (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id) AS total_res,
                (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id AND r.status = 'AVAILABLE') AS avail_res,
                (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id AND r.status = 'MAINTENANCE') AS maint_res
            FROM labs l
            WHERE l.lab_id = ?
        """, (lab_id,))

        lab = fetch_one_dict(cursor)

        if not lab:
            return error_response("Lab not found.", 404)

        effective_capacity = lab["avail_res"] if lab["total_res"] > 0 else int(lab["capacity"] or 0)

        # 3. Capacity check
        if student_count > effective_capacity:
            maint_count = lab["maint_res"] or 0
            if maint_count > 0:
                return error_response(
                    f"Requested {student_count} seats, but only {effective_capacity} PCs are currently available in this lab ({maint_count} in maintenance).",
                    400
                )
            return error_response(f"Number of students ({student_count}) exceeds lab capacity ({effective_capacity}).", 400)

        # 4. Lab status
        if str(lab["status"]).upper() != "ACTIVE":
            is_maint = str(lab["status"]).upper() == "MAINTENANCE"
            return error_response("This lab is currently under maintenance." if is_maint else "This lab is currently unavailable.", 409)

        # 5. Booking conflict
        conflict = check_booking_conflict(
            cursor,
            lab_id,
            start_dt,
            end_dt
        )

        if conflict:
            return jsonify({
                "success": False,
                "message": "This lab already has a conflicting booking.",
                "bookingId": conflict["booking_id"],
                "requestId": conflict["idempotency_key"]
            }), 409

        # 7. Priority
        priority = "HIGH" if role == "FACULTY" else "NORMAL"

        # 8. Request ID
        request_id = "REQ-" + uuid.uuid4().hex[:8].upper()

        # 9. Insert into bookings
        insert_query = """
            INSERT INTO bookings (
                user_id,
                lab_id,
                idempotency_key,
                purpose,
                start_time,
                end_time,
                priority,
                status,
                created_by
            )
            OUTPUT INSERTED.booking_id
            VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
        """

        cursor.execute(
            insert_query,
            (
                user_id,
                lab_id,
                request_id,
                purpose,
                start_dt,
                end_dt,
                priority,
                user_id
            )
        )

        inserted = cursor.fetchone()
        booking_id = inserted[0] if inserted else None

        # 10. Log status history
        cursor.execute("""
            INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, reason, changed_at)
            VALUES (?, NULL, 'PENDING', ?, 'Initial booking request submitted', GETDATE())
        """, (booking_id, user_id))

        # 11. Create user notification
        date_str = start_dt.strftime("%Y-%m-%d")
        time_str = f"{start_dt.strftime('%H:%M')} - {end_dt.strftime('%H:%M')}"
        create_notification(
            cursor,
            user_id,
            "Booking Request Submitted",
            f"Your booking request for {lab['lab_name']} on {date_str} ({time_str}) has been submitted and is pending approval.",
            "BOOKING"
        )

        # 11b. Notify Admin and Lab Assistant users
        cursor.execute("""
            SELECT u.user_id
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE UPPER(r.role_name) IN ('ADMIN', 'LAB_ASSISTANT', 'LAB ASSISTANT', 'LABASSISTANT')
              AND u.status = 'ACTIVE'
        """)
        staff_users = fetch_all_dict(cursor)
        for staff in staff_users:
            if staff["user_id"] != user_id:
                create_notification(
                    cursor,
                    staff["user_id"],
                    "New Booking Request",
                    f"{user['full_name']} submitted a request for {lab['lab_name']} on {date_str} ({time_str}).",
                    "BOOKING"
                )

        # 12. Audit log
        cursor.execute("""
            INSERT INTO audit_logs (user_id, booking_id, action, entity_type, entity_id, outcome, correlation_id, timestamp, details)
            VALUES (?, ?, 'CREATE_BOOKING', 'BOOKING', ?, 'SUCCESS', ?, GETDATE(), ?)
        """, (user_id, booking_id, booking_id, request_id, f"Booking created for {lab['lab_name']}"))

        conn.commit()

        # 13. Team A integration
        team_a_result = submit_to_team_a(
            request_id=request_id,
            role=role,
            start_time=start_dt.isoformat(),
            end_time=end_dt.isoformat()
        )

        return jsonify({
            "success": True,
            "message": "Booking request submitted successfully.",
            "requestId": request_id,
            "bookingId": booking_id,
            "status": "PENDING",
            "priority": priority,
            "teamA": team_a_result
        }), 201

    except Exception as error:
        if conn:
            conn.rollback()
        print("CREATE BOOKING ERROR:", error)
        return error_response(f"Booking could not be created: {error}", 500)

    finally:
        close_db(cursor, conn)


# =========================================================
# PENDING BOOKINGS (FOR LAB ASSISTANT & ADMIN)
# =========================================================

@app.get("/api/bookings/pending")
def get_pending_bookings():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        query = """
            SELECT
                b.booking_id,
                b.idempotency_key,
                b.purpose,
                b.start_time,
                b.end_time,
                b.priority,
                b.status,
                b.created_at,
                u.user_id,
                u.full_name,
                u.employee_student_id,
                u.email,
                u.department AS user_department,
                r.role_name,
                l.lab_id,
                l.lab_name,
                l.location AS lab_location,
                l.building,
                l.room_number
            FROM bookings b
            JOIN users u
                ON b.user_id = u.user_id
            JOIN roles r
                ON u.role_id = r.role_id
            JOIN labs l
                ON b.lab_id = l.lab_id
            WHERE b.status IN ('PENDING', 'SCHEDULING')
            ORDER BY b.created_at DESC
        """

        cursor.execute(query)
        rows = fetch_all_dict(cursor)

        result = []
        for b in rows:
            result.append({
                "bookingId": b["booking_id"],
                "id": b["idempotency_key"],
                "requestId": b["idempotency_key"],
                "userId": b["user_id"],
                "userName": b["full_name"],
                "user": b["full_name"],
                "userRole": frontend_role(b["role_name"]),
                "role": frontend_role(b["role_name"]),
                "userEmail": b["email"],
                "userEmployeeId": b["employee_student_id"],
                "userDepartment": b["user_department"],
                "labId": b["lab_id"],
                "labName": b["lab_name"],
                "lab": b["lab_name"],
                "labLocation": b["lab_location"] or f"{b['building'] or ''} {b['room_number'] or ''}".strip(),
                "date": format_date(b["start_time"]),
                "startTime": b["start_time"].strftime("%H:%M") if b.get("start_time") else "",
                "endTime": b["end_time"].strftime("%H:%M") if b.get("end_time") else "",
                "time": format_time_range(b["start_time"], b["end_time"]),
                "purpose": b["purpose"] or "",
                "priority": b["priority"] or "NORMAL",
                "status": str(b["status"]).upper(),
                "submittedAt": format_datetime(b["created_at"])
            })

        return jsonify({
            "success": True,
            "data": result,
            "count": len(result)
        }), 200

    except Exception as error:
        print("PENDING BOOKINGS ERROR:", error)
        return error_response("Unable to load pending bookings.", 500)

    finally:
        close_db(cursor, conn)


# =========================================================
# APPROVE & REJECT BOOKING
# =========================================================

def find_booking_by_identifier(cursor, identifier):
    """Finds a booking by integer booking_id or string idempotency_key/request_id"""
    identifier_str = str(identifier).strip()

    if identifier_str.isdigit():
        cursor.execute("""
            SELECT TOP 1
                b.booking_id,
                b.user_id,
                b.lab_id,
                b.idempotency_key,
                b.purpose,
                b.start_time,
                b.end_time,
                b.status,
                l.lab_name,
                u.full_name AS requester_name
            FROM bookings b
            JOIN labs l ON b.lab_id = l.lab_id
            JOIN users u ON b.user_id = u.user_id
            WHERE b.booking_id = ?
        """, (int(identifier_str),))
        row = fetch_one_dict(cursor)
        if row:
            return row

    cursor.execute("""
        SELECT TOP 1
            b.booking_id,
            b.user_id,
            b.lab_id,
            b.idempotency_key,
            b.purpose,
            b.start_time,
            b.end_time,
            b.status,
            l.lab_name,
            u.full_name AS requester_name
        FROM bookings b
        JOIN labs l ON b.lab_id = l.lab_id
        JOIN users u ON b.user_id = u.user_id
        WHERE b.idempotency_key = ? 
           OR b.idempotency_key = ?
           OR b.idempotency_key = ?
    """, (
        identifier_str,
        identifier_str if identifier_str.startswith("REQ-") else f"REQ-{identifier_str}",
        identifier_str.replace("REQ-", "")
    ))
    return fetch_one_dict(cursor)


@app.put("/api/bookings/<path:booking_identifier>/approve")
@app.post("/api/bookings/<path:booking_identifier>/approve")
def approve_booking(booking_identifier):
    data = request.get_json(silent=True) or {}
    approver_id = data.get("userId") or data.get("user_id")

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Fetch booking
        booking = find_booking_by_identifier(cursor, booking_identifier)

        if not booking:
            return error_response("Booking request not found.", 404)

        booking_id = booking["booking_id"]

        # 2. Check current status
        current_status = str(booking["status"]).upper()
        if current_status != "PENDING" and current_status != "SCHEDULING":
            return jsonify({
                "success": False,
                "message": f"This booking request has already been processed (Current status: {current_status})."
            }), 409

        # 3. Final lab availability re-check
        conflict = check_booking_conflict(
            cursor,
            booking["lab_id"],
            booking["start_time"],
            booking["end_time"],
            exclude_booking_id=booking_id
        )

        if conflict and str(conflict["status"]).upper() in {"APPROVED", "CONFIRMED", "ACCEPTED"}:
            return jsonify({
                "success": False,
                "message": f"{booking['lab_name']} is already approved for this time."
            }), 409

        # 4. Update booking to APPROVED
        cursor.execute("""
            UPDATE bookings
            SET status = 'APPROVED'
            WHERE booking_id = ?
        """, (booking_id,))

        # 5. Log status history
        cursor.execute("""
            INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, reason, changed_at)
            VALUES (?, 'PENDING', 'APPROVED', ?, 'Approved by Lab Assistant / Administrator', GETDATE())
        """, (booking_id, approver_id))

        # 6. Insert notification for student/faculty
        date_str = format_date(booking["start_time"])
        time_str = format_time_range(booking["start_time"], booking["end_time"])
        notif_msg = (
            f"Your booking request ({booking['idempotency_key']}) for {booking['lab_name']} "
            f"on {date_str} from {time_str} has been APPROVED."
        )
        create_notification(
            cursor,
            booking["user_id"],
            "Booking Approved",
            notif_msg,
            "SUCCESS"
        )

        # 7. Audit log
        cursor.execute("""
            INSERT INTO audit_logs (user_id, booking_id, action, entity_type, entity_id, outcome, correlation_id, timestamp, details)
            VALUES (?, ?, 'APPROVE_BOOKING', 'BOOKING', ?, 'SUCCESS', ?, GETDATE(), ?)
        """, (approver_id or booking["user_id"], booking_id, booking_id, booking["idempotency_key"], f"Approved booking {booking['idempotency_key']}"))

        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Booking request {booking['idempotency_key']} approved successfully.",
            "bookingId": booking_id,
            "requestId": booking["idempotency_key"],
            "status": "APPROVED"
        }), 200

    except Exception as error:
        if conn:
            conn.rollback()
        print("APPROVE BOOKING ERROR:", error)
        return error_response(f"Unable to approve booking: {error}", 500)

    finally:
        close_db(cursor, conn)


@app.put("/api/bookings/<path:booking_identifier>/reject")
@app.post("/api/bookings/<path:booking_identifier>/reject")
def reject_booking(booking_identifier):
    data = request.get_json(silent=True) or {}
    rejecter_id = data.get("userId") or data.get("user_id")
    reason = str(data.get("reason") or "Lab unavailable / Scheduling conflict").strip()

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Fetch booking
        booking = find_booking_by_identifier(cursor, booking_identifier)

        if not booking:
            return error_response("Booking request not found.", 404)

        booking_id = booking["booking_id"]

        # 2. Check current status
        current_status = str(booking["status"]).upper()
        if current_status != "PENDING" and current_status != "SCHEDULING":
            return jsonify({
                "success": False,
                "message": f"This booking request has already been processed (Current status: {current_status})."
            }), 409

        # 3. Update booking to REJECTED
        cursor.execute("""
            UPDATE bookings
            SET status = 'REJECTED'
            WHERE booking_id = ?
        """, (booking_id,))

        # 4. Log status history
        cursor.execute("""
            INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, reason, changed_at)
            VALUES (?, 'PENDING', 'REJECTED', ?, ?, GETDATE())
        """, (booking_id, rejecter_id, reason))

        # 5. Insert notification for student/faculty
        date_str = format_date(booking["start_time"])
        notif_msg = (
            f"Your booking request ({booking['idempotency_key']}) for {booking['lab_name']} on {date_str} "
            f"has been REJECTED. Reason: {reason}"
        )
        create_notification(
            cursor,
            booking["user_id"],
            "Booking Request Rejected",
            notif_msg,
            "WARNING"
        )

        # 6. Audit log
        cursor.execute("""
            INSERT INTO audit_logs (user_id, booking_id, action, entity_type, entity_id, outcome, correlation_id, timestamp, details)
            VALUES (?, ?, 'REJECT_BOOKING', 'BOOKING', ?, 'SUCCESS', ?, GETDATE(), ?)
        """, (rejecter_id or booking["user_id"], booking_id, booking_id, booking["idempotency_key"], f"Rejected booking: {reason}"))

        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Booking request {booking['idempotency_key']} rejected.",
            "bookingId": booking_id,
            "requestId": booking["idempotency_key"],
            "status": "REJECTED"
        }), 200

    except Exception as error:
        if conn:
            conn.rollback()
        print("REJECT BOOKING ERROR:", error)
        return error_response(f"Unable to reject booking: {error}", 500)

    finally:
        close_db(cursor, conn)


# =========================================================
# NOTIFICATIONS API
# =========================================================

@app.get("/api/notifications")
@app.get("/api/notifications/<int:user_id>")
def get_notifications(user_id=None):
    if user_id is None:
        user_id = request.args.get("userId", type=int)

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        query = """
            SELECT TOP 50
                notification_id,
                user_id,
                title,
                message,
                type,
                status,
                created_at,
                read_at
            FROM notifications
        """
        params = []

        if user_id is not None:
            query += " WHERE user_id = ? "
            params.append(user_id)

        query += " ORDER BY created_at DESC"

        cursor.execute(query, params)
        rows = fetch_all_dict(cursor)

        result = []
        for row in rows:
            result.append({
                "id": row["notification_id"],
                "notificationId": row["notification_id"],
                "userId": row["user_id"],
                "title": row["title"] or "Notification",
                "message": row["message"] or row["title"] or "",
                "type": row["type"] or "INFO",
                "status": row["status"] or "UNREAD",
                "isRead": str(row["status"]).upper() == "READ",
                "createdAt": format_datetime(row["created_at"]),
                "time": format_datetime(row["created_at"])
            })

        return jsonify({
            "success": True,
            "data": result,
            "count": len(result)
        }), 200

    except Exception as error:
        print("NOTIFICATIONS ERROR:", error)
        return error_response("Unable to load notifications.", 500)

    finally:
        close_db(cursor, conn)


@app.put("/api/notifications/<int:notification_id>/read")
@app.post("/api/notifications/<int:notification_id>/read")
def mark_notification_read(notification_id):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE notifications
            SET status = 'READ',
                read_at = GETDATE()
            WHERE notification_id = ?
        """, (notification_id,))

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Notification marked as read."
        }), 200

    except Exception as error:
        if conn:
            conn.rollback()
        print("MARK NOTIFICATION READ ERROR:", error)
        return error_response("Unable to mark notification as read.", 500)

    finally:
        close_db(cursor, conn)


# =========================================================
# MY BOOKINGS & ADMIN BOOKINGS
# =========================================================

def get_bookings_for_user(cursor, user_id=None):
    query = """
        SELECT
            b.booking_id,
            b.idempotency_key,
            b.purpose,
            b.start_time,
            b.end_time,
            b.priority,
            b.status,
            b.created_at,
            u.user_id,
            u.full_name,
            u.employee_student_id,
            u.email,
            r.role_name,
            l.lab_id,
            l.lab_name
        FROM bookings b
        JOIN users u
            ON b.user_id = u.user_id
        JOIN roles r
            ON u.role_id = r.role_id
        JOIN labs l
            ON b.lab_id = l.lab_id
    """

    params = []

    if user_id is not None:
        query += " WHERE b.user_id = ? "
        params.append(user_id)

    query += " ORDER BY b.created_at DESC"

    cursor.execute(query, params)
    return fetch_all_dict(cursor)


def map_booking_for_frontend(booking):
    return {
        "id": booking["idempotency_key"],
        "bookingId": booking["booking_id"],
        "userId": booking["user_id"],
        "user": booking["full_name"],
        "userEmployeeId": booking["employee_student_id"],
        "role": frontend_role(booking["role_name"]),
        "lab": booking["lab_name"],
        "labId": booking["lab_id"],
        "date": format_date(booking["start_time"]),
        "startTime": booking["start_time"].strftime("%H:%M") if booking.get("start_time") else "",
        "endTime": booking["end_time"].strftime("%H:%M") if booking.get("end_time") else "",
        "time": format_time_range(
            booking["start_time"],
            booking["end_time"]
        ),
        "submitted": format_datetime(booking["created_at"]),
        "submittedAt": format_datetime(booking["created_at"]),
        "status": str(booking["status"]),
        "priority": booking["priority"],
        "purpose": booking["purpose"],
        "engineStatus": "Processed by Team A / Admin",
        "allocatedResource": None
    }


@app.get("/api/bookings/my")
@app.get("/api/bookings/my/<int:user_id>")
def get_my_bookings(user_id=None):
    if user_id is None:
        user_id = request.args.get("userId", type=int)

    if user_id is None:
        return error_response("userId is required to fetch bookings.", 400)

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        bookings = get_bookings_for_user(cursor, user_id)

        all_items = []
        pending = []
        approved = []
        rejected = []

        for booking in bookings:
            item = map_booking_for_frontend(booking)
            all_items.append(item)
            st = str(booking["status"]).upper()

            if st in {"PENDING", "SCHEDULING"}:
                pending.append(item)
            elif st in {"APPROVED", "CONFIRMED", "ACCEPTED"}:
                approved.append(item)
            else:
                rejected.append(item)

        return jsonify({
            "success": True,
            "data": all_items,
            "pending": pending,
            "approved": approved,
            "rejected": rejected
        })

    except Exception as error:
        print("MY BOOKINGS ERROR:", error)
        return error_response("Unable to load your bookings.", 500)

    finally:
        close_db(cursor, conn)


@app.get("/api/admin/booking-requests")
def get_booking_requests():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()
        bookings = get_bookings_for_user(cursor)

        return jsonify([
            map_booking_for_frontend(booking)
            for booking in bookings
        ])

    except Exception as error:
        print("ADMIN BOOKINGS ERROR:", error)
        return error_response("Unable to load booking requests.", 500)

    finally:
        close_db(cursor, conn)


@app.get("/api/bookings/status/<request_id>")
def booking_status(request_id):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT TOP 1
                b.booking_id,
                b.idempotency_key,
                b.purpose,
                b.start_time,
                b.end_time,
                b.priority,
                b.status,
                l.lab_name
            FROM bookings b
            JOIN labs l
                ON b.lab_id = l.lab_id
            WHERE b.idempotency_key = ?
        """, (request_id,))

        booking = fetch_one_dict(cursor)

        if not booking:
            return error_response("Booking not found.", 404)

        team_a = get_team_a_status(request_id)

        return jsonify({
            "success": True,
            "id": booking["idempotency_key"],
            "bookingId": booking["booking_id"],
            "lab": booking["lab_name"],
            "date": format_date(booking["start_time"]),
            "time": format_time_range(
                booking["start_time"],
                booking["end_time"]
            ),
            "purpose": booking["purpose"],
            "currentStatus": booking["status"],
            "priority": booking["priority"],
            "teamA": team_a
        })

    except Exception as error:
        print("BOOKING STATUS ERROR:", error)
        return error_response("Unable to load booking status.", 500)

    finally:
        close_db(cursor, conn)


# =========================================================
# ADMIN DASHBOARD STATS, USERS, LOGS & REPORTS
# =========================================================

@app.get("/api/admin/dashboard-stats")
def dashboard_stats():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) AS value FROM labs")
        total_labs = fetch_one_dict(cursor)["value"]

        cursor.execute("""
            SELECT COUNT(*) AS value
            FROM labs l
            WHERE l.status = 'ACTIVE'
              AND NOT (
                  (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id) > 0
                  AND (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id AND r.status = 'AVAILABLE') = 0
              )
        """)
        available_labs = fetch_one_dict(cursor)["value"]

        cursor.execute("""
            SELECT COUNT(*) AS value
            FROM labs
            WHERE status IN ('BUSY', 'FULL')
        """)
        busy_labs = fetch_one_dict(cursor)["value"]

        cursor.execute("""
            SELECT COUNT(*) AS value
            FROM labs l
            WHERE l.status = 'MAINTENANCE'
               OR (
                  (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id) > 0
                  AND (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id AND r.status = 'AVAILABLE') = 0
              )
        """)
        maintenance_labs = fetch_one_dict(cursor)["value"]

        cursor.execute("""
            SELECT COUNT(*) AS value
            FROM bookings
            WHERE status IN ('PENDING', 'SCHEDULING')
        """)
        pending_requests = fetch_one_dict(cursor)["value"]

        cursor.execute("""
            SELECT COUNT(*) AS value
            FROM bookings
            WHERE status IN ('APPROVED', 'CONFIRMED', 'ACCEPTED')
        """)
        active_bookings = fetch_one_dict(cursor)["value"]

        cursor.execute("SELECT COUNT(*) AS value FROM resources")
        total_resources = fetch_one_dict(cursor)["value"]

        cursor.execute("""
            SELECT COUNT(*) AS value
            FROM maintenance
            WHERE status IN ('SCHEDULED', 'ACTIVE')
        """)
        maintenance_requests = fetch_one_dict(cursor)["value"]

        return jsonify({
            "totalLabs": total_labs,
            "availableLabs": available_labs,
            "busyLabs": busy_labs,
            "maintenanceLabs": maintenance_labs,
            "facultyReservedLabs": 0,
            "pendingRequests": pending_requests,
            "activeBookings": active_bookings,
            "totalResources": total_resources,
            "maintenanceRequests": maintenance_requests
        })

    except Exception as error:
        print("DASHBOARD STATS ERROR:", error)
        return error_response("Unable to load dashboard statistics.", 500)

    finally:
        close_db(cursor, conn)


@app.get("/api/admin/users")
def admin_users():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                u.user_id,
                u.email,
                u.full_name,
                u.employee_student_id,
                u.department,
                u.status,
                r.role_name,
                (
                    SELECT COUNT(*)
                    FROM bookings b
                    WHERE b.user_id = u.user_id
                ) AS bookings_count,
                (
                    SELECT MAX(us.login_time)
                    FROM user_sessions us
                    WHERE us.user_id = u.user_id
                ) AS last_login
            FROM users u
            JOIN roles r
                ON u.role_id = r.role_id
            ORDER BY u.user_id
        """)

        users = fetch_all_dict(cursor)

        result = []

        for user in users:
            result.append({
                "id": user["employee_student_id"] or str(user["user_id"]),
                "userId": user["user_id"],
                "name": user["full_name"],
                "email": user["email"],
                "role": frontend_role(user["role_name"]),
                "department": user["department"] or "",
                "status": str(user["status"]).title(),
                "lastLogin": format_datetime(user["last_login"]) or "Never",
                "bookingsCount": user["bookings_count"] or 0
            })

        return jsonify(result)

    except Exception as error:
        print("ADMIN USERS ERROR:", error)
        return error_response("Unable to load users.", 500)

    finally:
        close_db(cursor, conn)


@app.get("/api/admin/activity-logs")
def admin_activity_logs():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                a.audit_id,
                a.action,
                a.entity_type,
                a.entity_id,
                a.outcome,
                a.correlation_id,
                a.[timestamp] AS log_time,
                a.details,
                u.full_name AS actor,
                r.asset_code,
                l.lab_name
            FROM audit_logs a
            LEFT JOIN users u
                ON a.user_id = u.user_id
            LEFT JOIN resources r
                ON a.resource_id = r.resource_id
            LEFT JOIN labs l
                ON r.lab_id = l.lab_id
            ORDER BY a.[timestamp] DESC, a.audit_id DESC
        """)

        logs = fetch_all_dict(cursor)

        result = []

        for log in logs:
            result.append({
                "id": log["audit_id"],
                "time": format_datetime(log["log_time"]),
                "actor": log["actor"] or "System",
                "role": log["entity_type"] or "System",
                "module": log["entity_type"] or "System",
                "action": log["action"] or "System Event",
                "resource": (
                    log["asset_code"]
                    or log["lab_name"]
                    or log["correlation_id"]
                    or "-"
                ),
                "result": log["outcome"] or "INFO",
                "details": log["details"] or ""
            })

        return jsonify(result)

    except Exception as error:
        print("ACTIVITY LOG ERROR:", error)
        return error_response("Unable to load activity logs.", 500)

    finally:
        close_db(cursor, conn)


@app.get("/api/admin/reports")
def admin_reports():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                l.lab_id,
                l.lab_name,
                l.capacity,
                COUNT(CASE
                    WHEN b.status IN ('APPROVED', 'CONFIRMED', 'ACCEPTED')
                    THEN 1
                END) AS approved_bookings
            FROM labs l
            LEFT JOIN bookings b
                ON l.lab_id = b.lab_id
            GROUP BY l.lab_id, l.lab_name, l.capacity
            ORDER BY l.lab_id
        """)

        utilization_rows = fetch_all_dict(cursor)

        lab_utilization = []

        for row in utilization_rows:
            utilization = min(
                100,
                int((row["approved_bookings"] or 0) * 10)
            )

            lab_utilization.append({
                "lab": row["lab_name"],
                "name": row["lab_name"],
                "utilization": utilization,
                "activeHours": round(utilization / 10, 1),
                "color": "#64748b"
            })

        cursor.execute("""
            SELECT
                COUNT(*) AS total_submitted,
                SUM(CASE WHEN status IN ('APPROVED','CONFIRMED','ACCEPTED') THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
            FROM bookings
        """)

        booking_stats = fetch_one_dict(cursor)

        cursor.execute("""
            SELECT
                COUNT(*) AS total_tickets,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status IN ('SCHEDULED','ACTIVE') THEN 1 ELSE 0 END) AS under_maintenance
            FROM maintenance
        """)

        maintenance_stats = fetch_one_dict(cursor)

        cursor.execute("""
            SELECT
                DATEPART(HOUR, start_time) AS hour_value,
                COUNT(*) AS total
            FROM bookings
            GROUP BY DATEPART(HOUR, start_time)
            ORDER BY hour_value
        """)

        peak_rows = fetch_all_dict(cursor)

        peak_hours = [
            {
                "slot": f"{row['hour_value']:02d}:00",
                "load": min(100, int(row["total"] or 0) * 10)
            }
            for row in peak_rows
        ]

        return jsonify({
            "labUtilization": lab_utilization,
            "bookingStats": {
                "totalSubmitted": booking_stats["total_submitted"] or 0,
                "approved": booking_stats["approved"] or 0,
                "alternativeSuggested": 0,
                "rejected": booking_stats["rejected"] or 0,
                "pending": booking_stats["pending"] or 0
            },
            "roleComparison": {
                "facultyRequests": 0,
                "facultyPercentage": 0,
                "studentRequests": 0,
                "studentPercentage": 0
            },
            "maintenanceMetrics": {
                "totalTickets": maintenance_stats["total_tickets"] or 0,
                "resolvedThisMonth": maintenance_stats["completed"] or 0,
                "underMaintenance": maintenance_stats["under_maintenance"] or 0,
                "meanTimeToRepairHours": 0
            },
            "peakHours": peak_hours
        })

    except Exception as error:
        print("REPORTS ERROR:", error)
        return error_response("Unable to load reports.", 500)

    finally:
        close_db(cursor, conn)


# =========================================================
# LAB ASSISTANT STATS & SCHEDULE
# =========================================================

@app.get("/api/lab-assistant/stats")
def lab_assistant_stats():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) AS value FROM resources")
        total = fetch_one_dict(cursor)["value"]

        cursor.execute(
            "SELECT COUNT(*) AS value FROM resources WHERE status = 'AVAILABLE'"
        )
        available = fetch_one_dict(cursor)["value"]

        cursor.execute(
            "SELECT COUNT(*) AS value FROM resources WHERE status = 'OCCUPIED'"
        )
        occupied = fetch_one_dict(cursor)["value"]

        cursor.execute(
            "SELECT COUNT(*) AS value FROM resources WHERE status = 'MAINTENANCE'"
        )
        maintenance = fetch_one_dict(cursor)["value"]

        cursor.execute(
            "SELECT COUNT(*) AS value FROM resources WHERE status = 'RESERVED'"
        )
        reserved = fetch_one_dict(cursor)["value"]

        cursor.execute(
            "SELECT COUNT(*) AS value FROM resources WHERE status = 'OFFLINE'"
        )
        offline = fetch_one_dict(cursor)["value"]

        return jsonify({
            "totalResources": total,
            "available": available,
            "occupied": occupied,
            "maintenance": maintenance,
            "reserved": reserved,
            "offline": offline
        })

    except Exception as error:
        print("LAB ASSISTANT STATS ERROR:", error)
        return error_response("Unable to load resource statistics.", 500)

    finally:
        close_db(cursor, conn)


@app.get("/api/lab-assistant/resources/<path:resource_id>/status")
def lab_assistant_resource_status(resource_id):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        resource = find_resource_id(cursor, resource_id)

        if not resource:
            return error_response(
                f"Resource {resource_id} not found.",
                404
            )

        return jsonify({
            "success": True,
            "resource": {
                "id": resource["asset_code"],
                "lab": resource["lab_name"],
                "status": display_resource_status(resource["status"])
            }
        })

    except Exception as error:
        print("RESOURCE STATUS ERROR:", error)
        return error_response("Unable to load resource status.", 500)

    finally:
        close_db(cursor, conn)


@app.get("/api/lab-assistant/schedule/today")
def todays_schedule():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                b.booking_id,
                b.start_time,
                b.end_time,
                b.status,
                b.purpose,
                b.priority,
                u.full_name,
                r.role_name,
                l.lab_name
            FROM bookings b
            JOIN users u
                ON b.user_id = u.user_id
            JOIN roles r
                ON u.role_id = r.role_id
            JOIN labs l
                ON b.lab_id = l.lab_id
            WHERE CAST(b.start_time AS DATE) = CAST(GETDATE() AS DATE)
              AND b.status IN ('APPROVED', 'CONFIRMED', 'ACCEPTED')
            ORDER BY b.start_time
        """)

        rows = fetch_all_dict(cursor)

        return jsonify([
            {
                "id": row["booking_id"],
                "time": format_time_range(
                    row["start_time"],
                    row["end_time"]
                ),
                "lab": row["lab_name"],
                "bookingType": (
                    "Faculty Reservation"
                    if canonical_role(row["role_name"]) == "FACULTY"
                    else "Student Booking"
                ),
                "status": str(row["status"]).title(),
                "user": row["full_name"],
                "purpose": row["purpose"],
                "isFaculty": canonical_role(row["role_name"]) == "FACULTY",
                "priority": row["priority"],
                "facultyLocked": canonical_role(row["role_name"]) == "FACULTY",
                "lockNotice": (
                    "FACULTY RESERVED: High-priority booking."
                    if canonical_role(row["role_name"]) == "FACULTY"
                    else None
                )
            }
            for row in rows
        ])

    except Exception as error:
        print("TODAY SCHEDULE ERROR:", error)
        return error_response("Unable to load today's schedule.", 500)

    finally:
        close_db(cursor, conn)


# =========================================================
# RESOURCE RECOMMENDATION
# =========================================================

@app.get("/api/recommendation")
@app.get("/api/recommendations")
def recommendation():
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT TOP 1
                l.lab_id,
                l.lab_name,
                l.capacity
            FROM labs l
            WHERE l.status = 'ACTIVE'
              AND NOT (
                  (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id) > 0
                  AND (SELECT COUNT(*) FROM resources r WHERE r.lab_id = l.lab_id AND r.status = 'AVAILABLE') = 0
              )
            ORDER BY l.lab_id
        """)

        lab = fetch_one_dict(cursor)

        if not lab:
            return jsonify({
                "success": False,
                "suggestedLab": None,
                "reason": "No available laboratory was found."
            })

        return jsonify({
            "success": True,
            "suggestedLab": lab["lab_name"],
            "reason": "First available SQL Server lab returned as the current recommendation."
        })

    except Exception as error:
        print("RECOMMENDATION ERROR:", error)
        return error_response("Unable to generate a lab recommendation.", 500)

    finally:
        close_db(cursor, conn)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
        use_reloader=False
    )
