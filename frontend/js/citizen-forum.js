// frontend/js/citizen-forum.js
import { apiRequest } from './api.js';
import { showToast } from './utils/toast.js';

let currentSuggestions = [];

export function initCitizenForum() {
    const districtSelect = document.getElementById('forum-district-select');
    const newBtn = document.getElementById('new-suggestion-btn');
    const cancelBtn = document.getElementById('cancel-suggestion-btn');
    const suggFormCard = document.getElementById('new-suggestion-form-card');
    const suggForm = document.getElementById('suggestion-form');

    if (!districtSelect) return;

    newBtn.addEventListener('click', () => suggFormCard.classList.remove('hidden'));
    cancelBtn.addEventListener('click', () => {
        suggFormCard.classList.add('hidden');
        suggForm.reset();
    });

    districtSelect.addEventListener('change', loadSuggestions);

    suggForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            title: document.getElementById('s-title').value,
            category: document.getElementById('s-category').value,
            district_id: parseInt(document.getElementById('s-district').value),
            description: document.getElementById('s-desc').value
        };

        try {
            await apiRequest('/suggestions/', { method: 'POST', body: JSON.stringify(payload) });
            showToast("Idea submitted to the community!", "success");
            suggForm.reset();
            suggFormCard.classList.add('hidden');
            districtSelect.value = payload.district_id;
            loadSuggestions();
        } catch (error) {
            showToast("Submission failed: " + error.message, "error");
        }
    });

    // Close Modal Logic
    document.getElementById('close-modal-btn')?.addEventListener('click', () => {
        document.getElementById('suggestion-modal').classList.add('hidden');
        document.getElementById('suggestion-modal').classList.remove('flex');
    });

    document.querySelector('.sidebar-btn[data-view="suggestions-view"]').addEventListener('click', loadSuggestions);
}

async function loadSuggestions() {
    const districtId = document.getElementById('forum-district-select').value;
    const feedContainer = document.getElementById('suggestions-feed');
    try {
        currentSuggestions = await apiRequest(`/suggestions/district/${districtId}`);
        feedContainer.innerHTML = '';

        if (currentSuggestions.length === 0) {
            feedContainer.innerHTML = `<div class="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200">No ideas have been proposed for Yaoundé ${districtId} yet. Be the first!</div>`;
            return;
        }

        currentSuggestions.forEach(s => {
            const card = document.createElement('div');
            card.className = "bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex gap-4 items-start transition hover:border-brand-green hover:shadow-md";
            card.innerHTML = `
                <div class="flex flex-col items-center justify-center bg-gray-50 border rounded-lg p-3 min-w-[70px]">
                    <button class="upvote-btn text-gray-400 hover:text-brand-green transition-colors" data-id="${s.id}">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7"></path></svg>
                    </button>
                    <span class="font-bold text-lg text-gray-800" id="vote-count-${s.id}">${s.support_count}</span>
                </div>
                <div class="flex-1">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-2">
                        <h4 class="text-lg font-bold text-gray-900 leading-tight">${s.title}</h4>
                        <span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-semibold border whitespace-nowrap">${s.category}</span>
                    </div>
                    <p class="text-gray-700 text-sm mb-3 line-clamp-2">${s.description}</p>
                    <div class="flex justify-between items-center">
                        <p class="text-gray-400 text-xs font-mono">Posted on: ${new Date(s.created_at).toLocaleDateString()}</p>
                        <button class="view-sugg-btn text-brand-green text-sm font-bold hover:underline" data-id="${s.id}">Read Full Idea →</button>
                    </div>
                </div>
            `;
            feedContainer.appendChild(card);
        });

        document.querySelectorAll('.upvote-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const clickedBtn = e.currentTarget; 
                const suggId = clickedBtn.dataset.id;
                try {
                    const res = await apiRequest(`/suggestions/${suggId}/upvote`, { method: 'PATCH' });
                    document.getElementById(`vote-count-${suggId}`).innerText = res.support_count;
                    clickedBtn.classList.add('text-brand-green');
                } catch (error) {
                    showToast("Failed to upvote: " + error.message, "error");
                }
            });
        });

        document.querySelectorAll('.view-sugg-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openSuggestionModal(e.target.dataset.id));
        });

    } catch (error) {
        showToast("Failed to load forum: " + error.message, "error");
    }
}

function openSuggestionModal(suggId) {
    const sugg = currentSuggestions.find(s => s.id == suggId);
    if (!sugg) return;
    
    document.getElementById('modal-s-title').innerText = sugg.title;
    document.getElementById('modal-s-cat').innerText = sugg.category;
    document.getElementById('modal-s-desc').innerText = sugg.description;
    document.getElementById('modal-s-dist').innerText = sugg.district_id;
    document.getElementById('modal-s-date').innerText = new Date(sugg.created_at).toLocaleDateString();
    
    document.getElementById('suggestion-modal').classList.remove('hidden');
    document.getElementById('suggestion-modal').classList.add('flex');
}