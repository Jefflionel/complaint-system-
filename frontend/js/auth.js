// frontend/js/auth.js
import { apiRequest } from './api.js';
import { showToast } from './utils/toast.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // ═══════════════════════════════════════════════════════
    // LOGIN LOGIC
    // ═══════════════════════════════════════════════════════
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');

            if (errorDiv) errorDiv.classList.add('hidden');

            try {
                const data = await apiRequest('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                localStorage.setItem('token', data.access_token);
                localStorage.setItem('user_type', data.user_type);
                
                showToast('Login Successful!', 'success');
                
                setTimeout(() => {
                    if (data.user_type === 'staff') {
                        window.location.href = 'staff.html';
                    } else {
                        window.location.href = 'citizen.html';
                    }
                }, 500); 

            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = error.message;
                    errorDiv.classList.remove('hidden');
                } else {
                    showToast('Login Failed: ' + error.message, 'error'); 
                }
            }
        });
    }

    // ═══════════════════════════════════════════════════════
    // REGISTRATION LOGIC
    // ═══════════════════════════════════════════════════════
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const full_name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            
            // NEW: Grab the phone number
            const phone = document.getElementById('reg-phone').value;
            
            const errorDiv = document.getElementById('register-error');

            if (errorDiv) errorDiv.classList.add('hidden');

            try {
                await apiRequest('/auth/register', {
                    method: 'POST',
                    // NEW: Include phone in the JSON payload
                    body: JSON.stringify({ full_name, email, password, phone })
                });

                showToast('Account created successfully! You can now log in.', 'success');
                
                document.getElementById('register-view').classList.add('hidden');
                document.getElementById('login-view').classList.remove('hidden');

            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = error.message;
                    errorDiv.classList.remove('hidden');
                } else {
                    showToast('Registration Failed: ' + error.message, 'error');
                }
            }
        });
    }
});