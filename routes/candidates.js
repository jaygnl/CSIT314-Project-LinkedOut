const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();

const { collection } = require("../db/store");
const { search } = require("../lib/search");
const { candidateConfig } = require("../lib/collections");
const { parseSearchParams, recommendationLimit } = require("../lib/params");
const { recommendJobsForCandidate } = require("../lib/recommend");
const { educationRank, educationLevel } = require("../lib/text");
const { authRequired, requireRole } = require("../lib/auth");

const candidates = () => collection("candidates");
const jobs = () => collection("jobs");
const applications = () => collection("applications");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) =>
      cb(
        null,
        `${req.user.candidateId}_${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`,
      ),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function experienceLevel(years) {
  if (years <= 1) return "Entry Level";
  if (years <= 5) return "Mid Level";
  return "Senior Level";
}

function withDerived(profile) {
  const topDegree =
    (profile.education &&
      profile.education[0] &&
      profile.education[0].degree) ||
    profile.educationLevel ||
    "";
  const latest =
    (profile.workExperience &&
      profile.workExperience[profile.workExperience.length - 1]) ||
    {};
  const years = Number(profile.yearsOfExperience) || 0;
  return {
    ...profile,
    initials:
      (profile.fullName || "?")
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?",
    headline:
      profile.headline || latest.position || profile.major || "Candidate",
    educationRank: profile.educationLevel
      ? educationRank(profile.educationLevel)
      : educationRank(topDegree),
    educationLevel: profile.educationLevel || educationLevel(topDegree),
    yearsOfExperience: years,
    experienceLevel: experienceLevel(years),
  };
}

router.get("/", (req, res) => {
  const params = parseSearchParams(req.query);
  const all = candidates().all();
  const ranked = search(all, params, candidateConfig);
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

router.get("/me", authRequired, requireRole("candidate"), (req, res) => {
  const profile = candidates().findById(req.user.candidateId);
  if (!profile) return res.status(404).json({ error: "Profile not found." });
  res.json({ profile });
});

router.put("/me", authRequired, requireRole("candidate"), (req, res) => {
  const current = candidates().findById(req.user.candidateId);
  if (!current) return res.status(404).json({ error: "Profile not found." });

  const b = req.body || {};
  const editable = [
    "fullName",
    "headline",
    "contactInfo",
    "education",
    "educationLevel",
    "major",
    "yearsOfExperience",
    "workExperience",
    "skills",
    "preferredWorkingMode",
    "preferredLocation",
  ];
  const merged = { ...current };
  for (const k of editable) if (k in b) merged[k] = b[k];

  merged.profileComplete = Boolean(
    merged.fullName &&
    (merged.skills || []).length &&
    merged.major &&
    merged.preferredWorkingMode &&
    merged.preferredLocation,
  );

  const saved = candidates().update(current.id, withDerived(merged));
  res.json({ profile: saved });
});

router.post(
  "/me/resume",
  authRequired,
  requireRole("candidate"),
  upload.single("resume"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    const profile = candidates().update(req.user.candidateId, {
      resumeFile: {
        name: req.file.originalname,
        storedAs: req.file.filename,
        uploadedAt: new Date().toISOString(),
        size: req.file.size,
      },
    });
    res.json({ resumeFile: profile.resumeFile });
  },
);

router.get(
  "/me/recommendations",
  authRequired,
  requireRole("candidate"),
  (req, res) => {
    const profile = candidates().findById(req.user.candidateId);
    if (!profile) return res.status(404).json({ error: "Profile not found." });

    const limit = recommendationLimit(req.user);
    const ranked = recommendJobsForCandidate(profile, jobs().all(), limit);
    res.json({
      membership: req.user.membership,
      limit: Number.isFinite(limit) ? limit : null,
      totalJobs: jobs().count(),
      count: ranked.length,
      results: ranked,
    });
  },
);

router.get(
  "/me/applications",
  authRequired,
  requireRole("candidate"),
  (req, res) => {
    const apps = applications().find(
      (a) => a.candidateId === req.user.candidateId,
    );
    const results = apps.map((a) => ({
      application: a,
      job: jobs().findById(a.jobId),
    }));
    res.json({ count: results.length, results });
  },
);

router.get("/:id", (req, res) => {
  const profile = candidates().findById(req.params.id);
  if (!profile) return res.status(404).json({ error: "Candidate not found." });
  res.json({ profile });
});

module.exports = router;
