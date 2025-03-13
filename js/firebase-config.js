/**
 * Optimierte Firebase-Konfiguration
 * Vereinfachte Version mit klaren Exporten und ohne Redundanzen
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore,
    collection,
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Basis-Konfiguration - wird explizit exportiert
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

// Initialisierung - nur einmal durchführen
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Firebase Service-Wrapper-Klasse
class FirebaseService {
    constructor() {
        this.auth = auth;
        this.db = db;
    }
    
    // Auth-Funktionen
    async login(email, password) {
        try {
            return await signInWithEmailAndPassword(this.auth, email, password);
        } catch (error) {
            console.error('Login error:', error.message);
            throw error;
        }
    }
    
    async register(email, password) {
        try {
            return await createUserWithEmailAndPassword(this.auth, email, password);
        } catch (error) {
            console.error('Registration error:', error.message);
            throw error;
        }
    }
    
    async logout() {
        try {
            await signOut(this.auth);
            return true;
        } catch (error) {
            console.error('Logout error:', error.message);
            throw error;
        }
    }
    
    // Auth-Beobachter
    onAuthChange(callback) {
        return onAuthStateChanged(this.auth, callback);
    }
    
    // Firestore-Funktionen
    async getUserProfile(userId) {
        try {
            const docRef = doc(this.db, "users", userId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null;
            }
        } catch (error) {
            console.error('Get user profile error:', error.message);
            throw error;
        }
    }
    
    async saveUserProfile(userId, profileData) {
        try {
            await setDoc(doc(this.db, "users", userId), profileData, { merge: true });
            return true;
        } catch (error) {
            console.error('Save user profile error:', error.message);
            throw error;
        }
    }
}

// Singleton-Instanz exportieren
export const firebaseService = new FirebaseService();

// Einzelne Dienste direkt exportieren
export {
    auth,
    db
};

// Helper-Funktionen exportieren
export function initAuthObserver(callback) {
    return onAuthStateChanged(auth, callback);
}

export function logOut() {
    return signOut(auth);
} 