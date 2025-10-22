document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();

  // 1. Authenticate and redirect if not a faculty member
  if (!user || user.role !== "faculty") {
    alert("Access denied. Please log in as faculty.");
    window.location.href = "../index.html";
    return;
  }

  // 2. Add logout functionality
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  // 3. Find the table body to insert data into
  const submissionsTableBody = document.getElementById("skill-submissions");
  if (submissionsTableBody) {
    displayStudentSkills(submissionsTableBody);
  }
});

function displayStudentSkills(tableBody) {
  tableBody.innerHTML = '';
  const allUsers = getUsers();
  const students = allUsers.filter(u => u.role === 'student');

  if (students.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="center text-muted">No students have registered yet.</td></tr>';
    return;
  }

  let hasSubmissions = false;

  students.forEach(student => {
    const studentSkills = getSkills(student.email);
    if (studentSkills.length > 0) {
      hasSubmissions = true;
      studentSkills.forEach(skill => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${student.name}</td>
          <td>${student.email}</td>
          <td>${skill.skillName}</td>
          <td>${skill.level}</td>
          <td>
            <span class="status-${skill.status.toLowerCase()}">${skill.status}</span>
          </td>
          <td>
            ${skill.status === 'Pending' ? `
              <button class="approve-btn" data-student-email="${student.email}" data-skill-name="${skill.skillName}">Approve</button>
              <button class="reject-btn" data-student-email="${student.email}" data-skill-name="${skill.skillName}">Reject</button>
            ` : 'Done'}
          </td>
        `;
        tableBody.appendChild(row);
      });
    }
  });

  if (!hasSubmissions) {
    tableBody.innerHTML = '<tr><td colspan="6" class="center text-muted">No skills have been submitted by students yet.</td></tr>';
  }
  
  addValidationListeners();
}


function addValidationListeners() {
  document.querySelectorAll('.approve-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const studentEmail = e.target.dataset.studentEmail;
      const skillName = e.target.dataset.skillName;
      updateSkillStatus(studentEmail, skillName, 'Validated');
    });
  });

  document.querySelectorAll('.reject-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const studentEmail = e.target.dataset.studentEmail;
      const skillName = e.target.dataset.skillName;
      updateSkillStatus(studentEmail, skillName, 'Rejected');
    });
  });
}

function updateSkillStatus(studentEmail, skillName, newStatus) {
  let skills = getSkills(studentEmail);
  const skillIndex = skills.findIndex(s => s.skillName === skillName);

  if (skillIndex !== -1) {
    skills[skillIndex].status = newStatus;
    saveSkills(studentEmail, skills);
    const submissionsTableBody = document.getElementById("skill-submissions");
    displayStudentSkills(submissionsTableBody);
  }
}