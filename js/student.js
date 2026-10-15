// js/student.js

document.addEventListener('DOMContentLoaded', () => {

    // Role Security
    if (window.Auth) {
        Auth.verifyRole('Student');
    }

    // Load Logged-In User Information
    const storedUser = sessionStorage.getItem('smartCampusUser') || 'Student';
    const storedRole = sessionStorage.getItem('smartCampusRole') || 'Student';
    const storedUserId = sessionStorage.getItem('smartCampusUserId');

    const userNameEl = document.getElementById('user-display-name');
    const userRoleEl = document.getElementById('user-display-role');
    const welcomeNameEl = document.getElementById('welcome-user-name');

    if (userNameEl) userNameEl.textContent = storedUser;
    if (userRoleEl) userRoleEl.textContent = storedRole;
    if (welcomeNameEl) welcomeNameEl.textContent = storedUser;

    // Navigation Logic
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.dashboard-section');
    const sidebar = document.getElementById('sidebar');
    const openSidebarBtn = document.getElementById('open-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');

    const switchSection = (sectionId) => {
        sections.forEach(s => s.classList.remove('active'));
        navLinks.forEach(l => l.classList.remove('active'));

        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.classList.add('active');

        const targetLink = document.querySelector(`[data-section="${sectionId}"]`);
        if (targetLink) targetLink.classList.add('active');

        if (window.innerWidth <= 768 && sidebar) {
            sidebar.classList.remove('open');
        }

        if (sectionId === 'overview') loadMyBookings();
        if (sectionId === 'availability') loadAvailableLabs();
        if (sectionId === 'my-bookings') loadMyBookings();
        if (sectionId === 'book') loadBookLabInit();
    };

    navLinks.forEach(link => {
        if (link.dataset.section) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                switchSection(link.dataset.section);
            });
        }
    });

    if (openSidebarBtn) openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));

    // Toasts Utility
    const showToast = (message, type = 'info') => {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => toast.className = 'toast hidden', 3500);
    };

    // Helper: Status badge generator
    const getStatusBadge = (status) => {
        const s = String(status || '').toUpperCase();
        if (s === 'APPROVED' || s === 'CONFIRMED' || s === 'ACCEPTED') {
            return `<span class="status-badge status-available" style="background:#dcfce7; color:#15803d; padding:3px 8px; border-radius:6px; font-weight:600; font-size:0.8rem;">✓ Approved</span>`;
        }
        if (s === 'PENDING' || s === 'SCHEDULING') {
            return `<span class="status-badge status-pending" style="background:#fef3c7; color:#b45309; padding:3px 8px; border-radius:6px; font-weight:600; font-size:0.8rem;">⏳ Pending</span>`;
        }
        if (s === 'REJECTED') {
            return `<span class="status-badge status-busy" style="background:#fee2e2; color:#b91c1c; padding:3px 8px; border-radius:6px; font-weight:600; font-size:0.8rem;">✗ Rejected</span>`;
        }
        if (s === 'EXPIRED') {
            return `<span class="status-badge" style="background:#fee2e2; color:#991b1b; padding:3px 8px; border-radius:6px; font-weight:600; font-size:0.8rem;">⌛ Expired</span>`;
        }
        return `<span class="status-badge">${status}</span>`;
    };

    // =========================================================
    // LAB AVAILABILITY
    // =========================================================
    let allLabs = [];

    const isLabMaintenanceStatus = (lab) => {
        const statusUpper = String(lab.status || '').trim().toUpperCase();
        const maintPCs = Number(lab.maintenanceResources ?? 0);
        return statusUpper === 'MAINTENANCE' || statusUpper === 'INACTIVE' || maintPCs >= 5;
    };

    const populateDropdown = (labs) => {
        const select = document.getElementById('book-lab-select');
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="" disabled selected>Select Lab</option>';
        if (Array.isArray(labs) && labs.length > 0) {
            labs.forEach(lab => {
                const opt = document.createElement('option');
                opt.value = lab.id;
                const totalPCs = lab.totalResources ?? lab.totalCapacity ?? lab.total ?? lab.capacity ?? 20;
                const availPCs = lab.availableResources ?? lab.capacity ?? totalPCs;
                const maintPCs = Number(lab.maintenanceResources ?? 0);
                const isFullMaint = isLabMaintenanceStatus(lab);

                let statusText = ' (Available)';
                if (isFullMaint) {
                    statusText = ' (Maintenance)';
                } else if (maintPCs > 0) {
                    statusText = ` (${availPCs}/${totalPCs} PCs Available - ${maintPCs} in Maintenance)`;
                }

                opt.textContent = `${lab.name}${statusText}`;
                if (isFullMaint) {
                    opt.disabled = true;
                }
                select.appendChild(opt);
            });
        }
        if (currentVal && Array.from(select.options).some(o => String(o.value) === String(currentVal))) {
            select.value = currentVal;
        }
        if (window.BookingUtils) {
            BookingUtils.populateLabDropdown(labs);
        }
    };

    const loadAvailableLabs = async () => {
        try {
            allLabs = await API.getAvailableLabs();

            const activeFilterBtn = document.querySelector('#availability .filter-btn.active') || document.querySelector('.filter-btn.active');
            const currentFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
            
            filterAndRenderLabs(currentFilter);
            populateDropdown(allLabs);

            const availableCount = allLabs.filter(l => !isLabMaintenanceStatus(l)).length;
            const kpiAvail = document.getElementById('kpi-available-labs');
            if (kpiAvail) kpiAvail.textContent = String(availableCount).padStart(2, '0');
        } catch (error) {
            console.error('Unable to load labs:', error);
            showToast(error.message || 'Unable to load laboratories.', 'error');
        }
    };

    const filterAndRenderLabs = (filter) => {
        if (!filter || filter === 'all') {
            renderLabs(allLabs);
        } else if (filter === 'available') {
            const filtered = allLabs.filter(l => !isLabMaintenanceStatus(l));
            renderLabs(filtered);
        } else if (filter === 'maintenance') {
            const filtered = allLabs.filter(l => isLabMaintenanceStatus(l));
            renderLabs(filtered);
        } else {
            renderLabs(allLabs);
        }
    };

    const renderLabs = (labs) => {
        const grid = document.getElementById('labs-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const msgEl = document.getElementById('filter-result-msg');
        if (labs.length === 0) {
            if (msgEl) msgEl.textContent = "No laboratories found for this status.";
        } else {
            if (msgEl) msgEl.textContent = `${labs.length} laboratories found.`;
        }

        labs.forEach(lab => {
            const totalPCs = lab.totalResources ?? lab.totalCapacity ?? lab.total ?? lab.capacity ?? 20;
            const availPCs = lab.availableResources ?? lab.capacity ?? totalPCs;
            const maintPCs = Number(lab.maintenanceResources ?? 0);
            const isFullMaint = isLabMaintenanceStatus(lab);

            const card = document.createElement('div');
            card.className = `lab-card ${isFullMaint ? 'maintenance' : 'available'}`;

            let capacityDisplay = `${totalPCs} PCs`;
            if (isFullMaint) {
                capacityDisplay = `0 / ${totalPCs} PCs Working <span style="color:#dc2626; font-size:0.8rem; font-weight:600;">(Under Maintenance)</span>`;
            } else if (maintPCs > 0 && totalPCs > 0) {
                capacityDisplay = `${availPCs} / ${totalPCs} PCs Available <span style="color:#dc2626; font-size:0.8rem; font-weight:600;">(${maintPCs} out of ${totalPCs} PCs under maintenance)</span>`;
            } else {
                capacityDisplay = `${totalPCs} / ${totalPCs} PCs Available`;
            }

            const statusBadge = isFullMaint
                ? `<span class="lab-status status-busy" style="background:#fee2e2; color:#b91c1c; padding:3px 8px; border-radius:6px; font-weight:600; font-size:0.8rem;">Maintenance</span>`
                : `<span class="lab-status status-available" style="background:#dcfce7; color:#15803d; padding:3px 8px; border-radius:6px; font-weight:600; font-size:0.8rem;">Available</span>`;

            // Button color logic:
            // - If lab reaches maintenance threshold (5+ PCs under maintenance) -> Red disabled button
            // - If lab is available (< 5 PCs under maintenance) -> Standard Available button (#0f766e)
            let buttonHtml = '';
            if (isFullMaint) {
                buttonHtml = `<button class="btn-primary" disabled style="background-color: #dc2626 !important; color: #ffffff; cursor: not-allowed; opacity: 0.85;">UNDER MAINTENANCE</button>`;
            } else {
                buttonHtml = `<button class="btn-primary" onclick="requestLab('${lab.id}')" style="background-color: #0f766e; color: #ffffff;">REQUEST THIS LAB</button>`;
            }

            card.innerHTML = `
                <h3>
                    ${lab.name}
                    ${statusBadge}
                </h3>
                <div class="lab-stats">
                    <div>Capacity:<br><span>${capacityDisplay}</span></div>
                </div>
                <div class="util-bar">
                    <div class="util-fill" style="width: ${isFullMaint ? '100%' : '0%'}; background: ${isFullMaint ? '#dc2626' : '#10b981'};"></div>
                </div>
                ${buttonHtml}
            `;
            grid.appendChild(card);
        });
    };

    // Filter Logic
    const filterBtns = document.querySelectorAll('#availability .filter-btn');
    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterAndRenderLabs(btn.dataset.filter);
            });
        });
    }

    // =========================================================
    // REQUEST LAB & FORM INITIALIZATION
    // =========================================================
    window.requestLab = (labId) => {
        switchSection('book');
        const labSelect = document.getElementById('book-lab-select');
        if (labSelect) {
            Array.from(labSelect.options).forEach(opt => {
                if (String(opt.value) === String(labId)) {
                    opt.selected = true;
                }
            });
            validateBookingForm();
        }
    };

    const loadBookLabInit = () => {
        API.getResourceRecommendation()
            .then(rec => {
                const suggestedLab = document.getElementById('suggested-lab');
                const suggestedReason = document.getElementById('suggested-reason');
                if (suggestedLab) suggestedLab.textContent = rec.suggestedLab;
                if (suggestedReason) suggestedReason.textContent = rec.reason;
            })
            .catch(err => console.error('Recommendation error:', err));

        if (allLabs.length === 0) {
            API.getAvailableLabs()
                .then(labs => {
                    allLabs = labs;
                    populateDropdown(allLabs);
                    if (window.BookingUtils) {
                        BookingUtils.setMinimumBookingDate();
                        BookingUtils.attachDateListener('book-date', 'validation-message');
                        BookingUtils.initTimeSelectSync('book-start', 'book-end');
                    }
                    validateBookingForm();
                })
                .catch(err => console.error('Lab loading error:', err));
        } else {
            populateDropdown(allLabs);
            if (window.BookingUtils) {
                BookingUtils.setMinimumBookingDate();
                BookingUtils.attachDateListener('book-date', 'validation-message');
                BookingUtils.initTimeSelectSync('book-start', 'book-end');
            }
            validateBookingForm();
        }
    };

    // =========================================================
    // BOOKING FORM VALIDATION & SUBMISSION
    // =========================================================
    const validateBookingForm = async () => {
        const labSelect = document.getElementById('book-lab-select')?.value;
        const dateInput = document.getElementById('book-date')?.value;
        const startInput = (window.BookingUtils && BookingUtils.getTimePickerValue('book-start')) || document.getElementById('book-start')?.value || '';
        const endInput = (window.BookingUtils && BookingUtils.getTimePickerValue('book-end')) || document.getElementById('book-end')?.value || '';
        const submitBtn = document.getElementById('book-submit-btn');
        const capacityCard = document.getElementById('capacity-info-card');
        const validationMsg = document.getElementById('validation-message');

        if (!submitBtn) return;
        submitBtn.disabled = true;
        if (validationMsg) {
            validationMsg.textContent = '';
            validationMsg.style.color = '#333';
        }

        if (labSelect) {
            if (capacityCard) capacityCard.classList.remove('hidden');
            const labs = allLabs.length > 0 ? allLabs : await API.getAvailableLabs();
            const lab = labs.find(l => String(l.id) === String(labSelect));
            if (lab) {
                const infoLabName = document.getElementById('info-lab-name');
                const infoTotalCap = document.getElementById('info-total-cap');
                const infoStatus = document.getElementById('info-status');

                if (infoLabName) infoLabName.textContent = lab.name;
                const totalPCs = lab.totalResources ?? lab.total ?? lab.capacity ?? 0;
                if (infoTotalCap) infoTotalCap.textContent = `${totalPCs} PCs`;
                if (infoStatus) {
                    infoStatus.textContent = lab.status;
                    const status = String(lab.status || '').toUpperCase();
                    let color = '#333';
                    if (status === 'AVAILABLE' || status === 'ACTIVE') color = '#155724';
                    if (status === 'BUSY' || status === 'OCCUPIED') color = '#856404';
                    if (status === 'FULL') color = '#721c24';
                    if (status === 'MAINTENANCE' || status === 'OFFLINE') color = '#383d41';
                    infoStatus.style.color = color;
                    infoStatus.style.fontWeight = '700';
                }
            }
        } else {
            if (capacityCard) capacityCard.classList.add('hidden');
        }

        if (!labSelect || !dateInput || !startInput || !endInput) return;

        if (window.BookingUtils) {
            const timeCheck = BookingUtils.validateTimeRules(dateInput, startInput, endInput);
            if (!timeCheck.valid) {
                if (validationMsg) {
                    validationMsg.textContent = timeCheck.message;
                    validationMsg.style.color = '#721c24';
                }
                return;
            }

            const labCheck = await BookingUtils.isLabAvailable(labSelect, dateInput, startInput, endInput, allLabs);
            if (validationMsg) validationMsg.textContent = labCheck.message;

            if (!labCheck.available) {
                if (validationMsg) {
                    validationMsg.style.color = '#721c24';
                    validationMsg.innerHTML = `&#9888; ${labCheck.message}`;
                }
                return;
            }

            if (validationMsg) validationMsg.style.color = '#155724';
        } else {
            if (startInput >= endInput) return;
        }

        submitBtn.disabled = false;
    };

    const bookForm = document.getElementById('book-form');
    if (bookForm) {
        const formInputs = [
            'book-lab-select',
            'book-date',
            'book-start',
            'book-end',
            'book-purpose',
            'book-start-hour',
            'book-start-min',
            'book-start-ampm',
            'book-end-hour',
            'book-end-min',
            'book-end-ampm'
        ];
        formInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', validateBookingForm);
                el.addEventListener('change', validateBookingForm);
            }
        });

        bookForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const dateInput = document.getElementById("book-date");
            if (window.BookingUtils && !BookingUtils.isValidBookingDate(dateInput.value)) {
                const validationMsg = document.getElementById('validation-message');
                if (validationMsg) {
                    validationMsg.textContent = "Please select today or a future date.";
                    validationMsg.style.color = '#721c24';
                }
                return;
            }

            const btn = document.getElementById('book-submit-btn');
            const originalText = btn.textContent;
            btn.textContent = 'Submitting booking request...';
            btn.disabled = true;

            const start24 = (window.BookingUtils && BookingUtils.getTimePickerValue('book-start')) || document.getElementById('book-start')?.value || '';
            const end24 = (window.BookingUtils && BookingUtils.getTimePickerValue('book-end')) || document.getElementById('book-end')?.value || '';

            if (!start24 || !end24) {
                showToast('Please enter both start time and end time.', 'error');
                btn.textContent = originalText;
                btn.disabled = false;
                return;
            }

            const data = {
                userId: sessionStorage.getItem('smartCampusUserId'),
                labId: document.getElementById('book-lab-select').value,
                purpose: document.getElementById('book-purpose').value,
                startTime: `${document.getElementById('book-date').value}T${start24}:00`,
                endTime: `${document.getElementById('book-date').value}T${end24}:00`,
                studentCount: 1
            };

            if (!data.userId) {
                showToast('User session not found. Please login again.', 'error');
                btn.textContent = originalText;
                btn.disabled = false;
                return;
            }

            let result;
            try {
                result = await API.createBookingRequest(data);
            } catch (error) {
                showToast(error.message || 'Could not submit the booking request.', 'error');
                btn.textContent = originalText;
                btn.disabled = false;
                return;
            }

            if (result && result.success) {
                showToast('Booking request submitted successfully.', 'success');
                bookForm.reset();
                document.getElementById('capacity-info-card').classList.add('hidden');

                document.getElementById('request-result').innerHTML = `
                    <div class="alert alert-success" style="background:#d4edda; color:#155724; border:1px solid #c3e6cb; padding:1rem; border-radius:8px;">
                        <strong>Request ID:</strong> ${result.requestId}<br>
                        <strong>Status:</strong> ${result.status || 'Pending'}<br>
                        <em>Request submitted to Lab Assistant / Admin for approval.</em>
                    </div>
                `;

                // Immediately reload bookings
                await loadMyBookings();
            }

            btn.textContent = originalText;
            btn.disabled = true;
        });
    }

    // =========================================================
    // MY REQUESTS & BOOKING HISTORY (COMBINED SINGLE TABLE)
    // =========================================================
    let cachedStudentBookings = [];
    let currentStudentBookingFilter = 'all';

    const renderCombinedBookingsTable = () => {
        const tbody = document.getElementById('combined-bookings-tbody');
        if (!tbody) return;

        let filtered = cachedStudentBookings.filter(b => {
            if (currentStudentBookingFilter === 'all') return true;
            const st = String(b.status || '').toUpperCase();
            if (currentStudentBookingFilter === 'pending') {
                return st === 'PENDING' || st === 'SCHEDULING';
            }
            if (currentStudentBookingFilter === 'approved') {
                return st === 'APPROVED' || st === 'CONFIRMED' || st === 'ACCEPTED';
            }
            if (currentStudentBookingFilter === 'rejected') {
                return st === 'REJECTED' || st === 'CANCELLED' || st === 'EXPIRED';
            }
            return true;
        });

        const countBadge = document.getElementById('booking-count-badge');
        if (countBadge) {
            countBadge.textContent = `Showing ${filtered.length} of ${cachedStudentBookings.length} bookings`;
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-secondary); padding:2rem;">No bookings found for the selected filter.</td></tr>`;
        } else {
            tbody.innerHTML = filtered.map(b => {
                const isPending = String(b.status || '').toUpperCase() === 'PENDING' || String(b.status || '').toUpperCase() === 'SCHEDULING';
                return `
                    <tr>
                        <td><strong>${b.id}</strong></td>
                        <td>${b.lab}</td>
                        <td>${b.date}</td>
                        <td>${b.time}</td>
                        <td>${b.purpose || 'Student Practical'}</td>
                        <td style="font-size:0.8rem; color:var(--text-secondary);">${b.submitted || b.submittedAt || 'Recently'}</td>
                        <td>${getStatusBadge(b.status)}</td>
                        <td><button onclick="checkStatus('${b.id}')" class="btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">${isPending ? 'Track Status' : 'View Details'}</button></td>
                    </tr>
                `;
            }).join('');
        }
    };

    // Filter pill buttons in student dashboard
    document.querySelectorAll('#student-booking-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#student-booking-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentStudentBookingFilter = btn.dataset.bookingFilter || 'all';
            renderCombinedBookingsTable();
        });
    });

    const loadMyBookings = async () => {
        try {
            const data = await API.getMyBookings();
            const pending = Array.isArray(data.pending) ? data.pending : [];
            const approved = Array.isArray(data.approved) ? data.approved : [];
            const allItems = Array.isArray(data.data) ? data.data : (data.items || []);

            cachedStudentBookings = allItems;

            // 1. Update KPI Counters
            const kpiPending = document.getElementById('kpi-pending-reqs');
            const kpiApproved = document.getElementById('kpi-approved-bookings');
            const kpiTotal = document.getElementById('kpi-total-requests');
            const sidebarBadge = document.getElementById('sidebar-pending-badge');

            if (kpiPending) kpiPending.textContent = String(pending.length).padStart(2, '0');
            if (kpiApproved) kpiApproved.textContent = String(approved.length).padStart(2, '0');
            if (kpiTotal) kpiTotal.textContent = String(allItems.length).padStart(2, '0');

            if (sidebarBadge) {
                sidebarBadge.textContent = pending.length;
                sidebarBadge.style.display = pending.length > 0 ? 'inline-block' : 'none';
            }

            // 2. Render Overview Recent Requests Table
            const recentTbody = document.getElementById('overview-recent-tbody');
            if (recentTbody) {
                const preview = allItems.slice(0, 5);
                if (preview.length === 0) {
                    recentTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-secondary); padding:1.5rem;">No recent requests found.</td></tr>`;
                } else {
                    recentTbody.innerHTML = preview.map(b => `
                        <tr>
                            <td><strong>${b.id}</strong></td>
                            <td>${b.lab}</td>
                            <td>${b.date}</td>
                            <td>${b.time}</td>
                            <td>${b.purpose || 'Student Practical'}</td>
                            <td>${getStatusBadge(b.status)}</td>
                            <td><button onclick="checkStatus('${b.id}')" class="btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">Track</button></td>
                        </tr>
                    `).join('');
                }
            }

            // 3. Render Combined Bookings Table
            renderCombinedBookingsTable();

            // Backward-compatibility tables if present
            const pendingTbody = document.getElementById('pending-tbody');
            if (pendingTbody) {
                pendingTbody.innerHTML = pending.length ? pending.map(b => `
                    <tr>
                        <td><strong>${b.id}</strong></td>
                        <td>${b.lab}</td>
                        <td>${b.date}</td>
                        <td>${b.time}</td>
                        <td>${b.purpose || 'Practical'}</td>
                        <td style="font-size:0.8rem; color:var(--text-secondary);">${b.submitted || b.submittedAt || 'Recently'}</td>
                        <td>${getStatusBadge(b.status)}</td>
                        <td><button onclick="checkStatus('${b.id}')" class="btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">Track Status</button></td>
                    </tr>
                `).join('') : `<tr><td colspan="8" style="text-align:center; color:var(--text-secondary); padding:2rem;">No pending requests.</td></tr>`;
            }

            const approvedTbody = document.getElementById('approved-tbody');
            if (approvedTbody) {
                approvedTbody.innerHTML = approved.length ? approved.map(b => `
                    <tr>
                        <td><strong>${b.id}</strong></td>
                        <td>${b.lab}</td>
                        <td>${b.date}</td>
                        <td>${b.time}</td>
                        <td>${b.purpose || 'Practical'}</td>
                        <td>${getStatusBadge(b.status)}</td>
                        <td><button onclick="checkStatus('${b.id}')" class="btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">View</button></td>
                    </tr>
                `).join('') : `<tr><td colspan="7" style="text-align:center; color:var(--text-secondary); padding:2rem;">No approved bookings yet.</td></tr>`;
            }

            const historyTbody = document.getElementById('history-tbody');
            if (historyTbody) {
                historyTbody.innerHTML = allItems.length ? allItems.map(b => `
                    <tr>
                        <td><strong>${b.id}</strong></td>
                        <td>${b.lab}</td>
                        <td>${b.date}</td>
                        <td>${b.time}</td>
                        <td>${b.purpose || 'Practical'}</td>
                        <td style="font-size:0.8rem; color:var(--text-secondary);">${b.submitted || b.submittedAt || 'Recently'}</td>
                        <td>${getStatusBadge(b.status)}</td>
                        <td><button onclick="checkStatus('${b.id}')" class="btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">Details</button></td>
                    </tr>
                `).join('') : `<tr><td colspan="8" style="text-align:center; color:var(--text-secondary); padding:2rem;">No history records found.</td></tr>`;
            }

        } catch (error) {
            console.error('Error loading student bookings:', error);
        }
    };

    // =========================================================
    // NOTIFICATIONS HANDLING
    // =========================================================
    const notifBellBtn = document.getElementById('notif-bell-btn');
    const notifModal = document.getElementById('notifications-modal');
    const closeNotifBtn = document.getElementById('close-notif-btn');
    const notifBadge = document.getElementById('notif-badge');
    const notifContainer = document.getElementById('notif-list-container');

    const loadNotifications = async () => {
        try {
            const notifs = await API.getNotifications(storedUserId);
            const items = Array.isArray(notifs) ? notifs : (notifs.data || []);
            const unread = items.filter(n => !n.isRead && String(n.status).toUpperCase() !== 'READ');

            if (notifBadge) {
                notifBadge.textContent = unread.length;
                notifBadge.style.display = unread.length > 0 ? 'inline-block' : 'none';
            }

            if (notifContainer) {
                if (items.length === 0) {
                    notifContainer.innerHTML = `<p style="color:#71717a; font-size:0.85rem; text-align:center; padding:1rem 0;">No notifications at this time.</p>`;
                } else {
                    notifContainer.innerHTML = items.slice(0, 10).map(n => `
                        <div style="padding:0.6rem; border-radius:8px; background:${n.isRead ? '#27272a' : '#3f3f46'}; font-size:0.85rem;">
                            <div style="font-weight:700; color:#f4f4f5; margin-bottom:2px;">${n.title}</div>
                            <div style="color:#d4d4d8; font-size:0.8rem;">${n.message}</div>
                            <div style="color:#a1a1aa; font-size:0.72rem; margin-top:4px;">${n.time || n.createdAt || ''}</div>
                        </div>
                    `).join('');
                }
            }
        } catch (err) {
            console.error('Error loading notifications:', err);
        }
    };

    if (notifBellBtn && notifModal) {
        notifBellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = notifModal.style.display === 'block';
            notifModal.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) loadNotifications();
        });
    }

    if (closeNotifBtn && notifModal) {
        closeNotifBtn.addEventListener('click', () => {
            notifModal.style.display = 'none';
        });
    }

    document.addEventListener('click', (e) => {
        if (notifModal && notifModal.style.display === 'block' && !notifModal.contains(e.target) && e.target !== notifBellBtn) {
            notifModal.style.display = 'none';
        }
    });

    // =========================================================
    // BOOKING STATUS TRACKER
    // =========================================================
    window.checkStatus = async (reqId) => {
        switchSection('status');
        const searchInput = document.getElementById('status-search-input');
        if (searchInput) searchInput.value = reqId;

        const container = document.getElementById('status-details-container');
        if (container) container.style.display = 'block';

        try {
            const details = await API.getBookingStatus(reqId);

            document.getElementById('stat-id').textContent = details.id;
            document.getElementById('stat-lab').textContent = details.lab;
            document.getElementById('stat-date').textContent = details.date;
            document.getElementById('stat-time').textContent = details.time;
            document.getElementById('stat-purpose').textContent = details.purpose;

            const statuses = [
                'Pending',
                'Scheduling',
                'Allocated',
                'Approved',
                'Completed'
            ];

            const cur = String(details.currentStatus || 'Pending').toLowerCase();
            let currentIdx = 0;
            if (cur === 'scheduling') currentIdx = 1;
            if (cur === 'allocated') currentIdx = 2;
            if (cur === 'approved' || cur === 'confirmed') currentIdx = 3;
            if (cur === 'completed') currentIdx = 4;
            if (cur === 'rejected') currentIdx = 3;

            let trackerHTML = '';

            statuses.forEach((status, idx) => {
                let className = '';

                if (idx < currentIdx) className = 'completed';
                else if (idx === currentIdx) className = 'active';

                let title = status;
                if (status === 'Pending') title = 'Request Submitted';
                if (status === 'Scheduling') title = 'Waiting for Scheduling';
                if (status === 'Allocated') title = 'Resource Allocation';
                if (status === 'Approved' && cur === 'rejected') title = 'Request Rejected ✗';

                trackerHTML += `
                    <div class="status-step ${className}">
                        <div class="step-icon"></div>
                        <div class="step-content">
                            <h4>${title}</h4>
                        </div>
                    </div>
                `;
            });

            document.getElementById('status-tracker').innerHTML = trackerHTML;
            container.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Booking status error:', error);
            showToast(error.message || 'Unable to load booking status.', 'error');
        }
    };

    const statusForm = document.getElementById('status-search-form');
    if (statusForm) {
        statusForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('status-search-input').value;
            if (id) checkStatus(id);
        });
    }

    // =========================================================
    // LOGOUT
    // =========================================================
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.Auth) {
                window.Auth.logout();
            } else {
                sessionStorage.clear();
                window.location.href = '../index.html';
            }
        });
    }

    // =========================================================
    // INITIAL LOAD & LIVE POLLING
    // =========================================================
    loadAvailableLabs();
    loadBookLabInit();
    loadMyBookings();
    loadNotifications();

    // Live sync polling every 5 seconds
    setInterval(() => {
        loadMyBookings();
        loadNotifications();
        loadAvailableLabs();
    }, 5000);

});