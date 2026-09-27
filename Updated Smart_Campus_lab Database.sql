DROP DATABASE IF EXISTS smart_campus_lab_college;
CREATE DATABASE smart_campus_lab_college;

USE smart_campus_lab_college;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS lab_connections;
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

SET FOREIGN_KEY_CHECKS = 1;


CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE
);


CREATE TABLE users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    employee_student_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
);


CREATE TABLE labs (
    lab_id INT AUTO_INCREMENT PRIMARY KEY,
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
    resource_type_id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    unit_type VARCHAR(20)
);


CREATE TABLE resources (
    resource_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lab_id INT NOT NULL,
    resource_type_id INT NOT NULL,
    asset_code VARCHAR(100) NOT NULL UNIQUE,
    resource_name VARCHAR(150),
    serial_number VARCHAR(150) UNIQUE,
    capacity INT,
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (lab_id)
        REFERENCES labs(lab_id),

    FOREIGN KEY (resource_type_id)
        REFERENCES resource_types(resource_type_id)
);


CREATE TABLE inventory (
    inventory_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT NOT NULL UNIQUE,
    quantity_total INT DEFAULT 0,
    quantity_available INT DEFAULT 0,
    quantity_reserved INT DEFAULT 0,
    quantity_maintenance INT DEFAULT 0,
    min_threshold INT DEFAULT 0,
    version INT DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (resource_id)
        REFERENCES resources(resource_id)
);


CREATE TABLE batches (
    batch_id INT AUTO_INCREMENT PRIMARY KEY,
    batch_name VARCHAR(20) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    semester VARCHAR(30),
    student_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);


CREATE TABLE batch_students (
    batch_student_id BIGINT AUTO_INCREMENT PRIMARY KEY,
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
    booking_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    lab_id INT NOT NULL,
    idempotency_key VARCHAR(100) UNIQUE,
    purpose VARCHAR(255),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    priority VARCHAR(20) DEFAULT 'NORMAL',
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    FOREIGN KEY (lab_id)
        REFERENCES labs(lab_id),

    FOREIGN KEY (created_by)
        REFERENCES users(user_id)
);


CREATE TABLE booking_resources (
    booking_resource_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    resource_id BIGINT NOT NULL,
    quantity INT DEFAULT 1,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    resource_version INT,

    FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE,

    FOREIGN KEY (resource_id)
        REFERENCES resources(resource_id),

    UNIQUE (booking_id, resource_id)
);


CREATE TABLE weekly_schedules (
    schedule_id BIGINT AUTO_INCREMENT PRIMARY KEY,

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
    schedule_resource_id BIGINT AUTO_INCREMENT PRIMARY KEY,

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
    maintenance_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT NOT NULL,
    created_by BIGINT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
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
    status_history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by BIGINT,
    reason VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE,

    FOREIGN KEY (changed_by)
        REFERENCES users(user_id)
);


CREATE TABLE resource_status_history (
    status_history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT NOT NULL,
    booking_id BIGINT,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by BIGINT,
    reason VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

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
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(200),
    message TEXT,
    type VARCHAR(30),
    status VARCHAR(20) DEFAULT 'UNREAD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


CREATE TABLE user_sessions (
    session_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    status VARCHAR(20) DEFAULT 'ACTIVE',

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


CREATE TABLE audit_logs (
    audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    booking_id BIGINT,
    resource_id BIGINT,
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id BIGINT,
    outcome VARCHAR(20),
    correlation_id VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id),

    FOREIGN KEY (resource_id)
        REFERENCES resources(resource_id)
);


CREATE TABLE transaction_logs (
    transaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT,
    correlation_id VARCHAR(100),
    transaction_reference VARCHAR(50),
    start_time TIMESTAMP,
    commit_time TIMESTAMP,
    latency_ms DECIMAL(12,3),
    outcome VARCHAR(20),
    failure_reason VARCHAR(255),
    isolation_level VARCHAR(30),

    FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
);


CREATE TABLE api_request_logs (
    request_log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    correlation_id VARCHAR(100),
    user_id BIGINT,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    request_time TIMESTAMP,
    response_time TIMESTAMP,
    latency_ms DECIMAL(12,3),
    status_code INT,
    outcome VARCHAR(20),
    failure_category VARCHAR(80),

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
);


CREATE TABLE scheduling_decisions (
    decision_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    resource_id BIGINT NOT NULL,
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    expected_resource_version INT,
    priority VARCHAR(20),
    queue_position INT,
    decision_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id),

    FOREIGN KEY (resource_id)
        REFERENCES resources(resource_id)
);


