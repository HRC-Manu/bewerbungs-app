/**
 * Authentifizierungslogik mit Firebase
 */

class AuthManager {
  constructor() {
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    
    // DOM-Elemente
    this.loginBtn = document.getElementById('loginBtn');
    this.registerBtn = document.getElementById('registerBtn');
    this.logoutBtn = document.getElementById('logoutBtn');
    this.userProfile = document.querySelector('.user-profile');
    this.authButtons = document.querySelector('.auth-buttons');
    this.userName = document.getElementById('userName');
    
    // Register CTA-Button
    this.registerCTA = document.getElementById('registerCTA');
    
    // Modal-Elemente
    this.loginModal = document.getElementById('loginModal') ? 
      new bootstrap.Modal(document.getElementById('loginModal')) : null;
      
    this.registerModal = document.getElementById('registerModal') ?
      new bootstrap.Modal(document.getElementById('registerModal')) : null;
    
    // Event-Listener
    this.setupEventListeners();
    
    // Authentifizierungsstatus überwachen
    this.auth.onAuthStateChanged(this.handleAuthStateChanged.bind(this));
    
    console.log('AuthManager initialisiert');
  }
  
  /**
   * Event-Listener einrichten
   */
  setupEventListeners() {
    // Login-Button
    if (this.loginBtn) {
      this.loginBtn.addEventListener('click', () => {
        if (this.loginModal) this.loginModal.show();
      });
    }
    
    // Register-Button
    if (this.registerBtn) {
      this.registerBtn.addEventListener('click', () => {
        if (this.registerModal) this.registerModal.show();
      });
    }
    
    // Register CTA-Button auf der Startseite
    if (this.registerCTA) {
      this.registerCTA.addEventListener('click', () => {
        if (this.registerModal) this.registerModal.show();
      });
    }
    
    // Logout-Button
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', this.logout.bind(this));
    }
    
