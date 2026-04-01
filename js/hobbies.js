const cards = document.querySelectorAll(".stack-card");
const stackContainer = document.querySelector(".scroll-stack");
const endSpacer = document.querySelector(".stack-end");

const STACK_OFFSET = 60;   // how much previous cards remain visible
const STACK_TOP = 180;     // where stack pins below heading

function updateStack() {

  const scrollY = window.scrollY;
  const containerTop = stackContainer?.offsetTop || 0;
  const containerHeight = stackContainer?.offsetHeight || 0;
  const viewportHeight = window.innerHeight;

  if (!stackContainer) return; // guard against missing elements

  cards.forEach((card, index) => {

    const cardStart = containerTop + index * 100;
    const pinStart = cardStart - STACK_TOP;
    const pinEnd = containerTop + containerHeight - viewportHeight;

    let translateY = 0;

    if (scrollY >= pinStart && scrollY <= pinEnd) {
      translateY = scrollY - cardStart + STACK_TOP + index * STACK_OFFSET;
    }

    if (scrollY > pinEnd) {
      translateY = pinEnd - cardStart + STACK_TOP + index * STACK_OFFSET;
    }

    card.style.transform = `translateY(${translateY}px)`;
    card.style.zIndex = index + 1;
  });
}

window.addEventListener("scroll", updateStack);
// Add a small delay to ensure elements are rendered 
setTimeout(updateStack, 100);
