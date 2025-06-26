// Array of starting cities with coordinates (longitude, latitude)
const startingCities = [
    { name: "London", coords: [-0.1276, 51.5074] },
    { name: "New York", coords: [-74.0060, 40.7128] },
    { name: "Tokyo", coords: [139.6917, 35.6895] },
    { name: "Berlin", coords: [13.4050, 52.5200] },
    { name: "Sydney", coords: [151.2093, -33.8688] },
    { name: "Paris", coords: [2.3522, 48.8566] },
    { name: "Toronto", coords: [-79.3832, 43.6532] },
    { name: "São Paulo", coords: [-46.6333, -23.5505] },
];

// Select a random city from the array
const randomCity = startingCities[Math.floor(Math.random() * startingCities.length)];
const startingCoords = randomCity.coords;

// Initialize the map with random starting city coordinates
const map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/positron",
    center: startingCoords, // Use the random city coordinates
    zoom: 14,
});



// Initialize the polyline starting at the random city's coordinates
const geojson = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: [startingCoords], // Use the random city coordinates
            },
        },
    ],
};

let directionX = 0.0001; // Small increment for smoother movement
let directionY = 0;
const speedFactor = 0.0001;
let animation; // Store animation reference
const collisionThreshold = 0.00005; // Distance threshold for collision detection
let maxLength = 200;
let markerPosition; // Store marker position
const markerProximityThreshold = 50; // Proximity threshold in meters
const growthAmount = 200; // Growth amount in meters
let snakeGrowing = false; // Flag to indicate if the snake is currently growing
let newScore = 0; // Initialize score

// Create a marker for the random point
let randomMarker;

map.on("load", () => {
    // Set up the map layers, sources, and styles but don't start the game yet
    map.addSource("line", { type: "geojson", data: geojson });

    map.addLayer({
        id: "line-animation",
        type: "line",
        source: "line",
        layout: {
            "line-cap": "round",
            "line-join": "round",
        },
        paint: {
            "line-color": "#ed6498",
            "line-width": 5,
            "line-opacity": 0.8,
        },
    });
  
  // Add direction change via arrow keys
        document.addEventListener("keydown", (e) => {
          if (e.key === "ArrowUp") {
            directionX = 0;
            directionY = speedFactor;
          }
          if (e.key === "ArrowDown") {
            directionX = 0;
            directionY = -speedFactor;
          }
          if (e.key === "ArrowLeft") {
            directionX = -speedFactor;
            directionY = 0;
          }
          if (e.key === "ArrowRight") {
            directionX = speedFactor;
            directionY = 0;
          }
        });

    // Listen for the Start button click to begin the game
    document.getElementById("startButton").addEventListener("click", startGame);
});

function addRandomMarker() {
    const bounds = map.getBounds();
    const northEast = bounds.getNorthEast();
    const southWest = bounds.getSouthWest();

    // Generate random coordinates within the bounds
    const randomLng = Math.random() * (northEast.lng - southWest.lng) + southWest.lng;
    const randomLat = Math.random() * (northEast.lat - southWest.lat) + southWest.lat;

    // Store marker position
    markerPosition = [randomLng, randomLat];

    // Create a marker and add it to the map
    const el = document.createElement("div");
    el.className = "marker";
    el.style.backgroundColor = "#FF0000"; // Red color for the marker
    el.style.width = "10px";
    el.style.height = "10px";
    el.style.borderRadius = "50%";

    randomMarker = new maplibregl.Marker(el).setLngLat(markerPosition).addTo(map);
}

function animateLine() {
    const currentCoords = geojson.features[0].geometry.coordinates;
    const lastCoord = currentCoords[currentCoords.length - 1];

    // Add new point based on direction
    const newCoord = [lastCoord[0] + directionX, lastCoord[1] + directionY];
    currentCoords.push(newCoord);

    // Check for collision with itself
    if (checkCollision(newCoord, currentCoords)) {
        gameOver();
        return;
    }

    // Check for proximity to the marker
    if (markerPosition && isNearMarker(newCoord, markerPosition)) {
        growSnake();
        removeMarker();
    }

    // Limit the snake's length
    while (getTotalLength(currentCoords) > maxLength) {
        currentCoords.shift(); // Remove the oldest point
    }

    // Update the GeoJSON source
    map.getSource("line").setData(geojson);

    // Request the next frame
    animation = requestAnimationFrame(animateLine);
}

// Check if the new point is close to the marker
function isNearMarker(newCoord, markerPos) {
    const distance = haversineDistance(newCoord, markerPos);
    return distance <= markerProximityThreshold; // Check within 50 meters
}

