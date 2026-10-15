// js/booking.js

const BookingUtils = {

    // =========================================================
    // SET MINIMUM BOOKING DATE
    // =========================================================
    setMinimumBookingDate: () => {

        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        const today = `${year}-${month}-${day}`;

        const dateInputs = document.querySelectorAll(
            'input[type="date"]'
        );

        dateInputs.forEach(input => {
            input.min = today;
        });
    },


    // =========================================================
    // VALIDATE BOOKING DATE
    // =========================================================
    isValidBookingDate: (dateValue) => {

        if (!dateValue) {
            return false;
        }

        const selectedDate = new Date(
            dateValue + "T00:00:00"
        );

        const now = new Date();

        const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );

        return selectedDate >= today;
    },


    // =========================================================
    // POPULATE LAB DROPDOWN
    // =========================================================
    populateLabDropdown: (labs) => {

        const select = document.getElementById(
            "book-lab-select"
        );

        if (!select) {
            return;
        }

        const currentVal = select.value;

        select.innerHTML =
            '<option value="" disabled selected>Select Lab</option>';

        if (!Array.isArray(labs) || labs.length === 0) {
            return;
        }

        labs.forEach(lab => {

            const option = document.createElement("option");

            option.value = lab.id;

            const status =
                String(lab.status || "")
                    .trim()
                    .toUpperCase();

            const totalPCs = lab.totalResources ?? lab.totalCapacity ?? lab.total ?? lab.capacity ?? 0;
            const availPCs = lab.availableResources ?? lab.capacity ?? totalPCs;
            const maintPCs = lab.maintenanceResources ?? 0;

            let statusText = lab.status ? ` (${lab.status})` : '';
            if (maintPCs > 0 && status === 'AVAILABLE') {
                statusText = ` (${availPCs}/${totalPCs} PCs Available)`;
            }

            option.textContent = `${lab.name}${statusText}`;

            // Only disable if undergoing full lab maintenance or inactive
            const unavailableStatuses = [
                "MAINTENANCE",
                "INACTIVE"
            ];

            option.disabled =
                unavailableStatuses.includes(status);

            select.appendChild(option);
        });

        if (currentVal && Array.from(select.options).some(o => String(o.value) === String(currentVal))) {
            select.value = currentVal;
        }
    },


    // =========================================================
    // DATE CHANGE LISTENER
    // =========================================================
    attachDateListener: (
        dateInputId,
        msgContainerId
    ) => {

        const dateInput =
            document.getElementById(dateInputId);

        const msgContainer =
            document.getElementById(msgContainerId);

        if (!dateInput) {
            return;
        }

        dateInput.addEventListener(
            "change",
            function () {

                if (
                    !BookingUtils.isValidBookingDate(
                        this.value
                    )
                ) {

                    if (msgContainer) {

                        msgContainer.textContent =
                            "Previous dates cannot be selected. Please select today or a future date.";

                        msgContainer.style.color =
                            "#721c24";
                    }

                    this.value = "";


                    const submitBtn =
                        document.getElementById(
                            "book-submit-btn"
                        );

                    if (submitBtn) {
                        submitBtn.disabled = true;
                    }

                    return;
                }


                if (
                    msgContainer &&
                    msgContainer.textContent.includes(
                        "Previous dates"
                    )
                ) {

                    msgContainer.textContent = "";
                }
            }
        );
    },


    // =========================================================
    // SINGLE TIME FIELD PARSER & FORMATTER (8:00 AM - 8:00 PM)
    // =========================================================
    parseTimeTo24: (timeStr) => {
        if (!timeStr) return "";
        const raw = String(timeStr).trim();

        // Match 12-hour format: "10:00 AM", "12:45 PM", "3:38 PM", "8:15 am", "8pm", "8 am", "10:00am", "12:45pm"
        const match12 = raw.match(/^(\d{1,2})(?::(\d{1,2}))?\s*([aApP][mM])$/);
        if (match12) {
            let h = parseInt(match12[1], 10);
            const m = match12[2] !== undefined ? parseInt(match12[2], 10) : 0;
            const ampm = match12[3].toUpperCase();
            if (isNaN(h) || isNaN(m) || h < 1 || h > 12 || m < 0 || m > 59) return "";
            if (ampm === "AM") {
                if (h === 12) h = 0;
            } else if (ampm === "PM") {
                if (h !== 12) h += 12;
            }
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        }

        // Match 24-hour format: "08:15", "15:38", "20:00", "8:00"
        const match24 = raw.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
        if (match24) {
            const h = parseInt(match24[1], 10);
            const m = parseInt(match24[2], 10);
            if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return "";
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        }

        return "";
    },

    formatTimeTo12: (timeStr) => {
        if (!timeStr) return "";
        const time24 = BookingUtils.parseTimeTo24(timeStr);
        if (!time24) return timeStr;
        const [hStr, mStr] = time24.split(":");
        const h = parseInt(hStr, 10);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12}:${mStr} ${ampm}`;
    },

    formatTime12Hour: (timeStr) => {
        return BookingUtils.formatTimeTo12(timeStr);
    },

    getTimePickerValue: (prefix = "book-start") => {
        const el = document.getElementById(prefix);
        if (el && el.value) {
            return BookingUtils.parseTimeTo24(el.value) || el.value.trim();
        }

        const hourEl = document.getElementById(`${prefix}-hour`);
        const minEl = document.getElementById(`${prefix}-min`);
        const ampmEl = document.getElementById(`${prefix}-ampm`);

        if (hourEl && minEl && ampmEl) {
            const hVal = hourEl.value.trim();
            const mVal = minEl.value.trim();
            const ampmVal = (ampmEl.value || "AM").trim().toUpperCase();

            if (hVal !== "") {
                let h = parseInt(hVal, 10);
                if (isNaN(h) || h < 1 || h > 12) return "";

                let m = mVal !== "" ? parseInt(mVal, 10) : 0;
                if (isNaN(m) || m < 0 || m > 59) return "";

                let h24 = h;
                if (ampmVal === "AM") {
                    if (h === 12) h24 = 0;
                } else if (ampmVal === "PM") {
                    if (h !== 12) h24 += 12;
                }

                return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            }
        }
        return "";
    },

    initTimePickerRow: (prefix = "book-start", targetHiddenId = "book-start") => {
        const hourEl = document.getElementById(`${prefix}-hour`);
        const minEl = document.getElementById(`${prefix}-min`);
        const ampmEl = document.getElementById(`${prefix}-ampm`);
        const hiddenEl = document.getElementById(targetHiddenId);

        if (!hourEl || !minEl || !ampmEl || !hiddenEl) return;

        const updateHidden = () => {
            const hVal = hourEl.value.trim();
            const mVal = minEl.value.trim();
            const ampmVal = (ampmEl.value || "AM").trim().toUpperCase();

            if (!hVal && !mVal) {
                hiddenEl.value = "";
                hiddenEl.dispatchEvent(new Event("input", { bubbles: true }));
                hiddenEl.dispatchEvent(new Event("change", { bubbles: true }));
                return;
            }

            let h = parseInt(hVal, 10);
            if (isNaN(h)) {
                hiddenEl.value = "";
                return;
            }
            if (h < 1) h = 1;
            if (h > 12) h = 12;

            let m = mVal ? parseInt(mVal, 10) : 0;
            if (isNaN(m)) m = 0;
            if (m < 0) m = 0;
            if (m > 59) m = 59;

            let h24 = h;
            if (ampmVal === "AM") {
                if (h === 12) h24 = 0;
            } else if (ampmVal === "PM") {
                if (h !== 12) h24 += 12;
            }

            const time24 = `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            hiddenEl.value = time24;
            hiddenEl.dispatchEvent(new Event("input", { bubbles: true }));
            hiddenEl.dispatchEvent(new Event("change", { bubbles: true }));
        };

        hourEl.addEventListener("input", updateHidden);
        hourEl.addEventListener("change", updateHidden);
        minEl.addEventListener("input", updateHidden);
        minEl.addEventListener("change", updateHidden);
        ampmEl.addEventListener("change", updateHidden);

        hourEl.addEventListener("blur", () => {
            if (hourEl.value.trim()) {
                let h = parseInt(hourEl.value.trim(), 10);
                if (!isNaN(h) && h >= 1 && h <= 12) {
                    hourEl.value = String(h).padStart(2, "0");
                }
            }
            updateHidden();
        });

        minEl.addEventListener("blur", () => {
            if (minEl.value.trim()) {
                let m = parseInt(minEl.value.trim(), 10);
                if (!isNaN(m) && m >= 0 && m <= 59) {
                    minEl.value = String(m).padStart(2, "0");
                }
            }
            updateHidden();
        });

        if (hourEl.value || minEl.value) {
            updateHidden();
        }
    },

    initTimeSelectSync: () => {
        BookingUtils.initTimePickerRow("book-start", "book-start");
        BookingUtils.initTimePickerRow("book-end", "book-end");
    },


    // =========================================================
    // CHECK LAB AVAILABILITY
    // =========================================================
    isLabAvailable: async (
        labId,
        date,
        startTime,
        endTime,
        allLabs
    ) => {

        // -----------------------------------------------------
        // CHANGED:
        // Make sure allLabs is always an array.
        // -----------------------------------------------------

        const labs = Array.isArray(allLabs)
            ? allLabs
            : [];


        const lab = labs.find(
            l =>
                String(l.id) === String(labId)
        );


        if (!lab) {

            return {
                available: false,
                message: "Laboratory not found."
            };
        }


        // -----------------------------------------------------
        // CHANGED:
        // Normalize status safely.
        // -----------------------------------------------------

        const normalizedStatus =
            String(lab.status || "")
                .trim()
                .toUpperCase();


        // -----------------------------------------------------
        // Frontend quick check.
        //
        // IMPORTANT:
        // Flask + SQL Server performs the real check below.
        // -----------------------------------------------------

        if (
            normalizedStatus !== "ACTIVE" &&
            normalizedStatus !== "AVAILABLE"
        ) {

            return {
                available: false,

                message:
                    `This lab is currently ${String(
                        lab.status || "unavailable"
                    ).toLowerCase()}.`
            };
        }


        // =====================================================
        // CHANGED:
        // Real availability check through Flask API.
        //
        // Flask endpoint:
        // GET /api/bookings/check-conflict
        //
        // It checks:
        // 1. labs
        // 2. bookings
        // 3. maintenance
        // =====================================================

        const start24 = BookingUtils.parseTimeTo24(startTime) || startTime;
        const end24 = BookingUtils.parseTimeTo24(endTime) || endTime;

        try {

            const result =
                await API.checkBookingAvailability(
                    labId,
                    `${date}T${start24}:00`,
                    `${date}T${end24}:00`
                );


            // -------------------------------------------------
            // CHANGED:
            // Protect against an invalid API response.
            // -------------------------------------------------

            if (!result) {

                return {
                    available: false,
                    message:
                        "No response received from the server."
                };
            }


            return {
                available:
                    result.available === true,

                message:
                    result.message ||
                    (
                        result.available
                            ? "Laboratory is available."
                            : "Laboratory is not available."
                    )
            };

        } catch (error) {

            console.error(
                "LAB AVAILABILITY ERROR:",
                error
            );


            return {
                available: false,

                message:
                    error.message ||
                    "Unable to check lab availability."
            };
        }
    },


    // =========================================================
    // VALIDATE BOOKING TIME
    // =========================================================
    validateTimeRules: (
        date,
        startTime,
        endTime
    ) => {

        // -----------------------------------------------------
        // Check date
        // -----------------------------------------------------

        if (
            !BookingUtils.isValidBookingDate(date)
        ) {

            return {
                valid: false,
                message:
                    "Please select today or a future date."
            };
        }


        // -----------------------------------------------------
        // Check presence
        // -----------------------------------------------------

        if (!startTime || !endTime) {
            return {
                valid: false,
                message: "Start time and end time are required."
            };
        }

        const start24 = BookingUtils.parseTimeTo24(startTime);
        const end24 = BookingUtils.parseTimeTo24(endTime);

        if (!start24 || !end24) {
            return {
                valid: false,
                message: "Please enter a valid time (e.g. 10:00 AM, 12:45 PM, 3:38 PM)."
            };
        }


        // -----------------------------------------------------
        // Operating Hours: 8:00 AM to 8:00 PM (08:00–20:00)
        // -----------------------------------------------------

        if (
            start24 < "08:00" ||
            end24 > "20:00" ||
            start24 > "20:00" ||
            end24 < "08:00"
        ) {
            return {
                valid: false,
                message: "Labs can only be booked between 8:00 AM and 8:00 PM."
            };
        }


        // -----------------------------------------------------
        // Start time must be before end time
        // -----------------------------------------------------

        if (start24 >= end24) {
            return {
                valid: false,
                message: "End time must be later than start time."
            };
        }


        // -----------------------------------------------------
        // Duration limit: Max 24 hours (and > 0 minutes)
        // -----------------------------------------------------

        const [sHours, sMins] = start24.split(":").map(Number);
        const [eHours, eMins] = end24.split(":").map(Number);
        const durationMinutes = (eHours * 60 + eMins) - (sHours * 60 + sMins);

        if (durationMinutes <= 0) {
            return {
                valid: false,
                message: "End time must be later than start time."
            };
        }

        if (durationMinutes > 24 * 60) {
            return {
                valid: false,
                message: "Booking duration cannot exceed 24 hours."
            };
        }


        const now = new Date();

        const year =
            now.getFullYear();

        const month =
            String(
                now.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                now.getDate()
            ).padStart(2, "0");

        const todayStr =
            `${year}-${month}-${day}`;


        // -----------------------------------------------------
        // If booking is for today,
        // start time must be in future.
        // -----------------------------------------------------

        if (date === todayStr) {

            const currentHour =
                String(
                    now.getHours()
                ).padStart(2, "0");

            const currentMin =
                String(
                    now.getMinutes()
                ).padStart(2, "0");

            const currentTime =
                `${currentHour}:${currentMin}`;

            if (start24 < currentTime) {

                return {
                    valid: false,
                    message:
                        "Please select a future time."
                };
            }
        }

        return {
            valid: true
        };
    }
};