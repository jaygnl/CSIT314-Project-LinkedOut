const user = API.requireAuth("candidate");

const topSearchForm = document.getElementById("topSearchForm");
const jobSearchInput = document.getElementById("jobSearchInput");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const filterInputs = document.querySelectorAll(
  '.filter-option input[type="checkbox"]',
);
const jobCountText = document.getElementById("jobCountText");
const feedTitle = document.getElementById("feedTitle");
const listContainer = document.getElementById("jobListContainer");
const tabRecommended = document.getElementById("tabRecommended");
const tabAll = document.getElementById("tabAll");
const fuzzyToggle = document.getElementById("fuzzyToggle");
const membershipBanner = document.getElementById("membershipBanner");
const upgradeBtn = document.getElementById("upgradeBtn");

let view = "recommended";
let appliedJobIds = new Set();
let savedJobIds = new Set(
  JSON.parse(localStorage.getItem("linkedOutSaved") || "[]"),
);

function money(n) {
  return n == null ? "" : "$" + Math.round(n / 1000) + "k";
}
function daysAgo(iso) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "Today" : d === 1 ? "1 day ago" : `${d} days ago`;
}
function esc(s) {
  return (s == null ? "" : String(s)).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}

function selectedFilters() {
  const byGroup = { jobType: [], experienceLevel: [], workMode: [] };
  document.getElementById("filterFullTime").checked &&
    byGroup.jobType.push("Full-time");
  document.getElementById("filterPartTime").checked &&
    byGroup.jobType.push("Part-time");
  document.getElementById("filterContract").checked &&
    byGroup.jobType.push("Contract");
  document.getElementById("filterInternship").checked &&
    byGroup.jobType.push("Internship");
  document.getElementById("filterEntry").checked &&
    byGroup.experienceLevel.push("Entry Level");
  document.getElementById("filterMid").checked &&
    byGroup.experienceLevel.push("Mid Level");
  document.getElementById("filterSenior").checked &&
    byGroup.experienceLevel.push("Senior Level");
  document.getElementById("filterRemote").checked &&
    byGroup.workMode.push("Remote");
  document.getElementById("filterHybrid").checked &&
    byGroup.workMode.push("Hybrid");
  document.getElementById("filterOnSite").checked &&
    byGroup.workMode.push("On-site");
  const params = {};
  for (const [k, v] of Object.entries(byGroup))
    if (v.length) params[k] = v.join(",");
  return params;
}

function hasActiveSearchOrFilter() {
  return (
    jobSearchInput.value.trim() !== "" ||
    Object.keys(selectedFilters()).length > 0
  );
}

const ICONS = ["💼", "💻", "📊", "🚀", "🛠️", "📱", "🔐", "🎨", "📈", "🧠"];

function jobCard(job) {
  const skills = ((job.requirements && job.requirements.skills) || []).slice(
    0,
    4,
  );
  const applied = appliedJobIds.has(job.id);
  const saved = savedJobIds.has(job.id);
  const matchBadge =
    job._match != null
      ? `<span class="tag" style="background:var(--primary-light);color:var(--primary);font-weight:700;">★ ${job._match}% match</span>`
      : "";
  const icon = ICONS[(job.title || "").length % ICONS.length];
  return `
    <article class="card job-card" data-job-id="${esc(job.id)}">
      <div class="company-icon">${icon}</div>
      <div>
        <div class="job-top">
          <div>
            <h2 class="job-title">${esc(job.title)}</h2>
            <p class="company-name">${esc(job.companyName || (job.company && job.company.name) || "")}</p>
          </div>
          <button class="save-btn ${saved ? "saved" : ""}" type="button" aria-label="Save job" data-save="${esc(job.id)}">${saved ? "♥" : "♡"}</button>
        </div>
        <div class="job-meta">
          <span>📍 ${esc(job.locationText || "Flexible")}</span>
          <span>💼 ${esc(job.jobType || "Full-time")}</span>
          ${job.salaryMin ? `<span>💵 ${money(job.salaryMin)} – ${money(job.salaryMax)}</span>` : ""}
          <span>🕒 ${daysAgo(job.createdAt)}</span>
        </div>
        <p class="job-description">${esc(job.description)}</p>
        <div class="tag-row">
          ${matchBadge}
          ${(job.workMode || []).map((m) => `<span class="tag">${esc(m)}</span>`).join("")}
          ${skills.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}
        </div>
        <div class="job-actions">
          <button class="secondary-btn view-details-btn" type="button" data-view="${esc(job.id)}">View Details ↗</button>
          <button class="primary-btn apply-btn" type="button" data-apply="${esc(job.id)}" ${applied ? "disabled" : ""} style="min-height:38px;">${applied ? "Applied ✓" : "Apply"}</button>
        </div>
      </div>
    </article>`;
}

