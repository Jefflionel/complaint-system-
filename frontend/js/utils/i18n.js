// frontend/js/utils/i18n.js

let currentTranslations = {};
let currentLang = localStorage.getItem('app_lang') || 'en';

export async function initI18n() {
    await loadLanguage(currentLang);

    const enBtn = document.getElementById('lang-en-btn');
    const frBtn = document.getElementById('lang-fr-btn');

    function updateLangButtons() {
        if (!enBtn || !frBtn) return;
        if (currentLang === 'en') {
            enBtn.className = 'px-4 py-1.5 rounded text-sm font-bold transition-colors bg-white shadow-sm text-green-700';
            frBtn.className = 'px-4 py-1.5 rounded text-sm font-bold transition-colors text-gray-500 hover:text-gray-700';
        } else {
            frBtn.className = 'px-4 py-1.5 rounded text-sm font-bold transition-colors bg-white shadow-sm text-green-700';
            enBtn.className = 'px-4 py-1.5 rounded text-sm font-bold transition-colors text-gray-500 hover:text-gray-700';
        }
    }

    // Set initial visual state to match persisted language
    updateLangButtons();

    if (enBtn) {
        enBtn.addEventListener('click', async () => {
            await loadLanguage('en');
            updateLangButtons();
        });
    }

    if (frBtn) {
        frBtn.addEventListener('click', async () => {
            await loadLanguage('fr');
            updateLangButtons();
        });
    }
}

async function loadLanguage(lang) {
    try {
        const response = await fetch(`./locales/${lang}.json`);
        currentTranslations = await response.json();
        currentLang = lang;
        localStorage.setItem('app_lang', lang);
        applyTranslations();
    } catch (error) {
        console.error("Failed to load language file:", error);
    }
}

export function applyTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');

    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');

        // Split the key (e.g., "sidebar.dashboard" -> ["sidebar", "dashboard"])
        const keys = key.split('.');
        let text = currentTranslations;

        for (const k of keys) {
            text = text[k];
            if (!text) break;
        }

        if (text && typeof text === 'string') {
            // Check if it's an input placeholder or normal text
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                el.setAttribute('placeholder', text);
            } else {
                // If it contains a child SVG (like our icon buttons), preserve the SVG
                const svg = el.querySelector('svg');
                if (svg) {
                    el.innerHTML = '';
                    el.appendChild(svg);
                    el.appendChild(document.createTextNode(' ' + text));
                } else {
                    el.innerText = text;
                }
            }
        }
    });
}

// t() — use this in JS to get a translated string dynamically
export function t(key) {
    const keys = key.split('.');
    let text = currentTranslations;
    for (const k of keys) {
        if (text === undefined || text === null) return key;
        text = text[k];
    }
    return typeof text === 'string' ? text : key;
}
