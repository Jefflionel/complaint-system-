// frontend/js/staff.js
import { apiRequest } from './api.js';
import { showToast } from './utils/toast.js';
import { setupUI } from './utils/ui.js';
import { setupStaffMap, showStaffMap } from './utils/maps.js';
import { loadAnalytics, setupAnalyticsEvents } from './utils/analytics.js';
import { initStaffForum } from './staff-forum.js'; // <-- NEW

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('user_type');
    
    if (!token || userType !== 'staff') {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.clear(); 
        window.location.href = 'index.html';
    });

    // Initialize all modules
    setupUI();
    setupStaffMap();
    setupAnalyticsEvents();
    loadAnalytics();
    initStaffForum(); // <-- INITIALIZE FORUM

    let currentComplaints = [];

    async function loadMasterComplaints() {
        try {
            currentComplaints = await apiRequest('/staff/complaints/');
            const tbody = document.getElementById('staff-table-body');
            tbody.innerHTML = '';
            
            let pendingCount = 0;
            let resolvedCount = 0;

            currentComplaints.forEach(c => {
                if (c.status === 'Resolved') resolvedCount++;
                if (c.status === 'Pending') pendingCount++;

                let statusColor = c.status === 'Resolved' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
                if (c.status === 'In Progress') statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
                if (c.status === 'Rejected') statusColor = 'bg-red-100 text-red-800 border-red-200';
                
                let actionHtml = '';
                if (c.status === 'Rejected' || c.status === 'Resolved') {
                    actionHtml = `<span class="text-gray-400 text-sm font-semibold flex items-center cursor-not-allowed"><svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path></svg>Locked</span>`;
                } else {
                    actionHtml = `<button class="review-btn bg-brand-green hover:bg-brand-dark text-white px-4 py-1.5 rounded text-sm font-bold shadow transition-all" data-id="${c.id}">Review</button>`;
                }

                let ticketHtml = `<span class="text-gray-600">${c.ticket_id}</span>`;
                if (c.is_anonymous) {
                    ticketHtml += `<br><span class="inline-block mt-1 bg-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded font-bold shadow-sm">🕵️ Anonymous</span>`;
                }

                const tr = document.createElement('tr');
                tr.className = "border-b hover:bg-gray-50 transition-colors";
                tr.innerHTML = `
                    <td class="p-4 font-mono text-sm whitespace-nowrap">${ticketHtml}</td>
                    <td class="p-4 font-medium whitespace-nowrap">Yaoundé ${c.district_id}</td>
                    <td class="p-4 whitespace-nowrap">${c.category.replace(/_/g, ' ')}</td>
                    <td class="p-4 whitespace-nowrap"><span class="px-3 py-1 rounded-full text-xs font-bold border ${statusColor}">${c.status.toUpperCase()}</span></td>
                    <td class="p-4 whitespace-nowrap">${actionHtml}</td>
                `;
                tbody.appendChild(tr);
            });

            document.getElementById('stat-total').innerText = currentComplaints.length;
            document.getElementById('stat-pending').innerText = pendingCount;
            document.getElementById('stat-resolved').innerText = resolvedCount;

            document.querySelectorAll('.review-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetBtn = e.target.closest('button');
                    if(targetBtn) openReview(targetBtn.dataset.id);
                });
            });

        } catch (error) {
            console.error("Failed to load master list:", error);
            showToast("Error loading complaints: " + error.message, "error");
        }
    }

    function openReview(complaintId) {
        const complaint = currentComplaints.find(c => c.id == complaintId);
        if (!complaint) return;

        document.getElementById('r-id').value = complaint.id;
        document.getElementById('r-title').innerText = complaint.title;
        document.getElementById('r-ticket').innerText = complaint.ticket_id;
        document.getElementById('r-district').innerText = `Yaoundé ${complaint.district_id}`;
        document.getElementById('r-desc').innerText = complaint.description || "No description provided.";
        document.getElementById('r-location').innerText = complaint.location || "No landmark provided.";
        
        let reporterHtml = '';
        if (complaint.is_anonymous) {
            reporterHtml = `<div class="text-gray-500 italic">🕵️ Submitted Anonymously</div>`;
        } else {
            const name = complaint.user?.identity?.full_name || "Unknown Citizen";
            const phone = complaint.user?.identity?.phone || "No phone provided";
            reporterHtml = `<div class="text-gray-800 font-bold">👤 ${name}<br><span class="text-gray-600 font-normal mt-1 block">📞 ${phone}</span></div>`;
        }
        document.getElementById('r-reporter').innerHTML = reporterHtml;

        const viewMapBtn = document.getElementById('s-view-map-btn');
        const noGpsMsg = document.getElementById('s-no-gps-msg');
        
        if (complaint.latitude && complaint.longitude) {
            viewMapBtn.classList.remove('hidden');
            noGpsMsg.classList.add('hidden');
            const newBtn = viewMapBtn.cloneNode(true);
            viewMapBtn.parentNode.replaceChild(newBtn, viewMapBtn);
            newBtn.addEventListener('click', () => showStaffMap(complaint.latitude, complaint.longitude));
        } else {
            viewMapBtn.classList.add('hidden');
            noGpsMsg.classList.remove('hidden');
        }

        const photoEl = document.getElementById('r-photo');
        const noPhotoEl = document.getElementById('r-no-photo');
        if (complaint.photo_path) {
            photoEl.src = `http://localhost:8000/${complaint.photo_path}`;
            photoEl.classList.remove('hidden');
            noPhotoEl.classList.add('hidden');
        } else {
            photoEl.src = "";
            photoEl.classList.add('hidden');
            noPhotoEl.classList.remove('hidden');
        }

        const statusSelect = document.getElementById('r-status');
        const actionBlock = document.getElementById('action-block');
        const lockedBlock = document.getElementById('locked-block');
        
        statusSelect.value = complaint.status;
        
        if (complaint.status === 'Resolved' || complaint.status === 'Rejected') {
            statusSelect.disabled = true;
            actionBlock.classList.add('hidden');
            lockedBlock.classList.remove('hidden');
            toggleResolutionFields(complaint.status);
        } else {
            statusSelect.disabled = false;
            actionBlock.classList.remove('hidden');
            lockedBlock.classList.add('hidden');
            toggleResolutionFields(complaint.status);
        }

        const badge = document.getElementById('r-badge');
        badge.innerText = complaint.status.toUpperCase();
        window.switchView('review-view');
    }

    const statusSelect = document.getElementById('r-status');
    const resolutionFields = document.getElementById('resolution-fields');
    const resolutionNote = document.getElementById('r-res-note');

    function toggleResolutionFields(statusValue) {
        if (statusValue === 'Resolved') {
            resolutionFields.classList.remove('hidden');
            resolutionNote.setAttribute('required', 'required');
        } else {
            resolutionFields.classList.add('hidden');
            resolutionNote.removeAttribute('required');
            resolutionNote.value = ''; 
            document.getElementById('r-res-photo').value = ''; 
        }
    }

    statusSelect.addEventListener('change', (e) => toggleResolutionFields(e.target.value));

    document.getElementById('update-status-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const complaintId = document.getElementById('r-id').value;
        const newStatus = statusSelect.value;

        try {
            if (newStatus === 'Resolved') {
                const formData = new FormData();
                formData.append('status', newStatus);
                formData.append('resolution_notes', resolutionNote.value);
                const photoFile = document.getElementById('r-res-photo').files[0];
                if (photoFile) formData.append('resolution_photo', photoFile);

                await apiRequest(`/staff/complaints/${complaintId}/resolve`, { method: 'PATCH', body: formData });
            } else {
                await apiRequest(`/staff/complaints/${complaintId}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
            }

            showToast('Ticket updated successfully!', 'success');
            window.switchView('dashboard-view');
            loadMasterComplaints(); 

        } catch (error) {
            showToast('Failed to update ticket: ' + error.message, 'error');
        }
    });

    loadMasterComplaints();
});