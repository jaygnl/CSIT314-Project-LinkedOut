const express = require("express");
const router = express.Router();

const { collection } = require("../db/store");
const { authRequired, requireRole } = require("../lib/auth");

const applications = () => collection("applications");
const jobs = () => collection("jobs");

router.patch("/:id", authRequired, requireRole("employer"), (req, res) => {
  const app = applications().findById(req.params.id);
  if (!app) return res.status(404).json({ error: "Application not found." });

  const job = jobs().findById(app.jobId);
  if (job && job.employerId && job.employerId !== req.user.id) {
    return res.status(403).json({ error: "Not your posting." });
  }
  const { status } = req.body || {};
  if (!["accepted", "rejected", "pending"].includes(status)) {
    return res
      .status(400)
      .json({ error: "status must be accepted, rejected or pending." });
  }
  res.json({
    application: applications().update(app.id, {
      status,
      statusUpdatedAt: new Date().toISOString(),
    }),
  });
});

module.exports = router;
