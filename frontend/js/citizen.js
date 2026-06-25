// frontend/js/citizen.js
import { apiRequest } from './api.js';
import { showToast } from './utils/toast.js';
import { setupUI } from './utils/ui.js';
import { initCitizenForum } from './citizen-forum.js'; 
import { saveComplaintOffline, syncOfflineComplaints } from './utils/offline.js';
import { initProfile } from './utils/profile.js';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_type');
        window.location.href = 'index.html';
    });

    // Initialize UI and Forum
    setupUI();
    initCitizenForum(); 
    initProfile();

    let currentComplaints = [];

    async function loadComplaints() {
        try {
            currentComplaints = await apiRequest('/citizen/complaints/me');
            const tbody = document.getElementById('complaints-table-body');
            const emptyState = document.getElementById('empty-state');
            
            tbody.innerHTML = ''; 
            
            if (currentComplaints.length === 0) {
                emptyState.classList.remove('hidden');
                return;
            }
            
            emptyState.classList.add('hidden');
            
            currentComplaints.forEach(c => {
                let statusColor = c.status === 'Resolved' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
                if (c.status === 'In Progress') statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
                if (c.status === 'Rejected') statusColor = 'bg-red-100 text-red-800 border-red-200';
                
                const actionHtml = `<button class="view-details-btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-1.5 rounded text-sm font-bold shadow-sm transition-all" data-id="${c.id}">View Details</button>`;

                const tr = document.createElement('tr');
                tr.className = "border-b hover:bg-gray-50 transition-colors";
                tr.innerHTML = `
                    <td class="p-4 font-mono text-sm whitespace-nowrap text-gray-600">${c.ticket_id}</td>
                    <td class="p-4 font-semibold">${c.title}</td>
                    <td class="p-4 whitespace-nowrap">${c.category.replace(/_/g, ' ')}</td>
                    <td class="p-4 whitespace-nowrap"><span class="px-3 py-1 rounded-full text-xs font-bold border ${statusColor}">${c.status.toUpperCase()}</span></td>
                    <td class="p-4 whitespace-nowrap">${actionHtml}</td>
                `;
                tbody.appendChild(tr);
            });

            document.querySelectorAll('.view-details-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetBtn = e.target.closest('button');
                    if(targetBtn) openTicketDetails(targetBtn.dataset.id);
                });
            });

        } catch (error) {
            showToast("Failed to load complaints: " + error.message, "error");
        }
    }

    function openTicketDetails(complaintId) {
        const complaint = currentComplaints.find(c => c.id == complaintId);
        if (!complaint) return;

        document.getElementById('d-title').innerText = complaint.title;
        document.getElementById('d-ticket').innerText = complaint.ticket_id;
        document.getElementById('d-district').innerText = `Yaoundé ${complaint.district_id}`;
        document.getElementById('d-desc').innerText = complaint.description || "No description provided.";
        document.getElementById('d-location').innerText = complaint.location || "No landmark provided.";

        const photoEl = document.getElementById('d-photo');
        const noPhotoEl = document.getElementById('d-no-photo');
        if (complaint.photo_path) {
            photoEl.src = `http://localhost:8000/${complaint.photo_path}`;
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
            document.getElementById('d-res-note').innerText = complaint.resolution_notes || "No notes provided by the municipal worker.";
            const resPhotoEl = document.getElementById('d-res-photo');
            const resNoPhotoEl = document.getElementById('d-res-no-photo');
            
            if (complaint.resolution_photo_path) {
                resPhotoEl.src = `http://localhost:8000/${complaint.resolution_photo_path}`;
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
            showToast("Interactive Maps are unavailable offline. Please type your location in the text box.", "error");
            
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
            openBtn.innerHTML = '🗺️ Map Location Selected';
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
                showToast("No internet! Complaint saved to your phone. It will upload automatically when connection is restored.", "success");
                
                // Clean up UI
                form.reset(); 
                if (marker) { marker.setMap(null); marker = null; }
                document.getElementById('c-lat').value = '';
                document.getElementById('c-lng').value = '';
                document.getElementById('map-status').classList.add('hidden');
                openBtn.classList.remove('bg-brand-light', 'text-brand-dark', 'border-2', 'border-brand-green');
                openBtn.classList.add('bg-blue-600', 'text-white');
                openBtn.innerHTML = 'Open Google Maps';

                window.switchView('dashboard-view');
            } catch (err) {
                showToast("Failed to save offline: " + err.message, "error");
            }
            return; // Stop execution here!
        }

        // ════ ONLINE: NORMAL SUBMISSION ════
        try {
            await apiRequest('/citizen/complaints/', { method: 'POST', body: formData });
            showToast("Complaint submitted successfully!", "success");
            
            form.reset(); 
            if (marker) { marker.setMap(null); marker = null; }
            document.getElementById('c-lat').value = '';
            document.getElementById('c-lng').value = '';
            document.getElementById('map-status').classList.add('hidden');
            openBtn.classList.remove('bg-brand-light', 'text-brand-dark', 'border-2', 'border-brand-green');
            openBtn.classList.add('bg-blue-600', 'text-white');
            openBtn.innerHTML = 'Open Google Maps';

            window.switchView('dashboard-view');
            loadComplaints();
        } catch (error) {
            showToast("Failed to submit: " + error.message, "error");
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