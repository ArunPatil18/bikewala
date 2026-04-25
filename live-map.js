/**
 * GoGrab Live Map Simulation
 * Creates an Uber-like experience with moving vehicles on a dark-themed map.
 */

class Vehicle {
    constructor(id, type, startLat, startLng, map) {
        this.id = id;
        this.type = type; // 'bike' or 'car'
        this.lat = startLat;
        this.lng = startLng;
        this.map = map;
        this.marker = null;
        this.targetLat = startLat;
        this.targetLng = startLng;
        this.speed = 0.00005 + Math.random() * 0.0001;
        this.isMoving = false;
        
        this.initMarker();
    }

    initMarker() {
        const iconHtml = `
            <div class="marker-icon-wrapper ${this.type}">
                <i class="fa-solid fa-${this.type === 'bike' ? 'motorcycle' : 'car'}"></i>
            </div>
        `;
        
        const customIcon = L.divIcon({
            className: `custom-${this.type}-marker`,
            html: iconHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        this.marker = L.marker([this.lat, this.lng], { icon: customIcon }).addTo(this.map);
    }

    update() {
        if (!this.isMoving) {
            // Pick a new target occasionally
            if (Math.random() > 0.98) {
                this.setNewTarget();
            }
            return;
        }

        // Move towards target
        const dLat = this.targetLat - this.lat;
        const dLng = this.targetLng - this.lng;
        const distance = Math.sqrt(dLat * dLat + dLng * dLng);

        if (distance < 0.0001) {
            this.isMoving = false;
            this.marker.getElement().querySelector('.marker-icon-wrapper').classList.remove('moving');
        } else {
            this.lat += (dLat / distance) * this.speed;
            this.lng += (dLng / distance) * this.speed;
            this.marker.setLatLng([this.lat, this.lng]);
            
            // Rotate marker towards movement
            const angle = Math.atan2(dLat, dLng) * (180 / Math.PI);
            const iconWrapper = this.marker.getElement().querySelector('.marker-icon-wrapper');
            iconWrapper.style.transform = `rotate(${90 - angle}deg)`;
        }
    }

    setNewTarget() {
        // Target is within ~500m
        this.targetLat = this.lat + (Math.random() - 0.5) * 0.01;
        this.targetLng = this.lng + (Math.random() - 0.5) * 0.01;
        this.isMoving = true;
        
        const el = this.marker.getElement();
        if (el) {
            el.querySelector('.marker-icon-wrapper').classList.add('moving');
        }
    }
}

let map = null;
let vehicles = [];
let animationId = null;

export function initLiveMap(centerLat = 12.9716, centerLng = 77.5946) {
    if (map) return;

    map = L.map('live-map', {
        zoomControl: false,
        attributionControl: false
    }).setView([centerLat, centerLng], 15);

    // Use CartoDB Dark Matter tiles (dark mode)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    // Add zoom control at bottom right
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // Add user marker
    const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: '<div style="width: 15px; height: 15px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px #3b82f6;"></div>',
        iconSize: [15, 15]
    });
    L.marker([centerLat, centerLng], { icon: userIcon }).addTo(map);

    // Spawn initial vehicles
    spawnVehicles(centerLat, centerLng);
    
    // Start animation loop
    startSimulation();
}

function spawnVehicles(lat, lng) {
    for (let i = 0; i < 8; i++) {
        const type = Math.random() > 0.3 ? 'bike' : 'car';
        const vLat = lat + (Math.random() - 0.5) * 0.015;
        const vLng = lng + (Math.random() - 0.5) * 0.015;
        vehicles.push(new Vehicle(i, type, vLat, vLng, map));
    }
    updateCount();
}

function updateCount() {
    const countEl = document.getElementById('nearby-count');
    if (countEl) {
        countEl.textContent = `${vehicles.length} Vehicles Nearby`;
    }
}

function startSimulation() {
    function animate() {
        vehicles.forEach(v => v.update());
        animationId = requestAnimationFrame(animate);
    }
    animate();
}

export function openMap() {
    const overlay = document.getElementById('map-overlay');
    overlay.style.display = 'flex';
    
    // Default to Bangalore Koramangala if geolocation fails
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                initLiveMap(pos.coords.latitude, pos.coords.longitude);
            },
            () => {
                initLiveMap(12.9352, 77.6245); // Koramangala
            }
        );
    } else {
        initLiveMap(12.9352, 77.6245);
    }
}

export function closeMap() {
    const overlay = document.getElementById('map-overlay');
    overlay.style.display = 'none';
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// Bind close button
document.getElementById('close-map-btn')?.addEventListener('click', closeMap);
