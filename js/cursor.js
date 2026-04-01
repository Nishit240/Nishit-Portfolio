const cursorDot = document.createElement("div");
const cursorOutline = document.createElement("div");

cursorDot.classList.add("cursor-dot");
cursorOutline.classList.add("cursor-outline");

document.body.appendChild(cursorDot);
document.body.appendChild(cursorOutline);

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let outlineX = mouseX;
let outlineY = mouseY;

const outlineDelay = 0.2; 

// Initial render to prevent it from getting stuck in the top left
cursorDot.style.left = mouseX + "px";
cursorDot.style.top = mouseY + "px";
cursorOutline.style.left = outlineX + "px";
cursorOutline.style.top = outlineY + "px";

window.addEventListener("mousemove", function (e) {
  mouseX = e.clientX;
  mouseY = e.clientY;

  // Move dot immediately
  cursorDot.style.left = mouseX + "px";
  cursorDot.style.top = mouseY + "px";
});

function animateCursor() {
  outlineX += (mouseX - outlineX) * outlineDelay;
  outlineY += (mouseY - outlineY) * outlineDelay;

  cursorOutline.style.left = outlineX + "px";
  cursorOutline.style.top = outlineY + "px";

  requestAnimationFrame(animateCursor);
}
animateCursor();

// Event delegation for interactable hover
document.addEventListener("mouseover", (e) => {
  const isInteractive = e.target.closest("a, button, .project-card, .Hobbie-icon, .service-card, .btn, input, textarea, .start-btn, .menu-icon");
  if (isInteractive) {
    cursorOutline.classList.add("hover-grow");
  }
});

document.addEventListener("mouseout", (e) => {
  const isInteractive = e.target.closest("a, button, .project-card, .Hobbie-icon, .service-card, .btn, input, textarea, .start-btn, .menu-icon");
  if (isInteractive) {
    cursorOutline.classList.remove("hover-grow");
  }
});
