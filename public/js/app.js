/**
 * Hauptanwendungslogik und Firebase-Initialisierung
 */

// Firebase-Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyBmkBSGJgTQaBUQUCaxfhBbTTuObeUNJCg",
  authDomain: "ki-bewerbungsmanager.firebaseapp.com",
  projectId: "ki-bewerbungsmanager",
  storageBucket: "ki-bewerbungsmanager.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789jkl",
  measurementId: "G-MEASUREMENT_ID"
};

// Firebase initialisieren
firebase.initializeApp(firebaseConfig);

// Globale Variablen
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// App-Konfiguration
const appConfig = {
  apiEndpoint: 'https://us-central1-ki-bewerbungsmanager.cloudfunctions.net/api',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFileTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'],
  darkModeKey: 'darkModeEnabled',
  userProfileKey: 'userProfile',
  debugMode: false
};

// App-Objekt mit gemeinsamen Funktionen
const app = {
  // Initialisiere die Anwendung
  init: function() {
    console.log('App wird initialisiert...');
    
    // Event-Listener für Dark Mode
    this.setupDarkMode();
    
    // Prüfen, ob ein Benutzer angemeldet ist
    this.checkAuthState();
    
    // Debug-Modus
    if (appConfig.debugMode) {
      console.log('Debug-Modus aktiviert');
      window.appConfig = appConfig;
      window.app = app;
    }
    
    console.log('App initialisiert');
  },
  
  // Dark Mode Setup
  setupDarkMode: function() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
      // Prüfe gespeicherte Einstellung
      const darkModeEnabled = localStorage.getItem(appConfig.darkModeKey) === 'true';
      
      // Setze initialen Status
      if (darkModeEnabled) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="bi bi-sun"></i>';
      }
      
      // Event-Listener
      darkModeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem(appConfig.darkModeKey, isDarkMode);
        
        darkModeToggle.innerHTML = isDarkMode ? 
          '<i class="bi bi-sun"></i>' : 
          '<i class="bi bi-moon-stars"></i>';
      });
    }
  },
  
  // Authentifizierungsstatus prüfen
  checkAuthState: function() {
    auth.onAuthStateChanged(user => {
      const authButtons = document.querySelector('.auth-buttons');
      const userProfile = document.querySelector('.user-profile');
      
      if (user) {
        console.log('Benutzer angemeldet:', user.displayName);
        
        // UI aktualisieren
        if (authButtons) authButtons.classList.add('d-none');
        if (userProfile) {
          userProfile.classList.remove('d-none');
          const userName = document.getElementById('userName');
          if (userName) userName.textContent = user.displayName || user.email;
        }
        
        // Benutzerdaten laden
        this.loadUserData(user.uid);
      } else {
        console.log('Kein Benutzer angemeldet');
        
        // UI aktualisieren
        if (authButtons) authButtons.classList.remove('d-none');
        if (userProfile) userProfile.classList.add('d-none');
      }
    });
  },
  
  // Benutzerdaten laden
  loadUserData: function(userId) {
    db.collection('users').doc(userId).get()
      .then(doc => {
        if (doc.exists) {
          const userData = doc.data();
          localStorage.setItem(appConfig.userProfileKey, JSON.stringify(userData));
        } else {
          console.log('Kein Benutzerprofil gefunden');
        }
      })
      .catch(error => {
        console.error('Fehler beim Laden der Benutzerdaten:', error);
      });
  },
  
  // Toast-Nachricht anzeigen
  showToast: function(message, title = 'Benachrichtigung', type = 'info') {
    const toast = document.getElementById('toastNotification');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) return;
    
    // Toast-Inhalt setzen
    if (toastTitle) toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    // Toast-Klassen aktualisieren
    toast.className = 'toast';
    toast.classList.add(`bg-${type}`);
    if (type !== 'light') toast.classList.add('text-white');
    
    // Bootstrap Toast anzeigen
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
  }
};

// Initialisiere die App, wenn das DOM geladen ist
document.addEventListener('DOMContentLoaded', function() {
  app.init();
}); 