// Grow the snake by increasing the length and updating the score
function growSnake() {
    snakeGrowing = true;

    const lastCoord = geojson.features[0].geometry.coordinates[geojson.features[0].geometry.coordinates.length - 1];

    // Increase the length of the snake by adding extra coordinates
    for (let i = 0; i < Math.floor(growthAmount / 1); i++) {
        const newGrowthCoord = [
            lastCoord[0] + directionX,
            lastCoord[1] + directionY,
        ];
        geojson.features[0].geometry.coordinates.push(newGrowthCoord);
    }

    // Increase the maximum length after growing
    maxLength += growthAmount;

    // Update and display the score
    newScore += growthAmount / 1; // Assuming each growth step adds to the score
    document.getElementById("score").innerText = `Score: ${newScore}`; // Update the score display
}

// Remove the marker from the map and add a new one
function removeMarker() {
    if (randomMarker) {
        randomMarker.remove();
        randomMarker = null; // Clear reference
        markerPosition = null; // Clear position
        addRandomMarker(); // Add a new random marker after removing the old one
    }
}

// Check for collision by seeing if new point is close to any previous points
function checkCollision(newCoord, coordinates) {
    for (let i = 0; i < coordinates.length - 1; i++) {
        const point = coordinates[i];
        const distance = Math.sqrt(Math.pow(newCoord[0] - point[0], 2) + Math.pow(newCoord[1] - point[1], 2));
        if (distance < collisionThreshold) {
            return true;
        }
    }
    return false;
}

// Calculate the total length of the snake in meters
function getTotalLength(coordinates) {
    let totalLength = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        totalLength += haversineDistance(coordinates[i], coordinates[i + 1]);
    }
    return totalLength;
}

// Haversine formula to calculate distance between two points in meters
function haversineDistance(coord1, coord2) {
    const R = 6371000; // Radius of the Earth in meters
    const lat1 = (coord1[1] * Math.PI) / 180;
    const lat2 = (coord2[1] * Math.PI) / 180;
    const deltaLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
    const deltaLon = ((coord2[0] - coord1[0]) * Math.PI) / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
}

// Game over function
function gameOver() {
    cancelAnimationFrame(animation);
    
    // Retrieve the current personal best from localStorage
    const personalBest = parseInt(localStorage.getItem("personalBest")) || 0;

    // If the new score is higher than the personal best, update personalBest in localStorage
    if (newScore > personalBest) {
        localStorage.setItem("personalBest", newScore);
    }

    // Display the new score and personal best with the Play Again button
    const finalPersonalBest = Math.max(newScore, personalBest);
    document.getElementById("gameOverMessage").innerHTML = `
       Game Over! <br><br> Your Score: ${newScore} <br> Your Personal Best: ${finalPersonalBest} <br>
       <button id="playAgainButton">Play Again</button>
    `;

    // Show the game over message
    document.getElementById("gameOverMessage").style.display = "block";

    // Attach the event listener to the new Play Again button
    document.getElementById("playAgainButton").addEventListener("click", resetGame);

    // Save the score to localStorage
    localStorage.setItem("score", newScore);

    // Remove the random marker if it exists
    if (randomMarker) {
        randomMarker.remove();
        randomMarker = null; // Clear reference
        markerPosition = null; // Clear position
    }
}


document.getElementById("startButton").addEventListener("click", startGame);

function startGame() {
    // Hide the start button and game over message div
    document.getElementById("gameOverMessage").style.display = "none";

    // Select a random starting city and initialize the game
     const startingCoords = randomCity.coords;

    // Reset the snake's position and set up the game state
    geojson.features[0].geometry.coordinates = [startingCoords];
    maxLength = 200;
    directionX = 0.0001;
    directionY = 0;
    newScore = 0;
    document.getElementById("score").innerText = "Score: 0";

    // Center the map and add the first random marker
    map.setCenter(startingCoords);
    addRandomMarker();
    animateLine();
}


function resetGame() {
    // Hide the game over message and the button
    document.getElementById("gameOverMessage").style.display = "none";
    document.getElementById("playAgainButton").style.display = "none"; 

    // Select a new random city from the array
    const randomCity = startingCities[Math.floor(Math.random() * startingCities.length)];
    const startingCoords = randomCity.coords;

    // Reset snake position
    geojson.features[0].geometry.coordinates = [startingCoords]; // Reset snake position to the new city
    maxLength = 200; // Reset maximum length
    directionX = 0.0001; // Reset direction
    directionY = 0; // Reset direction
    newScore = 0; // Reset score
    document.getElementById("score").innerText = "Score: 0"; // Reset score display

    // Center the map on the new random city
    map.setCenter(startingCoords);

    addRandomMarker(); // Add a new random marker
    animateLine(); // Start animation
}
