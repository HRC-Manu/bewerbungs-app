/**
 * Dokument-Service für die zentrale Koordination aller dokumentbezogenen Funktionen
 * Langfristige Lösung für die Dokumentenanalyse und -verwaltung
 */

import optimizedServices from './optimized-services.js';
import advancedProfileManager from './advanced-profile-manager.js';

class DocumentService {
    constructor() {
        // Importiere optimierte Dienste
        this.documentAnalyzer = optimizedServices.documentAnalyzer;
        this.documentExtractor = optimizedServices.documentExtractor;
        this.textEnhancer = optimizedServices.textEnhancer;
        this.profileManager = advancedProfileManager;
        
        // Status-Tracking
        this.activeDocuments = {
            resume: null,
            coverLetter: null,
            jobPosting: null
        };
        
        // Cache für extrahierte Texte und Analyseergebnisse
        this.extractedTexts = new Map();
        this.analysisResults = new Map();
        
        // Event-Listener
        this.eventListeners = {
            'documentExtracted': [],
            'documentAnalyzed': [],
            'matchingCompleted': []
        };
        
        console.log('Dokument-Service initialisiert');
    }
    
    /**
     * Extrahiert Text aus einer Datei
     * @param {File} file - Die zu extrahierende Datei
     * @returns {Promise<{success: boolean, text: string, error: string|null}>} Extraktionsergebnis
     */
    async extractText(file) {
        if (!file) {
            return { success: false, text: '', error: 'Keine Datei angegeben' };
        }
        
        console.log(`Extrahiere Text aus ${file.name}...`);
        
        try {
            // Prüfe Cache
            const cacheKey = `${file.name}_${file.size}_${file.lastModified}`;
            if (this.extractedTexts.has(cacheKey)) {
                console.log('Text aus Cache geladen');
                return { 
                    success: true, 
                    text: this.extractedTexts.get(cacheKey),
                    format: file.type,
                    fromCache: true
                };
            }
            
            // Verwende den optimierten Dokumentenextraktor
            const result = await this.documentExtractor.extractText(file);
            
            if (result.success) {
                console.log(`Text erfolgreich extrahiert (${result.text.length} Zeichen)`);
                
                // Speichere im Cache
                this.extractedTexts.set(cacheKey, result.text);
                
                // Löse Event aus
                this._triggerEvent('documentExtracted', { 
                    file: file,
                    text: result.text,
                    format: result.format
                });
                
                return result;
            } else {
                console.error('Fehler bei der Textextraktion:', result.error);
                return { success: false, text: '', error: result.error || 'Unbekannter Fehler bei der Textextraktion' };
            }
        } catch (error) {
            console.error('Fehler bei der Textextraktion:', error);
            return { success: false, text: '', error: error.message || 'Unbekannter Fehler bei der Textextraktion' };
        }
    }
    
    /**
     * Analysiert einen Lebenslauf
     * @param {File|string} input - Die Lebenslauf-Datei oder der Text
     * @param {Object} options - Optionen für die Analyse
     * @returns {Promise<Object>} Analyseergebnis
     */
    async analyzeResume(input, options = {}) {
        console.log('Analysiere Lebenslauf...');
        
        try {
            let text = '';
            let cacheKey = '';
            
            // Wenn Input eine Datei ist, extrahiere zuerst den Text
            if (input instanceof File) {
                cacheKey = `resume_${input.name}_${input.size}_${input.lastModified}`;
                
                // Prüfe Analyse-Cache
                if (this.analysisResults.has(cacheKey) && !options.forceReanalysis) {
                    console.log('Analyseergebnis aus Cache geladen');
                    return this.analysisResults.get(cacheKey);
                }
                
                const extractionResult = await this.extractText(input);
                if (!extractionResult.success) {
                    throw new Error(extractionResult.error || 'Fehler bei der Textextraktion');
                }
                text = extractionResult.text;
                this.activeDocuments.resume = input;
            } else if (typeof input === 'string') {
                text = input;
                cacheKey = `resume_text_${this._hashString(text)}`;
                
                // Prüfe Analyse-Cache
                if (this.analysisResults.has(cacheKey) && !options.forceReanalysis) {
                    console.log('Analyseergebnis aus Cache geladen');
                    return this.analysisResults.get(cacheKey);
                }
            } else {
                throw new Error('Ungültiger Input-Typ. Erwartet: File oder String');
            }
            
            // Analysiere den Text mit dem DocumentAnalyzer
            const analysisResult = await this.documentAnalyzer._analyzeWithAI(text);
            
            console.log('Lebenslauf-Analyse abgeschlossen');
            
            // Speichere Ergebnis im Cache
            if (cacheKey) {
                this.analysisResults.set(cacheKey, analysisResult);
            }
            
            // Löse Event aus
            this._triggerEvent('documentAnalyzed', {
                type: 'resume',
                result: analysisResult,
                input: input instanceof File ? input.name : 'Text-Input'
            });
            
            return analysisResult;
        } catch (error) {
            console.error('Fehler bei der Lebenslaufanalyse:', error);
            throw error;
        }
    }
    
