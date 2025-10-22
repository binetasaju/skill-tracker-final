// student.js (Complete File - Corrected)

document.addEventListener('DOMContentLoaded', async () => {
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
      const result = await API.logout();
      if (result) {
        alert("You have been logged out.");
        window.location.href = "/";
      }
    });
  }

  // --- STUDENT HOME PAGE LOGIC (Displaying profile info) ---
  if (document.getElementById("student-name")) {
    document.getElementById("student-name").textContent = user.name;
    document.getElementById("student-email").textContent = user.email;
    document.getElementById("student-dept").textContent = user.department || "Not specified";
  }

  // 
  // --- (NEW) STUDENT DASHBOARD CHART LOGIC ---
  //
  const chartCanvas = document.getElementById("skillStatusChart");
  if (chartCanvas) {
    // 1. Fetch the skills (uses your existing API.getMySkills)
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
      type: 'pie', // You can also change this to 'doughnut'
      data: {
        labels: [
          'Validated Skills',
          'Pending Skills',
          'Rejected Skills'
        ],
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
  // --- END OF NEW CHART BLOCK ---
  //

  // --- ADD SKILL FORM LOGIC --- (This is the fixed part)
  const addSkillForm = document.getElementById("add-skill-form");
  if (addSkillForm) {
    addSkillForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      
      try {
        const skillNameInput = addSkillForm.querySelector('[name="skillName"]');
        const levelInput = addSkillForm.querySelector('[name="level"]');
        const evidenceInput = addSkillForm.querySelector('[name="evidence"]');

        if (!skillNameInput || !levelInput || !evidenceInput) {
            console.error("Could not find form elements! Check your HTML 'name' attributes.");
            alert("A form error occurred. Please refresh and try again.");
            return;
        }
        
        const skillName = skillNameInput.value.trim();
        const level = levelInput.value;
        const evidenceFile = evidenceInput.files[0];
        
        if (!skillName) {
            alert('Please enter a skill name.');
            return;
        }

        const formData = new FormData();

        // --- THIS IS THE FIX ---
        // Changed 'skill_name' to 'skillName' to match your Flask backend
        formData.append('skillName', skillName); 
        // --- END OF FIX ---
        
        formData.append('level', level);
        
        if (evidenceFile) {
          formData.append('evidence', evidenceFile);
        }

        const newSkill = await API.addSkill(formData);

        if (newSkill && newSkill.id) { // Check for a valid response
          alert("Skill submitted successfully! Awaiting faculty validation.");
          window.location.href = "/student/my-skills";
        } else {
          // This part shows the error from your server (e.g., "Missing skill name in form")
          alert(newSkill.message || 'Could not add skill.');
        }

      } catch (error) { // This will catch network errors
        console.error('Submission error:', error);
        alert('An error occurred while submitting the form. Check the console for details.');
      }
    });
  }

  // --- "MY SKILLS" PAGE LOGIC (Displaying the list of skills and feedback) ---
  const skillsList = document.getElementById("skills-list");
  if (skillsList) {
    const skills = await API.getMySkills();

    if (!skills || skills.length === 0) {
      skillsList.innerHTML = "<p class='text-muted center'>You haven't added any skills yet.</p>";
    } else {
      skillsList.innerHTML = skills.map(s => {
        const feedbackBlock = s.feedback 
          ? `<div class="skill-feedback">
               <strong>Faculty Feedback:</strong> ${s.feedback}
             </div>`
          : '';

        // --- TYPO FIX ---
        // Added missing quotes to class attributes
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
        // --- END OF TYPO FIX ---

      }).join("");
    }
  }
});