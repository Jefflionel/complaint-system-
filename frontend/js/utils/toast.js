// frontend/js/utils/toast.js

export function showToast(message, type = 'success') {
    // 1. Find or create the notification container
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        // Positioned at the top right of the screen
        container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
        document.body.appendChild(container);
    }

    // 2. Create the specific toast message
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-brand-green' : 'bg-red-600';
    
    // Tailwind classes for sliding animation and styling
    toast.className = `${bgColor} text-white px-6 py-4 rounded-lg shadow-2xl transform transition-all duration-300 translate-x-full opacity-0 flex items-center justify-between min-w-[250px]`;

    toast.innerHTML = `
        <span class="font-semibold text-sm">${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-4 text-white hover:text-gray-200 font-bold focus:outline-none">&times;</button>
    `;

    container.appendChild(toast);

    // 3. Trigger the slide-in animation
    setTimeout(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    }, 10);

    // 4. Auto-remove the toast after 4 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300); // Wait for animation to finish before deleting
    }, 4000);
}