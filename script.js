// =====================================================================
// SCRIPT.JS - NEARBY HOSPITALS FINDER
// =====================================================================

// ⚠️ IMPORTANT: REPLACE THIS WITH YOUR ACTUAL GEOAPIFY API KEY
const GEOAPIFY_API_KEY = "30b234cd872c4cd5a50ea59d1002c5b5";

// Global variables to store the user's location coordinates
let userLat = null;
let userLon = null;

// =====================================================================
// 1. MAP INITIALIZATION AND ICONS
// =====================================================================

// Initialize the map (starts centered, will move later)
let map = L.map('map').setView([0, 0], 1);
let markers = L.layerGroup().addTo(map);

// Add Geoapify tiles to the map
L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`, {
    attribution: 'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | © OpenStreetMap contributors'
}).addTo(map);

// Define a custom highlight icon (Red) for hover
const highlightIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Define the default icon (Green) for hospitals
const defaultIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Icon for the User's Location (Blue)
const userLocationIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    shadowSize: [41, 41]
});


// Get DOM elements
const locationInput = document.getElementById('location-input');
const hospitalList = document.getElementById('hospital-list');
const loadingMessage = document.getElementById('loading-message');

// =====================================================================
// 2. UTILITY FUNCTIONS (Loading and Distance)
// =====================================================================

function showLoading(show) {
    loadingMessage.style.display = show ? 'block' : 'none';
    hospitalList.innerHTML = '<h2>Nearest Hospitals:</h2>';
    markers.clearLayers();
}

/**
 * Haversine Formula: Calculates the distance between two geographical points (in kilometers).
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    
    return distance.toFixed(1) + ' km';
}

// Helper function to return raw distance value for sorting
function calculateDistanceValue(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}


// =====================================================================
// 3. MAIN API CALLS
// =====================================================================

/**
 * Step 1: Geocoding - Convert location name to coordinates (lat/lon)
 */
async function findLocation() {
    const locationName = locationInput.value.trim();
    if (!locationName) {
        alert("Please enter a location.");
        return;
    }

    showLoading(true);

    try {
        const geocodeUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(locationName)}&apiKey=${GEOAPIFY_API_KEY}`;
        
        const response = await fetch(geocodeUrl);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
            const firstResult = data.features[0];
            userLon = firstResult.properties.lon;
            userLat = firstResult.properties.lat;
            
            map.setView([userLat, userLon], 13);
            
            // Add a marker for the user's location
            L.marker([userLat, userLon], {icon: userLocationIcon})
             .bindPopup(`<strong>Your Location:</strong><br>${locationName}`)
             .addTo(markers);

            // Proceed to Step 2
            findNearbyHospitals(userLat, userLon);
        } else {
            showLoading(false);
            hospitalList.innerHTML = '<h2>Nearest Hospitals:</h2><p>Location not found. Please try a different address.</p>';
        }
    } catch (error) {
        showLoading(false);
        console.error("Geocoding Error:", error);
        hospitalList.innerHTML = '<h2>Nearest Hospitals:</h2><p>An error occurred while searching for the location.</p>';
    }
}

/**
 * Step 2: Places API - Find hospitals near the coordinates
 */
