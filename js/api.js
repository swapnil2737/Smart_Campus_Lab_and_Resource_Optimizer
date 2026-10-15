/*
=========================================================
SMART CAMPUS LAB
FRONTEND CENTRAL API LAYER
FLASK + SQL SERVER
=========================================================
*/

const API_HOST = (typeof window !== "undefined" && window.location && window.location.hostname === "localhost") 
    ? "localhost" 
    : "127.0.0.1";

const API_BASE_URL =
    (window.SMART_CAMPUS_API_URL ||
        `http://${API_HOST}:5000/api`).replace(/\/$/, "");


/* =====================================================
   COMMON REQUEST FUNCTION
   ===================================================== */

async function requestBackend(path, options = {}) {
    const url = `${API_BASE_URL}${path}`;
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message || `Backend request failed with status ${response.status}`
            );
        }

        return data;
    } catch (err) {
        if (err.message && err.message.includes("Failed to fetch")) {
            throw new Error(
                "Cannot connect to the backend server. Please ensure the Flask API is running on " + API_BASE_URL
            );
        }
        throw err;
    }
}


/* =====================================================
   BOOKING DATA CONVERSION HELPER
   ===================================================== */

function toBackendBooking(data) {
    const userId = Number(
        data.userId || sessionStorage.getItem("smartCampusUserId")
    );

    if (!userId) {
        throw new Error(
            "Please log in again before creating a booking."
        );
    }

    const labId = Number(data.lab || data.labId);
    if (!labId || isNaN(labId)) {
        throw new Error("Please select a valid laboratory.");
    }

    let startTime = data.startTime;
    let endTime = data.endTime;

    if (data.date && startTime && !String(startTime).includes("T")) {
        startTime = `${data.date}T${startTime}:00`;
    }
    if (data.date && endTime && !String(endTime).includes("T")) {
        endTime = `${data.date}T${endTime}:00`;
    }

    return {
        userId: userId,
        labId: labId,
        purpose: data.purpose || "",
        studentCount: Number(data.studentCount || data.capacity || 1),
        startTime: startTime,
        endTime: endTime
    };
}


/* =====================================================
   API OBJECT
   ===================================================== */

