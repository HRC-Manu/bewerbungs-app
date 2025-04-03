/**
 * Firebase Konfiguration v1.0.1
 * Letzte Aktualisierung: 2024
 */

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    connectAuthEmulator,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    connectFirestoreEmulator, 
    collection, 
    doc, 
    setDoc,
    getDocs,
    query,
    limit,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getStorage, 
    connectStorageEmulator,
    ref as storageRef,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { 
    getDatabase, 
    connectDatabaseEmulator,
    ref as dbRef,
    set as dbSet
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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
    databaseURL: "https://bewerbungs-app-default-rtdb.europe-west1.firebasedatabase.app"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);
const storage = getStorage(app);

// Helper-Funktionen
async function signIn(email, password) {
    try {
        return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error('Sign in error:', error);
        throw error;
    }
}

async function signUp(email, password) {
    try {
        return await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error('Sign up error:', error);
        throw error;
    }
}

async function logOut() {
    try {
        await signOut(auth);
        console.log("User logged out");
        return true;
    } catch (error) {
        console.error('Sign out error:', error);
        throw error;
    }
}

function initAuthObserver(callback) {
    return onAuthStateChanged(auth, callback);
}

async function testFirebaseConnection() {
    try {
        const testCollection = collection(db, 'connection_test');
        const testQuery = query(testCollection, limit(1));
        await getDocs(testQuery);
        console.log("Firebase connection successful");
        return true;
    } catch (error) {
        console.error('Firebase connection test failed:', error);
        return false;
    }
}

// SINGLE EXPORT BLOCK - verhindert doppelte Exporte
export {
    app,
    auth,
    db,
    database,
    storage,
    signIn,
    signUp,
    logOut,
    initAuthObserver,
    testFirebaseConnection
};

// Füge Hilfsfunktionen für den Lebenslauf-Upload hinzu
export async function uploadResumeFile(file, userId) {
    if (!file || !userId) return null;
    
    try {
        const timestamp = new Date().getTime();
        const path = `resumes/${userId}/${timestamp}_${file.name}`;
        const fileRef = storageRef(storage, path);
        
        // Datei hochladen
        const snapshot = await uploadBytes(fileRef, file);
        
        // Download-URL abrufen
        const downloadURL = await getDownloadURL(fileRef);
        
        // Metadaten in Firestore speichern
        const docRef = await addDoc(collection(db, "resumes"), {
            userId: userId,
            fileName: file.name,
            filePath: path,
            fileUrl: downloadURL,
            contentType: file.type,
            size: file.size,
            uploadedAt: serverTimestamp()
        });
        
        console.log("Lebenslauf hochgeladen, Dokument-ID:", docRef.id);
        return {
            id: docRef.id,
            url: downloadURL,
            path: path
        };
    } catch (error) {
        console.error("Fehler beim Hochladen des Lebenslaufs:", error);
        throw error;
    }
}
