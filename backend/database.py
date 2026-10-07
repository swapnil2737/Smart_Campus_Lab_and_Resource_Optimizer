import os
import pyodbc

# =========================================================
# CENTRAL SQL SERVER DATABASE CONFIGURATION
# =========================================================

DB_SERVER = os.getenv("DB_SERVER", r".\SQLEXPRESS")
DB_NAME = os.getenv("DB_NAME", "smart_campus_lab")
DB_USER = os.getenv("DB_USER", None)
DB_PASSWORD = os.getenv("DB_PASSWORD", None)
DB_DRIVER = os.getenv("DB_DRIVER", None)


def get_available_driver():
    """Find the best available SQL Server ODBC driver installed on the system."""
    if DB_DRIVER:
        return DB_DRIVER

    installed = pyodbc.drivers()
    preferred_drivers = [
        "ODBC Driver 18 for SQL Server",
        "ODBC Driver 17 for SQL Server",
        "ODBC Driver 13 for SQL Server",
        "SQL Server Native Client 11.0",
        "SQL Server"
    ]

    for driver in preferred_drivers:
        if driver in installed:
            return driver

    # Fallback to standard 18 if not detectable
    return "ODBC Driver 18 for SQL Server"


def build_connection_string():
    driver = get_available_driver()
    
    if DB_USER and DB_PASSWORD:
        conn_str = (
            f"DRIVER={{{driver}}};"
            f"SERVER={DB_SERVER};"
            f"DATABASE={DB_NAME};"
            f"UID={DB_USER};"
            f"PWD={DB_PASSWORD};"
            "TrustServerCertificate=yes;"
        )
    else:
        conn_str = (
            f"DRIVER={{{driver}}};"
            f"SERVER={DB_SERVER};"
            f"DATABASE={DB_NAME};"
            "Trusted_Connection=yes;"
            "TrustServerCertificate=yes;"
        )
    return conn_str


def get_connection(timeout=10):
    """Create a new SQL Server database connection."""
    conn_str = build_connection_string()
    return pyodbc.connect(conn_str, timeout=timeout)


def get_db_connection(timeout=10):
    """Alias for get_connection()."""
    return get_connection(timeout=timeout)


def test_connection():
    """Verify database connectivity and return status metadata."""
    conn = None
    cursor = None
    try:
        conn = get_connection(timeout=5)
        cursor = conn.cursor()
        cursor.execute("SELECT DB_NAME() AS db_name, @@SERVERNAME AS server_name, @@VERSION AS version")
        row = cursor.fetchone()
        db_name = row[0] if row else DB_NAME
        server_name = row[1] if row else DB_SERVER
        
        cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'")
        table_count = cursor.fetchone()[0]

        return {
            "success": True,
            "database": db_name,
            "server": server_name,
            "tables_count": table_count,
            "driver": get_available_driver(),
            "message": "Connected to SQL Server successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "database": DB_NAME,
            "server": DB_SERVER,
            "driver": get_available_driver(),
            "message": str(e)
        }
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if conn:
            try:
                conn.close()
            except Exception:
                pass


# =========================================================
# HELPER FUNCTIONS FOR DICTIONARY ROWS & CLEANUP
# =========================================================

def fetch_one_dict(cursor):
    """Fetch one row from cursor as a dictionary."""
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))


def fetch_all_dict(cursor):
    """Fetch all rows from cursor as a list of dictionaries."""
    rows = cursor.fetchall()
    if not rows:
        return []
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in rows]


def close_db(cursor=None, conn=None):
    """Safely close cursor and connection."""
    if cursor:
        try:
            cursor.close()
        except Exception:
            pass
    if conn:
        try:
            conn.close()
        except Exception:
            pass


# CLI Test
if __name__ == "__main__":
    print("Testing SQL Server database connection...")
    result = test_connection()
    if result["success"]:
        print(f"[OK] SQL Server connected successfully!")
        print(f"     Database: {result['database']}")
        print(f"     Server:   {result['server']}")
        print(f"     Driver:   {result['driver']}")
        print(f"     Tables:   {result['tables_count']}")
    else:
        print(f"[ERROR] Database connection failed!")
        print(f"        Error: {result['message']}")