const express = require("express");
const router = express.Router();

const { collection } = require("../db/store");
const { search } = require("../lib/search");
const { jobConfig } = require("../lib/collections");
const { parseSearchParams, recommendationLimit } = require("../lib/params");
const { recommendCandidatesForJob } = require("../lib/recommend");
const { educationRank } = require("../lib/text");
const { authRequired, authOptional, requireRole } = require("../lib/auth");

const jobs = () => collection("jobs");
const candidates = () => collection("candidates");
const applications = () => collection("applications");

function experienceLevel(years) {
  if (years <= 1) return "Entry Level";
  if (years <= 5) return "Mid Level";
  return "Senior Level";
}

router.get("/", (req, res) => {
  const params = parseSearchParams(req.query);
  const all = jobs().all();
  const ranked = search(all, params, jobConfig);
  res.json({
    count: ranked.length,
    total: all.length,
    mode: params.mode,
    results: ranked.map((r) => ({
      ...r.item,
      _score: r.score,
      _matchType: r.matchType,
    })),
  });
});

router.get("/mine", authRequired, requireRole("employer"), (req, res) => {
  const mine = jobs().find((j) => j.employerId === req.user.id);
  const withCounts = mine.map((j) => ({
    ...j,
    applicantCount: applications().find((a) => a.jobId === j.id).length,
  }));
  res.json({ count: withCounts.length, results: withCounts });
});

router.post("/", authRequired, requireRole("employer"), (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.description) {
    return res
      .status(400)
      .json({ error: "Job title and description are required." });
  }
  const years = Number(b.experienceYears) || 0;
  const skills = Array.isArray(b.skills)
    ? b.skills
    : String(b.skills || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const locationText = b.locationText || b.jobLocation || "";
  const base = 60000 + years * 12000;

  const job = jobs().insert({
    title: b.title,
    companyName: b.companyName || req.user.companyName || "Company",
    company: { name: b.companyName || req.user.companyName || "Company" },
    description: b.description,
    requirements: {
      education: b.education || "No requirement",
      educationRank: educationRank(b.education),
      skills,
      experienceYears: years,
    },
    workMode: Array.isArray(b.workMode)
      ? b.workMode
      : [b.workMode].filter(Boolean),
    location: { town: locationText },
    locationText,
    jobType: b.jobType || "Full-time",
    experienceLevel: experienceLevel(years),
    salaryMin: b.salaryMin !== undefined ? Number(b.salaryMin) : base,
    salaryMax: b.salaryMax !== undefined ? Number(b.salaryMax) : base + 30000,
    applicantLimit: b.applicantLimit ? Number(b.applicantLimit) : null,
    status: b.status === "draft" ? "draft" : "open",
    employerId: req.user.id,
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ job });
});

router.get("/:id", (req, res) => {
  const job = jobs().findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found." });
  res.json({ job });
});

router.patch("/:id", authRequired, requireRole("employer"), (req, res) => {
  const job = jobs().findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found." });
  if (job.employerId !== req.user.id)
    return res.status(403).json({ error: "Not your posting." });

  const b = req.body || {};
  const patch = {};

  if ("title" in b) patch.title = b.title;
  if ("description" in b) patch.description = b.description;
  if ("status" in b) patch.status = b.status;
  if ("jobType" in b) patch.jobType = b.jobType;
  if ("applicantLimit" in b)
    patch.applicantLimit = b.applicantLimit ? Number(b.applicantLimit) : null;
  if ("salaryMin" in b) patch.salaryMin = Number(b.salaryMin);
  if ("salaryMax" in b) patch.salaryMax = Number(b.salaryMax);
  if ("companyName" in b) {
    patch.companyName = b.companyName;
    patch.company = { ...(job.company || {}), name: b.companyName };
  }
  if ("workMode" in b)
    patch.workMode = Array.isArray(b.workMode)
      ? b.workMode
      : [b.workMode].filter(Boolean);
  if ("jobLocation" in b || "locationText" in b) {
    const lt = b.locationText || b.jobLocation || "";
    patch.locationText = lt;
    patch.location = { ...(job.location || {}), town: lt };
  }
  if ("education" in b || "skills" in b || "experienceYears" in b) {
    const cur = job.requirements || {};
    const education = "education" in b ? b.education : cur.education;
    const skills =
      "skills" in b
        ? Array.isArray(b.skills)
          ? b.skills
          : String(b.skills || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
        : cur.skills;
    const years =
      "experienceYears" in b
        ? Number(b.experienceYears) || 0
        : cur.experienceYears;
    patch.requirements = {
      education,
      educationRank: educationRank(education),
      skills,
      experienceYears: years,
    };
    patch.experienceLevel = experienceLevel(years);
  }

  res.json({ job: jobs().update(job.id, patch) });
});

router.get(
  "/:id/candidates",
  authRequired,
  requireRole("employer"),
  (req, res) => {
    const job = jobs().findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found." });

    const limit = recommendationLimit(req.user);
    const ranked = recommendCandidatesForJob(job, candidates().all(), limit);
    res.json({
      job: { id: job.id, title: job.title },
      membership: req.user.membership,
      limit: Number.isFinite(limit) ? limit : null,
      totalCandidates: candidates().count(),
      count: ranked.length,
      results: ranked,
    });
  },
);

router.get(
  "/:id/applicants",
  authRequired,
  requireRole("employer"),
  (req, res) => {
    const apps = applications().find((a) => a.jobId === req.params.id);
    const results = apps.map((a) => ({
      application: a,
      candidate: candidates().findById(a.candidateId),
    }));
    res.json({ count: results.length, results });
  },
);

router.post(
  "/:id/apply",
  authRequired,
  requireRole("candidate"),
  (req, res) => {
    const job = jobs().findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found." });
    const candidateId = req.user.candidateId;
    const dup = applications().findOne(
      (a) => a.jobId === job.id && a.candidateId === candidateId,
    );
    if (dup)
      return res
        .status(409)
        .json({ error: "Already applied.", application: dup });
    const application = applications().insert({
      jobId: job.id,
      candidateId,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ application });
  },
);

module.exports = router;
