const menuIcon = document.querySelector('.menu-icon');
const navLinks = document.querySelector('.nav-links');
const navLinksAll = document.querySelectorAll('.nav-links a');

/* ================= MOBILE MENU TOGGLE ================= */
menuIcon.addEventListener('click', (e) => {
  e.stopPropagation(); // prevent document click
  navLinks.classList.toggle('active');
});

/* ================= CLOSE MENU ON LINK CLICK ================= */
navLinksAll.forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
  });
});

/* ================= CLOSE MENU ON OUTSIDE CLICK ================= */
document.addEventListener('click', (e) => {
  const clickedInsideMenu =
    navLinks.contains(e.target) || menuIcon.contains(e.target);

  if (!clickedInsideMenu) {
    navLinks.classList.remove('active');
  }
});

/* ================= ACTIVE NAV ON SCROLL (INDEX PAGE) ================= */
const sections = document.querySelectorAll("section[id]");

const observerOptions = {
  root: null,
  rootMargin: "0px",
  threshold: 0.55,
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const currentId = entry.target.getAttribute("id");

      navLinksAll.forEach(link => {
        link.classList.remove("active");

        if (link.getAttribute("href") === `#${currentId}`) {
          link.classList.add("active");
        }
      });
    }
  });
}, observerOptions);

sections.forEach(section => observer.observe(section));
