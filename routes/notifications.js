const express = require("express");
const router = express.Router();

const { collection } = require("../db/store");
const { authRequired } = require("../lib/auth");
const { scoreMatch } = require("../lib/recommend");

const users = () => collection("users");
const jobs = () => collection("jobs");
const candidates = () => collection("candidates");
const applications = () => collection("applications");

const NEW_JOB_MATCH_THRESHOLD = 35; // only suggest reasonably-matching new jobs
const MAX_NOTIFS = 25;

function seenAtOf(user) {
  return (
    user.notificationsSeenAt || user.createdAt || "1970-01-01T00:00:00.000Z"
  );
}

router.get("/", authRequired, (req, res) => {
  const me = req.user;
  const seen = seenAtOf(me);
  let notifs = [];

  if (me.role === "candidate") {
    const apps = applications().find(
      (a) =>
        a.candidateId === me.candidateId &&
        (a.status === "accepted" || a.status === "rejected"),
    );
    for (const a of apps) {
      const job = jobs().findById(a.jobId);
      const at = a.statusUpdatedAt || a.createdAt;
      notifs.push({
        id: "app_" + a.id,
        type: "application",
        icon: a.status === "accepted" ? "✅" : "❌",
        title:
          a.status === "accepted"
            ? "Application accepted"
            : "Application update",
        body:
          (job ? job.title : "A job") +
          (a.status === "accepted"
            ? " — the employer accepted your application 🎉"
            : " — you were not selected this time"),
        at,
        unread: at > seen,
        link: "applications.html",
      });
    }

    const profile = candidates().findById(me.candidateId);
    if (profile) {
      const fresh = jobs()
        .find((j) => j.status !== "draft" && j.createdAt > me.createdAt)
        .map((j) => ({ j, score: scoreMatch(profile, j).score }))
        .filter((x) => x.score >= NEW_JOB_MATCH_THRESHOLD)
        .sort((a, b) => new Date(b.j.createdAt) - new Date(a.j.createdAt))
        .slice(0, 10);
      for (const { j, score } of fresh) {
        notifs.push({
          id: "job_" + j.id,
          type: "job",
          icon: "✨",
          title: "New job matches you",
          body: `${j.title} at ${j.companyName} · ${score}% match`,
          at: j.createdAt,
          unread: j.createdAt > seen,
          link: `job-details.html?id=${j.id}`,
        });
      }
    }
  } else if (me.role === "employer") {
    const myJobIds = new Set(
      jobs()
        .find((j) => j.employerId === me.id)
        .map((j) => j.id),
    );
    const apps = applications().find((a) => myJobIds.has(a.jobId));
    for (const a of apps) {
      const job = jobs().findById(a.jobId);
      const cand = candidates().findById(a.candidateId);
      notifs.push({
        id: "applicant_" + a.id,
        type: "applicant",
        icon: "🧑",
        title: "New applicant",
        body: `${cand ? cand.fullName : "Someone"} applied to ${job ? job.title : "your posting"}`,
        at: a.createdAt,
        unread: a.createdAt > seen,
        link: "employer-dashboard.html",
      });
    }
  }

  notifs.sort((a, b) => new Date(b.at) - new Date(a.at));
  notifs = notifs.slice(0, MAX_NOTIFS);

  res.json({
    unreadCount: notifs.filter((n) => n.unread).length,
    count: notifs.length,
    notifications: notifs,
  });
});

router.post("/seen", authRequired, (req, res) => {
  const updated = users().update(req.user.id, {
    notificationsSeenAt: new Date().toISOString(),
  });
  res.json({ ok: true, notificationsSeenAt: updated.notificationsSeenAt });
});

module.exports = router;
