// js/main.js
/* Simple front-end "backend" using localStorage/sessionStorage
   Not for production. Used for prototyping the frontend UI.
*/

// ---------- helpers ----------
function getUsers(){ return JSON.parse(localStorage.getItem('users')||'[]'); }
function saveUsers(u){ localStorage.setItem('users', JSON.stringify(u)); }
function getSkills(){ return JSON.parse(localStorage.getItem('skills')||'[]'); }
function saveSkills(s){ localStorage.setItem('skills', JSON.stringify(s)); }
function setCurrentUser(u){ sessionStorage.setItem('currentUser', JSON.stringify(u)); }
function getCurrentUser(){ return JSON.parse(sessionStorage.getItem('currentUser')||'null'); }
function logout(){ sessionStorage.removeItem('currentUser'); window.location.href = '/index.html'; }

// ---------- auth pages ----------
document.addEventListener('DOMContentLoaded', function(){
  // Login form
  const loginForm = document.getElementById('login-form');
  if(loginForm){
    loginForm.addEventListener('submit', function(e){
      e.preventDefault();
      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;
      const role = loginForm.role.value;
      const users = getUsers();
      const found = users.find(u => u.email === email && u.role === role);
      if(!found){ alert('No user with that email+role. Register first or check role.'); return; }
      if(found.password !== password){ alert('Incorrect password.'); return; }
      setCurrentUser({ name: found.name, email: found.email, role: found.role, department: found.department || '' });
      // redirect
      if(found.role === 'faculty') window.location.href = 'fac-dashboard.html';
      else window.location.href = 'stud-dashboard.html';
    });
  }

  // Register form
  const regForm = document.getElementById('register-form');
  if(regForm){
    regForm.addEventListener('submit', function(e){
      e.preventDefault();
      const name = regForm.name.value.trim();
      const email = regForm.email.value.trim();
      const password = regForm.password.value;
      const department = regForm.department.value.trim();
      const role = regForm.role.value;
      if(!name || !email || !password){ alert('Please fill required fields'); return; }
      const users = getUsers();
      if(users.some(u=> u.email===email)){ alert('Email already registered. Please use different email.'); return; }
      users.push({ name, email, password, department, role });
      saveUsers(users);
      setCurrentUser({ name, email, role, department });
      if(role === 'faculty') window.location.href = 'fac-dashboard.html';
      else window.location.href = 'stud-dashboard.html';
    });
  }

  // Logout button (global)
  const logoutBtn = document.getElementById('logout-btn');
  if(logoutBtn){ logoutBtn.addEventListener('click', logout); }

  // init student dashboard
  if(document.getElementById('student-profile')){
    initStudentDashboard();
  }

  // init faculty dashboard
  if(document.getElementById('faculty-area')){
    initFacultyDashboard();
  }

  // init reports
  if(document.getElementById('reports-area')){
    initReportsPage();
  }
});

// ---------- student dashboard ----------
function initStudentDashboard(){
  const user = getCurrentUser();
  if(!user || user.role !== 'student'){ alert('Please login as student'); window.location.href='/index.html'; return; }
  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('profile-email').textContent = user.email;
  document.getElementById('profile-dept').textContent = user.department || '—';
  renderStudentSkills();

  const addSkillForm = document.getElementById('add-skill-form');
  addSkillForm.addEventListener('submit', function(e){
    e.preventDefault();
    const skillName = this.skill_name.value.trim();
    const level = this.level.value;
    const fileInput = this.evidence;
    if(!skillName){ alert('Enter skill name'); return; }

    const createAndSave = (evidenceDataURL) => {
      const skills = getSkills();
      const skill = {
        id: Date.now(),
        studentEmail: user.email,
        studentName: user.name,
        skillName,
        level,
        evidence: evidenceDataURL || null,
        status: 'Pending',
        feedback: ''
      };
      skills.push(skill);
      saveSkills(skills);
      this.reset();
      renderStudentSkills();
    };

    if(fileInput.files && fileInput.files[0]){
      const reader = new FileReader();
      reader.onload = function(ev){ createAndSave(ev.target.result); };
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      createAndSave(null);
    }
  });
}

