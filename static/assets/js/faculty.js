document.addEventListener('DOMContentLoaded', async () => {
    const user = await API.getCurrentUser();

    if (!user || user.role !== "faculty") {
        alert("Access denied. Please log in as a faculty member.");
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

    // --- DISPLAY SUBMISSIONS LOGIC ---
    const submissionsTableBody = document.getElementById("skill-submissions");
    async function displayStudentSkills() {
        if (submissionsTableBody) {
            const submissions = await API.getAllSubmissions();
            submissionsTableBody.innerHTML = '';

            if (!submissions || submissions.length === 0) {
                submissionsTableBody.innerHTML = '<tr><td colspan="7" class="center text-muted">No skills have been submitted by students yet.</td></tr>';
                return;
            }
            
            submissions.forEach(skill => {
                const row = document.createElement('tr');
                
                // Create a clickable link for the evidence if a filename exists
                const evidenceLink = skill.evidence
                    ? `<a href="/uploads/${skill.evidence}" target="_blank">View File</a>`
                    : 'N/A';

                row.innerHTML = `
                    <td>${skill.studentName}</td>
                    <td>${skill.studentEmail}</td>
                    <td>${skill.skillName}</td>
                    <td>${skill.level}</td>
                    <td>${evidenceLink}</td>
                    <td>
                        <span class="status-${skill.status.toLowerCase()}">${skill.status}</span>
                    </td>
                    <td>
                        ${skill.status === 'Pending' ? `
                            <button class="approve-btn" data-skill-id="${skill.id}">Approve</button>
                            <button class="reject-btn" data-skill-id="${skill.id}">Reject</button>
                        ` : ''}
                        <button class="remarks-btn" data-skill-id="${skill.id}" data-current-feedback="${skill.feedback || ''}">Remarks</button>
                    </td>
                `;
                submissionsTableBody.appendChild(row);
            });

            addValidationListeners();
        }
    }

    // --- ADD EVENT LISTENERS FOR APPROVE/REJECT/REMARKS BUTTONS ---
    function addValidationListeners() {
        // Approve button
        document.querySelectorAll('.approve-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const skillId = e.target.dataset.skillId;
                const result = await API.updateSkillStatus(skillId, 'Validated');
                if (result) {
                    displayStudentSkills(); 
                }
            });
        });

        // Reject button
        document.querySelectorAll('.reject-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const skillId = e.target.dataset.skillId;
                const result = await API.updateSkillStatus(skillId, 'Rejected');
                if (result) {
                    displayStudentSkills();
                }
            });
        });

        // Remarks button
        document.querySelectorAll('.remarks-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const skillId = e.target.dataset.skillId;
                const currentFeedback = e.target.dataset.currentFeedback;
                
                // Use prompt() to get feedback from the user
                const feedbackText = prompt("Please enter your feedback/remarks for this submission:", currentFeedback);
                
                // If the user clicks "OK" and has entered text (or cleared it)
                if (feedbackText !== null) {
                    const result = await API.addFeedback(skillId, feedbackText.trim());
                    if (result) {
                        alert("Feedback saved successfully.");
                        displayStudentSkills(); // Refresh the table to update the data-current-feedback attribute
                    }
                }
                // If the user clicks "Cancel", do nothing.
            });
        });
    }

    // Initial call to load the submissions when the page loads
    await displayStudentSkills();
});

