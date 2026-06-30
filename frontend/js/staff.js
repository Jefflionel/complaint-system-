// frontend/js/staff.js
import { apiRequest } from './api.js';
import { showToast } from './utils/toast.js';
import { setupUI } from './utils/ui.js';
import { setupStaffMap, showStaffMap } from './utils/maps.js';
import { loadAnalytics, setupAnalyticsEvents } from './utils/analytics.js';
import { initStaffForum } from './staff-forum.js';
import { initProfile } from './utils/profile.js';
import { initI18n, applyTranslations, t } from './utils/i18n.js';

const isLocal = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') || window.location.protocol === 'file:';
const API_HOST = isLocal ? 'http://localhost:8000' : '';

document.addEventListener('DOMContentLoaded', async () => {
    await initI18n(); // Start the translation engine first

    // Dynamic browser tab title
    document.title = `${t('staff.masterList')} · MunicipalCommand`;

    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('user_type');

    if (!token || userType !== 'staff') {
        window.location.href = 'index.html';
        return;
    }


    // Settings: Logout
    document.getElementById('settings-logout-btn').addEventListener('click', () => {
        localStorage.clear();
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
            await apiRequest('/auth/staff/me', { method: 'DELETE' });
            localStorage.clear();
            window.location.href = 'index.html';
        } catch (err) {
            deleteModal.classList.add('hidden');
            showToast('Failed to delete account: ' + err.message, 'error');
        }
    });

    // Initialize all modules
    setupUI();
    setupStaffMap();
    setupAnalyticsEvents();
    loadAnalytics();
    initStaffForum();
    initProfile();

    // Populate the sidebar with the logged-in staff member's name
    async function loadSidebarUser() {
        try {
            const userData = await apiRequest('/auth/staff/me');
            const name = userData.full_name || userData.identity?.full_name || 'Staff';
            const nameEl = document.getElementById('sidebar-user-name');
            const avatarEl = document.getElementById('sidebar-avatar');
            if (nameEl) nameEl.innerText = name;
            if (avatarEl) avatarEl.innerText = name.charAt(0).toUpperCase();
        } catch (e) {
            // silently fail
        }
    }
    loadSidebarUser();

    let currentComplaints = [];

    // Expose function globally so the reassign logic can call it
    window.loadMasterComplaints = loadMasterComplaints;

    async function loadMasterComplaints() {
        try {
            currentComplaints = await apiRequest('/staff/complaints/');
            const tbody = document.getElementById('staff-table-body');

            let pendingCount = 0;
            let resolvedCount = 0;

            tbody.innerHTML = '';
            if (currentComplaints.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="px-6 py-12 text-center">
                            <svg class="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            <h3 data-i18n="dashboard.emptyTitle" class="text-sm font-medium text-gray-900">No tickets found</h3>
                            <p data-i18n="dashboard.emptyDesc" class="mt-1 text-sm text-gray-500">No reports submitted yet.</p>
                        </td>
                    </tr>`;
                applyTranslations();
            }

            currentComplaints.forEach(c => {
                if (c.status === 'Resolved') resolvedCount++;
                if (c.status === 'Pending') pendingCount++;

                let statusColor = c.status === 'Resolved' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
                if (c.status === 'In Progress') statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
                if (c.status === 'Rejected') statusColor = 'bg-red-100 text-red-800 border-red-200';

                let actionHtml = '';
                if (c.status === 'Rejected' || c.status === 'Resolved') {
                    actionHtml = `<span class="text-gray-400 text-sm font-semibold flex items-center cursor-not-allowed"><svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path></svg>${t('staff.locked')}</span>`;
                } else {
                    actionHtml = `<button class="review-btn bg-brand-green hover:bg-brand-dark text-white px-4 py-1.5 rounded text-sm font-bold shadow transition-all" data-id="${c.id}">${t('staff.reviewBtn')}</button>`;
                }

                let ticketHtml = `<span class="text-gray-600">${c.ticket_id}</span>`;
                if (c.is_anonymous) {
                    ticketHtml += `<br><span class="inline-block mt-1 bg-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded font-bold shadow-sm">🕵️ ${t('staff.anonymous')}</span>`;
                }

                const categoryLabel = t('category.' + c.category) || c.category.replace(/_/g, ' ');
                const statusLabel = t('status.' + c.status) || c.status;

                const tr = document.createElement('tr');
                tr.className = "border-b hover:bg-gray-50 transition-colors";
                tr.innerHTML = `
                    <td class="p-4 font-mono text-sm whitespace-nowrap">${ticketHtml}</td>
                    <td class="p-4 font-medium whitespace-nowrap">Yaoundé ${c.district_id}</td>
                    <td class="p-4 whitespace-nowrap">${categoryLabel}</td>
                    <td class="p-4 whitespace-nowrap"><span class="px-3 py-1 rounded-full text-xs font-bold border ${statusColor}">${statusLabel.toUpperCase()}</span></td>
                    <td class="p-4 whitespace-nowrap">${actionHtml}</td>
                `;
                tbody.appendChild(tr);
            });

            document.getElementById('stat-total').innerText = currentComplaints.length;
            document.getElementById('stat-pending').innerText = pendingCount;
            document.getElementById('stat-resolved').innerText = resolvedCount;

            // Re-apply translations to newly injected dynamic content
            applyTranslations();

            document.querySelectorAll('.review-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetBtn = e.target.closest('button');
                    if (targetBtn) openReview(targetBtn.dataset.id);
                });
            });

        } catch (error) {
            console.error("Failed to load master list:", error);
            showToast(t('toast.loadFailed') + error.message, 'error');
        }
    }

    function openReview(complaintId) {
        const complaint = currentComplaints.find(c => c.id == complaintId);
        if (!complaint) return;

        document.getElementById('r-id').value = complaint.id;
        document.getElementById('r-title').innerText = complaint.title;
        document.getElementById('r-ticket').innerText = complaint.ticket_id;
        document.getElementById('r-district').innerText = `Yaoundé ${complaint.district_id}`;
        document.getElementById('r-desc').innerText = complaint.description || t('staff.noDescription');
        document.getElementById('r-location').innerText = complaint.location || t('staff.noLandmark');

        let reporterHtml = '';
        if (complaint.is_anonymous) {
            reporterHtml = `<div class="text-gray-500 italic">🕵️ ${t('staff.submittedAnon')}</div>`;
        } else {
            const name = complaint.user?.identity?.full_name || t('staff.unknownCitizen');
            const phone = complaint.user?.identity?.phone || t('staff.noPhone');
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
            photoEl.src = `${API_HOST}/${complaint.photo_path}`;
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

            showToast(t('toast.updateSuccess'), 'success');
            window.switchView('dashboard-view');
            loadMasterComplaints();

        } catch (error) {
            showToast(t('toast.updateFailed') + error.message, 'error');
        }
    });

    loadMasterComplaints();
});

// ═══════════════════════════════════════════════════════
    // UPGRADED REASSIGN TICKET LOGIC (WITH MODAL & LOADING STATE)
    // ═══════════════════════════════════════════════════════
    const reassignModal = document.getElementById('reassign-modal');
    const confirmReassignBtn = document.getElementById('confirm-reassign-btn');
    const cancelReassignBtn = document.getElementById('cancel-reassign-btn');
    const reassignBtnText = document.getElementById('reassign-btn-text');

    // 1. Open the Modal when "Transfer Ticket" is clicked
    document.getElementById('reassign-btn').addEventListener('click', () => {
        const newDistrictId = document.getElementById('r-reassign-district').value;
        const currentDistrictText = document.getElementById('r-district').innerText;

        // Prevent reassignment to the exact same district
        if (currentDistrictText.includes(newDistrictId)) {
            showToast("This ticket is already in Yaoundé " + newDistrictId, "error");
            return;
        }

        // Setup and show modal
        document.getElementById('reassign-target-name').innerText = `Yaoundé ${newDistrictId}`;
        reassignModal.classList.remove('hidden');
    });

    // 2. Close Modal on Cancel
    cancelReassignBtn.addEventListener('click', () => {
        reassignModal.classList.add('hidden');
    });

    // 3. Execute Transfer on Confirm
    confirmReassignBtn.addEventListener('click', async () => {
        const complaintId = document.getElementById('r-id').value;
        const newDistrictId = document.getElementById('r-reassign-district').value;

        // UI Loading State
        confirmReassignBtn.disabled = true;
        reassignBtnText.innerText = "Transferring...";
        confirmReassignBtn.classList.add('opacity-75', 'cursor-not-allowed');

        try {
            await apiRequest(`/staff/complaints/${complaintId}/reassign`, {
                method: 'PATCH',
                body: JSON.stringify({ district_id: parseInt(newDistrictId) })
            });

            showToast(`Ticket successfully transferred to Yaoundé ${newDistrictId}`, 'success');
            
            // Clean up and refresh UI automatically!
            reassignModal.classList.add('hidden');
            window.switchView('dashboard-view');
            
            // This will no longer throw an error!
            if (typeof window.loadMasterComplaints === 'function') {
                window.loadMasterComplaints(); 
            }

        } catch (error) {
            showToast('Failed to transfer ticket: ' + error.message, 'error');
        } finally {
            // Reset Button State
            confirmReassignBtn.disabled = false;
            reassignBtnText.innerText = "Transfer Now";
            confirmReassignBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    });