    /**
     * Analysiert eine Stellenanzeige
     * @param {File|string} input - Die Stellenanzeigen-Datei oder der Text
     * @param {Object} options - Optionen für die Analyse
     * @returns {Promise<Object>} Analyseergebnis
     */
    async analyzeJobPosting(input, options = {}) {
        console.log('Analysiere Stellenanzeige...');
        
        try {
            let text = '';
            let cacheKey = '';
            
            // Wenn Input eine Datei ist, extrahiere zuerst den Text
            if (input instanceof File) {
                cacheKey = `jobPosting_${input.name}_${input.size}_${input.lastModified}`;
                
                // Prüfe Analyse-Cache
                if (this.analysisResults.has(cacheKey) && !options.forceReanalysis) {
                    console.log('Analyseergebnis aus Cache geladen');
                    return this.analysisResults.get(cacheKey);
                }
                
                const extractionResult = await this.extractText(input);
                if (!extractionResult.success) {
                    throw new Error(extractionResult.error || 'Fehler bei der Textextraktion');
                }
                text = extractionResult.text;
                this.activeDocuments.jobPosting = input;
            } else if (typeof input === 'string') {
                text = input;
                cacheKey = `jobPosting_text_${this._hashString(text)}`;
                
                // Prüfe Analyse-Cache
                if (this.analysisResults.has(cacheKey) && !options.forceReanalysis) {
                    console.log('Analyseergebnis aus Cache geladen');
                    return this.analysisResults.get(cacheKey);
                }
            } else {
                throw new Error('Ungültiger Input-Typ. Erwartet: File oder String');
            }
            
            // Analysiere den Text mit dem DocumentAnalyzer für Stellenanzeigen
            const analysisResult = await this.documentAnalyzer._extractJobPostingFields(text);
            
            console.log('Stellenanzeigen-Analyse abgeschlossen');
            
            // Speichere Ergebnis im Cache
            if (cacheKey) {
                this.analysisResults.set(cacheKey, analysisResult);
            }
            
            // Löse Event aus
            this._triggerEvent('documentAnalyzed', {
                type: 'jobPosting',
                result: analysisResult,
                input: input instanceof File ? input.name : 'Text-Input'
            });
            
            return analysisResult;
        } catch (error) {
            console.error('Fehler bei der Stellenanzeigenanalyse:', error);
            throw error;
        }
    }
    
