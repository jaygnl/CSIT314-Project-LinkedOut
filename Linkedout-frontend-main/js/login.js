const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const passwordToggleBtn = document.getElementById("passwordToggleBtn");
const roleApplicantBtn = document.getElementById("roleApplicantBtn");
const roleEmployerBtn = document.getElementById("roleEmployerBtn");
const fullNameGroup = document.getElementById("fullNameGroup");
const companyNameGroup = document.getElementById("companyNameGroup");
const fullNameInput = document.getElementById("fullNameInput");
const companyNameInput = document.getElementById("companyNameInput");
const createAccountLink = document.getElementById("createAccountLink");
const backToLoginLink = document.getElementById("backToLoginLink");
const signupPrompt = document.getElementById("signupPrompt");
const loginPrompt = document.getElementById("loginPrompt");
const loginHeading = document.getElementById("loginHeading");
const signInBtn = document.getElementById("signInBtn");
const authError = document.getElementById("authError");

let selectedRole = "candidate";
let mode = "login";

(function redirectIfAuthed() {
  const user = API.getUser();
  if (API.getToken() && user) {
    window.location.href =
      user.role === "employer" ? "employer-dashboard.html" : "dashboard.html";
  }
})();

function syncRoleFields() {
  companyNameGroup.style.display =
    mode === "signup" && selectedRole === "employer" ? "block" : "none";
  fullNameGroup.style.display =
    mode === "signup" && selectedRole === "candidate" ? "block" : "none";
}

function setMode(next) {
  mode = next;
  const signup = mode === "signup";
  loginHeading.textContent = signup ? "Create your account" : "Sign in";
  signInBtn.textContent = signup ? "Create account →" : "Sign in →";
  signupPrompt.style.display = signup ? "none" : "inline";
  loginPrompt.style.display = signup ? "inline" : "none";
  if (authError) authError.style.display = "none";
  syncRoleFields();
}

function showError(msg) {
  if (!authError) return;
  authError.textContent = msg;
  authError.style.display = "block";
}

roleApplicantBtn.addEventListener("click", () => {
  selectedRole = "candidate";
  roleApplicantBtn.classList.add("active");
  roleEmployerBtn.classList.remove("active");
  syncRoleFields();
});
roleEmployerBtn.addEventListener("click", () => {
  selectedRole = "employer";
  roleEmployerBtn.classList.add("active");
  roleApplicantBtn.classList.remove("active");
  syncRoleFields();
});

createAccountLink &&
  createAccountLink.addEventListener("click", (e) => {
    e.preventDefault();
    setMode("signup");
  });
backToLoginLink &&
  backToLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    setMode("login");
  });

if (passwordToggleBtn) {
  passwordToggleBtn.addEventListener("click", () => {
    const hidden = passwordInput.type === "password";
    passwordInput.type = hidden ? "text" : "password";
    passwordToggleBtn.textContent = hidden ? "🙈" : "👁️";
  });
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (authError) authError.style.display = "none";
  signInBtn.disabled = true;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    let data;
    if (mode === "signup") {
      data = await API.signup({
        email,
        password,
        role: selectedRole,
        fullName: fullNameInput.value.trim(),
        companyName: companyNameInput.value.trim(),
      });
    } else {
      data = await API.login({ email, password });
    }
    showToast("Welcome ✓", "#1e5c3a");
    const dest =
      data.user.role === "employer"
        ? "employer-dashboard.html"
        : "dashboard.html";
    setTimeout(() => {
      window.location.href = dest;
    }, 350);
  } catch (err) {
    showError(err.message || "Something went wrong.");
    signInBtn.disabled = false;
  }
});

setMode("login");