CREATE TABLE route_results (
    route_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE,
    source_location VARCHAR(255),
    destination_location VARCHAR(255),
    route_distance DECIMAL(10,2),
    route_duration_minutes INT,
    graph_version INT,
    route_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (booking_id)
        REFERENCES bookings(booking_id)
        ON DELETE CASCADE
);


-- ============================================================
-- NEW: LAB CONNECTIONS (graph edges for Dijkstra-based routing)
-- ============================================================
-- Connections are stored as bidirectional edges: every physical
-- path between two labs is inserted as TWO rows (A->B and B->A),
-- both with the same distance/time. This lets the routing engine
-- simply query "WHERE source_lab_id = ?" to get neighbours,
-- without needing an OR condition for direction.

CREATE TABLE lab_connections (
    connection_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_lab_id INT NOT NULL,
    destination_lab_id INT NOT NULL,
    distance_meters DECIMAL(10,2) NOT NULL,
    travel_time_minutes INT,
    status VARCHAR(20) DEFAULT 'ACTIVE',

    FOREIGN KEY (source_lab_id)
        REFERENCES labs(lab_id),

    FOREIGN KEY (destination_lab_id)
        REFERENCES labs(lab_id),

    UNIQUE (source_lab_id, destination_lab_id),
    CHECK (source_lab_id <> destination_lab_id)
);


INSERT INTO roles
(
    role_id,
    role_name,
    description
)
VALUES
(1, 'STUDENT', 'Student who uses laboratory resources'),
(2, 'FACULTY', 'Faculty member'),
(3, 'LAB_ASSISTANT', 'Lab assistant'),
(4, 'ADMINISTRATOR', 'System administrator');


