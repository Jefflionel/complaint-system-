// frontend/js/staff-forum.js
import { apiRequest } from './api.js';
import { showToast } from './utils/toast.js';

let currentStaffSuggestions = []; 

export function initStaffForum() {
    const refreshForumBtn = document.getElementById('refresh-forum-btn');
    if (refreshForumBtn) {
        refreshForumBtn.addEventListener('click', () => {
            loadStaffSuggestions();
            showToast("Forum data refreshed!", "success");
        });
    }

    // Load data when sidebar button clicked
    const forumBtn = document.querySelector('.sidebar-btn[data-view="suggestions-view"]');
    if (forumBtn) {
        forumBtn.addEventListener('click', loadStaffSuggestions);
    }

    // Modal Close Logic
    const closeBtn = document.getElementById('close-modal-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('suggestion-modal').classList.add('hidden');
            document.getElementById('suggestion-modal').classList.remove('flex');
        });
    }

    // Boot check
    if (new URLSearchParams(window.location.search).get('view') === 'suggestions-view') {
        loadStaffSuggestions();
    }
}

async function loadStaffSuggestions() {
    try {
        currentStaffSuggestions = await apiRequest('/staff/complaints/suggestions');
        const tbody = document.getElementById('forum-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (currentStaffSuggestions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-500 italic">No community suggestions for your district yet.</td></tr>`;
            return;
        }

        currentStaffSuggestions.sort((a, b) => b.support_count - a.support_count);

        currentStaffSuggestions.forEach(s => {
            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-gray-50 transition-colors";
            tr.innerHTML = `
                <td class="p-4 text-center">
                    <div class="bg-green-100 text-green-800 font-bold text-lg rounded py-1 px-2 inline-block min-w-[40px]">
                        ${s.support_count}
                    </div>
                </td>
                <td class="p-4">
                    <div class="flex justify-between items-start">
                        <h4 class="font-bold text-gray-900">${s.title}</h4>
                    </div>
                    <p class="text-sm text-gray-600 mt-1 line-clamp-1">${s.description}</p>
                    <button class="view-staff-sugg-btn mt-2 text-brand-green text-sm font-bold hover:underline" data-id="${s.id}">View Full Details</button>
                </td>
                <td class="p-4 whitespace-nowrap"><span class="bg-gray-100 border text-gray-700 text-xs px-2 py-1 rounded font-semibold">${s.category}</span></td>
                <td class="p-4 whitespace-nowrap text-sm text-gray-500">${new Date(s.created_at).toLocaleDateString()}</td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.view-staff-sugg-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openStaffSuggestionModal(e.target.dataset.id));
        });

    } catch (error) {
        showToast("Failed to load forum: " + error.message, "error");
    }
}

function openStaffSuggestionModal(suggId) {
    const sugg = currentStaffSuggestions.find(s => s.id == suggId);
    if (!sugg) return;
    
    document.getElementById('modal-s-title').innerText = sugg.title;
    document.getElementById('modal-s-cat').innerText = sugg.category;
    document.getElementById('modal-s-desc').innerText = sugg.description;
    document.getElementById('modal-s-dist').innerText = sugg.district_id;
    document.getElementById('modal-s-date').innerText = new Date(sugg.created_at).toLocaleDateString();
    
    document.getElementById('suggestion-modal').classList.remove('hidden');
    document.getElementById('suggestion-modal').classList.add('flex');
}