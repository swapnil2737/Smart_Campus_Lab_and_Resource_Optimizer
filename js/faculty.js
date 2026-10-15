// js/faculty.js

document.addEventListener('DOMContentLoaded', () => {

    // Role Security
    if (window.Auth) {
        Auth.verifyRole('Faculty');
    }

    // Load Logged-In User Information
    const storedUser = sessionStorage.getItem('smartCampusUser') || 'Faculty Member';
    const storedRole = sessionStorage.getItem('smartCampusRole') || 'Faculty';
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
        if (sectionId === 'history') loadMyBookings();
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

            const activeFilterBtn = document.querySelector('#availability .filter-bar .filter-btn.active') || document.querySelector('#availability .filter-btn.active');
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
            // - If lab is available (< 5 PCs under maintenance) -> Standard Available button
            let buttonHtml = '';
            if (isFullMaint) {
                buttonHtml = `<button class="btn-primary" disabled style="background-color: #dc2626 !important; color: #ffffff; cursor: not-allowed; opacity: 0.85;">UNDER MAINTENANCE</button>`;
            } else {
                buttonHtml = `<button class="btn-primary" onclick="requestLab('${lab.id}')" style="background-color: var(--accent-color); color: #ffffff;">REQUEST ENTIRE LAB</button>`;
            }

            card.innerHTML = `
                <h3>${lab.name} ${statusBadge}</h3>
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

    // Filter Logic for Lab Availability Grid
    const availabilityFilterBtns = document.querySelectorAll('#availability .filter-btn');
    if (availabilityFilterBtns.length > 0) {
        availabilityFilterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                availabilityFilterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterAndRenderLabs(btn.dataset.filter);
            });
        });
    }

    // =========================================================
    // REQUEST ENTIRE LAB & FORM INITIALIZATION
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
                if (suggestedLab) suggestedLab.textContent = rec.suggestedLab || 'Lab 2';
                if (suggestedReason) suggestedReason.textContent = rec.reason || 'High availability slot';
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
        const teamBPanel = document.getElementById('team-b-panel');
        const validationMsg = document.getElementById('validation-message');

        if (!submitBtn) return;
        submitBtn.disabled = true;
        submitBtn.textContent = 'SEND LAB BOOKING REQUEST';
        if (teamBPanel) teamBPanel.classList.add('hidden');
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
                const totalPCs = lab.totalResources || lab.totalCapacity || lab.total || lab.capacity || 0;
                if (infoTotalCap) infoTotalCap.textContent = `${totalPCs} PCs`;
                if (infoStatus) {
                    infoStatus.textContent = lab.status;
                    let color = '#333';
                    const st = String(lab.status || '').toUpperCase();
                    if (st === 'AVAILABLE' || st === 'ACTIVE') color = '#155724';
                    if (st === 'BUSY' || st === 'OCCUPIED') color = '#856404';
                    if (st === 'FULL') color = '#721c24';
                    if (st === 'FACULTY RESERVED') color = '#4a235a';
                    if (st === 'MAINTENANCE') color = '#383d41';
                    infoStatus.style.color = color;
                    infoStatus.style.fontWeight = '700';
                }

                if (lab.status && (String(lab.status).toUpperCase() === 'FULL' || String(lab.status).toUpperCase() === 'FACULTY RESERVED')) {
                    API.getResourceRecommendation().then(rec => {
                        if (teamBPanel) {
                            teamBPanel.classList.remove('hidden');
                            document.getElementById('suggested-requested').textContent = lab.name;
                            document.getElementById('suggested-lab').textContent = rec.suggestedLab;
                            document.getElementById('suggested-reason').textContent = rec.reason;
                        }
                    });
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
                lab: document.getElementById('book-lab-select').value,
                date: document.getElementById('book-date').value,
                startTime: `${document.getElementById('book-date').value}T${start24}:00`,
                endTime: `${document.getElementById('book-date').value}T${end24}:00`,
                purpose: document.getElementById('book-purpose').value
            };

            let result;
            try {
                result = await API.submitFacultyBookingRequest(data);
            } catch (error) {
                showToast(error.message || 'Could not submit the booking request.', 'error');
                btn.textContent = originalText;
                btn.disabled = false;
                return;
            }

            if (result && result.success) {
                showToast('Lab booking request submitted successfully.', 'success');
                bookForm.reset();
                document.getElementById('capacity-info-card').classList.add('hidden');
                const teamBPanel = document.getElementById('team-b-panel');
                if (teamBPanel) teamBPanel.classList.add('hidden');

                document.getElementById('request-result').innerHTML = `
                    <div class="alert alert-success" style="background:#d4edda; color:#155724; border:1px solid #c3e6cb; padding:1rem; border-radius:8px;">
                        <strong>Request ID:</strong> ${result.requestId}<br>
                        <strong>Status:</strong> Pending<br>
                        <em>Request submitted to Team A / Admin. Faculty requests are prioritized.</em>
                    </div>
                `;

                // Reload bookings immediately
                await loadMyBookings();
            }

            btn.textContent = originalText;
            btn.disabled = true;
        });
    }

    // =========================================================
    // MY REQUESTS & BOOKING HISTORY (COMBINED SINGLE TABLE)
    // =========================================================
    let cachedFacultyBookings = [];
    let currentFacultyBookingFilter = 'all';

    const renderCombinedFacultyBookingsTable = () => {
        const tbody = document.getElementById('combined-bookings-tbody');
        if (!tbody) return;

        let filtered = cachedFacultyBookings.filter(b => {
            if (currentFacultyBookingFilter === 'all') return true;
            const st = String(b.status || '').toUpperCase();
            if (currentFacultyBookingFilter === 'pending') {
                return st === 'PENDING' || st === 'SCHEDULING';
            }
            if (currentFacultyBookingFilter === 'approved') {
                return st === 'APPROVED' || st === 'CONFIRMED' || st === 'ACCEPTED';
            }
            if (currentFacultyBookingFilter === 'rejected') {
                return st === 'REJECTED' || st === 'CANCELLED' || st === 'EXPIRED';
            }
            return true;
        });

        const countBadge = document.getElementById('faculty-booking-count-badge');
        if (countBadge) {
            countBadge.textContent = `Showing ${filtered.length} of ${cachedFacultyBookings.length} bookings`;
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-secondary); padding:2rem;">No reservation requests found for the selected filter.</td></tr>`;
        } else {
            tbody.innerHTML = filtered.map(b => {
                const isPending = String(b.status || '').toUpperCase() === 'PENDING' || String(b.status || '').toUpperCase() === 'SCHEDULING';
                return `
                    <tr>
                        <td><strong>${b.id}</strong></td>
                        <td>${b.lab}</td>
                        <td>${b.date}</td>
                        <td>${b.time}</td>
                        <td>${b.purpose || 'Class Practical'}</td>
                        <td style="font-size:0.8rem; color:var(--text-secondary);">${b.submitted || b.submittedAt || 'Recently'}</td>
                        <td>${getStatusBadge(b.status)}</td>
                        <td><button onclick="checkStatus('${b.id}')" class="btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">${isPending ? 'Track Status' : 'View Details'}</button></td>
                    </tr>
                `;
            }).join('');
        }
    };

    // Filter pill buttons in faculty dashboard
    document.querySelectorAll('#faculty-booking-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#faculty-booking-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFacultyBookingFilter = btn.dataset.bookingFilter || 'all';
            renderCombinedFacultyBookingsTable();
        });
    });

    const loadMyBookings = async () => {
        try {
            const data = await API.getMyBookings();
            const pending = Array.isArray(data.pending) ? data.pending : [];
            const approved = Array.isArray(data.approved) ? data.approved : [];
            const allItems = Array.isArray(data.data) ? data.data : (data.items || []);

            cachedFacultyBookings = allItems;

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
                            <td>${b.purpose || 'Class Practical'}</td>
                            <td>${getStatusBadge(b.status)}</td>
                            <td><button onclick="checkStatus('${b.id}')" class="btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">Track</button></td>
                        </tr>
                    `).join('');
                }
            }

            // 3. Render Combined Bookings Table
            renderCombinedFacultyBookingsTable();

            // 4. Render History Section Table
            const historyTbody = document.getElementById('history-tbody');
            if (historyTbody) {
                historyTbody.innerHTML = allItems.length ? allItems.map(b => `
                    <tr>
                        <td><strong>${b.id}</strong></td>
                        <td>${b.lab}</td>
                        <td>${b.date}</td>
                        <td>${b.time}</td>
                        <td>${b.purpose || 'Class Practical'}</td>
                        <td style="font-size:0.8rem; color:var(--text-secondary);">${b.submitted || b.submittedAt || 'Recently'}</td>
                        <td>${getStatusBadge(b.status)}</td>
                        <td><button onclick="checkStatus('${b.id}')" class="btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">Details</button></td>
                    </tr>
                `).join('') : `<tr><td colspan="8" style="text-align:center; color:var(--text-secondary); padding:2rem;">No past bookings found in the database.</td></tr>`;
            }

        } catch (error) {
            console.error('Error loading faculty bookings:', error);
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
    // STATUS TRACKER
    // =========================================================
    window.checkStatus = async (reqId) => {
        switchSection('my-bookings');
        const detailsContainer = document.getElementById('status-details-container');
        if (detailsContainer) detailsContainer.style.display = 'block';

        try {
            const details = await API.getBookingStatus(reqId);

            document.getElementById('stat-id').textContent = details.id;
            document.getElementById('stat-lab').textContent = details.lab;
            document.getElementById('stat-datetime').textContent = `${details.date} ${details.time}`;

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
            detailsContainer.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            showToast(error.message || 'Booking not found.', 'error');
        }
    };

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

    // Live Sync Polling every 5 seconds
    setInterval(() => {
        loadMyBookings();
        loadNotifications();
        loadAvailableLabs();
    }, 5000);
});
