(function () {
  const saved = localStorage.getItem("linkedOutTheme") || "light";
  document.body.classList.remove("light", "dark");
  document.body.classList.add(saved);

  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    btn.textContent = saved === "dark" ? "☀️" : "🌙";
    btn.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark");
      document.body.classList.toggle("light", !isDark);
      const newTheme = isDark ? "dark" : "light";
      localStorage.setItem("linkedOutTheme", newTheme);
      btn.textContent = isDark ? "☀️" : "🌙";
    });
  }
})();
