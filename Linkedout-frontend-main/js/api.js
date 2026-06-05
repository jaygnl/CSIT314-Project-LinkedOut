const API = (() => {
  const TOKEN_KEY = "linkedOutToken";
  const USER_KEY = "linkedOutUser";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  function setSession(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  function updateUser(user) {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function request(method, path, body, isForm) {
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (isForm) {
      payload = body; // FormData
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(`/api${path}`, { method, headers, body: payload });
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* no body */
    }
    if (!res.ok) {
      const err = new Error(
        (data && data.error) || `Request failed (${res.status})`,
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  const get = (p) => request("GET", p);
  const post = (p, b) => request("POST", p, b);
  const put = (p, b) => request("PUT", p, b);
  const patch = (p, b) => request("PATCH", p, b);

  async function signup(payload) {
    const data = await post("/auth/signup", payload);
    setSession(data.token, data.user);
    return data;
  }
  async function login(payload) {
    const data = await post("/auth/login", payload);
    setSession(data.token, data.user);
    return data;
  }
  function logout() {
    clearSession();
    window.location.href = "login.html";
  }

  async function setMembership(membership) {
    const data = await post("/auth/membership", { membership });
    updateUser(data.user);
    return data.user;
  }

  function requireAuth(role) {
    const user = getUser();
    if (!getToken() || !user) {
      window.location.href = "login.html";
      return null;
    }
    if (role && user.role !== role) {
      window.location.href =
        user.role === "employer" ? "employer-dashboard.html" : "dashboard.html";
      return null;
    }
    return user;
  }

  function isMember() {
    const u = getUser();
    return u && u.membership === "member";
  }

  const jobs = {
    search: (params) => get(`/jobs?${new URLSearchParams(params)}`),
    one: (id) => get(`/jobs/${id}`),
    mine: () => get("/jobs/mine"),
    create: (body) => post("/jobs", body),
    update: (id, body) => patch(`/jobs/${id}`, body),
    apply: (id) => post(`/jobs/${id}/apply`),
    candidates: (id) => get(`/jobs/${id}/candidates`),
    applicants: (id) => get(`/jobs/${id}/applicants`),
  };
  const candidates = {
    search: (params) => get(`/candidates?${new URLSearchParams(params)}`),
    one: (id) => get(`/candidates/${id}`),
    me: () => get("/candidates/me"),
    save: (body) => put("/candidates/me", body),
    recommendations: () => get("/candidates/me/recommendations"),
    applications: () => get("/candidates/me/applications"),
    uploadResume: (file) => {
      const fd = new FormData();
      fd.append("resume", file);
      return request("POST", "/candidates/me/resume", fd, true);
    },
  };
  const applications = {
    setStatus: (id, status) => patch(`/applications/${id}`, { status }),
  };
  const notifications = {
    list: () => get("/notifications"),
    markSeen: () => post("/notifications/seen"),
  };

  return {
    getToken,
    getUser,
    setSession,
    updateUser,
    clearSession,
    get,
    post,
    put,
    patch,
    signup,
    login,
    logout,
    setMembership,
    requireAuth,
    isMember,
    jobs,
    candidates,
    applications,
    notifications,
  };
})();
