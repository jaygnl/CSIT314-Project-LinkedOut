API.requireAuth("employer");

document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    document
      .querySelectorAll(".mode-btn")
      .forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
    const hidden = document.getElementById("workModeInput");
    if (hidden) hidden.value = this.dataset.mode;
  });
});

let postingStatus = "open";
document.querySelectorAll(".status-opt").forEach((opt) => {
  opt.addEventListener("click", function () {
    document
      .querySelectorAll(".status-opt")
      .forEach((o) => o.classList.remove("active"));
    this.classList.add("active");
    postingStatus =
      (this.id || "").replace("status", "").toLowerCase() || "open";
  });
});

const limitForm = document.getElementById("applicantLimit");
const limitPanel = document.getElementById("applicantLimitPanel");
if (limitForm && limitPanel) {
  limitForm.addEventListener("input", () => {
    limitPanel.value = limitForm.value;
  });
  limitPanel.addEventListener("input", () => {
    limitForm.value = limitPanel.value;
  });
}

const jobTitleInput = document.getElementById("jobTitle");
const previewBtn = document.getElementById("btnPreview");
if (previewBtn) {
  previewBtn.addEventListener("click", () => {
    const ph = document.getElementById("jobCardPreviewPlaceholder");
    const title = jobTitleInput.value.trim();
    if (ph) {
      ph.textContent = title || "Enter a job title first";
      ph.style.fontWeight = title ? "600" : "";
    }
    showToast("Preview updated 👀", "#374151");
  });
}

function collect(status) {
  return {
    title: document.getElementById("jobTitle").value.trim(),
    companyName: document.getElementById("companyNameField").value.trim(),
    description: document.getElementById("jobDescription").value.trim(),
    education: document.getElementById("requiredEducation").value,
    skills: document.getElementById("requiredSkills").value, // comma string; server splits
    experienceYears:
      Number(document.getElementById("yearsExperience").value) || 0,
    workMode: document.getElementById("workModeInput").value,
    jobLocation: document.getElementById("jobLocation").value.trim(),
    jobType: document.getElementById("jobType").value,
    applicantLimit: document.getElementById("applicantLimit").value,
    status,
  };
}

async function publish(status) {
  const payload = collect(status);
  if (!payload.title || !payload.description) {
    showToast("Job title and description are required.", "#c0392b");
    return;
  }
  try {
    const { job } = await API.jobs.create(payload);
    showToast(
      `Job "${job.title}" ${status === "draft" ? "saved as draft 💾" : "published 🚀"}`,
      "#1e5c3a",
    );
    setTimeout(() => {
      window.location.href = "employer-dashboard.html";
    }, 800);
  } catch (err) {
    showToast(err.message, "#c0392b");
  }
}

["btnPublishPanel", "btnPublishBottom"].forEach((id) => {
  document.getElementById(id)?.addEventListener("click", () => publish("open"));
});
["btnSaveDraftPanel", "btnSaveDraftBottom"].forEach((id) => {
  document
    .getElementById(id)
    ?.addEventListener("click", () => publish("draft"));
});

document.getElementById("sidebarLogoutBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  API.logout();
});
document
  .getElementById("navHome")
  ?.addEventListener(
    "click",
    () => (window.location.href = "employer-dashboard.html"),
  );
