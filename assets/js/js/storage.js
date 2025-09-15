// LocalStorage helper functions
function getUsers(){
  return JSON.parse(localStorage.getItem('users') || '[]');
}
function saveUsers(users){
  localStorage.setItem('users', JSON.stringify(users));
}
function setCurrentUser(user){
  localStorage.setItem('currentUser', JSON.stringify(user));
}
function getCurrentUser(){
  return JSON.parse(localStorage.getItem('currentUser') || 'null');
}
function logout(){
  localStorage.removeItem('currentUser');
  window.location.href = "../index.html";
}

// Skills
function getSkills(email){
  return JSON.parse(localStorage.getItem('skills_'+email) || '[]');
}
function saveSkills(email, skills){
  localStorage.setItem('skills_'+email, JSON.stringify(skills));
}
