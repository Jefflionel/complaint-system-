// frontend/js/utils/profile.js
import { apiRequest } from '../api.js';
import { showToast } from './toast.js';

export async function initProfile() {
    const profileDisplay = document.getElementById('profile-display');
    const profileForm = document.getElementById('profile-form');
    
    if (!profileDisplay || !profileForm) return;

    // 1. Determine Who is Logged In
    const userType = localStorage.getItem('user_type'); // 'citizen' or 'staff'
    const endpoint = userType === 'staff' ? '/auth/staff/me' : '/auth/me';

    // 2. Hide Phone Elements if Staff
    if (userType === 'staff') {
        const phoneDisplayCard = document.getElementById('d-phone')?.parentElement;
        if (phoneDisplayCard) phoneDisplayCard.classList.add('hidden');
        
        const phoneInputDiv = document.getElementById('p-phone')?.parentElement;
        if (phoneInputDiv) phoneInputDiv.classList.add('hidden');
    }

    const editBtn = document.getElementById('edit-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');

    const showEditForm = () => {
        profileDisplay.classList.add('hidden');
        profileForm.classList.remove('hidden');
    };

    const hideEditForm = () => {
        profileForm.classList.add('hidden');
        profileDisplay.classList.remove('hidden');
        document.getElementById('p-password').value = ''; 
    };

    if (editBtn) editBtn.addEventListener('click', showEditForm);
    if (cancelBtn) cancelBtn.addEventListener('click', hideEditForm);

    const loadProfileData = async () => {
        try {
            // Dynamically hits the correct API endpoint!
            const userData = await apiRequest(endpoint);
            
            const name = userData.identity?.full_name || 'Not provided';
            const phone = userData.identity?.phone || 'Not provided';
            const email = userData.email || '';

            if (document.getElementById('d-name')) document.getElementById('d-name').innerText = name;
            if (document.getElementById('d-phone')) document.getElementById('d-phone').innerText = phone;
            if (document.getElementById('d-email')) document.getElementById('d-email').innerText = email;

            if (document.getElementById('p-email')) document.getElementById('p-email').value = email;
            
            // Prevent 'Not provided' from showing up in the edit input boxes
            if (document.getElementById('p-name')) document.getElementById('p-name').value = name === 'Not provided' ? '' : name;
            if (document.getElementById('p-phone')) document.getElementById('p-phone').value = phone === 'Not provided' ? '' : phone;

        } catch(err) {
            console.error("❌ API Fetch Failed:", err);
        }
    };

    await loadProfileData();

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {};
        const name = document.getElementById('p-name').value;
        const phone = document.getElementById('p-phone').value;
        const password = document.getElementById('p-password').value;

        if (name) payload.full_name = name;
        if (password) payload.password = password;
        
        // Only send the phone number if they are NOT a staff member
        if (phone && userType !== 'staff') {
            payload.phone = phone; 
        }

        try {
            await apiRequest(endpoint, { method: 'PATCH', body: JSON.stringify(payload) });
            showToast("Profile updated successfully!", "success");
            await loadProfileData();
            hideEditForm();
        } catch (error) {
            showToast("Failed to update profile: " + error.message, "error");
        }
    });
}