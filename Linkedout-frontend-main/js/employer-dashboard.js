API.requireAuth("employer");

const grid = document.getElementById("postingGrid");
const sub = document.getElementById("postingsSub");
const esc = (s) =>
  (s == null ? "" : String(s)).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

function money(n) {
  return n == null ? "" : "$" + Math.round(n / 1000) + "k";
}
function daysAgo(iso) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "Today" : d === 1 ? "1 day ago" : `${d} days ago`;
}

function postingCard(j) {
  const statusClass = `status-${j.status || "open"}`;
  const tags =
    (j.workMode || [])
      .map((m) => `<span class="tag">${esc(m)}</span>`)
      .join("") +
    (j.jobType ? `<span class="tag">${esc(j.jobType)}</span>` : "");
  return `
    <article class="card posting-card" data-job-id="${esc(j.id)}">
      <div class="pc-top">
        <div>
          <div class="pc-title">${esc(j.title)}</div>
          <div class="pc-company">${esc(j.companyName || "")}</div>
        </div>
        <span class="pc-status ${statusClass}">${esc(j.status || "open")}</span>
      </div>
      <div class="pc-meta">
        <span>📍 ${esc(j.locationText || "Flexible")}</span>
        ${j.salaryMin ? `<span>💵 ${money(j.salaryMin)} – ${money(j.salaryMax)}</span>` : ""}
        <span>🕒 ${daysAgo(j.createdAt)}</span>
      </div>
      <div class="pc-tags">${tags}</div>
      <div class="pc-foot">
        <span class="pc-applicants">👥 ${j.applicantCount} applicant${j.applicantCount !== 1 ? "s" : ""}</span>
        <span class="pc-manage">View &amp; manage →</span>
      </div>
    </article>`;
}

async function load() {
  try {
    const data = await API.jobs.mine();
    if (!data.results.length) {
      grid.innerHTML = `<div class="empty-postings" style="grid-column:1/-1;">
        <div class="icon">📋</div>
        <h3 style="color:var(--text-main);font-size:18px;margin-bottom:8px;">No job postings yet</h3>
        <p style="margin-bottom:18px;">Publish your first role to start receiving applicants and candidate recommendations.</p>
        <button class="primary-btn" onclick="window.location.href='create-job-posting.html'">+ Post a Job</button>
      </div>`;
      sub.textContent = "You have no active postings";
      return;
    }
    data.results.sort(
      (a, b) => (b.applicantCount || 0) - (a.applicantCount || 0),
    );
    grid.innerHTML = data.results.map(postingCard).join("");
    const totalApplicants = data.results.reduce(
      (s, j) => s + (j.applicantCount || 0),
      0,
    );
    sub.textContent = `${data.results.length} posting${data.results.length !== 1 ? "s" : ""} · ${totalApplicants} total applicant${totalApplicants !== 1 ? "s" : ""}`;
  } catch (err) {
    grid.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--red);grid-column:1/-1;">${esc(err.message)}</div>`;
  }
}

grid.addEventListener("click", (e) => {
  const card = e.target.closest(".posting-card");
  if (card)
    window.location.href = `employer-job-detail.html?id=${encodeURIComponent(card.dataset.jobId)}`;
});

document
  .getElementById("postNewJobBtn")
  .addEventListener(
    "click",
    () => (window.location.href = "create-job-posting.html"),
  );
document.getElementById("sidebarLogoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  API.logout();
});

load();
