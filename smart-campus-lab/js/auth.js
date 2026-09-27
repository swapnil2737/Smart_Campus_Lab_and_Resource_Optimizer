/**
 * Authentication module
 * Handles login, logout, and session management.
 */

const Auth = {
    login: (usernameOrEmail, password, role) => {
        // Demo credentials
        const validCredentials = [
            // Student account
            { user: 'student', email: 'atharvpatil@gmail.com', pass: 'student123', role: 'Student', url: 'pages/student.html' },
            // Faculty account
            { user: 'faculty', email: 'faculty@ritindia.edu', pass: 'faculty123', role: 'Faculty', url: 'pages/faculty.html' },
            // Lab Assistant account
            { user: 'labassistant', email: 'labassistant@ritindia.edu', pass: 'lab123', role: 'Lab Assistant', url: 'pages/lab-assistant.html' },
            // Admin account
            { user: 'admin', email: 'admin@ritindia.edu', pass: 'admin123', role: 'Admin', url: 'pages/admin.html' }
        ];

        const validUser = validCredentials.find(
            c => (c.user === usernameOrEmail || c.email === usernameOrEmail) && c.pass === password && c.role === role
        );

        return validUser;
    },
    verifyRole: (expectedRole) => {
        const currentRole = sessionStorage.getItem('smartCampusRole');
        if (currentRole !== expectedRole) {
            console.warn(`Access denied. Role is ${currentRole}, expected ${expectedRole}. Redirecting...`);
            const inPages = window.location.pathname.includes('/pages/') || window.location.pathname.includes('\\pages\\');
            window.location.href = inPages ? '../index.html' : 'index.html';
        }
    },
    logout: () => {
        sessionStorage.removeItem('smartCampusRole');
        sessionStorage.removeItem('smartCampusUser');
        console.log('User logged out.');
        const inPages = window.location.pathname.includes('/pages/') || window.location.pathname.includes('\\pages\\');
        window.location.href = inPages ? '../index.html' : 'index.html';
    },
    isValidEmail: (email) => {
        // Simple regex for email validation
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    const errorAlert = document.getElementById('login-error');

    const showError = (message) => {
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';
        const card = document.querySelector('.login-card');
        
        // Reset animation
        card.classList.remove('shake');
        void card.offsetWidth; // trigger reflow
        card.classList.add('shake');
    };

    if (loginForm) {
        // Toggle password visibility
        togglePasswordBtn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                togglePasswordBtn.textContent = 'Hide';
            } else {
                passwordInput.type = 'password';
                togglePasswordBtn.textContent = 'Show';
            }
        });

        // Handle form submission
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = passwordInput.value;
            const role = document.getElementById('role').value;

            // Empty role validation
            if (!role) {
                showError("Please select your role.");
                return;
            }

            // Empty fields validation
            if (!username || !password) {
                showError("Please enter your username/email and password.");
                return;
            }

            // If it looks like an email (contains '@'), validate the format
            if (username.includes('@')) {
                if (!Auth.isValidEmail(username)) {
                    showError("Invalid username/email or password for the selected role.");
                    return;
                }
            }

            const user = Auth.login(username, password, role);

            if (user) {
                // Success - hide error
                errorAlert.style.display = 'none';
                
                // Store role for security
                sessionStorage.setItem('smartCampusRole', user.role);
                
                // Add loading state
                const loginBtn = loginForm.querySelector('.login-btn');
                const originalText = loginBtn.textContent;
                loginBtn.textContent = 'Signing you in...';
                loginBtn.disabled = true;

                // Simulate slight delay for loading state
                setTimeout(() => {
                    window.location.href = user.url;
                }, 400);
            } else {
                // Failure - show error and shake animation
                showError("Invalid username/email or password for the selected role.");
            }
        });
    }
});
