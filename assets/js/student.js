document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (!user || user.role !== "student") {
    alert("Login as a student first!");
    window.location.href = "../index.html";
    return;
  }

  // Set up logout button on any student page
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  // Home page profile display
  if (document.getElementById("student-name")) {
    document.getElementById("student-name").textContent = user.name;
    document.getElementById("student-email").textContent = user.email;
    document.getElementById("student-dept").textContent = user.department || "-";
  }

  // Add skill page logic
  const addSkillForm = document.getElementById("add-skill-form");
  if (addSkillForm) {
    addSkillForm.addEventListener("submit", function(e) {
      e.preventDefault();
      const skillName = this.skill_name.value.trim();
      const level = this.level.value;
      const file = this.evidence.files[0];
      let fileName = file ? file.name : "";

      let skills = getSkills(user.email);
      skills.push({ skillName, level, evidence: fileName, status: 'Pending' });
      saveSkills(user.email, skills);
      alert("Skill added successfully! Awaiting faculty validation.");
      window.location.href = "my-skills.html";
    });
  }

  // My skills page list
  const skillsList = document.getElementById("skills-list");
  if (skillsList) {
    let skills = getSkills(user.email);
    if (skills.length === 0) {
      skillsList.innerHTML = "<p class='text-muted center'>No skills added yet.</p>";
    } else {
      skillsList.innerHTML = skills.map(s =>
        `
        <div class="skill-card">
          <div class="skill-info">
            <h4 class="skill-name">${s.skillName}</h4>
            <span class="skill-level ${s.level.toLowerCase()}">${s.level}</span>
          </div>
          <div class="skill-status">
            <span class="status-${(s.status || 'Pending').toLowerCase()}">${s.status || 'Pending'}</span>
          </div>
        </div>
        `
      ).join("");
    }
  }
});