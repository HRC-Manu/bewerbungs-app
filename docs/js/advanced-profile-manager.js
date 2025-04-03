/**
 * Erweiterter Profil-Manager mit umfassender Bewerber-Datenerfassung
 * Basierend auf dem Profil-Management aus Core_Code.md
 */

class AdvancedProfileManager {
    constructor() {
        this.storage = localStorage;
        this.storageKey = 'advanced_profile_data';
        this.profile = this.loadProfile();
        this.autosaveEnabled = true;
        this.backupInterval = 7 * 24 * 60 * 60 * 1000; // 7 Tage
        this.lastBackupDate = this.getLastBackupDate();
        
        // Event-Handler für Profiländerungen
        this.eventListeners = {
            'profileChanged': [],
            'profileSaved': [],
            'profileLoaded': [],
            'profileBackupCreated': []
        };
        
        // Initialisiere Backup-Mechanismus
        this._setupBackupMechanism();
    }
    
    /**
     * Lädt das Bewerberprofil aus dem localStorage
     * @returns {Object} Das geladene Profil
     */
    loadProfile() {
        try {
            const savedProfile = this.storage.getItem(this.storageKey);
            
            if (savedProfile) {
                const profile = JSON.parse(savedProfile);
                this._triggerEvent('profileLoaded', profile);
                return profile;
            }
        } catch (error) {
            console.error('Fehler beim Laden des Profils:', error);
            this._showToast('Fehler beim Laden des Profils. Ein leeres Profil wurde erstellt.', 'warning');
        }
        
        // Erstelle ein neues Profil, wenn keines gefunden wurde
        return this._createDefaultProfile();
    }
    
    /**
     * Speichert das Bewerberprofil im localStorage
     * @returns {boolean} Ob das Speichern erfolgreich war
     */
    saveProfile() {
        try {
            // Aktualisiere die letzte Änderungszeit
            this.profile.lastModified = new Date().toISOString();
            
            // Speichere das Profil
            this.storage.setItem(this.storageKey, JSON.stringify(this.profile));
            
            // Prüfe, ob ein Backup erstellt werden sollte
            this._checkAndCreateBackup();
            
            // Benachrichtige Event-Listener
            this._triggerEvent('profileSaved', this.profile);
            
            return true;
        } catch (error) {
            console.error('Fehler beim Speichern des Profils:', error);
            this._showToast('Fehler beim Speichern des Profils', 'danger');
            return false;
        }
    }
    
    /**
     * Aktualisiert einen bestimmten Bereich des Profils
     * @param {string} section - Der zu aktualisierende Bereich
     * @param {Object} data - Die neuen Daten
     * @param {boolean} saveImmediately - Ob sofort gespeichert werden soll
     * @returns {boolean} Ob die Aktualisierung erfolgreich war
     */
    updateProfileSection(section, data, saveImmediately = true) {
        try {
            if (!this.profile) {
                this.profile = this._createDefaultProfile();
            }
            
            // Aktualisiere den angegebenen Bereich
            if (section.includes('.')) {
                // Behandle verschachtelte Pfade (z.B. "personalData.address")
                const parts = section.split('.');
                let current = this.profile;
                
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!current[parts[i]]) {
                        current[parts[i]] = {};
                    }
                    current = current[parts[i]];
                }
                
                current[parts[parts.length - 1]] = data;
            } else {
                // Einfacher Pfad
                this.profile[section] = data;
            }
            
            // Benachrichtige über Änderung
            this._triggerEvent('profileChanged', { section, data });
            
            // Speichere sofort, wenn aktiviert
            if (saveImmediately && this.autosaveEnabled) {
                return this.saveProfile();
            }
            
