/**
 * Authentication module
 * Handles login, logout, role verification, and session state.
 */

const Auth = {

    login: async (usernameOrEmail, password, role) => {
        const result = await API.login(usernameOrEmail, password, role);

        if (!result.success || !result.user) {
            throw new Error(
                result.message || 'Invalid login response from server.'
            );
        }

        return result.user;
    },

    verifyRole: (expectedRole) => {
        const currentRole = sessionStorage.getItem('smartCampusRole');

        if (!currentRole || currentRole.toLowerCase() !== String(expectedRole).toLowerCase()) {
            console.warn(
                `Access denied. Role is "${currentRole}", expected "${expectedRole}". Redirecting...`
            );

            const inPages =
                window.location.pathname.includes('/pages/') ||
                window.location.pathname.includes('\\pages\\');

            window.location.href = inPages ? '../index.html' : 'index.html';
        }
    },

    logout: async () => {
        try {
            if (window.API && typeof API.logout === 'function') {
                await API.logout();
            }
        } catch (e) {
            // Ignore logout API failure
        }

        sessionStorage.removeItem('smartCampusRole');
        sessionStorage.removeItem('smartCampusUser');
        sessionStorage.removeItem('smartCampusEmail');
        sessionStorage.removeItem('smartCampusUserId');

        console.log('User logged out.');

        const inPages =
            window.location.pathname.includes('/pages/') ||
            window.location.pathname.includes('\\pages\\');

        window.location.href = inPages ? '../index.html' : 'index.html';
    },

    isValidEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    updateUserProfileUI: () => {
        const userName = sessionStorage.getItem('smartCampusUser');
        const userRole = sessionStorage.getItem('smartCampusRole');
        const userEmail = sessionStorage.getItem('smartCampusEmail');

        if (userName) {
            document.querySelectorAll('.user-name, #user-display-name, #admin-user-name').forEach(el => {
                el.textContent = userName;
            });
        }
        if (userRole) {
            document.querySelectorAll('.user-role, #user-display-role').forEach(el => {
                el.textContent = userRole;
            });
        }
        if (userEmail) {
            document.querySelectorAll('.user-email, #user-display-email').forEach(el => {
                el.textContent = userEmail;
            });
        }
    }
};

window.Auth = Auth;