INSERT INTO labs
(
    lab_id,
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
(1, 'Apple Lab', 'CSE', 'CSE Building', '1', 'C101', 'CSE Building', 30, 'ACTIVE'),
(2, 'AIML Lab', 'AIML', 'AIML Building', '1', 'A101', 'AIML Building', 30, 'ACTIVE'),
(3, 'L1', 'CSE', 'CSE Building', '1', 'C103', 'CSE Building', 30, 'ACTIVE'),
(4, 'L2', 'CSE', 'CSE Building', '1', 'C104', 'CSE Building', 30, 'ACTIVE'),
(5, 'L4', 'CSE', 'CSE Building', '2', 'C201', 'CSE Building', 30, 'ACTIVE'),
(6, 'L5', 'CSE', 'CSE Building', '2', 'C202', 'CSE Building', 30, 'ACTIVE'),
(7, 'Project Lab', 'CSE', 'CSE Building', '2', 'C203', 'CSE Building', 30, 'ACTIVE'),
(8, 'PG Lab', 'CSE', 'CSE Building', '3', 'C301', 'CSE Building', 30, 'ACTIVE'),
(9, 'ARVR Lab', 'CSE', 'CSE Building', '3', 'C303', 'CSE Building', 30, 'ACTIVE'),
(10, 'Cloud Computing Lab', 'CSE', 'CSE Building', '3', 'C304', 'CSE Building', 30, 'ACTIVE'),
(11, 'IL7', 'CSIT', 'CSIT Building', '1', 'I101', 'CSIT Building', 30, 'ACTIVE'),
(12, 'IL8', 'CSIT', 'CSIT Building', '1', 'I102', 'CSIT Building', 30, 'ACTIVE'),
(13, 'AIML1', 'AIML', 'AIML Building', '1', 'A102', 'AIML Building', 30, 'ACTIVE'),
(14, 'AIML2', 'AIML', 'AIML Building', '1', 'A103', 'AIML Building', 30, 'ACTIVE');


INSERT INTO resource_types
(
    resource_type_id,
    type,
    description,
    unit_type
)
VALUES
(1, 'PC', 'Desktop computer', 'UNIT'),
(2, 'PROJECTOR', 'Projector', 'UNIT'),
(3, 'PRINTER', 'Printer', 'UNIT');


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
(2, 'faculty01@rit.edu', 'Faculty 01', 'faculty123', 'FAC001', 'CSE', '9100000001', 'ACTIVE'),
(2, 'faculty02@rit.edu', 'Faculty 02', 'faculty123', 'FAC002', 'CSE', '9100000002', 'ACTIVE'),
(2, 'faculty03@rit.edu', 'Faculty 03', 'faculty123', 'FAC003', 'CSE', '9100000003', 'ACTIVE'),
(2, 'faculty04@rit.edu', 'Faculty 04', 'faculty123', 'FAC004', 'CSE', '9100000004', 'ACTIVE'),
(2, 'faculty05@rit.edu', 'Faculty 05', 'faculty123', 'FAC005', 'CSE', '9100000005', 'ACTIVE'),
(2, 'faculty06@rit.edu', 'Faculty 06', 'faculty123', 'FAC006', 'CSE', '9100000006', 'ACTIVE'),
(2, 'faculty07@rit.edu', 'Faculty 07', 'faculty123', 'FAC007', 'CSE', '9100000007', 'ACTIVE'),
(2, 'faculty08@rit.edu', 'Faculty 08', 'faculty123', 'FAC008', 'CSE', '9100000008', 'ACTIVE'),
(2, 'faculty09@rit.edu', 'Faculty 09', 'faculty123', 'FAC009', 'CSE', '9100000009', 'ACTIVE'),
(2, 'faculty10@rit.edu', 'Faculty 10', 'faculty123', 'FAC010', 'CSE', '9100000010', 'ACTIVE');


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


INSERT INTO batches
(
    batch_id,
    batch_name,
    department,
    semester,
    student_count,
    status
)
VALUES
(1, 'C1', 'CSE', 'T.Y. CSE', 10, 'ACTIVE'),
(2, 'C2', 'CSE', 'T.Y. CSE', 10, 'ACTIVE'),
(3, 'C3', 'CSE', 'T.Y. CSE', 10, 'ACTIVE'),
(4, 'C4', 'CSE', 'T.Y. CSE', 10, 'ACTIVE');


INSERT INTO batch_students
(
    batch_id,
    user_id,
    student_position
)
SELECT
    CASE
        WHEN user_id BETWEEN 1 AND 10 THEN 1
        WHEN user_id BETWEEN 11 AND 20 THEN 2
        WHEN user_id BETWEEN 21 AND 30 THEN 3
        WHEN user_id BETWEEN 31 AND 40 THEN 4
    END,

    user_id,

    CASE
        WHEN user_id BETWEEN 1 AND 10 THEN user_id
        WHEN user_id BETWEEN 11 AND 20 THEN user_id - 10
        WHEN user_id BETWEEN 21 AND 30 THEN user_id - 20
        WHEN user_id BETWEEN 31 AND 40 THEN user_id - 30
    END

FROM users

WHERE role_id = 1;


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

    1,

    CONCAT(
        'LAB',
        LPAD(l.lab_id, 2, '0'),
        'PC',
        LPAD(p.pc_number, 2, '0')
    ),

    CONCAT(
        l.lab_name,
        ' PC ',
        p.pc_number
    ),

    CONCAT(
        'SN',
        LPAD(l.lab_id, 2, '0'),
        LPAD(p.pc_number, 2, '0')
    ),

    1,

    'AVAILABLE',

    1

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
) p