    /**
     * Führt einen Matching-Prozess zwischen Lebenslauf und Stellenanzeige durch
     * @param {Object} resumeData - Die Lebenslaufdaten oder das Analyse-Ergebnis
     * @param {Object} jobPostingData - Die Stellenanzeigendaten oder das Analyse-Ergebnis
     * @returns {Promise<Object>} Matching-Ergebnis
     */
    async matchResumeWithJobPosting(resumeData, jobPostingData) {
        console.log('Starte Matching-Prozess...');
        
        try {
            let resumeText, jobPostingText;
            
            // Bestimme, ob wir Daten oder Textextraktionen haben
            if (!resumeData) {
                // Verwende aktives Dokument
                resumeText = this.extractedTexts.get(`${this.activeDocuments.resume?.name}_${this.activeDocuments.resume?.size}_${this.activeDocuments.resume?.lastModified}`);
                if (!resumeText) {
                    throw new Error('Kein Lebenslauf verfügbar für Matching');
                }
            } else if (typeof resumeData === 'string') {
                resumeText = resumeData;
            } else {
                // Verwende die resumeData als strukturierte Daten und konvertiere zu Text
                resumeText = JSON.stringify(resumeData);
            }
            
            if (!jobPostingData) {
                // Verwende aktives Dokument
                jobPostingText = this.extractedTexts.get(`${this.activeDocuments.jobPosting?.name}_${this.activeDocuments.jobPosting?.size}_${this.activeDocuments.jobPosting?.lastModified}`);
                if (!jobPostingText) {
                    throw new Error('Keine Stellenanzeige verfügbar für Matching');
                }
            } else if (typeof jobPostingData === 'string') {
                jobPostingText = jobPostingData;
            } else {
                // Verwende die jobPostingData als strukturierte Daten und konvertiere zu Text
                jobPostingText = JSON.stringify(jobPostingData);
            }
            
            // Führe das Matching durch
            const matchingResult = await this.documentAnalyzer._matchWithAI(resumeText, jobPostingText);
            
            console.log('Matching abgeschlossen', matchingResult);
            
            // Löse Event aus
            this._triggerEvent('matchingCompleted', {
                result: matchingResult,
                resumeSource: resumeData ? 'provided' : 'active',
                jobPostingSource: jobPostingData ? 'provided' : 'active'
            });
            
            return matchingResult;
        } catch (error) {
            console.error('Fehler beim Matching:', error);
            throw error;
        }
    }
    
    /**
     * Speichert eine Bewerbung im Profil
     * @param {Object} applicationData - Die Bewerbungsdaten
     * @returns {Promise<string>} Die ID der gespeicherten Bewerbung
     */
    async saveApplication(applicationData) {
        try {
            // Grundlegende Validierung
            if (!applicationData.jobTitle) {
                throw new Error('Stellentitel ist erforderlich');
            }
            
            // Erstelle eine neue Bewerbung
            const application = {
                id: this._generateId(),
                jobTitle: applicationData.jobTitle,
                company: applicationData.company || '',
                dateApplied: applicationData.dateApplied || new Date().toISOString(),
                status: applicationData.status || 'eingereicht',
                notes: applicationData.notes || '',
                jobPosting: applicationData.jobPosting || null,
                resume: applicationData.resume || null,
                coverLetter: applicationData.coverLetter || null,
                matching: applicationData.matching || null,
                documents: applicationData.documents || [],
                events: applicationData.events || [],
                createdAt: new Date().toISOString()
            };
            
            // Speichere im Profil
            const applicationId = await this.profileManager.addItemToArray('applications', application);
            
            // Aktualisiere die Statistiken
            const statistics = this.profileManager.profile.statistics || {};
            statistics.totalApplications = (statistics.totalApplications || 0) + 1;
            await this.profileManager.updateProfileSection('statistics', statistics);
            
            console.log('Bewerbung gespeichert:', applicationId);
            
            return applicationId;
        } catch (error) {
            console.error('Fehler beim Speichern der Bewerbung:', error);
            throw error;
        }
    }
    
    /**
     * Fügt einen Event-Listener hinzu
     * @param {string} event - Das Event (documentExtracted, documentAnalyzed, matchingCompleted)
     * @param {Function} callback - Die aufzurufende Funktion
     */
    addEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }
    
    /**
     * Entfernt einen Event-Listener
     * @param {string} event - Das Event
     * @param {Function} callback - Die zu entfernende Funktion
     */
    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }
    
    /**
     * Löst ein Event aus
     * @param {string} event - Das auszulösende Event
     * @param {Object} data - Die Event-Daten
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
     * Erzeugt einen einfachen Hash für einen String
     * @param {string} str - Der zu hashende String
     * @returns {string} Der Hash
     * @private
     */
    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
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
     * Zeigt eine Toast-Nachricht an, falls verfügbar
     * @param {string} message - Die Nachricht
     * @param {string} type - Der Typ der Nachricht (success, danger, warning, info)
     * @private
     */
    _showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Erstelle eine globale Instanz und exportiere sie
const documentService = new DocumentService();

// Mache den Service global verfügbar
window.documentService = documentService;

export default documentService; 