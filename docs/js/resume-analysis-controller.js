/**
 * Controller für die Lebenslaufanalyse
 * Verbindet die UI mit dem DocumentService
 */

import documentService from './document-service.js';

class ResumeAnalysisController {
    constructor() {
        // DOM-Elemente
        this.uploadArea = document.getElementById('resumeUploadArea');
        this.fileInput = document.getElementById('resumeFileInput');
        this.analyzeButton = document.getElementById('analyzeResumeButton');
        this.resultsContainer = document.getElementById('resumeAnalysisResults');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        
        // Status
        this.uploadedFile = null;
        this.extractedText = '';
        this.analysisResults = null;
        
        // Dienste
        this.documentService = documentService;
        
        // Initialisierung
        this.initialize();
    }
    
    /**
     * Initialisiert den Controller
     */
    initialize() {
        console.log('Initialisiere ResumeAnalysisController...');
        
        // Event-Listener einrichten
        this.setupEventListeners();
        
        // Prüfe, ob bereits eine Datei hochgeladen wurde
        this.checkForUploadedFile();
        
        console.log('ResumeAnalysisController initialisiert');
    }
    
    /**
     * Richtet Event-Listener ein
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
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    this.handleFileUpload(e.dataTransfer.files);
                }
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
     * Prüft, ob bereits eine Datei hochgeladen wurde
     */
    checkForUploadedFile() {
        if (this.fileInput && this.fileInput.files && this.fileInput.files.length > 0) {
            const file = this.fileInput.files[0];
            
            // Aktualisiere UI
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
            
            console.log('Bestehende Datei gefunden:', file.name);
        }
    }
    
