/*
====================================================================
SMART CAMPUS LAB - SQL SERVER / SSMS VERSION
====================================================================
Converted from the supplied MySQL script.

IMPORTANT CHANGES:
1. AUTO_INCREMENT -> IDENTITY(1,1)
2. BOOLEAN -> BIT
3. TRUE/FALSE -> 1/0
4. MySQL FOREIGN_KEY_CHECKS -> SQL Server NOCHECK/CHECK
5. MySQL TIMESTAMP -> DATETIME2
6. Removed ON UPDATE CURRENT_TIMESTAMP because SQL Server does not
   support it as a column definition.
7. LPAD() -> RIGHT() + CONVERT()
8. FIELD() -> CASE
9. Removed ORDER BY from INSERT...SELECT statements.
10. 'users.name' -> 'users.full_name'
11. scheduling_decisions.booking_id is nullable because the supplied
    seed data inserts NULL into booking_id.
====================================================================
*/


-- SQL SERVER / SSMS
-- Make sure the database already exists. If needed, create it first:
-- CREATE DATABASE smart_campus_lab;
-- GO
USE smart_campus_lab;
GO

-- MySQL: SET FOREIGN_KEY_CHECKS = 0;
-- SQL Server equivalent:
EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';
GO

DROP TABLE IF EXISTS api_request_logs;
DROP TABLE IF EXISTS transaction_logs;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS route_results;
DROP TABLE IF EXISTS scheduling_decisions;
DROP TABLE IF EXISTS resource_status_history;
DROP TABLE IF EXISTS booking_status_history;
DROP TABLE IF EXISTS maintenance;
DROP TABLE IF EXISTS schedule_resources;
DROP TABLE IF EXISTS weekly_schedules;
DROP TABLE IF EXISTS batch_students;
DROP TABLE IF EXISTS batches;
DROP TABLE IF EXISTS booking_resources;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS resource_types;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS labs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

-- MySQL: SET FOREIGN_KEY_CHECKS = 1;
-- SQL Server equivalent:
EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';
GO


CREATE TABLE roles (
      role_id INT IDENTITY(1,1) PRIMARY KEY,
      role_name VARCHAR(50) NOT NULL UNIQUE,
       description VARCHAR(255),
       is_active BIT DEFAULT 1
);


CREATE TABLE users
(
    user_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- SQL Server IDENTITY

    role_id INT NOT NULL,

    email VARCHAR(150) NOT NULL UNIQUE,

    full_name VARCHAR(150) NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    employee_student_id VARCHAR(50) UNIQUE,

    department VARCHAR(100),

    phone VARCHAR(20),

    status VARCHAR(20) DEFAULT 'ACTIVE',

    created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key
    FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
);


CREATE TABLE labs (
    lab_id INT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY
    lab_name VARCHAR(100) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    building VARCHAR(100),
    floor VARCHAR(20),
    room_number VARCHAR(20),
    location VARCHAR(255),
    capacity INT,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);


CREATE TABLE resource_types (
    resource_type_id INT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY
    type VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    unit_type VARCHAR(20)
);


CREATE TABLE resources (
    resource_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY
    lab_id INT NOT NULL,
    resource_type_id INT NOT NULL,
    asset_code VARCHAR(100) NOT NULL UNIQUE,
    resource_name VARCHAR(150),
    serial_number VARCHAR(150) UNIQUE,
    capacity INT,
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    version INT DEFAULT 1,
    created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP -- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,

    FOREIGN KEY (lab_id)
        REFERENCES labs(lab_id),

    FOREIGN KEY (resource_type_id)
        REFERENCES resource_types(resource_type_id)
);


CREATE TABLE inventory (
    inventory_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY
    resource_id BIGINT NOT NULL UNIQUE,
    quantity_total INT DEFAULT 0,
    quantity_available INT DEFAULT 0,
    quantity_reserved INT DEFAULT 0,
    quantity_maintenance INT DEFAULT 0,
    min_threshold INT DEFAULT 0,
    version INT DEFAULT 1,
    updated_at DATETIME2 DEFAULT CURRENT_TIMESTAMP -- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,

    FOREIGN KEY (resource_id)
        REFERENCES resources(resource_id)
);


CREATE TABLE batches (
    batch_id INT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY
    batch_name VARCHAR(20) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    semester VARCHAR(30),
    student_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);


