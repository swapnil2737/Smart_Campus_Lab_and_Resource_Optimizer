/**
 * js/api.js
 * REST API client & Mock Data Engine for Smart Campus Lab & Resource Optimizer
 * 
 * Supports:
 * - Team A OS Engine (Scheduling, Allocation, Priority)
 * - Team B DSA Engine (Recommendation)
 * - Team C DBMS Engine (Data Persistence & Records)
 * - Team D Web Engine (Admin, Faculty, Student, Lab Assistant Dashboards)
 */

// Initial Mock Database State
const DB_STORAGE_KEY = 'smart_campus_db_state_v1';

const defaultMockData = {
    labs: [
        { id: 'LAB 101', name: 'Computer Lab 1', location: 'Block A, Ground Floor', capacity: 40, totalResources: 40, status: 'Available', floor: 'Ground', ac: true, projector: true, incharge: 'Prof. S. R. Patil' },
        { id: 'LAB 102', name: 'Computer Lab 2', location: 'Block A, 1st Floor', capacity: 40, totalResources: 40, status: 'Busy', floor: '1st Floor', ac: true, projector: true, incharge: 'Dr. M. K. Kulkarni' },
        { id: 'LAB 103', name: 'AI & Data Science Lab', location: 'Block A, 2nd Floor', capacity: 40, totalResources: 40, status: 'Full', floor: '2nd Floor', ac: true, projector: true, incharge: 'Prof. A. N. Joshi' },
        { id: 'LAB 104', name: 'IoT & Embedded Systems Lab', location: 'Block A, 2nd Floor', capacity: 30, totalResources: 30, status: 'Available', floor: '2nd Floor', ac: true, projector: true, incharge: 'Prof. R. V. Mane' },
        { id: 'LAB 105', name: 'Network & Security Lab', location: 'Block A, 3rd Floor', capacity: 40, totalResources: 40, status: 'Faculty Reserved', floor: '3rd Floor', ac: true, projector: true, incharge: 'Dr. P. B. Deshmukh' },
        { id: 'LAB 201', name: 'Advanced Software Lab', location: 'Block B, 1st Floor', capacity: 40, totalResources: 40, status: 'Available', floor: '1st Floor', ac: true, projector: true, incharge: 'Prof. V. S. Pawar' },
        { id: 'LAB 202', name: 'Cloud Computing Lab', location: 'Block B, 1st Floor', capacity: 30, totalResources: 30, status: 'Available', floor: '1st Floor', ac: true, projector: true, incharge: 'Prof. K. H. Shinde' },
        { id: 'LAB 203', name: 'Mobile Application Lab', location: 'Block B, 2nd Floor', capacity: 35, totalResources: 35, status: 'Available', floor: '2nd Floor', ac: true, projector: true, incharge: 'Prof. N. D. Thorat' },
        { id: 'LAB 204', name: 'Computer Lab 4 (High Performance)', location: 'Block B, 2nd Floor', capacity: 40, totalResources: 40, status: 'Maintenance', floor: '2nd Floor', ac: true, projector: true, incharge: 'Prof. T. G. More' },
        { id: 'LAB 301', name: 'Project & Research Lab', location: 'Block C, Ground Floor', capacity: 25, totalResources: 25, status: 'Available', floor: 'Ground', ac: true, projector: true, incharge: 'Dr. S. A. Bhosale' },
        { id: 'LAB 302', name: 'Robotics & Automation Lab', location: 'Block C, 1st Floor', capacity: 30, totalResources: 30, status: 'Busy', floor: '1st Floor', ac: true, projector: true, incharge: 'Prof. D. J. Jadhav' },
        { id: 'LAB 303', name: 'Open Innovation Lab', location: 'Block C, 2nd Floor', capacity: 50, totalResources: 50, status: 'Available', floor: '2nd Floor', ac: true, projector: true, incharge: 'Prof. Y. R. Kadam' }
    ],

    resources: [
        // LAB 204 Resources
        { id: 'PC-01', name: 'Workstation 01', type: 'PC', lab: 'LAB 204', status: 'Available', specs: 'Intel i7 12th Gen, 32GB RAM, RTX 3060', lastUpdated: '2026-08-24 09:30' },
        { id: 'PC-02', name: 'Workstation 02', type: 'PC', lab: 'LAB 204', status: 'Occupied', specs: 'Intel i7 12th Gen, 32GB RAM, RTX 3060', lastUpdated: '2026-08-24 10:00' },
        { id: 'PC-03', name: 'Workstation 03', type: 'PC', lab: 'LAB 204', status: 'Available', specs: 'Intel i7 12th Gen, 32GB RAM, RTX 3060', lastUpdated: '2026-08-24 09:15' },
        { id: 'PC-04', name: 'Workstation 04', type: 'PC', lab: 'LAB 204', status: 'Maintenance', specs: 'Intel i7 12th Gen, 32GB RAM, RTX 3060 (Keyboard issue)', lastUpdated: '2026-08-24 08:45' },
        { id: 'PC-05', name: 'Workstation 05', type: 'PC', lab: 'LAB 204', status: 'Reserved', specs: 'Intel i7 12th Gen, 32GB RAM, RTX 3060 (Faculty Session)', lastUpdated: '2026-08-24 10:15' },
        { id: 'PC-06', name: 'Workstation 06', type: 'PC', lab: 'LAB 204', status: 'Available', specs: 'Intel i7 12th Gen, 32GB RAM, RTX 3060', lastUpdated: '2026-08-24 09:00' },
        { id: 'PRJ-204', name: '4K Interactive Projector', type: 'Projector', lab: 'LAB 204', status: 'Available', specs: 'Epson Laser 4K 5000 Lumens', lastUpdated: '2026-08-24 08:00' },
        { id: 'PRN-204', name: 'High-Speed Network Laser', type: 'Printer', lab: 'LAB 204', status: 'Available', specs: 'HP LaserJet Pro M404dn duplex', lastUpdated: '2026-08-24 08:00' },
        { id: 'SW-204', name: 'Gigabit Managed Switch', type: 'Other Equipment', lab: 'LAB 204', status: 'Maintenance', specs: 'Cisco Catalyst 48-Port PoE+', lastUpdated: '2026-08-24 07:30' },

        // LAB 101 Resources
        { id: 'PC-101-01', name: 'Desktop 01', type: 'PC', lab: 'LAB 101', status: 'Available', specs: 'Intel i5 11th Gen, 16GB RAM, SSD 512GB', lastUpdated: '2026-08-24 09:00' },
        { id: 'PC-101-02', name: 'Desktop 02', type: 'PC', lab: 'LAB 101', status: 'Available', specs: 'Intel i5 11th Gen, 16GB RAM, SSD 512GB', lastUpdated: '2026-08-24 09:00' },
        { id: 'PC-101-03', name: 'Desktop 03', type: 'PC', lab: 'LAB 101', status: 'Occupied', specs: 'Intel i5 11th Gen, 16GB RAM, SSD 512GB', lastUpdated: '2026-08-24 10:05' },
        { id: 'PRJ-101', name: 'Full HD Ceiling Projector', type: 'Projector', lab: 'LAB 101', status: 'Available', specs: 'BenQ MH535FHD 3600 Lumens', lastUpdated: '2026-08-24 08:00' },
        { id: 'PRN-101', name: 'Network Printer 101', type: 'Printer', lab: 'LAB 101', status: 'Available', specs: 'Canon imageCLASS LBP226dw', lastUpdated: '2026-08-24 08:00' },

        // LAB 102 Resources
        { id: 'PC-102-01', name: 'Desktop 01', type: 'PC', lab: 'LAB 102', status: 'Occupied', specs: 'Intel i5 11th Gen, 16GB RAM, SSD 512GB', lastUpdated: '2026-08-24 10:00' },
        { id: 'PC-102-02', name: 'Desktop 02', type: 'PC', lab: 'LAB 102', status: 'Occupied', specs: 'Intel i5 11th Gen, 16GB RAM, SSD 512GB', lastUpdated: '2026-08-24 10:00' },
        { id: 'PC-102-03', name: 'Desktop 03', type: 'PC', lab: 'LAB 102', status: 'Maintenance', specs: 'Intel i5 11th Gen, RAM error', lastUpdated: '2026-08-24 08:30' },
        { id: 'PRJ-102', name: 'Smart Interactive Board', type: 'Projector', lab: 'LAB 102', status: 'Occupied', specs: 'Newline Interactive 75"', lastUpdated: '2026-08-24 10:00' },

        // LAB 105 Resources (Faculty Reserved)
        { id: 'PC-105-01', name: 'Security Rig 01', type: 'PC', lab: 'LAB 105', status: 'Reserved', specs: 'AMD Ryzen 7, 32GB RAM, Dual NIC', lastUpdated: '2026-08-24 09:00' },
        { id: 'PC-105-02', name: 'Security Rig 02', type: 'PC', lab: 'LAB 105', status: 'Reserved', specs: 'AMD Ryzen 7, 32GB RAM, Dual NIC', lastUpdated: '2026-08-24 09:00' },
        { id: 'SRV-105', name: 'Threat Lab Server Rack', type: 'Other Equipment', lab: 'LAB 105', status: 'Reserved', specs: 'Dell PowerEdge R750 64-Core', lastUpdated: '2026-08-24 09:00' },

        // LAB 201 Resources
        { id: 'PC-201-01', name: 'Dev Station 01', type: 'PC', lab: 'LAB 201', status: 'Available', specs: 'Apple Mac Mini M2 16GB', lastUpdated: '2026-08-24 09:00' },
        { id: 'PC-201-02', name: 'Dev Station 02', type: 'PC', lab: 'LAB 201', status: 'Available', specs: 'Apple Mac Mini M2 16GB', lastUpdated: '2026-08-24 09:00' },
        { id: 'PRJ-201', name: 'Laser Ultra-Short Throw', type: 'Projector', lab: 'LAB 201', status: 'Available', specs: 'Optoma CinemaX P2', lastUpdated: '2026-08-24 08:00' }
    ],

    users: [
        { id: '2403144', name: 'Atharv Patil', email: 'atharvpatil@gmail.com', role: 'Student', department: 'Computer Engineering', status: 'Active', lastLogin: 'Today, 10:20 AM', bookingsCount: 5 },
        { id: 'FAC-108', name: 'Prof. Rajesh Kulkarni', email: 'faculty@ritindia.edu', role: 'Faculty', department: 'Information Technology', status: 'Active', lastLogin: 'Today, 10:15 AM', bookingsCount: 12 },
        { id: 'FAC-109', name: 'Dr. Sunita Deshmukh', email: 's.deshmukh@ritindia.edu', role: 'Faculty', department: 'Computer Engineering', status: 'Active', lastLogin: 'Today, 09:40 AM', bookingsCount: 8 },
        { id: 'LAB-002', name: 'Ramesh Sawant', email: 'labassistant@ritindia.edu', role: 'Lab Assistant', department: 'Central Computing Facility', status: 'Active', lastLogin: 'Today, 08:30 AM', bookingsCount: 0 },
        { id: 'ADM-001', name: 'System Administrator', email: 'admin@ritindia.edu', role: 'Admin', department: 'Campus IT Infrastructure', status: 'Active', lastLogin: 'Today, 10:35 AM', bookingsCount: 0 },
        { id: '2403150', name: 'Sneha Shinde', email: 'sneha.shinde@ritindia.edu', role: 'Student', department: 'AI & Data Science', status: 'Active', lastLogin: 'Today, 09:12 AM', bookingsCount: 3 },
        { id: '2403162', name: 'Rohan Joshi', email: 'rohan.joshi@ritindia.edu', role: 'Student', department: 'Computer Engineering', status: 'Inactive', lastLogin: '3 days ago', bookingsCount: 1 },
        { id: 'FAC-114', name: 'Prof. Amit Verma', email: 'a.verma@ritindia.edu', role: 'Faculty', department: 'Electronics & Telecom', status: 'Active', lastLogin: 'Yesterday, 04:45 PM', bookingsCount: 6 },
        { id: 'LAB-005', name: 'Pooja Naik', email: 'p.naik@ritindia.edu', role: 'Lab Assistant', department: 'Block B Laboratories', status: 'Active', lastLogin: 'Today, 08:50 AM', bookingsCount: 0 }
    ],

    bookingRequests: [
        { 
            id: 'REQ-101', 
            user: 'Atharv Patil', 
            userId: '2403144',
            role: 'Student', 
            lab: 'LAB 204', 
            date: '2026-08-24', 
            startTime: '10:00', 
            endTime: '12:00', 
            status: 'Alternative Suggested', 
            priority: 'NORMAL',
            engineStatus: 'Conflict with Faculty Request (REQ-102)',
            allocatedResource: 'Suggested LAB 201 via Team B DSA Engine',
            submittedAt: '2026-08-24 09:15',
            purpose: 'Operating Systems Kernel Simulation'
        },
        { 
            id: 'REQ-102', 
            user: 'Prof. Rajesh Kulkarni', 
            userId: 'FAC-108',
            role: 'Faculty', 
            lab: 'LAB 204', 
            date: '2026-08-24', 
            startTime: '10:00', 
            endTime: '12:00', 
            status: 'Approved', 
            priority: 'HIGH',
            engineStatus: 'Preempted Student Request (Team A OS Priority Locking)',
            allocatedResource: 'Entire LAB 204 (40 PCs)',
            submittedAt: '2026-08-24 09:30',
            purpose: 'Advanced Distributed Systems Lab Exam'
        },
        { 
            id: 'REQ-103', 
            user: 'Sneha Shinde', 
            userId: '2403150',
            role: 'Student', 
            lab: 'LAB 101', 
            date: '2026-08-24', 
            startTime: '14:00', 
            endTime: '16:00', 
            status: 'Approved', 
            priority: 'NORMAL',
            engineStatus: 'Allocated by Team A OS Scheduler',
            allocatedResource: 'PC-101-04 to PC-101-07',
            submittedAt: '2026-08-24 09:45',
            purpose: 'Machine Learning Model Training'
        },
        { 
            id: 'REQ-104', 
            user: 'Dr. Sunita Deshmukh', 
            userId: 'FAC-109',
            role: 'Faculty', 
            lab: 'LAB 105', 
            date: '2026-08-24', 
            startTime: '13:00', 
            endTime: '17:00', 
            status: 'Approved', 
            priority: 'HIGH',
            engineStatus: 'Locked Entire Lab (Team A Priority Preemption)',
            allocatedResource: 'Entire LAB 105 (40 PCs + Server)',
            submittedAt: '2026-08-24 08:20',
            purpose: 'Cybersecurity Ethical Hacking Workshop'
        },
        { 
            id: 'REQ-105', 
            user: 'Rohan Joshi', 
            userId: '2403162',
            role: 'Student', 
            lab: 'LAB 103', 
            date: '2026-08-25', 
            startTime: '11:00', 
            endTime: '13:00', 
            status: 'Pending', 
            priority: 'NORMAL',
            engineStatus: 'In Scheduling Queue (Team A)',
            allocatedResource: 'Pending Engine Match',
            submittedAt: '2026-08-24 10:10',
            purpose: 'Cloud Native Microservices Project'
        },
        { 
            id: 'REQ-106', 
            user: 'Prof. Amit Verma', 
            userId: 'FAC-114',
            role: 'Faculty', 
            lab: 'LAB 202', 
            date: '2026-08-25', 
            startTime: '15:00', 
            endTime: '17:00', 
            status: 'Approved', 
            priority: 'HIGH',
            engineStatus: 'Scheduled (Team A)',
            allocatedResource: 'Entire LAB 202',
            submittedAt: '2026-08-24 09:50',
            purpose: 'Cloud Architecture Hands-on Demo'
        }
    ],

    maintenanceRequests: [
        { 
            id: 'MNT-201', 
            type: 'Resource',
            targetId: 'PC-04', 
            lab: 'LAB 204', 
            issue: 'Mechanical keyboard keys stick & intermittent USB port failure', 
            status: 'Under Maintenance', 
            priority: 'Medium',
            reportedBy: 'Atharv Patil (Student)',
            reportedAt: '2026-08-24 08:45',
            assignedTo: 'Ramesh Sawant (Lab Assistant)',
            resolutionNotes: ''
        },
        { 
            id: 'MNT-202', 
            type: 'Lab',
            targetId: 'LAB 204', 
            lab: 'LAB 204', 
            issue: 'Core network switch firmware upgrade and patch panel rewiring', 
            status: 'Under Maintenance', 
            priority: 'High',
            reportedBy: 'System Administrator',
            reportedAt: '2026-08-24 07:30',
            assignedTo: 'Campus Network Team',
            resolutionNotes: ''
        },
        { 
            id: 'MNT-203', 
            type: 'Resource',
            targetId: 'PC-102-03', 
            lab: 'LAB 102', 
            issue: 'RAM parity error during stress test. Replacement ordered.', 
            status: 'Under Maintenance', 
            priority: 'Medium',
            reportedBy: 'Pooja Naik (Lab Assistant)',
            reportedAt: '2026-08-24 08:30',
            assignedTo: 'Hardware Vendor',
            resolutionNotes: ''
        },
        { 
            id: 'MNT-198', 
            type: 'Resource',
            targetId: 'PRJ-101', 
            lab: 'LAB 101', 
            issue: 'HDMI input flickering at 1080p resolution', 
            status: 'Completed', 
            priority: 'Low',
            reportedBy: 'Prof. S. R. Patil',
            reportedAt: '2026-08-23 11:00',
            assignedTo: 'AV Support',
            resolvedAt: '2026-08-23 16:30',
            resolutionNotes: 'Replaced damaged HDMI splitter cable and recalibrated color output.'
        },
        { 
            id: 'MNT-195', 
            type: 'Lab',
            targetId: 'LAB 104', 
            lab: 'LAB 104', 
            issue: 'AC unit thermal overload trip', 
            status: 'Completed', 
            priority: 'High',
            reportedBy: 'Prof. R. V. Mane',
            reportedAt: '2026-08-22 14:00',
            assignedTo: 'Campus Maintenance',
            resolvedAt: '2026-08-23 09:00',
            resolutionNotes: 'Compressor serviced, refrigerant recharged, thermal sensors verified.'
        }
    ],

    activityLogs: [
        { time: '10:35 AM', actor: 'Admin', role: 'Admin', module: 'System', action: 'Admin Dashboard Session Initialized', resource: 'Admin Portal', result: 'Success' },
        { time: '10:30 AM', actor: 'Admin', role: 'Admin', module: 'Lab Management', action: 'Maintenance Status Enabled', resource: 'LAB 204', result: 'Maintenance State Active' },
        { time: '10:26 AM', actor: 'Team C (DBMS)', role: 'DBMS Engine', module: 'Database', action: 'Transactional Record Commit', resource: 'REQ-102', result: 'Saved to Master DB' },
        { time: '10:25 AM', actor: 'Team A (OS Engine)', role: 'OS Engine', module: 'Scheduling', action: 'Priority Preemption Executed', resource: 'LAB 204', result: 'Faculty Approved, Student Re-routed' },
        { time: '10:20 AM', actor: 'Prof. Rajesh Kulkarni', role: 'Faculty', module: 'Booking Engine', action: 'Submitted High-Priority Reservation', resource: 'LAB 204', result: 'Submitted (HIGH)' },
        { time: '10:10 AM', actor: 'Rohan Joshi', role: 'Student', module: 'Booking Engine', action: 'Submitted Lab Slot Request', resource: 'LAB 103', result: 'Queued in Team A' },
        { time: '09:45 AM', actor: 'Sneha Shinde', role: 'Student', module: 'Booking Engine', action: 'Lab Slot Allocated', resource: 'LAB 101', result: 'Approved by Team A' },
        { time: '09:30 AM', actor: 'Team B (DSA Engine)', role: 'DSA Engine', module: 'Recommendation', action: 'Graph Path Finding for Optimal Alternative', resource: 'LAB 201', result: 'Alternative Suggested' },
        { time: '08:45 AM', actor: 'Atharv Patil', role: 'Student', module: 'Maintenance', action: 'Reported Hardware Fault', resource: 'PC-04 (LAB 204)', result: 'Ticket MNT-201 Logged' }
    ]
};

