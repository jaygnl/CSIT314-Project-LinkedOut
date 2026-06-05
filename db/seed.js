const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { collection } = require("./store");
const { hashPassword } = require("../lib/auth");
const { educationLevel, educationRank } = require("../lib/text");

const ROOT = path.join(__dirname, "..");

function experienceLevel(years) {
  if (years <= 1) return "Entry Level";
  if (years <= 5) return "Mid Level";
  return "Senior Level";
}

const JOB_TYPES = [
  "Full-time",
  "Full-time",
  "Full-time",
  "Contract",
  "Part-time",
  "Internship",
];

function loadJobsRaw() {
  const raw = fs.readFileSync(path.join(ROOT, "job_listings.json"), "utf8");
  return JSON.parse(raw);
}

function loadCandidatesRaw() {
  const raw = fs.readFileSync(path.join(ROOT, "message.json"), "utf8");
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function locationText(loc) {
  if (!loc) return "";
  return [loc.town, loc.state, loc.country].filter(Boolean).join(", ");
}

function normaliseJob(raw, i) {
  const years = raw.requirements?.experienceYears ?? 0;
  const base = 60000 + years * 12000;
  return {
    id: `job_${String(i + 1).padStart(3, "0")}`,
    title: raw.title,
    company: raw.company,
    companyName: raw.company?.name || "Company",
    description: raw.description || "",
    requirements: {
      education: raw.requirements?.education || "No requirement",
      educationRank: educationRank(raw.requirements?.education),
      skills: raw.requirements?.skills || [],
      experienceYears: years,
    },
    workMode: Array.isArray(raw.workMode)
      ? raw.workMode
      : [raw.workMode].filter(Boolean),
    location: raw.location,
    locationText: locationText(raw.location),
    jobType: JOB_TYPES[i % JOB_TYPES.length],
    experienceLevel: experienceLevel(years),
    salaryMin: base,
    salaryMax: base + 30000,
    status: "open",
    employerId: null,
    createdAt: new Date(Date.now() - (i % 14) * 86400000).toISOString(),
  };
}

function normaliseCandidate(raw, i) {
  const topDegree =
    (raw.education && raw.education[0] && raw.education[0].degree) || "";
  const latest =
    (raw.workExperience && raw.workExperience[raw.workExperience.length - 1]) ||
    {};
  const initials = (raw.fullName || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return {
    id: `cand_${String(i + 1).padStart(3, "0")}`,
    userId: null,
    fullName: raw.fullName,
    initials,
    headline: latest.position || raw.major || "Candidate",
    contactInfo: raw.contactInfo || {},
    education: raw.education || [],
    educationLevel: educationLevel(topDegree),
    educationRank: educationRank(topDegree),
    major: raw.major || "",
    yearsOfExperience: raw.yearsOfExperience ?? 0,
    experienceLevel: experienceLevel(raw.yearsOfExperience ?? 0),
    workExperience: raw.workExperience || [],
    skills: raw.skills || [],
    preferredWorkingMode: raw.preferredWorkingMode || "",
    preferredLocation: raw.preferredLocation || "",
    resumeFile: null,
    status: raw.status || "active",
  };
}

function makeUser({
  email,
  password,
  role,
  membership,
  candidateId = null,
  companyName = null,
}) {
  return {
    id: `user_${crypto.randomBytes(5).toString("hex")}`,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    tokenSecret: crypto.randomBytes(24).toString("hex"),
    role,
    membership,
    candidateId,
    companyName,
    createdAt: new Date().toISOString(),
  };
}

function seed({ force = false } = {}) {
  const jobs = collection("jobs");
  const candidates = collection("candidates");
  const users = collection("users");
  const applications = collection("applications");

  if (
    !force &&
    jobs.count() > 0 &&
    candidates.count() > 0 &&
    users.count() > 0
  ) {
    return { skipped: true };
  }

  const jobDocs = loadJobsRaw().map(normaliseJob);
  const candDocs = loadCandidatesRaw().map(normaliseCandidate);

  const userDocs = [
    makeUser({
      email: "candidate@demo.com",
      password: "password123",
      role: "candidate",
      membership: "free",
      candidateId: candDocs[0].id,
    }),
    makeUser({
      email: "member@demo.com",
      password: "password123",
      role: "candidate",
      membership: "member",
      candidateId: candDocs[1].id,
    }),
    makeUser({
      email: "employer@demo.com",
      password: "password123",
      role: "employer",
      membership: "free",
      companyName: "TechNova Solutions",
    }),
    makeUser({
      email: "bigco@demo.com",
      password: "password123",
      role: "employer",
      membership: "member",
      companyName: "Insightful Analytics",
    }),
  ];
  candDocs[0].userId = userDocs[0].id;
  candDocs[1].userId = userDocs[1].id;

  const employerIds = [userDocs[2].id, userDocs[3].id];
  jobDocs.forEach((j, i) => {
    j.employerId = employerIds[i % employerIds.length];
  });

  jobs.replaceAll(jobDocs);
  candidates.replaceAll(candDocs);
  users.replaceAll(userDocs);
  applications.replaceAll([]);

  return {
    skipped: false,
    jobs: jobDocs.length,
    candidates: candDocs.length,
    users: userDocs.length,
  };
}

module.exports = { seed };

if (require.main === module) {
  const force = process.argv.includes("--force");
  const result = seed({ force });
  if (result.skipped) {
    console.log(
      "[seed] Store already populated — use --force to wipe and re-seed.",
    );
  } else {
    console.log(
      `[seed] Seeded ${result.jobs} jobs, ${result.candidates} candidates, ${result.users} demo users.`,
    );
    console.log('[seed] Demo logins (password "password123"):');
    console.log("       candidate@demo.com  (candidate, free)");
    console.log("       member@demo.com     (candidate, member)");
    console.log("       employer@demo.com   (employer, free)");
    console.log("       bigco@demo.com      (employer, member)");
  }
}
