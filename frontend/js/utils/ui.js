// frontend/js/utils/ui.js

export function setupUI() {
    setupMobileMenu();
    setupViewSwapper();
}

function setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    if (btn && sidebar) {
        btn.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
        });
    }
}

function setupViewSwapper() {
    window.switchView = function(targetViewId, clickedBtn = null, pushToHistory = true) {
        
        // Force close all popups/overlays on view change
        const overlays = ['map-overlay', 'staff-map-overlay', 'lightbox-overlay', 'suggestion-modal'];
        overlays.forEach(id => {
            const overlay = document.getElementById(id);
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.classList.remove('flex');
            }
        });

        // Hide all views
        document.querySelectorAll('.view-section').forEach(view => {
            view.classList.add('hidden');
        });
        
        // Show target view
        const targetView = document.getElementById(targetViewId);
        if (targetView) targetView.classList.remove('hidden');

        // Update Header Title
        const titles = {
            'dashboard-view': 'My Reports',
            'submit-view': 'Report an Issue',
            'details-view': 'Ticket Details',
            'review-view': 'Complaint Review',
            'analytics-view': 'District Analytics',
            'suggestions-view': 'Public Forum',
            'profile-view': 'My Profile' // <--- ADDED HERE
        };
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.innerText = titles[targetViewId] || 'Command Center';

        // Auto-select sidebar button if navigating via history
        if (!clickedBtn && targetViewId !== 'review-view' && targetViewId !== 'details-view') {
            clickedBtn = document.querySelector(`.sidebar-btn[data-view="${targetViewId}"]`);
        }

        if (clickedBtn) {
            // Apply different active colors depending on if it's Staff or Citizen
            const isStaff = window.location.pathname.includes('staff.html');
            
            document.querySelectorAll('.sidebar-btn').forEach(btn => {
                if (isStaff) {
                    btn.classList.remove('bg-brand-green', 'text-white');
                    btn.classList.add('text-gray-400', 'hover:bg-gray-800', 'hover:text-white');
                } else {
                    btn.classList.remove('bg-green-50', 'text-brand-green');
                    btn.classList.add('text-gray-600', 'hover:bg-gray-100', 'hover:text-gray-900');
                }
            });
            
            if (isStaff) {
                clickedBtn.classList.remove('text-gray-400', 'hover:bg-gray-800', 'hover:text-white');
                clickedBtn.classList.add('bg-brand-green', 'text-white');
            } else {
                clickedBtn.classList.remove('text-gray-600', 'hover:bg-gray-100', 'hover:text-gray-900');
                clickedBtn.classList.add('bg-green-50', 'text-brand-green');
            }
        }

        if (pushToHistory) {
            const url = new URL(window.location);
            url.searchParams.set('view', targetViewId);
            window.history.pushState({ viewId: targetViewId }, '', url);
        }
    };

    window.addEventListener('popstate', (event) => {
        const viewId = event.state ? event.state.viewId : 'dashboard-view';
        window.switchView(viewId, null, false);
    });

    // Initial Load
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view') || 'dashboard-view';
    window.history.replaceState({ viewId: viewId }, '', window.location.href);
    
    setTimeout(() => {
        window.switchView(viewId, null, false);
    }, 100);
}