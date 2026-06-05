const { norm, tokenise, wordSim, SYNONYMS } = require("./text");

const FUZZY_THRESHOLD = 0.6;

function keywordSearch(items, query, config) {
  const terms = tokenise(query);
  if (!terms.length)
    return items.map((it) => ({ item: it, score: 0, matchType: "all" }));

  const out = [];
  for (const item of items) {
    const fields = config.fields(item);
    let score = 0;
    let allMatch = true;
    for (const term of terms) {
      let found = false;
      for (const { text, weight } of fields) {
        if (norm(text).includes(term)) {
          score += weight;
          found = true;
        }
      }
      if (!found) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) out.push({ item, score, matchType: "keyword" });
  }
  return out.sort((a, b) => b.score - a.score);
}

function filterSearch(items, filters, config) {
  return items
    .filter((it) => config.matchFilters(it, filters))
    .map((it) => ({ item: it, score: 0, matchType: "filter" }));
}

function combinedSearch(items, query, filters, config) {
  const filtered = items.filter((it) => config.matchFilters(it, filters));
  if (!norm(query))
    return filtered.map((it) => ({ item: it, score: 0, matchType: "filter" }));
  return keywordSearch(filtered, query, config);
}

function fuzzySearch(items, query, config) {
  const q = norm(query);
  if (!q) return items.map((it) => ({ item: it, score: 0, matchType: "all" }));

  const qTerms = q.split(/\s+/).filter(Boolean);
  const out = [];

  for (const item of items) {
    const b = config.blob(item);
    const bWords = b.split(/[^a-z0-9+#.]+/i).filter(Boolean);

    if (b.includes(q)) {
      out.push({ item, score: 1.0, matchType: "exact" });
      continue;
    }

    let synHit = false;
    for (const [syn, aliases] of Object.entries(SYNONYMS)) {
      if (
        (q.includes(syn) || syn.includes(q)) &&
        aliases.some((a) => b.includes(a))
      ) {
        out.push({ item, score: 0.92, matchType: "synonym" });
        synHit = true;
        break;
      }
    }
    if (synHit) continue;

    const sims = qTerms.map((t) =>
      bWords.reduce((m, w) => Math.max(m, wordSim(t, w)), 0),
    );
    const avg = sims.reduce((s, v) => s + v, 0) / sims.length;
    if (avg >= FUZZY_THRESHOLD)
      out.push({ item, score: avg, matchType: "fuzzy" });
  }
  return out.sort((a, b) => b.score - a.score);
}

function search(
  items,
  { q = "", mode = "keyword", filters = {} } = {},
  config,
) {
  const hasFilters =
    filters &&
    Object.values(filters).some(
      (v) =>
        v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
    );

  switch (mode) {
    case "filter":
      return filterSearch(items, filters, config);
    case "combined":
      return combinedSearch(items, q, filters, config);
    case "fuzzy":
      return fuzzySearch(items, q, config);
    case "keyword":
    default:
      if (hasFilters) return combinedSearch(items, q, filters, config);
      return keywordSearch(items, q, config);
  }
}

module.exports = {
  search,
  keywordSearch,
  filterSearch,
  combinedSearch,
  fuzzySearch,
};
