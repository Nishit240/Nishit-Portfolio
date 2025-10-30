document.addEventListener('DOMContentLoaded', () => {
  const glassBox = document.querySelector('.glass-box');
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');
  const scrollAmount = 200;

  // Button scroll
  if (prevBtn && nextBtn && glassBox) {
    prevBtn.addEventListener('click', () => {
      glassBox.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });
    nextBtn.addEventListener('click', () => {
      glassBox.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
  }

  // Drag scroll
  let isDown = false;
  let startX;
  let scrollLeft;

  if (glassBox) {
    glassBox.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - glassBox.offsetLeft;
      scrollLeft = glassBox.scrollLeft;
      glassBox.style.cursor = 'grabbing';
    });
    glassBox.addEventListener('mouseleave', () => {
      isDown = false;
      glassBox.style.cursor = 'grab';
    });
    glassBox.addEventListener('mouseup', () => {
      isDown = false;
      glassBox.style.cursor = 'grab';
    });
    glassBox.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - glassBox.offsetLeft;
      const walk = (x - startX) * 2;
      glassBox.scrollLeft = scrollLeft - walk;
    });

    // Touch scroll
    glassBox.addEventListener('touchstart', (e) => {
      startX = e.touches[0].pageX - glassBox.offsetLeft;
      scrollLeft = glassBox.scrollLeft;
    });
    glassBox.addEventListener('touchmove', (e) => {
      const x = e.touches[0].pageX - glassBox.offsetLeft;
      const walk = (x - startX) * 2;
      glassBox.scrollLeft = scrollLeft - walk;
    });
  }

  // 🔹 Handle Nav Clicks
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      const target = link.getAttribute('href') || "";
      const navLinks = document.querySelector('.nav-links');

      if (glassBox) {
        if (target.includes("#skills")) {
          glassBox.style.display = "flex";
          glassBox.style.opacity = "1";
        } else {
          glassBox.style.display = "none";
        }
      }

      navLinks.classList.remove('active');
    });
  });

  // 🔹 Handle Scroll Events (show when Skills is visible)
  window.addEventListener('scroll', () => {
    const skillsSection = document.querySelector('#skills');
    if (!skillsSection || !glassBox) return;

    const rect = skillsSection.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight * 0.8 && rect.bottom > 0;

    if (isVisible) {
      glassBox.style.display = "flex";
      glassBox.style.opacity = "1";
    } else {
      glassBox.style.display = "none";
    }
  });
});