const API = {

    /* =================================================
       HEALTH & DIAGNOSTICS
       ================================================= */
    health: async function () {
        return await requestBackend("/health");
    },

    dbTest: async function () {
        return await requestBackend("/db-test");
    },


    /* =================================================
       AUTHENTICATION
       ================================================= */
    login: async function (usernameOrEmail, password, role) {
        return await requestBackend("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: usernameOrEmail,
                username: usernameOrEmail,
                password: password,
                role: role
            })
        });
    },

    register: async function (userData) {
        return await requestBackend("/auth/register", {
            method: "POST",
            body: JSON.stringify(userData)
        });
    },

    forgotPassword: async function (emailOrUsername, newPassword) {
        return await requestBackend("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({
                emailOrUsername: emailOrUsername,
                newPassword: newPassword
            })
        });
    },

    logout: async function () {
        try {
            return await requestBackend("/auth/logout", { method: "POST" });
        } catch (e) {
            return { success: true };
        }
    },


    /* =================================================
       LABS
       ================================================= */
    getLabs: async function () {
        return await requestBackend("/labs");
    },

    getAvailableLabs: async function () {
        const labs = await requestBackend("/labs");
        return Array.isArray(labs) ? labs : [];
    },

    updateLabStatus: async function (labId, status, reason = "") {
        return await requestBackend(`/admin/labs/${labId}/status`, {
            method: "PATCH",
            body: JSON.stringify({
                status: status,
                reason: reason
            })
        });
    },


    /* =================================================
       RESOURCES
       ================================================= */
    getResources: async function (lab = "all") {
        if (lab && lab !== "all") {
            return await requestBackend(`/admin/resources?lab=${encodeURIComponent(lab)}`);
        }
        return await requestBackend("/resources");
    },

    updateResourceStatus: async function (resourceId, status, reason = "") {
        return await requestBackend(`/admin/resources/${encodeURIComponent(resourceId)}/status`, {
            method: "PATCH",
            body: JSON.stringify({
                status: status,
                reason: reason
            })
        });
    },


    /* =================================================
       MAINTENANCE
       ================================================= */
    getMaintenanceRequests: async function () {
        return await requestBackend("/maintenance");
    },

    createMaintenanceTicket: async function (data) {
        return await requestBackend("/admin/maintenance", {
            method: "POST",
            body: JSON.stringify(data)
        });
    },

    startMaintenance: async function (maintenanceId) {
        return await requestBackend(`/admin/maintenance/${maintenanceId}/start`, {
            method: "POST"
        });
    },

    completeMaintenance: async function (maintenanceId, notes = "") {
        return await requestBackend(`/admin/maintenance/${maintenanceId}/complete`, {
            method: "POST",
            body: JSON.stringify({
                resolutionNotes: notes || "Resolved and verified."
            })
        });
    },

    markMaintenanceComplete: async function (maintenanceId, notes) {
        return await this.completeMaintenance(maintenanceId, notes);
    },

    reportMaintenanceIssue: async function (data) {
        return await requestBackend("/maintenance/report", {
            method: "POST",
            body: JSON.stringify(data)
        });
    },

    reportIssue: async function (data) {
        return await this.reportMaintenanceIssue(data);
    },

    getMyMaintenanceIssues: async function (userIdParam) {
        const userId = Number(userIdParam || sessionStorage.getItem("smartCampusUserId"));
        if (!userId) return [];
        return await requestBackend(`/maintenance/my/${userId}`);
    },


    /* =================================================
       BOOKINGS & CONFLICT CHECKING
       ================================================= */
    getBookingRequests: async function () {
        return await requestBackend("/admin/booking-requests");
    },

    getPendingBookings: async function () {
        const res = await requestBackend("/bookings/pending");
        return res.data || (Array.isArray(res) ? res : []);
    },

    getMyBookings: async function (userIdParam) {
        const userId = Number(userIdParam || sessionStorage.getItem("smartCampusUserId"));
        if (!userId) {
            return { pending: [], approved: [], rejected: [], data: [] };
        }
        return await requestBackend(`/bookings/my/${userId}`);
    },

    getFacultyRequests: async function () {
        return await this.getMyBookings();
    },

    getBookingStatus: async function (requestId) {
        return await requestBackend(`/bookings/status/${encodeURIComponent(requestId)}`);
    },

    checkBookingConflict: async function (labId, startTime, endTime) {
        const query = new URLSearchParams({
            labId: labId,
            startTime: startTime,
            endTime: endTime
        });
        return await requestBackend(`/bookings/check-conflict?${query.toString()}`);
    },

    checkBookingAvailability: async function (labId, startTime, endTime) {
        return await this.checkBookingConflict(labId, startTime, endTime);
    },

    createBooking: async function (bookingData) {
        return await this.createBookingRequest(bookingData);
    },

    createBookingRequest: async function (bookingData) {
        const payload = toBackendBooking(bookingData);
        return await requestBackend("/bookings", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    },

    submitFacultyBookingRequest: async function (bookingData) {
        return await this.createBookingRequest(bookingData);
    },

    approveBooking: async function (bookingId, userId) {
        const approverId = Number(userId || sessionStorage.getItem("smartCampusUserId") || 1);
        return await requestBackend(`/bookings/${bookingId}/approve`, {
            method: "PUT",
            body: JSON.stringify({ userId: approverId })
        });
    },

    rejectBooking: async function (bookingId, reason = "", userId) {
        const rejecterId = Number(userId || sessionStorage.getItem("smartCampusUserId") || 1);
        return await requestBackend(`/bookings/${bookingId}/reject`, {
            method: "PUT",
            body: JSON.stringify({
                userId: rejecterId,
                reason: reason || "Unavailable at requested time"
            })
        });
    },


    /* =================================================
       NOTIFICATIONS
       ================================================= */
    getNotifications: async function (userIdParam) {
        const userId = Number(userIdParam || sessionStorage.getItem("smartCampusUserId"));
        const url = userId ? `/notifications/${userId}` : "/notifications";
        const res = await requestBackend(url);
        return res.data || (Array.isArray(res) ? res : []);
    },

    markNotificationRead: async function (notificationId) {
        return await requestBackend(`/notifications/${notificationId}/read`, {
            method: "PUT"
        });
    },


    /* =================================================
       ADMIN DASHBOARD, USERS, REPORTS & LOGS
       ================================================= */
    getDashboardStats: async function () {
        return await requestBackend("/admin/dashboard-stats");
    },

    getUsers: async function () {
        return await requestBackend("/admin/users");
    },

    getActivityLogs: async function () {
        return await requestBackend("/admin/activity-logs");
    },

    getReports: async function () {
        return await requestBackend("/admin/reports");
    },


    /* =================================================
       LAB ASSISTANT
       ================================================= */
    getLabAssistantStats: async function () {
        return await requestBackend("/lab-assistant/stats");
    },

    getTodaysSchedule: async function () {
        return await requestBackend("/lab-assistant/schedule/today");
    },


    /* =================================================
       RESOURCE RECOMMENDATION
       ================================================= */
    getRecommendation: async function () {
        return await requestBackend("/recommendation");
    },

    getResourceRecommendation: async function () {
        return await this.getRecommendation();
    }
};

window.API = API;