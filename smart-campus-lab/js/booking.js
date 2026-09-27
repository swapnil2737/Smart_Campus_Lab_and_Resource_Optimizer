// js/booking.js

const BookingUtils = {
    setMinimumBookingDate: () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const today = `${year}-${month}-${day}`;
        
        const dateInputs = document.querySelectorAll('input[type="date"]');
        dateInputs.forEach(input => {
            input.min = today;
        });
    },

    isValidBookingDate: (dateValue) => {
        if (!dateValue) {
            return false;
        }
        const selectedDate = new Date(dateValue + "T00:00:00");
        const now = new Date();
        const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );
        return selectedDate >= today;
    },

    populateLabDropdown: (labs) => {
        const select = document.getElementById("book-lab-select");
        if (!select) return;
        
        const currentVal = select.value;
        select.innerHTML = '<option value="">Select Lab</option>';
        
        labs.forEach(lab => {
            const option = document.createElement("option");
            option.value = lab.id; // Using exact lab id as requested
            option.textContent = `${lab.name} — ${lab.status}`;
            select.appendChild(option);
        });

        if (currentVal) {
            select.value = currentVal;
        }
    },

    attachDateListener: (dateInputId, msgContainerId) => {
        const dateInput = document.getElementById(dateInputId);
        const msgContainer = document.getElementById(msgContainerId);
        
        if (dateInput) {
            dateInput.addEventListener("change", function () {
                if (!BookingUtils.isValidBookingDate(this.value)) {
                    if (msgContainer) {
                        msgContainer.textContent = "Previous dates cannot be selected. Please select today or a future date.";
                        msgContainer.style.color = '#721c24';
                    }
                    this.value = "";
                    const submitBtn = document.getElementById('book-submit-btn');
                    if(submitBtn) submitBtn.disabled = true;
                    return;
                }
                
                // Clear error if valid, although form validation might overwrite this immediately
                if (msgContainer && msgContainer.textContent.includes("Previous dates")) {
                    msgContainer.textContent = "";
                }
            });
        }
    },

    getMockReservations: () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const today = `${year}-${month}-${day}`;

        return [
            { labId: 'LAB102', date: today, start: '10:00', end: '12:00', type: 'Busy' },
            { labId: 'LAB103', date: today, start: '08:00', end: '18:00', type: 'Full' },
            { labId: 'LAB105', date: today, start: '10:00', end: '12:00', type: 'Faculty Reserved' },
            { labId: 'LAB204', date: today, start: '10:00', end: '12:00', type: 'Busy' }
        ];
    },

    isLabAvailable: async (labId, date, startTime, endTime, allLabs) => {
        const lab = allLabs.find(l => l.id === labId);
        if (!lab) return { available: false, message: "Laboratory not found." };

        if (lab.status.toUpperCase() === 'MAINTENANCE') {
            return { available: false, message: "This lab cannot be requested while under maintenance." };
        }

        const requestedStart = startTime;
        const requestedEnd = endTime;

        const reservations = BookingUtils.getMockReservations().filter(r => r.labId === labId && r.date === date);

        for (let r of reservations) {
            if (requestedStart < r.end && requestedEnd > r.start) {
                if (r.type === 'Faculty Reserved') {
                    return { available: false, message: `This lab is reserved during the selected time.` };
                }
                return { available: false, message: `Check another time slot.` };
            }
        }

        return { available: true, message: "✓ Laboratory available for selected time" };
    },

    validateTimeRules: (date, startTime, endTime) => {
        if (!BookingUtils.isValidBookingDate(date)) {
            return { valid: false, message: "Please select today or a future date." };
        }

        if (startTime >= endTime) {
            return { valid: false, message: "End time must be later than start time." };
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const todayStr = `${year}-${month}-${day}`;

        if (date === todayStr) {
            const currentHour = String(now.getHours()).padStart(2, '0');
            const currentMin = String(now.getMinutes()).padStart(2, '0');
            const currentTime = `${currentHour}:${currentMin}`;
            
            if (startTime < currentTime) {
                return { valid: false, message: "Please select a future time." };
            }
        }

        return { valid: true };
    }
};
