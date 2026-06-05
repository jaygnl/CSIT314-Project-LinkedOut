const { norm } = require("./text");

const WEIGHTS = {
  skills: 45,
  experience: 15,
  location: 15,
  workMode: 15,
  education: 10,
};

function looseSkillMatch(a, b) {
  const x = norm(a),
    y = norm(b);
  return x === y || x.includes(y) || y.includes(x);
}

function tokenSet(text) {
  return new Set(
    norm(text)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1),
  );
}

// Score how well a candidate fits a job, 0..100, with a breakdown.
function scoreMatch(candidate, job) {
  const req = job.requirements || {};
  const breakdown = {};

  // Skill requirement enforcement
  const required = req.skills || [];
  const have = candidate.skills || [];
  let skillsRatio;
  let matchedSkills = [];
  if (required.length === 0) {
    skillsRatio = 0.5; // case for no requirement
  } else {
    matchedSkills = required.filter((r) =>
      have.some((h) => looseSkillMatch(h, r)),
    );
    skillsRatio = matchedSkills.length / required.length;
  }
  breakdown.skills = skillsRatio * WEIGHTS.skills;

  // Experience
  const need = req.experienceYears ?? 0;
  const got = candidate.yearsOfExperience ?? 0;
  const expRatio = need <= 0 ? 1 : Math.min(1, got / need);
  breakdown.experience = expRatio * WEIGHTS.experience;

  // Location
  const candLoc = tokenSet(candidate.preferredLocation);
  const jobLoc = tokenSet(job.locationText);
  let locHit = false;
  for (const t of candLoc) {
    if (jobLoc.has(t)) {
      locHit = true;
      break;
    }
  }
  breakdown.location = locHit ? WEIGHTS.location : 0;

  // Work mode (in person? remote?)
  const modes = (job.workMode || []).map(norm);
  const wm = norm(candidate.preferredWorkingMode);
  breakdown.workMode = wm && modes.includes(wm) ? WEIGHTS.workMode : 0;

  // Education
  const candRank = candidate.educationRank ?? 0;
  const reqRank = req.educationRank ?? 0;
  breakdown.education =
    candRank >= reqRank
      ? WEIGHTS.education
      : reqRank === 0
        ? WEIGHTS.education
        : (candRank / reqRank) * WEIGHTS.education;

  const score = Object.values(breakdown).reduce((s, v) => s + v, 0);

  return {
    score: Math.round(score),
    matchedSkills,
    breakdown: Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, Math.round(v)]),
    ),
  };
}

function rankWithLimit(scored, limit) {
  scored.sort((a, b) => b.score - a.score);
  return Number.isFinite(limit) ? scored.slice(0, limit) : scored;
}

// Top jobs for a candidate. limit: 10 (free user) or infinite (member).
function recommendJobsForCandidate(candidate, jobs, limit = 10) {
  const scored = jobs
    .filter((j) => j.status !== "closed")
    .map((job) => {
      const m = scoreMatch(candidate, job);
      return {
        ...job,
        _match: m.score,
        _matchBreakdown: m.breakdown,
        _matchedSkills: m.matchedSkills,
      };
    });
  return rankWithLimit(scored, limit);
}

// Top candidates for a job. limit: 10 (free user) or infinite (member).
function recommendCandidatesForJob(job, candidates, limit = 10) {
  const scored = candidates.map((candidate) => {
    const m = scoreMatch(candidate, job);
    return {
      ...candidate,
      _match: m.score,
      _matchBreakdown: m.breakdown,
      _matchedSkills: m.matchedSkills,
    };
  });
  return rankWithLimit(scored, limit);
}

module.exports = {
  scoreMatch,
  recommendJobsForCandidate,
  recommendCandidatesForJob,
  WEIGHTS,
};
