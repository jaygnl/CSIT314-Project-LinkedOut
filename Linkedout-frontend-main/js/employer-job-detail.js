API.requireAuth("employer");

const jobId = new URLSearchParams(location.search).get("id");
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  (s == null ? "" : String(s)).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const money = (n) => (n == null ? "" : "$" + Math.round(n / 1000) + "k");
function daysAgo(iso) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "Today" : d === 1 ? "1 day ago" : `${d} days ago`;
}

const AVATAR_COLORS = [
  "#4f46e5",
  "#0891b2",
  "#d97706",
  "#be185d",
  "#059669",
  "#7c3aed",
  "#dc2626",
  "#2563eb",
];
let job = null;
let appByCandidate = {};

function renderJob() {
  const j = job;
  $("jdTitle").textContent = j.title;
  $("jdCompany").textContent =
    j.companyName || (j.company && j.company.name) || "";
  const statusEl = $("jdStatus");
  statusEl.textContent = j.status || "open";
  statusEl.className = `jd-status status-${j.status || "open"}`;

  $("jdMeta").innerHTML = [
    `📍 ${esc(j.locationText || "Flexible")}`,
    `💼 ${esc(j.jobType || "Full-time")}`,
    j.salaryMin ? `💵 ${money(j.salaryMin)} – ${money(j.salaryMax)}` : "",
    `🕒 Posted ${daysAgo(j.createdAt)}`,
    ...(j.workMode || []).map((m) => `🏠 ${esc(m)}`),
  ]
    .filter(Boolean)
    .map((t) => `<span>${t}</span>`)
    .join("");

  $("jdDescription").textContent = j.description || "";
  $("jdSkills").innerHTML =
    (j.requirements.skills || [])
      .map((s) => `<span class="tag">${esc(s)}</span>`)
      .join("") ||
    '<span style="color:var(--text-soft);">None specified</span>';
  $("jdRequirements").innerHTML = [
    `🎓 ${esc(j.requirements.education || "No requirement")}`,
    `📈 ${esc(j.requirements.experienceYears || 0)}+ years experience`,
    `🏷️ ${esc(j.experienceLevel || "")}`,
  ]
    .map((t) => `<span>${t}</span>`)
    .join("");

  document.title = `LinkedOut | ${j.title}`;
}

function fillEditForm() {
  const j = job;
  $("eTitle").value = j.title || "";
  $("eCompany").value = j.companyName || "";
  $("eLocation").value = j.locationText || "";
  $("eDescription").value = j.description || "";
  $("eEducation").value = j.requirements.education || "No requirement";
  $("eExperience").value = j.requirements.experienceYears || 0;
  $("eSkills").value = (j.requirements.skills || []).join(", ");
  $("eWorkMode").value = (j.workMode && j.workMode[0]) || "Remote";
  $("eJobType").value = j.jobType || "Full-time";
  $("eStatus").value = j.status || "open";
  $("eSalaryMin").value = j.salaryMin != null ? j.salaryMin : "";
  $("eSalaryMax").value = j.salaryMax != null ? j.salaryMax : "";
}

function toggleEdit(on) {
  $("jdView").classList.toggle("hidden", on);
  $("jdEditForm").classList.toggle("active", on);
}

$("editJobBtn").addEventListener("click", () => {
  fillEditForm();
  toggleEdit(true);
});
$("cancelEditBtn").addEventListener("click", () => toggleEdit(false));

$("saveJobBtn").addEventListener("click", async () => {
  const payload = {
    title: $("eTitle").value.trim(),
    companyName: $("eCompany").value.trim(),
    jobLocation: $("eLocation").value.trim(),
    description: $("eDescription").value.trim(),
    education: $("eEducation").value,
    experienceYears: Number($("eExperience").value) || 0,
    skills: $("eSkills").value,
    workMode: $("eWorkMode").value,
    jobType: $("eJobType").value,
    status: $("eStatus").value,
    salaryMin: $("eSalaryMin").value
      ? Number($("eSalaryMin").value)
      : undefined,
    salaryMax: $("eSalaryMax").value
      ? Number($("eSalaryMax").value)
      : undefined,
  };
  if (!payload.title || !payload.description) {
    showToast("Title and description are required.", "#c0392b");
    return;
  }
  try {
    const data = await API.jobs.update(jobId, payload);
    job = data.job;
    renderJob();
    toggleEdit(false);
    showToast("Posting updated ✓", "#1e5c3a");
    loadPeople();
  } catch (err) {
    showToast(err.message, "#c0392b");
  }
});

