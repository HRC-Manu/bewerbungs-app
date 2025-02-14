// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { connectFirestoreEmulator, connectAuthEmulator, connectStorageEmulator, connectDatabaseEmulator } from "firebase/firestore";
import { ref, set } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCHk2S2_39IabzaufFOeCzBUKircJ1o6DU",
  authDomain: "bewerbuns-app.firebaseapp.com",
  projectId: "bewerbuns-app",
  storageBucket: "bewerbuns-app.appspot.com",
  messagingSenderId: "122307283908",
  appId: "1:122307283908:web:2db2a8ed81a4a825f87291",
  measurementId: "G-FFMJ9NFFPK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

// Test-Funktion hinzufügen
export const testFirebaseConnection = async () => {
  try {
    // Teste die Datenbankverbindung
    const testRef = ref(db, 'test');
    await set(testRef, {
      message: 'Test erfolgreich',
      timestamp: new Date().toISOString()
    });
    console.log('Firebase-Verbindung erfolgreich!');
    return true;
  } catch (error) {
    console.error('Firebase-Verbindungsfehler:', error);
    return false;
  }
};

// Füge diese Zeilen für lokale Entwicklung hinzu
if (location.hostname === "localhost") {
  // Verbinde mit lokalen Emulatoren
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectStorageEmulator(storage, 'localhost', 9199);
  connectDatabaseEmulator(db, "localhost", 9000);
}
