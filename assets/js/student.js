// student.js (Complete File - Updated for 4-Table Database)

document.addEventListener('DOMContentLoaded', async () => {
  // First, check for an API object. If it doesn't exist, something is wrong.
  if (typeof API === 'undefined') {
    console.error("FATAL: api.js is not loaded.");
    alert("Error: Core API file not loaded. The app cannot function.");
    return;
  }

  const user = await API.getCurrentUser();

  if (!user || user.role !== "student") {
    alert("Authentication failed. Please log in as a student.");
    window.location.href = "/";
    return;
  }

  // --- LOGOUT BUTTON LOGIC ---
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await API.logout();
      alert("You have been logged out.");
      window.location.href = "/";
    });
  }

  // --- STUDENT HOME PAGE LOGIC (Displaying profile info) ---
  const studentNameEl = document.getElementById("student-name");
  if (studentNameEl) {
    studentNameEl.textContent = user.name;
    document.getElementById("student-email").textContent = user.email;
    // This will now show the department name from our /api/current_user route
    document.getElementById("student-dept").textContent = user.department || "Not specified";
  }

  // 
  // --- (FIXED) STUDENT DASHBOARD CHART LOGIC ---
  //
  const chartCanvas = document.getElementById("skillStatusChart");
  if (chartCanvas) {
    // 1. Fetch the skills (This was causing the network error)
    const skills = await API.getMySkills();
    
    // 2. Count the skills by status
    let pending = 0;
    let validated = 0;
    let rejected = 0;

    if (skills && skills.length > 0) {
      for (const skill of skills) {
        if (skill.status === "Validated") {
          validated++;
        } else if (skill.status === "Rejected") {
          rejected++;
        } else {
          pending++; // Default to pending
        }
      }
    }

    // 3. Draw the Pie Chart
    new Chart(chartCanvas, {
      type: 'pie',
      data: {
        labels: [ 'Validated Skills', 'Pending Skills', 'Rejected Skills' ],
        datasets: [{
          label: 'Skill Status',
          data: [validated, pending, rejected],
          backgroundColor: [
            'rgb(75, 192, 192)', // Green for Validated
            'rgb(255, 205, 86)', // Yellow for Pending
            'rgb(255, 99, 132)'  // Red for Rejected
          ],
          hoverOffset: 4
        }]
      }
    });
  }
  // --- END OF CHART BLOCK ---
  //

  // --- (FIXED) ADD SKILL FORM LOGIC ---
  const addSkillForm = document.getElementById("add-skill-form");
  if (addSkillForm) {
    addSkillForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      
      try {
        // We use FormData to send files
        const formData = new FormData(addSkillForm);

        // Check if skill name is empty
        if (!formData.get('skillName').trim()) {
            alert('Please enter a skill name.');
            return;
        }

        const newSkill = await API.addSkill(formData);

        if (newSkill && newSkill.id) { // Check for a valid response
          alert("Skill submitted successfully! Awaiting faculty validation.");
          // Redirect to the my-skills page to see it
          window.location.href = "/student/my-skills"; 
        } else {
          alert('Error: ' + (newSkill ? newSkill.message : 'Could not add skill.'));
        }

      } catch (error) {
        console.error('Submission error:', error);
        alert('An error occurred while submitting the form. Check the console for details.');
      }
    });
  }

  // --- (FIXED) "MY SKILLS" PAGE LOGIC (Displaying the list of skills) ---
  const skillsList = document.getElementById("skills-list");
  if (skillsList) {
    const skills = await API.getMySkills();

    if (!skills || skills.length === 0) {
      skillsList.innerHTML = "<p class='text-muted center'>You haven't added any skills yet.</p>";
    } else {
      // The skill object now has 'status' and 'feedback' at the top level
      skillsList.innerHTML = skills.map(s => {
        const feedbackBlock = s.feedback 
          ? `<div class="skill-feedback">
               <strong>Faculty Feedback:</strong> ${s.feedback}
             </div>`
          : '';

        return `
          <div class="skill-card">
            <div class="skill-info">
              <h4 class="skill-name">${s.skillName}</h4>
              <span class="skill-level ${s.level.toLowerCase()}">${s.level}</span>
            </div>
            <div class="skill-status">
              <span class="status-${(s.status || 'Pending').toLowerCase()}">${s.status || 'Pending'}</span>
            </div>
          </div>
          ${feedbackBlock} 
        `;
      }).join("");
    }
  }
});