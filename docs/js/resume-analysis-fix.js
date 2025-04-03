/**
 * Korrekturen für die Lebenslaufanalyse-Komponente
 * Behebt das Problem mit der Verwendung von Beispiel-Lebensläufen
 */

import optimizedServices from './optimized-services.js';

class ResumeAnalyzer {
    constructor() {
        this.documentAnalyzer = optimizedServices.documentAnalyzer;
        this.documentExtractor = optimizedServices.documentExtractor || window.documentExtractor;
        this.profileManager = optimizedServices.profileManager;
        
        // DOM-Elemente
        this.uploadArea = null;
        this.fileInput = null;
        this.analyzeButton = null;
        this.resultsContainer = null;
        this.loadingIndicator = null;
        
        // Status
        this.uploadedFile = null;
        this.extractedText = '';
        this.analysisResults = null;
        
        // Initialisierung
        this.initialize();
    }
    
    /**
     * Initialisiert die Komponente
     */
    initialize() {
        // DOM-Elemente finden
        this.uploadArea = document.getElementById('resumeUploadArea');
        this.fileInput = document.getElementById('resumeFileInput');
        this.analyzeButton = document.getElementById('analyzeResumeButton');
        this.resultsContainer = document.getElementById('resumeAnalysisResults');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        
        // Event-Listener hinzufügen
        this.setupEventListeners();
    }
    
    /**
     * Richtet die Event-Listener ein
     */
    setupEventListeners() {
        // Upload-Bereich Klick
        if (this.uploadArea) {
            this.uploadArea.addEventListener('click', () => {
                if (this.fileInput) {
                    this.fileInput.click();
                }
            });
        }
        
        // Datei-Input Change
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
        }
        
