const { norm, educationRank } = require("./text");

function arrify(v) {
  if (v === undefined || v === null || v === "") return [];
  return Array.isArray(v) ? v : [v];
}

function anyMatch(haystackArr, needle) {
  const n = norm(needle);
  return haystackArr.some(
    (h) => norm(h) === n || norm(h).includes(n) || n.includes(norm(h)),
  );
}

// Every requested skill must be present in the item's skill list (loose match).
function hasAllSkills(itemSkills, wanted) {
  const have = (itemSkills || []).map(norm);
  return wanted.every((w) =>
    have.some((h) => h.includes(norm(w)) || norm(w).includes(h)),
  );
}

// Job search configuration
const jobConfig = {
  fields(job) {
    return [
      { text: job.description, weight: 3.0 },
      { text: job.title, weight: 2.0 },
      { text: (job.requirements?.skills || []).join(" "), weight: 1.5 },
      { text: job.companyName, weight: 0.8 },
      { text: job.locationText, weight: 0.5 },
    ];
  },
  keywordText(job) {
    return norm(job.description);
  },
  blob(job) {
    return norm(
      [
        job.title,
        job.companyName,
        job.description,
        (job.requirements?.skills || []).join(" "),
        job.requirements?.education,
        job.locationText,
        (job.workMode || []).join(" "),
        job.jobType,
        job.experienceLevel,
      ].join(" "),
    );
  },
  matchFilters(job, f = {}) {
    if (f.location && !norm(job.locationText).includes(norm(f.location)))
      return false;

    const modes = arrify(f.workMode);
    if (
      modes.length &&
      !modes.some((m) =>
        (job.workMode || []).some((wm) => norm(wm) === norm(m)),
      )
    )
      return false;

    const types = arrify(f.jobType);
    if (types.length && !types.some((t) => norm(t) === norm(job.jobType)))
      return false;

    const levels = arrify(f.experienceLevel);
    if (
      levels.length &&
      !levels.some((l) => norm(l) === norm(job.experienceLevel))
    )
      return false;

    const years = job.requirements?.experienceYears ?? 0;
    if (f.expMin !== undefined && years < Number(f.expMin)) return false;
    if (f.expMax !== undefined && years > Number(f.expMax)) return false;

    if (f.education) {
      // Show jobs with the selected education level qualification.
      if ((job.requirements?.educationRank ?? 0) > educationRank(f.education))
        return false;
    }

    const skills = arrify(f.skills);
    if (skills.length && !hasAllSkills(job.requirements?.skills, skills))
      return false;

    if (
      f.salaryMin !== undefined &&
      (job.salaryMax ?? Infinity) < Number(f.salaryMin)
    )
      return false;
    if (f.salaryMax !== undefined && (job.salaryMin ?? 0) > Number(f.salaryMax))
      return false;

    return true;
  },
};

// Candidate search configuration
const candidateConfig = {
  // Keyword search considers the candidate's whole profile.
  fields(c) {
    const positions = (c.workExperience || [])
      .map((w) => `${w.position} ${w.responsibilities}`)
      .join(" ");
    return [
      { text: (c.skills || []).join(" "), weight: 2.5 },
      { text: positions, weight: 2.0 },
      { text: c.headline, weight: 1.8 },
      { text: c.major, weight: 1.5 },
      { text: c.fullName, weight: 1.0 },
      { text: c.preferredLocation, weight: 0.5 },
      { text: c.educationLevel, weight: 0.5 },
    ];
  },
  keywordText(c) {
    return candidateConfig.blob(c);
  },
  blob(c) {
    const positions = (c.workExperience || [])
      .map((w) => `${w.position} ${w.company} ${w.responsibilities}`)
      .join(" ");
    const edu = (c.education || [])
      .map((e) => `${e.degree} ${e.institution}`)
      .join(" ");
    return norm(
      [
        c.fullName,
        c.headline,
        c.major,
        (c.skills || []).join(" "),
        positions,
        edu,
        c.educationLevel,
        c.preferredLocation,
        c.preferredWorkingMode,
      ].join(" "),
    );
  },
  matchFilters(c, f = {}) {
    if (f.location && !norm(c.preferredLocation).includes(norm(f.location)))
      return false;

    const modes = arrify(f.workMode);
    if (
      modes.length &&
      !modes.some((m) => norm(m) === norm(c.preferredWorkingMode))
    )
      return false;

    const levels = arrify(f.experienceLevel);
    if (
      levels.length &&
      !levels.some((l) => norm(l) === norm(c.experienceLevel))
    )
      return false;

    const years = c.yearsOfExperience ?? 0;
    if (f.expMin !== undefined && years < Number(f.expMin)) return false;
    if (f.expMax !== undefined && years > Number(f.expMax)) return false;

    if (f.major && !norm(c.major).includes(norm(f.major))) return false;

    if (f.education) {
      // Candidate must have at least the selected education qualification.
      if ((c.educationRank ?? 0) < educationRank(f.education)) return false;
    }

    const skills = arrify(f.skills);
    if (skills.length && !hasAllSkills(c.skills, skills)) return false;

    return true;
  },
};

module.exports = { jobConfig, candidateConfig, arrify };
