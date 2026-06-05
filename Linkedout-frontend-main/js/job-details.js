const params = new URLSearchParams(window.location.search);
const jobId = params.get("id");

const $ = (id) => document.getElementById(id);
const money = (n) => (n == null ? "" : "$" + Math.round(n / 1000) + "k");
function daysAgo(iso) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "Today" : d === 1 ? "1 day ago" : `${d} days ago`;
}

async function load() {
  if (!jobId) {
    $("jobTitle").textContent = "Job not found";
    return;
  }
  try {
    const { job } = await API.jobs.one(jobId);
    render(job);
  } catch (err) {
    $("jobTitle").textContent = "Job not found";
    showToast(err.message, "#c0392b");
  }
}

function render(job) {
  document.title = `LinkedOut | ${job.title}`;
  $("jobTitle").textContent = job.title;
  $("jobCompany").textContent =
    job.companyName || (job.company && job.company.name) || "";
  $("jobLocation").textContent = "📍 " + (job.locationText || "Flexible");
  $("jobType").textContent = "💼 " + (job.jobType || "Full-time");
  $("jobSalary").textContent = job.salaryMin
    ? `💵 ${money(job.salaryMin)} – ${money(job.salaryMax)}`
    : "";
  $("jobPosted").textContent = "🕒 " + daysAgo(job.createdAt);
  $("jobDescription").textContent = job.description;

  const list = $("jobResponsibilities");
  list.innerHTML = "";
  const sentences = (job.description || "").split(/(?<=\.)\s+/).filter(Boolean);
  const points =
    sentences.length > 1
      ? sentences
      : [
          `Apply your skills in ${(job.requirements.skills || []).slice(0, 3).join(", ") || "the role"}.`,
          `Requires ${job.requirements.experienceYears || 0}+ years of experience.`,
          `Education: ${job.requirements.education || "No specific requirement"}.`,
        ];
  points.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p;
    list.appendChild(li);
  });

  const tagRow = $("jobTags");
  if (tagRow) {
    tagRow.innerHTML = "";
    [...(job.workMode || []), ...(job.requirements.skills || [])].forEach(
      (t) => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = t;
        tagRow.appendChild(span);
      },
    );
  }
}

const applyBtn = $("applyNowBtn");
if (applyBtn) {
  applyBtn.addEventListener(
    "click",
    async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const user = API.getUser();
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      if (user.role !== "candidate") {
        showToast("Only candidates can apply.", "#374151");
        return;
      }
      try {
        await API.jobs.apply(jobId);
        applyBtn.textContent = "Applied ✓";
        applyBtn.disabled = true;
        showToast("Application submitted ✓", "#1e5c3a");
      } catch (err) {
        if (err.status === 409) {
          applyBtn.textContent = "Applied ✓";
          applyBtn.disabled = true;
        } else showToast(err.message, "#c0392b");
      }
    },
    true,
  );
}

$("backToDashboardBtn")?.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

const saveJobBtn = $("saveJobBtn");
if (saveJobBtn) {
  const saved = new Set(
    JSON.parse(localStorage.getItem("linkedOutSaved") || "[]"),
  );
  if (saved.has(jobId)) {
    saveJobBtn.classList.add("saved");
    saveJobBtn.textContent = "♥";
  }
  saveJobBtn.addEventListener("click", () => {
    if (saved.has(jobId)) {
      saved.delete(jobId);
      saveJobBtn.textContent = "♡";
      saveJobBtn.classList.remove("saved");
    } else {
      saved.add(jobId);
      saveJobBtn.textContent = "♥";
      saveJobBtn.classList.add("saved");
    }
    localStorage.setItem("linkedOutSaved", JSON.stringify([...saved]));
  });
}

const copyBtn = $("copyJobLinkBtn");
if (copyBtn) {
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Job link copied ✓");
    } catch {
      showToast("Could not copy link", "#374151");
    }
  });
}

load();
