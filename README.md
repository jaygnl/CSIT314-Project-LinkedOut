# LinkedOut - CSIT314 · UOW Autumn 2026

## Quick start

```bash
npm install
node server.js          # http://localhost:3000  (redirects to the login page)
```

### Demo logins (password = `password123`)

| Email | Role | Membership |
|-------|------|------------|
| `candidate@demo.com` | Candidate | Free (Top-10) |
| `member@demo.com`    | Candidate | Member (unlimited) |
| `employer@demo.com`  | Employer  | Free (Top-10) |
| `bigco@demo.com`     | Employer  | Member (unlimited) |

You can also **Create Accounts** from the login page (candidate or employer).

---

## How the requirements are met

### Candidate workflow
- **Create a profile** (resume upload *or* form) — `profile.html`. Captures full name,
  contact info, education, major, years of experience, work experience, skills,
  preferred working mode and preferred location. → `PUT /api/candidates/me`,
  resume via `POST /api/candidates/me/resume`.
- **Homepage shows all job postings** (relevant or not) — `dashboard.html`, "All Jobs" tab.
- **Keyword search from the job description** — `GET /api/jobs?q=...&mode=keyword`
  (description is the primary weighted field). 
- **Top-K (K=10) job recommendations** — `GET /api/candidates/me/recommendations`,
  "Recommended" tab, ranked by the match engine.

### Employer workflow
- **Create a job posting (JD)** — `create-job-posting.html`: job title, company info,
  description, required education, required skills, years of experience, work mode,
  location. → `POST /api/jobs`.
- **My Job Postings** — `employer-dashboard.html`: a clean overview of the employer's
  own roles (status, applicant counts). → `GET /api/jobs/mine`.
- **Job posting detail** — `employer-job-detail.html?id=`: the full JD as a seeker sees
  it, with inline **edit** (`PATCH /api/jobs/:id`), the **applicants** (accept/reject via
  `PATCH /api/applications/:id`), and **other candidates to shortlist** (Top-N).
- **Candidates** — `employer-candidates.html`: browse the whole talent pool with
  **filter + search** (skill, education, experience, work mode, keyword, fuzzy) —
  `GET /api/candidates?...`.
- **Top-N (N=10) candidate recommendations** per posting (on the job detail page) —
  `GET /api/jobs/:id/candidates`.

### Membership feature
- Free users: capped at the top 10 recommendations (jobs for candidates, candidates for employers).
- Members: **unlimited**.
- Toggle in-app via the dashboard "Upgrade to Member" banner → `POST /api/auth/membership`.
- Limit logic: `lib/params.js` → `recommendationLimit(user)`.

### Searching function (across all candidate & company profiles)
Implemented generically in `lib/search.js` for both collections:
- **Keyword** — one or more terms, all must match (weighted fields).
- **Filter** — predefined conditions: location, work mode, job type, salary range,
  experience, education, skills.
- **Keyword + filter (combined)** — both together for precision.
- **Fuzzy** — typo tolerance (Levenshtein) + synonym expansion, e.g. `sofware enginer`,
  `programmer`, `coder` all match *software engineer*.

---

## Recommendation engine (`lib/recommend.js`)

A single symmetric 0–100 score drives both directions, weighting:

| Signal | Weight |
|--------|--------|
| Skills overlap (required vs candidate) | 45 |
| Experience (years vs required) | 15 |
| Location (preferred vs job location) | 15 |
| Work mode match | 15 |
| Education level | 10 |

Candidates are ranked for a job and jobs for a candidate; the membership tier
decides whether the list is truncated to 10 or returned in full.

---


## API reference (`Linkedout-frontend-main/js/api.js`)


| Method & path | Purpose |
|---------------|---------|
| `POST /api/auth/signup` | Sign up (returns token + user; session saved) |
| `POST /api/auth/login` | Log in (returns token + user; session saved) |
| `POST /api/auth/membership` | Set membership tier for current user |
| `GET /api/auth/me` | Get current authenticated user |
| `GET /api/jobs?q=&mode=&...filters` | Browse / search / filter jobs |
| `GET /api/jobs/mine` | Get jobs posted by the authenticated employer |
| `GET /api/jobs/:id` | Get a single job posting |
| `POST /api/jobs` | Create a job posting |
| `PATCH /api/jobs/:id` | Update a job posting |
| `POST /api/jobs/:id/apply` | Apply to a job (candidate) |
| `GET /api/jobs/:id/candidates` | Top-N matched candidates for a posting |
| `GET /api/jobs/:id/applicants` | List applicants for a posting |
| `GET /api/candidates?q=&mode=&...filters` | Browse / search / filter candidates |
| `GET /api/candidates/:id` | Get a single candidate profile |
| `GET /api/candidates/me` | Get own candidate profile |
| `PUT /api/candidates/me` | Update own candidate profile |
| `POST /api/candidates/me/resume` | Upload resume (multipart/form-data) |
| `GET /api/candidates/me/recommendations` | Top-K recommended jobs for current candidate |
| `GET /api/candidates/me/applications` | List current candidate's applications |
| `PATCH /api/applications/:id` | Accept / reject an application |
| `GET /api/notifications` | List notifications for current user |
| `POST /api/notifications/seen` | Mark all notifications as seen |
