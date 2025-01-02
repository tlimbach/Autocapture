let db; // IndexedDB-Instanz
let stream; // Kamera-Stream
let photoInterval; // Intervall für die automatische Fotoaufnahme

// IndexedDB initialisieren
function initDatabase() {
    const request = indexedDB.open("PhotoApp", 1);

    request.onupgradeneeded = function (event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains("photos")) {
            db.createObjectStore("photos", { keyPath: "id" });
        }
    };

    request.onsuccess = function (event) {
        db = event.target.result;
        console.log("Datenbank initialisiert");
    };

    request.onerror = function (event) {
        console.error("Fehler beim Initialisieren der Datenbank:", event.target.errorCode);
    };
}

// Funktion: Kamera starten
async function startCamera() {
    const videoElement = document.createElement('video');
    videoElement.setAttribute('playsinline', 'true'); // Verhindert Vollbild auf iOS
    document.body.appendChild(videoElement);

    try {
        // Zugriff auf die Rückkamera mit Zoomfaktor 2
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment",
                advanced: [{ zoom: 2 }]
            }
        });

        videoElement.srcObject = stream;
        videoElement.play();

        console.log("Kamera gestartet");

        // Automatische Fotoaufnahme alle 2 Sekunden
        photoInterval = setInterval(() => captureAndSavePhoto(videoElement), 2000);
    } catch (error) {
        console.error("Fehler beim Zugriff auf die Kamera:", error);
    }
}

// Funktion: Foto aufnehmen und in IndexedDB speichern
function captureAndSavePhoto(videoElement) {
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const context = canvas.getContext("2d");

    // Zeichne das aktuelle Video-Frame auf die Canvas
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Konvertiere die Canvas in Base64
    const photoData = canvas.toDataURL("image/jpeg");

    // Speichere das Foto in IndexedDB
    const transaction = db.transaction(["photos"], "readwrite");
    const store = transaction.objectStore("photos");
    const id = Date.now(); // Eindeutige ID basierend auf Zeitstempel
    store.add({ id, photoData });

    console.log(`Foto gespeichert mit ID: ${id}`);
}

// Funktion: Fotos aus IndexedDB abrufen und anzeigen
function displayPhotos() {
    const transaction = db.transaction(["photos"], "readonly");
    const store = transaction.objectStore("photos");
    const request = store.getAll(); // Hole alle Fotos

    request.onsuccess = function () {
        const photos = request.result;

        // Zeige jedes Foto im DOM an
        photos.forEach(photo => {
            const img = document.createElement("img");
            img.src = photo.photoData; // Base64-Daten
            img.style.width = "200px"; // Optional: Größe des Bildes anpassen
            img.style.margin = "10px";

            // Füge einen Download-Button hinzu
            const downloadButton = document.createElement("button");
            downloadButton.textContent = "Speichern";
            downloadButton.onclick = () => savePhoto(photo.photoData);

            const container = document.createElement("div");
            container.appendChild(img);
            container.appendChild(downloadButton);
            document.body.appendChild(container);
        });
    };

    request.onerror = function () {
        console.error("Fehler beim Abrufen der Fotos:", request.error);
    };
}

// Funktion: Foto als Datei speichern
function savePhoto(photoData) {
    const a = document.createElement("a");
    a.href = photoData;
    a.download = `photo_${Date.now()}.jpg`; // Generiere Dateiname
    a.click();
    console.log("Foto heruntergeladen");
}

// Funktion: Kamera und Intervall stoppen
function stopCamera() {
    clearInterval(photoInterval); // Stoppe die automatische Fotoaufnahme
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    console.log("Kamera gestoppt");
}

// Starte die Datenbank und die Kamera
initDatabase();
startCamera();

// Beispiel: Fotos anzeigen lassen
document.getElementById("showPhotosBtn").addEventListener("click", displayPhotos);

// Beispiel: Kamera stoppen
document.getElementById("stopCameraBtn").addEventListener("click", stopCamera);