    /**
     * Verarbeitet den Datei-Upload
     */
    async handleFileUpload(files) {
        if (!files || files.length === 0) return;
        
        // Nimm die erste Datei
        const file = files[0];
        console.log('Datei hochgeladen:', file.name);
        
        try {
            // Aktualisiere UI
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
            
            this.showLoading(true);
            
            // Extrahiere Text
            const extractionResult = await this.documentService.extractText(file);
            
            if (extractionResult.success) {
                this.extractedText = extractionResult.text;
                console.log('Text erfolgreich extrahiert:', this.extractedText.substring(0, 100) + '...');
                this.showToast('Text erfolgreich extrahiert', 'success');
            } else {
                console.error('Fehler bei der Textextraktion:', extractionResult.error);
                this.showToast('Fehler bei der Textextraktion: ' + extractionResult.error, 'danger');
            }
        } catch (error) {
            console.error('Fehler beim Datei-Upload:', error);
            this.showToast('Fehler beim Upload: ' + error.message, 'danger');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Analysiert den Lebenslauf
     */
    async analyzeResume() {
        if (!this.uploadedFile) {
            this.showToast('Bitte laden Sie zuerst einen Lebenslauf hoch', 'warning');
            return;
        }
        
        try {
            this.showLoading(true);
            
            console.log('Starte Analyse des Lebenslaufs:', this.uploadedFile.name);
            
            // Analysiere den Lebenslauf
            const analysisResults = await this.documentService.analyzeResume(this.uploadedFile);
            
            console.log('Analyse abgeschlossen:', analysisResults);
            
            // Speichere Ergebnisse
            this.analysisResults = analysisResults;
            
            // Zeige Ergebnisse an
            this.displayAnalysisResults(analysisResults);
            
            // Speichere im Profil
            this.saveToProfile(analysisResults);
            
            this.showToast('Lebenslauf erfolgreich analysiert', 'success');
        } catch (error) {
            console.error('Fehler bei der Lebenslaufanalyse:', error);
            this.showToast('Fehler bei der Analyse: ' + error.message, 'danger');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Zeigt die Analyseergebnisse an
     */
    displayAnalysisResults(results) {
        if (!this.resultsContainer) {
            console.error('Kein Container für Analyseergebnisse gefunden');
            return;
        }
        
        // Versuche zuerst die globale Funktion, falls vorhanden
        if (typeof window.displayResumeAnalysisResults === 'function') {
            try {
                window.displayResumeAnalysisResults(results);
                return;
            } catch (error) {
                console.error('Fehler in globaler displayResumeAnalysisResults:', error);
            }
        }
        
        // Ansonsten zeige die Ergebnisse selbst an
        this.resultsContainer.innerHTML = `
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
                                    ${this._renderSkillList(results.skills?.technical)}
                                </div>
                            </div>
                            <div class="mb-3">
                                <h6>Methodisch</h6>
                                <div class="skill-tags">
                                    ${this._renderSkillList(results.skills?.methodical)}
                                </div>
                            </div>
                            <div>
                                <h6>Sozial</h6>
                                <div class="skill-tags">
                                    ${this._renderSkillList(results.skills?.social)}
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
                            ${this._renderExperience(results.workExperience)}
                        </div>
                    </div>
                    
                    <div class="card glass-card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">Ausbildung</h5>
                        </div>
                        <div class="card-body p-0">
                            ${this._renderEducation(results.education)}
                        </div>
                    </div>
                    
                    <div class="card glass-card">
                        <div class="card-header">
                            <h5 class="mb-0">Sprachen</h5>
                        </div>
                        <div class="card-body">
                            ${this._renderLanguages(results.languages)}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-4 d-flex justify-content-end">
                <button class="btn btn-outline-primary me-2" id="exportResumeBtn">
                    <i class="bi bi-download me-2"></i>Exportieren
                </button>
                <button class="btn btn-primary" id="saveToProfileBtn">
                    <i class="bi bi-save me-2"></i>Im Profil speichern
                </button>
            </div>
        `;
        
        // Event-Listener für Buttons hinzufügen
        document.getElementById('exportResumeBtn')?.addEventListener('click', () => {
            this.exportResumeData(results);
        });
        
        document.getElementById('saveToProfileBtn')?.addEventListener('click', () => {
            this.saveToProfile(results);
        });
    }
    
    /**
     * Speichert die Analyseergebnisse im Profil
     */
    saveToProfile(results) {
        try {
            // Verwende den ProfileManager, um die Daten zu speichern
            const profileManager = this.documentService.profileManager;
            
            // Aktualisiere die Profildaten
            if (results.personalData) {
                profileManager.updateProfileSection('personalData', results.personalData, false);
            }
            
            if (results.skills) {
                profileManager.updateProfileSection('skills', results.skills, false);
            }
            
            if (results.workExperience && Array.isArray(results.workExperience)) {
                // Bestehende Erfahrungen löschen
                profileManager.updateProfileSection('experience', [], false);
                
                // Neue Erfahrungen hinzufügen
                results.workExperience.forEach(exp => {
                    profileManager.addItemToArray('experience', {
                        ...exp,
                        id: null // ID wird automatisch generiert
                    }, false);
                });
            }
            
            if (results.education && Array.isArray(results.education)) {
                // Bestehende Ausbildungen löschen
                profileManager.updateProfileSection('education', [], false);
                
                // Neue Ausbildungen hinzufügen
                results.education.forEach(edu => {
                    profileManager.addItemToArray('education', {
                        ...edu,
                        id: null // ID wird automatisch generiert
                    }, false);
                });
            }
            
            // Speichere die Analyseergebnisse als Lebenslauf im Profil
            if (this.uploadedFile) {
                profileManager.addItemToArray('documents.resumes', {
                    fileName: this.uploadedFile.name,
                    dateCreated: new Date().toISOString(),
                    data: results,
                    fileSize: this.uploadedFile.size,
                    fileType: this.uploadedFile.type
                }, false);
            }
            
            // Speichere alle Änderungen
            profileManager.saveProfile();
            
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
     * Zeigt/versteckt den Lade-Indikator
     */
    showLoading(show) {
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
    
    /**
     * Rendert eine Liste von Skills
     * @private
     */
    _renderSkillList(skills) {
        if (!skills || !Array.isArray(skills) || skills.length === 0) {
            return '<div class="text-muted">Keine angegeben</div>';
        }
        
        return skills.map(skill => `<span class="badge bg-light text-dark">${skill}</span>`).join(' ');
    }
    
    /**
     * Rendert die Berufserfahrung
     * @private
     */
    _renderExperience(experience) {
        if (!experience || !Array.isArray(experience) || experience.length === 0) {
            return '<div class="p-3 text-muted">Keine Berufserfahrung angegeben</div>';
        }
        
        return `
            <ul class="list-group list-group-flush">
                ${experience.map(exp => `
                    <li class="list-group-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${exp.position || 'Position nicht angegeben'}</h6>
                            <span class="badge bg-light text-dark">${exp.period || ''}</span>
                        </div>
                        <p class="mb-1">${exp.company || ''}${exp.location ? ` - ${exp.location}` : ''}</p>
                        <small class="text-muted">${exp.description || ''}</small>
                    </li>
                `).join('')}
            </ul>
        `;
    }
    
    /**
     * Rendert die Ausbildung
     * @private
     */
    _renderEducation(education) {
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
     * @private
     */
    _renderLanguages(languages) {
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
}

// Initialisieren beim DOM-Laden
document.addEventListener('DOMContentLoaded', () => {
    // Prüfe, ob wir auf der Lebenslaufanalyse-Seite sind
    if (document.getElementById('resumeUploadArea') || document.getElementById('resumeFileInput')) {
        const resumeAnalysisController = new ResumeAnalysisController();
        
        // Überschreibe die globale analyzeResume-Funktion
        window.analyzeResume = () => resumeAnalysisController.analyzeResume();
        
        // Mache den Controller global verfügbar
        window.resumeAnalysisController = resumeAnalysisController;
    }
});

export default ResumeAnalysisController; 