ORDER BY
    l.lab_id,
    p.pc_number;


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

(1, 'MONDAY', 'MP', 'Mini Project', '10:00:00', '12:00:00', 5, '2026-08-24', '2026-12-31', 'ACTIVE'),
(2, 'MONDAY', 'MP', 'Mini Project', '10:00:00', '12:00:00', 6, '2026-08-24', '2026-12-31', 'ACTIVE'),
(3, 'MONDAY', 'MP', 'Mini Project', '10:00:00', '12:00:00', 7, '2026-08-24', '2026-12-31', 'ACTIVE'),
(4, 'MONDAY', 'MP', 'Mini Project', '10:00:00', '12:00:00', 8, '2026-08-24', '2026-12-31', 'ACTIVE'),

(1, 'TUESDAY', 'FSWL', 'Full Stack Web Laboratory', '12:45:00', '14:45:00', 3, '2026-08-24', '2026-12-31', 'ACTIVE'),
(2, 'TUESDAY', 'ML', 'Machine Learning', '12:45:00', '14:45:00', 2, '2026-08-24', '2026-12-31', 'ACTIVE'),
(3, 'TUESDAY', 'FSWL', 'Full Stack Web Laboratory', '12:45:00', '14:45:00', 4, '2026-08-24', '2026-12-31', 'ACTIVE'),
(4, 'TUESDAY', 'ML', 'Machine Learning', '12:45:00', '14:45:00', 13, '2026-08-24', '2026-12-31', 'ACTIVE'),

(1, 'TUESDAY', 'MP', 'Machine Programming', '17:00:00', '18:00:00', 5, '2026-08-24', '2026-12-31', 'ACTIVE'),
(2, 'TUESDAY', 'MP', 'Machine Programming', '17:00:00', '18:00:00', 6, '2026-08-24', '2026-12-31', 'ACTIVE'),
(3, 'TUESDAY', 'MP', 'Machine Programming', '17:00:00', '18:00:00', 7, '2026-08-24', '2026-12-31', 'ACTIVE'),
(4, 'TUESDAY', 'MP', 'Machine Programming', '17:00:00', '18:00:00', 8, '2026-08-24', '2026-12-31', 'ACTIVE'),

(1, 'WEDNESDAY', 'ML', 'Machine Learning', '15:00:00', '16:00:00', 2, '2026-08-24', '2026-12-31', 'ACTIVE'),
(2, 'WEDNESDAY', 'ML', 'Machine Learning', '15:00:00', '16:00:00', 13, '2026-08-24', '2026-12-31', 'ACTIVE'),
(3, 'WEDNESDAY', 'FSWL', 'Full Stack Web Laboratory', '15:00:00', '16:00:00', 3, '2026-08-24', '2026-12-31', 'ACTIVE'),
(4, 'WEDNESDAY', 'FSWL', 'Full Stack Web Laboratory', '15:00:00', '16:00:00', 4, '2026-08-24', '2026-12-31', 'ACTIVE'),

(1, 'THURSDAY', 'ML', 'Machine Learning', '12:45:00', '14:45:00', 2, '2026-08-24', '2026-12-31', 'ACTIVE'),
(2, 'THURSDAY', 'FSWL', 'Full Stack Web Laboratory', '12:45:00', '14:45:00', 3, '2026-08-24', '2026-12-31', 'ACTIVE'),
(3, 'THURSDAY', 'ML', 'Machine Learning', '12:45:00', '14:45:00', 13, '2026-08-24', '2026-12-31', 'ACTIVE'),
(4, 'THURSDAY', 'FSWL', 'Full Stack Web Laboratory', '12:45:00', '14:45:00', 4, '2026-08-24', '2026-12-31', 'ACTIVE'),

