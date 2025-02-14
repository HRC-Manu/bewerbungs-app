// Hauptdatei für die Bewerbungs-App
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    connectAuthEmulator, 
    setPersistence, 
    browserLocalPersistence 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    connectFirestoreEmulator, 
    enableIndexedDbPersistence,
    collection,
    getDocs,
    query,
    where,
    doc,
    setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getStorage, 
    connectStorageEmulator 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { FIREBASE_CONFIG } from './config.js';
import { VideoManager } from './video-manager.js';
import AuthService from './services/auth-service.js';
import { firebaseConnectionTester } from './firebase-connection.js';

// Performance Monitoring
let startTime = performance.now();
const performanceMetrics = {
    initTime: 0,
    authTime: 0,
    renderTime: 0,
    connectionTestTime: 0
};

// Globaler Error-Handler für Fehler-Tracking
const errorTracker = {
    errors: [],
    maxErrors: 100,
    addError(error) {
        if (this.errors.length >= this.maxErrors) {
            this.errors.shift();
        }
        this.errors.push({
            timestamp: new Date(),
            error: error.message,
            stack: error.stack,
            type: error.name
        });
    },
    getErrors() {
        return this.errors;
    },
    clearErrors() {
        this.errors = [];
    }
};

// Service Worker für Offline-Funktionalität
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(error => {
            console.warn('ServiceWorker registration failed:', error);
        });
    });
}

// Firebase Services (global instances)
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;

