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
    authDomain: "bewerbungs-app.firebaseapp.com",
    projectId: "bewerbungs-app",
    storageBucket: "bewerbungs-app.appspot.com",
    messagingSenderId: "540459849039",
    appId: process.env.FIREBASE_APP_ID || "1:540459849039:web:9eda29b3e754d48472613a",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-5QHBC1W4J3",
    databaseURL: "https://bewerbungs-app-default-rtdb.europe-west1.firebasedatabase.app"
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

// Export services
export const {
    auth,
    db,
    storage
} = firebaseInstance;

// Export helper functions
export {
    signIn,
    signUp,
    logOut,
    testFirebaseConnection
};

export function initAuthObserver(callback) {
    onAuthStateChanged(auth, (user) => {
        if (callback && typeof callback === 'function') {
            callback(user);
        }
    });
}