async function findNearbyHospitals(lat, lon) {
    // Geoapify Places API category for hospitals
    const categories = 'healthcare.hospital';
    const radiusMeters = 5000; // Search within 5 kilometers

    const placesUrl = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${lon},${lat},${radiusMeters}&limit=20&apiKey=${GEOAPIFY_API_KEY}`;

    try {
        const response = await fetch(placesUrl);
        const data = await response.json();

        showLoading(false);
        displayHospitals(data.features);

    } catch (error) {
        showLoading(false);
        console.error("Places API Error:", error);
        hospitalList.innerHTML = '<h2>Nearest Hospitals:</h2><p>An error occurred while searching for hospitals.</p>';
    }
}


// =====================================================================
// 4. DISPLAY RESULTS AND INTERACTIVITY
// =====================================================================

/**
 * Step 3: Display the results with distance, all details, and card formatting
 */
function displayHospitals(features) {
    if (features.length === 0) {
        hospitalList.innerHTML += '<p>No hospitals found within 5km of this location.</p>';
        return;
    }

    const resultsListContainer = document.createElement('ul');
    resultsListContainer.id = 'list';
    
    // Sort hospitals by distance (ascending)
    features.sort((a, b) => {
        const distA = calculateDistanceValue(userLat, userLon, a.geometry.coordinates[1], a.geometry.coordinates[0]);
        const distB = calculateDistanceValue(userLat, userLon, b.geometry.coordinates[1], b.geometry.coordinates[0]);
        return distA - distB;
    });

    features.forEach((feature, index) => {
        const props = feature.properties;
        const hospitalName = props.name || 'Unknown Hospital';
        const address = props.formatted ? props.formatted : `${props.address_line1 || ''}, ${props.address_line2 || ''}`;
        const websiteUrl = props.website;
        const phoneNumber = props.phone;
        const rating = props.rating;
        const openingHours = props.opening_hours;
        const socialMedia = props.social_media;
        
        const lon = feature.geometry.coordinates[0];
        const lat = feature.geometry.coordinates[1];

        // CALCULATE DISTANCE
        const distance = calculateDistance(userLat, userLon, lat, lon);
        
        // --- URL CREATION ---
        
        // 1. CORRECTED Google Search URL (Always starts with https://)
        const searchHospitalQuery = encodeURIComponent(hospitalName + ' ' + (props.city || address));
        const googleSearchUrl = `https://www.google.com/search?q=${searchHospitalQuery}`;
        
        // 2. CORRECTED Directions URL (Always starts with https://)
        const directionsUrl = `https://www.google.com/maps/dir/${userLat},${userLon}/${lat},${lon}`;
        
        // --- BUILD CARD CONTENT HTML ---
        let cardContent = `<div class="hospital-name">${index + 1}. ${hospitalName}</div>`;
        cardContent += `<div class="hospital-detail">📍 ${address}</div>`;
        
        // 1. Rating/Reviews
        if (rating) {
            const starCount = Math.round(rating);
            const stars = '⭐'.repeat(starCount);
            cardContent += `<div class="hospital-detail rating">Rating: ${stars} (${rating.toFixed(1)})</div>`;
        }

        // 2. Phone Number
        if (phoneNumber) {
            cardContent += `<div class="hospital-detail">📞 <a href="tel:${phoneNumber}" class="phone-link">${phoneNumber}</a></div>`;
        }

        // 3. Opening Hours
        if (openingHours) {
            cardContent += `<div class="hospital-detail hours">⏰ ${openingHours}</div>`;
        }
        
        // 4. Distance
        cardContent += `<span class="distance">Distance: ${distance}</span>`;

        // 5. Link Buttons
        let linkSection = '';
        
        // Add the 'Get Directions' Button
        linkSection += `<a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="website-link directions-link">🗺️ Get Directions</a>`;

        // Add the 'Find it on Google' Button
        linkSection += `<a href="${googleSearchUrl}" target="_blank" rel="noopener noreferrer" class="website-link directions-link">Find it on Google</a>`;
        
        if (websiteUrl) {
            linkSection += `<a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" class="website-link">🌐 Website</a>`;
        }

        if (socialMedia && typeof socialMedia === 'object') {
            for (const platform in socialMedia) {
                const url = socialMedia[platform];
                let icon = '';
                if (platform === 'facebook') icon = '📘';
                else if (platform === 'instagram') icon = '📸';
                else if (platform === 'twitter') icon = '🐦';
                else icon = '🔗';
                
                linkSection += `<a href="${url}" target="_blank" rel="noopener noreferrer" class="website-link">${icon} ${platform.charAt(0).toUpperCase() + platform.slice(1)}</a>`;
            }
        }
        
        if (linkSection) {
            cardContent += `<div class="link-group">${linkSection}</div>`;
        }

        // CREATE FINAL CARD HTML
        const cardHtml = `<div class="hospital-card">${cardContent}</div>`;

        // Add to the list container
        const listItem = document.createElement('li');
        listItem.innerHTML = cardHtml;
        
        // --- CREATE MARKER AND ADD INTERACTIVITY ---
        
        const popupContent = `
            <strong>${hospitalName}</strong><br>
            ${address}<br>
            Distance: <strong>${distance}</strong>
            ${phoneNumber ? `<br>📞 <a href="tel:${phoneNumber}">Call</a>` : ''}
            ${websiteUrl ? `<br><a href="${websiteUrl}" target="_blank" rel="noopener noreferrer">Website</a>` : ''}
            <br><a href="${directionsUrl}" target="_blank" rel="noopener noreferrer">🗺️ Get Directions</a>
            <br><a href="${googleSearchUrl}" target="_blank" rel="noopener noreferrer">Find it on Google</a>
        `;
        
        // Create the marker using the default icon
        const hospitalMarker = L.marker([lat, lon], {icon: defaultIcon})
         .bindPopup(popupContent)
         .addTo(markers);

        // --- HOVER LOGIC TO LINK CARD AND MARKER ---
        const cardElement = listItem.querySelector('.hospital-card');
        
        cardElement.addEventListener('mouseover', () => {
            hospitalMarker.openPopup();
            hospitalMarker.setIcon(highlightIcon); 
        });

        cardElement.addEventListener('mouseout', () => {
            hospitalMarker.closePopup();
            hospitalMarker.setIcon(defaultIcon);
        });

        resultsListContainer.appendChild(listItem);
    });

    hospitalList.appendChild(resultsListContainer);
}

// Attach findLocation to the global window scope so the button can call it
window.findLocation = findLocation;