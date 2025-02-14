// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { connectStorageEmulator } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

/*
 * Firebase Konfiguration
 * Diese Daten findest du in der Firebase Console:
 * 1. Gehe zu console.firebase.google.com
 * 2. Wähle dein Projekt
 * 3. Klicke auf das Zahnrad-Symbol (Projekteinstellungen)
 * 4. Scrolle zu "Your apps" und klicke auf das Web-Symbol (</>)
 * 5. Registriere die App falls nötig
 * 6. Kopiere die Konfigurationsdaten hier rein
 */
const firebaseConfig = {
    apiKey: "AIzaSyDfwqJUkCQNXafFRB7hVXupPh0XBoHbdQg",
    authDomain: "bewerbungs-app.firebaseapp.com",
    projectId: "bewerbungs-app",
    storageBucket: "bewerbungs-app.appspot.com",
    messagingSenderId: "540459849039",
    appId: "1:540459849039:web:9eda29b3e754d48472613a",
    measurementId: "G-5QHBC1W4J3"
};

// Initialisiere Firebase mit Fehlerbehandlung
let app, auth, db, rtdb, storage;

try {
    // Prüfe ob notwendige Konfiguration vorhanden
    if (!firebaseConfig.apiKey) {
        throw new Error('Firebase API-Key fehlt in der Konfiguration');
    }

    // Initialisiere Firebase
    app = initializeApp(firebaseConfig);
    console.log('Firebase App initialisiert');

    // Initialisiere Services
    auth = getAuth(app);
    db = getFirestore(app);
    rtdb = getDatabase(app);
    storage = getStorage(app);
    
    console.log('Firebase Services erfolgreich initialisiert');
} catch (error) {
    console.error('Fehler bei der Firebase-Initialisierung:', error);
    // Zeige benutzerfreundliche Fehlermeldung
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:1rem;text-align:center;z-index:9999;';
    errorMessage.textContent = 'Firebase konnte nicht initialisiert werden. Bitte prüfe die Konsole für Details.';
    document.body.appendChild(errorMessage);
    throw error;
}

// Exportiere die Services
export { 
    app,
    auth,
    db,
    rtdb as database,
    storage
};

// Test-Funktion für die Verbindung
export const testFirebaseConnection = async () => {
    if (!app) {
        console.error('Firebase nicht initialisiert');
        return false;
    }

    try {
        // Teste die Authentifizierung
        await auth._getRecaptchaConfig();
        console.log('Firebase Auth Verbindung OK');
        
        // Teste die Firestore-Datenbank
        const testDoc = await db.collection('test').doc('connection').set({
            timestamp: new Date().toISOString(),
            status: 'ok'
        });
        console.log('Firestore Verbindung OK');
        
        return true;
    } catch (error) {
        console.error('Firebase Verbindungsfehler:', error);
        return false;
    }
};

// Entwicklungsmodus für localhost
if (window.location.hostname === 'localhost') {
    console.log('Entwicklungsmodus aktiv - Firebase läuft im Entwicklungsmodus');
}
