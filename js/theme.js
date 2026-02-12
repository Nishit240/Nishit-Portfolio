const toggleBtn = document.getElementById("themeToggle");

// ================= LOAD THEME =================

// If user has saved preference → use it
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "light") {
  document.body.classList.add("light");
} else {
  // Default = DARK
  document.body.classList.remove("light");
}

// ================= TOGGLE BUTTON =================

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("light");

  const theme = document.body.classList.contains("light")
    ? "light"
    : "dark";

  localStorage.setItem("theme", theme);
});
