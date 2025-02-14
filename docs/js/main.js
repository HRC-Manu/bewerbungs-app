// Hauptdatei für die Bewerbungs-App
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { FIREBASE_CONFIG } from './config.js';
import { VideoManager } from './video-manager.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Connect to emulators in development
if (window.location.hostname === 'localhost') {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
}

// Toast-Benachrichtigungen initialisieren
function initializeToasts() {
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.innerHTML = `
        <div id="toast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <i class="bi bi-info-circle me-2"></i>
                <strong class="me-auto" id="toastTitle">Nachricht</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Schließen"></button>
            </div>
            <div class="toast-body" id="toastMessage"></div>
        </div>
    `;
    document.body.appendChild(toastContainer);
}

// Benachrichtigungsfunktionen
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    // Stil basierend auf Typ setzen
    toast.className = 'toast';
    switch (type) {
        case 'success':
            toast.classList.add('bg-success', 'text-white');
            toastTitle.textContent = 'Erfolg';
            break;
        case 'error':
            toast.classList.add('bg-danger', 'text-white');
            toastTitle.textContent = 'Fehler';
            break;
        case 'warning':
            toast.classList.add('bg-warning');
            toastTitle.textContent = 'Warnung';
            break;
        default:
            toast.classList.add('bg-info', 'text-white');
            toastTitle.textContent = 'Info';
    }
    
    toastMessage.textContent = message;
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Auth-Status überwachen
function initializeAuth() {
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userDisplayName = document.getElementById('userDisplayName');
    const authButtons = document.getElementById('authButtons');
    const featureCards = document.getElementById('featureCards');
    const paywallContainer = document.getElementById('paywallContainer');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User ist eingeloggt
            console.log('Eingeloggt als:', user.email);
            authButtons.classList.add('d-none');
            userMenu.classList.remove('d-none');
            userDisplayName.textContent = user.email;
            featureCards.classList.remove('d-none');
            paywallContainer.classList.remove('d-none');
        } else {
            // User ist ausgeloggt
            console.log('Ausgeloggt');
            authButtons.classList.remove('d-none');
            userMenu.classList.add('d-none');
            featureCards.classList.add('d-none');
            paywallContainer.classList.add('d-none');
        }
    });

    // Login Button Event
    loginBtn?.addEventListener('click', () => {
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    });

    // Logout Button Event
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
            await auth.signOut();
            showToast('Erfolgreich abgemeldet', 'success');
        } catch (error) {
            showToast('Fehler beim Abmelden: ' + error.message, 'error');
        }
    });
}

// Globale Fehlerbehandlung
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Globaler Fehler:', { msg, url, lineNo, columnNo, error });
    showToast('Ein Fehler ist aufgetreten: ' + msg, 'error');
    return false;
};

// Unbehandelte Promise-Rejections abfangen
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unbehandelte Promise-Rejection:', event.reason);
    showToast('Ein Fehler ist aufgetreten: ' + event.reason, 'error');
});

// Anwendung starten
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Starte Anwendung...');
        
        // Toast-Container initialisieren
        initializeToasts();
        
        // Auth initialisieren
        initializeAuth();
        
        // Video-Manager initialisieren
        const videoManager = new VideoManager(auth, storage, db);
        
        // Globale Funktionen für UI-Feedback
        window.showSuccess = (message) => showToast(message, 'success');
        window.showError = (message) => showToast(message, 'error');
        window.showWarning = (message) => showToast(message, 'warning');
        
        console.log('Anwendung erfolgreich gestartet');
    } catch (error) {
        console.error('Fehler beim Starten der Anwendung:', error);
        showToast('Fehler beim Starten der Anwendung: ' + error.message, 'error');
    }
}); 