// frontend/js/utils/analytics.js
import { apiRequest } from '../api.js';
import { showToast } from './toast.js';

let statusChartInstance = null;
let categoryChartInstance = null;

export async function loadAnalytics() {
    try {
        const data = await apiRequest('/staff/complaints/analytics');
        
        renderStatusChart(data.statuses);
        renderCategoryChart(data.categories);
        
        return true; // Tells the button it succeeded

    } catch (error) {
        console.error("Failed to load analytics:", error);
        showToast("Error loading chart data: " + error.message, "error");
        
        // If it's a 403 or 401 error, force them to log in again!
        if (error.message.includes("Access denied") || error.message.includes("Invalid")) {
            setTimeout(() => {
                localStorage.clear();
                window.location.href = 'index.html';
            }, 2000);
        }
        return false;
    }
}

function renderStatusChart(statusData) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    if (statusChartInstance) statusChartInstance.destroy();

    const labels = Object.keys(statusData);
    const data = Object.values(statusData);

    const bgColors = labels.map(label => {
        if (label === 'Pending') return '#fef08a'; 
        if (label === 'In Progress') return '#bfdbfe'; 
        if (label === 'Resolved') return '#bbf7d0'; 
        if (label === 'Rejected') return '#fecaca'; 
        return '#e5e7eb'; 
    });

    const borderColors = labels.map(label => {
        if (label === 'Pending') return '#ca8a04';
        if (label === 'In Progress') return '#2563eb';
        if (label === 'Resolved') return '#16a34a';
        if (label === 'Rejected') return '#dc2626';
        return '#9ca3af';
    });

    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderCategoryChart(categoryData) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    if (categoryChartInstance) categoryChartInstance.destroy();

    const labels = Object.keys(categoryData).map(k => k.replace(/_/g, ' '));
    const data = Object.values(categoryData);

    categoryChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Reports',
                data: data,
                backgroundColor: '#16a34a', 
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// ═══════════════════════════════════════════════════════
// UPGRADED REFRESH BUTTON LOGIC
// ═══════════════════════════════════════════════════════
export function setupAnalyticsEvents() {
    const refreshBtn = document.getElementById('refresh-charts-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            // 1. Save original button HTML and disable it
            const originalHtml = refreshBtn.innerHTML;
            refreshBtn.disabled = true;
            refreshBtn.classList.add('opacity-50', 'cursor-not-allowed');
            refreshBtn.innerHTML = '⏳ Refreshing...';

            // 2. WAIT for the API call to finish
            const success = await loadAnalytics();
            
            // 3. Only show success toast if it actually worked
            if (success) {
                showToast("Charts updated!", "success");
            }

            // 4. Restore the button
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            refreshBtn.innerHTML = originalHtml;
        });
    }
}