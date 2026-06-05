const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const { collection } = require("../db/store");
const {
  hashPassword,
  verifyPassword,
  makeToken,
  publicUser,
  authRequired,
} = require("../lib/auth");

const users = () => collection("users");
const candidates = () => collection("candidates");

router.post("/signup", (req, res) => {
  const { email, password, role, companyName, fullName } = req.body || {};
  if (!email || !password || !role) {
    return res
      .status(400)
      .json({ error: "email, password and role are required." });
  }
  if (!["candidate", "employer"].includes(role)) {
    return res
      .status(400)
      .json({ error: 'role must be "candidate" or "employer".' });
  }
  if (String(password).length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters." });
  }
  const existing = users().findOne(
    (u) => u.email === String(email).toLowerCase(),
  );
  if (existing)
    return res
      .status(409)
      .json({ error: "An account with that email already exists." });

  const user = {
    id: `user_${crypto.randomBytes(5).toString("hex")}`,
    email: String(email).toLowerCase(),
    passwordHash: hashPassword(password),
    tokenSecret: crypto.randomBytes(24).toString("hex"),
    role,
    membership: "free",
    candidateId: null,
    companyName: role === "employer" ? companyName || "" : null,
    createdAt: new Date().toISOString(),
  };

  if (role === "candidate") {
    const profile = candidates().insert({
      userId: user.id,
      fullName: fullName || "",
      initials: (fullName || "?")
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      headline: "",
      contactInfo: { email: user.email, phone: "", address: "" },
      education: [],
      educationLevel: "",
      educationRank: 0,
      major: "",
      yearsOfExperience: 0,
      experienceLevel: "Entry Level",
      workExperience: [],
      skills: [],
      preferredWorkingMode: "",
      preferredLocation: "",
      resumeFile: null,
      status: "active",
      profileComplete: false,
    });
    user.candidateId = profile.id;
  }

  users().insert(user);
  return res
    .status(201)
    .json({ token: makeToken(user), user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = users().findOne(
    (u) => u.email === String(email || "").toLowerCase(),
  );
  if (!user || !verifyPassword(password || "", user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  return res.json({ token: makeToken(user), user: publicUser(user) });
});

router.get("/me", authRequired, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post("/membership", authRequired, (req, res) => {
  const { membership } = req.body || {};
  if (!["free", "member"].includes(membership)) {
    return res
      .status(400)
      .json({ error: 'membership must be "free" or "member".' });
  }
  const updated = users().update(req.user.id, { membership });
  res.json({ user: publicUser(updated) });
});

module.exports = router;
