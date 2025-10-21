document.addEventListener('DOMContentLoaded', () => {
  // --- LOGIN FORM LOGIC ---
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault(); // Prevent the form from reloading the page

      // Get user input
      const email = this.email.value.trim();
      const password = this.password.value;
      const role = this.role.value;

      // Instead of checking localStorage, call our new API.login function
      const user = await API.login(email, password, role);

      // If the API call is successful and returns a user object...
      if (user) {
        // ...redirect to the correct dashboard based on the user's role.
        if (user.role === "student") {
          window.location.href = "/student/home";
        } else {
          window.location.href = "/faculty/dashboard";
        }
      }
      // If API.login returns null, it means login failed and an alert was already shown.
    });
  }

  // --- REGISTRATION FORM LOGIC ---
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      // Get user input
      const name = this.name.value.trim();
      const email = this.email.value.trim();
      const password = this.password.value;
      const department = this.department.value.trim();
      const role = this.role.value;

      if (!name || !email || !password) {
        alert("Please fill in all required fields.");
        return;
      }
      
      // Call the API.register function instead of saving to localStorage
      const newUser = await API.register(name, email, password, department, role);
      
      // If registration is successful...
      if (newUser) {
        // ...redirect to the correct dashboard. The backend logs them in automatically.
         if (newUser.role === "student") {
          window.location.href = "/student/home";
        } else {
          window.location.href = "/faculty/dashboard";
        }
      }
    });
  }
});

