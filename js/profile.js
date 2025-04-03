/**
 * Profil-Funktionalität für den KI-Bewerbungsmanager
 */

class ProfileManager {
  constructor() {
    // Firebase-Referenzen
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    
    // DOM-Elemente: Übergeordnete Bereiche
    this.loginRequestSection = document.getElementById('loginRequestSection');
    this.profileContent = document.getElementById('profileContent');
    
    // DOM-Elemente: Profil-Anzeige
    this.profileName = document.getElementById('profileName');
    this.profileEmail = document.getElementById('profileEmail');
    this.memberSince = document.getElementById('memberSince');
    this.lastLogin = document.getElementById('lastLogin');
    this.savedApplications = document.getElementById('savedApplications');
    
    // DOM-Elemente: Formular
    this.profileForm = document.getElementById('profileForm');
    this.firstName = document.getElementById('firstName');
    this.lastName = document.getElementById('lastName');
    this.displayName = document.getElementById('displayName');
    this.phoneNumber = document.getElementById('phoneNumber');
    this.address = document.getElementById('address');
    this.profession = document.getElementById('profession');
    this.company = document.getElementById('company');
    
    // DOM-Elemente: Formular-Status
    this.formStatusBadge = document.getElementById('formStatusBadge');
    this.saveProfileBtn = document.getElementById('saveProfileBtn');
    this.cancelChangesBtn = document.getElementById('cancelChangesBtn');
    
    // DOM-Elemente: Einstellungen
    this.darkModeSwitch = document.getElementById('darkModeSwitch');
    this.emailNotificationsSwitch = document.getElementById('emailNotificationsSwitch');
    this.saveUserDataSwitch = document.getElementById('saveUserDataSwitch');
    
    // DOM-Elemente: Buttons
    this.changePasswordBtn = document.getElementById('changePasswordBtn');
    this.deleteAccountBtn = document.getElementById('deleteAccountBtn');
    this.savePasswordBtn = document.getElementById('savePasswordBtn');
    this.confirmDeleteAccountBtn = document.getElementById('confirmDeleteAccountBtn');
    this.loginRequestBtn = document.getElementById('loginRequestBtn');
    
    // DOM-Elemente: Modals
    this.changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    this.deleteAccountModal = new bootstrap.Modal(document.getElementById('deleteAccountModal'));
    
    // Password Form Elements
    this.currentPassword = document.getElementById('currentPassword');
    this.newPassword = document.getElementById('newPassword');
    this.confirmPassword = document.getElementById('confirmPassword');
    this.deleteConfirmPassword = document.getElementById('deleteConfirmPassword');
    this.confirmDeleteCheck = document.getElementById('confirmDeleteCheck');
    
    // Status
    this.userProfile = null;
    this.originalProfile = null;
    this.isFormDirty = false;
    
    // Event-Listener einrichten
    this.setupEventListeners();
    
    // Authentifizierungsstatus prüfen
    this.auth.onAuthStateChanged(this.handleAuthStateChanged.bind(this));
    
    console.log('ProfileManager initialisiert');
  }
  
