/**
 * ==========================================================================
 * Lab Assistant Dashboard Controller
 * Smart Campus Lab & Resource Optimizer (Team D - Web Engine)
 * Pure Vanilla JavaScript (No Frameworks)
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {

    // ==========================================================================
    // 1. ROLE VERIFICATION & ACCESS CONTROL
    // ==========================================================================

    if (window.Auth && typeof Auth.verifyRole === 'function') {
        Auth.verifyRole('Lab Assistant');
    }

    const storedUser = sessionStorage.getItem('smartCampusUser');
    const storedUserId = sessionStorage.getItem('smartCampusUserId');

    if (storedUser) {
        const userDisplayElem = document.getElementById('user-display-name');

        if (userDisplayElem) {
            userDisplayElem.textContent = storedUser;
        }
    }

    // ==========================================================================
    // STATE VARIABLES
    // ==========================================================================

    let currentSection = 'overview';
    let currentFilter = 'all';
    let searchQuery = '';

    let resourcesCache = [];
    let scheduleCache = [];
    let requestsCache = [];
    let maintenanceCache = [];
    let labsCache = [];

    // ==========================================================================
    // DOM ELEMENTS
    // ==========================================================================

    const sidebar = document.getElementById('la-sidebar');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const navLinks = document.querySelectorAll('.nav-link-item');
    const logoutBtn = document.getElementById('logout-btn');

    // Sections
    const sectionOverview = document.getElementById('section-overview');
    const sectionResources = document.getElementById('section-resources');
    const sectionSchedule = document.getElementById('section-schedule');
    const sectionRequests = document.getElementById('section-requests');
    const sectionMaintenance = document.getElementById('section-maintenance');

    // Filter & Search
    const searchInput = document.getElementById('resource-search-input');
    const filterPills = document.querySelectorAll('.filter-pill');

    // Modal
    const reportModal = document.getElementById('report-issue-modal');
    const openReportModalBtn = document.getElementById('open-report-modal-btn');
    const closeReportModalBtn = document.getElementById('close-report-modal-btn');
    const cancelReportModalBtn = document.getElementById('cancel-report-modal-btn');
    const reportForm = document.getElementById('report-issue-form');
    const modalResourceSelect = document.getElementById('modal-resource-id');
    const modalLabInput = document.getElementById('modal-lab');

    // ==========================================================================
    // NAVIGATION
    // ==========================================================================

    function switchSection(targetSection) {

        currentSection = targetSection;

        navLinks.forEach(link => {

            if (link.dataset.section === targetSection) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }

        });

        document.querySelectorAll('.dashboard-section').forEach(sec => {
            sec.classList.remove('active-section');
        });

        const activeSecElement =
            document.getElementById(`section-${targetSection}`);

        if (activeSecElement) {
            activeSecElement.classList.add('active-section');
        }

        if (
            sidebar &&
            sidebar.classList.contains('sidebar-mobile-open')
        ) {
            sidebar.classList.remove('sidebar-mobile-open');
        }

        if (targetSection === 'resources') {
            renderResourcesTable();
        }

        if (targetSection === 'requests') {
            renderPendingRequestsTable();
        }

        if (targetSection === 'maintenance') {
            renderMaintenanceSections();
        }

        if (targetSection === 'schedule') {
            renderScheduleSection();
        }
    }

    navLinks.forEach(link => {

        link.addEventListener('click', e => {

            e.preventDefault();

            const section = link.dataset.section;

            window.location.hash = section;

            switchSection(section);
        });

    });

    document.querySelectorAll('[data-switch]').forEach(btn => {

        btn.addEventListener('click', e => {

            e.preventDefault();

            const target = btn.dataset.switch;

            window.location.hash = target;

            switchSection(target);
        });

    });

    window.addEventListener('hashchange', () => {

        const hash =
            window.location.hash.replace('#', '');

        if (
            [
                'overview',
                'resources',
                'schedule',
                'requests',
                'maintenance'
            ].includes(hash)
        ) {
            switchSection(hash);
        }

    });

    if (window.location.hash) {

        const initialHash =
            window.location.hash.replace('#', '');

        if (
            [
                'overview',
                'resources',
                'schedule',
                'requests',
                'maintenance'
            ].includes(initialHash)
        ) {
            switchSection(initialHash);
        }

    }

    // ==========================================================================
    // MOBILE SIDEBAR
    // ==========================================================================

    if (hamburgerBtn) {

        hamburgerBtn.addEventListener('click', () => {

            if (sidebar) {
                sidebar.classList.add('sidebar-mobile-open');
            }

        });

    }

    if (closeSidebarBtn) {

        closeSidebarBtn.addEventListener('click', () => {

            if (sidebar) {
                sidebar.classList.remove('sidebar-mobile-open');
            }

        });

    }

    // ==========================================================================
    // LOGOUT
    // ==========================================================================

    if (logoutBtn) {

        logoutBtn.addEventListener('click', () => {

            if (
                window.Auth &&
                typeof Auth.logout === 'function'
            ) {
                Auth.logout();
            } else {

                sessionStorage.clear();

                window.location.href = 'index.html';
            }

        });

    }

    // ==========================================================================
    // TOAST NOTIFICATION
    // ==========================================================================

    function showToast(message, type = 'info') {

        const container =
            document.getElementById('toast-container');

        if (!container) return;

        const toast =
            document.createElement('div');

        toast.className =
            `toast-msg toast-${type}`;

        let icon = 'ℹ️';

        if (type === 'success') {
            icon = '✅';
        }

        if (type === 'warning') {
            icon = '⚠️';
        }

        if (type === 'error') {
            icon = '⛔';
        }

        toast.innerHTML = `
            <span style="font-size: 1.15rem;">${icon}</span>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {

            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';

            setTimeout(() => {
                toast.remove();
            }, 300);

        }, 4000);
    }

    // ==========================================================================
    // DATA FETCHING
    // ==========================================================================

    async function refreshDashboard() {

        if (!window.API) {
            console.error('API object is not available.');
            return;
        }

        try {

            // CHANGED:
            // Lab Assistant and Admin both read the same backend data.
            const [
                stats,
                resources,
                schedule,
                pendingRequests,
                maintenance,
                notifications,
                labs
            ] = await Promise.all([

                API.getLabAssistantStats
                    ? API.getLabAssistantStats()
                    : null,

                API.getResources
                    ? API.getResources('all')
                    : [],

                API.getTodaysSchedule
                    ? API.getTodaysSchedule()
                    : [],

                API.getPendingBookings
                    ? API.getPendingBookings()
                    : [],

                API.getMaintenanceRequests
                    ? API.getMaintenanceRequests()
                    : [],

                API.getNotifications
                    ? API.getNotifications()
                    : [],

                API.getLabs
                    ? API.getLabs()
                    : []

            ]);

            resourcesCache = Array.isArray(resources)
                ? resources
                : [];

            scheduleCache = Array.isArray(schedule)
                ? schedule
                : [];

            requestsCache = Array.isArray(pendingRequests)
                ? pendingRequests
                : [];

            maintenanceCache = Array.isArray(maintenance)
                ? maintenance
                : [];

            labsCache = Array.isArray(labs)
                ? labs
                : [];

            // ==========================================================================
            // KPI
            // ==========================================================================

            if (stats) {

                const totalElement =
                    document.getElementById('kpi-total');

                const availableElement =
                    document.getElementById('kpi-available');

                const occupiedElement =
                    document.getElementById('kpi-occupied');

                const maintenanceElement =
                    document.getElementById('kpi-maintenance');

                if (totalElement) {
                    totalElement.textContent =
                        stats.totalResources ??
                        resourcesCache.length;
                }

                if (availableElement) {
                    availableElement.textContent =
                        stats.available ?? 0;
                }

                if (occupiedElement) {
                    occupiedElement.textContent =
                        stats.occupied ?? 0;
                }

                if (maintenanceElement) {
                    maintenanceElement.textContent =
                        stats.maintenance ?? 0;
                }
            }

            const kpiPendingReqElem =
                document.getElementById('kpi-pending-requests');
            if (kpiPendingReqElem) {
                kpiPendingReqElem.textContent = requestsCache.length;
            }

            const badgePendingReqElem =
                document.getElementById('badge-pending-requests');
            if (badgePendingReqElem) {
                badgePendingReqElem.textContent = requestsCache.length;
                badgePendingReqElem.style.display =
                    requestsCache.length > 0 ? 'inline-block' : 'none';
            }

            // Overview
            renderOverviewWidgets(
                scheduleCache,
                notifications,
                requestsCache
            );

            // Current section
            if (currentSection === 'resources') {
                renderResourcesTable();
            }

            if (currentSection === 'schedule') {
                renderScheduleSection();
            }

            if (currentSection === 'requests') {
                renderPendingRequestsTable();
            }

            if (currentSection === 'maintenance') {
                renderMaintenanceSections();
            }

        } catch (error) {

            console.error(
                'Error refreshing Lab Assistant dashboard:',
                error
            );

        }
    }

    // ==========================================================================
    // OVERVIEW WIDGETS
    // ==========================================================================

    function renderOverviewWidgets(
        schedule,
        notifications
    ) {

        const scheduleContainer =
            document.getElementById(
                'overview-schedule-list'
            );

        if (scheduleContainer) {

            if (
                !schedule ||
                schedule.length === 0
            ) {

                scheduleContainer.innerHTML = `
                    <p style="
                        color: var(--text-muted);
                        font-size: 0.9rem;
                        padding: 1rem 0;
                    ">
                        No approved bookings scheduled for today.
                    </p>
                `;

            } else {

                scheduleContainer.innerHTML =
                    schedule
                        .slice(0, 3)
                        .map(item => `

                            <div class="quick-schedule-item ${
                                item.isFaculty
                                    ? 'is-faculty-highlight'
                                    : ''
                            }">

                                <div>

                                    <div style="
                                        font-weight: 700;
                                        color: var(--primary-color);
                                        font-size: 0.92rem;
                                    ">

                                        ${item.time}
                                        &bull;

                                        <span class="lab-pill-badge">
                                            ${item.lab}
                                        </span>

                                    </div>

                                    <div style="
                                        font-size: 0.82rem;
                                        color: var(--text-muted);
                                        margin-top: 0.2rem;
                                    ">

                                        ${item.bookingType}
                                        &bull;
                                        ${item.user}

                                    </div>

                                </div>

                                <div>

                                    ${
                                        item.isFaculty

                                            ? `
                                                <span class="faculty-priority-pill">
                                                    HIGH PRIORITY
                                                </span>
                                            `

                                            : `
                                                <span class="status-badge status-approved">
                                                    Approved
                                                </span>
                                            `
                                    }

                                </div>

                            </div>

                        `)
                        .join('');
            }
        }

        // Pending Requests
        const reqContainer =
            document.getElementById(
                'overview-requests-list'
            );

        if (reqContainer) {

            if (
                !requests ||
                requests.length === 0
            ) {

                reqContainer.innerHTML = `
                    <p style="
                        color: var(--text-muted);
                        font-size: 0.9rem;
                        padding: 1rem 0;
                    ">
                        No pending booking requests.
                    </p>
                `;

            } else {

                reqContainer.innerHTML =
                    requests
                        .slice(0, 3)
                        .map(item => `

                            <div class="quick-schedule-item">

                                <div>

                                    <div style="
                                        font-weight: 700;
                                        color: var(--primary-color);
                                        font-size: 0.92rem;
                                    ">
                                        ${item.date} &bull; ${item.startTime}-${item.endTime}
                                        <span class="lab-pill-badge" style="margin-left: 0.25rem;">
                                            ${item.lab}
                                        </span>
                                    </div>

                                    <div style="
                                        font-size: 0.82rem;
                                        color: var(--text-muted);
                                        margin-top: 0.2rem;
                                    ">
                                        <strong>${item.user}</strong> (${item.role}) &bull; ${item.purpose || 'Session'}
                                    </div>

                                </div>

                                <div style="display: flex; gap: 0.3rem;">
                                    <button type="button" class="btn-table-approve" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="window.handleApproveBooking('${item.bookingId || item.id}')">
                                        ✓ Approve
                                    </button>
                                    <button type="button" class="btn-table-reject" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="window.handleRejectBooking('${item.bookingId || item.id}')">
                                        ✗
                                    </button>
                                </div>

                            </div>

                        `)
                        .join('');
            }
        }

        // Notifications
        const notifContainer =
            document.getElementById(
                'overview-notif-list'
            );

        if (notifContainer) {

            if (
                !notifications ||
                notifications.length === 0
            ) {

                notifContainer.innerHTML = `
                    <p style="
                        color: var(--text-muted);
                        font-size: 0.9rem;
                        padding: 1rem 0;
                    ">
                        No active alerts at this time.
                    </p>
                `;

            } else {

                notifContainer.innerHTML =
                    notifications
                        .slice(0, 4)
                        .map(n => `

                            <div class="notif-item notif-${n.type || 'warning'}">

                                <span class="notif-icon">
                                    ${n.icon || '⚠️'}
                                </span>

                                <div class="notif-content">

                                    <div class="notif-text">
                                        ${n.message}
                                    </div>

                                    <div class="notif-time">
                                        ${n.time || 'Just now'}
                                    </div>

                                </div>

                            </div>

                        `)
                        .join('');
            }
        }
    }

    // ==========================================================================
    // RESOURCE STATUS
    // ==========================================================================

    function getStatusClass(status) {

        const lower =
            String(status || '').toLowerCase();

        if (lower.includes('available')) {
            return 'status-available';
        }

        if (lower.includes('occupied')) {
            return 'status-occupied';
        }

        if (lower.includes('reserved')) {
            return 'status-reserved';
        }

        if (lower.includes('maintenance')) {
            return 'status-maintenance';
        }

        if (lower.includes('offline')) {
            return 'status-offline';
        }

        return 'status-available';
    }

    function renderResourcesTable() {

        const tbody =
            document.getElementById(
                'resources-table-tbody'
            );

        if (!tbody) return;

        const filtered =
            resourcesCache.filter(res => {

                const status =
                    String(res.status || '');

                const id =
                    String(res.id || '').toLowerCase();

                const lab =
                    String(res.lab || '').toLowerCase();

                const type =
                    String(res.type || '').toLowerCase();

                const statusLower =
                    status.toLowerCase();

                const matchesFilter =
                    currentFilter === 'all' ||
                    statusLower ===
                        String(currentFilter)
                            .toLowerCase();

                const matchesSearch =
                    !searchQuery ||

                    id.includes(searchQuery) ||

                    lab.includes(searchQuery) ||

                    type.includes(searchQuery) ||

                    statusLower.includes(searchQuery);

                return (
                    matchesFilter &&
                    matchesSearch
                );
            });

        if (filtered.length === 0) {

            tbody.innerHTML = `
                <tr>

                    <td colspan="6"
                        style="
                            text-align: center;
                            padding: 2.5rem;
                            color: var(--text-muted);
                        ">

                        <div style="
                            font-size: 2rem;
                            margin-bottom: 0.5rem;
                        ">
                            🔍
                        </div>

                        <p style="font-weight: 600;">
                            No resources found matching
                            "${searchQuery || currentFilter}"
                        </p>

                        <p style="
                            font-size: 0.85rem;
                            margin-top: 0.25rem;
                        ">
                            Try searching for Resource ID like
                            <strong>PC-04</strong>
                            or Lab
                            <strong>LAB 101</strong>.
                        </p>

                    </td>

                </tr>
            `;

            return;
        }

        tbody.innerHTML =
            filtered
                .map(res => {

                    const isMnt = String(res.status || '').toLowerCase() === 'maintenance' || String(res.status || '').toLowerCase() === 'out of service';
                    const statusClass = getStatusClass(res.status);
                    const rowStyle = isMnt ? 'style="background-color: #fff1f2;"' : '';
                    const badgeStyle = isMnt ? 'style="background:#fee2e2; color:#b91c1c; font-weight:600;"' : '';

                    return `
                        <tr ${rowStyle}>

                            <td>

                                <div class="resource-id-cell">

                                    <span>🖥️</span>

                                    <span>
                                        ${res.id}
                                    </span>

                                </div>

                            </td>

                            <td>

                                <span class="lab-pill-badge">
                                    ${res.lab || 'N/A'}
                                </span>

                            </td>

                            <td>
                                ${res.type || 'Equipment'}
                            </td>

                            <td>

                                <span class="
                                    status-badge
                                    ${statusClass}
                                " ${badgeStyle}>
                                    ${res.status || 'Unknown'}
                                </span>

                            </td>

                            <td>

                                <span style="
                                    color: var(--text-muted);
                                    font-size: 0.88rem;
                                ">
                                    ${res.lastUpdated || 'N/A'}
                                </span>

                            </td>

                            <td>

                                <button
                                    type="button"
                                    class="btn-table-action"
                                    onclick="
                                        window.handleQuickReport(
                                            '${String(res.id).replace(/'/g, "\\'")}',
                                            '${String(res.lab || '').replace(/'/g, "\\'")}'
                                        )
                                    "
                                    title="Report issue for ${res.id}"
                                >
                                    Report Issue
                                </button>

                            </td>

                        </tr>
                    `;
                })
                .join('');
    }

    // ==========================================================================
    // SEARCH
    // ==========================================================================

    if (searchInput) {

        searchInput.addEventListener(
            'input',
            e => {

                searchQuery =
                    e.target.value
                        .trim()
                        .toLowerCase();

                renderResourcesTable();
            }
        );
    }

    // ==========================================================================
    // FILTER
    // ==========================================================================

    filterPills.forEach(pill => {

        pill.addEventListener(
            'click',
            () => {

                filterPills.forEach(p => {
                    p.classList.remove('active');
                });

                pill.classList.add('active');

                currentFilter =
                    pill.dataset.filter || 'all';

                renderResourcesTable();
            }
        );
    });

    // ==========================================================================
    // QUICK REPORT
    // ==========================================================================

    window.handleQuickReport =
        (resourceId, lab) => {

            openReportModal(
                resourceId,
                lab
            );
        };

    // ==========================================================================
    // TODAY'S SCHEDULE
    // ==========================================================================

    function renderScheduleSection() {

        const container =
            document.getElementById(
                'schedule-cards-list'
            );

        if (!container) return;

        if (
            !scheduleCache ||
            scheduleCache.length === 0
        ) {

            container.innerHTML = `
                <div style="
                    background: var(--bg-card);
                    padding: 3rem;
                    text-align: center;
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                ">

                    <p style="
                        color: var(--text-muted);
                        font-size: 1.1rem;
                    ">
                        No approved bookings scheduled for today.
                    </p>

                </div>
            `;

            return;
        }

        container.innerHTML =
            scheduleCache
                .map(slot => {

                    const isFaculty =
                        slot.isFaculty ||
                        (
                            slot.bookingType &&
                            slot.bookingType
                                .includes('Faculty')
                        );

                    return `
                        <div class="
                            schedule-card
                            ${
                                isFaculty
                                    ? 'faculty-reservation-card'
                                    : ''
                            }
                        ">

                            <div class="schedule-time-box">

                                <span class="time-range">
                                    ${slot.time}
                                </span>

                                <span class="time-indicator">
                                    ${
                                        isFaculty
                                            ? '🔒 High Priority Slot'
                                            : 'Standard Booking Slot'
                                    }
                                </span>

                            </div>

                            <div class="schedule-main-info">

                                <div class="schedule-lab-title">

                                    <span
                                        class="lab-pill-badge"
                                        style="
                                            font-size: 0.95rem;
                                            padding: 0.25rem 0.75rem;
                                        "
                                    >
                                        ${slot.lab}
                                    </span>

                                    <span>
                                        ${slot.bookingType}
                                    </span>

                                </div>

                                <div class="schedule-purpose">

                                    <strong>Purpose:</strong>
                                    ${slot.purpose || 'Laboratory Session'}

                                    &bull;

                                    <strong>Booked by:</strong>
                                    ${slot.user || 'Faculty / Student'}

                                </div>

                                ${
                                    isFaculty

                                        ? `
                                            <div class="schedule-faculty-warning">

                                                <span>🔒</span>

                                                <span>
                                                    ${
                                                        slot.lockNotice ||
                                                        'FACULTY RESERVED: Whole lab locked by Team A scheduling system.'
                                                    }
                                                </span>

                                            </div>
                                        `

                                        : ''
                                }

                            </div>

                            <div class="schedule-status-group">

                                ${
                                    isFaculty

                                        ? `
                                            <span class="faculty-priority-pill">
                                                <span>⭐</span>
                                                FACULTY RESERVATION
                                                &bull;
                                                HIGH PRIORITY
                                            </span>

                                            <span class="status-badge status-approved">
                                                Status: APPROVED
                                            </span>
                                        `

                                        : `
                                            <span class="status-badge status-approved">
                                                Status: APPROVED
                                            </span>
                                        `
                                }

                            </div>

                        </div>
                    `;
                })
                .join('');
    }

    // ==========================================================================
    // PENDING BOOKING REQUESTS
    // ==========================================================================

    function renderPendingRequestsTable() {

        const tbody =
            document.getElementById(
                'pending-requests-tbody'
            );

        if (!tbody) return;

        if (
            !requestsCache ||
            requestsCache.length === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="
                        text-align: center;
                        padding: 3rem;
                        color: var(--text-muted);
                    ">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📋</div>
                        <p style="font-weight: 600; font-size: 1.05rem;">No pending booking requests</p>
                        <p style="font-size: 0.85rem; margin-top: 0.25rem;">
                            All student and faculty lab booking requests have been processed.
                        </p>
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML =
            requestsCache
                .map(req => {

                    const isFaculty = req.role === 'Faculty';
                    const reqDisplayId = req.requestId || req.id || ('REQ-' + req.bookingId);
                    const targetId = req.bookingId || req.id;

                    return `
                        <tr>
                            <td>
                                <strong>${reqDisplayId}</strong>
                            </td>
                            <td>
                                <div><strong>${req.user}</strong></div>
                                ${req.department ? `<span style="font-size: 0.75rem; color: var(--text-muted);">${req.department}</span>` : ''}
                            </td>
                            <td>
                                <span class="status-badge ${isFaculty ? 'faculty-priority-pill' : 'status-reserved'}" style="font-size: 0.78rem;">
                                    ${isFaculty ? '⭐ Faculty' : 'Student'}
                                </span>
                            </td>
                            <td>
                                <span class="lab-pill-badge">
                                    ${req.lab}
                                </span>
                            </td>
                            <td style="white-space: nowrap;">
                                ${req.date}
                            </td>
                            <td style="white-space: nowrap;">
                                ${req.startTime} &ndash; ${req.endTime}
                            </td>
                            <td>
                                ${req.purpose || 'Lab Session'}
                            </td>
                            <td style="font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">
                                ${req.submitted || req.submittedAt || req.created_at || 'Recently'}
                            </td>
                            <td style="white-space: nowrap;">
                                <button
                                    type="button"
                                    class="btn-table-approve"
                                    onclick="window.handleApproveBooking('${targetId}')"
                                    title="Approve booking request ${reqDisplayId}"
                                >
                                    ✓ Approve
                                </button>
                                <button
                                    type="button"
                                    class="btn-table-reject"
                                    onclick="window.handleRejectBooking('${targetId}')"
                                    title="Reject booking request ${reqDisplayId}"
                                >
                                    ✗ Reject
                                </button>
                            </td>
                        </tr>
                    `;
                })
                .join('');
    }

    // ==========================================================================
    // BOOKING APPROVAL & REJECTION HANDLERS
    // ==========================================================================

    window.handleApproveBooking = async (bookingId) => {
        if (!bookingId) {
            showToast('Invalid booking ID.', 'error');
            return;
        }

        const displayId = String(bookingId).startsWith('REQ-') ? bookingId : `REQ-${bookingId}`;

        if (!confirm(`Are you sure you want to APPROVE booking request ${displayId}?`)) {
            return;
        }

        if (!window.API || typeof API.approveBooking !== 'function') {
            showToast('API service is unavailable.', 'error');
            return;
        }

        try {
            const result = await API.approveBooking(bookingId);

            if (result && result.success) {
                showToast(result.message || `Booking request ${displayId} approved successfully.`, 'success');
                await refreshDashboard();
            } else {
                throw new Error(result?.message || 'Failed to approve booking request.');
            }
        } catch (error) {
            console.error('Error approving booking:', error);
            showToast(error.message || 'Error approving booking request.', 'error');
        }
    };

    window.handleRejectBooking = async (bookingId) => {
        if (!bookingId) {
            showToast('Invalid booking ID.', 'error');
            return;
        }

        const displayId = String(bookingId).startsWith('REQ-') ? bookingId : `REQ-${bookingId}`;
        const reason = prompt(`Enter rejection reason for request ${displayId} (optional):`, 'Lab schedule conflict or capacity limits');
        if (reason === null) {
            return; // User clicked Cancel
        }

        if (!window.API || typeof API.rejectBooking !== 'function') {
            showToast('API service is unavailable.', 'error');
            return;
        }

        try {
            const result = await API.rejectBooking(bookingId, reason);

            if (result && result.success) {
                showToast(result.message || `Booking request ${displayId} rejected.`, 'info');
                await refreshDashboard();
            } else {
                throw new Error(result?.message || 'Failed to reject booking request.');
            }
        } catch (error) {
            console.error('Error rejecting booking:', error);
            showToast(error.message || 'Error rejecting booking request.', 'error');
        }
    };

    // ==========================================================================
    // MAINTENANCE
    // ==========================================================================

    function renderMaintenanceSections() {

        const pendingContainer =
            document.getElementById(
                'list-pending-maintenance'
            );

        const progressContainer =
            document.getElementById(
                'list-progress-maintenance'
            );

        const completedContainer =
            document.getElementById(
                'list-completed-maintenance'
            );

        const pendingBadge =
            document.getElementById(
                'badge-pending-count'
            );

        const progressBadge =
            document.getElementById(
                'badge-progress-count'
            );

        const completedBadge =
            document.getElementById(
                'badge-completed-count'
            );

        // CHANGED:
        // Normalize status before comparing.
        const pendingTickets =
            maintenanceCache.filter(
                t =>
                    String(t.status || '')
                        .toLowerCase() === 'pending'
            );

        const progressTickets =
            maintenanceCache.filter(
                t =>
                    String(t.status || '')
                        .toLowerCase() ===
                    'under maintenance'
            );

        const completedTickets =
            maintenanceCache.filter(
                t =>
                    String(t.status || '')
                        .toLowerCase() === 'completed'
            );

        if (pendingBadge) {
            pendingBadge.textContent =
                pendingTickets.length;
        }

        if (progressBadge) {
            progressBadge.textContent =
                progressTickets.length;
        }

        if (completedBadge) {
            completedBadge.textContent =
                completedTickets.length;
        }

        // ==========================================================================
        // PENDING
        // ==========================================================================

        if (pendingContainer) {

            if (pendingTickets.length === 0) {

                pendingContainer.innerHTML = `
                    <p style="
                        color: var(--text-muted);
                        font-size: 0.85rem;
                        padding: 1.5rem 0;
                        text-align: center;
                    ">
                        No pending tickets.
                    </p>
                `;

            } else {

                pendingContainer.innerHTML =
                    pendingTickets
                        .map(ticket => `

                            <div class="m-card">

                                <div class="m-card-top">

                                    <span class="m-resource-title">
                                        ${ticket.targetId}
                                    </span>

                                    <span class="
                                        priority-badge
                                        priority-${
                                            String(
                                                ticket.priority || 'medium'
                                            ).toLowerCase()
                                        }
                                    ">
                                        ${ticket.priority || 'Medium'}
                                    </span>

                                </div>

                                <div style="
                                    font-size: 0.82rem;
                                    font-weight: 600;
                                    color: var(--accent-color);
                                ">
                                    Lab: ${ticket.lab}
                                    &bull;
                                    Issue: ${ticket.issueType || 'Hardware'}
                                </div>

                                <div class="m-problem-text">

                                    <strong>Problem:</strong>
                                    ${ticket.issue || ticket.description || 'No description'}

                                </div>

                                <div class="m-meta-row">

                                    <span>
                                        Reported:
                                        ${ticket.reportedAt || 'Today'}
                                    </span>

                                    <span class="
                                        status-badge
                                        status-pending
                                    "
                                    style="
                                        font-size: 0.72rem;
                                        padding: 0.15rem 0.5rem;
                                    ">
                                        Pending
                                    </span>

                                </div>

                                <button
                                    type="button"
                                    class="
                                        btn-m-action
                                        btn-start-maintenance
                                    "
                                    onclick="
                                        window.handleStartMaintenance(
                                            '${String(ticket.id).replace(/'/g, "\\'")}',
                                            '${String(ticket.targetId).replace(/'/g, "\\'")}'
                                        )
                                    "
                                >
                                    START MAINTENANCE
                                </button>

                            </div>

                        `)
                        .join('');
            }
        }

        // ==========================================================================
        // UNDER MAINTENANCE
        // ==========================================================================

        if (progressContainer) {

            if (progressTickets.length === 0) {

                progressContainer.innerHTML = `
                    <p style="
                        color: var(--text-muted);
                        font-size: 0.85rem;
                        padding: 1.5rem 0;
                        text-align: center;
                    ">
                        No active repairs in progress.
                    </p>
                `;

            } else {

                progressContainer.innerHTML =
                    progressTickets
                        .map(ticket => `

                            <div class="m-card">

                                <div class="m-card-top">

                                    <span class="m-resource-title">
                                        ${ticket.targetId}
                                    </span>

                                    <span class="
                                        priority-badge
                                        priority-${
                                            String(
                                                ticket.priority || 'medium'
                                            ).toLowerCase()
                                        }
                                    ">
                                        ${ticket.priority || 'Medium'}
                                    </span>

                                </div>

                                <div style="
                                    font-size: 0.82rem;
                                    font-weight: 600;
                                    color: var(--accent-color);
                                ">
                                    Lab: ${ticket.lab}
                                    &bull;
                                    Issue: ${ticket.issueType || 'Hardware'}
                                </div>

                                <div class="m-problem-text">

                                    <strong>Problem:</strong>
                                    ${ticket.issue || ticket.description || 'No description'}

                                </div>

                                <div class="m-meta-row">

                                    <span>
                                        Status: Under Maintenance
                                    </span>

                                    <span class="
                                        status-badge
                                        status-maintenance
                                    "
                                    style="
                                        font-size: 0.72rem;
                                        padding: 0.15rem 0.5rem;
                                    ">
                                        In Progress
                                    </span>

                                </div>

                                <button
                                    type="button"
                                    class="
                                        btn-m-action
                                        btn-mark-available
                                    "
                                    onclick="
                                        window.handleCompleteMaintenance(
                                            '${String(ticket.id).replace(/'/g, "\\'")}',
                                            '${String(ticket.targetId).replace(/'/g, "\\'")}'
                                        )
                                    "
                                >
                                    MARK AS AVAILABLE
                                </button>

                            </div>

                        `)
                        .join('');
            }
        }

        // ==========================================================================
        // COMPLETED
        // ==========================================================================

        if (completedContainer) {

            if (completedTickets.length === 0) {

                completedContainer.innerHTML = `
                    <p style="
                        color: var(--text-muted);
                        font-size: 0.85rem;
                        padding: 1.5rem 0;
                        text-align: center;
                    ">
                        No completed tickets today.
                    </p>
                `;

            } else {

                completedContainer.innerHTML =
                    completedTickets
                        .map(ticket => `

                            <div
                                class="m-card"
                                style="background: #fcfdfd;"
                            >

                                <div class="m-card-top">

                                    <span class="m-resource-title">
                                        ${ticket.targetId}
                                    </span>

                                    <span class="
                                        priority-badge
                                        priority-low
                                    ">
                                        Resolved
                                    </span>

                                </div>

                                <div style="
                                    font-size: 0.82rem;
                                    font-weight: 600;
                                    color: var(--text-muted);
                                ">
                                    Lab: ${ticket.lab}
                                    &bull;
                                    ${ticket.issueType || 'Equipment'}
                                </div>

                                <div
                                    class="m-problem-text"
                                    style="color: #475569;"
                                >

                                    <strong>Resolution:</strong>

                                    ${
                                        ticket.resolutionNotes ||
                                        ticket.resolution ||
                                        ticket.issue ||
                                        'Repaired and tested'
                                    }

                                </div>

                                <div class="m-meta-row">

                                    <span>
                                        ${ticket.resolvedAt || 'Resolved Today'}
                                    </span>

                                    <span
                                        class="
                                            status-badge
                                            status-available
                                        "
                                        style="
                                            font-size: 0.72rem;
                                            padding: 0.15rem 0.5rem;
                                        "
                                    >
                                        Available
                                    </span>

                                </div>

                            </div>

                        `)
                        .join('');
            }
        }
    }

    // ==========================================================================
    // CHANGED: START MAINTENANCE
    // ==========================================================================

    window.handleStartMaintenance =
        async (ticketId, resourceId) => {

            const targetRes =
                resourcesCache.find(
                    r =>
                        String(r.id).toLowerCase() ===
                        String(resourceId).toLowerCase()
                );

            // CHANGED:
            // Reserved and Occupied are both protected.
            const resourceStatus =
                String(targetRes?.status || '')
                    .toLowerCase();

            if (
                resourceStatus === 'reserved' ||
                resourceStatus === 'occupied'
            ) {

                showToast(
                    "Resource is currently reserved/occupied by the scheduling system.",
                    "warning"
                );

                return;
            }

            if (
                !window.API ||
                typeof API.startMaintenance !== 'function'
            ) {

                showToast(
                    "Maintenance service is unavailable. Please check the backend API.",
                    "error"
                );

                return;
            }

            try {

                const result =
                    await API.startMaintenance(
                        ticketId
                    );

                // CHANGED:
                // Respect backend failure.
                if (
                    result &&
                    result.success === false
                ) {
                    throw new Error(
                        result.message ||
                        "Unable to start maintenance."
                    );
                }

                showToast(
                    `${resourceId} is now under active maintenance.`,
                    "info"
                );

                // CHANGED:
                // Reload shared SQL Server state.
                await refreshDashboard();

            } catch (error) {

                console.error(
                    "Error starting maintenance:",
                    error
                );

                showToast(
                    error.message ||
                    "Unable to start maintenance.",
                    "error"
                );
            }
        };

    // ==========================================================================
    // CHANGED: COMPLETE MAINTENANCE
    // ==========================================================================

    window.handleCompleteMaintenance =
        async (ticketId, resourceId) => {

            const targetRes =
                resourcesCache.find(
                    r =>
                        String(r.id).toLowerCase() ===
                        String(resourceId).toLowerCase()
                );

            const resourceStatus =
                String(targetRes?.status || '')
                    .toLowerCase();

            if (
                resourceStatus === 'reserved' ||
                resourceStatus === 'occupied'
            ) {

                showToast(
                    "Resource is currently reserved/occupied by the scheduling system.",
                    "warning"
                );

                return;
            }

            if (!window.API) {

                showToast(
                    "Backend API is unavailable.",
                    "error"
                );

                return;
            }

            try {

                let result = null;

                // CHANGED:
                // Prefer the same completion method used by Admin.
                if (
                    typeof API.completeMaintenance ===
                    'function'
                ) {

                    result =
                        await API.completeMaintenance(
                            ticketId,
                            'Repaired, tested, and verified by Lab Assistant'
                        );

                } else if (
                    typeof API.markMaintenanceComplete ===
                    'function'
                ) {

                    // Fallback.
                    result =
                        await API.markMaintenanceComplete(
                            ticketId,
                            'Repaired, tested, and verified by Lab Assistant'
                        );

                } else {

                    throw new Error(
                        "Maintenance completion API is not available."
                    );
                }

                if (
                    result &&
                    result.success === false
                ) {

                    throw new Error(
                        result.message ||
                        "Unable to complete maintenance."
                    );
                }

                showToast(
                    `${resourceId} is now available.`,
                    "success"
                );

                // CHANGED:
                // Immediately reload shared database state.
                await refreshDashboard();

            } catch (error) {

                console.error(
                    "Error completing maintenance:",
                    error
                );

                showToast(
                    error.message ||
                    "Error marking resource as available.",
                    "error"
                );
            }
        };

    // ==========================================================================
    // REPORT ISSUE MODAL (CASCADING LAB -> RESOURCE SELECTION)
    // ==========================================================================

    function populateModalLabOptions(labs, prefillLab = '') {
        const modalLabSelect = document.getElementById('modal-lab');
        if (!modalLabSelect) return;

        const currentSelection = prefillLab || modalLabSelect.value || '';

        modalLabSelect.innerHTML = `
            <option value="" disabled ${!currentSelection ? 'selected' : ''}>
                -- Select Lab --
            </option>
        `;

        const uniqueLabs = [];
        (labs || []).forEach(l => {
            const name = l.name || l.lab || l.labName;
            if (name && !uniqueLabs.some(u => u.name === name)) {
                uniqueLabs.push({ id: l.id || l.labId, name: name, room: l.roomNumber || l.room || '' });
            }
        });

        if (uniqueLabs.length === 0 && resourcesCache && resourcesCache.length > 0) {
            resourcesCache.forEach(r => {
                if (r.lab && !uniqueLabs.some(u => u.name === r.lab)) {
                    uniqueLabs.push({ id: r.labId, name: r.lab, room: '' });
                }
            });
        }

        uniqueLabs.forEach(lab => {
            const opt = document.createElement('option');
            opt.value = lab.name;
            opt.dataset.labId = lab.id;
            opt.textContent = lab.room ? `${lab.name} (${lab.room})` : lab.name;
            if (currentSelection && String(lab.name).toLowerCase() === String(currentSelection).toLowerCase()) {
                opt.selected = true;
            }
            modalLabSelect.appendChild(opt);
        });

        if (currentSelection) {
            modalLabSelect.value = currentSelection;
        }
    }

    function populateModalResourceOptionsForLab(selectedLabName, prefillResourceId = '') {
        if (!modalResourceSelect) return;

        if (!selectedLabName) {
            modalResourceSelect.innerHTML = `<option value="" disabled selected>-- Please select a Lab first --</option>`;
            modalResourceSelect.disabled = true;
            return;
        }

        const filtered = (resourcesCache || []).filter(r => 
            String(r.lab || '').toLowerCase() === String(selectedLabName).toLowerCase()
        );

        // Sort PCs numerically
        filtered.sort((a, b) => 
            String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true, sensitivity: 'base' })
        );

        modalResourceSelect.innerHTML = `
            <option value="ALL" ${!prefillResourceId || prefillResourceId === 'ALL' ? 'selected' : ''}>
                Entire Lab (General / Lab-wide issue)
            </option>
        `;

        filtered.forEach(res => {
            const opt = document.createElement('option');
            opt.value = res.id;
            opt.dataset.lab = res.lab || '';
            opt.textContent = `${res.id} - ${res.name || res.id} [${res.status || 'Available'}]`;
            if (prefillResourceId && String(res.id).toLowerCase() === String(prefillResourceId).toLowerCase()) {
                opt.selected = true;
            }
            modalResourceSelect.appendChild(opt);
        });

        modalResourceSelect.disabled = false;
    }

    async function openReportModal(
        prefillResourceId = '',
        prefillLab = ''
    ) {
        if (!reportModal) return;

        if (!labsCache || labsCache.length === 0) {
            try {
                if (window.API && typeof API.getLabs === 'function') {
                    const fetchedLabs = await API.getLabs();
                    labsCache = Array.isArray(fetchedLabs) ? fetchedLabs : [];
                }
            } catch (e) {
                console.warn('Could not fetch labs for report modal:', e);
            }
        }

        if (!resourcesCache || resourcesCache.length === 0) {
            try {
                if (window.API && typeof API.getResources === 'function') {
                    const fetchedRes = await API.getResources('all');
                    resourcesCache = Array.isArray(fetchedRes) ? fetchedRes : [];
                }
            } catch (e) {
                console.warn('Could not fetch resources for report modal:', e);
            }
        }

        const modalLabSelect = document.getElementById('modal-lab');
        populateModalLabOptions(labsCache || [], prefillLab);

        if (prefillLab) {
            if (modalLabSelect) modalLabSelect.value = prefillLab;
            populateModalResourceOptionsForLab(prefillLab, prefillResourceId);
        } else if (prefillResourceId) {
            const resObj = (resourcesCache || []).find(r => String(r.id).toLowerCase() === String(prefillResourceId).toLowerCase());
            const labName = resObj ? resObj.lab : '';
            if (modalLabSelect && labName) modalLabSelect.value = labName;
            populateModalResourceOptionsForLab(labName, prefillResourceId);
        } else {
            if (modalLabSelect) {
                modalLabSelect.value = '';
            }
            if (modalResourceSelect) {
                modalResourceSelect.innerHTML = `<option value="" disabled selected>-- Please select a Lab first --</option>`;
                modalResourceSelect.disabled = true;
            }
        }

        reportModal.classList.add('modal-open');
    }

    function closeReportModal() {
        if (!reportModal) return;

        reportModal.classList.remove('modal-open');

        if (reportForm) {
            reportForm.reset();
        }

        const modalLabSelect = document.getElementById('modal-lab');
        if (modalLabSelect) {
            modalLabSelect.value = '';
        }
        if (modalResourceSelect) {
            modalResourceSelect.innerHTML = `<option value="" disabled selected>-- Please select a Lab first --</option>`;
            modalResourceSelect.disabled = true;
        }
    }

    window.openReportModal = openReportModal;
    window.closeReportModal = closeReportModal;
    window.handleQuickReport = (resId, labName) => openReportModal(resId, labName);

    if (openReportModalBtn) {
        openReportModalBtn.addEventListener('click', () => openReportModal());
    }

    if (closeReportModalBtn) {
        closeReportModalBtn.addEventListener('click', closeReportModal);
    }

    if (cancelReportModalBtn) {
        cancelReportModalBtn.addEventListener('click', closeReportModal);
    }

    // ==========================================================================
    // CASCADING LAB CHANGE LISTENER
    // ==========================================================================

    const modalLabSelectEl = document.getElementById('modal-lab');
    if (modalLabSelectEl) {
        modalLabSelectEl.addEventListener('change', (e) => {
            const selectedLab = e.target.value;
            populateModalResourceOptionsForLab(selectedLab, '');
        });
    }

    // ==========================================================================
    // REPORT ISSUE FORM
    // ==========================================================================

    if (reportForm) {
        reportForm.addEventListener('submit', async e => {
            e.preventDefault();

            const lab = document.getElementById('modal-lab')?.value || '';
            const resourceId = modalResourceSelect?.value || 'ALL';
            const issueType = document.getElementById('modal-issue-type')?.value || 'Hardware';
            const priority = document.getElementById('modal-priority')?.value || 'Medium';
            const description = document.getElementById('modal-description')?.value.trim() || '';

            if (!lab) {
                showToast("Please select a laboratory.", "warning");
                const modalLabEl = document.getElementById('modal-lab');
                if (modalLabEl) modalLabEl.focus();
                return;
            }

            if (!description) {
                showToast("Please describe the problem.", "warning");
                const descEl = document.getElementById('modal-description');
                if (descEl) descEl.focus();
                return;
            }

            const submitBtn = document.getElementById('submit-issue-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
            }

            try {
                if (!window.API || typeof API.reportMaintenanceIssue !== 'function') {
                    throw new Error("Maintenance reporting API is unavailable.");
                }

                const result = await API.reportMaintenanceIssue({
                    userId: storedUserId || undefined,
                    resourceId: resourceId === 'ALL' ? undefined : resourceId,
                    lab: lab,
                    issueType: issueType,
                    description: description,
                    priority: priority
                });

                if (!result || result.success === false) {
                    throw new Error(result?.message || "Unable to report maintenance issue.");
                }

                showToast(result.message || "Maintenance issue reported successfully.", "success");

                if (result.resourceStatusMessage) {
                    setTimeout(() => {
                        showToast(result.resourceStatusMessage, "info");
                    }, 1200);
                }

                closeReportModal();
                await refreshDashboard();

            } catch (err) {
                console.error('Error reporting maintenance issue:', err);
                showToast(err.message || "Error submitting maintenance report.", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'SUBMIT ISSUE';
                }
            }
        });
    }

    // ==========================================================================
    // ESCAPE KEY
    // ==========================================================================

    document.addEventListener(
        'keydown',
        e => {

            if (
                e.key === 'Escape' &&
                reportModal &&
                reportModal.classList.contains(
                    'modal-open'
                )
            ) {

                closeReportModal();
            }

        }
    );

    // ==========================================================================
    // MODAL BACKDROP
    // ==========================================================================

    if (reportModal) {

        reportModal.addEventListener(
            'click',
            e => {

                if (e.target === reportModal) {
                    closeReportModal();
                }

            }
        );
    }

    // ==========================================================================
    // INITIAL LOAD
    // ==========================================================================

    await refreshDashboard();

    // ==========================================================================
    // CHANGED:
    // Refresh every 5 seconds so Admin and Lab Assistant
    // stay synchronized through the backend.
    // ==========================================================================

    setInterval(() => {

        refreshDashboard();

    }, 5000);

});