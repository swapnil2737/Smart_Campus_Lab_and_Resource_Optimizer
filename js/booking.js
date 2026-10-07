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

        try {

            const result =
                await API.checkBookingAvailability(
                    labId,
                    `${date}T${startTime}:00`,
                    `${date}T${endTime}:00`
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
        // Check time
        // -----------------------------------------------------

        if (
            !startTime ||
            !endTime ||
            startTime >= endTime
        ) {

            return {
                valid: false,
                message:
                    "End time must be later than start time."
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


            if (startTime < currentTime) {

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