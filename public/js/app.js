/**
 * Hauptanwendungs-Klasse für den KI-Bewerbungsmanager
 */

// App-Konfiguration
const appConfig = {
  name: 'KI-Bewerbungsmanager',
  version: '1.0.0',
  apiEndpoint: 'https://us-central1-ki-bewerbungsmanager.cloudfunctions.net/api',
  userProfileKey: 'userProfileData',
  maxFileSize: 5 * 1024 * 1024, // 5 MB
  allowedFileTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ],
  darkModeKey: 'darkMode'
};

// Firebase-Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyBjXYEXoVb2kWkY_bnz-P3H4yS5lrPM2xQ",
  authDomain: "ki-bewerbungsmanager.firebaseapp.com",
  projectId: "ki-bewerbungsmanager",
  storageBucket: "ki-bewerbungsmanager.appspot.com",
  messagingSenderId: "638238154017",
  appId: "1:638238154017:web:4f6375b1b021ddeb3ef4e2",
  measurementId: "G-XQDBJ2TRQD"
};

// Firebase initialisieren
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/**
 * App-Klasse für gemeinsame Funktionalität
 */
class App {
  constructor() {
    // DOM-Elemente
    this.toastElement = document.getElementById('toastNotification');
    this.toastTitle = document.getElementById('toastTitle');
    this.toastMessage = document.getElementById('toastMessage');
    this.darkModeToggle = document.getElementById('darkModeToggle');
    
    // Toast-Objekt
    this.toast = this.toastElement ? new bootstrap.Toast(this.toastElement) : null;
    
    // Dunkles Design
    this.initDarkMode();
    
    // Event-Listener
    this.setupEventListeners();
    
    console.log(`${appConfig.name} v${appConfig.version} initialisiert`);
  }
  
  /**
   * Event-Listener einrichten
   */
  setupEventListeners() {
    // Dark Mode Toggle
    if (this.darkModeToggle) {
      this.darkModeToggle.addEventListener('click', () => {
        this.toggleDarkMode();
      });
    }
  }
  
  /**
   * Dunkles Design initialisieren
   */
  initDarkMode() {
    const darkMode = localStorage.getItem(appConfig.darkModeKey);
    
    if (darkMode === 'enabled') {
      document.body.classList.add('dark-mode');
      
      // Icon anpassen
      if (this.darkModeToggle) {
        this.darkModeToggle.innerHTML = '<i class="bi bi-sun"></i>';
      }
    }
  }
  
  /**
   * Dunkles Design umschalten
   * @param {boolean} forceDark - Optional: Erzwingt den Wert
   */
  toggleDarkMode(forceDark) {
    const isDark = forceDark !== undefined ? forceDark : !document.body.classList.contains('dark-mode');
    
    // Klasse umschalten
    document.body.classList.toggle('dark-mode', isDark);
    
    // Im localStorage speichern
    localStorage.setItem(appConfig.darkModeKey, isDark ? 'enabled' : 'disabled');
    
    // Icon anpassen
    if (this.darkModeToggle) {
      this.darkModeToggle.innerHTML = isDark ? 
        '<i class="bi bi-sun"></i>' : 
        '<i class="bi bi-moon-stars"></i>';
    }
  }
  
  /**
   * Toast-Benachrichtigung anzeigen
   * @param {string} message - Die Nachricht
   * @param {string} title - Der Titel
   * @param {string} type - Der Typ (success, danger, warning, info)
   */
  showToast(message, title = 'Benachrichtigung', type = 'info') {
    if (!this.toast) return;
    
    // Text setzen
    if (this.toastTitle) this.toastTitle.textContent = title;
    if (this.toastMessage) this.toastMessage.textContent = message;
    
    // Klassen zurücksetzen
    this.toastElement.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
    
    // Typ-Klasse hinzufügen
    switch (type) {
      case 'success':
        this.toastElement.classList.add('bg-success', 'text-white');
        break;
      case 'danger':
        this.toastElement.classList.add('bg-danger', 'text-white');
        break;
      case 'warning':
        this.toastElement.classList.add('bg-warning', 'text-dark');
        break;
      case 'info':
      default:
        this.toastElement.classList.add('bg-info', 'text-white');
        break;
    }
    
    // Toast anzeigen
    this.toast.show();
  }
  
  /**
   * Prüft, ob ein Benutzer angemeldet ist
   * @returns {boolean} - Gibt true zurück, wenn ein Benutzer angemeldet ist
   */
  isLoggedIn() {
    return firebase.auth().currentUser !== null;
  }
  
  /**
   * Gibt den aktuellen Benutzer zurück
   * @returns {Object|null} - Der aktuelle Benutzer oder null
   */
  getCurrentUser() {
    return firebase.auth().currentUser;
  }
}

// Globale Instanz erstellen
const app = new App();
window.app = app; 