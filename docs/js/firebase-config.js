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
    limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getStorage, 
    connectStorageEmulator,
    ref,
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
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDfwqJUkCQNXafFRB7hVXupPh0XBoHbdQg",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "bewerbungs-app.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "bewerbungs-app",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "bewerbungs-app.appspot.com",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "540459849039",
    appId: process.env.FIREBASE_APP_ID || "1:540459849039:web:9eda29b3e754d48472613a",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-5QHBC1W4J3",
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://bewerbungs-app-default-rtdb.europe-west1.firebasedatabase.app"
};

// Singleton-Pattern für Firebase-Instanz
class FirebaseInstance {
    constructor() {
        if (FirebaseInstance.instance) {
            return FirebaseInstance.instance;
        }
        FirebaseInstance.instance = this;
        this._initialized = false;
        this.initialize();
    }

    async initialize() {
        if (this._initialized) {
            console.warn('[Firebase] Already initialized');
            return;
        }

        try {
            // Validate config
            this.validateConfig(firebaseConfig);

            // Initialize Firebase
            this.app = initializeApp(firebaseConfig, 'bewerbungs-app');
            console.log('[Firebase] App initialized');

            // Initialize services with error handling
            await this.initializeServices();

            // Connect emulators in development
            if (window.location.hostname === 'localhost') {
                await this.connectEmulators();
            }

            this._initialized = true;
            console.log('[Firebase] Services successfully initialized');
            return true;
        } catch (error) {
            console.error('[Firebase] Initialization error:', error);
            this.showError(error);
            await this.cleanup();
            return false;
        }
    }

    validateConfig(config) {
        const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket'];
        const missingFields = requiredFields.filter(field => !config[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required Firebase config fields: ${missingFields.join(', ')}`);
        }
    }

    async initializeServices() {
        try {
            this.auth = getAuth(this.app);
            await setPersistence(this.auth, browserLocalPersistence);
            console.log('[Firebase] Auth initialized');
        } catch (error) {
            throw new Error(`Auth initialization failed: ${error.message}`);
        }

        try {
            this.db = getFirestore(this.app);
            console.log('[Firebase] Firestore initialized');
        } catch (error) {
            throw new Error(`Firestore initialization failed: ${error.message}`);
        }

        try {
            this.storage = getStorage(this.app);
            console.log('[Firebase] Storage initialized');
        } catch (error) {
            throw new Error(`Storage initialization failed: ${error.message}`);
        }
    }

    async connectEmulators() {
        try {
            connectAuthEmulator(this.auth, "http://localhost:9099", { disableWarnings: true });
            connectFirestoreEmulator(this.db, 'localhost', 8080);
            connectStorageEmulator(this.storage, "localhost", 9199);
            console.log('[Firebase] Emulators connected');
        } catch (error) {
            console.warn('[Firebase] Emulator connection failed:', error);
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

    async cleanup() {
        try {
            if (this.app) {
                await this.app.delete();
            }
        } catch (error) {
            console.error('[Firebase] Cleanup error:', error);
        } finally {
            this.app = null;
            this.auth = null;
            this.db = null;
            this.storage = null;
            this._initialized = false;
        }
    }
}

// Create and initialize Firebase instance
const firebaseInstance = new FirebaseInstance();

// Export services and functions
export const auth = firebaseInstance.auth;
export const db = firebaseInstance.db;
export const storage = firebaseInstance.storage;

// Auth functions
export async function signIn(email, password) {
    if (!auth) throw new Error('Firebase Auth not initialized');
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('✓ Login successful');
        return userCredential.user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

export async function signUp(email, password) {
    if (!auth) throw new Error('Firebase Auth not initialized');
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('✓ Registration successful');
        
        if (db) {
            const userId = userCredential.user.uid;
            const userRef = dbRef(db, `users/${userId}`);
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

export async function logOut() {
    if (!auth) throw new Error('Firebase Auth not initialized');
    
    try {
        await signOut(auth);
        console.log('✓ Logout successful');
    } catch (error) {
        console.error('Logout error:', error);
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
                const testDbRef = dbRef(db, `users/${userId}/test`);
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
    db as database,
    storage
};
