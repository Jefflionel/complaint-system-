// frontend/js/utils/offline.js
import { apiRequest } from '../api.js';
import { showToast } from './toast.js';

function logSync(msg, data = null) {
    const timestamp = new Date().toISOString().split('T')[1];
    console.log(`[SYNC ${timestamp}] ${msg}`, data ? data : '');
}

export function initOfflineDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('YaoundeCivicDB', 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('complaints')) {
                db.createObjectStore('complaints', { autoIncrement: true });
            }
        };
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e);
    });
}

export async function saveComplaintOffline(formData) {
    const db = await initOfflineDB();
    const tx = db.transaction('complaints', 'readwrite');
    const store = tx.objectStore('complaints');

    const data = {};
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }

    return new Promise((resolve, reject) => {
        const request = store.add(data);
        request.onsuccess = () => {
            logSync("Saved new complaint offline.");
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

export async function syncOfflineComplaints() {
    logSync("syncOfflineComplaints triggered.");

    // ════ 1. THE AGGRESSIVE LOCALSTORAGE LOCK ════
    const syncLock = localStorage.getItem('sync_in_progress');
    if (syncLock === 'true') {
        logSync("⛔ ABORT: Sync already in progress.");
        return;
    }
    
    localStorage.setItem('sync_in_progress', 'true');
    logSync("🔒 Lock acquired.");

    try {
        const db = await initOfflineDB();

        // Step A: Read records
        const records = await new Promise((resolve, reject) => {
            const tx = db.transaction('complaints', 'readonly');
            const store = tx.objectStore('complaints');
            const dataRequest = store.getAll();
            const keysRequest = store.getAllKeys();

            dataRequest.onsuccess = () => {
                keysRequest.onsuccess = () => {
                    const items = dataRequest.result.map((data, index) => ({
                        key: keysRequest.result[index],
                        data: data
                    }));
                    resolve(items);
                };
            };
            dataRequest.onerror = () => reject(dataRequest.error);
        });

        logSync(`Found ${records.length} records in IndexedDB.`);
        if (records.length === 0) {
             localStorage.removeItem('sync_in_progress');
             logSync("🔓 Lock released (No records).");
             return; 
        }

        // Step B: Atomic Clear
        logSync("Clearing local IndexedDB BEFORE sending...");
        await new Promise((resolve, reject) => {
            const clearTx = db.transaction('complaints', 'readwrite');
            const clearStore = clearTx.objectStore('complaints');
            const clearReq = clearStore.clear();
            clearReq.onsuccess = resolve;
            clearReq.onerror = reject;
        });
        logSync("Local IndexedDB cleared.");

        let syncedCount = 0;
        let failedRecords = []; 

        // Step C: Send to FastAPI
        for (const record of records) {
            const formData = new FormData();
            for (const key in record.data) {
                formData.append(key, record.data[key]);
            }

            try {
                logSync(`Sending record ${record.key} to FastAPI...`);
                await apiRequest('/citizen/complaints/', { method: 'POST', body: formData });
                logSync(`✅ Record ${record.key} sent successfully.`);
                syncedCount++;
            } catch (error) {
                logSync(`❌ Failed to send record ${record.key}:`, error);
                failedRecords.push(record.data);
            }
        }

        // Step D: Restore failures
        if (failedRecords.length > 0) {
            logSync(`Restoring ${failedRecords.length} failed records to IndexedDB.`);
            const restoreTx = db.transaction('complaints', 'readwrite');
            const restoreStore = restoreTx.objectStore('complaints');
            failedRecords.forEach(data => restoreStore.add(data));
        }

        // ════ 2. THE REFRESH SIGNAL ════
        if (syncedCount > 0) {
            showToast(`✅ Successfully synced ${syncedCount} offline complaints!`, 'success');
            logSync("Dispatching 'refreshComplaints' event.");
            window.dispatchEvent(new Event('refreshComplaints'));
        }

    } finally {
        localStorage.removeItem('sync_in_progress');
        logSync("🔓 Lock released (Process complete).");
    }
}

window.addEventListener('online', () => {
    logSync("📡 Browser fired 'online' event.");
    const token = localStorage.getItem('token');
    if (token && localStorage.getItem('user_type') === 'citizen') {
        // Reduced delay to prevent race conditions while user navigates
        setTimeout(() => {
            syncOfflineComplaints();
        }, 500);
    }
});