document.addEventListener('DOMContentLoaded', () => {

    // Update profile displays across pages if user is logged in
    Auth.updateUserProfileUI();

    const loginForm = document.getElementById('login-form');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    const errorAlert = document.getElementById('login-error');

    const showError = (message) => {
        if (!errorAlert) return;
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';

        const card = document.querySelector('.login-card');
        if (card) {
            card.classList.remove('shake');
            void card.offsetWidth;
            card.classList.add('shake');
        }
    };

    if (loginForm) {
        // Toggle password visibility
        if (togglePasswordBtn && passwordInput) {
            togglePasswordBtn.addEventListener('click', () => {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    togglePasswordBtn.textContent = 'Hide';
                } else {
                    passwordInput.type = 'password';
                    togglePasswordBtn.textContent = 'Show';
                }
            });
        }

        // Handle login form submission
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = passwordInput.value;
            const role = document.getElementById('role').value;

            if (!role) {
                showError("Please select your role.");
                return;
            }

            if (!username || !password) {
                showError("Please enter your username/email and password.");
                return;
            }

            const loginBtn = loginForm.querySelector('.login-btn');
            const originalText = loginBtn ? loginBtn.textContent : 'Login';

            if (loginBtn) {
                loginBtn.textContent = 'Signing you in...';
                loginBtn.disabled = true;
            }

            try {
                const user = await Auth.login(username, password, role);

                if (errorAlert) {
                    errorAlert.style.display = 'none';
                }

                // Store logged-in user information
                sessionStorage.setItem('smartCampusRole', user.role);
                sessionStorage.setItem('smartCampusUser', user.name || user.username);
                sessionStorage.setItem('smartCampusEmail', user.email || '');
                sessionStorage.setItem('smartCampusUserId', String(user.id || user.userId));

                // Determine redirect path
                const roleKey = String(user.role || '').toUpperCase().replace(/\s+/g, '_');

                const urls = {
                    STUDENT: 'pages/student.html',
                    FACULTY: 'pages/faculty.html',
                    LAB_ASSISTANT: 'lab-assistant.html',
                    ADMINISTRATOR: 'admin.html',
                    ADMIN: 'admin.html'
                };

                const targetUrl = urls[roleKey] || 'index.html';
                window.location.href = targetUrl;

            } catch (error) {
                showError(error.message || 'Unable to connect to the backend.');

                if (loginBtn) {
                    loginBtn.textContent = originalText;
                    loginBtn.disabled = false;
                }
            }
        });
    }

    // =========================================================
    // FORGOT PASSWORD MODAL LOGIC
    // =========================================================
    const forgotLink = document.getElementById('forgot-password-link') || document.querySelector('.forgot-password');
    const forgotModal = document.getElementById('forgot-password-modal');
    const closeForgotBtn = document.getElementById('close-forgot-modal');
    const cancelForgotBtn = document.getElementById('cancel-forgot-modal');
    const forgotForm = document.getElementById('forgot-password-form');
    const forgotError = document.getElementById('forgot-error');
    const forgotSuccess = document.getElementById('forgot-success');

    const openForgotModal = () => {
        if (!forgotModal) return;
        if (forgotError) forgotError.style.display = 'none';
        if (forgotSuccess) forgotSuccess.style.display = 'none';
        if (forgotForm) forgotForm.reset();
        
        // If username was already entered in main login form, pre-populate in forgot modal
        const mainUsername = document.getElementById('username')?.value?.trim();
        const forgotEmailInput = document.getElementById('forgot-email');
        if (mainUsername && forgotEmailInput) {
            forgotEmailInput.value = mainUsername;
        }

        forgotModal.style.display = 'flex';
        if (forgotEmailInput) forgotEmailInput.focus();
    };

    const closeForgotModal = () => {
        if (!forgotModal) return;
        forgotModal.style.display = 'none';
    };

    // Toggle password visibility in forgot password modal
    const togglePass1 = document.getElementById('toggle-forgot-password-1');
    const newPassInput = document.getElementById('forgot-new-password');
    if (togglePass1 && newPassInput) {
        togglePass1.addEventListener('click', () => {
            const isPass = newPassInput.type === 'password';
            newPassInput.type = isPass ? 'text' : 'password';
            togglePass1.textContent = isPass ? 'Hide' : 'Show';
        });
    }

    const togglePass2 = document.getElementById('toggle-forgot-password-2');
    const confirmPassInput = document.getElementById('forgot-confirm-password');
    if (togglePass2 && confirmPassInput) {
        togglePass2.addEventListener('click', () => {
            const isPass = confirmPassInput.type === 'password';
            confirmPassInput.type = isPass ? 'text' : 'password';
            togglePass2.textContent = isPass ? 'Hide' : 'Show';
        });
    }

    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            openForgotModal();
        });
    }

    if (closeForgotBtn) closeForgotBtn.addEventListener('click', closeForgotModal);
    if (cancelForgotBtn) cancelForgotBtn.addEventListener('click', closeForgotModal);

    if (forgotModal) {
        forgotModal.addEventListener('click', (e) => {
            if (e.target === forgotModal) closeForgotModal();
        });
    }

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailOrUser = document.getElementById('forgot-email')?.value.trim();
            const newPassword = document.getElementById('forgot-new-password')?.value;
            const confirmPassword = document.getElementById('forgot-confirm-password')?.value;
            const submitBtn = document.getElementById('submit-forgot-btn');

            if (forgotError) forgotError.style.display = 'none';
            if (forgotSuccess) forgotSuccess.style.display = 'none';

            if (!emailOrUser || !newPassword || !confirmPassword) {
                if (forgotError) {
                    forgotError.textContent = "Please fill in all fields.";
                    forgotError.style.display = 'block';
                }
                return;
            }

            if (newPassword !== confirmPassword) {
                if (forgotError) {
                    forgotError.textContent = "Passwords do not match. Please verify.";
                    forgotError.style.display = 'block';
                }
                return;
            }

            if (newPassword.length < 4) {
                if (forgotError) {
                    forgotError.textContent = "Password must be at least 4 characters.";
                    forgotError.style.display = 'block';
                }
                return;
            }

            const origText = submitBtn ? submitBtn.textContent : 'Reset Password';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Updating password...';
            }

            try {
                const res = await API.forgotPassword(emailOrUser, newPassword);

                if (res && res.success) {
                    if (forgotSuccess) {
                        forgotSuccess.textContent = res.message || "Password updated successfully! You can now login.";
                        forgotSuccess.style.display = 'block';
                    }
                    forgotForm.reset();

                    // Pre-fill username on login form if available
                    const usernameInput = document.getElementById('username');
                    if (usernameInput) usernameInput.value = emailOrUser;

                    setTimeout(() => {
                        closeForgotModal();
                    }, 2500);
                } else {
                    throw new Error(res?.message || "Could not reset password.");
                }
            } catch (err) {
                if (forgotError) {
                    forgotError.textContent = err.message || "Unable to reset password. Please check your details.";
                    forgotError.style.display = 'block';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = origText;
                }
            }
        });
    }
});