            return true;
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Profils:', error);
            this._showToast('Fehler beim Aktualisieren des Profils', 'danger');
            return false;
        }
    }
    
    /**
     * Fügt ein Element zu einem Array im Profil hinzu
     * @param {string} arrayPath - Der Pfad zum Array (z.B. "experience")
     * @param {Object} item - Das hinzuzufügende Element
     * @param {boolean} saveImmediately - Ob sofort gespeichert werden soll
     * @returns {string|null} Die ID des neuen Elements oder null bei Fehler
     */
    addItemToArray(arrayPath, item, saveImmediately = true) {
        try {
            // Stelle sicher, dass das Item eine ID hat
            if (!item.id) {
                item.id = this._generateId();
            }
            
            // Stelle sicher, dass der Array existiert
            const path = arrayPath.split('.');
            let current = this.profile;
            
            for (const part of path) {
                if (!current[part]) {
                    current[part] = [];
                }
                current = current[part];
            }
            
            // Stelle sicher, dass wir ein Array haben
            if (!Array.isArray(current)) {
                current = [];
                
                // Setze den Pfad auf ein Array
                let target = this.profile;
                for (let i = 0; i < path.length - 1; i++) {
                    target = target[path[i]];
                }
                target[path[path.length - 1]] = current;
            }
            
            // Füge das Item hinzu
            current.push(item);
            
            // Benachrichtige über Änderung
            this._triggerEvent('profileChanged', { section: arrayPath, action: 'add', item });
            
            // Speichere sofort, wenn aktiviert
            if (saveImmediately && this.autosaveEnabled) {
                this.saveProfile();
            }
            
            return item.id;
        } catch (error) {
            console.error('Fehler beim Hinzufügen des Elements:', error);
            this._showToast('Fehler beim Hinzufügen zum Profil', 'danger');
            return null;
        }
    }
    
    /**
     * Aktualisiert ein Element in einem Array
     * @param {string} arrayPath - Der Pfad zum Array
     * @param {string} itemId - Die ID des zu aktualisierenden Elements
     * @param {Object} updatedItem - Die aktualisierten Daten
     * @param {boolean} saveImmediately - Ob sofort gespeichert werden soll
     * @returns {boolean} Ob die Aktualisierung erfolgreich war
     */
    updateArrayItem(arrayPath, itemId, updatedItem, saveImmediately = true) {
        try {
            // Finde das Array
            const path = arrayPath.split('.');
            let current = this.profile;
            
            for (const part of path) {
                if (!current[part]) {
                    return false;
                }
                current = current[part];
            }
            
            // Stelle sicher, dass wir ein Array haben
            if (!Array.isArray(current)) {
                return false;
            }
            
            // Finde das Element mit der angegebenen ID
            const index = current.findIndex(item => item.id === itemId);
            if (index === -1) {
                return false;
            }
            
            // Aktualisiere das Element (behalte die ID bei)
            updatedItem.id = itemId;
            current[index] = updatedItem;
            
            // Benachrichtige über Änderung
            this._triggerEvent('profileChanged', { section: arrayPath, action: 'update', item: updatedItem });
            
            // Speichere sofort, wenn aktiviert
            if (saveImmediately && this.autosaveEnabled) {
                this.saveProfile();
            }
            
            return true;
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Elements:', error);
            this._showToast('Fehler beim Aktualisieren des Profil-Elements', 'danger');
            return false;
        }
    }
    
    /**
     * Entfernt ein Element aus einem Array
     * @param {string} arrayPath - Der Pfad zum Array
     * @param {string} itemId - Die ID des zu entfernenden Elements
     * @param {boolean} saveImmediately - Ob sofort gespeichert werden soll
     * @returns {boolean} Ob das Entfernen erfolgreich war
     */
    removeArrayItem(arrayPath, itemId, saveImmediately = true) {
        try {
            // Finde das Array
            const path = arrayPath.split('.');
            let current = this.profile;
            
            for (const part of path) {
                if (!current[part]) {
                    return false;
                }
                current = current[part];
            }
            
            // Stelle sicher, dass wir ein Array haben
            if (!Array.isArray(current)) {
                return false;
            }
            
            // Finde das Element mit der angegebenen ID
            const index = current.findIndex(item => item.id === itemId);
            if (index === -1) {
                return false;
            }
            
            // Entferne das Element
            const removedItem = current.splice(index, 1)[0];
            
            // Benachrichtige über Änderung
            this._triggerEvent('profileChanged', { section: arrayPath, action: 'remove', item: removedItem });
            
            // Speichere sofort, wenn aktiviert
            if (saveImmediately && this.autosaveEnabled) {
                this.saveProfile();
            }
            
            return true;
        } catch (error) {
            console.error('Fehler beim Entfernen des Elements:', error);
            this._showToast('Fehler beim Entfernen des Profil-Elements', 'danger');
            return false;
        }
    }
    
    /**
     * Fügt eine neue Bewerbung hinzu
     * @param {Object} application - Die Bewerbungsdaten
     * @returns {string|null} Die ID der neuen Bewerbung oder null bei Fehler
     */
    addApplication(application) {
        // Stelle sicher, dass einige Grunddaten vorhanden sind
        const newApplication = {
            id: this._generateId(),
            status: 'eingereicht',
            dateApplied: new Date().toISOString(),
            dateModified: new Date().toISOString(),
            ...application
        };
        
        return this.addItemToArray('applications', newApplication);
    }
    
    /**
     * Erstellt ein Backup des aktuellen Profils
     * @returns {boolean} Ob das Backup erfolgreich erstellt wurde
     */
    createBackup() {
        try {
            const timestamp = new Date().toISOString();
            const backupKey = `profile_backup_${timestamp}`;
            
            // Speichere das Backup
            this.storage.setItem(backupKey, JSON.stringify(this.profile));
            
            // Aktualisiere das Datum des letzten Backups
            this.storage.setItem('last_profile_backup_date', timestamp);
            this.lastBackupDate = timestamp;
            
            // Verwalte die Anzahl der Backups (behalte die letzten 5)
            this._manageBackups();
            
            // Benachrichtige über das Backup
            this._triggerEvent('profileBackupCreated', { timestamp });
            
            this._showToast('Backup erfolgreich erstellt', 'success');
            return true;
        } catch (error) {
            console.error('Fehler beim Erstellen des Backups:', error);
            this._showToast('Fehler beim Erstellen des Backups', 'danger');
            return false;
        }
    }
    
    /**
     * Lädt ein Backup
     * @param {string} timestamp - Der Zeitstempel des zu ladenden Backups
     * @returns {boolean} Ob das Laden erfolgreich war
     */
    loadBackup(timestamp) {
        try {
            const backupKey = `profile_backup_${timestamp}`;
            const backup = this.storage.getItem(backupKey);
            
            if (!backup) {
                this._showToast('Backup nicht gefunden', 'warning');
                return false;
            }
            
            // Lade das Backup
            this.profile = JSON.parse(backup);
            
            // Speichere das geladene Backup als aktuelles Profil
            this.saveProfile();
            
            this._showToast('Backup erfolgreich geladen', 'success');
            return true;
        } catch (error) {
            console.error('Fehler beim Laden des Backups:', error);
            this._showToast('Fehler beim Laden des Backups', 'danger');
            return false;
        }
    }
    
    /**
     * Exportiert das Profil als JSON-Datei
     * @returns {boolean} Ob der Export erfolgreich war
     */
    exportProfile() {
        try {
            const dataStr = JSON.stringify(this.profile, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `bewerberprofil_${new Date().toISOString().slice(0, 10)}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.style.display = 'none';
            
            document.body.appendChild(linkElement);
            linkElement.click();
            document.body.removeChild(linkElement);
            
            this._showToast('Profil erfolgreich exportiert', 'success');
            return true;
        } catch (error) {
            console.error('Fehler beim Exportieren des Profils:', error);
            this._showToast('Fehler beim Exportieren des Profils', 'danger');
            return false;
        }
    }
    
    /**
     * Importiert ein Profil aus einer JSON-Datei
     * @param {File} file - Die zu importierende JSON-Datei
     * @returns {Promise<boolean>} Ob der Import erfolgreich war
     */
    async importProfile(file) {
        try {
            const fileContents = await this._readFileAsText(file);
            const importedProfile = JSON.parse(fileContents);
            
            // Erstelle ein Backup vor dem Import
            this.createBackup();
            
            // Importiere das Profil
            this.profile = importedProfile;
            
            // Speichere das importierte Profil
            this.saveProfile();
            
            this._showToast('Profil erfolgreich importiert', 'success');
            return true;
        } catch (error) {
            console.error('Fehler beim Importieren des Profils:', error);
            this._showToast('Fehler beim Importieren des Profils', 'danger');
            return false;
        }
    }
    
    /**
     * Fügt einen Event-Listener hinzu
     * @param {string} event - Das Event (profileChanged, profileSaved, profileLoaded, profileBackupCreated)
     * @param {Function} callback - Die Callback-Funktion
     */
    addEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }
    
    /**
     * Entfernt einen Event-Listener
     * @param {string} event - Das Event
     * @param {Function} callback - Die zu entfernende Callback-Funktion
     */
    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }
    
    /**
     * Gibt das Datum des letzten Backups zurück
     * @private
     */
    getLastBackupDate() {
        return this.storage.getItem('last_profile_backup_date') || null;
    }
    
    /**
     * Setzt den Backup-Mechanismus auf
     * @private
     */
    _setupBackupMechanism() {
        // Überprüfe, ob ein Backup erstellt werden sollte
        this._checkAndCreateBackup();
        
        // Füge einen Event-Listener hinzu, um nach jeder Speicherung zu prüfen
        this.addEventListener('profileSaved', () => {
            this._checkAndCreateBackup();
        });
    }
    
    /**
     * Prüft, ob ein Backup erstellt werden sollte und erstellt es ggf.
     * @private
     */
    _checkAndCreateBackup() {
        const now = new Date();
        const lastBackup = this.lastBackupDate ? new Date(this.lastBackupDate) : null;
        
        // Erstelle ein Backup, wenn das letzte Backup älter als der Backup-Intervall ist
        if (!lastBackup || (now - lastBackup) > this.backupInterval) {
            this.createBackup();
        }
    }
    
    /**
     * Verwaltet die Anzahl der Backups (behält die letzten 5)
     * @private
     */
    _manageBackups() {
        try {
            // Sammle alle Backup-Schlüssel
            const backupKeys = [];
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith('profile_backup_')) {
                    backupKeys.push(key);
                }
            }
            
            // Sortiere sie nach Datum (neueste zuerst)
            backupKeys.sort().reverse();
            
            // Lösche überschüssige Backups
            const maxBackups = 5;
            if (backupKeys.length > maxBackups) {
                for (let i = maxBackups; i < backupKeys.length; i++) {
                    this.storage.removeItem(backupKeys[i]);
                }
            }
        } catch (error) {
            console.error('Fehler beim Verwalten der Backups:', error);
        }
    }
    
    /**
     * Liest eine Datei als Text
     * @param {File} file - Die zu lesende Datei
     * @returns {Promise<string>} Der Dateiinhalt
     * @private
     */
    _readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => resolve(event.target.result);
            reader.onerror = error => reject(error);
            reader.readAsText(file);
        });
    }
    
    /**
     * Erstellt ein Standard-Profil
     * @returns {Object} Das Standard-Profil
     * @private
     */
    _createDefaultProfile() {
        return {
            personalData: {
                name: '',
                address: '',
                phone: '',
                email: '',
                birthdate: '',
                birthplace: '',
                nationality: '',
                photo: null // Base64-Daten für das Foto
            },
            education: [], // Ausbildung
            experience: [], // Berufserfahrung
            skills: {
                technical: [], // Technische Fähigkeiten
                soft: [], // Soft Skills
                languages: [] // Sprachen
            },
            projects: [], // Projekte
            certifications: [], // Zertifizierungen
            documents: {
                resumes: [], // Gespeicherte Lebenslauf-Versionen
                coverLetters: [], // Gespeicherte Anschreiben
                certificates: [], // Zeugnisse und Zertifikate
                references: [] // Referenzen
            },
            applications: [], // Bewerbungen
            preferences: {
                darkMode: false,
                fontSize: 'medium',
                language: 'de',
                defaultResumeStyle: 'classic',
                defaultLetterStyle: 'professional'
            },
            statistics: {
                totalApplications: 0,
                interviews: 0,
                offers: 0,
                rejections: 0
            },
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
    }
    
    /**
     * Generiert eine eindeutige ID
     * @returns {string} Die generierte ID
     * @private
     */
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    /**
     * Löst ein Event aus
     * @param {string} event - Das auszulösende Event
     * @param {*} data - Die Daten für das Event
     * @private
     */
    _triggerEvent(event, data) {
        if (this.eventListeners[event]) {
            for (const callback of this.eventListeners[event]) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Fehler im Event-Listener für ${event}:`, error);
                }
            }
        }
    }
    
    /**
     * Zeigt eine Toast-Nachricht an
     * @param {string} message - Die anzuzeigende Nachricht
     * @param {string} type - Der Typ der Nachricht (success, danger, warning, info)
     * @private
     */
    _showToast(message, type) {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Globale Instanz erstellen
const advancedProfileManager = new AdvancedProfileManager();

// Exportiere die Instanz
export default advancedProfileManager; 