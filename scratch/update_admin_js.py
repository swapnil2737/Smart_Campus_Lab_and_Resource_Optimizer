import re

with open('js/admin.js', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# 1. Clean up corrupted toast icons
content = re.sub(
    r"let icon = [^;]+;\s*if \(type === 'success'\) icon = [^;]+;\s*if \(type === 'warning'\) icon = [^;]+;\s*if \(type === 'error'\) icon = [^;]+;",
    "let icon = 'ℹ️';\n        if (type === 'success') icon = '✅';\n        if (type === 'warning') icon = '⚠️';\n        if (type === 'error') icon = '❌';",
    content
)

# 2. Clean up corrupted priority pill
content = re.sub(
    r'<span class="priority-pill priority-high">[^<]*HIGH PRIORITY</span>',
    '<span class="priority-pill priority-high">HIGH PRIORITY</span>',
    content
)

# 3. Clean up active booking alert text
content = re.sub(
    r"`[^`]*<strong>Active Booking Alert:</strong>",
    "`⚠️ <strong>Active Booking Alert:</strong>",
    content
)

# 4. Clean up in-charge icon
content = re.sub(
    r"<span>[^<]*In-charge: \${lab\.incharge",
    "<span>👤 In-charge: ${lab.incharge",
    content
)

# 5. Clean up air conditioned / projector checks
content = content.replace("Yes o.", "Yes ✓").replace("Available o.", "Available ✓")

# 6. Update badge counts in refreshDashboardData
old_badge_calc = """            // Update Badges in Sidebar
            const activeMnt = maintenance.filter(m => m.status === 'Under Maintenance').length;
            const sidebarMntBadge = document.getElementById('sidebar-mnt-badge');
            if (sidebarMntBadge) sidebarMntBadge.textContent = activeMnt;

            const pendingBookings = bookings.filter(b => String(b.status || '').toLowerCase() === 'pending').length;
            const sidebarReqBadge = document.getElementById('sidebar-req-badge');
            if (sidebarReqBadge) sidebarReqBadge.textContent = pendingBookings;

            const notifCount = document.getElementById('notif-count');
            if (notifCount) notifCount.textContent = activeMnt + pendingBookings;"""

new_badge_calc = """            // Update Badges in Sidebar
            const activeLabMnt = labs.filter(l => String(l.status || '').toLowerCase() === 'maintenance').length;
            const activeResMnt = maintenance.filter(m => m.status === 'Under Maintenance').length;
            const totalActiveMnt = activeLabMnt + activeResMnt;
            const sidebarMntBadge = document.getElementById('sidebar-mnt-badge');
            if (sidebarMntBadge) sidebarMntBadge.textContent = totalActiveMnt;

            const pendingBookings = bookings.filter(b => String(b.status || '').toLowerCase() === 'pending').length;
            const sidebarReqBadge = document.getElementById('sidebar-req-badge');
            if (sidebarReqBadge) sidebarReqBadge.textContent = pendingBookings;

            const notifCount = document.getElementById('notif-count');
            if (notifCount) notifCount.textContent = totalActiveMnt + pendingBookings;"""

if old_badge_calc in content:
    content = content.replace(old_badge_calc, new_badge_calc)
else:
    print("Warning: old_badge_calc not matched exactly")

# 7. Update renderMaintenance to include labs under maintenance
old_render_mnt = """    const renderMaintenance = () => {
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
    };"""

new_render_mnt = """    const renderMaintenance = () => {
        const tbody = document.getElementById('maintenance-tbody');
        if (!tbody) return;

        // Collect both lab maintenance records and resource maintenance tickets
        const labRecords = cachedLabs
            .filter(l => String(l.status || '').toLowerCase() === 'maintenance')
            .map(l => ({
                id: `LAB-MNT-${l.id}`,
                targetId: l.name || `Lab ${l.id}`,
                type: 'Laboratory',
                lab: l.name || `Lab ${l.id}`,
                issue: l.maintenanceReason || 'Whole Laboratory scheduled for maintenance.',
                priority: 'High',
                reportedAt: 'Active',
                assignedTo: l.incharge || 'Lab In-Charge',
                status: 'Under Maintenance',
                isLab: true,
                rawLabId: l.id
            }));

        const combinedList = [...labRecords, ...cachedMaintenance];

        let filtered = combinedList.filter(ticket => {
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
                        ${isActive ? `<button class="btn-admin btn-admin-success btn-admin-sm" onclick="promptResolveTicket('${ticket.id}')">Resolve / Complete</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('') : `<tr><td colspan="9" style="text-align: center; color: #94a3b8; padding: 2rem;">No maintenance records found.</td></tr>`;
    };"""

if old_render_mnt in content:
    content = content.replace(old_render_mnt, new_render_mnt)
else:
    print("Warning: old_render_mnt not matched exactly")

# 8. Update confirmResolveBtn to handle LAB-MNT-* tickets
old_confirm_resolve = """    // Confirm Resolve Ticket
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
    }"""

new_confirm_resolve = """    // Confirm Resolve Ticket
    const confirmResolveBtn = document.getElementById('btn-confirm-resolve-ticket');
    if (confirmResolveBtn) {
        confirmResolveBtn.addEventListener('click', async () => {
            const { ticketId } = pendingMntResolution;
            const notes = document.getElementById('resolve-ticket-notes').value.trim() || 'Serviced and verified by technician';
            if (ticketId) {
                try {
                    if (ticketId.startsWith('LAB-MNT-')) {
                        const labId = parseInt(ticketId.replace('LAB-MNT-', ''), 10);
                        const result = await API.updateLabStatus(labId, 'Available', notes);
                        if (result && result.success === false) {
                            throw new Error(result.message || 'Unable to restore lab.');
                        }
                        closeModal('resolve-ticket-modal');
                        showToast(`Laboratory restored to Available!`, 'success');
                    } else {
                        const result = await API.completeMaintenance(ticketId, notes);
                        if (result && result.success === false) {
                            throw new Error(result.message || 'Unable to complete maintenance.');
                        }
                        closeModal('resolve-ticket-modal');
                        showToast(`Ticket ${ticketId} resolved & completed!`, 'success');
                    }

                    // Reload shared SQL Server state immediately
                    await refreshDashboardData();
                } catch (err) {
                    console.error('Error completing maintenance:', err);
                    showToast(err.message || 'Unable to complete maintenance.', 'error');
                }
            }
        });
    }"""

if old_confirm_resolve in content:
    content = content.replace(old_confirm_resolve, new_confirm_resolve)
else:
    print("Warning: old_confirm_resolve not matched exactly")

# 9. Update showTicketDetails to handle LAB-MNT-*
old_show_ticket = """    window.showTicketDetails = (ticketId) => {
        const ticket = cachedMaintenance.find(t => t.id === ticketId);
        if (!ticket) return;

        const titleEl = document.getElementById('details-modal-title');
        const bodyEl = document.getElementById('details-modal-body');

        titleEl.textContent = `Maintenance Ticket: ${ticket.id}`;"""

new_show_ticket = """    window.showTicketDetails = (ticketId) => {
        let ticket = cachedMaintenance.find(t => t.id === ticketId);
        if (!ticket && ticketId.startsWith('LAB-MNT-')) {
            const labId = parseInt(ticketId.replace('LAB-MNT-', ''), 10);
            const lab = cachedLabs.find(l => l.id === labId);
            if (lab) {
                ticket = {
                    id: ticketId,
                    targetId: lab.name || `Lab ${lab.id}`,
                    type: 'Laboratory',
                    lab: lab.name || `Lab ${lab.id}`,
                    issue: 'Whole Laboratory scheduled for maintenance. Student and faculty bookings suspended.',
                    priority: 'High',
                    reportedBy: 'System Administrator',
                    reportedAt: 'Active',
                    assignedTo: lab.incharge || 'Lab In-Charge',
                    status: 'Under Maintenance'
                };
            }
        }
        if (!ticket) return;

        const titleEl = document.getElementById('details-modal-title');
        const bodyEl = document.getElementById('details-modal-body');

        titleEl.textContent = `Maintenance Details: ${ticket.targetId}`;"""

if old_show_ticket in content:
    content = content.replace(old_show_ticket, new_show_ticket)
else:
    print("Warning: old_show_ticket not matched exactly")

with open('js/admin.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("admin.js successfully updated!")