function renderStudentSkills(){
  const user = getCurrentUser();
  const tbody = document.getElementById('skills-tbody');
  const skills = getSkills().filter(s => s.studentEmail === user.email).sort((a,b)=> b.id - a.id);
  if(!tbody) return;
  tbody.innerHTML = skills.map(s => `
    <tr>
      <td>${s.skillName}</td>
      <td>${s.level}</td>
      <td>${s.evidence ? `<img src="${s.evidence}" class="preview-img" alt="evidence">` : '<small class="text-muted">No file</small>'}</td>
      <td class="${s.status === 'Pending' ? 'status-pending' : s.status === 'Validated' ? 'status-validated':'status-rejected'}">${s.status}</td>
      <td>${s.feedback || ''}</td>
    </tr>
  `).join('') || `<tr><td colspan="5" class="center text-muted">No skills added yet</td></tr>`;
}

// ---------- faculty dashboard ----------
function initFacultyDashboard(){
  const user = getCurrentUser();
  if(!user || user.role !== 'faculty'){ alert('Please login as faculty'); window.location.href='/index.html'; return; }
  document.getElementById('faculty-name').textContent = user.name;
  renderPendingSkills();
}

function renderPendingSkills(){
  const table = document.getElementById('pending-tbody');
  const skills = getSkills().sort((a,b)=> b.id - a.id);
  if(!table) return;
  table.innerHTML = skills.map(s => `
    <tr>
      <td>${s.studentName}</td>
      <td>${s.studentEmail}</td>
      <td>${s.skillName}</td>
      <td>${s.level}</td>
      <td>${s.evidence ? `<a href="${s.evidence}" target="_blank"><img src="${s.evidence}" class="preview-img"></a>` : '<small class="text-muted">No file</small>'}</td>
      <td class="${s.status === 'Pending' ? 'status-pending' : s.status === 'Validated' ? 'status-validated':'status-rejected'}">${s.status}</td>
      <td>${s.feedback || ''}</td>
      <td>
        <button onclick="facultyAction(${s.id}, 'Validated')" style="margin-right:6px">Validate</button>
        <button onclick="facultyAction(${s.id}, 'Rejected')">Reject</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="8" class="center text-muted">No submissions yet</td></tr>`;
}

function facultyAction(skillId, newStatus){
  const feedback = prompt('Optional feedback (students will see this):','');
  const skills = getSkills();
  const idx = skills.findIndex(s => s.id === skillId);
  if(idx === -1) return alert('Skill not found');
  skills[idx].status = newStatus;
  skills[idx].feedback = feedback || '';
  saveSkills(skills);
  renderPendingSkills();
}

// ---------- reports ----------
function initReportsPage(){
  const skills = getSkills();
  const countsByLevel = { Beginner:0, Intermediate:0, Expert:0, Certified:0 };
  const countsByStatus = { Pending:0, Validated:0, Rejected:0 };
  skills.forEach(s=>{
    if(countsByLevel[s.level] !== undefined) countsByLevel[s.level]++;
    else countsByLevel[s.level] = (countsByLevel[s.level]||0)+1;
    countsByStatus[s.status] = (countsByStatus[s.status]||0)+1;
  });

  // show simple summary
  document.getElementById('total-skills').textContent = skills.length;
  document.getElementById('pending-count').textContent = countsByStatus['Pending']||0;
  document.getElementById('validated-count').textContent = countsByStatus['Validated']||0;

  // Chart.js (if canvas exists)
  if(window.Chart){
    const ctx = document.getElementById('skillsChart');
    if(ctx){
      const labels = Object.keys(countsByLevel);
      const data = labels.map(l => countsByLevel[l] || 0);
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels, datasets: [{ label:'Skills by level', data, borderWidth:1 }]
        },
        options: { responsive:true }
      });
    }
  } else {
    // if Chart not present, show fallback
    const d = document.getElementById('charts-fallback');
    if(d) d.textContent = 'Include Chart.js to see charts.';
  }
}