  /**
   * Event-Listener einrichten
   */
  setupEventListeners() {
    // Profil-Formular
    this.profileForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProfile();
    });
    
    // Formular-Inputs für Dirty-Status
    const formInputs = this.profileForm?.querySelectorAll('input, textarea');
    formInputs?.forEach(input => {
      input.addEventListener('input', () => {
        this.setFormDirty(true);
      });
    });
    
    // Abbrechen-Button
    this.cancelChangesBtn?.addEventListener('click', () => {
      this.resetForm();
    });
    
    // Einstellungen
    this.darkModeSwitch?.addEventListener('change', () => {
      this.saveSettings();
      app.toggleDarkMode(this.darkModeSwitch.checked);
    });
    
    this.emailNotificationsSwitch?.addEventListener('change', () => {
      this.saveSettings();
    });
    
    this.saveUserDataSwitch?.addEventListener('change', () => {
      this.saveSettings();
    });
    
    // Passwort ändern
    this.changePasswordBtn?.addEventListener('click', () => {
      // Formular zurücksetzen
      if (this.currentPassword) this.currentPassword.value = '';
      if (this.newPassword) this.newPassword.value = '';
      if (this.confirmPassword) this.confirmPassword.value = '';
      
      this.changePasswordModal.show();
    });
    
    this.savePasswordBtn?.addEventListener('click', () => {
      this.changePassword();
    });
    
    // Konto löschen
    this.deleteAccountBtn?.addEventListener('click', () => {
      // Formular zurücksetzen
      if (this.deleteConfirmPassword) this.deleteConfirmPassword.value = '';
      if (this.confirmDeleteCheck) this.confirmDeleteCheck.checked = false;
      
      this.deleteAccountModal.show();
    });
    
    this.confirmDeleteAccountBtn?.addEventListener('click', () => {
      this.deleteAccount();
    });
    
    // Anmelde-Button
    this.loginRequestBtn?.addEventListener('click', () => {
      const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
      loginModal.show();
    });
  }
  
  /**
   * Authentifizierungsstatus-Handler
   * @param {Object} user - Der angemeldete Benutzer oder null
   */
  handleAuthStateChanged(user) {
    if (user) {
      // Benutzer ist angemeldet
      this.loginRequestSection.classList.add('d-none');
      this.profileContent.classList.remove('d-none');
      
      // Grundlegende Benutzerdaten anzeigen
      this.displayBasicUserInfo(user);
      
      // Benutzerprofil laden
      this.loadUserProfile(user.uid);
      
      // Anzahl der Bewerbungen laden
      this.loadApplicationsCount(user.uid);
    } else {
      // Benutzer ist nicht angemeldet
      this.loginRequestSection.classList.remove('d-none');
      this.profileContent.classList.add('d-none');
    }
  }
  
  /**
   * Zeigt grundlegende Benutzerinformationen an
   * @param {Object} user - Der Benutzer
   */
  displayBasicUserInfo(user) {
    if (this.profileEmail) {
      this.profileEmail.textContent = user.email;
    }
    
    if (this.profileName) {
      this.profileName.textContent = user.displayName || user.email;
    }
    
    // Erstellungsdatum des Kontos
    if (user.metadata && this.memberSince) {
      const creationTime = user.metadata.creationTime;
      this.memberSince.textContent = creationTime ? utils.formatDate(new Date(creationTime)) : '-';
    }
    
    // Letzte Anmeldung
    if (user.metadata && this.lastLogin) {
      const lastSignInTime = user.metadata.lastSignInTime;
      this.lastLogin.textContent = lastSignInTime ? utils.formatDate(new Date(lastSignInTime), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-';
    }
  }
  
  /**
   * Lädt das Benutzerprofil aus Firestore
   * @param {string} userId - Die Benutzer-ID
   */
  async loadUserProfile(userId) {
    try {
      const doc = await this.db.collection('users').doc(userId).get();
      
      if (doc.exists) {
        this.userProfile = doc.data();
        this.originalProfile = { ...this.userProfile };
        console.log('Benutzerprofil geladen:', this.userProfile);
        
        // Formular mit Daten füllen
        this.populateForm();
        
        // Einstellungen aktualisieren
        this.updateSettings();
      } else {
        // Neues Profil anlegen
        this.userProfile = {
          firstName: '',
          lastName: '',
          displayName: '',
          phoneNumber: '',
          address: '',
          profession: '',
          company: '',
          settings: {
            darkMode: false,
            emailNotifications: true,
            saveUserData: true
          },
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Als Kopie für den Originalzustand speichern
        this.originalProfile = { ...this.userProfile };
        
        // In Firestore speichern
        await this.db.collection('users').doc(userId).set(this.userProfile);
        
        console.log('Neues Benutzerprofil erstellt');
      }
    } catch (error) {
      console.error('Fehler beim Laden des Benutzerprofils:', error);
      app.showToast('Fehler beim Laden des Profils', 'Fehler', 'danger');
    }
  }
  
  /**
   * Lädt die Anzahl der Bewerbungen
   * @param {string} userId - Die Benutzer-ID
   */
  async loadApplicationsCount(userId) {
    try {
      const snapshot = await this.db.collection('users').doc(userId)
        .collection('applications').get();
      
      const count = snapshot.size;
      
      if (this.savedApplications) {
        this.savedApplications.textContent = count;
      }
    } catch (error) {
      console.error('Fehler beim Laden der Bewerbungsanzahl:', error);
    }
  }
  
  /**
   * Füllt das Formular mit den Benutzerdaten
   */
  populateForm() {
    if (!this.userProfile) return;
    
    if (this.firstName) this.firstName.value = this.userProfile.firstName || '';
    if (this.lastName) this.lastName.value = this.userProfile.lastName || '';
    if (this.displayName) this.displayName.value = this.userProfile.displayName || '';
    if (this.phoneNumber) this.phoneNumber.value = this.userProfile.phoneNumber || '';
    if (this.address) this.address.value = this.userProfile.address || '';
    if (this.profession) this.profession.value = this.userProfile.profession || '';
    if (this.company) this.company.value = this.userProfile.company || '';
    
    // Formular-Status zurücksetzen
    this.setFormDirty(false);
  }
  
  /**
   * Aktualisiert die Einstellungen in der UI
   */
  updateSettings() {
    if (!this.userProfile || !this.userProfile.settings) return;
    
    const { darkMode, emailNotifications, saveUserData } = this.userProfile.settings;
    
    if (this.darkModeSwitch) this.darkModeSwitch.checked = darkMode || false;
    if (this.emailNotificationsSwitch) this.emailNotificationsSwitch.checked = emailNotifications !== false; // Standard: true
    if (this.saveUserDataSwitch) this.saveUserDataSwitch.checked = saveUserData !== false; // Standard: true
  }
  
  /**
   * Speichert das Benutzerprofil
   */
  async saveProfile() {
    const user = this.auth.currentUser;
    if (!user) {
      app.showToast('Bitte melden Sie sich an, um Ihr Profil zu speichern', 'Hinweis', 'warning');
      return;
    }
    
    try {
      // Formulardaten abrufen
      const profileData = {
        firstName: this.firstName?.value || '',
        lastName: this.lastName?.value || '',
        displayName: this.displayName?.value || '',
        phoneNumber: this.phoneNumber?.value || '',
        address: this.address?.value || '',
        profession: this.profession?.value || '',
        company: this.company?.value || '',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Benutzerprofil aktualisieren
      this.userProfile = {
        ...this.userProfile,
        ...profileData
      };
      
      // In Firestore speichern
      await this.db.collection('users').doc(user.uid).update(profileData);
      
      // Auch in Firebase Auth aktualisieren (wenn nötig)
      if (profileData.displayName && profileData.displayName !== user.displayName) {
        await user.updateProfile({
          displayName: profileData.displayName
        });
      }
      
      // Original aktualisieren
      this.originalProfile = { ...this.userProfile };
      
      // Formular-Status aktualisieren
      this.setFormDirty(false);
      
      // Erfolg anzeigen
      this.showFormSavedIndicator();
      app.showToast('Profil erfolgreich gespeichert', 'Erfolg', 'success');
      
      // UI aktualisieren
      this.profileName.textContent = profileData.displayName || user.email;
      
      console.log('Profil aktualisiert:', profileData);
    } catch (error) {
      console.error('Fehler beim Speichern des Profils:', error);
      app.showToast('Fehler beim Speichern des Profils', 'Fehler', 'danger');
    }
  }
  
  /**
   * Speichert die Benutzereinstellungen
   */
  async saveSettings() {
    const user = this.auth.currentUser;
    if (!user) return;
    
    try {
      const settings = {
        darkMode: this.darkModeSwitch?.checked || false,
        emailNotifications: this.emailNotificationsSwitch?.checked || false,
        saveUserData: this.saveUserDataSwitch?.checked || false
      };
      
      // Benutzerprofil aktualisieren
      this.userProfile.settings = settings;
      
      // In Firestore speichern
      await this.db.collection('users').doc(user.uid).update({
        settings,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Einstellungen aktualisiert:', settings);
      
      // Darkmode direkt aktivieren/deaktivieren
      document.body.classList.toggle('dark-mode', settings.darkMode);
      
      // Einstellungen im localStorage speichern
      localStorage.setItem('darkMode', settings.darkMode ? 'enabled' : 'disabled');
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
    }
  }
  
  /**
   * Ändert das Passwort des Benutzers
   */
  async changePassword() {
    const user = this.auth.currentUser;
    if (!user) {
      app.showToast('Bitte melden Sie sich an, um Ihr Passwort zu ändern', 'Hinweis', 'warning');
      return;
    }
    
    const currentPw = this.currentPassword?.value;
    const newPw = this.newPassword?.value;
    const confirmPw = this.confirmPassword?.value;
    
    // Validierung
    if (!currentPw || !newPw || !confirmPw) {
      app.showToast('Bitte füllen Sie alle Felder aus', 'Hinweis', 'warning');
      return;
    }
    
    if (newPw.length < 8) {
      app.showToast('Das neue Passwort muss mindestens 8 Zeichen lang sein', 'Hinweis', 'warning');
      return;
    }
    
    if (newPw !== confirmPw) {
      app.showToast('Die Passwörter stimmen nicht überein', 'Hinweis', 'warning');
      return;
    }
    
    try {
      // Erst die E-Mail/Passwort-Anmeldeinformationen abrufen
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        currentPw
      );
      
      // Benutzer erneut authentifizieren
      await user.reauthenticateWithCredential(credential);
      
      // Passwort ändern
      await user.updatePassword(newPw);
      
      // Modal schließen
      this.changePasswordModal.hide();
      
      // Erfolg anzeigen
      app.showToast('Passwort erfolgreich geändert', 'Erfolg', 'success');
    } catch (error) {
      console.error('Fehler beim Ändern des Passworts:', error);
      
      let errorMessage = 'Fehler beim Ändern des Passworts';
      
      // Spezifische Fehlermeldungen
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage = 'Das aktuelle Passwort ist falsch';
          break;
        case 'auth/weak-password':
          errorMessage = 'Das neue Passwort ist zu schwach';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'Die Sitzung ist abgelaufen. Bitte melden Sie sich erneut an';
          break;
      }
      
      app.showToast(errorMessage, 'Fehler', 'danger');
    }
  }
  
  /**
   * Löscht das Benutzerkonto
   */
  async deleteAccount() {
    const user = this.auth.currentUser;
    if (!user) {
      app.showToast('Bitte melden Sie sich an, um Ihr Konto zu löschen', 'Hinweis', 'warning');
      return;
    }
    
    const password = this.deleteConfirmPassword?.value;
    const isConfirmed = this.confirmDeleteCheck?.checked;
    
    // Validierung
    if (!password) {
      app.showToast('Bitte geben Sie Ihr Passwort ein', 'Hinweis', 'warning');
      return;
    }
    
    if (!isConfirmed) {
      app.showToast('Bitte bestätigen Sie, dass Sie die Konsequenzen verstehen', 'Hinweis', 'warning');
      return;
    }
    
    try {
      // Erst die E-Mail/Passwort-Anmeldeinformationen abrufen
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        password
      );
      
      // Benutzer erneut authentifizieren
      await user.reauthenticateWithCredential(credential);
      
      // Benutzerdaten aus Firestore löschen
      await this.db.collection('users').doc(user.uid).delete();
      
      // Sammlungen des Benutzers löschen
      const collections = ['applications', 'analyses', 'coverLetters', 'matchings'];
      
      for (const collection of collections) {
        const snapshot = await this.db.collection('users').doc(user.uid)
          .collection(collection).get();
        
        const batch = this.db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        if (snapshot.size > 0) {
          await batch.commit();
        }
      }
      
      // Konto löschen
      await user.delete();
      
      // Modal schließen
      this.deleteAccountModal.hide();
      
      // Erfolg anzeigen
      app.showToast('Ihr Konto wurde erfolgreich gelöscht', 'Erfolg', 'success');
      
      // Zur Startseite navigieren
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    } catch (error) {
      console.error('Fehler beim Löschen des Kontos:', error);
      
      let errorMessage = 'Fehler beim Löschen des Kontos';
      
      // Spezifische Fehlermeldungen
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage = 'Das Passwort ist falsch';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'Die Sitzung ist abgelaufen. Bitte melden Sie sich erneut an';
          break;
      }
      
      app.showToast(errorMessage, 'Fehler', 'danger');
    }
  }
  
  /**
   * Setzt den Formular-Status auf "dirty" oder "clean"
   * @param {boolean} isDirty - Ob das Formular ungespeicherte Änderungen hat
   */
  setFormDirty(isDirty) {
    this.isFormDirty = isDirty;
    
    // Abbrechen-Button anzeigen/ausblenden
    if (this.cancelChangesBtn) {
      this.cancelChangesBtn.classList.toggle('d-none', !isDirty);
    }
    
    // Badge ausblenden
    if (this.formStatusBadge) {
      this.formStatusBadge.classList.add('d-none');
    }
    
    // Speichern-Button aktivieren/deaktivieren
    if (this.saveProfileBtn) {
      this.saveProfileBtn.disabled = !isDirty;
    }
  }
  
  /**
   * Setzt das Formular zurück
   */
  resetForm() {
    this.populateForm();
    this.setFormDirty(false);
  }
  
  /**
   * Zeigt einen Saved-Indikator für kurze Zeit an
   */
  showFormSavedIndicator() {
    if (!this.formStatusBadge) return;
    
    // Badge anzeigen
    this.formStatusBadge.classList.remove('d-none');
    this.formStatusBadge.textContent = 'Gespeichert';
    this.formStatusBadge.classList.remove('bg-secondary');
    this.formStatusBadge.classList.add('bg-success');
    
    // Nach 3 Sekunden ausblenden
    setTimeout(() => {
      this.formStatusBadge.classList.add('d-none');
    }, 3000);
  }
}

// Globale Instanz erstellen, wenn die Seite geladen ist
document.addEventListener('DOMContentLoaded', () => {
  // Nur auf der Profil-Seite initialisieren
  if (document.getElementById('profilePage')) {
    window.profileManager = new ProfileManager();
  }
}); 
