/**
 * Authentifizierungsmanager
 * Ermöglicht Anmeldung, Registrierung und Gast-Nutzung
 */

import { firebaseService } from './firebase-config.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.guestMode = true;
        this.authListeners = [];
    }
    
    initialize() {
        console.log("AuthManager wird initialisiert");
        
        // Auth-Status überwachen
        firebaseService.onAuthChange(user => {
            this.onAuthStateChanged(user);
        });
        
        // Event-Listener für Login-Formular
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // Event-Listener für Registrierungs-Formular
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
        
        // Event-Listener für Abmelden
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    }
    
    // Auth-Status-Änderung verarbeiten
    onAuthStateChanged(user) {
        this.currentUser = user;
        console.log("Auth-Status geändert:", user ? `Eingeloggt als ${user.email}` : "Ausgeloggt");
        
        // UI aktualisieren
        this.updateUI();
        
        // Listener benachrichtigen
        this.notifyListeners();
    }
    
    // UI basierend auf Auth-Status aktualisieren
    updateUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userDisplayName = document.getElementById('userDisplayName');
        
        if (this.currentUser) {
            // Eingeloggt: User-Menü anzeigen, Auth-Buttons verstecken
            if (authButtons) authButtons.classList.add('d-none');
            if (userMenu) userMenu.classList.remove('d-none');
            if (userDisplayName) userDisplayName.textContent = this.currentUser.email;
        } else {
            // Ausgeloggt: Auth-Buttons anzeigen, User-Menü verstecken
            if (authButtons) authButtons.classList.remove('d-none');
            if (userMenu) userMenu.classList.add('d-none');
        }
    }
    
    // Login-Handler
    async handleLogin() {
        try {
            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPassword')?.value;
            
            if (!email || !password) {
                throw new Error("Bitte E-Mail und Passwort eingeben");
            }
            
            // Anmelden
            showLoading();
            const userCredential = await firebaseService.login(email, password);
            
            // Login-Modal schließen
            const loginModal = document.getElementById('loginModal');
            if (loginModal && bootstrap) {
                const bsModal = bootstrap.Modal.getInstance(loginModal);
                if (bsModal) bsModal.hide();
            }
            
            hideLoading();
            showSuccess("Erfolgreich angemeldet");
            
            return userCredential.user;
        } catch (error) {
            hideLoading();
            
            let errorMessage = "Anmeldung fehlgeschlagen";
            if (error.code === 'auth/invalid-credential') {
                errorMessage = "Ungültige Anmeldedaten";
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = "Kein Benutzer mit dieser E-Mail gefunden";
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = "Falsches Passwort";
            }
            
            showError(errorMessage);
            throw error;
        }
    }
    
    // Registrierungs-Handler
    async handleRegister() {
        try {
            const email = document.getElementById('registerEmail')?.value;
            const password = document.getElementById('registerPassword')?.value;
            const passwordConfirm = document.getElementById('registerPasswordConfirm')?.value;
            
            // Validierung
            if (!email || !password) {
                throw new Error("Bitte E-Mail und Passwort eingeben");
            }
            
            if (password !== passwordConfirm) {
                throw new Error("Die Passwörter stimmen nicht überein");
            }
            
            // Anmelden
            showLoading();
            const userCredential = await firebaseService.register(email, password);
            
            // Registrierungs-Modal schließen
            const registerModal = document.getElementById('registerModal');
            if (registerModal && bootstrap) {
                const bsModal = bootstrap.Modal.getInstance(registerModal);
                if (bsModal) bsModal.hide();
            }
            
            hideLoading();
            showSuccess("Registrierung erfolgreich");
            
            return userCredential.user;
        } catch (error) {
            hideLoading();
            
            let errorMessage = "Registrierung fehlgeschlagen";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Diese E-Mail wird bereits verwendet";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Ungültige E-Mail-Adresse";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Das Passwort ist zu schwach";
            }
            
            showError(errorMessage);
            throw error;
        }
    }
    
    // Logout-Handler
    async handleLogout() {
        try {
            showLoading();
            await firebaseService.logout();
            hideLoading();
            showSuccess("Erfolgreich abgemeldet");
        } catch (error) {
            hideLoading();
            showError("Abmeldung fehlgeschlagen: " + error.message);
        }
    }
    
    // Auth-Listener hinzufügen
    addAuthListener(callback) {
        if (typeof callback === 'function') {
            this.authListeners.push(callback);
            
            // Sofort mit aktuellem Status aufrufen
            callback(this.currentUser);
            
            return true;
        }
        return false;
    }
    
    // Auth-Listener benachrichtigen
    notifyListeners() {
        this.authListeners.forEach(callback => {
            try {
                callback(this.currentUser);
            } catch (error) {
                console.error("Fehler in Auth-Listener:", error);
            }
        });
    }
    
    // Ist Benutzer eingeloggt?
    isLoggedIn() {
        return !!this.currentUser;
    }
    
    // Aktuelle Benutzer-ID
    getCurrentUserId() {
        return this.currentUser?.uid || null;
    }
    
    // Aktuelle Benutzer-E-Mail
    getCurrentUserEmail() {
        return this.currentUser?.email || null;
    }
    
    // Passwort ändern
    async changePassword(currentPassword, newPassword) {
        try {
            if (!this.currentUser) {
                throw new Error("Kein Benutzer angemeldet");
            }
            
            // User erneut authentifizieren (erforderlich für kritische Operationen)
            const credential = firebase.auth.EmailAuthProvider.credential(
                this.currentUser.email,
                currentPassword
            );
            
            await this.currentUser.reauthenticateWithCredential(credential);
            await this.currentUser.updatePassword(newPassword);
            
            showSuccess("Passwort erfolgreich geändert");
            return true;
        } catch (error) {
            console.error("Fehler beim Ändern des Passworts:", error);
            
            let errorMessage = "Passwortänderung fehlgeschlagen";
            if (error.code === 'auth/wrong-password') {
                errorMessage = "Aktuelles Passwort falsch";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Das neue Passwort ist zu schwach";
            }
            
            showError(errorMessage);
            throw error;
        }
    }
    
    // Nach erfolgreicher Anmeldung zum Dashboard weiterleiten
    redirectToDashboard() {
        window.location.href = 'dashboard.html';
    }
}

// Helper-Funktionen für Feedback
function showLoading() {
    if (window.appHelpers?.showLoading) {
        window.appHelpers.showLoading();
    }
}

function hideLoading() {
    if (window.appHelpers?.hideLoading) {
        window.appHelpers.hideLoading();
    }
}

function showSuccess(message) {
    if (window.appHelpers?.showToast) {
        window.appHelpers.showToast(message, 'success');
    } else {
        console.log('SUCCESS:', message);
    }
}

function showError(message) {
    if (window.appHelpers?.showToast) {
        window.appHelpers.showToast(message, 'danger');
    } else {
        console.error('ERROR:', message);
        alert(message);
    }
}

// Globale Instanz erstellen und exportieren
const authManager = new AuthManager();

// Bei Dokumentladung initialisieren
document.addEventListener('DOMContentLoaded', () => {
    authManager.initialize();
});

export default authManager; 