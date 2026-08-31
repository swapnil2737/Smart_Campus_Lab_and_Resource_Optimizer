// js/student.js

document.addEventListener('DOMContentLoaded', () => {
    // Role Security
    if (window.Auth) Auth.verifyRole('Student');

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
        
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }

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
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => toast.className = 'toast hidden', 3000);
    };

    // --- Lab Availability Section ---
    let allLabs = [];

    const loadAvailableLabs = async () => {
        allLabs = await API.getAvailableLabs();
        renderLabs(allLabs);
        if (window.BookingUtils) BookingUtils.populateLabDropdown(allLabs);
    };

    const renderLabs = (labs) => {
        const grid = document.getElementById('labs-grid');
        grid.innerHTML = '';
        
        const msgEl = document.getElementById('filter-result-msg');
        if (labs.length === 0) {
            msgEl.textContent = "No laboratories found for this status.";
        } else {
            msgEl.textContent = `${labs.length} laboratories available.`;
        }
        
        labs.forEach(lab => {
            const statusClass = lab.status.toLowerCase();
            const card = document.createElement('div');
            card.className = `lab-card ${statusClass}`;
            card.innerHTML = `
                <h3>${lab.name} <span class="lab-status">${lab.status}</span></h3>
                <div class="lab-stats">
                    <div>Capacity:<br><span>${lab.total} PCs</span></div>
                </div>
                <div class="util-bar">
                    <div class="util-fill" style="width: ${lab.util}%"></div>
                </div>
                ${lab.status !== 'MAINTENANCE' && lab.status !== 'FULL' 
                    ? `<button class="btn-primary" onclick="requestLab('${lab.id}')">REQUEST THIS LAB</button>` 
                    : `<button class="btn-primary" disabled>UNAVAILABLE</button>`}
            `;
            grid.appendChild(card);
        });
    };

    // Filter Logic
    const filterBtns = document.querySelectorAll('.filter-btn');
    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const filter = btn.dataset.filter;
                if (filter === 'all') {
                    renderLabs(allLabs);
                } else {
                    const filtered = allLabs.filter(l => l.status.toLowerCase() === filter);
                    renderLabs(filtered);
                }
            });
        });
    }

    window.requestLab = (labId) => {
        switchSection('book');
        const labSelect = document.getElementById('book-lab-select');
        if (labSelect) {
            Array.from(labSelect.options).forEach(opt => {
                if(opt.value === labId) opt.selected = true;
            });
            // Trigger validation to update UI
            validateBookingForm();
        }
    };

    // --- Book Lab Section ---
    const loadBookLabInit = () => {
        API.getResourceRecommendation().then(rec => {
            document.getElementById('suggested-lab').textContent = rec.suggestedLab;
            document.getElementById('suggested-reason').textContent = rec.reason;
        });
        
        if (allLabs.length === 0) {
            API.getAvailableLabs().then(labs => {
                allLabs = labs;
                if (window.BookingUtils) {
                    BookingUtils.populateLabDropdown(allLabs);
                    BookingUtils.setMinimumBookingDate();
                    BookingUtils.attachDateListener('book-date', 'validation-message');
                }
            });
        } else {
            if (window.BookingUtils) {
                BookingUtils.populateLabDropdown(allLabs);
                BookingUtils.setMinimumBookingDate();
                BookingUtils.attachDateListener('book-date', 'validation-message');
            }
        }
    };

    const validateBookingForm = async () => {
        const labSelect = document.getElementById('book-lab-select').value;
        const dateInput = document.getElementById('book-date').value;
        const startInput = document.getElementById('book-start').value;
        const endInput = document.getElementById('book-end').value;
        
        const submitBtn = document.getElementById('book-submit-btn');
        const capacityCard = document.getElementById('capacity-info-card');
        const validationMsg = document.getElementById('validation-message');
        
        // Reset states
        submitBtn.disabled = true;
        if (validationMsg) {
            validationMsg.textContent = '';
            validationMsg.style.color = '#333';
        }
        
        // Update Capacity Card
        if (labSelect) {
            capacityCard.classList.remove('hidden');
            const labs = allLabs.length > 0 ? allLabs : await API.getAvailableLabs();
            const lab = labs.find(l => l.id === labSelect);
            if (lab) {
                document.getElementById('info-lab-name').textContent = lab.name;
                document.getElementById('info-total-cap').textContent = `${lab.total} PCs`;
                document.getElementById('info-status').textContent = lab.status;
                
                let color = '#333';
                if(lab.status === 'AVAILABLE') color = '#155724';
                if(lab.status === 'BUSY') color = '#856404';
                if(lab.status === 'FULL') color = '#721c24';
                if(lab.status === 'MAINTENANCE') color = '#383d41';
                document.getElementById('info-status').style.color = color;
                document.getElementById('info-status').style.fontWeight = '700';
            }
        } else {
            capacityCard.classList.add('hidden');
        }

        // Strict validation sequence
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
            // Fallback if booking util fails to load
            if (startInput >= endInput) return;
        }
        
        // All valid
        submitBtn.disabled = false;
    };

    const bookForm = document.getElementById('book-form');
    if (bookForm) {
        const formInputs = ['book-lab-select', 'book-date', 'book-start', 'book-end', 'book-purpose'];
        formInputs.forEach(id => {
            document.getElementById(id).addEventListener('input', validateBookingForm);
            document.getElementById(id).addEventListener('change', validateBookingForm);
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

            const data = {
                lab: document.getElementById('book-lab-select').value,
                date: document.getElementById('book-date').value,
                startTime: document.getElementById('book-start').value,
                endTime: document.getElementById('book-end').value,
                purpose: document.getElementById('book-purpose').value
            };

            const result = await API.createBookingRequest(data);
            
            if (result.success) {
                showToast('Booking request submitted successfully.', 'success');
                bookForm.reset();
                document.getElementById('capacity-info-card').classList.add('hidden');
                
                document.getElementById('request-result').innerHTML = `
                    <div class="alert alert-success" style="background:#d4edda; color:#155724; border:1px solid #c3e6cb;">
                        <strong>Request ID:</strong> ${result.requestId}<br>
                        <strong>Status:</strong> Pending<br>
                        <em>Waiting for Team A scheduling.</em>
                    </div>
                `;
            }
            
            btn.textContent = originalText;
            btn.disabled = true; // Stay disabled after reset until inputs are filled again
        });
    }

    // --- My Bookings Section ---
    const loadMyBookings = async () => {
        const data = await API.getMyBookings();
        
        const pendingTbody = document.getElementById('pending-tbody');
        pendingTbody.innerHTML = data.pending.map(b => `
            <tr>
                <td>${b.id}</td>
                <td>${b.lab}</td>
                <td>${b.date}</td>
                <td>${b.time}</td>
                <td>${b.submitted}</td>
                <td><span class="status-badge status-${b.status.toLowerCase()}">${b.status}</span></td>
                <td><button onclick="checkStatus('${b.id}')" class="btn-primary" style="padding: 0.3rem 0.8rem; font-size: 0.85rem;">View</button></td>
            </tr>
        `).join('');

        const approvedTbody = document.getElementById('approved-tbody');
        approvedTbody.innerHTML = data.approved.map(b => `
            <tr>
                <td>${b.id}</td>
                <td>${b.lab}</td>
                <td>${b.date}</td>
                <td>${b.time}</td>
                <td><span class="status-badge status-${b.status.toLowerCase()}">${b.status}</span></td>
            </tr>
        `).join('');
    };

    window.checkStatus = (reqId) => {
        switchSection('status');
        document.getElementById('status-search-input').value = reqId;
        loadBookingStatus(reqId);
    };

    // --- Booking Status Section ---
    const statusForm = document.getElementById('status-search-form');
    if (statusForm) {
        statusForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('status-search-input').value;
            loadBookingStatus(id);
        });
    }

    const loadBookingStatus = async (reqId) => {
        const details = await API.getBookingStatus(reqId);

        const container = document.getElementById('status-details-container');
        container.style.display = 'block';

        document.getElementById('stat-id').textContent = details.id;
        document.getElementById('stat-lab').textContent = details.lab;
        document.getElementById('stat-date').textContent = details.date;
        document.getElementById('stat-time').textContent = details.time;
        document.getElementById('stat-purpose').textContent = details.purpose;

        const statuses = ['Pending', 'Scheduling', 'Allocated', 'Approved', 'Completed'];
        const currentIdx = statuses.indexOf(details.currentStatus);
        
        let trackerHTML = '';
        statuses.forEach((s, idx) => {
            let className = '';
            if (idx < currentIdx) className = 'completed';
            else if (idx === currentIdx) className = 'active';

            let title = s;
            if (s === 'Pending') title = 'Request Submitted';
            if (s === 'Scheduling') title = 'Waiting for Scheduling';
            if (s === 'Allocated') title = 'Resource Allocation';

            trackerHTML += `
                <div class="status-step ${className}">
                    <div class="step-icon"></div>
                    <div class="step-content">
                        <h4>${title}</h4>
                        ${idx === currentIdx && (s === 'Scheduling' || s === 'Allocated') ? `<p>Handled by Team A</p>` : ''}
                    </div>
                </div>
            `;
        });
        document.getElementById('status-tracker').innerHTML = trackerHTML;
    };

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(window.Auth) {
                window.Auth.logout();
            } else {
                window.location.href = '../index.html';
            }
        });
    }
});
