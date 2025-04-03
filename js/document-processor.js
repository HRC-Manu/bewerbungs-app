/**
 * Dokumentenverarbeitung - Extrahiert Text aus verschiedenen Dateiformaten
 */

class DocumentProcessor {
  constructor() {
    this.cachedTexts = new Map();
    this.supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    
    // Dateigrößenbeschränkung 
    this.maxFileSize = appConfig.maxFileSize || 5 * 1024 * 1024; // 5MB
    
    console.log('DocumentProcessor initialisiert');
  }
  
  /**
   * Prüft, ob der Dateityp unterstützt wird
   * @param {File} file - Die zu prüfende Datei
   * @returns {boolean} - Ob der Typ unterstützt wird
   */
  isSupported(file) {
    if (!file) return false;
    
    // Prüfe Dateigröße
    if (file.size > this.maxFileSize) {
      app.showToast(`Die Datei ist zu groß (maximal ${this.maxFileSize / (1024 * 1024)}MB)`, 'Dateifehler', 'warning');
      return false;
    }
    
    // Prüfe Dateityp
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const mimeType = file.type || this._getMimeTypeFromExtension(fileExtension);
    
    const isSupported = this.supportedTypes.some(type => mimeType.includes(type)) || 
                        ['pdf', 'docx', 'doc', 'txt'].includes(fileExtension);
    
    if (!isSupported) {
      app.showToast('Dateityp wird nicht unterstützt. Bitte laden Sie PDF, DOCX, DOC oder TXT hoch.', 'Dateifehler', 'warning');
    }
    
    return isSupported;
  }
  
  /**
   * Extrahiert Text aus einer Datei
   * @param {File} file - Die zu verarbeitende Datei
   * @returns {Promise<Object>} - Extraktionsergebnis mit Text
   */
  async extractText(file) {
    if (!this.isSupported(file)) {
      return { success: false, text: '', error: 'Nicht unterstützter Dateityp' };
    }
    
    try {
      console.log(`Extrahiere Text aus: ${file.name} (${file.type})`);
      
      // Prüfe Cache
      const cacheKey = `${file.name}_${file.size}_${file.lastModified}`;
      if (this.cachedTexts.has(cacheKey)) {
        console.log('Text aus Cache geladen');
        return { 
          success: true, 
          text: this.cachedTexts.get(cacheKey),
          fromCache: true,
          fileName: file.name,
          fileType: file.type
        };
      }
      
      // Text basierend auf Dateityp extrahieren
      let extractedText = '';
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (fileExtension === 'pdf') {
        extractedText = await this._extractFromPdf(file);
      } else if (['docx', 'doc'].includes(fileExtension)) {
        extractedText = await this._extractFromWord(file);
      } else if (fileExtension === 'txt' || file.type === 'text/plain') {
        extractedText = await file.text();
      } else {
        // Generischer Fallback
        extractedText = await this._extractGeneric(file);
      }
      
      // Bereinige den Text
      extractedText = this._cleanText(extractedText);
      
      // Speichere im Cache
      this.cachedTexts.set(cacheKey, extractedText);
      
      return {
        success: true,
        text: extractedText,
        fileName: file.name,
        fileType: file.type
      };
    } catch (error) {
      console.error('Fehler bei der Textextraktion:', error);
      
      // Verwende den API-Client für serverbasierte Extraktion, falls lokal fehlgeschlagen
      try {
        return await this._extractViaApi(file);
      } catch (apiError) {
        console.error('API-Extraktion fehlgeschlagen:', apiError);
        return { 
          success: false, 
          text: '',
          error: `Textextraktion fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`,
          fileName: file.name,
          fileType: file.type
        };
      }
    }
  }
  
