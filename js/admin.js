/**
 * js/admin.js
 * Admin Dashboard Controller for Smart Campus Lab & Resource Optimizer
 * 
 * Implements:
 * - Strict Admin Role Verification & Routing
 * - Live Polling Telemetry (5000ms default)
 * - Safe Lab & Resource Status Transitions with Confirmation Guards
 * - Maintenance Ticket Management & Resolution
 * - Booking Monitoring & Faculty Priority Visualization
 * - User Directory Search & Filtering
 * - Pure CSS & Canvas Data Visualizations
 * - Activity Log Auditing & Data Export
 */

document.addEventListener('DOMContentLoaded', async () => {
    // ==========================================
    // 1. SECURITY & ROLE VERIFICATION
    // ==========================================
    if (window.Auth) {
        Auth.verifyRole('Admin');
    }

    // Handle Admin Logout
    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to log out from the Admin Panel?')) {
                Auth.logout();
            }
        });
    }

    // ==========================================
    // 2. STATE & CONFIGURATION
    // ==========================================
    let currentSection = 'overview';
    let pollingIntervalMs = 5000;
    let pollingTimer = null;
    let labsViewMode = 'table'; // 'table' or 'card'

    // Cached API Data
    let cachedStats = null;
    let cachedLabs = [];
    let cachedResources = [];
    let cachedUsers = [];
    let cachedBookings = [];
    let cachedMaintenance = [];
    let cachedLogs = [];
    let cachedReports = null;

    // Filter states
    let labsFilterStatus = 'all';
    let labsSearchQuery = '';

    // CHANGED:
    // Show resources from ALL laboratories by default.
    // Admin and Lab Assistant now see the same shared resource state.
    let resLabFilter = 'all';
    let resTypeFilter = 'all';
    let resStatusFilter = 'all';
    let resSearchQuery = '';

    let mntTabFilter = 'active';
    let mntSearchQuery = '';

    let bookingsRoleFilter = 'all';
    let bookingsStatusFilter = 'all';
    let bookingsSearchQuery = '';

    let userRoleFilter = 'all';
    let userSearchQuery = '';

    let logsModuleFilter = 'all';
    let logsSearchQuery = '';

    // Action staging states for modals
    let pendingLabAction = { labId: null, targetStatus: null };
    let pendingResAction = { resourceId: null, targetStatus: null, isReservedOrOccupied: false };
    let pendingMntResolution = { ticketId: null };

    // ==========================================
    // 3. UI ELEMENT REFERENCES
    // ==========================================
    const sidebar = document.getElementById('admin-sidebar');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const navItems = document.querySelectorAll('.admin-nav-item[data-section]');
    const sections = document.querySelectorAll('.admin-section');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    const liveIndicator = document.getElementById('live-indicator');
    const liveText = document.getElementById('live-text');

    // ==========================================
    // 4. TOAST NOTIFICATION SYSTEM
    // ==========================================
    const showToast = (message, type = 'success') => {
        const container = document.getElementById('admin-toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `admin-toast ${type}`;
        
        let icon = 'â„¹ï¸';
        if (type === 'success') icon = 'âœ…';
        if (type === 'warning') icon = 'âš ï¸';
        if (type === 'error') icon = 'âŒ';

        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    // ==========================================
    // 5. MODAL CONTROLLERS
    // ==========================================
    const openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    };

    const closeModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    };

    // Global modal close triggers
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-close');
            closeModal(targetId);
        });
    });

    // Close modal on click outside
    document.querySelectorAll('.admin-modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    // ==========================================
    // 6. NAVIGATION & ROUTING
    // ==========================================
    const sectionMetadata = {
        overview: { title: 'Overview', subtitle: 'Campus lab allocation, hardware health, and engine telemetry' },
        labs: { title: 'Lab Management', subtitle: 'Inspect physical laboratory capacity, location specs, and operational maintenance' },
        resources: { title: 'Resource Management', subtitle: 'Granular inventory tracking of PCs, Projectors, Printers, and Network gear' },
        maintenance: { title: 'Maintenance & Equipment Health', subtitle: 'Track reported equipment anomalies, repairs, and resolution audit notes' },
        bookings: { title: 'Booking Requests Monitor', subtitle: 'Oversee faculty & student reservation queues and Team A OS Engine scheduling' },
        users: { title: 'User Directory', subtitle: 'Registered students, faculty members, lab assistants, and system administrators' },
        reports: { title: 'Reports & Analytics', subtitle: 'Campus laboratory utilization, booking throughput, and hardware reliability metrics' },
        logs: { title: 'System Activity Logs', subtitle: 'Trace immutable transactions across Team A, Team B, Team C, and Admin Portal' },
        settings: { title: 'Admin Settings', subtitle: 'Configure polling frequency, engine parameters, and campus lab operating hours' }
    };

    const switchSection = (sectionId) => {
        if (!sectionMetadata[sectionId]) return;
        currentSection = sectionId;

        // Update nav links
        navItems.forEach(item => {
            if (item.dataset.section === sectionId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update sections
        sections.forEach(sec => {
            if (sec.id === sectionId) {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });

        // Update headers
        pageTitle.textContent = sectionMetadata[sectionId].title;
        pageSubtitle.textContent = sectionMetadata[sectionId].subtitle;

        // Close mobile drawer
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }

        // Render target section
        renderCurrentSection();
    };

    // Nav click handlers
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
            window.location.hash = section;
        });
    });

    // Mobile sidebar toggle
    if (openSidebarBtn) openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));

    // Check initial URL hash
    if (window.location.hash) {
        const hashSection = window.location.hash.replace('#', '');
        if (sectionMetadata[hashSection]) {
            switchSection(hashSection);
        }
    }

    // ==========================================
    // 7. DATA FETCHING & POLLING ENGINE
    // ==========================================
    const refreshDashboardData = async (isBackgroundPoll = false) => {
        try {
            if (!isBackgroundPoll) {
                liveText.textContent = 'Syncing...';
            }

            // Fetch from API
            const [stats, labs, resources, users, bookings, maintenance, logs, reports] = await Promise.all([
                API.getDashboardStats(),
                API.getLabs(),
                API.getResources(),
                API.getUsers(),
                API.getBookingRequests(),
                API.getMaintenanceRequests(),
                API.getActivityLogs(),
                API.getReports()
            ]);

            cachedStats = stats;
            cachedLabs = labs;
            cachedResources = resources;
            cachedUsers = users;
            cachedBookings = bookings;
            cachedMaintenance = maintenance;
            cachedLogs = logs;
            cachedReports = reports;

            // Update Badges in Sidebar
            const activeMnt = maintenance.filter(m => m.status === 'Under Maintenance').length;
            const sidebarMntBadge = document.getElementById('sidebar-mnt-badge');
            if (sidebarMntBadge) sidebarMntBadge.textContent = activeMnt;

            const pendingBookings = bookings.filter(b => String(b.status || '').toLowerCase() === 'pending').length;
            const sidebarReqBadge = document.getElementById('sidebar-req-badge');
            if (sidebarReqBadge) sidebarReqBadge.textContent = pendingBookings;

            const notifCount = document.getElementById('notif-count');
            if (notifCount) notifCount.textContent = activeMnt + pendingBookings;

            // Re-render visible section
            renderCurrentSection();

            liveText.textContent = pollingIntervalMs > 0 ? `Live Sync (${pollingIntervalMs/1000}s)` : 'Manual Sync';
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            liveText.textContent = 'Sync Error';
        }
    };

    const startLivePolling = () => {
        if (pollingTimer) clearInterval(pollingTimer);
        if (pollingIntervalMs > 0) {
            pollingTimer = setInterval(() => {
                refreshDashboardData(true);
            }, pollingIntervalMs);
        }
    };

    // ==========================================
    // 8. SECTION RENDERERS
    // ==========================================

    const renderCurrentSection = () => {
        switch (currentSection) {
            case 'overview':
                renderOverview();
                break;
            case 'labs':
                renderLabs();
                break;
            case 'resources':
                renderResources();
                break;
            case 'maintenance':
                renderMaintenance();
                break;
            case 'bookings':
                renderBookings();
                break;
            case 'users':
                renderUsers();
                break;
            case 'reports':
                renderReports();
                break;
            case 'logs':
                renderLogs();
                break;
            case 'settings':
                renderSettings();
                break;
        }
    };

    // Helper: Status badge generator
    const getStatusPill = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'available') return `<span class="status-pill status-available">&#9679; Available</span>`;
        if (s === 'busy') return `<span class="status-pill status-busy">&#9679; Busy</span>`;
        if (s === 'full') return `<span class="status-pill status-full">&#9679; Full</span>`;
        if (s === 'maintenance' || s === 'under maintenance') return `<span class="status-pill status-maintenance">&#9874; Maintenance</span>`;
        if (s === 'faculty reserved' || s === 'reserved') return `<span class="status-pill status-reserved">&#128274; Faculty Reserved</span>`;
        if (s === 'occupied') return `<span class="status-pill status-occupied">&#128187; Occupied</span>`;
        if (s === 'completed') return `<span class="status-pill status-available">&#10003; Completed</span>`;
        if (s === 'alternative suggested') return `<span class="status-pill status-busy" style="background:#fef3c7; color:#b45309;">&#128260; Alternative</span>`;
        if (s === 'approved') return `<span class="status-pill status-available">&#10003; Approved</span>`;
        if (s === 'pending') return `<span class="status-pill status-busy">&#9203; Pending</span>`;
        if (s === 'rejected') return `<span class="status-pill status-busy" style="background:#fee2e2; color:#b91c1c;">&#10007; Rejected</span>`;
        return `<span class="status-pill">${status}</span>`;
    };

    // ----------------------------------------------------
    // SECTION 1: OVERVIEW RENDERER
    // ----------------------------------------------------
    const renderOverview = () => {
        if (!cachedStats) return;

        document.getElementById('kpi-total-labs').textContent = cachedStats.totalLabs;
        document.getElementById('kpi-available-labs').textContent = cachedStats.availableLabs;
        document.getElementById('kpi-busy-labs').textContent = cachedStats.busyLabs;
        document.getElementById('kpi-maintenance-labs').textContent = cachedStats.maintenanceLabs;
        document.getElementById('kpi-pending-reqs').textContent = cachedStats.pendingRequests;
        document.getElementById('kpi-active-bookings').textContent = cachedStats.activeBookings;
        document.getElementById('kpi-total-resources').textContent = cachedStats.totalResources;
        document.getElementById('kpi-maintenance-reqs').textContent = cachedStats.maintenanceRequests;

        // Quick Labs Table
        const quickTbody = document.getElementById('quick-labs-tbody');
        if (quickTbody) {
            const previewLabs = cachedLabs.slice(0, 5);
            quickTbody.innerHTML = previewLabs.map(lab => `
                <tr>
                    <td><strong>${lab.id}</strong></td>
                    <td style="color: #64748b;">${lab.location}</td>
                    <td>${lab.capacity} PCs</td>
                    <td>${getStatusPill(lab.status)}</td>
                </tr>
            `).join('');
        }

        // Quick Activity Timeline
        const quickTimeline = document.getElementById('quick-activity-timeline');
        if (quickTimeline) {
            const previewLogs = cachedLogs.slice(0, 4);
            quickTimeline.innerHTML = previewLogs.map(log => `
                <div class="activity-log-row">
                    <span class="activity-time">${log.time}</span>
                    <span class="activity-actor">${log.actor}</span>
                    <span class="activity-desc">${log.action} on <strong>${log.resource}</strong></span>
                    <span class="activity-result-badge">${log.result}</span>
                </div>
            `).join('');
        }
    };

    // ----------------------------------------------------
    // SECTION 2: LAB MANAGEMENT RENDERER
    // ----------------------------------------------------
    const renderLabs = () => {
        const tbody = document.getElementById('labs-tbody');
        const cardGrid = document.getElementById('labs-card-grid');
        if (!tbody || !cardGrid) return;

        // Filter labs
        let filtered = cachedLabs.filter(lab => {
            const matchStatus = (labsFilterStatus === 'all') || (lab.status.toLowerCase() === labsFilterStatus.toLowerCase());
            const query = labsSearchQuery.toLowerCase().trim();
            const matchQuery = !query || 
                lab.id.toLowerCase().includes(query) || 
                lab.name.toLowerCase().includes(query) || 
                lab.location.toLowerCase().includes(query);
            return matchStatus && matchQuery;
        });

        // Render Table Rows
        tbody.innerHTML = filtered.length ? filtered.map(lab => {
            const isMnt = lab.status === 'Maintenance';
            const isLocked = lab.status === 'Busy' || lab.status === 'Faculty Reserved' || lab.status === 'Full';
            
            let actionHtml = '';
            if (isMnt) {
                actionHtml = `<button class="btn-admin btn-admin-success btn-admin-sm" onclick="handleLabStatusPrompt('${lab.id}', 'Available')">Restore Available</button>`;
            } else if (isLocked) {
                actionHtml = `<button class="btn-admin btn-admin-warning btn-admin-sm" onclick="handleLabStatusPrompt('${lab.id}', 'Maintenance', true)">Put in Maintenance</button>`;
            } else {
                actionHtml = `<button class="btn-admin btn-admin-danger btn-admin-sm" onclick="handleLabStatusPrompt('${lab.id}', 'Maintenance')">Put in Maintenance</button>`;
            }

            return `
                <tr>
                    <td><strong>${lab.id}</strong></td>
                    <td>${lab.name}</td>
                    <td style="color: #64748b;">${lab.location}</td>
                    <td>${lab.capacity} PCs</td>
                    <td>${getStatusPill(lab.status)}</td>
                    <td>${lab.totalResources || lab.capacity}</td>
                    <td style="display: flex; gap: 0.4rem;">
                        <button class="btn-admin btn-admin-secondary btn-admin-sm" onclick="showLabDetails('${lab.id}')">View</button>
                        ${actionHtml}
                    </td>
                </tr>
            `;
        }).join('') : `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">No laboratories match the selected criteria.</td></tr>`;

        // Render Cards
        cardGrid.innerHTML = filtered.length ? filtered.map(lab => {
            const isMnt = lab.status === 'Maintenance';
            return `
                <div class="lab-item-card">
                    <div>
                        <div class="lab-card-top">
                            <span class="lab-card-id">${lab.id}</span>
                            ${getStatusPill(lab.status)}
                        </div>
                        <div class="lab-card-name">${lab.name}</div>
                        <div class="lab-meta-list">
                            <span>ðŸ“ Location: ${lab.location}</span>
                            <span>ðŸ’» Capacity: ${lab.capacity} Workstations</span>
                            <span>ðŸ‘¨â€ðŸ« In-charge: ${lab.incharge || 'Dept Faculty'}</span>
                        </div>
                    </div>
                    <div class="lab-card-footer">
                        <button class="btn-admin btn-admin-secondary btn-admin-sm" onclick="showLabDetails('${lab.id}')">View Details</button>
                        ${isMnt ? 
                            `<button class="btn-admin btn-admin-success btn-admin-sm" onclick="handleLabStatusPrompt('${lab.id}', 'Available')">Set Available</button>` : 
                            `<button class="btn-admin btn-admin-danger btn-admin-sm" onclick="handleLabStatusPrompt('${lab.id}', 'Maintenance')">Set Maintenance</button>`
                        }
                    </div>
                </div>
            `;
        }).join('') : `<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 2rem;">No laboratories found.</div>`;
    };

    // ----------------------------------------------------
    // SECTION 3: RESOURCE MANAGEMENT RENDERER
    // ----------------------------------------------------
    const renderResources = () => {
        const tbody = document.getElementById('resources-tbody');
        if (!tbody) return;

        let filtered = cachedResources.filter(res => {
            const matchLab = (resLabFilter === 'all') || (res.lab === resLabFilter);
            const matchType = (resTypeFilter === 'all') || (res.type === resTypeFilter);
            const matchStatus = (resStatusFilter === 'all') || (res.status.toLowerCase() === resStatusFilter.toLowerCase());
            const query = resSearchQuery.toLowerCase().trim();
            const matchQuery = !query || 
                res.id.toLowerCase().includes(query) || 
                res.name.toLowerCase().includes(query) || 
                res.specs.toLowerCase().includes(query);
            return matchLab && matchType && matchStatus && matchQuery;
        });

        tbody.innerHTML = filtered.length ? filtered.map(res => {
            const isMnt = res.status === 'Maintenance';
            const isReserved = res.status === 'Reserved' || res.status === 'Occupied';

            let actionBtn = '';
            if (isMnt) {
                actionBtn = `<button class="btn-admin btn-admin-success btn-admin-sm" onclick="handleResourceStatusPrompt('${res.id}', 'Available', false)">Mark Available</button>`;
            } else if (isReserved) {
                actionBtn = `<button class="btn-admin btn-admin-warning btn-admin-sm" onclick="handleResourceStatusPrompt('${res.id}', 'Maintenance', true)">Set Maintenance (Override)</button>`;
            } else {
                actionBtn = `<button class="btn-admin btn-admin-danger btn-admin-sm" onclick="handleResourceStatusPrompt('${res.id}', 'Maintenance', false)">Mark Maintenance</button>`;
            }

            return `
                <tr>
                    <td><strong>${res.id}</strong></td>
                    <td><span class="role-pill role-student" style="background:#f1f5f9; color:#334155;">${res.type}</span></td>
                    <td>${res.lab}</td>
                    <td>${getStatusPill(res.status)}</td>
                    <td style="font-size: 0.8rem; color: #475569;">${res.specs}</td>
                    <td style="font-size: 0.78rem; color: #64748b;">${res.lastUpdated}</td>
                    <td style="white-space: nowrap;">
                        ${actionBtn}
                    </td>
                </tr>
            `;
        }).join('') : `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">No resources found for the selected filter.</td></tr>`;
    };

    // ----------------------------------------------------
    // SECTION 4: MAINTENANCE RENDERER
    // ----------------------------------------------------
    const renderMaintenance = () => {
        const tbody = document.getElementById('maintenance-tbody');
        if (!tbody) return;

        let filtered = cachedMaintenance.filter(ticket => {
            let matchTab = true;
            if (mntTabFilter === 'active') matchTab = (ticket.status === 'Under Maintenance');
            if (mntTabFilter === 'completed') matchTab = (ticket.status === 'Completed');

            const query = mntSearchQuery.toLowerCase().trim();
            const matchQuery = !query || 
                ticket.id.toLowerCase().includes(query) || 
                ticket.targetId.toLowerCase().includes(query) || 
                ticket.lab.toLowerCase().includes(query) || 
                ticket.issue.toLowerCase().includes(query);

            return matchTab && matchQuery;
        });

        tbody.innerHTML = filtered.length ? filtered.map(ticket => {
            const isActive = ticket.status === 'Under Maintenance';
            return `
                <tr>
                    <td><strong>${ticket.id}</strong></td>
                    <td><strong>${ticket.targetId}</strong> <span style="font-size:0.75rem; color:#64748b;">(${ticket.type})</span></td>
                    <td>${ticket.lab}</td>
                    <td style="max-width: 250px; font-size: 0.83rem;">${ticket.issue}</td>
                    <td>
                        <span class="priority-pill ${ticket.priority === 'High' ? 'priority-high' : 'priority-normal'}">
                            ${ticket.priority}
                        </span>
                    </td>
                    <td style="font-size: 0.78rem; color: #64748b;">${ticket.reportedAt}</td>
                    <td style="font-size: 0.8rem;">${ticket.assignedTo}</td>
                    <td>${getStatusPill(ticket.status)}</td>
                    <td style="white-space: nowrap;">
                        <button class="btn-admin btn-admin-secondary btn-admin-sm" onclick="showTicketDetails('${ticket.id}')">View</button>
                        ${isActive ? `<button class="btn-admin btn-admin-success btn-admin-sm" onclick="promptResolveTicket('${ticket.id}')">Mark Completed</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('') : `<tr><td colspan="9" style="text-align: center; color: #94a3b8; padding: 2rem;">No maintenance records found.</td></tr>`;
    };

    // ----------------------------------------------------
    // SECTION 5: BOOKING REQUESTS RENDERER (MONITORING)
    // ----------------------------------------------------
    const renderBookings = () => {
        const tbody = document.getElementById('bookings-tbody');
        if (!tbody) return;

        let filtered = cachedBookings.filter(req => {
            const matchRole = (bookingsRoleFilter === 'all') || (req.role === bookingsRoleFilter);
            const matchStatus = (bookingsStatusFilter === 'all') || (req.status === bookingsStatusFilter);
            const query = bookingsSearchQuery.toLowerCase().trim();
            const matchQuery = !query || 
                req.id.toLowerCase().includes(query) || 
                req.user.toLowerCase().includes(query) || 
                req.lab.toLowerCase().includes(query);
            return matchRole && matchStatus && matchQuery;
        });

        tbody.innerHTML = filtered.length ? filtered.map(req => {
            const isFaculty = req.role === 'Faculty';
            const priorityBadge = isFaculty ? 
                `<span class="priority-pill priority-high">âš¡ HIGH PRIORITY</span>` : 
                `<span class="priority-pill priority-normal">NORMAL</span>`;

            const roleBadge = isFaculty ? 
                `<span class="role-pill role-faculty">Faculty</span>` : 
                `<span class="role-pill role-student">Student</span>`;

            const isPending = String(req.status || '').toLowerCase() === 'pending';
            const rawId = String(req.id).replace(/^REQ-/, '');

            return `
                <tr>
                    <td><strong>${req.id}</strong></td>
                    <td>
                        <div><strong>${req.user}</strong></div>
                        <span style="font-size: 0.72rem; color: #64748b;">ID: ${req.userId}</span>
                    </td>
                    <td>${roleBadge}</td>
                    <td><strong>${req.lab}</strong></td>
                    <td style="white-space: nowrap;">${req.date}</td>
                    <td style="white-space: nowrap; font-size: 0.82rem;">${req.startTime}&ndash;${req.endTime}</td>
                    <td>${priorityBadge}</td>
                    <td>${getStatusPill(req.status)}</td>
                    <td style="font-size: 0.78rem; color: #334155; max-width: 200px;">
                        ${req.engineStatus || 'Pending Approval'}
                        ${req.allocatedResource ? `<div style="color: #0284c7; font-weight: 600;">${req.allocatedResource}</div>` : ''}
                    </td>
                    <td style="white-space: nowrap;">
                        <button class="btn-admin btn-admin-secondary btn-admin-sm" onclick="showBookingDetails('${req.id}')">Details</button>
                        ${isPending ? `
                            <button class="btn-admin btn-admin-success btn-admin-sm" style="background:#16a34a; color:#fff; margin-left:4px;" onclick="handleAdminApproveBooking('${req.id}')" title="Approve Request">✓ Approve</button>
                            <button class="btn-admin btn-admin-danger btn-admin-sm" style="margin-left:4px;" onclick="handleAdminRejectBooking('${req.id}')" title="Reject Request">✗ Reject</button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('') : `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 2rem;">No booking requests found.</td></tr>`;
    };

    // ----------------------------------------------------
    // SECTION 6: USERS DIRECTORY RENDERER
    // ----------------------------------------------------
    const renderUsers = () => {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;

        let filtered = cachedUsers.filter(u => {
            const matchRole = (userRoleFilter === 'all') || (u.role.toLowerCase() === userRoleFilter.toLowerCase());
            const query = userSearchQuery.toLowerCase().trim();
            const matchQuery = !query || 
                u.id.toLowerCase().includes(query) || 
                u.name.toLowerCase().includes(query) || 
                u.email.toLowerCase().includes(query) || 
                u.department.toLowerCase().includes(query);
            return matchRole && matchQuery;
        });

        tbody.innerHTML = filtered.length ? filtered.map(u => {
            let roleClass = 'role-student';
            if (u.role === 'Faculty') roleClass = 'role-faculty';
            if (u.role === 'Lab Assistant') roleClass = 'role-labassistant';
            if (u.role === 'Admin') roleClass = 'role-admin';

            return `
                <tr>
                    <td><strong>${u.id}</strong></td>
                    <td><strong>${u.name}</strong></td>
                    <td style="color: #0284c7;">${u.email}</td>
                    <td><span class="role-pill ${roleClass}">${u.role}</span></td>
                    <td style="color: #475569; font-size: 0.84rem;">${u.department}</td>
                    <td><span class="status-pill status-available">${u.status}</span></td>
                    <td style="color: #64748b; font-size: 0.78rem;">${u.lastLogin}</td>
                    <td>
                        <button class="btn-admin btn-admin-secondary btn-admin-sm" onclick="showUserDetails('${u.id}')">View</button>
                    </td>
                </tr>
            `;
        }).join('') : `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 2rem;">No users found matching search.</td></tr>`;
    };

    // ----------------------------------------------------
    // SECTION 7: REPORTS & ANALYTICS RENDERER (Pure CSS & Canvas)
    // ----------------------------------------------------
    const renderReports = () => {
        if (!cachedReports) return;

        // Render Lab Utilization Progress Bars (Pure CSS)
        const barsContainer = document.getElementById('lab-utilization-bars');
        if (barsContainer) {
            barsContainer.innerHTML = cachedReports.labUtilization.map(item => `
                <div class="progress-bar-item">
                    <div class="progress-labels">
                        <span><strong>${item.lab}</strong> - ${item.name}</span>
                        <span style="color: ${item.color}; font-weight: 700;">${item.utilization}% (${item.activeHours} hrs/day)</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${item.utilization}%; background-color: ${item.color};"></div>
                    </div>
                </div>
            `).join('');
        }

        // Render Peak Hours Canvas Chart (Pure Canvas 2D)
        const canvas = document.getElementById('peakHoursCanvas');
        if (canvas && canvas.getContext) {
            const ctx = canvas.getContext('2d');
            const data = cachedReports.peakHours;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const paddingLeft = 40;
            const paddingBottom = 30;
            const chartWidth = canvas.width - paddingLeft - 20;
            const chartHeight = canvas.height - paddingBottom - 20;
            
            const barWidth = chartWidth / data.length - 16;

            // Draw grid lines
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = 20 + (chartHeight / 4) * i;
                ctx.beginPath();
                ctx.moveTo(paddingLeft, y);
                ctx.lineTo(canvas.width - 20, y);
                ctx.stroke();

                ctx.fillStyle = '#94a3b8';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(`${100 - i * 25}%`, paddingLeft - 6, y + 4);
            }

            // Draw bars
            data.forEach((slot, index) => {
                const x = paddingLeft + 10 + index * (chartWidth / data.length);
                const barH = (slot.load / 100) * chartHeight;
                const y = canvas.height - paddingBottom - barH;

                // Gradient
                const grad = ctx.createLinearGradient(0, y, 0, canvas.height - paddingBottom);
                grad.addColorStop(0, slot.load > 85 ? '#ef4444' : '#3b82f6');
                grad.addColorStop(1, slot.load > 85 ? '#f87171' : '#60a5fa');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.roundRect ? ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]) : ctx.rect(x, y, barWidth, barH);
                ctx.fill();

                // Value on top
                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${slot.load}%`, x + barWidth / 2, y - 5);

                // Slot label
                ctx.fillStyle = '#64748b';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(slot.slot, x + barWidth / 2, canvas.height - 10);
            });
        }
    };

    // ----------------------------------------------------
    // SECTION 8: ACTIVITY LOGS RENDERER
    // ----------------------------------------------------
    const renderLogs = () => {
        const tbody = document.getElementById('activity-logs-tbody');
        if (!tbody) return;

        let filtered = cachedLogs.filter(log => {
            const matchMod = (logsModuleFilter === 'all') || 
                (log.module.toLowerCase().includes(logsModuleFilter.toLowerCase())) ||
                (log.role.toLowerCase().includes(logsModuleFilter.toLowerCase()));
            const query = logsSearchQuery.toLowerCase().trim();
            const matchQuery = !query || 
                log.action.toLowerCase().includes(query) || 
                log.resource.toLowerCase().includes(query) || 
                log.actor.toLowerCase().includes(query);
            return matchMod && matchQuery;
        });

        tbody.innerHTML = filtered.length ? filtered.map(log => `
            <tr>
                <td style="color: #64748b; font-weight: 600; font-size: 0.8rem; white-space: nowrap;">${log.time}</td>
                <td><strong>${log.actor}</strong></td>
                <td><span class="role-pill role-student" style="background:#f1f5f9; color:#475569;">${log.role}</span></td>
                <td>${log.action}</td>
                <td><strong>${log.resource}</strong></td>
                <td><span class="status-pill status-available">${log.result}</span></td>
            </tr>
        `).join('') : `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 2rem;">No logs found.</td></tr>`;
    };

    // ----------------------------------------------------
    // SECTION 9: SETTINGS RENDERER
    // ----------------------------------------------------
    const renderSettings = () => {
        const select = document.getElementById('polling-interval-select');
        if (select) {
            select.value = pollingIntervalMs.toString();
        }
    };

    // ==========================================
    // 9. EVENT LISTENERS & ACTION HANDLERS
    // ==========================================

    // Refresh Overview
    const refreshOverviewBtn = document.getElementById('refresh-overview-btn');
    if (refreshOverviewBtn) {
        refreshOverviewBtn.addEventListener('click', () => {
            refreshDashboardData();
            showToast('Overview refreshed with latest engine states');
        });
    }

    // Toggle Labs View (Table vs Cards)
    const toggleLabsViewBtn = document.getElementById('toggle-labs-view-btn');
    if (toggleLabsViewBtn) {
        toggleLabsViewBtn.addEventListener('click', () => {
            const tableContainer = document.getElementById('labs-table-container');
            const cardGrid = document.getElementById('labs-card-grid');
            if (labsViewMode === 'table') {
                labsViewMode = 'card';
                tableContainer.style.display = 'none';
                cardGrid.style.display = 'grid';
                toggleLabsViewBtn.textContent = 'Switch to Table';
            } else {
                labsViewMode = 'table';
                tableContainer.style.display = 'block';
                cardGrid.style.display = 'none';
                toggleLabsViewBtn.textContent = 'Switch to Cards';
            }
        });
    }

    // Labs Filter Pills
    document.querySelectorAll('#labs-status-filter-pills .btn-filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#labs-status-filter-pills .btn-filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            labsFilterStatus = btn.dataset.filter;
            renderLabs();
        });
    });

    // Labs Search
    const labsSearchInput = document.getElementById('labs-search-input');
    if (labsSearchInput) {
        labsSearchInput.addEventListener('input', (e) => {
            labsSearchQuery = e.target.value;
            renderLabs();
        });
    }

    // Lab Status Prompt Helper
    window.handleLabStatusPrompt = (labId, targetStatus, hasConflictWarning = false) => {
        pendingLabAction = { labId, targetStatus };
        const titleEl = document.getElementById('lab-mnt-modal-title');
        const descEl = document.getElementById('lab-mnt-modal-desc');
        const reasonBox = document.getElementById('lab-mnt-reason-box');
        const reasonInput = document.getElementById('lab-mnt-reason');
        reasonInput.value = '';

        if (targetStatus === 'Maintenance') {
            titleEl.textContent = `Set ${labId} into Maintenance`;
            descEl.innerHTML = hasConflictWarning ? 
                `âš ï¸ <strong>Active Booking Alert:</strong> ${labId} has active bookings scheduled. Putting it in Maintenance will notify Team A to reroute pending allocations.<br><br>Are you sure you want to put <strong>${labId}</strong> into maintenance?` : 
                `Are you sure you want to put <strong>${labId}</strong> into maintenance mode? Regular bookings will be suspended.`;
            reasonBox.style.display = 'block';
        } else {
            titleEl.textContent = `Restore ${labId} to Available`;
            descEl.innerHTML = `Are you sure you want to restore <strong>${labId}</strong> to operational Available status?`;
            reasonBox.style.display = 'none';
        }

        openModal('lab-maintenance-modal');
    };

    // Confirm Lab Maintenance Button
    const confirmLabMntBtn = document.getElementById('btn-confirm-lab-maintenance');
    if (confirmLabMntBtn) {
        confirmLabMntBtn.addEventListener('click', async () => {
            const { labId, targetStatus } = pendingLabAction;
            const reason = document.getElementById('lab-mnt-reason').value.trim();
            if (labId && targetStatus) {
                try {
                    // CHANGED: Backend/SQL Server is the source of truth.
                    const result = await API.updateLabStatus(labId, targetStatus, reason);

                    // CHANGED: Respect explicit backend failures.
                    if (result && result.success === false) {
                        throw new Error(result.message || 'Unable to update lab status.');
                    }

                    closeModal('lab-maintenance-modal');
                    showToast(`Updated ${labId} status to ${targetStatus}`);
                    await refreshDashboardData();
                } catch (err) {
                    console.error('Error updating lab status:', err);
                    showToast(err.message || 'Unable to update lab status.', 'error');
                }
            }
        });
    }

    // Resource Management Filters
    const resLabSelect = document.getElementById('resource-lab-select');
    if (resLabSelect) {
        resLabSelect.addEventListener('change', (e) => {
            resLabFilter = e.target.value;
            renderResources();
        });
    }

    const resTypeSelect = document.getElementById('resource-type-select');
    if (resTypeSelect) {
        resTypeSelect.addEventListener('change', (e) => {
            resTypeFilter = e.target.value;
            renderResources();
        });
    }

    const resStatusSelect = document.getElementById('resource-status-select');
    if (resStatusSelect) {
        resStatusSelect.addEventListener('change', (e) => {
            resStatusFilter = e.target.value;
            renderResources();
        });
    }

    const resSearchInput = document.getElementById('resources-search-input');
    if (resSearchInput) {
        resSearchInput.addEventListener('input', (e) => {
            resSearchQuery = e.target.value;
            renderResources();
        });
    }

    // Resource Status Prompt Helper
    window.handleResourceStatusPrompt = (resourceId, targetStatus, isReservedOrOccupied = false) => {
        pendingResAction = { resourceId, targetStatus, isReservedOrOccupied };
        const descEl = document.getElementById('res-modal-desc');
        const warnEl = document.getElementById('res-override-warning');
        const reasonInput = document.getElementById('res-modal-reason');
        reasonInput.value = '';

        warnEl.style.display = isReservedOrOccupied ? 'block' : 'none';
        descEl.innerHTML = `Set resource <strong>${resourceId}</strong> status to <strong>${targetStatus}</strong>?`;

        openModal('resource-modal');
    };

    // Confirm Resource Status Button
    const confirmResBtn = document.getElementById('btn-confirm-res-status');
    if (confirmResBtn) {
        confirmResBtn.addEventListener('click', async () => {
            const { resourceId, targetStatus } = pendingResAction;
            const reason = document.getElementById('res-modal-reason').value.trim();
            if (resourceId && targetStatus) {
                try {
                    // CHANGED: Use the same backend resource state as Lab Assistant.
                    const result = await API.updateResourceStatus(resourceId, targetStatus, reason);

                    // CHANGED: Do not hide backend validation failures.
                    if (result && result.success === false) {
                        throw new Error(result.message || 'Unable to update resource status.');
                    }

                    closeModal('resource-modal');
                    showToast(`Resource ${resourceId} marked as ${targetStatus}`);
                    await refreshDashboardData();
                } catch (err) {
                    console.error('Error updating resource status:', err);
                    showToast(err.message || 'Unable to update resource status.', 'error');
                }
            }
        });
    }

    // Maintenance Section Filters
    document.querySelectorAll('#mnt-tab-pills .btn-filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#mnt-tab-pills .btn-filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mntTabFilter = btn.dataset.tab;
            renderMaintenance();
        });
    });

    const mntSearchInput = document.getElementById('mnt-search-input');
    if (mntSearchInput) {
        mntSearchInput.addEventListener('input', (e) => {
            mntSearchQuery = e.target.value;
            renderMaintenance();
        });
    }

    // Prompt Resolve Ticket Helper
    window.promptResolveTicket = (ticketId) => {
        pendingMntResolution = { ticketId };
        const descEl = document.getElementById('resolve-ticket-desc');
        const notesInput = document.getElementById('resolve-ticket-notes');
        notesInput.value = '';
        descEl.innerHTML = `Mark ticket <strong>${ticketId}</strong> as completed and restore target equipment to Available state.`;
        openModal('resolve-ticket-modal');
    };

    // Confirm Resolve Ticket
    const confirmResolveBtn = document.getElementById('btn-confirm-resolve-ticket');
    if (confirmResolveBtn) {
        confirmResolveBtn.addEventListener('click', async () => {
            const { ticketId } = pendingMntResolution;
            const notes = document.getElementById('resolve-ticket-notes').value.trim() || 'Serviced and verified by technician';
            if (ticketId) {
                try {
                    // CHANGED: Use the same maintenance completion API as Lab Assistant.
                    const result = await API.completeMaintenance(ticketId, notes);

                    // CHANGED: Respect explicit backend failure responses.
                    if (result && result.success === false) {
                        throw new Error(result.message || 'Unable to complete maintenance.');
                    }

                    closeModal('resolve-ticket-modal');
                    showToast(`Ticket ${ticketId} resolved & completed!`, 'success');

                    // CHANGED: Reload shared SQL Server state immediately.
                    await refreshDashboardData();
                } catch (err) {
                    console.error('Error completing maintenance:', err);
                    showToast(err.message || 'Unable to complete maintenance.', 'error');
                }
            }
        });
    }

    // Open Log Ticket Modal Triggers
    const btnCreateTicketModal = document.getElementById('btn-create-ticket-modal');
    if (btnCreateTicketModal) {
        btnCreateTicketModal.addEventListener('click', () => openModal('create-ticket-modal'));
    }

    const btnQuickLogTicket = document.getElementById('btn-quick-log-ticket');
    if (btnQuickLogTicket) {
        btnQuickLogTicket.addEventListener('click', () => openModal('create-ticket-modal'));
    }

    // Submit New Ticket
    const btnSubmitNewTicket = document.getElementById('btn-submit-new-ticket');
    if (btnSubmitNewTicket) {
        btnSubmitNewTicket.addEventListener('click', async () => {
            const type = document.getElementById('new-ticket-type').value;
            const lab = document.getElementById('new-ticket-lab').value;
            const targetId = document.getElementById('new-ticket-target').value.trim();
            const issue = document.getElementById('new-ticket-issue').value.trim();
            const priority = document.getElementById('new-ticket-priority').value;

            if (!targetId || !issue) {
                showToast('Please fill in target ID and issue description', 'warning');
                return;
            }

            try {
                // CHANGED: Create the ticket in the shared SQL Server backend.
                const res = await API.createMaintenanceTicket({
                    type,
                    lab,
                    targetId,
                    issue,
                    priority,
                    reportedBy: 'System Administrator',
                    assignedTo: 'Campus Maintenance Team'
                });

                // CHANGED: Respect explicit backend failure.
                if (!res || res.success === false) {
                    throw new Error(res?.message || 'Unable to create maintenance ticket.');
                }

                closeModal('create-ticket-modal');
                document.getElementById('new-ticket-form').reset();
                showToast(`Ticket ${res.ticket?.id || 'created'} created successfully!`);
                await refreshDashboardData();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // Bookings Filters
    const bookingsRoleFilterEl = document.getElementById('bookings-role-filter');
    if (bookingsRoleFilterEl) {
        bookingsRoleFilterEl.addEventListener('change', (e) => {
            bookingsRoleFilter = e.target.value;
            renderBookings();
        });
    }

    const bookingsStatusFilterEl = document.getElementById('bookings-status-filter');
    if (bookingsStatusFilterEl) {
        bookingsStatusFilterEl.addEventListener('change', (e) => {
            bookingsStatusFilter = e.target.value;
            renderBookings();
        });
    }

    const bookingsSearchInput = document.getElementById('bookings-search-input');
    if (bookingsSearchInput) {
        bookingsSearchInput.addEventListener('input', (e) => {
            bookingsSearchQuery = e.target.value;
            renderBookings();
        });
    }

    // Users Filters
    document.querySelectorAll('#user-role-filter-pills .btn-filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#user-role-filter-pills .btn-filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            userRoleFilter = btn.dataset.role;
            renderUsers();
        });
    });

    const usersSearchInput = document.getElementById('users-search-input');
    if (usersSearchInput) {
        usersSearchInput.addEventListener('input', (e) => {
            userSearchQuery = e.target.value;
            renderUsers();
        });
    }

    // Activity Logs Filters & Export
    const logsModuleFilterEl = document.getElementById('logs-module-filter');
    if (logsModuleFilterEl) {
        logsModuleFilterEl.addEventListener('change', (e) => {
            logsModuleFilter = e.target.value;
            renderLogs();
        });
    }

    const logsSearchInput = document.getElementById('logs-search-input');
    if (logsSearchInput) {
        logsSearchInput.addEventListener('input', (e) => {
            logsSearchQuery = e.target.value;
            renderLogs();
        });
    }

    const btnExportLogs = document.getElementById('btn-export-logs');
    if (btnExportLogs) {
        btnExportLogs.addEventListener('click', () => {
            const csvRows = [
                ['Time', 'Actor', 'Role', 'Module', 'Action', 'Resource', 'Result'].join(',')
            ];
            cachedLogs.forEach(log => {
                csvRows.push([
                    `"${log.time}"`,
                    `"${log.actor}"`,
                    `"${log.role}"`,
                    `"${log.module}"`,
                    `"${log.action}"`,
                    `"${log.resource}"`,
                    `"${log.result}"`
                ].join(','));
            });

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `smart_campus_activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Activity logs exported to CSV');
        });
    }

    // Reports Export Data
    const btnExportReports = document.getElementById('btn-export-reports');
    if (btnExportReports) {
        btnExportReports.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cachedReports, null, 2));
            const a = document.createElement('a');
            a.href = dataStr;
            a.download = `smart_campus_analytics_report_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            showToast('Report analytics exported');
        });
    }

    // Settings Form Handlers
    const btnSaveSettings = document.getElementById('btn-save-settings');
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', () => {
            const val = parseInt(document.getElementById('polling-interval-select').value, 10);
            pollingIntervalMs = val;
            startLivePolling();
            liveText.textContent = pollingIntervalMs > 0 ? `Live Sync (${pollingIntervalMs/1000}s)` : 'Manual Sync';
            showToast('Preferences updated successfully');
        });
    }

    const btnResetDemoDb = document.getElementById('btn-reset-demo-db');
    if (btnResetDemoDb) {
        btnResetDemoDb.addEventListener('click', () => {
            // CHANGED: this project now uses the real SQL Server database.
            // Never silently reset production/project data from the browser.
            showToast(
                'Demo reset is disabled. Use the SSMS SQL script only when you intentionally want to rebuild the database.',
                'warning'
            );
        });
    }

    // ==========================================
    // 10. DETAIL MODAL VIEW HANDLERS
    // ==========================================
    window.showLabDetails = (labId) => {
        const lab = cachedLabs.find(l => l.id === labId);
        if (!lab) return;

        const titleEl = document.getElementById('details-modal-title');
        const bodyEl = document.getElementById('details-modal-body');

        titleEl.textContent = `Laboratory Details: ${lab.id}`;
        bodyEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
                <div><strong>Lab ID:</strong> ${lab.id}</div>
                <div><strong>Name:</strong> ${lab.name}</div>
                <div><strong>Location:</strong> ${lab.location}</div>
                <div><strong>Capacity:</strong> ${lab.capacity} Computer Workstations</div>
                <div><strong>Status:</strong> ${getStatusPill(lab.status)}</div>
                <div><strong>Faculty In-Charge:</strong> ${lab.incharge || 'Not Assigned'}</div>
                <div><strong>Air Conditioned:</strong> ${lab.ac ? 'Yes âœ…' : 'No'}</div>
                <div><strong>Projector / Smart Board:</strong> ${lab.projector ? 'Available âœ…' : 'None'}</div>
            </div>
        `;
        openModal('details-modal');
    };

    window.showTicketDetails = (ticketId) => {
        const ticket = cachedMaintenance.find(t => t.id === ticketId);
        if (!ticket) return;

        const titleEl = document.getElementById('details-modal-title');
        const bodyEl = document.getElementById('details-modal-body');

        titleEl.textContent = `Maintenance Ticket: ${ticket.id}`;
        bodyEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
                <div><strong>Ticket ID:</strong> ${ticket.id}</div>
                <div><strong>Target:</strong> ${ticket.targetId} (${ticket.type})</div>
                <div><strong>Lab:</strong> ${ticket.lab}</div>
                <div><strong>Reported Issue:</strong> ${ticket.issue}</div>
                <div><strong>Priority:</strong> <span class="priority-pill ${ticket.priority === 'High' ? 'priority-high' : 'priority-normal'}">${ticket.priority}</span></div>
                <div><strong>Reported By:</strong> ${ticket.reportedBy}</div>
                <div><strong>Reported At:</strong> ${ticket.reportedAt}</div>
                <div><strong>Assigned To:</strong> ${ticket.assignedTo}</div>
                <div><strong>Current Status:</strong> ${getStatusPill(ticket.status)}</div>
                ${ticket.resolutionNotes ? `<div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:0.75rem; border-radius:8px; color:#166534;"><strong>Resolution Notes:</strong><br>${ticket.resolutionNotes}<br><span style="font-size:0.75rem;">Resolved at ${ticket.resolvedAt}</span></div>` : ''}
            </div>
        `;
        openModal('details-modal');
    };

    window.showBookingDetails = (bookingId) => {
        const b = cachedBookings.find(req => req.id === bookingId);
        if (!b) return;

        const titleEl = document.getElementById('details-modal-title');
        const bodyEl = document.getElementById('details-modal-body');

        const isPending = String(b.status || '').toLowerCase() === 'pending';

        titleEl.textContent = `Booking Request: ${b.id}`;
        bodyEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
                <div><strong>Request ID:</strong> ${b.id}</div>
                <div><strong>Applicant:</strong> ${b.user} (${b.role})</div>
                <div><strong>Target Lab:</strong> ${b.lab}</div>
                <div><strong>Date & Time:</strong> ${b.date}, ${b.startTime} - ${b.endTime}</div>
                <div><strong>Priority:</strong> <span class="priority-pill ${b.priority === 'HIGH' ? 'priority-high' : 'priority-normal'}">${b.priority}</span></div>
                <div><strong>Purpose:</strong> ${b.purpose || 'Academic Practice'}</div>
                <div><strong>Current Status:</strong> ${getStatusPill(b.status)}</div>
                <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:0.75rem; border-radius:8px; color:#1e40af;">
                    <strong>Team A OS Engine Allocation:</strong><br>
                    ${b.engineStatus}<br>
                    <span style="font-size:0.8rem; font-weight:600;">Resource: ${b.allocatedResource || 'In Queue'}</span>
                </div>
                ${isPending ? `
                    <div style="display:flex; gap:0.5rem; margin-top:0.5rem; padding-top:0.75rem; border-top:1px solid #e2e8f0;">
                        <button class="btn-admin btn-admin-success" style="background:#16a34a; color:#fff;" onclick="closeModal('details-modal'); handleAdminApproveBooking('${b.id}');">✓ Approve Request</button>
                        <button class="btn-admin btn-admin-danger" onclick="closeModal('details-modal'); handleAdminRejectBooking('${b.id}');">✗ Reject Request</button>
                    </div>
                ` : ''}
            </div>
        `;
        openModal('details-modal');
    };

    window.handleAdminApproveBooking = async (bookingId) => {
        if (!bookingId) {
            showToast('Invalid booking ID.', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to APPROVE booking ${bookingId}?`)) {
            return;
        }

        try {
            const result = await API.approveBooking(bookingId);
            if (result && result.success) {
                showToast(result.message || `Booking ${bookingId} approved successfully.`, 'success');
                await refreshDashboardData();
            } else {
                throw new Error(result?.message || 'Failed to approve booking request.');
            }
        } catch (error) {
            console.error('Error approving booking:', error);
            showToast(error.message || 'Error approving booking.', 'error');
        }
    };

    window.handleAdminRejectBooking = async (bookingId) => {
        if (!bookingId) {
            showToast('Invalid booking ID.', 'error');
            return;
        }

        const reason = prompt(`Enter rejection reason for booking ${bookingId} (optional):`, 'Schedule conflict or capacity limit');
        if (reason === null) {
            return; // user cancelled
        }

        try {
            const result = await API.rejectBooking(bookingId, reason);
            if (result && result.success) {
                showToast(result.message || `Booking ${bookingId} rejected.`, 'info');
                await refreshDashboardData();
            } else {
                throw new Error(result?.message || 'Failed to reject booking request.');
            }
        } catch (error) {
            console.error('Error rejecting booking:', error);
            showToast(error.message || 'Error rejecting booking.', 'error');
        }
    };

    window.showUserDetails = (userId) => {
        const u = cachedUsers.find(user => user.id === userId);
        if (!u) return;

        const titleEl = document.getElementById('details-modal-title');
        const bodyEl = document.getElementById('details-modal-body');

        titleEl.textContent = `User Profile: ${u.name}`;
        bodyEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.9rem;">
                <div><strong>User ID:</strong> ${u.id}</div>
                <div><strong>Name:</strong> ${u.name}</div>
                <div><strong>Email:</strong> ${u.email}</div>
                <div><strong>Role:</strong> <span class="role-pill role-student">${u.role}</span></div>
                <div><strong>Department:</strong> ${u.department}</div>
                <div><strong>Account Status:</strong> <span class="status-pill status-available">${u.status}</span></div>
                <div><strong>Last Login:</strong> ${u.lastLogin}</div>
                <div><strong>Total Reservations:</strong> ${u.bookingsCount || 0}</div>
            </div>
        `;
        openModal('details-modal');
    };

    // ==========================================
    // 11. INITIALIZATION
    // ==========================================
    await refreshDashboardData();
    startLivePolling();
});