// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { connectFirestoreEmulator, connectAuthEmulator, connectStorageEmulator } from "firebase/firestore";
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
export const db = getFirestore(app);
export const storage = getStorage(app);

// Füge diese Zeilen für lokale Entwicklung hinzu
if (location.hostname === "localhost") {
  // Verbinde mit lokalen Emulatoren
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectStorageEmulator(storage, 'localhost', 9199);
}
