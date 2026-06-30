// frontend/js/api.js

const isLocal = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') || window.location.protocol === 'file:';
const BASE_URL = isLocal ? 'http://localhost:8000/api' : 'https://citizenhub-api-xz2y.onrender.com/api';

export async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem("token");
    
    // Start with our default headers
    const headers = {
        ...(token && { "Authorization": `Bearer ${token}` }),
        ...options.headers
    };

    // If we are sending a file (FormData), we MUST let the browser 
    // set the Content-Type automatically. Otherwise, default to JSON.
    if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers: headers
        });

        // Auto-Logout if the 7-day token is expired or invalid
        if (response.status === 401) {
            // THE FIX: If they are actively trying to log in, don't refresh the page!
            // Let the error pass through to auth.js so the user sees "Wrong Password"
            if (endpoint === '/auth/login') {
                throw new Error("Invalid email or password.");
            }
            
            console.warn("Session expired. Logging out.");
            localStorage.removeItem("token");
            localStorage.removeItem("user_type");
            window.location.reload(); 
            return;
        }

        const data = await response.json();

        // Throw an error if the backend rejected the request (e.g., 400 or 422)
        if (!response.ok) {
            let errorMessage = "Something went wrong.";
            if (typeof data.detail === 'string') {
                errorMessage = data.detail; // Standard text error
            } else if (Array.isArray(data.detail)) {
                // FastAPI 422 Validation Error! Grab the exact field that failed.
                const fieldName = data.detail[0].loc[data.detail[0].loc.length - 1];
                const issue = data.detail[0].msg;
                errorMessage = `Form Error on '${fieldName}': ${issue}`;
            }
            throw new Error(errorMessage);
        }

        return data;

    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}