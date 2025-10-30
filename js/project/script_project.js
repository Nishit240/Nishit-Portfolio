document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const tabButtons = document.querySelector(".tab-buttons");

  // Create highlight element
  const highlight = document.createElement("div");
  highlight.classList.add("tab-highlight");
  tabButtons.style.position = "relative";
  tabButtons.appendChild(highlight);

  function moveHighlight(tab, smooth = true) {
    const rect = tab.getBoundingClientRect();
    const parentRect = tabButtons.getBoundingClientRect();

    // Account for scroll position to keep alignment correct
    const translateX = rect.left - parentRect.left + tabButtons.scrollLeft;

    highlight.style.transition = smooth
      ? "transform 0.35s cubic-bezier(0.25, 1, 0.5, 1.3), width 0.3s ease"
      : "none";

    requestAnimationFrame(() => {
      highlight.style.transform = `translateX(${translateX}px)`;
      highlight.style.width = `${rect.width}px`;
    });
  }

  // Initialize
  const activeTab = document.querySelector(".tab.active") || tabs[0];
  if (activeTab) moveHighlight(activeTab, false);

  // Handle tab click
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      moveHighlight(tab);

      // ✅ Only scroll the clicked tab *into view* (doesn't lock horizontal scroll)
      tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  });

  // Keep highlight aligned when resizing
  window.addEventListener("resize", () => {
    const activeTab = document.querySelector(".tab.active");
    if (activeTab) moveHighlight(activeTab, false);
  });

  // ✅ Keep highlight in place while scrolling manually
  tabButtons.addEventListener("scroll", () => {
    const activeTab = document.querySelector(".tab.active");
    if (activeTab) moveHighlight(activeTab, false);
  });
});