// Firebase Initialization mit Verbindungstest
async function initializeFirebase(retryCount = 3) {
    // Erst Verbindungstest durchführen
    console.log('[Firebase] Running connection test...');
    const connectionTest = await firebaseConnectionTester.testConnection();
    performanceMetrics.connectionTestTime = connectionTest.connectionTime;

    if (!connectionTest.success) {
        console.error('[Firebase] Connection test failed:', connectionTest);
        throw new Error(`Firebase connection test failed: ${connectionTest.lastError?.message}`);
    }

    console.log('[Firebase] Connection test successful, initializing services...');

    for (let i = 0; i < retryCount; i++) {
        try {
            // Check if already initialized
            if (firebaseApp) {
                console.warn('[Firebase] Already initialized, returning existing instance');
                return { 
                    app: firebaseApp, 
                    auth: firebaseAuth, 
                    db: firebaseDb, 
                    storage: firebaseStorage 
                };
            }

            // Initialize Firebase
            firebaseApp = initializeApp(FIREBASE_CONFIG);
            console.log('[Firebase] App initialized');

            // Initialize Auth
            firebaseAuth = getAuth(firebaseApp);
            await setPersistence(firebaseAuth, browserLocalPersistence);
            console.log('[Firebase] Auth initialized');

            // Initialize Firestore
            firebaseDb = getFirestore(firebaseApp);
            console.log('[Firebase] Firestore initialized');

            // Initialize Storage
            firebaseStorage = getStorage(firebaseApp);
            console.log('[Firebase] Storage initialized');

            // Entwicklungsmodus-Emulatoren
            if (window.location.hostname === 'localhost') {
                try {
                    connectAuthEmulator(firebaseAuth, 'http://localhost:9099');
                    connectFirestoreEmulator(firebaseDb, 'localhost', 8080);
                    connectStorageEmulator(firebaseStorage, 'localhost', 9199);
                    console.log('[Firebase] Emulators connected');
                } catch (emulatorError) {
                    console.warn('[Firebase] Failed to connect to emulators:', emulatorError);
                }
            }

            // Enable offline persistence
            try {
                await enableIndexedDbPersistence(firebaseDb);
                console.log('[Firebase] Offline persistence enabled');
            } catch (persistenceError) {
                if (persistenceError.code === 'failed-precondition') {
                    console.warn('[Firebase] Multiple tabs open, persistence enabled in first tab only');
                } else if (persistenceError.code === 'unimplemented') {
                    console.warn('[Firebase] Browser doesn\'t support persistence');
                } else {
                    console.error('[Firebase] Failed to enable persistence:', persistenceError);
                }
            }

            // Periodischer Verbindungstest
            setInterval(async () => {
                const healthCheck = await firebaseConnectionTester.testConnection();
                if (!healthCheck.success) {
                    console.warn('[Firebase] Health check failed:', healthCheck);
                    app.toastManager.showToast('Verbindungsprobleme erkannt. Versuche wiederherzustellen...', 'warning');
                    // Versuche Wiederherstellung
                    try {
                        await initializeFirebase(1);
                        app.toastManager.showToast('Verbindung wiederhergestellt', 'success');
                    } catch (error) {
                        app.toastManager.showToast('Verbindung konnte nicht wiederhergestellt werden', 'error');
                    }
                }
            }, 60000); // Alle 60 Sekunden

            return { 
                app: firebaseApp, 
                auth: firebaseAuth, 
                db: firebaseDb, 
                storage: firebaseStorage 
            };
        } catch (error) {
            console.error(`[Firebase] Initialization attempt ${i + 1} failed:`, error);
            
            // Clear any partial initialization
            if (firebaseApp) {
                try {
                    await firebaseApp.delete();
                } catch (deleteError) {
                    console.warn('[Firebase] Failed to delete app:', deleteError);
                }
                firebaseApp = null;
                firebaseAuth = null;
                firebaseDb = null;
                firebaseStorage = null;
            }

            // On last attempt, throw error
            if (i === retryCount - 1) {
                throw new Error(`Firebase initialization failed after ${retryCount} attempts: ${error.message}`);
            }

            // Wait before retrying (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, i), 10000);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

// Toast-System mit Queue
class ToastManager {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.container = this.createContainer();
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
        return container;
    }

    async showToast(message, type = 'info', duration = 3000) {
        this.queue.push({ message, type, duration });
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        const { message, type, duration } = this.queue.shift();

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        this.container.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast, { delay: duration });
        bsToast.show();

        await new Promise(resolve => {
            toast.addEventListener('hidden.bs.toast', () => {
                toast.remove();
                resolve();
            });
        });

        this.processQueue();
    }
}

// Loading-Manager für konsistentes Loading-State-Management
class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
    }

    showLoading(element, text) {
        if (!element) return;
        
        const state = {
            originalText: element.innerHTML,
            originalDisabled: element.disabled
        };
        this.loadingStates.set(element, state);

        element.disabled = true;
        element.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ${text}
        `;
    }

    hideLoading(element) {
        if (!element) return;
        
        const state = this.loadingStates.get(element);
        if (state) {
            element.disabled = state.originalDisabled;
            element.innerHTML = state.originalText;
            this.loadingStates.delete(element);
        }
    }

    isLoading(element) {
        return this.loadingStates.has(element);
    }
}

// Haupt-App-Klasse
class App {
    constructor() {
        this.toastManager = new ToastManager();
        this.loadingManager = new LoadingManager();
        this.isInitialized = false;
        this.initPromise = null;
    }

    async initialize() {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                // Firebase initialisieren
                const { auth, db, storage } = await initializeFirebase();
                
                // Auth initialisieren
                await this.initializeAuth();
                
                // Video-Manager initialisieren
                this.videoManager = new VideoManager(auth, storage, db);
                
                // Event-Listener initialisieren
                this.initializeEventListeners();
                
                // Performance-Metriken erfassen
                performanceMetrics.initTime = performance.now() - startTime;
                
                this.isInitialized = true;
                console.log('App successfully initialized', performanceMetrics);
                
                return true;
            } catch (error) {
                errorTracker.addError(error);
                this.toastManager.showToast('Fehler beim Initialisieren der App', 'error');
                throw error;
            }
        })();

        return this.initPromise;
    }

    async initializeAuth() {
        // Auth-Event-Listener
        AuthService.onAuthStateChanged((user) => {
            this.updateUIForAuthState(user);
            performanceMetrics.authTime = performance.now() - startTime;
        });

        // Auth-Forms initialisieren
        this.initializeAuthForms();
    }

    updateUIForAuthState(user) {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userDisplayName = document.getElementById('userDisplayName');
        
        if (!authButtons || !userMenu || !userDisplayName) return;

        if (user) {
            authButtons.classList.add('d-none');
            userMenu.classList.remove('d-none');
            userDisplayName.textContent = user.displayName || user.email;
            
            if (!user.emailVerified) {
                this.toastManager.showToast('Bitte bestätigen Sie Ihre E-Mail-Adresse', 'warning');
            }
        } else {
            authButtons.classList.remove('d-none');
            userMenu.classList.add('d-none');
        }
    }

    initializeAuthForms() {
        // Login Form
        const loginForm = document.getElementById('loginForm');
        loginForm?.addEventListener('submit', this.handleLogin.bind(this));

        // Register Form
        const registerForm = document.getElementById('registerForm');
        registerForm?.addEventListener('submit', this.handleRegister.bind(this));

        // Password Reset Form
        const resetForm = document.getElementById('passwordResetForm');
        resetForm?.addEventListener('submit', this.handlePasswordReset.bind(this));

        // Logout Button
        const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn?.addEventListener('click', this.handleLogout.bind(this));
    }

    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');

        try {
            this.loadingManager.showLoading(submitBtn, 'Anmeldung...');
            
            const email = form.querySelector('#loginEmail').value;
            const password = form.querySelector('#loginPassword').value;
            const rememberMe = form.querySelector('#rememberMe')?.checked;

            await AuthService.login(email, password, rememberMe);
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            modal?.hide();
            
            this.toastManager.showToast('Erfolgreich angemeldet', 'success');
        } catch (error) {
            errorTracker.addError(error);
            this.toastManager.showToast(error.message, 'error');
        } finally {
            this.loadingManager.hideLoading(submitBtn);
        }
    }

    // Weitere Handler-Methoden...
}

// App-Instanz erstellen und initialisieren
const app = new App();

// DOMContentLoaded Event
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await app.initialize();
    } catch (error) {
        console.error('Critical initialization error:', error);
    }
}); 