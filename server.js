const path = require("path");
const express = require("express");

const { collection } = require("./db/store");
const { seed } = require("./db/seed");
const { authOptional } = require("./lib/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(authOptional); // attaches req.user when a valid token is present

// API routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/jobs", require("./routes/jobs"));
app.use("/api/candidates", require("./routes/candidates"));
app.use("/api/applications", require("./routes/applications"));
app.use("/api/notifications", require("./routes/notifications"));

app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    jobs: collection("jobs").count(),
    candidates: collection("candidates").count(),
    users: collection("users").count(),
  }),
);

// Static frontend
const FRONTEND_DIR = path.join(__dirname, "Linkedout-frontend-main");
app.use(express.static(FRONTEND_DIR));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (_req, res) => res.redirect("/login.html"));

function start() {
  const result = seed();
  if (result.skipped) {
    console.log("[seed] Existing data found — store left as-is.");
  } else {
    console.log(
      `[seed] Seeded ${result.jobs} jobs, ${result.candidates} candidates, ${result.users} demo accounts.`,
    );
  }

  const server = app.listen(PORT, () => {
    console.log(`[server] LinkedOut running on http://localhost:${PORT}`);
    console.log('[server] Demo logins (password "password123"):');
    console.log(
      "         candidate@demo.com (free) · member@demo.com (member)",
    );
    console.log(
      "         employer@demo.com  (free) · bigco@demo.com  (member)",
    );
  });

  // case if the node server doesnt start (likely, the port is taken from a previous session)
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\n[server] Port ${PORT} is already in use — another instance is probably still running.`,
      );
      console.error(
        "[server] Either stop it, or start on a different port, e.g.:",
      );
      console.error(`[server]     PORT=3001 node server.js`);
      console.error(`[server] To find & stop the process on port ${PORT}:`);
      console.error(`[server]     lsof -ti tcp:${PORT} | xargs kill -9\n`);
    } else {
      console.error("[server] Failed to start:", err.message);
    }
    process.exit(1);
  });
}

start();
