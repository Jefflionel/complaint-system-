// frontend/js/auth.js
import { apiRequest } from './api.js';
import { showToast } from './utils/toast.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // ════ PWA OFFLINE AUTO-LOGIN ════
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('user_type');
    
    // If they already have a session, skip the login screen entirely!
    if (token && userType) {
        window.location.href = userType === 'staff' ? 'staff.html' : 'citizen.html';
        return; 
    }

    // ═══════════════════════════════════════════════════════
    // LOGIN LOGIC
    // ═══════════════════════════════════════════════════════
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            // Protect against trying to authenticate without internet
            if (!navigator.onLine) {
                showToast('You must be connected to the internet to log in for the first time.', 'error');
                return;
            }
            
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
            
            if (!navigator.onLine) {
                showToast('You must be connected to the internet to register.', 'error');
                return;
            }
            
            const full_name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const phone = document.getElementById('reg-phone').value;
            
            const errorDiv = document.getElementById('register-error');
            if (errorDiv) errorDiv.classList.add('hidden');

            try {
                await apiRequest('/auth/register', {
                    method: 'POST',
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