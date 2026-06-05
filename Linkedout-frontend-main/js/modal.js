const applyModal = document.getElementById("applyModal");
const applyNowBtn = document.getElementById("applyNowBtn");
const closeApplyModalBtn = document.getElementById("closeApplyModalBtn");
const applyForm = document.getElementById("applyForm");

function openModal() {
  if (applyModal) applyModal.classList.add("active");
}
function closeModal() {
  if (applyModal) applyModal.classList.remove("active");
}

if (applyNowBtn) applyNowBtn.addEventListener("click", openModal);
if (closeApplyModalBtn)
  closeApplyModalBtn.addEventListener("click", closeModal);

if (applyModal) {
  applyModal.addEventListener("click", (e) => {
    if (e.target === applyModal) closeModal();
  });
}

if (applyForm) {
  applyForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const applicationData = {
      jobId: new URLSearchParams(window.location.search).get("id") || "unknown",
      name: document.getElementById("applicantNameInput").value.trim(),
      email: document.getElementById("applicantEmailInput").value.trim(),
      resumeFile: document.getElementById("resumeInput").files[0]?.name || null,
      coverLetter: document.getElementById("coverLetterInput").value.trim(),
    };

    console.log("Application submitted:", applicationData);
    showToast("Application submitted ✓", "#1e5c3a");
    closeModal();
    applyForm.reset();
  });
}