// Initialize State from localStorage or fallback
function getLocalState() {
    try {
        const saved = localStorage.getItem(DB_STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.warn('localStorage read error, using default mock state', e);
    }
    return defaultMockData;
}

function saveLocalState(state) {
    try {
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('localStorage write error', e);
    }
}

// In-memory working state
let db = getLocalState();

/**
 * Public API Object
 * Provides REST-ready Async methods
 */
const API = {
    // ----------------------------------------------------
    // ADMIN DASHBOARD REST API PLACEHOLDERS
    // ----------------------------------------------------

    getDashboardStats: async () => {
        // Simulates async REST API: GET /api/admin/dashboard-stats
        const labs = db.labs;
        const resources = db.resources;
        const requests = db.bookingRequests;
        const maintenance = db.maintenanceRequests;

        const totalLabs = labs.length;
        const availableLabs = labs.filter(l => l.status === 'Available').length;
        const busyLabs = labs.filter(l => l.status === 'Busy' || l.status === 'Full').length;
        const maintenanceLabs = labs.filter(l => l.status === 'Maintenance').length;
        const facultyReservedLabs = labs.filter(l => l.status === 'Faculty Reserved').length;

        const pendingRequests = requests.filter(r => r.status === 'Pending').length;
        const activeBookings = requests.filter(r => r.status === 'Approved').length;
        const totalResourcesCount = labs.reduce((sum, l) => sum + (l.totalResources || 40), 0);
        const activeMaintenanceCount = maintenance.filter(m => m.status === 'Under Maintenance').length;

        return {
            totalLabs,
            availableLabs,
            busyLabs,
            maintenanceLabs,
            facultyReservedLabs,
            pendingRequests,
            activeBookings,
            totalResources: totalResourcesCount,
            maintenanceRequests: activeMaintenanceCount
        };
    },

    getLabs: async () => {
        // Simulates async REST API: GET /api/admin/labs
        return [...db.labs];
    },

    getResources: async (labId = null) => {
        // Simulates async REST API: GET /api/admin/resources?lab=...
        if (!labId || labId === 'all') {
            return [...db.resources];
        }
        return db.resources.filter(r => r.lab === labId);
    },

    getUsers: async () => {
        // Simulates async REST API: GET /api/admin/users
        return [...db.users];
    },

    getBookingRequests: async () => {
        // Simulates async REST API: GET /api/admin/booking-requests
        return [...db.bookingRequests];
    },

    getMaintenanceRequests: async () => {
        // Simulates async REST API: GET /api/admin/maintenance
        return [...db.maintenanceRequests];
    },

    getActivityLogs: async () => {
        // Simulates async REST API: GET /api/admin/activity-logs
        return [...db.activityLogs];
    },

    getReports: async () => {
        // Simulates async REST API: GET /api/admin/reports
        return {
            labUtilization: [
                { lab: 'LAB 101', name: 'Computer Lab 1', utilization: 80, activeHours: 6.4, color: '#3b82f6' },
                { lab: 'LAB 102', name: 'Computer Lab 2', utilization: 65, activeHours: 5.2, color: '#10b981' },
                { lab: 'LAB 103', name: 'AI & Data Science Lab', utilization: 92, activeHours: 7.4, color: '#8b5cf6' },
                { lab: 'LAB 105', name: 'Network & Security Lab', utilization: 75, activeHours: 6.0, color: '#ec4899' },
                { lab: 'LAB 201', name: 'Advanced Software Lab', utilization: 45, activeHours: 3.6, color: '#f59e0b' },
                { lab: 'LAB 204', name: 'High Performance Lab', utilization: 70, activeHours: 5.6, color: '#ef4444' },
                { lab: 'LAB 302', name: 'Robotics Lab', utilization: 60, activeHours: 4.8, color: '#06b6d4' }
            ],
            bookingStats: {
                totalSubmitted: 148,
                approved: 112,
                alternativeSuggested: 22,
                rejected: 8,
                pending: 6
            },
            roleComparison: {
                facultyRequests: 62,
                facultyPercentage: 42,
                studentRequests: 86,
                studentPercentage: 58
            },
            maintenanceMetrics: {
                totalTickets: 34,
                resolvedThisMonth: 31,
                underMaintenance: 3,
                meanTimeToRepairHours: 3.4
            },
            peakHours: [
                { slot: '08:00 - 10:00', load: 45 },
                { slot: '10:00 - 12:00', load: 95 },
                { slot: '12:00 - 14:00', load: 60 },
                { slot: '14:00 - 16:00', load: 90 },
                { slot: '16:00 - 18:00', load: 50 }
            ]
        };
    },

    updateLabStatus: async (labId, newStatus, reason = '') => {
        // Simulates async REST API: PATCH /api/admin/labs/:id/status
        const lab = db.labs.find(l => l.id === labId);
        if (!lab) throw new Error(`Lab ${labId} not found`);

        const oldStatus = lab.status;
        lab.status = newStatus;
        saveLocalState(db);

        // Add to activity log
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        db.activityLogs.unshift({
            time: timeStr,
            actor: 'Admin',
            role: 'Admin',
            module: 'Lab Management',
            action: `Changed Status: ${oldStatus} → ${newStatus}`,
            resource: `${labId} (${reason || 'Admin Action'})`,
            result: 'Updated'
        });

        // If put in maintenance, also update or create maintenance ticket
        if (newStatus === 'Maintenance') {
            const existing = db.maintenanceRequests.find(m => m.targetId === labId && m.status === 'Under Maintenance');
            if (!existing) {
                db.maintenanceRequests.unshift({
                    id: 'MNT-' + Math.floor(200 + Math.random() * 800),
                    type: 'Lab',
                    targetId: labId,
                    lab: labId,
                    issue: reason || 'Scheduled Laboratory Maintenance',
                    status: 'Under Maintenance',
                    priority: 'High',
                    reportedBy: 'System Administrator',
                    reportedAt: `${now.toISOString().split('T')[0]} ${timeStr}`,
                    assignedTo: 'Campus Maintenance Team',
                    resolutionNotes: ''
                });
            }
        }

        saveLocalState(db);
        return { success: true, lab };
    },

    updateResourceStatus: async (resourceId, newStatus, reason = '') => {
        // Simulates async REST API: PATCH /api/admin/resources/:id/status
        const res = db.resources.find(r => r.id === resourceId);
        if (!res) throw new Error(`Resource ${resourceId} not found`);

        const oldStatus = res.status;
        res.status = newStatus;
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        res.lastUpdated = `${now.toISOString().split('T')[0]} ${timeStr}`;

        // Add to activity log
        db.activityLogs.unshift({
            time: timeStr,
            actor: 'Admin',
            role: 'Admin',
            module: 'Resource Management',
            action: `Resource State: ${oldStatus} → ${newStatus}`,
            resource: `${res.id} in ${res.lab}`,
            result: 'Updated'
        });

        // If maintenance, log ticket
        if (newStatus === 'Maintenance') {
            const existing = db.maintenanceRequests.find(m => m.targetId === resourceId && m.status === 'Under Maintenance');
            if (!existing) {
                db.maintenanceRequests.unshift({
                    id: 'MNT-' + Math.floor(300 + Math.random() * 700),
                    type: 'Resource',
                    targetId: resourceId,
                    lab: res.lab,
                    issue: reason || `Hardware inspection needed for ${res.name}`,
                    status: 'Under Maintenance',
                    priority: 'Medium',
                    reportedBy: 'System Administrator',
                    reportedAt: `${now.toISOString().split('T')[0]} ${timeStr}`,
                    assignedTo: 'Hardware Vendor Support',
                    resolutionNotes: ''
                });
            }
        }

        saveLocalState(db);
        return { success: true, resource: res };
    },

    completeMaintenance: async (ticketId, resolutionNotes = 'Resolved by technician') => {
        // Simulates async REST API: POST /api/admin/maintenance/:id/complete
        const ticket = db.maintenanceRequests.find(t => t.id === ticketId);
        if (!ticket) throw new Error(`Ticket ${ticketId} not found`);

        ticket.status = 'Completed';
        ticket.resolutionNotes = resolutionNotes;
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        ticket.resolvedAt = `${now.toISOString().split('T')[0]} ${timeStr}`;

        // If target was a lab or resource, restore to Available if it was still in maintenance
        if (ticket.type === 'Lab') {
            const lab = db.labs.find(l => l.id === ticket.targetId);
            if (lab && lab.status === 'Maintenance') {
                lab.status = 'Available';
            }
        } else if (ticket.type === 'Resource') {
            const res = db.resources.find(r => r.id === ticket.targetId);
            if (res && res.status === 'Maintenance') {
                res.status = 'Available';
                res.lastUpdated = `${now.toISOString().split('T')[0]} ${timeStr}`;
            }
        }

        db.activityLogs.unshift({
            time: timeStr,
            actor: 'Admin',
            role: 'Admin',
            module: 'Maintenance',
            action: `Ticket ${ticketId} Completed`,
            resource: `${ticket.targetId} (${ticket.lab})`,
            result: 'Resolved'
        });

        saveLocalState(db);
        return { success: true, ticket };
    },

    createMaintenanceTicket: async (ticketData) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newTicket = {
            id: 'MNT-' + Math.floor(400 + Math.random() * 600),
            type: ticketData.type || 'Resource',
            targetId: ticketData.targetId,
            lab: ticketData.lab,
            issue: ticketData.issue,
            status: 'Under Maintenance',
            priority: ticketData.priority || 'Medium',
            reportedBy: ticketData.reportedBy || 'System Administrator',
            reportedAt: `${now.toISOString().split('T')[0]} ${timeStr}`,
            assignedTo: ticketData.assignedTo || 'Campus Maintenance Team',
            resolutionNotes: ''
        };

        db.maintenanceRequests.unshift(newTicket);

        // Update target status
        if (newTicket.type === 'Lab') {
            const lab = db.labs.find(l => l.id === newTicket.targetId);
            if (lab) lab.status = 'Maintenance';
        } else {
            const res = db.resources.find(r => r.id === newTicket.targetId);
            if (res) {
                res.status = 'Maintenance';
                res.lastUpdated = `${now.toISOString().split('T')[0]} ${timeStr}`;
            }
        }

        db.activityLogs.unshift({
            time: timeStr,
            actor: 'Admin',
            role: 'Admin',
            module: 'Maintenance',
            action: `New Maintenance Ticket Logged`,
            resource: `${newTicket.targetId} (${newTicket.lab})`,
            result: `Ticket ${newTicket.id} Created`
        });

        saveLocalState(db);
        return { success: true, ticket: newTicket };
    },

    resetDatabaseToDefaults: () => {
        db = JSON.parse(JSON.stringify(defaultMockData));
        saveLocalState(db);
        return true;
    },

    // ----------------------------------------------------
    // PREVIOUS EXISTING INTEGRATIONS (For Student & Faculty compatibility)
    // ----------------------------------------------------

    // TEAM A INTEGRATION (OS Engine - Scheduling & Allocation)
    getSchedulingStatus: async (requestId) => {
        console.log(`[Team A] Fetching scheduling status for ${requestId}`);
        return { status: 'Scheduling' };
    },
    
    getAllocationStatus: async (requestId) => {
        console.log(`[Team A] Fetching allocation status for ${requestId}`);
        return { 
            status: 'Approved',
            allocatedLab: 'Lab 204'
        };
    },

    // TEAM B INTEGRATION (DSA Engine - Recommendation)
    getResourceRecommendation: async (date, time, capacity) => {
        console.log('[Team B] Generating resource recommendation...');
        return new Promise(resolve => setTimeout(() => resolve({
            suggestedLab: 'LAB 204',
            reason: 'Best available resource for requested time and capacity.'
        }), 500));
    },

    // TEAM C INTEGRATION (DBMS Engine - Database)
    createBookingRequest: async (bookingData) => {
        console.log('[Team C] Saving new booking request...', bookingData);
        return new Promise(resolve => setTimeout(() => {
            const requestId = 'REQ-' + Math.floor(1000 + Math.random() * 9000);
            resolve({ success: true, requestId: requestId });
        }, 800));
    },

    getMyBookings: async () => {
        console.log('[Team C] Fetching student bookings...');
        return {
            pending: [
                { id: 'REQ-001', lab: 'LAB 204', date: '2026-08-17', time: '10:00 - 12:00', submitted: '2026-08-16', status: 'Pending' },
                { id: 'REQ-002', lab: 'LAB 101', date: '2026-08-18', time: '14:00 - 16:00', submitted: '2026-08-16', status: 'Scheduling' }
            ],
            approved: [
                { id: 'BK-001', lab: 'LAB 204', date: '2026-08-17', time: '10:00 - 12:00', status: 'Confirmed' }
            ]
        };
    },

    getBookingStatus: async (requestId) => {
        console.log(`[Team C] Fetching status details for ${requestId}`);
        return {
            id: requestId,
            lab: 'LAB 204',
            date: '17 August 2026',
            time: '10:00 AM – 12:00 PM',
            purpose: 'Programming Practice',
            currentStatus: 'Scheduling'
        };
    },

    getAvailableLabs: async () => {
        console.log('[Team C] Fetching all labs...');
        return db.labs.map(l => ({
            id: l.id.replace(/\s+/g, ''),
            name: l.id,
            total: l.capacity,
            status: l.status
        }));
    },

    // FACULTY SPECIFIC INTEGRATION
    submitFacultyBookingRequest: async (bookingData) => {
        console.log('[Team C] Saving new FACULTY booking request...', bookingData);
        return new Promise(resolve => setTimeout(() => {
            const requestId = 'REQ-F' + Math.floor(1000 + Math.random() * 9000);
            resolve({ success: true, requestId: requestId });
        }, 800));
    },

    getFacultyRequests: async () => {
        console.log('[Team C] Fetching faculty bookings...');
        return {
            pending: [
                { id: 'REQ-F1024', lab: 'LAB 204', date: '2026-08-17', time: '10:00 - 12:00', status: 'Pending' }
            ],
            approved: [
                { id: 'BK-F001', lab: 'LAB 201', date: '2026-08-19', time: '14:00 - 16:00', status: 'Faculty Reserved' }
            ]
        };
    }
};

// Make accessible globally
window.API = API;
