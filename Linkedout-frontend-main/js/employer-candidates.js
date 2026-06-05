API.requireAuth("employer");

const grid = document.getElementById("candidateGrid");
const sub = document.getElementById("candidatesSub");
const candSearchInput = document.getElementById("candSearchInput");
const filterSkill = document.getElementById("filterSkill");
const filterEducation = document.getElementById("filterEducation");
const filterWorkMode = document.getElementById("filterWorkMode");
const filterExpMin = document.getElementById("filterExpMin");
const fuzzyToggle = document.getElementById("fuzzyToggle");

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
const esc = (s) =>
  (s == null ? "" : String(s)).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

let shortlisted = new Set(
  JSON.parse(localStorage.getItem("linkedOutShortlist") || "[]"),
);

function candidateCard(c, i) {
  const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
  const skills = (c.skills || [])
    .slice(0, 5)
    .map((s) => `<span class="tag" style="font-size:10px;">${esc(s)}</span>`)
    .join("");
  const done = shortlisted.has(c.id);
  return `
    <div class="card candidate-card" data-candidate-id="${esc(c.id)}">
      <div class="card-head">
        <div class="candidate-avatar" style="background:${color};">${esc(c.initials || "?")}</div>
        <div>
          <div class="candidate-name">${esc(c.fullName)}</div>
          <div class="candidate-role">${esc(c.headline || c.major)} · ${esc(c.yearsOfExperience)} yrs · ${esc(c.educationLevel || "")}</div>
          <div class="candidate-loc">📍 ${esc(c.preferredLocation || "")} · ${esc(c.preferredWorkingMode || "")}</div>
        </div>
      </div>
      <div class="tag-row" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;">${skills}</div>
      <div class="card-btns">
        <button class="btn-accept" type="button" data-shortlist="${esc(c.id)}">${done ? "Shortlisted ✓" : "Shortlist"}</button>
        <button class="btn-reject" type="button" data-pass="${esc(c.id)}">Pass</button>
      </div>
    </div>`;
}

function render(list) {
  if (!list.length) {
    grid.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--text-muted);grid-column:1/-1;">No candidates match. Try different terms or clear filters.</div>`;
    return;
  }
  grid.innerHTML = list.map(candidateCard).join("");
}

async function search() {
  const q = candSearchInput.value.trim();
  const filters = {};
  if (filterSkill.value.trim()) filters.skills = filterSkill.value.trim();
  if (filterEducation.value) filters.education = filterEducation.value;
  if (filterWorkMode.value) filters.workMode = filterWorkMode.value;
  if (filterExpMin.value) filters.expMin = filterExpMin.value;

  const hasFilters = Object.keys(filters).length > 0;
  const mode = fuzzyToggle.checked
    ? "fuzzy"
    : hasFilters && q
      ? "combined"
      : hasFilters
        ? "filter"
        : "keyword";

  grid.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--text-muted);grid-column:1/-1;">Searching…</div>`;
  try {
    const data = await API.candidates.search({ q, mode, ...filters });
    render(data.results);
    sub.textContent = `${data.count} of ${data.total} candidates · ${data.mode}`;
  } catch (err) {
    showToast(err.message, "#c0392b");
  }
}

document.getElementById("candSearchBtn").addEventListener("click", search);
candSearchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") search();
});
document
  .getElementById("headerSearchInput")
  ?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      candSearchInput.value = e.target.value;
      search();
    }
  });
document.getElementById("candClearBtn").addEventListener("click", () => {
  [candSearchInput, filterSkill, filterExpMin].forEach((el) => (el.value = ""));
  filterEducation.value = "";
  filterWorkMode.value = "";
  fuzzyToggle.checked = false;
  search();
});

grid.addEventListener("click", (e) => {
  const card = e.target.closest(".candidate-card");
  const shortlistId = e.target.closest("[data-shortlist]")?.dataset.shortlist;
  const passId = e.target.closest("[data-pass]")?.dataset.pass;
  if (shortlistId) {
    shortlisted.add(shortlistId);
    localStorage.setItem(
      "linkedOutShortlist",
      JSON.stringify([...shortlisted]),
    );
    e.target.textContent = "Shortlisted ✓";
    if (card) card.style.opacity = "0.6";
    showToast("Candidate shortlisted ✓", "#1e5c3a");
  }
  if (passId) {
    if (card) {
      card.style.opacity = "0.3";
      card.style.pointerEvents = "none";
    }
    showToast("Passed", "#c0392b");
  }
});

document.getElementById("sidebarLogoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  API.logout();
});
document
  .getElementById("navHome")
  .addEventListener(
    "click",
    () => (window.location.href = "employer-dashboard.html"),
  );

search();
