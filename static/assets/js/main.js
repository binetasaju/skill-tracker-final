// This file handles API calls for login and registration

document.addEventListener('DOMContentLoaded', () => {
    
    // --- LOGIN FORM HANDLER ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = loginForm.email.value.trim();
            const password = loginForm.password.value;
            const role = loginForm.role.value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, role })
                });

                const data = await response.json();

                if (!response.ok) {
                    alert('Error: ' + (data.error || 'Login failed'));
                    return;
                }

                // Login success! Redirect to the correct dashboard.
                if (data.role === "student") {
                    window.location.href = "/student/home";
                } else if (data.role === "faculty") {
                    window.location.href = "/faculty/dashboard";
                } else {
                    window.location.href = "/";
                }
            } catch (err) {
                alert('An error occurred. Please try again. ' + err);
            }
        });
    }

    // --- REGISTRATION FORM HANDLER ---
    const regForm = document.getElementById('register-form');
    if (regForm) {
        // 1. THIS IS THE FIX: Populate the departments dropdown first
        loadDepartments();

        // 2. Add the submit listener
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = regForm.name.value.trim();
            const email = regForm.email.value.trim();
            const password = regForm.password.value;
            const department_id = regForm.department_id.value; // Reads from the dropdown
            const role = regForm.role.value;

            if (!name || !email || !password || !department_id) {
                alert("Please fill in all fields.");
                return;
            }

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, department_id, role })
                });

                const data = await response.json();

                if (!response.ok) {
                    alert('Error: ' + (data.error || 'Registration failed'));
                    return;
                }

                // Registration success! Redirect to the correct dashboard.
                if (data.role === "student") {
                    window.location.href = "/student/home";
                } else if (data.role === "faculty") {
                    window.location.href = "/faculty/dashboard";
                } else {
                    window.location.href = "/";
                }
            } catch (err) {
                alert('An error occurred. Please try again. ' + err);
            }
        });
    }
});

/**
 * Fetches the list of departments from the API and populates the dropdown.
 */
async function loadDepartments() {
    const selectEl = document.getElementById('department-select');
    if (!selectEl) return; // Safety check

    try {
        const response = await fetch('/api/departments');
        const departments = await response.json();

        if (!response.ok) {
            selectEl.innerHTML = '<option value="">Error loading departments</option>';
            return;
        }

        // Clear the "Loading..." message
        selectEl.innerHTML = ''; 

        // Add a default "Select" option
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Select your department";
        selectEl.appendChild(defaultOption);

        // Add each department from the API
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            selectEl.appendChild(option);
        });
    } catch (err) {
        selectEl.innerHTML = '<option value="">Error loading departments</option>';
    }
}