CREATE TABLE batch_students (
    batch_student_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY
    batch_id INT NOT NULL,
    user_id BIGINT NOT NULL,
    student_position INT NOT NULL,

    UNIQUE (batch_id, user_id),
    UNIQUE (batch_id, student_position),

    FOREIGN KEY (batch_id)
        REFERENCES batches(batch_id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


CREATE TABLE bookings (
    booking_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY
    user_id BIGINT NOT NULL,
    lab_id INT NOT NULL,
    idempotency_key VARCHAR(100) UNIQUE,
    purpose VARCHAR(255),
    start_time DATETIME2 NOT NULL, -- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,
    end_time DATETIME2 NOT NULL, -- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,
    priority VARCHAR(20) DEFAULT 'NORMAL',
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP, -- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,
    created_by BIGINT,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    FOREIGN KEY (lab_id)
        REFERENCES labs(lab_id),

    FOREIGN KEY (created_by)
        REFERENCES users(user_id)
);


CREATE TABLE booking_resources (
    booking_resource_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY,
    booking_id BIGINT NOT NULL,
    resource_id BIGINT NOT NULL,
    quantity INT DEFAULT 1,
    start_time DATETIME2 NOT NULL, -- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,
    end_time DATETIME2 NOT NULL, -- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,
    resource_version INT,

    FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE,

    FOREIGN KEY (resource_id)
        REFERENCES resources(resource_id),

    UNIQUE (booking_id, resource_id)
);


CREATE TABLE weekly_schedules (
    schedule_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY,

    batch_id INT NOT NULL,

    day_of_week VARCHAR(15) NOT NULL,

    subject_code VARCHAR(50) NOT NULL,

    subject_name VARCHAR(150) NOT NULL,

    start_time TIME NOT NULL,

    end_time TIME NOT NULL,

    lab_id INT NOT NULL,

    semester_start DATE NOT NULL,

    semester_end DATE NOT NULL,

    status VARCHAR(20) DEFAULT 'ACTIVE',

    FOREIGN KEY (batch_id)
        REFERENCES batches(batch_id),

    FOREIGN KEY (lab_id)
        REFERENCES labs(lab_id)
);


CREATE TABLE schedule_resources (
    schedule_resource_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY,

    schedule_id BIGINT NOT NULL,

    resource_id BIGINT NOT NULL,

    student_position INT NOT NULL,

    FOREIGN KEY (schedule_id)
        REFERENCES weekly_schedules(schedule_id)
        ON DELETE CASCADE,

    FOREIGN KEY (resource_id)
        REFERENCES resources(resource_id),

    UNIQUE (schedule_id, resource_id),

    UNIQUE (schedule_id, student_position)
);


CREATE TABLE maintenance (
    maintenance_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY,
    resource_id BIGINT NOT NULL,
    created_by BIGINT,
    start_time DATETIME2 NOT NULL, -- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,
    end_time DATETIME2, -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2,
    reason VARCHAR(255),
    status VARCHAR(20) DEFAULT 'SCHEDULED',
    cost DECIMAL(12,2) DEFAULT 0.00,
    notes TEXT,

    FOREIGN KEY (resource_id)
        REFERENCES resources(resource_id),

    FOREIGN KEY (created_by)
        REFERENCES users(user_id)
);


CREATE TABLE booking_status_history (
    status_history_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY,
    booking_id BIGINT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by BIGINT,
    reason VARCHAR(255),
    changed_at DATETIME2 DEFAULT CURRENT_TIMESTAMP, -- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,

    FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE,

    FOREIGN KEY (changed_by)
        REFERENCES users(user_id)
);


CREATE TABLE resource_status_history (
    status_history_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY,
    resource_id BIGINT NOT NULL,
    booking_id BIGINT,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by BIGINT,
    reason VARCHAR(255),
    changed_at DATETIME2 DEFAULT CURRENT_TIMESTAMP, -- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,

    FOREIGN KEY (resource_id)
        REFERENCES resources(resource_id)
        ON DELETE CASCADE,

    FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE,

    FOREIGN KEY (changed_by)
        REFERENCES users(user_id)
);


CREATE TABLE notifications (
    notification_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY,
    user_id BIGINT NOT NULL,
    title VARCHAR(200),
    message TEXT,
    type VARCHAR(30),
    status VARCHAR(20) DEFAULT 'UNREAD',
    created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP, -- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,
    read_at DATETIME2, -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


CREATE TABLE user_sessions (
    session_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY,
    user_id BIGINT NOT NULL,
    login_time DATETIME2 DEFAULT CURRENT_TIMESTAMP, -- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,
    logout_time DATETIME2, -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    status VARCHAR(20) DEFAULT 'ACTIVE',

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


CREATE TABLE audit_logs (
    audit_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY,
    user_id BIGINT,
    booking_id BIGINT,
    resource_id BIGINT,
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id BIGINT,
    outcome VARCHAR(20),
    correlation_id VARCHAR(100),
    timestamp DATETIME2 DEFAULT CURRENT_TIMESTAMP, -- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,
    details TEXT,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id),

    FOREIGN KEY (resource_id)
        REFERENCES resources(resource_id)
);


CREATE TABLE transaction_logs (
    transaction_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY,
    booking_id BIGINT,
    correlation_id VARCHAR(100),
    transaction_reference VARCHAR(50),
    start_time DATETIME2, -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2,
    commit_time DATETIME2,-- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2,
    latency_ms DECIMAL(12,3),
    outcome VARCHAR(20),
    failure_reason VARCHAR(255),
    isolation_level VARCHAR(30),

    FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
);


CREATE TABLE api_request_logs (
    request_log_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY,
    correlation_id VARCHAR(100),
    user_id BIGINT,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    request_time DATETIME2, -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2,
    response_time DATETIME2, -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2,
    latency_ms DECIMAL(12,3),
    status_code INT,
    outcome VARCHAR(20),
    failure_category VARCHAR(80),

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
);


CREATE TABLE scheduling_decisions (
    decision_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY,
    booking_id BIGINT NOT NULL,
    resource_id BIGINT NOT NULL,
    scheduled_start DATETIME2, -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2,
    scheduled_end DATETIME2, -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2,
    expected_resource_version INT,
    priority VARCHAR(20),
    queue_position INT,
    decision_status VARCHAR(20),
    created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP -- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,

    FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id),

    FOREIGN KEY (resource_id)
        REFERENCES resources(resource_id)
);


CREATE TABLE route_results (
    route_id BIGINT IDENTITY(1,1) PRIMARY KEY, -- CHANGED: AUTO_INCREMENT -> IDENTITY,
    booking_id BIGINT NOT NULL UNIQUE,
    source_location VARCHAR(255),
    destination_location VARCHAR(255),
    route_distance DECIMAL(10,2),
    route_duration_minutes INT,
    graph_version INT,
    route_status VARCHAR(20),
    created_at DATETIME2 DEFAULT CURRENT_TIMESTAMP ,-- CHANGED: MySQL DATETIME2 -- CHANGED: MySQL TIMESTAMP -> SQL Server DATETIME2 -> SQL Server DATETIME2,

    FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE
);


INSERT INTO roles
(
    
    role_name,
    description
)
VALUES
( 'STUDENT', 'Student who uses laboratory resources'),
( 'FACULTY', 'Faculty member'),
( 'LAB_ASSISTANT', 'Lab assistant'),
( 'ADMINISTRATOR', 'System administrator');


INSERT INTO labs
(
    lab_name,
    department,
    building,
    floor,
    room_number,
    location,
    capacity,
    status
)
VALUES
('Apple Lab', 'CSE', 'CSE Building', '1', 'C101', 'CSE Building', 30, 'ACTIVE'),
('AIML Lab', 'AIML', 'AIML Building', '1', 'A101', 'AIML Building', 30, 'ACTIVE'),
('L1', 'CSE', 'CSE Building', '1', 'C103', 'CSE Building', 30, 'ACTIVE'),
('L2', 'CSE', 'CSE Building', '1', 'C104', 'CSE Building', 30, 'ACTIVE'),
('L4', 'CSE', 'CSE Building', '2', 'C201', 'CSE Building', 30, 'ACTIVE'),
('L5', 'CSE', 'CSE Building', '2', 'C202', 'CSE Building', 30, 'ACTIVE'),
('Project Lab', 'CSE', 'CSE Building', '2', 'C203', 'CSE Building', 30, 'ACTIVE'),
('PG Lab', 'CSE', 'CSE Building', '3', 'C301', 'CSE Building', 30, 'ACTIVE'),
('ARVR Lab', 'CSE', 'CSE Building', '3', 'C303', 'CSE Building', 30, 'ACTIVE'),
('Cloud Computing Lab', 'CSE', 'CSE Building', '3', 'C304', 'CSE Building', 30, 'ACTIVE'),
('IL7', 'CSIT', 'CSIT Building', '1', 'I101', 'CSIT Building', 30, 'ACTIVE'),
('IL8', 'CSIT', 'CSIT Building', '1', 'I102', 'CSIT Building', 30, 'ACTIVE'),
('AIML1', 'AIML', 'AIML Building', '1', 'A102', 'AIML Building', 30, 'ACTIVE'),
('AIML2', 'AIML', 'AIML Building', '1', 'A103', 'AIML Building', 30, 'ACTIVE');


INSERT INTO resource_types
(
    
    type,
    description,
    unit_type
)
VALUES
( 'PC', 'Desktop computer', 'UNIT'),
( 'PROJECTOR', 'Projector', 'UNIT'),
( 'PRINTER', 'Printer', 'UNIT');
/* =========================================================
   1. INSERT USERS - STUDENTS
   ========================================================= */

INSERT INTO users
(
    role_id,
    email,
    full_name,
    password_hash,
    employee_student_id,
    department,
    phone,
    status
)
VALUES
(1, 'aarav.patil@rit.edu', 'Aarav Patil', 'student123', 'CSE001', 'CSE', '9000000001', 'ACTIVE'),
(1, 'aishwarya.joshi@rit.edu', 'Nisha Joshi', 'student123', 'CSE002', 'CSE', '9000000002', 'ACTIVE'),
(1, 'aditya.shinde@rit.edu', 'Aditya Shinde', 'student123', 'CSE003', 'CSE', '9000000003', 'ACTIVE'),
(1, 'ananya.kulkarni@rit.edu', 'Ananya Kulkarni', 'student123', 'CSE004', 'CSE', '9000000004', 'ACTIVE'),
(1, 'atharva.jadhav@rit.edu', 'Atharva Jadhav', 'student123', 'CSE005', 'CSE', '9000000005', 'ACTIVE'),
(1, 'bhakti.patil@rit.edu', 'Bhakti Patil', 'student123', 'CSE006', 'CSE', '9000000006', 'ACTIVE'),
(1, 'chetan.more@rit.edu', 'Chetan More', 'student123', 'CSE007', 'CSE', '9000000007', 'ACTIVE'),
(1, 'devika.pawar@rit.edu', 'Devika Pawar', 'student123', 'CSE008', 'CSE', '9000000008', 'ACTIVE'),
(1, 'ishaan.deshmukh@rit.edu', 'Ishaan Deshmukh', 'student123', 'CSE009', 'CSE', '9000000009', 'ACTIVE'),
(1, 'kavya.chavan@rit.edu', 'Kavya Chavan', 'student123', 'CSE010', 'CSE', '9000000010', 'ACTIVE'),

(1, 'manas.patil@rit.edu', 'Manas Patil', 'student123', 'CSE011', 'CSE', '9000000011', 'ACTIVE'),
(1, 'meera.kadam@rit.edu', 'Meera Kadam', 'student123', 'CSE012', 'CSE', '9000000012', 'ACTIVE'),
(1, 'omkar.sawant@rit.edu', 'Omkar Sawant', 'student123', 'CSE013', 'CSE', '9000000013', 'ACTIVE'),
(1, 'pranav.bhosale@rit.edu', 'Pranav Bhosale', 'student123', 'CSE014', 'CSE', '9000000014', 'ACTIVE'),
(1, 'riya.shinde@rit.edu', 'Riya Shinde', 'student123', 'CSE015', 'CSE', '9000000015', 'ACTIVE'),
(1, 'sahil.patil@rit.edu', 'Sahil Patil', 'student123', 'CSE016', 'CSE', '9000000016', 'ACTIVE'),
(1, 'sneha.more@rit.edu', 'Sneha More', 'student123', 'CSE017', 'CSE', '9000000017', 'ACTIVE'),
(1, 'tanvi.jadhav@rit.edu', 'Tanvi Jadhav', 'student123', 'CSE018', 'CSE', '9000000018', 'ACTIVE'),
(1, 'vedant.patil@rit.edu', 'Vedant Patil', 'student123', 'CSE019', 'CSE', '9000000019', 'ACTIVE'),
(1, 'yash.kulkarni@rit.edu', 'Yash Kulkarni', 'student123', 'CSE020', 'CSE', '9000000020', 'ACTIVE'),

(1, 'akshay.patil@rit.edu', 'Akshay Patil', 'student123', 'CSE021', 'CSE', '9000000021', 'ACTIVE'),
(1, 'amruta.shinde@rit.edu', 'Amruta Shinde', 'student123', 'CSE022', 'CSE', '9000000022', 'ACTIVE'),
(1, 'dhananjay.more@rit.edu', 'Dhananjay More', 'student123', 'CSE023', 'CSE', '9000000023', 'ACTIVE'),
(1, 'gauri.patil@rit.edu', 'Gauri Patil', 'student123', 'CSE024', 'CSE', '9000000024', 'ACTIVE'),
(1, 'harsh.jadhav@rit.edu', 'Harsh Jadhav', 'student123', 'CSE025', 'CSE', '9000000025', 'ACTIVE'),
(1, 'isha.pawar@rit.edu', 'Isha Pawar', 'student123', 'CSE026', 'CSE', '9000000026', 'ACTIVE'),
(1, 'kunal.deshmukh@rit.edu', 'Kunal Deshmukh', 'student123', 'CSE027', 'CSE', '9000000027', 'ACTIVE'),
(1, 'mrunal.patil@rit.edu', 'Mrunal Patil', 'student123', 'CSE028', 'CSE', '9000000028', 'ACTIVE'),
(1, 'neha.more@rit.edu', 'Neha More', 'student123', 'CSE029', 'CSE', '9000000029', 'ACTIVE'),
(1, 'rahul.chavan@rit.edu', 'Rahul Chavan', 'student123', 'CSE030', 'CSE', '9000000030', 'ACTIVE'),

(1, 'aniket.patil@rit.edu', 'Aniket Patil', 'student123', 'CSE031', 'CSE', '9000000031', 'ACTIVE'),
(1, 'anushka.more@rit.edu', 'Anushka More', 'student123', 'CSE032', 'CSE', '9000000032', 'ACTIVE'),
(1, 'harshita.jadhav@rit.edu', 'Harshita Jadhav', 'student123', 'CSE033', 'CSE', '9000000033', 'ACTIVE'),
(1, 'nikhil.patil@rit.edu', 'Nikhil Patil', 'student123', 'CSE034', 'CSE', '9000000034', 'ACTIVE'),
(1, 'pooja.shinde@rit.edu', 'Pooja Shinde', 'student123', 'CSE035', 'CSE', '9000000035', 'ACTIVE'),
(1, 'rohan.more@rit.edu', 'Rohan More', 'student123', 'CSE036', 'CSE', '9000000036', 'ACTIVE'),
(1, 'sakshi.patil@rit.edu', 'Sakshi Patil', 'student123', 'CSE037', 'CSE', '9000000037', 'ACTIVE'),
(1, 'shubham.jadhav@rit.edu', 'Shubham Jadhav', 'student123', 'CSE038', 'CSE', '9000000038', 'ACTIVE'),
(1, 'vaishnavi.more@rit.edu', 'Vaishnavi More', 'student123', 'CSE039', 'CSE', '9000000039', 'ACTIVE'),
(1, 'vivek.patil@rit.edu', 'Vivek Patil', 'student123', 'CSE040', 'CSE', '9000000040', 'ACTIVE');


/* =========================================================
   2. INSERT USERS - FACULTY
   ========================================================= */

INSERT INTO users
(
    role_id,
    email,
    full_name,
    password_hash,
    employee_student_id,
    department,
    phone,
    status
)
VALUES
(2, 'ganeshsir@rit.edu', 'Faculty 01', 'faculty123', 'FAC001', 'CSE', '9100000001', 'ACTIVE'),
(2, 'faculty02@rit.edu', 'Faculty 02', 'faculty123', 'FAC002', 'CSE', '9100000002', 'ACTIVE'),
(2, 'faculty03@rit.edu', 'Faculty 03', 'faculty123', 'FAC003', 'CSE', '9100000003', 'ACTIVE'),
(2, 'faculty04@rit.edu', 'Faculty 04', 'faculty123', 'FAC004', 'CSE', '9100000004', 'ACTIVE'),
(2, 'faculty05@rit.edu', 'Faculty 05', 'faculty123', 'FAC005', 'CSE', '9100000005', 'ACTIVE'),
(2, 'faculty06@rit.edu', 'Faculty 06', 'faculty123', 'FAC006', 'CSE', '9100000006', 'ACTIVE'),
(2, 'faculty07@rit.edu', 'Faculty 07', 'faculty123', 'FAC007', 'CSE', '9100000007', 'ACTIVE'),
(2, 'faculty08@rit.edu', 'Faculty 08', 'faculty123', 'FAC008', 'CSE', '9100000008', 'ACTIVE'),
(2, 'faculty09@rit.edu', 'Faculty 09', 'faculty123', 'FAC009', 'CSE', '9100000009', 'ACTIVE'),
(2, 'faculty10@rit.edu', 'Faculty 10', 'faculty123', 'FAC010', 'CSE', '9100000010', 'ACTIVE');


/* =========================================================
   3. INSERT USERS - LAB ASSISTANTS
   ========================================================= */

INSERT INTO users
(
    role_id,
    email,
    full_name,
    password_hash,
    employee_student_id,
    department,
    phone,
    status
)
VALUES
(3, 'assistant01@rit.edu', 'Lab Assistant 01', 'assistant123', 'LABA001', 'CSE', '9200000001', 'ACTIVE'),
(3, 'assistant02@rit.edu', 'Lab Assistant 02', 'assistant123', 'LABA002', 'CSE', '9200000002', 'ACTIVE'),
(3, 'assistant03@rit.edu', 'Lab Assistant 03', 'assistant123', 'LABA003', 'CSE', '9200000003', 'ACTIVE'),
(3, 'assistant04@rit.edu', 'Lab Assistant 04', 'assistant123', 'LABA004', 'CSE', '9200000004', 'ACTIVE');


/* =========================================================
   4. INSERT USERS - ADMIN
   ========================================================= */

INSERT INTO users
(
    role_id,
    email,
    full_name,
    password_hash,
    employee_student_id,
    department,
    phone,
    status
)
VALUES
(4, 'admin01@rit.edu', 'Administrator 01', 'admin123', 'ADMIN001', 'ADMINISTRATION', '9300000001', 'ACTIVE');


/* =========================================================
   5. INSERT BATCHES
   IMPORTANT:
   batch_id is assumed to be IDENTITY.
   Therefore batch_id is NOT inserted manually.
   ========================================================= */

INSERT INTO batches
(
    batch_name,
    department,
    semester,
    student_count,
    status
)
VALUES
('C1', 'CSE', 'T.Y. CSE', 10, 'ACTIVE'),
('C2', 'CSE', 'T.Y. CSE', 10, 'ACTIVE'),
('C3', 'CSE', 'T.Y. CSE', 10, 'ACTIVE'),
('C4', 'CSE', 'T.Y. CSE', 10, 'ACTIVE');


/* =========================================================
   6. INSERT BATCH STUDENTS
   Uses employee_student_id instead of assuming user_id = 1-40.
   ========================================================= */

INSERT INTO batch_students
(
    batch_id,
    user_id,
    student_position
)
SELECT
    CASE
        WHEN TRY_CAST(RIGHT(employee_student_id, 3) AS INT)
             BETWEEN 1 AND 10 THEN 1

        WHEN TRY_CAST(RIGHT(employee_student_id, 3) AS INT)
             BETWEEN 11 AND 20 THEN 2

        WHEN TRY_CAST(RIGHT(employee_student_id, 3) AS INT)
             BETWEEN 21 AND 30 THEN 3

        WHEN TRY_CAST(RIGHT(employee_student_id, 3) AS INT)
             BETWEEN 31 AND 40 THEN 4
    END AS batch_id,

    user_id,

    CASE
        WHEN TRY_CAST(RIGHT(employee_student_id, 3) AS INT)
             BETWEEN 1 AND 10
            THEN TRY_CAST(RIGHT(employee_student_id, 3) AS INT)

        WHEN TRY_CAST(RIGHT(employee_student_id, 3) AS INT)
             BETWEEN 11 AND 20
            THEN TRY_CAST(RIGHT(employee_student_id, 3) AS INT) - 10

        WHEN TRY_CAST(RIGHT(employee_student_id, 3) AS INT)
             BETWEEN 21 AND 30
            THEN TRY_CAST(RIGHT(employee_student_id, 3) AS INT) - 20

        WHEN TRY_CAST(RIGHT(employee_student_id, 3) AS INT)
             BETWEEN 31 AND 40
            THEN TRY_CAST(RIGHT(employee_student_id, 3) AS INT) - 30
    END AS student_position

FROM users

WHERE role_id = 1
AND employee_student_id LIKE 'CSE%';


/* =========================================================
   7. INSERT RESOURCES
   10 PCs for every lab.
   
   MySQL LPAD() has been replaced with SQL Server RIGHT().
   ========================================================= */

INSERT INTO resources
(
    lab_id,
    resource_type_id,
    asset_code,
    resource_name,
    serial_number,
    capacity,
    status,
    version
)
SELECT
    l.lab_id,

    1 AS resource_type_id,

    CONCAT(
        'LAB',
        RIGHT('00' + CAST(l.lab_id AS VARCHAR(10)), 2),
        'PC',
        RIGHT('00' + CAST(p.pc_number AS VARCHAR(10)), 2)
    ) AS asset_code,

    CONCAT(
        l.lab_name,
        ' PC ',
        p.pc_number
    ) AS resource_name,

    CONCAT(
        'SN',
        RIGHT('00' + CAST(l.lab_id AS VARCHAR(10)), 2),
        RIGHT('00' + CAST(p.pc_number AS VARCHAR(10)), 2)
    ) AS serial_number,

    1 AS capacity,

    'AVAILABLE' AS status,

    1 AS version

FROM labs l

CROSS JOIN
(
    SELECT 1 AS pc_number
    UNION ALL SELECT 2
    UNION ALL SELECT 3
    UNION ALL SELECT 4
    UNION ALL SELECT 5
    UNION ALL SELECT 6
    UNION ALL SELECT 7
    UNION ALL SELECT 8
    UNION ALL SELECT 9
    UNION ALL SELECT 10
) p;


/* =========================================================
   8. INSERT INVENTORY
   ========================================================= */

INSERT INTO inventory
(
    resource_id,
    quantity_total,
    quantity_available,
    quantity_reserved,
    quantity_maintenance,
    min_threshold,
    version
)
SELECT
    resource_id,
    1,
    1,
    0,
    0,
    1,
    1
FROM resources;


/* =========================================================
   9. INSERT WEEKLY SCHEDULES
   ========================================================= */

INSERT INTO weekly_schedules
(
    batch_id,
    day_of_week,
    subject_code,
    subject_name,
    start_time,
    end_time,
    lab_id,
    semester_start,
    semester_end,
    status
)
VALUES

/* MONDAY */

(1, 'MONDAY', 'MP', 'Mini Project',
 '10:00:00', '12:00:00', 5,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(2, 'MONDAY', 'MP', 'Mini Project',
 '10:00:00', '12:00:00', 6,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(3, 'MONDAY', 'MP', 'Mini Project',
 '10:00:00', '12:00:00', 7,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(4, 'MONDAY', 'MP', 'Mini Project',
 '10:00:00', '12:00:00', 8,
 '2026-08-24', '2026-12-31', 'ACTIVE'),


/* TUESDAY */

(1, 'TUESDAY', 'FSWL', 'Full Stack Web Laboratory',
 '12:45:00', '14:45:00', 3,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(2, 'TUESDAY', 'ML', 'Machine Learning',
 '12:45:00', '14:45:00', 2,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(3, 'TUESDAY', 'FSWL', 'Full Stack Web Laboratory',
 '12:45:00', '14:45:00', 4,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(4, 'TUESDAY', 'ML', 'Machine Learning',
 '12:45:00', '14:45:00', 13,
 '2026-08-24', '2026-12-31', 'ACTIVE'),


/* TUESDAY EVENING */

(1, 'TUESDAY', 'MP', 'Machine Programming',
 '17:00:00', '18:00:00', 5,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(2, 'TUESDAY', 'MP', 'Machine Programming',
 '17:00:00', '18:00:00', 6,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(3, 'TUESDAY', 'MP', 'Machine Programming',
 '17:00:00', '18:00:00', 7,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(4, 'TUESDAY', 'MP', 'Machine Programming',
 '17:00:00', '18:00:00', 8,
 '2026-08-24', '2026-12-31', 'ACTIVE'),


/* WEDNESDAY */

(1, 'WEDNESDAY', 'ML', 'Machine Learning',
 '15:00:00', '16:00:00', 2,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(2, 'WEDNESDAY', 'ML', 'Machine Learning',
 '15:00:00', '16:00:00', 13,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(3, 'WEDNESDAY', 'FSWL', 'Full Stack Web Laboratory',
 '15:00:00', '16:00:00', 3,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(4, 'WEDNESDAY', 'FSWL', 'Full Stack Web Laboratory',
 '15:00:00', '16:00:00', 4,
 '2026-08-24', '2026-12-31', 'ACTIVE'),


/* THURSDAY */

(1, 'THURSDAY', 'ML', 'Machine Learning',
 '12:45:00', '14:45:00', 2,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(2, 'THURSDAY', 'FSWL', 'Full Stack Web Laboratory',
 '12:45:00', '14:45:00', 3,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(3, 'THURSDAY', 'ML', 'Machine Learning',
 '12:45:00', '14:45:00', 13,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(4, 'THURSDAY', 'FSWL', 'Full Stack Web Laboratory',
 '12:45:00', '14:45:00', 4,
 '2026-08-24', '2026-12-31', 'ACTIVE'),


/* FRIDAY */

(1, 'FRIDAY', 'MP', 'Mini Project',
 '15:00:00', '17:00:00', 5,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(2, 'FRIDAY', 'MP', 'Mini Project',
 '15:00:00', '17:00:00', 6,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(3, 'FRIDAY', 'MP', 'Mini Project',
 '15:00:00', '17:00:00', 7,
 '2026-08-24', '2026-12-31', 'ACTIVE'),

(4, 'FRIDAY', 'MP', 'Mini Project',
 '15:00:00', '17:00:00', 8,
 '2026-08-24', '2026-12-31', 'ACTIVE');


/* =========================================================
   10. INSERT SCHEDULE RESOURCES
   ========================================================= */

INSERT INTO schedule_resources
(
    schedule_id,
    resource_id,
    student_position
)
SELECT
    ws.schedule_id,

    r.resource_id,

    p.pc_number

FROM weekly_schedules ws

CROSS JOIN
(
    SELECT 1 AS pc_number
    UNION ALL SELECT 2
    UNION ALL SELECT 3
    UNION ALL SELECT 4
    UNION ALL SELECT 5
    UNION ALL SELECT 6
    UNION ALL SELECT 7
    UNION ALL SELECT 8
    UNION ALL SELECT 9
    UNION ALL SELECT 10
) p

JOIN resources r
    ON r.lab_id = ws.lab_id
    AND r.resource_type_id = 1
    AND r.asset_code =
        CONCAT(
            'LAB',
            RIGHT('00' + CAST(ws.lab_id AS VARCHAR(10)), 2),
            'PC',
            RIGHT('00' + CAST(p.pc_number AS VARCHAR(10)), 2)
        );


/* =========================================================
   11. INSERT MAINTENANCE
   Uses FAC001 and FAC002 instead of hard-coded user IDs.
   ========================================================= */

INSERT INTO maintenance
(
    resource_id,
    created_by,
    start_time,
    end_time,
    reason,
    status,
    cost,
    notes
)
VALUES

(
    11,

    (
        SELECT user_id
        FROM users
        WHERE employee_student_id = 'FAC001'
    ),

    '2026-09-10 09:00:00',
    '2026-09-10 12:00:00',
    'Keyboard replacement',
    'SCHEDULED',
    1200.00,
    'Keyboard replacement required'
),

(
    25,

    (
        SELECT user_id
        FROM users
        WHERE employee_student_id = 'FAC002'
    ),

    '2026-09-11 09:00:00',
    '2026-09-11 12:00:00',
    'Operating system update',
    'SCHEDULED',
    800.00,
    'System update required'
);


/* =========================================================
   12. INSERT NOTIFICATIONS
   ========================================================= */

INSERT INTO notifications
(
    user_id,
    title,
    message,
    type,
    status
)
SELECT
    bs.user_id,

    'Weekly Lab Schedule',

    CONCAT(
        'Your batch ',
        b.batch_name,
        ' has a laboratory schedule for the semester.'
    ),

    'SCHEDULE',

    'UNREAD'

FROM batch_students bs

JOIN batches b
    ON bs.batch_id = b.batch_id;


/* =========================================================
   13. INSERT USER SESSIONS
   Uses employee_student_id instead of assuming user_id.
   ========================================================= */

INSERT INTO user_sessions
(
    user_id,
    login_time,
    logout_time,
    ip_address,
    user_agent,
    status
)
VALUES

(
    (
        SELECT user_id
        FROM users
        WHERE employee_student_id = 'CSE001'
    ),

    '2026-08-24 09:00:00',
    NULL,
    '192.168.1.101',
    'Chrome',
    'ACTIVE'
),

(
    (
        SELECT user_id
        FROM users
        WHERE employee_student_id = 'CSE011'
    ),

    '2026-08-24 09:10:00',
    NULL,
    '192.168.1.102',
    'Chrome',
    'ACTIVE'
),

(
    (
        SELECT user_id
        FROM users
        WHERE employee_student_id = 'CSE021'
    ),

    '2026-08-24 09:20:00',
    NULL,
    '192.168.1.103',
    'Chrome',
    'ACTIVE'
);


/* =========================================================
   14. INSERT AUDIT LOGS
   ========================================================= */

INSERT INTO audit_logs
(
    user_id,
    resource_id,
    action,
    entity_type,
    entity_id,
    outcome,
    correlation_id,
    details
)
SELECT
    NULL,

    sr.resource_id,

    'PC_ASSIGNMENT',

    'SCHEDULE_RESOURCE',

    sr.schedule_resource_id,

    'SUCCESS',

    CONCAT(
        'SCHEDULE',
        ws.schedule_id
    ),

    CONCAT(
        'PC assigned to batch ',
        b.batch_name
    )

FROM schedule_resources sr

JOIN weekly_schedules ws
    ON sr.schedule_id = ws.schedule_id

JOIN batches b
    ON ws.batch_id = b.batch_id;


/* =========================================================
   15. CHECK DATA
   ========================================================= */

SELECT COUNT(*) AS TotalUsers
FROM users;

SELECT COUNT(*) AS TotalLabs
FROM labs;

SELECT COUNT(*) AS TotalBatches
FROM batches;

SELECT COUNT(*) AS TotalBatchStudents
FROM batch_students;

SELECT COUNT(*) AS TotalResources
FROM resources;

SELECT COUNT(*) AS TotalInventory
FROM inventory;

SELECT COUNT(*) AS TotalSchedules
FROM weekly_schedules;

SELECT COUNT(*) AS TotalScheduleResources
FROM schedule_resources;

SELECT COUNT(*) AS TotalMaintenance
FROM maintenance;

SELECT COUNT(*) AS TotalNotifications
FROM notifications;

SELECT COUNT(*) AS TotalSessions
FROM user_sessions;

SELECT COUNT(*) AS TotalAuditLogs
FROM audit_logs;


/* =========================================================
   16. VIEW IMPORTANT DATA
   ========================================================= */

SELECT *
FROM users;

SELECT *
FROM labs;

SELECT *
FROM batches;

SELECT *
FROM batch_students;

SELECT *
FROM resources;

SELECT *
FROM inventory;

SELECT *
FROM weekly_schedules;

SELECT *
FROM schedule_resources;

SELECT *
FROM maintenance;

SELECT *
FROM notifications;

SELECT *
FROM user_sessions;

SELECT *
FROM audit_logs;


/* =========================================================
   1. INSERT BOOKINGS
   =========================================================
   
   SQL SERVER CHANGES:
   - Do NOT insert booking_id because it is IDENTITY
   - MySQL DATETIME2(...) style removed
   - DATEADD() is used to combine date + time
   ========================================================= */
   

   SELECT
    COLUMN_NAME,
    DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'bookings'
ORDER BY ORDINAL_POSITION;
SELECT *
FROM bookings;

/* =========================================================
   INSERT BOOKINGS - DUPLICATE SAFE
   ========================================================= */

INSERT INTO bookings
(
    user_id,
    lab_id,
    idempotency_key,
    purpose,
    start_time,
    end_time,
    priority,
    status,
    created_at,
    created_by
)
SELECT
    bs.user_id,

    ws.lab_id,

    CONCAT(
        'SCH-',
        ws.schedule_id,
        '-',
        sr.student_position
    ) AS idempotency_key,

    ws.subject_name AS purpose,

    DATEADD(
        SECOND,
        DATEDIFF(
            SECOND,
            CAST('00:00:00' AS TIME),
            ws.start_time
        ),
        CAST('2026-08-24' AS DATETIME2)
    ) AS start_time,

    DATEADD(
        SECOND,
        DATEDIFF(
            SECOND,
            CAST('00:00:00' AS TIME),
            ws.end_time
        ),
        CAST('2026-08-24' AS DATETIME2)
    ) AS end_time,

    'NORMAL' AS priority,

    'ACCEPTED' AS status,

    CURRENT_TIMESTAMP AS created_at,

    bs.user_id AS created_by

FROM schedule_resources sr

JOIN weekly_schedules ws
    ON sr.schedule_id = ws.schedule_id

JOIN batches b
    ON ws.batch_id = b.batch_id

JOIN batch_students bs
    ON bs.batch_id = b.batch_id
    AND bs.student_position = sr.student_position

/* CHANGED: Don't insert if idempotency_key already exists */
WHERE NOT EXISTS
(
    SELECT 1
    FROM bookings bk
    WHERE bk.idempotency_key =
        CONCAT(
            'SCH-',
            ws.schedule_id,
            '-',
            sr.student_position
        )
);
/* =========================================================
   2. INDEXES - USERS
   ========================================================= */

CREATE INDEX idx_users_role
ON users(role_id);


CREATE INDEX idx_users_department
ON users(department);


/* =========================================================
   3. INDEXES - LABS
   ========================================================= */

CREATE INDEX idx_labs_department
ON labs(department);


/* =========================================================
   4. INDEXES - RESOURCES
   ========================================================= */

CREATE INDEX idx_resources_lab
ON resources(lab_id);


CREATE INDEX idx_resources_status
ON resources(status);


/* =========================================================
   5. INDEXES - BOOKINGS
   ========================================================= */

CREATE INDEX idx_bookings_user
ON bookings(user_id);


CREATE INDEX idx_bookings_lab
ON bookings(lab_id);


CREATE INDEX idx_bookings_status
ON bookings(status);


CREATE INDEX idx_bookings_time
ON bookings(start_time, end_time);


/* =========================================================
   6. INDEXES - BATCH STUDENTS
   ========================================================= */

CREATE INDEX idx_batch_students_batch
ON batch_students(batch_id);


CREATE INDEX idx_batch_students_user
ON batch_students(user_id);


/* =========================================================
   7. INDEXES - WEEKLY SCHEDULES
   ========================================================= */

CREATE INDEX idx_weekly_schedule_batch
ON weekly_schedules(batch_id);


CREATE INDEX idx_weekly_schedule_day
ON weekly_schedules(day_of_week);


CREATE INDEX idx_weekly_schedule_time
ON weekly_schedules(start_time, end_time);


/* =========================================================
   8. INDEXES - SCHEDULE RESOURCES
   ========================================================= */

CREATE INDEX idx_schedule_resources_schedule
ON schedule_resources(schedule_id);


CREATE INDEX idx_schedule_resources_resource
ON schedule_resources(resource_id);


/* =========================================================
   9. INDEXES - AUDIT LOGS
   ========================================================= */

CREATE INDEX idx_audit_booking
ON audit_logs(booking_id);


/* =========================================================
   10. INDEXES - TRANSACTION LOGS
   ========================================================= */

CREATE INDEX idx_transaction_booking
ON transaction_logs(booking_id);


/* =========================================================
   11. SHOW BATCH STUDENTS
   ========================================================= */

SELECT
    b.batch_name,
    u.employee_student_id,
    u.full_name,
    bs.student_position

FROM batches b

JOIN batch_students bs
    ON b.batch_id = bs.batch_id

JOIN users u
    ON bs.user_id = u.user_id

ORDER BY
    b.batch_id,
    bs.student_position;


/* =========================================================
   12. SHOW WEEKLY SCHEDULE
   ========================================================= */

SELECT
    b.batch_name,
    ws.day_of_week,
    ws.subject_code,
    ws.subject_name,
    ws.start_time,
    ws.end_time,
    l.lab_name

FROM weekly_schedules ws

JOIN batches b
    ON ws.batch_id = b.batch_id

JOIN labs l
    ON ws.lab_id = l.lab_id

ORDER BY
    CASE ws.day_of_week
        WHEN 'MONDAY' THEN 1
        WHEN 'TUESDAY' THEN 2
        WHEN 'WEDNESDAY' THEN 3
        WHEN 'THURSDAY' THEN 4
        WHEN 'FRIDAY' THEN 5
        WHEN 'SATURDAY' THEN 6
        ELSE 7
    END,
    ws.start_time,
    b.batch_name;


/* =========================================================
   13. COUNT PCs FOR EACH SCHEDULE
   ========================================================= */

SELECT
    b.batch_name,
    ws.day_of_week,
    ws.subject_name,
    ws.start_time,
    ws.end_time,
    l.lab_name,
    COUNT(sr.resource_id) AS total_pcs

FROM weekly_schedules ws

JOIN batches b
    ON ws.batch_id = b.batch_id

JOIN labs l
    ON ws.lab_id = l.lab_id

LEFT JOIN schedule_resources sr
    ON ws.schedule_id = sr.schedule_id

GROUP BY
    ws.schedule_id,
    b.batch_name,
    ws.day_of_week,
    ws.subject_name,
    ws.start_time,
    ws.end_time,
    l.lab_name

ORDER BY
    b.batch_name,
    ws.day_of_week,
    ws.start_time;


/* =========================================================
   14. SHOW PC ASSIGNMENTS TO STUDENTS
   ========================================================= */

SELECT
    b.batch_name,
    ws.day_of_week,
    ws.subject_name,
    ws.start_time,
    ws.end_time,
    l.lab_name,
    r.asset_code,
    sr.student_position,
    u.employee_student_id,
    u.full_name

FROM schedule_resources sr

JOIN weekly_schedules ws
    ON sr.schedule_id = ws.schedule_id

JOIN batches b
    ON ws.batch_id = b.batch_id

JOIN resources r
    ON sr.resource_id = r.resource_id

JOIN labs l
    ON r.lab_id = l.lab_id

JOIN batch_students bs
    ON bs.batch_id = b.batch_id
    AND bs.student_position = sr.student_position

JOIN users u
    ON bs.user_id = u.user_id

ORDER BY
    b.batch_name,
    ws.day_of_week,
    ws.start_time,
    sr.student_position;


/* =========================================================
   15. TOTAL PCs IN EACH LAB
   ========================================================= */

SELECT
    l.lab_name,
    COUNT(r.resource_id) AS total_pcs

FROM labs l

LEFT JOIN resources r
    ON l.lab_id = r.lab_id
    AND r.resource_type_id = 1

GROUP BY
    l.lab_id,
    l.lab_name

ORDER BY
    l.lab_id;


/* =========================================================
   16. SHOW MAINTENANCE RECORDS
   ========================================================= */

SELECT
    m.maintenance_id,
    r.asset_code,
    l.lab_name,
    m.reason,
    m.status,
    m.cost,
    m.start_time,
    m.end_time

FROM maintenance m

JOIN resources r
    ON m.resource_id = r.resource_id

JOIN labs l
    ON r.lab_id = l.lab_id

ORDER BY
    m.start_time;


/* =========================================================
   17. SHOW AUDIT LOGS
   ========================================================= */

SELECT
    a.audit_id,
    a.action,
    a.entity_type,
    a.outcome,
    a.correlation_id,
    a.details,
    a.[timestamp]

FROM audit_logs a

ORDER BY
    a.audit_id;


/* =========================================================
   18. SYSTEM SUMMARY
   ========================================================= */

SELECT
    'Students' AS item,
    COUNT(*) AS total

FROM users

WHERE role_id = 1

UNION ALL

SELECT
    'Faculty',
    COUNT(*)

FROM users

WHERE role_id = 2

UNION ALL

SELECT
    'Lab Assistants',
    COUNT(*)

FROM users

WHERE role_id = 3

UNION ALL

SELECT
    'Administrators',
    COUNT(*)

FROM users

WHERE role_id = 4

UNION ALL

SELECT
    'Batches',
    COUNT(*)

FROM batches

UNION ALL

SELECT
    'Labs',
    COUNT(*)

FROM labs

UNION ALL

SELECT
    'PCs',
    COUNT(*)

FROM resources

WHERE resource_type_id = 1

UNION ALL

SELECT
    'Inventory Records',
    COUNT(*)

FROM inventory

UNION ALL

SELECT
    'Weekly Schedule Records',
    COUNT(*)

FROM weekly_schedules

UNION ALL

SELECT
    'PC Assignment Records',
    COUNT(*)

FROM schedule_resources

UNION ALL

SELECT
    'Maintenance Records',
    COUNT(*)

FROM maintenance

UNION ALL

SELECT
    'Audit Records',
    COUNT(*)

FROM audit_logs;


/* =========================================================
   19. SHOW USERS
   =========================================================
   
   Original MySQL code:
   SELECT user_id, name FROM users;
   
   'name' does not exist.
   SQL Server table uses 'full_name'.
   ========================================================= */

SELECT
    user_id,
    full_name

FROM users;


/* =========================================================
   20. SHOW ALL USERS
   ========================================================= */

SELECT *
FROM users;

/*-------------------------------------
====================================================================
SSMS VERIFICATION QUERIES
====================================================================
*/

SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO

SELECT user_id, full_name, email, role_id, status
FROM users;
GO

SELECT * FROM roles;
GO

SELECT * FROM labs;
GO

SELECT * FROM resource_types;
GO

SELECT * FROM resources;
GO

SELECT * FROM inventory;
GO

SELECT * FROM batches;
GO

SELECT * FROM batch_students;
GO

SELECT * FROM weekly_schedules;
GO

SELECT * FROM schedule_resources;
GO

SELECT * FROM maintenance;
GO

SELECT * FROM notifications;
GO

SELECT * FROM user_sessions;
GO

SELECT * FROM audit_logs;
GO

SELECT * FROM scheduling_decisions;
GO




USE smart_campus_lab;

SELECT * FROM roles;

SELECT TOP 10
    user_id,
    email,
    full_name,
    employee_student_id,
    status
FROM users;

SELECT TOP 10 *
FROM labs;

EXEC sp_help 'bookings';

EXEC sp_help 'labs';

EXEC sp_help 'labs';


EXEC sp_help 'weekly_schedules';

SELECT TOP 30
    schedule_id,
    batch_id,
    day_of_week,
    subject_code,
    subject_name,
    start_time,
    end_time,
    lab_id
FROM weekly_schedules
ORDER BY lab_id, day_of_week, start_time;


SELECT
    TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;


EXEC sp_help 'batches';


USE smart_campus_lab;
GO

-- Check users columns
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'users'
ORDER BY ORDINAL_POSITION;

-- Check roles columns
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'roles'
ORDER BY ORDINAL_POSITION;

-- Check labs columns
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'labs'
ORDER BY ORDINAL_POSITION;

-- Check bookings columns
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'bookings'
ORDER BY ORDINAL_POSITION;