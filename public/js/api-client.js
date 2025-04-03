/**
 * API-Client für die Kommunikation mit den Cloud Functions
 */

class ApiClient {
  constructor() {
    this.baseUrl = appConfig.apiEndpoint || 'https://us-central1-ki-bewerbungsmanager.cloudfunctions.net/api';
    this.auth = firebase.auth();
    
    console.log('ApiClient initialisiert');
  }
  
  /**
   * Sendet eine Anfrage an die API
   * @param {string} endpoint - Der API-Endpunkt
   * @param {Object} data - Die zu sendenden Daten
   * @param {boolean} requiresAuth - Ob die Anfrage Authentifizierung erfordert
   * @returns {Promise<Object>} - Die API-Antwort
   */
  async sendRequest(endpoint, data, requiresAuth = true) {
    try {
      // Auth-Token abrufen, wenn Authentifizierung erforderlich ist
      let headers = {
        'Content-Type': 'application/json'
      };
      
      if (requiresAuth) {
        const user = this.auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      
      // Anfrage senden
      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      
      // Fehler behandeln
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP-Fehler ${response.status}`);
      }
      
      // JSON-Antwort abrufen
      return await response.json();
    } catch (error) {
      console.error(`API-Fehler bei ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Sendet eine Datei an die API
   * @param {string} endpoint - Der API-Endpunkt
   * @param {File} file - Die zu sendende Datei
   * @param {Object} additionalData - Zusätzliche Daten
   * @param {boolean} requiresAuth - Ob die Anfrage Authentifizierung erfordert
   * @returns {Promise<Object>} - Die API-Antwort
   */
  async sendFile(endpoint, file, additionalData = {}, requiresAuth = true) {
    try {
      // Auth-Token abrufen, wenn Authentifizierung erforderlich ist
      let headers = {};
      
      if (requiresAuth) {
        const user = this.auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      
      // FormData erstellen
      const formData = new FormData();
      formData.append('file', file);
      
      // Zusätzliche Daten hinzufügen
      Object.keys(additionalData).forEach(key => {
        formData.append(key, JSON.stringify(additionalData[key]));
      });
      
      // Anfrage senden
      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'POST',
        headers,
        body: formData
      });
      
      // Fehler behandeln
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP-Fehler ${response.status}`);
      }
      
      // JSON-Antwort abrufen
      return await response.json();
    } catch (error) {
      console.error(`API-Fehler bei ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Extrahiert Text aus einer Datei
   * @param {File} file - Die zu verarbeitende Datei
   * @returns {Promise<Object>} - Der extrahierte Text
   */
  async extractText(file) {
    return this.sendFile('extractText', file, {}, false);
  }
  
  /**
   * Analysiert einen Lebenslauf
   * @param {string} text - Der zu analysierende Text
   * @returns {Promise<Object>} - Die Analyseergebnisse
   */
  async analyzeResume(text) {
    return this.sendRequest('analyzeResume', { resumeText: text });
  }
  
  /**
   * Vergleicht einen Lebenslauf mit einer Stellenanzeige
   * @param {Object} resumeData - Die Lebenslaufdaten
   * @param {Object} jobPostingData - Die Stellenanzeigendaten
   * @returns {Promise<Object>} - Die Vergleichsergebnisse
   */
  async compareResumeWithJob(resumeData, jobPostingData) {
    return this.sendRequest('compareResumeWithJob', {
      resumeData,
      jobPostingData
    });
  }
  
  /**
   * Generiert ein Anschreiben basierend auf Lebenslauf und Stellenanzeige
   * @param {Object} resumeData - Die Lebenslaufdaten
   * @param {Object} jobPostingData - Die Stellenanzeigendaten
   * @param {Object} preferences - Einstellungen für das Anschreiben
   * @returns {Promise<Object>} - Das generierte Anschreiben
   */
  async generateCoverLetter(resumeData, jobPostingData, preferences = {}) {
    return this.sendRequest('generateCoverLetter', {
      resumeData,
      jobPostingData,
      preferences
    });
  }
  
  /**
   * Optimiert einen Lebenslauf basierend auf einer Stellenanzeige
   * @param {Object} resumeData - Die Lebenslaufdaten
   * @param {Object} jobPostingData - Die Stellenanzeigendaten
   * @returns {Promise<Object>} - Der optimierte Lebenslauf
   */
  async optimizeResume(resumeData, jobPostingData) {
    return this.sendRequest('optimizeResume', {
      resumeData,
      jobPostingData
    });
  }
  
  /**
   * Konvertiert ein ArrayBuffer in einen Base64-String
   * @param {ArrayBuffer} buffer - Das zu konvertierende ArrayBuffer
   * @returns {string} - Der Base64-String
   * @private
   */
  _arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return window.btoa(binary);
  }
}

// Globale Instanz erstellen
const apiClient = new ApiClient();
window.apiClient = apiClient; 