(1, 'FRIDAY', 'MP', 'Mini Project', '15:00:00', '17:00:00', 5, '2026-08-24', '2026-12-31', 'ACTIVE'),
(2, 'FRIDAY', 'MP', 'Mini Project', '15:00:00', '17:00:00', 6, '2026-08-24', '2026-12-31', 'ACTIVE'),
(3, 'FRIDAY', 'MP', 'Mini Project', '15:00:00', '17:00:00', 7, '2026-08-24', '2026-12-31', 'ACTIVE'),
(4, 'FRIDAY', 'MP', 'Mini Project ', '15:00:00', '17:00:00', 8, '2026-08-24', '2026-12-31', 'ACTIVE');


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

JOIN
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
            LPAD(ws.lab_id, 2, '0'),
            'PC',
            LPAD(p.pc_number, 2, '0')
        )

ORDER BY
    ws.schedule_id,
    p.pc_number;


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
    51,
    '2026-09-10 09:00:00',
    '2026-09-10 12:00:00',
    'Keyboard replacement',
    'SCHEDULED',
    1200.00,
    'Keyboard replacement required'
),

(
    25,
    52,
    '2026-09-11 09:00:00',
    '2026-09-11 12:00:00',
    'Operating system update',
    'SCHEDULED',
    800.00,
    'System update required'
);


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
    1,
    '2026-08-24 09:00:00',
    NULL,
    '192.168.1.101',
    'Chrome',
    'ACTIVE'
),

(
    11,
    '2026-08-24 09:10:00',
    NULL,
    '192.168.1.102',
    'Chrome',
    'ACTIVE'
),

(
    21,
    '2026-08-24 09:20:00',
    NULL,
    '192.168.1.103',
    'Chrome',
    'ACTIVE'
);


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


INSERT INTO scheduling_decisions
(
    booking_id,
    resource_id,
    scheduled_start,
    scheduled_end,
    expected_resource_version,
    priority,
    queue_position,
    decision_status
)

SELECT
    NULL,
    sr.resource_id,

    TIMESTAMP(
        '2026-08-24 00:00:00',
        ws.start_time
    ),

    TIMESTAMP(
        '2026-08-24 00:00:00',
        ws.end_time
    ),

    r.version,

    'NORMAL',

    sr.student_position,

    'ACCEPTED'

FROM schedule_resources sr

JOIN weekly_schedules ws
    ON sr.schedule_id = ws.schedule_id

JOIN resources r
    ON sr.resource_id = r.resource_id;


-- ============================================================
-- NEW: LAB CONNECTIONS DATA (bidirectional graph edges)
-- Each physical corridor/stair link between two labs is inserted
-- TWICE (A -> B and B -> A) so the graph works in both directions.
-- All 14 labs are connected, so Dijkstra can route between any two.
-- ============================================================

INSERT INTO lab_connections
(source_lab_id, destination_lab_id, distance_meters, travel_time_minutes, status)
VALUES
-- CSE Building, Floor 1 (Apple Lab - L1 - L2)
(1, 3, 15, 1, 'ACTIVE'),  (3, 1, 15, 1, 'ACTIVE'),
(3, 4, 10, 1, 'ACTIVE'),  (4, 3, 10, 1, 'ACTIVE'),

-- CSE Building, Floor 2 (L4 - L5 - Project Lab)
(5, 6, 12, 1, 'ACTIVE'),  (6, 5, 12, 1, 'ACTIVE'),
(6, 7, 15, 1, 'ACTIVE'),  (7, 6, 15, 1, 'ACTIVE'),

-- CSE Building, Floor 3 (PG Lab - ARVR Lab - Cloud Computing Lab)
(8, 9, 10, 1, 'ACTIVE'),  (9, 8, 10, 1, 'ACTIVE'),
(9, 10, 12, 1, 'ACTIVE'), (10, 9, 12, 1, 'ACTIVE'),

