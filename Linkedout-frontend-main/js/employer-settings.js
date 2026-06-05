const saveSettingsBtn = document.getElementById("btnSaveSettings");
if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener("click", () => {
    showToast("Settings saved ✓", "#1e5c3a");
    console.log("Settings saved");
  });
}

const cancelSettingsBtn = document.getElementById("btnCancelSettings");
if (cancelSettingsBtn) {
  cancelSettingsBtn.addEventListener("click", () => {
    if (confirm("Discard unsaved changes?")) {
      document.querySelectorAll(".form-control").forEach((el) => {
        el.value = "";
      });
      showToast("Changes discarded", "#374151");
    }
  });
}

const logoInput = document.getElementById("logoFileInput");
const logoUploadArea = document.getElementById("logoUploadArea");
if (logoInput && logoUploadArea) {
  logoInput.addEventListener("change", function () {
    if (this.files[0]) {
      logoUploadArea.innerHTML = `<span class="upload-icon">✅</span><span>${this.files[0].name} uploaded</span>`;
      showToast("Logo uploaded ✓", "#1e5c3a");
    }
  });
}

const deleteAccountBtn = document.getElementById("btnDeleteAccount");
if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener("click", () => {
    if (confirm("Are you sure? This cannot be undone.")) {
      showToast("Account deletion initiated. Check your email.", "#c0392b");
    }
  });
}

const logoutBtn = document.getElementById("sidebarLogoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Log out?")) {
      showToast("Logging out...", "#374151");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);
    }
  });
}
