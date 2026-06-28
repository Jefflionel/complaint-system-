// frontend/js/utils/ui.js

export function setupUI() {
    setupMobileMenu();
    setupViewSwapper();
}

function setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    if (btn && sidebar) {
        btn.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
            if (overlay) overlay.classList.toggle('hidden');
        });
        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.add('-translate-x-full');
                overlay.classList.add('hidden');
            });
        }
    }
}

function setupViewSwapper() {
    // ── Class sets ──────────────────────────────────────────────────────
    const CITIZEN_INACTIVE = ['text-gray-500', 'hover:text-green-700', 'hover:bg-green-50', 'border-transparent'];
    const CITIZEN_ACTIVE   = ['text-green-700', 'bg-green-50', 'border-green-600', 'font-semibold'];
    const STAFF_INACTIVE   = ['text-gray-400', 'hover:bg-gray-800', 'hover:text-white', 'border-transparent'];
    const STAFF_ACTIVE     = ['bg-brand-green', 'text-white', 'border-green-400'];

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

        // Update Header Title (keys map to page-title element)
        const titles = {
            'dashboard-view':  'My Reports',
            'submit-view':     'Report an Issue',
            'details-view':    'Ticket Details',
            'review-view':     'Complaint Review',
            'analytics-view':  'District Analytics',
            'suggestions-view':'Community Forum',
            'settings-view':   'Settings',
            'profile-view':    'My Profile'
        };
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.innerText = titles[targetViewId] || 'Command Center';

        // Auto-select sidebar button if navigating via history
        if (!clickedBtn && targetViewId !== 'review-view' && targetViewId !== 'details-view') {
            clickedBtn = document.querySelector(`.sidebar-btn[data-view="${targetViewId}"]`);
        }

        if (clickedBtn) {
            const isStaff = window.location.pathname.includes('staff.html');

            document.querySelectorAll('.sidebar-btn').forEach(btn => {
                if (isStaff) {
                    btn.classList.remove(...STAFF_ACTIVE);
                    btn.classList.add(...STAFF_INACTIVE);
                } else {
                    btn.classList.remove(...CITIZEN_ACTIVE);
                    btn.classList.add(...CITIZEN_INACTIVE);
                }
            });
            
            if (isStaff) {
                clickedBtn.classList.remove(...STAFF_INACTIVE);
                clickedBtn.classList.add(...STAFF_ACTIVE);
            } else {
                clickedBtn.classList.remove(...CITIZEN_INACTIVE);
                clickedBtn.classList.add(...CITIZEN_ACTIVE);
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