function render(jobs) {
  if (!jobs.length) {
    listContainer.innerHTML = `<div class="card" style="padding:28px;text-align:center;color:var(--text-muted);">No jobs found. Try different keywords or clear filters.</div>`;
    jobCountText.textContent = "0 jobs found";
    return;
  }
  listContainer.innerHTML = jobs.map(jobCard).join("");
  jobCountText.textContent = `${jobs.length} job${jobs.length !== 1 ? "s" : ""} found`;
}

async function loadRecommended() {
  view = "recommended";
  tabRecommended.classList.add("active");
  tabAll.classList.remove("active");
  feedTitle.textContent = "Recommended Jobs";
  listContainer.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--text-muted);">Matching you to jobs…</div>`;
  try {
    const data = await API.candidates.recommendations();
    membershipBanner.style.display =
      data.membership === "member" ? "none" : "flex";
    render(data.results);
    if (data.membership === "member") {
      jobCountText.textContent = `${data.count} matches (Member · unlimited)`;
    } else {
      jobCountText.textContent = `Top ${data.count} of ${data.totalJobs} jobs`;
    }
  } catch (err) {
    if (err.status === 404) {
      listContainer.innerHTML = `<div class="card" style="padding:24px;text-align:center;">Complete your <a href="profile.html">profile</a> to get personalised recommendations.</div>`;
    } else {
      showToast(err.message, "#c0392b");
    }
  }
}

async function loadAll() {
  view = "all";
  tabAll.classList.add("active");
  tabRecommended.classList.remove("active");
  feedTitle.textContent = "All Jobs";
  const q = jobSearchInput.value.trim();
  const filters = selectedFilters();
  const mode = fuzzyToggle.checked
    ? "fuzzy"
    : Object.keys(filters).length && q
      ? "combined"
      : Object.keys(filters).length
        ? "filter"
        : "keyword";
  const params = { q, mode, ...filters };
  listContainer.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--text-muted);">Searching…</div>`;
  try {
    const data = await API.jobs.search(params);
    membershipBanner.style.display = API.isMember() ? "none" : "flex";
    render(data.results);
    jobCountText.textContent = `${data.count} of ${data.total} jobs · mode: ${data.mode}`;
  } catch (err) {
    showToast(err.message, "#c0392b");
  }
}

function reload() {
  view === "recommended" ? loadRecommended() : loadAll();
}

// ── Events ──
topSearchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  loadAll();
});
fuzzyToggle.addEventListener("change", () => loadAll());
filterInputs.forEach((i) => i.addEventListener("change", () => loadAll()));
tabRecommended.addEventListener("click", loadRecommended);
tabAll.addEventListener("click", loadAll);

clearFiltersBtn.addEventListener("click", () => {
  filterInputs.forEach((i) => {
    i.checked = false;
  });
  jobSearchInput.value = "";
  fuzzyToggle.checked = false;
  loadRecommended();
});

document.querySelectorAll(".recent-search-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    jobSearchInput.value = btn.dataset.search || "";
    loadAll();
  });
});

