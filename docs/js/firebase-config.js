// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator, collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, connectStorageEmulator, ref, uploadString } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getDatabase, connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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
export const firebaseConfig = {
    apiKey: "AIzaSyDfwqJUkCQNXafFRB7hVXupPh0XBoHbdQg",
    authDomain: "bewerbungs-app.firebaseapp.com",
    projectId: "bewerbungs-app",
    storageBucket: "bewerbungs-app.appspot.com",
    messagingSenderId: "540459849039",
    appId: "1:540459849039:web:9eda29b3e754d48472613a",
    measurementId: "G-5QHBC1W4J3",
    databaseURL: "https://bewerbungs-app.firebaseio.com"
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

// Entwicklungsmodus für localhost
if (window.location.hostname === 'localhost') {
    // Emulator-Verbindungen für lokale Entwicklung
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    connectDatabaseEmulator(rtdb, "localhost", 9000);
    
    console.log('Firebase läuft im Entwicklungsmodus');
}

// Test-Funktion für die Firebase-Verbindung
export async function testFirebaseConnection() {
    try {
        // Test Auth
        await auth._getRecaptchaConfig();
        console.log('✓ Firebase Auth Verbindung OK');

        // Test Firestore
        const testCollection = collection(db, 'test');
        const testDocRef = doc(testCollection, 'connection');
        await setDoc(testDocRef, {
            timestamp: new Date().toISOString(),
            status: 'ok'
        });
        console.log('✓ Firestore Verbindung OK');

        // Test Storage
        const testRef = ref(storage, 'test/connection.txt');
        await uploadString(testRef, 'test');
        console.log('✓ Storage Verbindung OK');

        // Test Realtime Database
        const testRef2 = rtdb.ref('test/connection');
        await testRef2.set({
            timestamp: new Date().toISOString(),
            status: 'ok'
        });
        console.log('✓ Realtime Database Verbindung OK');

        return true;
    } catch (error) {
        console.error('Firebase Verbindungsfehler:', error);
        throw new Error('Firebase Verbindung fehlgeschlagen: ' + error.message);
    }
}

// Exportiere die Services
export { 
    app,
    auth,
    db,
    rtdb as database,
    storage
};
