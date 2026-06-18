// frontend/js/utils/ui.js

export function setupUI() {
  setupSidebar();
  setupLightbox();
  setupViewSwapper();
}

// 1. RESPONSIVE SIDEBAR LOGIC
function setupSidebar() {
  const sidebar = document.getElementById("app-sidebar");
  const overlay = document.getElementById("mobile-sidebar-overlay");
  const menuBtn = document.getElementById("mobile-menu-btn");

  if (!sidebar || !overlay || !menuBtn) return;

  function openSidebar() {
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
  }

  function closeSidebar() {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  }

  menuBtn.addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);

  // Auto-close sidebar on mobile when a link is clicked
  document.querySelectorAll(".sidebar-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (window.innerWidth < 768) {
        // md breakpoint in Tailwind
        closeSidebar();
      }
    });
  });
}

// 2. LIGHTBOX LOGIC
export function setupLightbox() {
  const lightbox = document.getElementById("lightbox-overlay");
  const lightboxImg = document.getElementById("lightbox-img");

  if (!lightbox || !lightboxImg) return;

  // Array of all photo IDs used across both citizen and staff views
  const imageIds = ["r-photo", "d-photo", "d-res-photo"];

  imageIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", () => {
        // Only open if the source is not empty
        if (el.src && !el.src.endsWith(window.location.host + "/")) {
          lightboxImg.src = el.src;
          lightbox.classList.remove("hidden");
        }
      });
    }
  });

  lightbox.addEventListener("click", () => {
    lightbox.classList.add("hidden");
  });
}

// 3. VIEW SWAPPER WITH HISTORY API
function setupViewSwapper() {
  window.switchView = function (
    targetViewId,
    clickedBtn = null,
    pushToHistory = true,
  ) {
    // Hide all views
    document.querySelectorAll(".view-section").forEach((view) => {
      view.classList.add("hidden");
    });

    // Show target view
    const targetView = document.getElementById(targetViewId);
    if (targetView) targetView.classList.remove("hidden");

    // Update title
    const titles = {
      "dashboard-view": "Incoming Reports",
      "review-view": "Complaint Review",
      "analytics-view": "District Analytics",
      "suggestions-view": "Public Forum",
    };
    const titleEl = document.getElementById("page-title");
    if (titleEl) titleEl.innerText = titles[targetViewId] || "Command Center";

    // Auto-select sidebar button if navigating via history
    if (!clickedBtn && targetViewId !== "review-view") {
      clickedBtn = document.querySelector(
        `.sidebar-btn[data-view="${targetViewId}"]`,
      );
    }

    if (clickedBtn) {
      document.querySelectorAll(".sidebar-btn").forEach((btn) => {
        btn.classList.remove("bg-brand-green", "text-white");
        btn.classList.add(
          "text-gray-400",
          "hover:bg-gray-800",
          "hover:text-white",
        );
      });
      clickedBtn.classList.remove(
        "text-gray-400",
        "hover:bg-gray-800",
        "hover:text-white",
      );
      clickedBtn.classList.add("bg-brand-green", "text-white");
    }

    if (pushToHistory) {
      const url = new URL(window.location);
      url.searchParams.set("view", targetViewId);
      window.history.pushState({ viewId: targetViewId }, "", url);
    }
  };

  window.addEventListener("popstate", (event) => {
    const viewId = event.state ? event.state.viewId : "dashboard-view";
    window.switchView(viewId, null, false);
  });

  // Initial Load
  const params = new URLSearchParams(window.location.search);
  const viewId = params.get("view") || "dashboard-view";
  window.history.replaceState({ viewId: viewId }, "", window.location.href);

  // We wait 100ms to ensure the DOM is fully parsed before triggering initial view
  setTimeout(() => {
    window.switchView(viewId, null, false);
  }, 100);
}