        // Drag & Drop
        if (this.uploadArea) {
            this.uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.uploadArea.classList.add('dragover');
            });
            
            this.uploadArea.addEventListener('dragleave', () => {
                this.uploadArea.classList.remove('dragover');
            });
            
            this.uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.uploadArea.classList.remove('dragover');
                this.handleFileUpload(e.dataTransfer.files);
            });
        }
        
        // Analyse-Button
        if (this.analyzeButton) {
            this.analyzeButton.addEventListener('click', () => {
                this.analyzeResume();
            });
        }
    }
    
    /**
     * Verarbeitet den Datei-Upload
     */
    handleFileUpload(files) {
        if (!files || files.length === 0) return;
        
        // Nimm die erste Datei
        const file = files[0];
        
        // Überprüfe Dateityp
        if (!this.documentExtractor.isFormatSupported(file.type)) {
            this.showToast(`Nicht unterstütztes Dateiformat: ${file.type}`, 'danger');
            return;
        }
        
        // Zeige Dateiname an
        if (this.uploadArea) {
            this.uploadArea.querySelector('.upload-text').innerHTML = `
                <i class="bi bi-file-earmark-text me-2"></i>
                <span>${file.name}</span>
            `;
            this.uploadArea.classList.add('has-file');
        }
        
        // Speichere Datei
        this.uploadedFile = file;
        
        // Aktiviere Analyse-Button
        if (this.analyzeButton) {
            this.analyzeButton.disabled = false;
        }
        
        // Extrahiere Text direkt nach dem Upload
        this.extractTextFromFile(file);
    }
    
    /**
     * Extrahiert Text aus der hochgeladenen Datei
     */
    async extractTextFromFile(file) {
        if (!file) return;
        
        try {
            this.showLoadingIndicator(true);
            
            // Extrahiere Text mit optimiertem Extraktor
            const extractionResult = await this.documentExtractor.extractText(file);
            
            if (!extractionResult.success) {
                throw new Error(extractionResult.error || 'Fehler bei der Textextraktion');
            }
            
            // Speichere extrahierten Text
            this.extractedText = extractionResult.text;
            
            console.log('Extrahierter Text:', this.extractedText.substring(0, 100) + '...');
            
            this.showToast('Text erfolgreich extrahiert', 'success');
        } catch (error) {
            console.error('Fehler bei der Textextraktion:', error);
            this.showToast('Fehler bei der Textextraktion: ' + error.message, 'danger');
            this.extractedText = '';
        } finally {
            this.showLoadingIndicator(false);
        }
    }
    
    /**
     * Analysiert den Lebenslauf mit dem DocumentAnalyzer
     */
    async analyzeResume() {
        if (!this.uploadedFile || !this.extractedText) {
            this.showToast('Bitte laden Sie zuerst einen Lebenslauf hoch', 'warning');
            return;
        }
        
        try {
            this.showLoadingIndicator(true);
            
            // Wir haben zwei Optionen: Entweder die Datei oder den bereits extrahierten Text analysieren
            let analysisResult;
            
            // Option 1: Direkt die Datei analysieren
            if (this.documentAnalyzer.extractStructuredData) {
                analysisResult = await this.documentAnalyzer.extractStructuredData(this.uploadedFile);
                
                // Prüfe, ob wir die Daten direkt aus dem Ergebnis nehmen können
                if (analysisResult.success && analysisResult.data) {
                    analysisResult = analysisResult.data;
                }
            } 
            // Option 2: Den bereits extrahierten Text verwenden (falls Option 1 nicht möglich oder fehlschlägt)
            else {
                analysisResult = await this.documentAnalyzer._analyzeWithAI(this.extractedText);
            }
            
            // Speichere die Ergebnisse
            this.analysisResults = analysisResult;
            
            // Zeige die Ergebnisse an
            this.displayAnalysisResults(analysisResult);
            
            // Speichere auch im Profil
            this.saveToProfile(analysisResult);
            
            this.showToast('Lebenslauf erfolgreich analysiert', 'success');
        } catch (error) {
            console.error('Fehler bei der Lebenslaufanalyse:', error);
            this.showToast('Fehler bei der Analyse: ' + error.message, 'danger');
        } finally {
            this.showLoadingIndicator(false);
        }
    }
    
    /**
     * Zeigt die Analyseergebnisse an
     */
    displayAnalysisResults(results) {
        if (!this.resultsContainer) return;
        
        // Leere den Container
        this.resultsContainer.innerHTML = '';
        
        // Erstelle HTML für die Ergebnisse
        let html = `
            <div class="analysis-results-header">
                <h3>Analyseergebnisse</h3>
                <p class="text-muted">Hier sind die aus Ihrem Lebenslauf extrahierten Informationen:</p>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="card glass-card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Persönliche Daten</h5>
                        </div>
                        <div class="card-body">
                            <ul class="list-group list-group-flush">
                                <li class="list-group-item d-flex justify-content-between align-items-start">
                                    <div>
                                        <div class="fw-bold">Name</div>
                                    </div>
                                    <span>${results.personalData?.name || 'Nicht angegeben'}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-start">
                                    <div>
                                        <div class="fw-bold">E-Mail</div>
                                    </div>
                                    <span>${results.personalData?.email || 'Nicht angegeben'}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-start">
                                    <div>
                                        <div class="fw-bold">Telefon</div>
                                    </div>
                                    <span>${results.personalData?.phone || 'Nicht angegeben'}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-start">
                                    <div>
                                        <div class="fw-bold">Adresse</div>
                                    </div>
                                    <span>${results.personalData?.address || 'Nicht angegeben'}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="card glass-card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Fähigkeiten</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <h6>Technisch</h6>
                                <div class="skill-tags">
                                    ${this.renderSkillList(results.skills?.technical)}
                                </div>
                            </div>
                            <div class="mb-3">
                                <h6>Methodisch</h6>
                                <div class="skill-tags">
                                    ${this.renderSkillList(results.skills?.methodical)}
                                </div>
                            </div>
                            <div>
                                <h6>Sozial</h6>
                                <div class="skill-tags">
                                    ${this.renderSkillList(results.skills?.social)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card glass-card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Berufserfahrung</h5>
                        </div>
                        <div class="card-body p-0">
                            ${this.renderExperience(results.workExperience)}
                        </div>
                    </div>
                    
                    <div class="card glass-card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Ausbildung</h5>
                        </div>
                        <div class="card-body p-0">
                            ${this.renderEducation(results.education)}
                        </div>
                    </div>
                    
                    <div class="card glass-card">
                        <div class="card-header">
                            <h5 class="mb-0">Sprachen</h5>
                        </div>
                        <div class="card-body">
                            ${this.renderLanguages(results.languages)}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-4 d-flex justify-content-between">
                <button class="btn btn-primary" id="saveToProfileBtn">
                    <i class="bi bi-save me-2"></i>Im Profil speichern
                </button>
                <button class="btn btn-outline-secondary" id="exportResumeDataBtn">
                    <i class="bi bi-download me-2"></i>Daten exportieren
                </button>
            </div>
        `;
        
        // Setze HTML im Container
        this.resultsContainer.innerHTML = html;
        
        // Event-Listener für Buttons
        const saveBtn = document.getElementById('saveToProfileBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveToProfile(results));
        }
        
        const exportBtn = document.getElementById('exportResumeDataBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportResumeData(results));
        }
    }
    
    /**
     * Rendert eine Liste von Skills
     */
    renderSkillList(skills) {
        if (!skills || !Array.isArray(skills) || skills.length === 0) {
            return '<div class="text-muted">Keine Angaben</div>';
        }
        
        return skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('');
    }
    
    /**
     * Rendert die Berufserfahrung
     */
    renderExperience(experience) {
        if (!experience || !Array.isArray(experience) || experience.length === 0) {
            return '<div class="p-3 text-muted">Keine Berufserfahrung angegeben</div>';
        }
        
        return `
            <ul class="list-group list-group-flush">
                ${experience.map(exp => `
                    <li class="list-group-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${exp.position || 'Unbekannte Position'}</h6>
                            <span class="badge bg-light text-dark">${exp.period || ''}</span>
                        </div>
                        <p class="mb-1">${exp.company || ''}${exp.location ? ` - ${exp.location}` : ''}</p>
                        ${exp.responsibilities && exp.responsibilities.length > 0 ? `
                            <small class="text-muted">
                                <strong>Aufgaben:</strong> ${exp.responsibilities.join(', ')}
                            </small>
                        ` : ''}
                    </li>
                `).join('')}
            </ul>
        `;
    }
    
    /**
     * Rendert die Ausbildung
     */
    renderEducation(education) {
        if (!education || !Array.isArray(education) || education.length === 0) {
            return '<div class="p-3 text-muted">Keine Ausbildung angegeben</div>';
        }
        
        return `
            <ul class="list-group list-group-flush">
                ${education.map(edu => `
                    <li class="list-group-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${edu.degree || 'Unbekannter Abschluss'}</h6>
                            <span class="badge bg-light text-dark">${edu.period || ''}</span>
                        </div>
                        <p class="mb-1">${edu.institution || ''}${edu.location ? ` - ${edu.location}` : ''}</p>
                        ${edu.focus ? `<small class="text-muted"><strong>Schwerpunkt:</strong> ${edu.focus}</small>` : ''}
                    </li>
                `).join('')}
            </ul>
        `;
    }
    
    /**
     * Rendert die Sprachen
     */
    renderLanguages(languages) {
        if (!languages || !Array.isArray(languages) || languages.length === 0) {
            return '<div class="text-muted">Keine Sprachkenntnisse angegeben</div>';
        }
        
        return `
            <ul class="list-group list-group-flush">
                ${languages.map(lang => `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>${lang.language || 'Unbekannte Sprache'}</span>
                        <span class="badge bg-primary">${lang.level || ''}</span>
                    </li>
                `).join('')}
            </ul>
        `;
    }
    
    /**
     * Speichert die Analyseergebnisse im Profil
     */
    saveToProfile(results) {
        try {
            // Lade das aktuelle Profil
            const profile = this.profileManager.profile;
            
            // Aktualisiere die Profildaten
            if (results.personalData) {
                profile.personalData = { ...profile.personalData, ...results.personalData };
            }
            
            if (results.skills) {
                if (!profile.skills) profile.skills = {};
                if (results.skills.technical) profile.skills.technical = [...results.skills.technical];
                if (results.skills.methodical) profile.skills.methodical = [...results.skills.methodical];
                if (results.skills.social) profile.skills.social = [...results.skills.social];
            }
            
            if (results.workExperience && Array.isArray(results.workExperience)) {
                profile.experience = [...results.workExperience].map(exp => ({
                    ...exp,
                    id: this._generateId()
                }));
            }
            
            if (results.education && Array.isArray(results.education)) {
                profile.education = [...results.education].map(edu => ({
                    ...edu,
                    id: this._generateId()
                }));
            }
            
            if (results.languages && Array.isArray(results.languages)) {
                if (!profile.skills) profile.skills = {};
                profile.skills.languages = [...results.languages];
            }
            
            // Speichere die Analyseergebnisse als Lebenslauf im Profil
            if (!profile.documents) profile.documents = {};
            if (!profile.documents.resumes) profile.documents.resumes = [];
            
            profile.documents.resumes.push({
                id: this._generateId(),
                fileName: this.uploadedFile ? this.uploadedFile.name : 'Analysierter Lebenslauf',
                dateCreated: new Date().toISOString(),
                data: results,
                fileSize: this.uploadedFile ? this.uploadedFile.size : 0
            });
            
            // Speichere das aktualisierte Profil
            this.profileManager.saveProfile();
            
            this.showToast('Daten erfolgreich im Profil gespeichert', 'success');
        } catch (error) {
            console.error('Fehler beim Speichern im Profil:', error);
            this.showToast('Fehler beim Speichern im Profil: ' + error.message, 'danger');
        }
    }
    
    /**
     * Exportiert die Analyseergebnisse als JSON-Datei
     */
    exportResumeData(results) {
        try {
            const fileName = 'lebenslauf-analyse.json';
            const dataStr = JSON.stringify(results, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const exportLink = document.createElement('a');
            exportLink.setAttribute('href', dataUri);
            exportLink.setAttribute('download', fileName);
            exportLink.style.display = 'none';
            
            document.body.appendChild(exportLink);
            exportLink.click();
            document.body.removeChild(exportLink);
            
            this.showToast('Daten erfolgreich exportiert', 'success');
        } catch (error) {
            console.error('Fehler beim Exportieren der Daten:', error);
            this.showToast('Fehler beim Exportieren: ' + error.message, 'danger');
        }
    }
    
    /**
     * Generiert eine eindeutige ID
     * @private
     */
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    /**
     * Zeigt/versteckt den Lade-Indikator
     */
    showLoadingIndicator(show) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = show ? 'flex' : 'none';
        }
    }
    
    /**
     * Zeigt eine Toast-Nachricht an
     */
    showToast(message, type = 'primary') {
        // Versuche zuerst die globale showToast-Funktion
        if (window.showToast) {
            window.showToast(message, type);
            return;
        }
        
        // Fallback zur Bootstrap-Toast-Komponente
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (!toast || !toastMessage) {
            console.log(message); // Fallback, wenn kein Toast verfügbar
            return;
        }
        
        toast.classList.remove('bg-primary', 'bg-success', 'bg-danger', 'bg-warning');
        toast.classList.add('bg-' + type);
        
        toastMessage.textContent = message;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

// Initialisieren nach DOM-Laden
document.addEventListener('DOMContentLoaded', () => {
    // Prüfe, ob wir auf der Lebenslaufanalyse-Seite sind
    if (document.getElementById('resumeUploadArea') || document.getElementById('resumeFileInput')) {
        const resumeAnalyzer = new ResumeAnalyzer();
        
        // Global verfügbar machen für Debugging
        window.resumeAnalyzer = resumeAnalyzer;
    }
});

export default ResumeAnalyzer; 