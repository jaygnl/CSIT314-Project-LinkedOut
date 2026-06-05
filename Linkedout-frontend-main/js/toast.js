function showToast(msg, color) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.style.background = color || "#1f2937";
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}
