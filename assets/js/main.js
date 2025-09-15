document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;
      const role = loginForm.role.value;

      const users = getUsers();
      const found = users.find(u => u.email === email && u.role === role);
      if (!found) { alert("User not found or role is incorrect."); return; }
      if (found.password !== password) { alert("Wrong password"); return; }

      setCurrentUser(found);
      if (role === "student") {
        window.location.href = "student/student-home.html";
      } else {
        window.location.href = "faculty/fac-dashboard.html";
      }

    });
  }

  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const name = regForm.name.value.trim();
      const email = regForm.email.value.trim();
      const password = regForm.password.value;
      const department = regForm.department.value.trim();
      const role = regForm.role.value;

      if (!name || !email || !password) {
        alert("Please fill in all required fields.");
        return;
      }

      let users = getUsers();
      if (users.some(u => u.email === email)) {
        alert("Email already registered");
        return;
      }
      const newUser = { name, email, password, department, role };
      users.push(newUser);
      saveUsers(users);
      setCurrentUser(newUser);

      if (role === "student") {
        window.location.href = "student/student-home.html";
      } else {
        window.location.href = "faculty/fac-dashboard.html";
      }
    });
  }
});