/**
 * Nützliche Hilfsfunktionen für die gesamte Anwendung
 */

const utils = {
  /**
   * Formatiert ein Datum im deutschen Format
   * @param {Date|string} date - Das zu formatierende Datum
   * @param {Object} options - Optionen für die Formatierung
   * @returns {string} - Das formatierte Datum
   */
  formatDate(date, options = {}) {
    if (!date) return '';
    
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    if (!(date instanceof Date) || isNaN(date)) {
      return '';
    }
    
    const defaultOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };
    
    return date.toLocaleDateString('de-DE', { ...defaultOptions, ...options });
  },
  
  /**
   * Formatiert einen Zeitstempel im deutschen Format
   * @param {Date|string|Object} timestamp - Der zu formatierende Zeitstempel
   * @returns {string} - Der formatierte Zeitstempel
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    // Firebase Timestamp in Date umwandeln
    let date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return '';
    }
    
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  /**
   * Generiert eine einzigartige ID
   * @returns {string} - Die generierte ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  },
  
  /**
   * Kürzt einen Text auf eine bestimmte Länge
   * @param {string} text - Der zu kürzende Text
   * @param {number} maxLength - Die maximale Länge
   * @returns {string} - Der gekürzte Text
   */
  truncateText(text, maxLength = 100) {
    if (!text) return '';
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength) + '...';
  },
  
  /**
   * Sortiert ein Array von Objekten nach einem Attribut
   * @param {Array} array - Das zu sortierende Array
   * @param {string} key - Der Schlüssel, nach dem sortiert werden soll
   * @param {boolean} ascending - Ob aufsteigend sortiert werden soll
   * @returns {Array} - Das sortierte Array
   */
  sortArrayByKey(array, key, ascending = true) {
    if (!array || !Array.isArray(array)) return [];
    
    return [...array].sort((a, b) => {
      if (a[key] === undefined) return ascending ? 1 : -1;
      if (b[key] === undefined) return ascending ? -1 : 1;
      
      const valueA = typeof a[key] === 'string' ? a[key].toLowerCase() : a[key];
      const valueB = typeof b[key] === 'string' ? b[key].toLowerCase() : b[key];
      
      if (valueA < valueB) return ascending ? -1 : 1;
      if (valueA > valueB) return ascending ? 1 : -1;
      return 0;
    });
  },
  
  /**
   * Filtert ein Array von Objekten nach einem Suchbegriff
   * @param {Array} array - Das zu filternde Array
   * @param {string} searchTerm - Der Suchbegriff
   * @param {Array} keys - Die Schlüssel, in denen gesucht werden soll
   * @returns {Array} - Das gefilterte Array
   */
  filterArrayBySearchTerm(array, searchTerm, keys) {
    if (!array || !Array.isArray(array) || !searchTerm || !keys || !Array.isArray(keys)) {
      return array || [];
    }
    
    const term = searchTerm.toLowerCase();
    
    return array.filter(item => {
      return keys.some(key => {
        const value = item[key];
        if (value === null || value === undefined) return false;
        
        return String(value).toLowerCase().includes(term);
      });
    });
  },
  
  /**
   * Gruppiert ein Array von Objekten nach einem Attribut
   * @param {Array} array - Das zu gruppierende Array
   * @param {string} key - Der Schlüssel, nach dem gruppiert werden soll
   * @returns {Object} - Das gruppierte Objekt
   */
  groupArrayByKey(array, key) {
    if (!array || !Array.isArray(array)) return {};
    
    return array.reduce((result, item) => {
      const groupKey = item[key] || 'Andere';
      result[groupKey] = result[groupKey] || [];
      result[groupKey].push(item);
      return result;
    }, {});
  },
  
  /**
   * Debounce-Funktion für Event-Handler
   * @param {Function} func - Die auszuführende Funktion
   * @param {number} delay - Die Verzögerung in Millisekunden
   * @returns {Function} - Die Debounce-Funktion
   */
  debounce(func, delay) {
    let timeout;
    
    return function() {
      const context = this;
      const args = arguments;
      
      clearTimeout(timeout);
      
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, delay);
    };
  },
  
  /**
   * Slugifiziert einen String (für URLs)
   * @param {string} text - Der zu slugifizierende Text
   * @returns {string} - Der Slug
   */
  slugify(text) {
    if (!text) return '';
    
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },
  
  /**
   * Konvertiert eine Datei in einen Base64-String
   * @param {File} file - Die zu konvertierende Datei
   * @returns {Promise<string>} - Der Base64-String
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result);
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsDataURL(file);
    });
  },
  
  /**
   * Formatiert eine Dateigröße in ein lesbares Format
   * @param {number} bytes - Die Bytes
   * @param {number} decimals - Die Anzahl der Dezimalstellen
   * @returns {string} - Die formatierte Dateigröße
   */
  formatFileSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },
  
  /**
   * Entfernt HTML-Tags aus einem String
   * @param {string} html - Der HTML-String
   * @returns {string} - Der bereinigte String
   */
  stripHtml(html) {
    if (!html) return '';
    
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  },
  
  /**
   * Erstellt eine Deepcopy eines Objekts
   * @param {Object} obj - Das zu kopierende Objekt
   * @returns {Object} - Die Kopie
   */
  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
};

// Mache die Funktionen global verfügbar
window.utils = utils; 