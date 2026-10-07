import os
import pyodbc


# CHANGED FOR SQL SERVER / PYODBC
# Uses Windows authentication with SQL Server Express.
DB_SERVER = os.getenv("SMART_CAMPUS_DB_SERVER", r".\SQLEXPRESS")
DB_NAME = os.getenv("SMART_CAMPUS_DB_NAME", "smart_campus_lab")

# CHANGED FOR SQL SERVER / PYODBC
# Prefer ODBC Driver 18, then 17.
def _get_driver():
    available = [driver.strip() for driver in pyodbc.drivers()]
    for driver in ("ODBC Driver 18 for SQL Server", "ODBC Driver 17 for SQL Server"):
        if driver in available:
            return driver
    raise RuntimeError(
        "SQL Server ODBC driver not found. Install ODBC Driver 18 or 17 for SQL Server."
    )


def get_connection():
    """Return a new SQL Server connection."""
    driver = _get_driver()

    connection_string = (
        f"DRIVER={{{driver}}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_NAME};"
        "Trusted_Connection=yes;"
        "TrustServerCertificate=yes;"
    )

    return pyodbc.connect(connection_string, timeout=10)


if __name__ == "__main__":
    try:
        connection = get_connection()
        print("Database connected successfully!")
        connection.close()
    except Exception as error:
        print("Database connection failed!")
        print(error)