  /**
   * Extrahiert Text aus einer PDF-Datei
   * @param {File} file - Die PDF-Datei
   * @returns {Promise<string>} - Der extrahierte Text
   * @private
   */
  async _extractFromPdf(file) {
    // Hier würde normalerweise die PDF.js-Implementation stehen
    // Für diese Version simulieren wir die Extraktion
    return new Promise((resolve, reject) => {
      try {
        // Simuliere die Textextraktion
        const reader = new FileReader();
        reader.onload = () => {
          // Stelle async-Verhalten von PDF.js nach
          setTimeout(() => {
            resolve(`[Extrahierter Text aus der PDF-Datei ${file.name}]`);
          }, 800);
        };
        reader.onerror = () => {
          reject(new Error('Fehler beim Lesen der PDF-Datei'));
        };
        reader.readAsArrayBuffer(file);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Extrahiert Text aus einer Word-Datei
   * @param {File} file - Die Word-Datei
   * @returns {Promise<string>} - Der extrahierte Text
   * @private
   */
  async _extractFromWord(file) {
    // Hier würde normalerweise die Mammoth.js-Implementation stehen
    // Für diese Version simulieren wir die Extraktion
    return new Promise((resolve, reject) => {
      try {
        // Simuliere die Textextraktion
        const reader = new FileReader();
        reader.onload = () => {
          // Stelle async-Verhalten von Mammoth.js nach
          setTimeout(() => {
            resolve(`[Extrahierter Text aus der Word-Datei ${file.name}]`);
          }, 800);
        };
        reader.onerror = () => {
          reject(new Error('Fehler beim Lesen der Word-Datei'));
        };
        reader.readAsArrayBuffer(file);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Generischer Extraktor für andere Dateitypen
   * @param {File} file - Die zu verarbeitende Datei
   * @returns {Promise<string>} - Der extrahierte Text
   * @private
   */
  async _extractGeneric(file) {
    try {
      return await file.text();
    } catch (error) {
      throw new Error(`Generische Extraktion fehlgeschlagen: ${error.message}`);
    }
  }
  
  /**
   * Extrahiert Text mithilfe der API (Fallback)
   * @param {File} file - Die zu verarbeitende Datei
   * @returns {Promise<Object>} - Extraktionsergebnis mit Text
   * @private
   */
  async _extractViaApi(file) {
    console.log('Verwende API für Textextraktion...');
    
    // Falls ein apiClient verfügbar ist
    if (typeof apiClient !== 'undefined') {
      const apiResult = await apiClient.extractText(file);
      return {
        success: apiResult.success || false,
        text: apiResult.text || '',
        fromApi: true,
        fileName: file.name,
        fileType: file.type
      };
    }
    
    // Wenn kein API-Client verfügbar ist, simulieren wir eine API-Antwort
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          text: `[API-extrahierter Text aus ${file.name}]`,
          fromApi: true,
          fileName: file.name,
          fileType: file.type
        });
      }, 1500);
    });
  }
  
  /**
   * Bereinigt den extrahierten Text
   * @param {string} text - Der zu bereinigende Text
   * @returns {string} - Der bereinigte Text
   * @private
   */
  _cleanText(text) {
    if (!text) return '';
    
    // Entferne überschüssige Leerzeichen
    let cleaned = text.replace(/\s+/g, ' ');
    
    // Entferne seltsame Zeichen, behalte europäische Zeichen
    cleaned = cleaned.replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F]/g, ' ');
    
    // Stelle sicher, dass Absatzumbrüche beibehalten werden
    cleaned = cleaned.replace(/([.!?])\s+/g, '$1\n\n');
    
    // Entferne mehrfache Zeilenumbrüche
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Trim
    cleaned = cleaned.trim();
    
    return cleaned;
  }
  
  /**
   * Ermittelt den MIME-Typ anhand der Dateierweiterung
   * @param {string} extension - Die Dateierweiterung
   * @returns {string} - Der MIME-Typ
   * @private
   */
  _getMimeTypeFromExtension(extension) {
    const extensionMap = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'txt': 'text/plain'
    };
    
    return extensionMap[extension.toLowerCase()] || 'application/octet-stream';
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
const documentProcessor = new DocumentProcessor(); 