    // Login-Modal ↔ Register-Modal wechseln
    document.getElementById('showRegisterModal')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.loginModal) this.loginModal.hide();
      setTimeout(() => {
        if (this.registerModal) this.registerModal.show();
      }, 400);
    });
    
    document.getElementById('showLoginModal')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.registerModal) this.registerModal.hide();
      setTimeout(() => {
        if (this.loginModal) this.loginModal.show();
      }, 400);
    });
    
    // Login-Formular
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.login(
          document.getElementById('loginEmail').value,
          document.getElementById('loginPassword').value,
          document.getElementById('rememberMe')?.checked
        );
      });
    }
    
    // Register-Formular
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.register(
          document.getElementById('registerName').value,
          document.getElementById('registerEmail').value,
          document.getElementById('registerPassword').value,
          document.getElementById('registerPasswordConfirm').value
        );
      });
    }
    
    // Password zurücksetzen
    document.getElementById('forgotPassword')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.resetPassword();
    });
    
    // Social Logins
    document.getElementById('googleLoginBtn')?.addEventListener('click', () => this.googleLogin());
    document.getElementById('microsoftLoginBtn')?.addEventListener('click', () => this.microsoftLogin());
    document.getElementById('googleRegisterBtn')?.addEventListener('click', () => this.googleLogin());
    document.getElementById('microsoftRegisterBtn')?.addEventListener('click', () => this.microsoftLogin());
  }
  
  /**
   * Behandelt Änderungen des Authentifizierungsstatus
   * @param {Object} user - Der angemeldete Benutzer oder null
   */
  handleAuthStateChanged(user) {
    if (user) {
      console.log('Benutzer angemeldet:', user.email);
      
      // UI aktualisieren
      this.updateUIOnLogin(user);
      
      // Benutzerdaten laden
      this.loadUserData(user.uid);
    } else {
      console.log('Benutzer abgemeldet');
      
      // UI aktualisieren
      this.updateUIOnLogout();
    }
  }
  
  /**
   * Anmeldung mit E-Mail und Passwort
   * @param {string} email - Die E-Mail-Adresse
   * @param {string} password - Das Passwort
   * @param {boolean} rememberMe - Ob der Benutzer angemeldet bleiben soll
   */
  async login(email, password, rememberMe = false) {
    if (!email || !password) {
      app.showToast('Bitte geben Sie E-Mail und Passwort ein', 'Fehler', 'danger');
      return;
    }
    
    try {
      // Persistence setzen (SESSION oder LOCAL)
      await this.auth.setPersistence(
        rememberMe ? 
          firebase.auth.Auth.Persistence.LOCAL : 
          firebase.auth.Auth.Persistence.SESSION
      );
      
      // Anmelden
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      
      // Modal schließen
      if (this.loginModal) this.loginModal.hide();
      
      // Erfolg anzeigen
      app.showToast('Erfolgreich angemeldet', 'Erfolg', 'success');
      
      return userCredential.user;
    } catch (error) {
      console.error('Fehler bei der Anmeldung:', error);
      
      let errorMessage = 'Unbekannter Fehler bei der Anmeldung';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Kein Benutzer mit dieser E-Mail gefunden';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Falsches Passwort';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Ungültige E-Mail-Adresse';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Dieser Account wurde deaktiviert';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Zu viele fehlgeschlagene Versuche. Bitte versuchen Sie es später erneut';
          break;
      }
      
      app.showToast(errorMessage, 'Fehler', 'danger');
      
      throw error;
    }
  }
  
  /**
   * Registrierung mit E-Mail und Passwort
   * @param {string} name - Der Name des Benutzers
   * @param {string} email - Die E-Mail-Adresse
   * @param {string} password - Das Passwort
   * @param {string} passwordConfirm - Die Passwort-Bestätigung
   */
  async register(name, email, password, passwordConfirm) {
    if (!name || !email || !password || !passwordConfirm) {
      app.showToast('Bitte alle Felder ausfüllen', 'Fehler', 'danger');
      return;
    }
    
    if (password !== passwordConfirm) {
      app.showToast('Passwörter stimmen nicht überein', 'Fehler', 'danger');
      return;
    }
    
    if (password.length < 6) {
      app.showToast('Passwort muss mindestens 6 Zeichen lang sein', 'Fehler', 'danger');
      return;
    }
    
    try {
      // Registrieren
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Profil aktualisieren
      await user.updateProfile({
        displayName: name
      });
      
      // Modal schließen
      if (this.registerModal) this.registerModal.hide();
      
      // Benutzerprofil in Firestore erstellen
      await this.createUserProfile(user.uid, name, email);
      
      // Erfolg anzeigen
      app.showToast('Registrierung erfolgreich', 'Erfolg', 'success');
      
      return user;
    } catch (error) {
      console.error('Fehler bei der Registrierung:', error);
      
      let errorMessage = 'Unbekannter Fehler bei der Registrierung';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Diese E-Mail-Adresse wird bereits verwendet';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Ungültige E-Mail-Adresse';
          break;
        case 'auth/weak-password':
          errorMessage = 'Das Passwort ist zu schwach';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Diese Anmeldemethode ist nicht aktiviert';
          break;
      }
      
      app.showToast(errorMessage, 'Fehler', 'danger');
      
      throw error;
    }
  }
  
  /**
   * Anmeldung mit Google
   */
  async googleLogin() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const userCredential = await this.auth.signInWithPopup(provider);
      const user = userCredential.user;
      
      // Modals schließen
      if (this.loginModal) this.loginModal.hide();
      if (this.registerModal) this.registerModal.hide();
      
      // Prüfen, ob es ein neuer Benutzer ist
      if (userCredential.additionalUserInfo.isNewUser) {
        // Benutzerprofil in Firestore erstellen
        await this.createUserProfile(
          user.uid, 
          user.displayName, 
          user.email, 
          user.photoURL
        );
      }
      
      // Erfolg anzeigen
      app.showToast('Erfolgreich mit Google angemeldet', 'Erfolg', 'success');
      
      return user;
    } catch (error) {
      console.error('Fehler bei der Google-Anmeldung:', error);
      app.showToast('Fehler bei der Google-Anmeldung', 'Fehler', 'danger');
      throw error;
    }
  }
  
  /**
   * Anmeldung mit Microsoft
   */
  async microsoftLogin() {
    try {
      const provider = new firebase.auth.OAuthProvider('microsoft.com');
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const userCredential = await this.auth.signInWithPopup(provider);
      const user = userCredential.user;
      
      // Modals schließen
      if (this.loginModal) this.loginModal.hide();
      if (this.registerModal) this.registerModal.hide();
      
      // Prüfen, ob es ein neuer Benutzer ist
      if (userCredential.additionalUserInfo.isNewUser) {
        // Benutzerprofil in Firestore erstellen
        await this.createUserProfile(
          user.uid, 
          user.displayName, 
          user.email, 
          user.photoURL
        );
      }
      
      // Erfolg anzeigen
      app.showToast('Erfolgreich mit Microsoft angemeldet', 'Erfolg', 'success');
      
      return user;
    } catch (error) {
      console.error('Fehler bei der Microsoft-Anmeldung:', error);
      app.showToast('Fehler bei der Microsoft-Anmeldung', 'Fehler', 'danger');
      throw error;
    }
  }
  
  /**
   * Abmeldung
   */
  async logout() {
    try {
      await this.auth.signOut();
      app.showToast('Erfolgreich abgemeldet', 'Erfolg', 'success');
    } catch (error) {
      console.error('Fehler bei der Abmeldung:', error);
      app.showToast('Fehler bei der Abmeldung', 'Fehler', 'danger');
    }
  }
  
  /**
   * Passwort zurücksetzen
   */
  async resetPassword() {
    const email = prompt('Bitte geben Sie Ihre E-Mail-Adresse ein:');
    
    if (!email) return;
    
    try {
      await this.auth.sendPasswordResetEmail(email);
      app.showToast('E-Mail zum Zurücksetzen des Passworts wurde gesendet', 'Erfolg', 'success');
    } catch (error) {
      console.error('Fehler beim Zurücksetzen des Passworts:', error);
      
      let errorMessage = 'Fehler beim Zurücksetzen des Passworts';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Ungültige E-Mail-Adresse';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Kein Benutzer mit dieser E-Mail gefunden';
          break;
      }
      
      app.showToast(errorMessage, 'Fehler', 'danger');
    }
  }
  
  /**
   * Erstellt ein Benutzerprofil in Firestore
   * @param {string} uid - Die Benutzer-ID
   * @param {string} name - Der Name des Benutzers
   * @param {string} email - Die E-Mail-Adresse
   * @param {string} photoURL - Die URL des Profilbilds
   */
  async createUserProfile(uid, name, email, photoURL = null) {
    try {
      await this.db.collection('users').doc(uid).set({
        name,
        email,
        photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Benutzerprofil erstellt');
    } catch (error) {
      console.error('Fehler beim Erstellen des Benutzerprofils:', error);
      throw error;
    }
  }
  
  /**
   * Aktualisiert die UI nach der Anmeldung
   * @param {Object} user - Der angemeldete Benutzer
   */
  updateUIOnLogin(user) {
    // Authentifizierungsbuttons ausblenden
    if (this.authButtons) {
      this.authButtons.classList.add('d-none');
    }
    
    // Benutzerprofil anzeigen
    if (this.userProfile) {
      this.userProfile.classList.remove('d-none');
    }
    
    // Benutzername anzeigen
    if (this.userName) {
      this.userName.textContent = user.displayName || user.email;
    }
  }
  
  /**
   * Aktualisiert die UI nach der Abmeldung
   */
  updateUIOnLogout() {
    // Authentifizierungsbuttons anzeigen
    if (this.authButtons) {
      this.authButtons.classList.remove('d-none');
    }
    
    // Benutzerprofil ausblenden
    if (this.userProfile) {
      this.userProfile.classList.add('d-none');
    }
  }
  
  /**
   * Lädt die Benutzerdaten aus Firestore
   * @param {string} userId - Die Benutzer-ID
   */
  async loadUserData(userId) {
    try {
      const doc = await this.db.collection('users').doc(userId).get();
      
      if (doc.exists) {
        const userData = doc.data();
        
        // Speichere Benutzerdaten im localStorage
        localStorage.setItem(appConfig.userProfileKey, JSON.stringify(userData));
        
        // Letztes Login aktualisieren
        await this.db.collection('users').doc(userId).update({
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        console.log('Kein Benutzerprofil gefunden');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Benutzerdaten:', error);
    }
  }
}

// Initialisiere den AuthManager, wenn die Seite geladen ist
document.addEventListener('DOMContentLoaded', () => {
  window.authManager = new AuthManager();
}); 