function personCard(c, { application, match, color }) {
  const skills = (c.skills || [])
    .slice(0, 4)
    .map((s) => `<span class="tag" style="font-size:10px;">${esc(s)}</span>`)
    .join("");
  let statusBadge = "",
    buttons;
  if (application) {
    const cls =
      {
        pending: "as-pending",
        accepted: "as-accepted",
        rejected: "as-rejected",
      }[application.status] || "as-pending";
    const label = {
      pending: "⏳ Applied",
      accepted: "✅ Accepted",
      rejected: "❌ Rejected",
    }[application.status];
    statusBadge = `<span class="app-status ${cls}">${label}</span>`;
    buttons = `
      <button class="btn-accept" type="button" data-accept="${esc(application.id)}" ${application.status === "accepted" ? "disabled" : ""}>${application.status === "accepted" ? "Accepted ✓" : "Accept"}</button>
      <button class="btn-reject" type="button" data-reject="${esc(application.id)}" ${application.status === "rejected" ? "disabled" : ""}>${application.status === "rejected" ? "Rejected" : "Reject"}</button>`;
  } else {
    const done = shortlisted.has(c.id);
    buttons = `
      <button class="btn-accept" type="button" data-shortlist="${esc(c.id)}">${done ? "Shortlisted ✓" : "Shortlist"}</button>
      <button class="btn-reject" type="button" data-pass="${esc(c.id)}">Pass</button>`;
  }
  const matchBadge =
    match != null ? `<span class="match-badge">★ ${match}% match</span>` : "";
  return `
    <div class="person" data-candidate-id="${esc(c.id)}">
      <div class="person-head">
        <div class="person-avatar" style="background:${color};">${esc(c.initials || "?")}</div>
        <div>
          <div class="person-name">${esc(c.fullName)} ${matchBadge}</div>
          <div class="person-role">${esc(c.headline || c.major)} · ${esc(c.yearsOfExperience)} yrs · ${esc(c.educationLevel || "")}</div>
          <div class="person-loc">📍 ${esc(c.preferredLocation || "")} · ${esc(c.preferredWorkingMode || "")}</div>
        </div>
      </div>
      ${statusBadge}
      <div class="person-skills">${skills}</div>
      <div class="person-btns">${buttons}</div>
    </div>`;
}

let shortlisted = new Set(
  JSON.parse(localStorage.getItem("linkedOutShortlist") || "[]"),
);

async function loadPeople() {
  const [applicantsRes, recsRes] = await Promise.all([
    API.jobs.applicants(jobId),
    API.jobs.candidates(jobId),
  ]);

  appByCandidate = {};
  applicantsRes.results.forEach((r) => {
    if (r.candidate) appByCandidate[r.candidate.id] = r.application;
  });
  const applicantsGrid = $("applicantsGrid");
  if (!applicantsRes.results.length) {
    applicantsGrid.innerHTML = `<div style="color:var(--text-muted);font-size:13px;grid-column:1/-1;">No applicants yet.</div>`;
  } else {
    applicantsGrid.innerHTML = applicantsRes.results
      .filter((r) => r.candidate)
      .map((r, i) =>
        personCard(r.candidate, {
          application: r.application,
          color: AVATAR_COLORS[i % AVATAR_COLORS.length],
        }),
      )
      .join("");
  }
  $("applicantsSub").textContent =
    `${applicantsRes.count} ${applicantsRes.count === 1 ? "person has" : "people have"} applied`;

  // Recommended candidates (exclude those who already applied)
  const recs = recsRes.results.filter((c) => !appByCandidate[c.id]);
  $("membershipNote").style.display =
    recsRes.membership === "member" ? "none" : "flex";
  $("recGrid").innerHTML = recs.length
    ? recs
        .map((c, i) =>
          personCard(c, {
            match: c._match,
            color: AVATAR_COLORS[(i + 3) % AVATAR_COLORS.length],
          }),
        )
        .join("")
    : `<div style="color:var(--text-muted);font-size:13px;grid-column:1/-1;">No more candidates to suggest.</div>`;
  $("recSub").textContent =
    recsRes.membership === "member"
      ? `${recs.length} recommended matches (Member · unlimited)`
      : `Top matches who haven't applied (free plan shows up to 10)`;
}

document.addEventListener("click", async (e) => {
  const acceptId = e.target.closest("[data-accept]")?.dataset.accept;
  const rejectId = e.target.closest("[data-reject]")?.dataset.reject;
  const shortlistId = e.target.closest("[data-shortlist]")?.dataset.shortlist;
  const passId = e.target.closest("[data-pass]")?.dataset.pass;

  if (acceptId || rejectId) {
    const status = acceptId ? "accepted" : "rejected";
    try {
      await API.applications.setStatus(acceptId || rejectId, status);
      showToast(
        status === "accepted"
          ? "Applicant accepted ✓ — candidate notified"
          : "Applicant rejected",
        status === "accepted" ? "#1e5c3a" : "#c0392b",
      );
      loadPeople();
    } catch (err) {
      showToast(err.message, "#c0392b");
    }
    return;
  }
  if (shortlistId) {
    shortlisted.add(shortlistId);
    localStorage.setItem(
      "linkedOutShortlist",
      JSON.stringify([...shortlisted]),
    );
    e.target.textContent = "Shortlisted ✓";
    const card = e.target.closest(".person");
    if (card) card.style.opacity = "0.6";
    showToast("Candidate shortlisted ✓", "#1e5c3a");
  }
  if (passId) {
    const card = e.target.closest(".person");
    if (card) {
      card.style.opacity = "0.3";
      card.style.pointerEvents = "none";
    }
    showToast("Passed", "#c0392b");
  }
});

$("upgradeBtn").addEventListener("click", async () => {
  try {
    await API.setMembership("member");
    showToast("Upgraded to Member ★", "#1e5c3a");
    $("membershipNote").style.display = "none";
    loadPeople();
  } catch (err) {
    showToast(err.message, "#c0392b");
  }
});

$("backLink").addEventListener(
  "click",
  () => (window.location.href = "employer-dashboard.html"),
);
$("navHome").addEventListener(
  "click",
  () => (window.location.href = "employer-dashboard.html"),
);
$("sidebarLogoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  API.logout();
});

(async function init() {
  if (!jobId) {
    $("jdTitle").textContent = "No posting selected";
    return;
  }
  try {
    const data = await API.jobs.one(jobId);
    job = data.job;
    renderJob();
    loadPeople();
  } catch (err) {
    $("jdTitle").textContent = "Posting not found";
    showToast(err.message, "#c0392b");
  }
})();
