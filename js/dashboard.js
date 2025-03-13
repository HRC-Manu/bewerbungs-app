/**
 * Dashboard-Funktionalität für eingeloggte Benutzer
 */
import { firebaseService } from './firebase-config.js';
import authManager from './auth-manager.js';

class DashboardManager {
    constructor() {
        this.userProfile = null;
        this.addressData = null;
    }
    
    initialize() {
        console.log("DashboardManager wird initialisiert");
        
        // Auf Auth-Änderungen reagieren
        authManager.addAuthListener(user => this.onAuthChanged(user));
        
        // Event-Listener für die Formulare
        this.initializeFormListeners();
        
        // Workflow-Starter-Button
        const startBtn = document.getElementById('startWorkflowBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startWorkflow());
        }
    }
    
    onAuthChanged(user) {
        console.log("Auth-Status im Dashboard geändert:", user ? `Eingeloggt als ${user.email}` : "Ausgeloggt");
        
        if (user) {
            this.loadUserData(user.uid);
        } else {
            // Nicht eingeloggt - zur Login-Seite umleiten
            window.location.href = 'index.html';
        }
    }
    
    async loadUserData(userId) {
        try {
            // Benutzerprofil aus Firestore laden
            this.userProfile = await firebaseService.getUserProfile(userId);
            
            // Adressdaten laden
            this.addressData = await this.loadAddressData(userId);
            
            // Formularfelder mit den geladenen Daten befüllen
            this.populateUserForms();
            
            // E-Mail-Adresse anzeigen
            const userDisplayName = document.getElementById('userDisplayName');
            if (userDisplayName) {
                userDisplayName.textContent = authManager.getCurrentUserEmail();
            }
        } catch (error) {
            console.error("Fehler beim Laden der Benutzerdaten:", error);
            this.showError("Fehler beim Laden Ihrer Benutzerdaten. Bitte versuchen Sie es später erneut.");
        }
    }
    
    async loadAddressData(userId) {
        try {
            const addressDoc = await firebaseService.db.collection('user_addresses').doc(userId).get();
            return addressDoc.exists ? addressDoc.data() : null;
        } catch (error) {
            console.error("Fehler beim Laden der Adressdaten:", error);
            return null;
        }
    }
    
    populateUserForms() {
        // Profilformular befüllen
        const profileForm = document.getElementById('profileForm');
        if (profileForm && this.userProfile) {
            document.getElementById('profileName').value = this.userProfile.name || '';
            document.getElementById('profileEmail').value = authManager.getCurrentUserEmail() || '';
            document.getElementById('profilePhone').value = this.userProfile.phone || '';
            document.getElementById('profileBio').value = this.userProfile.bio || '';
        }
        
        // Adressformular befüllen
        const addressForm = document.getElementById('addressForm');
        if (addressForm && this.addressData) {
            document.getElementById('addressStreet').value = this.addressData.street || '';
            document.getElementById('addressZip').value = this.addressData.zip || '';
            document.getElementById('addressCity').value = this.addressData.city || '';
            document.getElementById('addressCountry').value = this.addressData.country || 'DE';
        }
    }
    
    initializeFormListeners() {
        // Profilformular
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveUserProfile();
            });
        }
        
        // Passwort-Änderungsformular
        const passwordForm = document.getElementById('passwordChangeForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }
        
        // Adressformular
        const addressForm = document.getElementById('addressForm');
        if (addressForm) {
            addressForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAddressData();
            });
        }
        
        // Logout-Button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                authManager.handleLogout().then(() => {
                    window.location.href = 'index.html';
                });
            });
        }
    }
    
    async saveUserProfile() {
        try {
            const userId = authManager.getCurrentUserId();
            if (!userId) {
                this.showError("Sie müssen angemeldet sein, um Ihr Profil zu bearbeiten.");
                return;
            }
            
            const profileData = {
                name: document.getElementById('profileName').value,
                phone: document.getElementById('profilePhone').value,
                bio: document.getElementById('profileBio').value,
                updatedAt: new Date()
            };
            
            await firebaseService.saveUserProfile(userId, profileData);
            this.showSuccess("Profil erfolgreich aktualisiert");
            
            // Modal schließen
            const modal = bootstrap.Modal.getInstance(document.getElementById('userProfileModal'));
            if (modal) modal.hide();
        } catch (error) {
            console.error("Fehler beim Speichern des Profils:", error);
            this.showError("Fehler beim Speichern des Profils: " + error.message);
        }
    }
    
    async changePassword() {
        try {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validierung
            if (!currentPassword || !newPassword || !confirmPassword) {
                this.showError("Bitte füllen Sie alle Passwortfelder aus.");
                return;
            }
            
            if (newPassword !== confirmPassword) {
                this.showError("Die neuen Passwörter stimmen nicht überein.");
                return;
            }
            
            if (newPassword.length < 6) {
                this.showError("Das neue Passwort muss mindestens 6 Zeichen lang sein.");
                return;
            }
            
            // Passwort ändern
            await authManager.changePassword(currentPassword, newPassword);
            this.showSuccess("Passwort erfolgreich geändert");
            
            // Modal schließen
            const modal = bootstrap.Modal.getInstance(document.getElementById('passwordChangeModal'));
            if (modal) modal.hide();
            
            // Formular zurücksetzen
            document.getElementById('passwordChangeForm').reset();
        } catch (error) {
            console.error("Fehler beim Ändern des Passworts:", error);
            this.showError("Fehler beim Ändern des Passworts: " + error.message);
        }
    }
    
    async saveAddressData() {
        try {
            const userId = authManager.getCurrentUserId();
            if (!userId) {
                this.showError("Sie müssen angemeldet sein, um Ihre Adressdaten zu bearbeiten.");
                return;
            }
            
            const addressData = {
                street: document.getElementById('addressStreet').value,
                zip: document.getElementById('addressZip').value,
                city: document.getElementById('addressCity').value,
                country: document.getElementById('addressCountry').value,
                updatedAt: new Date()
            };
            
            await firebaseService.db.collection('user_addresses').doc(userId).set(addressData, { merge: true });
            this.showSuccess("Adressdaten erfolgreich aktualisiert");
            
            // Modal schließen
            const modal = bootstrap.Modal.getInstance(document.getElementById('addressModal'));
            if (modal) modal.hide();
        } catch (error) {
            console.error("Fehler beim Speichern der Adressdaten:", error);
            this.showError("Fehler beim Speichern der Adressdaten: " + error.message);
        }
    }
    
    startWorkflow() {
        // Zum Workflow navigieren
        window.location.href = 'workflow.html';
    }
    
    showSuccess(message) {
        if (window.appHelpers?.showToast) {
            window.appHelpers.showToast(message, 'success');
        } else {
            alert(message);
        }
    }
    
    showError(message) {
        if (window.appHelpers?.showToast) {
            window.appHelpers.showToast(message, 'danger');
        } else {
            alert(message);
        }
    }
}

// Instanz erstellen und initialisieren
const dashboardManager = new DashboardManager();
document.addEventListener('DOMContentLoaded', () => {
    dashboardManager.initialize();
});

export default dashboardManager; 