-- CSE Building stairs: Floor1 <-> Floor2 <-> Floor3
(3, 5, 40, 2, 'ACTIVE'),  (5, 3, 40, 2, 'ACTIVE'),
(5, 8, 40, 2, 'ACTIVE'),  (8, 5, 40, 2, 'ACTIVE'),

-- CSE Building -> AIML Building
(1, 2, 150, 3, 'ACTIVE'), (2, 1, 150, 3, 'ACTIVE'),

-- CSE Building -> CSIT Building
(4, 11, 180, 3, 'ACTIVE'), (11, 4, 180, 3, 'ACTIVE'),

-- AIML Building internal (AIML Lab - AIML1 - AIML2)
(2, 13, 15, 1, 'ACTIVE'),  (13, 2, 15, 1, 'ACTIVE'),
(13, 14, 12, 1, 'ACTIVE'), (14, 13, 12, 1, 'ACTIVE'),

-- CSIT Building internal (IL7 - IL8)
(11, 12, 15, 1, 'ACTIVE'), (12, 11, 15, 1, 'ACTIVE');


CREATE INDEX idx_users_role
ON users(role_id);


CREATE INDEX idx_users_department
ON users(department);


CREATE INDEX idx_labs_department
ON labs(department);


CREATE INDEX idx_resources_lab
ON resources(lab_id);


CREATE INDEX idx_resources_status
ON resources(status);


CREATE INDEX idx_bookings_user
ON bookings(user_id);


CREATE INDEX idx_bookings_lab
ON bookings(lab_id);


CREATE INDEX idx_bookings_status
ON bookings(status);


CREATE INDEX idx_bookings_time
ON bookings(start_time, end_time);


CREATE INDEX idx_batch_students_batch
ON batch_students(batch_id);


CREATE INDEX idx_batch_students_user
ON batch_students(user_id);


CREATE INDEX idx_weekly_schedule_batch
ON weekly_schedules(batch_id);


CREATE INDEX idx_weekly_schedule_day
ON weekly_schedules(day_of_week);


CREATE INDEX idx_weekly_schedule_time
ON weekly_schedules(start_time, end_time);


CREATE INDEX idx_schedule_resources_schedule
ON schedule_resources(schedule_id);


CREATE INDEX idx_schedule_resources_resource
ON schedule_resources(resource_id);


CREATE INDEX idx_audit_booking
ON audit_logs(booking_id);


CREATE INDEX idx_transaction_booking
ON transaction_logs(booking_id);


-- NEW: indexes to make Dijkstra's neighbour lookups fast
CREATE INDEX idx_lab_connections_source
ON lab_connections(source_lab_id);

CREATE INDEX idx_lab_connections_destination
ON lab_connections(destination_lab_id);


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
    FIELD(
        ws.day_of_week,
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY'
    ),
    ws.start_time,
    b.batch_name;


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


SELECT
    b.batch_name,
    ws.subject_name,
    ws.day_of_week,
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


SELECT
    a.audit_id,
    a.action,
    a.entity_type,
    a.outcome,
    a.correlation_id,
    a.details,
    a.timestamp
FROM audit_logs a

ORDER BY
    a.audit_id;


-- NEW: quick sanity check for the routing graph
SELECT
    lc.connection_id,
    ls.lab_name AS source_lab,
    ld.lab_name AS destination_lab,
    lc.distance_meters,
    lc.travel_time_minutes,
    lc.status
FROM lab_connections lc

JOIN labs ls
    ON lc.source_lab_id = ls.lab_id

JOIN labs ld
    ON lc.destination_lab_id = ld.lab_id

ORDER BY
    lc.source_lab_id,
    lc.destination_lab_id;


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
FROM audit_logs

UNION ALL

SELECT
    'Lab Connection Records',
    COUNT(*)
FROM lab_connections;