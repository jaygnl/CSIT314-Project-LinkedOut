const crypto = require("crypto");
const { collection } = require("../db/store");

// Password hashing
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(test, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Token system
function sign(userId, userSecret) {
  const hmac = crypto
    .createHmac("sha256", userSecret)
    .update(userId)
    .digest("hex");
  return Buffer.from(`${userId}.${hmac}`).toString("base64url");
}

function makeToken(user) {
  return sign(user.id, user.tokenSecret);
}

function parseToken(token) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userId, hmac] = decoded.split(".");
    if (!userId || !hmac) return null;
    const user = collection("users").findById(userId);
    if (!user) return null;
    const expected = crypto
      .createHmac("sha256", user.tokenSecret)
      .update(userId)
      .digest("hex");
    if (expected !== hmac) return null;
    return user;
  } catch {
    return null;
  }
}

// Strip sensitive fields before sending a user object to the client.
function publicUser(user) {
  if (!user) return null;
  const { passwordHash, tokenSecret, ...rest } = user;
  return rest;
}

// Express middleware
function authOptional(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : req.query.token || "";
  req.user = token ? parseToken(token) : null;
  next();
}

function authRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user)
      return res.status(401).json({ error: "Authentication required." });
    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ error: "Authentication required." });
    if (req.user.role !== role)
      return res
        .status(403)
        .json({ error: `This action requires a ${role} account.` });
    next();
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  makeToken,
  parseToken,
  publicUser,
  authOptional,
  authRequired,
  requireRole,
};
