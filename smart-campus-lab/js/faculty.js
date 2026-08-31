// js/faculty.js

document.addEventListener('DOMContentLoaded', () => {
    // Role Security
    if (window.Auth) Auth.verifyRole('Faculty');

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
        // Add a mock faculty reserved lab for demonstration
        if (!allLabs.find(l => l.status === 'FACULTY RESERVED' || l.status === 'Faculty Reserved')) {
             allLabs.push({ id: 'LAB205', name: 'LAB 205', total: 40, status: 'Faculty Reserved' });
        }
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
            msgEl.textContent = `${labs.length} laboratories found.`;
        }
        
        labs.forEach(lab => {
            const statusClass = lab.status.toLowerCase().replace(' ', '-');
            const card = document.createElement('div');
            card.className = `lab-card ${statusClass}`;
            card.innerHTML = `
                <h3>${lab.name} <span class="lab-status ${statusClass === 'faculty-reserved' ? 'status-faculty-reserved' : ''}">${lab.status}</span></h3>
                ${lab.status === 'FACULTY RESERVED' ? `<p style="color:#4a235a; font-weight:600; font-size:0.85rem; margin-bottom:1rem;">Unavailable during the reserved time.</p>` : ''}
                <div class="lab-stats">
                    <div>Capacity:<br><span>${lab.total} PCs</span></div>
                </div>
                <div class="util-bar">
                    <div class="util-fill" style="width: ${lab.util}%"></div>
                </div>
                ${(lab.status !== 'MAINTENANCE' && lab.status !== 'FACULTY RESERVED' && lab.status !== 'Faculty Reserved' && lab.status !== 'Maintenance') 
                    ? `<button class="btn-primary" onclick="requestLab('${lab.id}')" style="background-color: var(--accent-color);">REQUEST ENTIRE LAB</button>` 
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
            validateBookingForm();
        }
    };

    const loadBookLabInit = () => {
        if (allLabs.length === 0) {
            API.getAvailableLabs().then(labs => {
                allLabs = labs;
                if (!allLabs.find(l => l.status === 'FACULTY RESERVED' || l.status === 'Faculty Reserved')) {
                     allLabs.push({ id: 'LAB205', name: 'LAB 205', total: 40, status: 'Faculty Reserved' });
                }
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

    // --- Book Lab Section ---
    const validateBookingForm = async () => {
        const labSelect = document.getElementById('book-lab-select').value;
        const dateInput = document.getElementById('book-date').value;
        const startInput = document.getElementById('book-start').value;
        const endInput = document.getElementById('book-end').value;
        
        const submitBtn = document.getElementById('book-submit-btn');
        const capacityCard = document.getElementById('capacity-info-card');
        const teamBPanel = document.getElementById('team-b-panel');
        const validationMsg = document.getElementById('validation-message');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'SEND LAB BOOKING REQUEST';
        teamBPanel.classList.add('hidden');
        if (validationMsg) {
            validationMsg.textContent = '';
            validationMsg.style.color = '#333';
        }
        
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
                if(lab.status === 'FACULTY RESERVED') color = '#4a235a';
                if(lab.status === 'MAINTENANCE') color = '#383d41';
                document.getElementById('info-status').style.color = color;
                document.getElementById('info-status').style.fontWeight = '700';

                if (lab.status === 'FULL' || lab.status === 'FACULTY RESERVED') {
                    API.getResourceRecommendation().then(rec => {
                        teamBPanel.classList.remove('hidden');
                        document.getElementById('suggested-requested').textContent = lab.name;
                        document.getElementById('suggested-lab').textContent = rec.suggestedLab;
                        document.getElementById('suggested-reason').textContent = rec.reason;
                    });
                }
            }
        } else {
            capacityCard.classList.add('hidden');
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

            const result = await API.submitFacultyBookingRequest(data);
            
            if (result.success) {
                showToast('Lab booking request submitted successfully.', 'success');
                bookForm.reset();
                document.getElementById('capacity-info-card').classList.add('hidden');
                document.getElementById('team-b-panel').classList.add('hidden');
                
                document.getElementById('request-result').innerHTML = `
                    <div class="alert alert-success" style="background:#d4edda; color:#155724; border:1px solid #c3e6cb; padding:1rem; border-radius:8px;">
                        <strong>Request ID:</strong> ${result.requestId}<br>
                        <strong>Status:</strong> Pending<br>
                        <em>Request submitted to Team A. Faculty requests are prioritized.</em>
                    </div>
                `;
            }
            
            btn.textContent = originalText;
            btn.disabled = true;
        });
    }

    // --- My Requests Section ---
    const loadMyBookings = async () => {
        const data = await API.getFacultyRequests();
        
        const pendingTbody = document.getElementById('pending-tbody');
        pendingTbody.innerHTML = data.pending.map(b => `
            <tr>
                <td>${b.id}</td>
                <td>${b.lab}</td>
                <td>${b.date}</td>
                <td>${b.time}</td>
                <td><span class="status-badge status-${b.status.toLowerCase().replace(' ', '-')}">${b.status}</span></td>
                <td><button onclick="checkStatus('${b.id}')" class="btn-primary" style="padding: 0.3rem 0.8rem; font-size: 0.85rem;">View</button></td>
            </tr>
        `).join('');
    };

    window.checkStatus = (reqId) => {
        const detailsContainer = document.getElementById('status-details-container');
        detailsContainer.style.display = 'block';
        
        // Mocking the fetch
        document.getElementById('stat-id').textContent = reqId;
        document.getElementById('stat-lab').textContent = 'LAB 204';
        document.getElementById('stat-datetime').textContent = '17 Aug 2026, 10:00 - 12:00';

        const statuses = ['Request Submitted', 'Scheduling', 'Lab Allocated', 'Approved', 'Faculty Reserved', 'Completed'];
        const currentIdx = 0; // Simulate 'Pending' / 'Request Submitted'
        
        let trackerHTML = '';
        statuses.forEach((s, idx) => {
            let className = '';
            if (idx < currentIdx) className = 'completed';
            else if (idx === currentIdx) className = 'active';

            trackerHTML += `
                <div class="status-step ${className}">
                    <div class="step-icon"></div>
                    <div class="step-content">
                        <h4>${s}</h4>
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
