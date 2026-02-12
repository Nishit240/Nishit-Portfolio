document.addEventListener("DOMContentLoaded", () => {
  const intro = document.getElementById("intro-screen");
  const startBtn = document.getElementById("start-btn");

  document.body.classList.add("intro-active");

  startBtn.addEventListener("click", () => {
    intro.classList.add("hide");

    setTimeout(() => {
      intro.style.display = "none";
      document.body.classList.remove("intro-active");
    }, 1000);
  });
});
