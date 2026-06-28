// frontend/js/citizen.js
import { apiRequest } from './api.js';
import { showToast } from './utils/toast.js';
import { setupUI } from './utils/ui.js';
import { initCitizenForum } from './citizen-forum.js'; 
import { saveComplaintOffline, syncOfflineComplaints } from './utils/offline.js';
import { initProfile } from './utils/profile.js';
import { initI18n, applyTranslations, t } from './utils/i18n.js';

const isLocal = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') || window.location.protocol === 'file:';
const API_HOST = isLocal ? 'http://localhost:8000' : '';

document.addEventListener('DOMContentLoaded', async () => {
    await initI18n(); // Start the translation engine first

    // Dynamic browser tab title
    document.title = `${t('sidebar.dashboard')} · CitizenHub`;

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }


    // Settings: Logout
    document.getElementById('settings-logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_type');
        window.location.href = 'index.html';
    });

    // Settings: Delete Account — opens confirmation modal
    const deleteModal = document.getElementById('delete-modal');
    document.getElementById('settings-delete-btn').addEventListener('click', () => {
        deleteModal.classList.remove('hidden');
    });
    document.getElementById('cancel-delete-btn').addEventListener('click', () => {
        deleteModal.classList.add('hidden');
    });
    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
        try {
            await apiRequest('/auth/me', { method: 'DELETE' });
            localStorage.clear();
            window.location.href = 'index.html';
        } catch (err) {
            deleteModal.classList.add('hidden');
            showToast('Failed to delete account: ' + err.message, 'error');
        }
    });

    // Initialize UI and Forum
    setupUI();
    initCitizenForum(); 
    initProfile();

    // Populate the sidebar with the logged-in user's name
    async function loadSidebarUser() {
        try {
            const userData = await apiRequest('/auth/me');
            const name = userData.identity?.full_name || 'User';
            const nameEl = document.getElementById('sidebar-user-name');
            const avatarEl = document.getElementById('sidebar-avatar');
            if (nameEl) nameEl.innerText = name;
            if (avatarEl) avatarEl.innerText = name.charAt(0).toUpperCase();
        } catch (e) {
            // silently fail — sidebar will show 'Loading...'
        }
    }
    loadSidebarUser();

    let currentComplaints = [];

    async function loadComplaints() {
        try {
            currentComplaints = await apiRequest('/citizen/complaints/me');
            const tbody = document.getElementById('complaints-table-body');
            
            tbody.innerHTML = '';
            if (currentComplaints.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="px-6 py-12 text-center">
                            <svg class="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            <h3 data-i18n="dashboard.emptyTitle" class="text-sm font-medium text-gray-900">No tickets found</h3>
                            <p data-i18n="dashboard.emptyDesc" class="mt-1 text-sm text-gray-500">You haven't submitted any reports yet.</p>
                        </td>
                    </tr>`;
                applyTranslations();
                return;
            }
            
            currentComplaints.forEach(c => {
                let statusColor = c.status === 'Resolved' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
                if (c.status === 'In Progress') statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
                if (c.status === 'Rejected') statusColor = 'bg-red-100 text-red-800 border-red-200';
                
                const categoryLabel = t('category.' + c.category) || c.category.replace(/_/g, ' ');
                const statusLabel = t('status.' + c.status) || c.status;
                const actionHtml = `<button class="view-details-btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-1.5 rounded text-sm font-bold shadow-sm transition-all" data-i18n="dashboard.viewDetails" data-id="${c.id}">View Details</button>`;

                const tr = document.createElement('tr');
                tr.className = "border-b hover:bg-gray-50 transition-colors";
                tr.innerHTML = `
                    <td class="p-4 font-mono text-sm whitespace-nowrap text-gray-600">${c.ticket_id}</td>
                    <td class="p-4 font-semibold">${c.title}</td>
                    <td class="p-4 whitespace-nowrap">${categoryLabel}</td>
                    <td class="p-4 whitespace-nowrap"><span class="px-3 py-1 rounded-full text-xs font-bold border ${statusColor}">${statusLabel.toUpperCase()}</span></td>
                    <td class="p-4 whitespace-nowrap">${actionHtml}</td>
                `;
                tbody.appendChild(tr);
            });

            // Re-apply translations to newly injected dynamic content
            applyTranslations();

            document.querySelectorAll('.view-details-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetBtn = e.target.closest('button');
                    if(targetBtn) openTicketDetails(targetBtn.dataset.id);
                });
            });

        } catch (error) {
            showToast(t('toast.loadFailed') + error.message, 'error');
        }
    }

    function openTicketDetails(complaintId) {
        const complaint = currentComplaints.find(c => c.id == complaintId);
        if (!complaint) return;

        document.getElementById('d-title').innerText = complaint.title;
        document.getElementById('d-ticket').innerText = complaint.ticket_id;
        document.getElementById('d-district').innerText = `Yaoundé ${complaint.district_id}`;
        document.getElementById('d-desc').innerText = complaint.description || t('details.noDescription');
        document.getElementById('d-location').innerText = complaint.location || t('details.noLandmark');

        const photoEl = document.getElementById('d-photo');
        const noPhotoEl = document.getElementById('d-no-photo');
        if (complaint.photo_path) {
            photoEl.src = `${API_HOST}/${complaint.photo_path}`;
            photoEl.classList.remove('hidden');
            noPhotoEl.classList.add('hidden');
        } else {
            photoEl.src = "";
            photoEl.classList.add('hidden');
            noPhotoEl.classList.remove('hidden');
        }

        const badge = document.getElementById('d-badge');
        badge.innerText = complaint.status.toUpperCase();
        let statusColor = complaint.status === 'Resolved' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
        if (complaint.status === 'In Progress') statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
        if (complaint.status === 'Rejected') statusColor = 'bg-red-100 text-red-800 border-red-200';
        badge.className = `px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${statusColor}`;

        const resolutionBox = document.getElementById('d-resolution-box');
        if (complaint.status === 'Resolved' || complaint.status === 'Rejected') {
            resolutionBox.classList.remove('hidden');
            document.getElementById('d-res-note').innerText = complaint.resolution_notes || t('details.noNotes');
            const resPhotoEl = document.getElementById('d-res-photo');
            const resNoPhotoEl = document.getElementById('d-res-no-photo');
            
            if (complaint.resolution_photo_path) {
                resPhotoEl.src = `${API_HOST}/${complaint.resolution_photo_path}`;
                resPhotoEl.classList.remove('hidden');
                resNoPhotoEl.classList.add('hidden');
            } else {
                resPhotoEl.src = "";
                resPhotoEl.classList.add('hidden');
                resNoPhotoEl.classList.remove('hidden');
            }
        } else {
            resolutionBox.classList.add('hidden');
        }

        window.switchView('details-view');
    }

    let map = null;
    let marker = null;
    let mapInitialized = false;

    const mapOverlay = document.getElementById('map-overlay');
    const openBtn = document.getElementById('open-map-btn');
    const closeBtn = document.getElementById('confirm-map-btn');

    function setCoordinates(lat, lng) {
        if (marker) map.removeLayer(marker);
        marker = new google.maps.Marker({ position: { lat: lat, lng: lng }, map: map, animation: google.maps.Animation.DROP });
        document.getElementById('c-lat').value = lat;
        document.getElementById('c-lng').value = lng;
    }

    function initGoogleMap() {
        if (mapInitialized) return;
        const yaounde = { lat: 3.8480, lng: 11.5021 };
        map = new google.maps.Map(document.getElementById("yaounde-map"), { zoom: 13, center: yaounde, mapTypeId: 'roadmap', streetViewControl: false, mapTypeControl: false });
        const input = document.getElementById('map-search-box');
        const searchBox = new google.maps.places.SearchBox(input);

        map.addListener("bounds_changed", () => searchBox.setBounds(map.getBounds()));
        searchBox.addListener("places_changed", () => {
            const places = searchBox.getPlaces();
            if (places.length == 0) return;
            const bounds = new google.maps.LatLngBounds();
            places.forEach((place) => {
                if (!place.geometry || !place.geometry.location) return;
                setCoordinates(place.geometry.location.lat(), place.geometry.location.lng());
                if (place.geometry.viewport) bounds.union(place.geometry.viewport);
                else bounds.extend(place.geometry.location);
            });
            map.fitBounds(bounds);
            map.setZoom(16);
        });

        map.addListener("click", (e) => setCoordinates(e.latLng.lat(), e.latLng.lng()));
        mapInitialized = true;
    }

    openBtn.addEventListener('click', () => {
        // ════ OFFLINE GPS INTERCEPTOR ════
        if (!navigator.onLine) {
            showToast(t('toast.mapsOffline'), 'error');
            
            // Visually disable the button temporarily
            openBtn.classList.add('opacity-50', 'cursor-not-allowed');
            setTimeout(() => openBtn.classList.remove('opacity-50', 'cursor-not-allowed'), 3000);
            return; // Block the map from opening!
        }

        mapOverlay.classList.remove('hidden');
        mapOverlay.classList.add('flex');
        if (!mapInitialized && typeof google !== 'undefined') initGoogleMap();
    });
    
    closeBtn.addEventListener('click', () => {
        mapOverlay.classList.add('hidden');
        mapOverlay.classList.remove('flex');
        if (document.getElementById('c-lat').value) {
            openBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            openBtn.classList.add('bg-brand-light', 'text-brand-dark', 'border-2', 'border-brand-green');
            openBtn.innerHTML = '🗺️ ' + t('report.mapSelected');
            document.getElementById('map-status').classList.remove('hidden');
        }
    });

    const form = document.getElementById('complaint-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', document.getElementById('c-title').value);
        formData.append('description', document.getElementById('c-desc').value);
        formData.append('location', document.getElementById('c-location').value);
        formData.append('category_name', document.getElementById('c-category').value);
        formData.append('district_id', document.getElementById('c-district').value);
        formData.append('is_anonymous', document.getElementById('c-anon').checked);
        
        const lat = document.getElementById('c-lat').value;
        const lng = document.getElementById('c-lng').value;
        if (lat && lng) {
            formData.append('latitude', lat);
            formData.append('longitude', lng);
        }
        
        const photoFile = document.getElementById('c-photo').files[0];
        if (photoFile) formData.append('photo', photoFile);

        // ════ OFFLINE CHECK ════
        if (!navigator.onLine) {
            try {
                await saveComplaintOffline(formData);
                showToast(t('toast.savedOffline'), 'success');
                
                // Clean up UI
                form.reset(); 
                if (marker) { marker.setMap(null); marker = null; }
                document.getElementById('c-lat').value = '';
                document.getElementById('c-lng').value = '';
                document.getElementById('map-status').classList.add('hidden');
                openBtn.classList.remove('bg-brand-light', 'text-brand-dark', 'border-2', 'border-brand-green');
                openBtn.classList.add('bg-blue-600', 'text-white');
                openBtn.innerHTML = `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg><span data-i18n="report.openMapBtn">${t('report.openMapBtn')}</span>`;

                window.switchView('dashboard-view');
            } catch (err) {
                showToast(t('toast.saveOfflineFailed') + err.message, 'error');
            }
            return; // Stop execution here!
        }

        // ════ ONLINE: NORMAL SUBMISSION ════
        try {
            await apiRequest('/citizen/complaints/', { method: 'POST', body: formData });
            showToast(t('toast.ticketSubmitted'), 'success');
            
            form.reset(); 
            if (marker) { marker.setMap(null); marker = null; }
            document.getElementById('c-lat').value = '';
            document.getElementById('c-lng').value = '';
            document.getElementById('map-status').classList.add('hidden');
            openBtn.classList.remove('bg-brand-light', 'text-brand-dark', 'border-2', 'border-brand-green');
            openBtn.classList.add('bg-blue-600', 'text-white');
            openBtn.innerHTML = `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg><span data-i18n="report.openMapBtn">${t('report.openMapBtn')}</span>`;

            window.switchView('dashboard-view');
            loadComplaints();
        } catch (error) {
            showToast(t('toast.submitFailed') + error.message, 'error');
        }
    });

    // Check for pending offline uploads when the app loads!
    syncOfflineComplaints();

    loadComplaints();

    // Listen for the background sync engine finishing
    window.addEventListener('refreshComplaints', () => {
        console.log("🔄 refreshComplaints event received! Reloading table...");
        loadComplaints(); // Quietly rebuild the table without reloading the page!
    });
});