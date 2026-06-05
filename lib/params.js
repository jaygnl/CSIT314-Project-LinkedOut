function num(v) {
  return v === undefined || v === "" ? undefined : Number(v);
}
function list(v) {
  if (v === undefined || v === "") return undefined;
  return Array.isArray(v)
    ? v
    : String(v)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

function parseSearchParams(query = {}) {
  const filters = {
    location: query.location || undefined,
    workMode: list(query.workMode),
    jobType: list(query.jobType),
    experienceLevel: list(query.experienceLevel),
    expMin: num(query.expMin),
    expMax: num(query.expMax),
    education: query.education || undefined,
    major: query.major || undefined,
    skills: list(query.skills),
    salaryMin: num(query.salaryMin),
    salaryMax: num(query.salaryMax),
  };
  // Drop undefined keys for a clean object.
  Object.keys(filters).forEach(
    (k) => filters[k] === undefined && delete filters[k],
  );

  return {
    q: query.q || "",
    mode: query.mode || "keyword",
    filters,
  };
}

// Free users: Top 10. Members: unlimited.
function recommendationLimit(user) {
  return user && user.membership === "member" ? Infinity : 10;
}

module.exports = { parseSearchParams, recommendationLimit };