// Delegated clicks for dynamically rendered cards
listContainer.addEventListener("click", async (e) => {
  const saveId = e.target.closest("[data-save]")?.dataset.save;
  const viewId = e.target.closest("[data-view]")?.dataset.view;
  const applyId = e.target.closest("[data-apply]")?.dataset.apply;

  if (saveId) {
    const btn = e.target.closest("[data-save]");
    if (savedJobIds.has(saveId)) {
      savedJobIds.delete(saveId);
      btn.textContent = "♡";
      btn.classList.remove("saved");
    } else {
      savedJobIds.add(saveId);
      btn.textContent = "♥";
      btn.classList.add("saved");
    }
    localStorage.setItem("linkedOutSaved", JSON.stringify([...savedJobIds]));
    updateStats();
  }
  if (viewId) {
    window.location.href = `job-details.html?id=${encodeURIComponent(viewId)}`;
  }
  if (applyId) {
    const btn = e.target.closest("[data-apply]");
    btn.disabled = true;
    btn.textContent = "…";
    try {
      await API.jobs.apply(applyId);
      appliedJobIds.add(applyId);
      btn.textContent = "Applied ✓";
      showToast("Application submitted ✓", "#1e5c3a");
      updateStats();
    } catch (err) {
      if (err.status === 409) {
        appliedJobIds.add(applyId);
        btn.textContent = "Applied ✓";
      } else {
        btn.disabled = false;
        btn.textContent = "Apply";
        showToast(err.message, "#c0392b");
      }
    }
  }
});

upgradeBtn.addEventListener("click", async () => {
  try {
    await API.setMembership("member");
    showToast("Upgraded to Member ★ — unlimited recommendations", "#1e5c3a");
    membershipBanner.style.display = "none";
    reload();
  } catch (err) {
    showToast(err.message, "#c0392b");
  }
});

function updateStats() {
  document.getElementById("appliedCount").textContent = appliedJobIds.size;
  document.getElementById("savedCount").textContent = savedJobIds.size;
}

async function initProfilePanel() {
  try {
    const { profile } = await API.candidates.me();
    document.getElementById("profileAvatar").textContent =
      profile.initials || "U";
    document.getElementById("profileName").textContent =
      profile.fullName || "Your name";
    document.getElementById("profileHeadline").textContent =
      profile.headline || "Add your headline";
    if (!profile.profileComplete) {
      jobCountText.textContent = "Complete your profile for better matches →";
    }
  } catch {
    /* leave defaults */
  }
  try {
    const apps = await API.candidates.applications();
    appliedJobIds = new Set(apps.results.map((r) => r.application.jobId));
    document.getElementById("interviewCount").textContent = apps.results.filter(
      (r) => r.application.status === "accepted",
    ).length;
  } catch {
    /* ignore */
  }
  updateStats();
}

document
  .getElementById("viewProfileBtn")
  .addEventListener("click", () => (window.location.href = "profile.html"));
document
  .getElementById("jobsNavBtn")
  .addEventListener(
    "click",
    () => (window.location.href = "applications.html"),
  );
// The notifications bell is handled by notifications.js (dropdown), not navigation.

const FILTER_FACETS = {
  filterFullTime: ["jobType", "Full-time"],
  filterPartTime: ["jobType", "Part-time"],
  filterContract: ["jobType", "Contract"],
  filterInternship: ["jobType", "Internship"],
  filterEntry: ["experienceLevel", "Entry Level"],
  filterMid: ["experienceLevel", "Mid Level"],
  filterSenior: ["experienceLevel", "Senior Level"],
  filterRemote: ["workMode", "Remote"],
  filterHybrid: ["workMode", "Hybrid"],
  filterOnSite: ["workMode", "On-site"],
};

async function updateFilterCounts() {
  let allJobs;
  try {
    allJobs = (await API.jobs.search({ mode: "keyword" })).results;
  } catch {
    return;
  }
  for (const [inputId, [key, value]] of Object.entries(FILTER_FACETS)) {
    const input = document.getElementById(inputId);
    const span = input
      ? input.closest(".filter-option")?.querySelector(".filter-count")
      : null;
    if (!span) continue;
    span.textContent =
      key === "workMode"
        ? allJobs.filter((j) => (j.workMode || []).includes(value)).length
        : allJobs.filter((j) => j[key] === value).length;
  }
}

(async function init() {
  await initProfilePanel();
  updateFilterCounts();
  await loadRecommended();
})();

