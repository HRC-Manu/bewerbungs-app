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

// Singleton-Pattern für Firebase-Instanz
class FirebaseInstance {
    constructor() {
        if (FirebaseInstance.instance) {
            return FirebaseInstance.instance;
        }
        FirebaseInstance.instance = this;
        this.initialize();
    }

    async initialize() {
        if (this.app) {
            console.warn('[Firebase] Already initialized');
            return;
        }

        try {
            // Validate config
            if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
                throw new Error('Invalid Firebase configuration');
            }

            // Initialize Firebase
            this.app = initializeApp(firebaseConfig);
            console.log('[Firebase] App initialized');

            // Initialize services
            this.auth = getAuth(this.app);
            this.db = getFirestore(this.app);
            this.rtdb = getDatabase(this.app);
            this.storage = getStorage(this.app);

            // Set persistence to LOCAL by default
            await setPersistence(this.auth, browserLocalPersistence);
            
            // Connect emulators in development
            if (window.location.hostname === 'localhost') {
                try {
                    connectAuthEmulator(this.auth, "http://localhost:9099", { disableWarnings: true });
                    connectFirestoreEmulator(this.db, 'localhost', 8080);
                    connectStorageEmulator(this.storage, "localhost", 9199);
                    connectDatabaseEmulator(this.rtdb, "localhost", 9000);
                    console.log('[Firebase] Emulators connected');
                } catch (error) {
                    console.warn('[Firebase] Emulator connection failed:', error);
                }
            }

            console.log('[Firebase] Services successfully initialized');
            return true;
        } catch (error) {
            console.error('[Firebase] Initialization error:', error);
            this.showError(error);
            this.cleanup();
            return false;
        }
    }

    showError(error) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x m-3';
        errorMessage.style.zIndex = '9999';
        errorMessage.innerHTML = `
            <strong>Firebase-Fehler:</strong> 
            ${error.message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.appendChild(errorMessage);
    }

    cleanup() {
        if (this.app) {
            this.app.delete().catch(console.error);
        }
        this.app = null;
        this.auth = null;
        this.db = null;
        this.rtdb = null;
        this.storage = null;
    }

    // Auth functions
    async signIn(email, password) {
        if (!this.auth) throw new Error('Firebase Auth not initialized');
        
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            console.log('✓ Login successful');
            return userCredential.user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async signUp(email, password) {
        if (!this.auth) throw new Error('Firebase Auth not initialized');
        
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            console.log('✓ Registration successful');
            
            if (this.rtdb) {
                const userId = userCredential.user.uid;
                const userRef = dbRef(this.rtdb, `users/${userId}`);
                await dbSet(userRef, {
                    email: email,
                    createdAt: new Date().toISOString(),
                    applications: {}
                });
            }
            
            return userCredential.user;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async logOut() {
        if (!this.auth) throw new Error('Firebase Auth not initialized');
        
        try {
            await signOut(this.auth);
            console.log('✓ Logout successful');
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }
}

// Create and initialize Firebase instance
const firebaseInstance = new FirebaseInstance();

// Export services and functions
export const auth = firebaseInstance.auth;
export const db = firebaseInstance.db;
export const rtdb = firebaseInstance.rtdb;
export const storage = firebaseInstance.storage;
export const signIn = firebaseInstance.signIn.bind(firebaseInstance);
export const signUp = firebaseInstance.signUp.bind(firebaseInstance);
export const logOut = firebaseInstance.logOut.bind(firebaseInstance);

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
