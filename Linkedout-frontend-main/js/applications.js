API.requireAuth("candidate");

const listEl = document.getElementById("applicationList");
const countEl = document.getElementById("appsCountText");
const esc = (s) =>
  (s == null ? "" : String(s)).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

let applications = [];
let activeFilter = "all";

const BADGE = {
  pending: { cls: "status-pending", label: "⏳ Pending" },
  accepted: { cls: "status-accepted", label: "✅ Accepted" },
  rejected: { cls: "status-rejected", label: "❌ Rejected" },
};

function steps(status) {
  const map = {
    pending: ["done", "", "", ""],
    accepted: ["done", "done", "done", "done"],
    rejected: ["done", "failed", "", ""],
  }[status] || ["done", "", "", ""];
  const labels = ["Applied", "Reviewed", "Interview", "Offer"];
  return `<div class="app-progress"><div class="progress-steps">${labels
    .map(
      (l, i) => `
      <div class="progress-step">
        <div class="step-dot ${map[i]}">${map[i] === "done" ? "✓" : map[i] === "failed" ? "✕" : ""}</div>
        <div class="step-label ${map[i] === "done" ? "done" : ""}">${l}</div>
        ${i < 3 ? `<div class="step-line ${map[i] === "done" && map[i + 1] ? "done" : ""}"></div>` : ""}
      </div>`,
    )
    .join("")}</div></div>`;
}

function card({ application, job }) {
  if (!job) return "";
  const b = BADGE[application.status] || BADGE.pending;
  return `
    <div class="card application-card" data-status="${application.status}">
      <div class="app-company-icon">💼</div>
      <div class="app-content">
        <div class="app-top">
          <div>
            <p class="app-job-title">${esc(job.title)}</p>
            <p class="app-company">${esc(job.companyName || "")}</p>
          </div>
          <span class="status-badge ${b.cls}">${b.label}</span>
        </div>
        <div class="app-meta">
          <span>📍 ${esc(job.locationText || "Flexible")}</span>
          <span>💼 ${esc(job.jobType || "Full-time")}</span>
          <span>🗓 Applied ${new Date(application.createdAt).toLocaleDateString()}</span>
        </div>
        ${steps(application.status)}
        <div class="app-actions">
          <button class="secondary-btn" data-job-id="${esc(job.id)}" type="button" style="font-size:12px;min-height:34px;padding:6px 14px;">View Job</button>
        </div>
      </div>
    </div>`;
}

function render() {
  const filtered =
    activeFilter === "all"
      ? applications
      : applications.filter((a) => a.application.status === activeFilter);
  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><h3>No applications here</h3><p>Browse jobs and apply to see them tracked here.</p><a class="primary-btn" href="dashboard.html" style="display:inline-block;text-decoration:none;">Browse Jobs</a></div>`;
  } else {
    listEl.innerHTML = filtered.map(card).join("");
  }
  countEl.textContent = `${applications.length} application${applications.length !== 1 ? "s" : ""}`;
}

function updateSummary() {
  const by = (s) =>
    applications.filter((a) => a.application.status === s).length;
  document.getElementById("totalApplied").textContent = applications.length;
  document.getElementById("totalPending").textContent = by("pending");
  document.getElementById("totalReview").textContent = 0;
  document.getElementById("totalAccepted").textContent = by("accepted");
  document.getElementById("totalRejected").textContent = by("rejected");
}

document.querySelectorAll(".filter-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-tab")
      .forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    activeFilter =
      tab.dataset.filter === "review" ? "__none__" : tab.dataset.filter;
    render();
  });
});

listEl.addEventListener("click", (e) => {
  const jobId = e.target.closest("[data-job-id]")?.dataset.jobId;
  if (jobId)
    window.location.href = `job-details.html?id=${encodeURIComponent(jobId)}`;
});

document
  .getElementById("homeNavBtn")
  ?.addEventListener("click", () => (window.location.href = "dashboard.html"));
document.getElementById("appsLogoutBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  API.logout();
});

async function init() {
  try {
    const { profile } = await API.candidates.me();
    document.getElementById("appProfileAvatar").textContent =
      profile.initials || "U";
    document.getElementById("appProfileName").textContent =
      profile.fullName || "Your name";
    document.getElementById("appProfileHeadline").textContent =
      profile.headline || "";
  } catch {
    /* ignore */
  }
  try {
    const data = await API.candidates.applications();
    applications = data.results;
    updateSummary();
    render();
  } catch (err) {
    showToast(err.message, "#c0392b");
  }
}
init();
