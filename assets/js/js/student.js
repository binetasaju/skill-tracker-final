document.addEventListener('DOMContentLoaded', ()=>{
  const user = getCurrentUser();
  if(!user || user.role!=="student"){
    alert("Login as student first!");
    window.location.href = "../index.html";
    return;
  }

  // Home page
  if(document.getElementById("student-name")){
    document.getElementById("student-name").textContent = user.name;
    document.getElementById("student-email").textContent = user.email;
    document.getElementById("student-dept").textContent = user.department || "-";
    document.getElementById("logout-btn").addEventListener("click", logout);
  }

  // Add skill page
  const addSkillForm = document.getElementById("add-skill-form");
  if(addSkillForm){
    addSkillForm.addEventListener("submit", function(e){
      e.preventDefault();
      const skillName = this.skill_name.value.trim();
      const level = this.level.value;
      const file = this.evidence.files[0];
      let fileName = file ? file.name : "";

      let skills = getSkills(user.email);
      skills.push({skillName, level, evidence:fileName});
      saveSkills(user.email, skills);
      alert("Skill added!");
      window.location.href = "my-skills.html";
    });
  }

  // My skills page
  const skillsList = document.getElementById("skills-list");
  if(skillsList){
    let skills = getSkills(user.email);
    if(skills.length===0){
      skillsList.innerHTML = "<li>No skills yet</li>";
    } else {
      skillsList.innerHTML = skills.map(s=> 
        `<li>${s.skillName} - ${s.level} (${s.evidence||"no file"})</li>`
      ).join("");
    }
  }
});
