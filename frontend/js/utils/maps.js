// frontend/js/utils/maps.js

let staffMap = null;
let staffMarker = null;

export function setupStaffMap() {
    const mapOverlay = document.getElementById('staff-map-overlay');
    const closeMapBtn = document.getElementById('close-staff-map-btn');

    if (closeMapBtn && mapOverlay) {
        closeMapBtn.addEventListener('click', () => {
            mapOverlay.classList.add('hidden');
            mapOverlay.classList.remove('flex');
        });
    }
}

export function showStaffMap(lat, lng) {
    const mapOverlay = document.getElementById('staff-map-overlay');
    mapOverlay.classList.remove('hidden');
    mapOverlay.classList.add('flex');
    
    if (typeof google !== 'undefined') {
        const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
        
        if (!staffMap) {
            staffMap = new google.maps.Map(document.getElementById("staff-map"), {
                zoom: 16,
                center: location,
                mapTypeId: 'roadmap',
            });
        } else {
            staffMap.setCenter(location);
            staffMap.setZoom(16);
        }

        if (staffMarker) staffMarker.setMap(null);

        staffMarker = new google.maps.Marker({
            position: location,
            map: staffMap,
            animation: google.maps.Animation.DROP
        });
    }
}