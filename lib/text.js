function norm(s) {
  return (s == null ? "" : String(s)).toLowerCase().trim();
}

function tokenise(s) {
  return norm(s)
    .split(/[^a-z0-9+#.]+/i)
    .filter((x) => x.length > 1);
}

// Levenshtein edit distance.
function lev(a, b) {
  const m = a.length,
    n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function wordSim(a, b) {
  const ml = Math.max(a.length, b.length);
  return ml === 0 ? 1 : 1 - lev(a, b) / ml;
}

const SYNONYMS = {
  programmer: [
    "javascript",
    "python",
    "java",
    "react",
    "node",
    "developer",
    "engineer",
    "software",
  ],
  coder: ["javascript", "python", "java", "react", "developer", "software"],
  dev: ["developer", "engineer", "software"],
  developer: ["engineer", "programmer", "software"],
  engineer: ["developer", "software"],
  frontend: [
    "react",
    "vue",
    "angular",
    "css",
    "typescript",
    "javascript",
    "ui",
  ],
  backend: ["node", "java", "python", "spring", "api", "postgresql", "mongodb"],
  fullstack: ["react", "node", "javascript", "mongodb", "full stack"],
  ml: ["machine learning", "tensorflow", "pytorch", "nlp", "deep learning"],
  ai: [
    "tensorflow",
    "pytorch",
    "nlp",
    "deep learning",
    "computer vision",
    "artificial intelligence",
  ],
  devops: ["docker", "kubernetes", "aws", "azure"],
  security: [
    "penetration testing",
    "cissp",
    "siem",
    "network security",
    "firewall",
    "cybersecurity",
  ],
  mobile: ["swift", "kotlin", "react native", "android", "ios"],
  database: ["sql", "oracle", "mysql", "mongodb", "postgresql", "dba"],
  cloud: ["aws", "azure", "docker", "kubernetes", "gcp"],
  designer: ["ux", "ui", "figma", "sketch", "design"],
};

const EDUCATION_RANK = [
  { rank: 5, keys: ["phd", "doctor", "doctorate"] },
  { rank: 4, keys: ["master", "msc", "mba"] },
  { rank: 3, keys: ["bachelor", "bsc", "undergrad", "degree"] },
  { rank: 2, keys: ["associate", "diploma"] },
  { rank: 1, keys: ["high school", "secondary"] },
  { rank: 0, keys: ["no requirement", "none", "any"] },
];

function educationRank(text) {
  const t = norm(text);
  if (!t) return 0;
  for (const { rank, keys } of EDUCATION_RANK) {
    if (keys.some((k) => t.includes(k))) return rank;
  }
  return 0;
}

function educationLevel(text) {
  const r = educationRank(text);
  return {
    5: "PhD",
    4: "Master's Degree",
    3: "Bachelor's Degree",
    2: "Associate Degree",
    1: "High School",
    0: "No requirement",
  }[r];
}

module.exports = {
  norm,
  tokenise,
  lev,
  wordSim,
  SYNONYMS,
  educationRank,
  educationLevel,
};
