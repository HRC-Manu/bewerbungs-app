// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    connectAuthEmulator,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    connectFirestoreEmulator, 
    collection, 
    doc, 
    setDoc,
    getDocs,
    query,
    limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getStorage, 
    connectStorageEmulator, 
    ref, 
    uploadString,
    deleteObject 
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

// Auth-Funktionen
export async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('✓ Anmeldung erfolgreich');
        return userCredential.user;
    } catch (error) {
        console.error('Anmeldefehler:', error);
        throw error;
    }
}

export async function signUp(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('✓ Registrierung erfolgreich');
        
        // Initialisiere Benutzerstruktur in Realtime Database
        const userId = userCredential.user.uid;
        const userRef = dbRef(rtdb, `users/${userId}`);
        await dbSet(userRef, {
            email: email,
            createdAt: new Date().toISOString(),
            applications: {}
        });
        
        return userCredential.user;
    } catch (error) {
        console.error('Registrierungsfehler:', error);
        throw error;
    }
}

export async function logOut() {
    try {
        await signOut(auth);
        console.log('✓ Abmeldung erfolgreich');
    } catch (error) {
        console.error('Abmeldefehler:', error);
        throw error;
    }
}

// Auth State Observer
export function initAuthObserver(callback) {
    return onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('Benutzer ist angemeldet:', user.email);
        } else {
            console.log('Benutzer ist abgemeldet');
        }
        if (callback) callback(user);
    });
}

// Erweiterte Test-Funktion mit automatischer Anmeldung
export async function testFirebaseConnection(testEmail = 'test@example.com', testPassword = 'testPassword123') {
    try {
        // Test Auth mit Anmeldung
        try {
            await auth._getRecaptchaConfig();
            console.log('✓ Firebase Auth Verbindung OK');
        } catch (error) {
            throw new Error('Firebase Auth nicht verfügbar. Bitte prüfen Sie, ob Authentication in der Firebase Console aktiviert ist.');
        }

        // Versuche Anmeldung oder Registrierung
        let user;
        try {
            user = await signIn(testEmail, testPassword);
            console.log('✓ Anmeldung erfolgreich');
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                try {
                    user = await signUp(testEmail, testPassword);
                    console.log('✓ Registrierung erfolgreich');
                } catch (signUpError) {
                    if (signUpError.code === 'auth/email-already-in-use') {
                        throw new Error('E-Mail bereits registriert, aber Anmeldung fehlgeschlagen. Bitte anderes Testkonto verwenden.');
                    } else if (signUpError.code === 'auth/operation-not-allowed') {
                        throw new Error('Email/Password-Anmeldung ist nicht aktiviert. Bitte in der Firebase Console unter Authentication aktivieren.');
                    } else {
                        throw signUpError;
                    }
                }
            } else if (error.code === 'auth/operation-not-allowed') {
                throw new Error('Email/Password-Anmeldung ist nicht aktiviert. Bitte in der Firebase Console unter Authentication aktivieren.');
            } else {
                throw error;
            }
        }

        // Test Realtime Database - Angepasst an die Regeln
        if (auth.currentUser) {
            try {
                const userId = auth.currentUser.uid;
                const testDbRef = dbRef(rtdb, `users/${userId}/test`);
                await dbSet(testDbRef, {
                    timestamp: new Date().toISOString(),
                    status: 'ok'
                });
                console.log('✓ Realtime Database Verbindung OK');
                
                // Cleanup
                await dbSet(testDbRef, null);
            } catch (error) {
                if (error.code === 'PERMISSION_DENIED') {
                    throw new Error('Realtime Database Zugriff verweigert. Bitte prüfen Sie die Datenbank-Regeln in der Firebase Console.');
                } else {
                    throw error;
                }
            }
        } else {
            console.log('⚠️ Realtime Database Test übersprungen - Benutzer nicht angemeldet');
        }

        return true;
    } catch (error) {
        console.error('Firebase Verbindungsfehler:', error);
        throw new Error(`Firebase Verbindung fehlgeschlagen: ${error.message}`);
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
