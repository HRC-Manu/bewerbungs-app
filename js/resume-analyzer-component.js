/**
 * Komponente für die Lebenslauf-Analyse und -Verbesserung
 */

import resumeAiService from './resume-ai-service.js';

class ResumeAnalyzerComponent {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.file = null;
        this.analysisResults = null;
        this.improvedResume = null;
    }
    
    /**
     * Initialisiert die Komponente
     */
    initialize() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error(`Container mit ID "${this.containerId}" nicht gefunden`);
            return false;
        }
        
        this.render();
        this.attachEventListeners();
        return true;
    }
    
    /**
     * Rendert die Grundstruktur der Komponente
     */
    render() {
        this.container.innerHTML = `
            <div class="resume-analyzer">
                <div class="card mb-4">
                    <div class="card-header bg-primary text-white">
                        <h4 class="mb-0"><i class="bi bi-magic me-2"></i>KI-Lebenslaufanalyse</h4>
                    </div>
                    <div class="card-body">
                        <div id="resumeUploadSection">
                            <p class="lead">Laden Sie Ihren Lebenslauf hoch, um eine KI-Analyse und Verbesserungsvorschläge zu erhalten</p>
                            
                            <div class="upload-area text-center p-5 mb-4 border border-dashed rounded">
                                <i class="bi bi-cloud-upload display-1 text-muted mb-3"></i>
                                <p>Ziehen Sie Ihren Lebenslauf hierher oder klicken Sie zum Auswählen</p>
                                <input type="file" id="resumeFileInput" class="d-none" accept=".pdf,.doc,.docx,.txt">
                                <button id="resumeBrowseBtn" class="btn btn-outline-primary mt-2">
                                    <i class="bi bi-file-earmark-plus me-2"></i>Datei auswählen
                                </button>
                            </div>
                            
                            <div id="uploadedResumeInfo" class="alert alert-success d-none">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-file-earmark-check fs-4 me-3"></i>
                                    <div class="flex-grow-1">
                                        <strong>Datei hochgeladen:</strong> <span id="resumeFileName"></span>
                                        <div class="small text-muted" id="resumeFileSize"></div>
                                    </div>
                                    <button id="changeResumeBtn" class="btn btn-sm btn-outline-secondary me-2">
                                        <i class="bi bi-arrow-repeat"></i>
                                    </button>
                                    <button id="analyzeResumeBtn" class="btn btn-sm btn-primary">
                                        <i class="bi bi-lightning me-1"></i>Jetzt analysieren
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div id="analysisLoadingSection" class="text-center py-5 d-none">
                            <div class="spinner-border text-primary mb-3" role="status"></div>
                            <h5>KI analysiert Ihren Lebenslauf...</h5>
                            <p class="text-muted">Dies kann bis zu einer Minute dauern</p>
                        </div>
                        
                        <div id="analysisResultsSection" class="d-none">
                            <!-- Hier werden die Analyseergebnisse angezeigt -->
                        </div>
                    </div>
                </div>
                
                <div id="improvedResumeSection" class="card d-none">
                    <div class="card-header bg-success text-white">
                        <h4 class="mb-0"><i class="bi bi-stars me-2"></i>Optimierter Lebenslauf</h4>
                    </div>
                    <div class="card-body">
                        <!-- Hier wird der verbesserte Lebenslauf angezeigt -->
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Fügt Event-Listener hinzu
     */
    attachEventListeners() {
        const uploadArea = this.container.querySelector('.upload-area');
        const fileInput = this.container.querySelector('#resumeFileInput');
        const browseBtn = this.container.querySelector('#resumeBrowseBtn');
        const analyzeBtn = this.container.querySelector('#analyzeResumeBtn');
        const changeResumeBtn = this.container.querySelector('#changeResumeBtn');
        
        // Drag & Drop Events
        if (uploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            
            uploadArea.addEventListener('dragenter', () => uploadArea.classList.add('drag-active'));
            uploadArea.addEventListener('dragover', () => uploadArea.classList.add('drag-active'));
            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-active'));
            uploadArea.addEventListener('drop', (e) => {
                uploadArea.classList.remove('drag-active');
                const files = e.dataTransfer.files;
                if (files.length) {
                    this.handleFileSelection(files[0]);
                }
            });
        }
        
        // Datei-Auswahl über Button
        if (browseBtn && fileInput) {
            browseBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    this.handleFileSelection(e.target.files[0]);
                }
            });
        }
        
        // Analyse starten
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.startAnalysis());
        }
        
        // Datei wechseln
        if (changeResumeBtn) {
            changeResumeBtn.addEventListener('click', () => this.resetFileSelection());
        }
    }
    
    /**
     * Verarbeitet die ausgewählte Datei
     */
    handleFileSelection(file) {
        // Nur erlaubte Dateitypen akzeptieren
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (!allowedTypes.includes(file.type)) {
            alert('Bitte laden Sie eine PDF-, Word- oder Textdatei hoch.');
            return;
        }
        
        this.file = file;
        
        // UI aktualisieren
        const uploadSection = this.container.querySelector('#uploadedResumeInfo');
        const fileNameElement = this.container.querySelector('#resumeFileName');
        const fileSizeElement = this.container.querySelector('#resumeFileSize');
        
        if (uploadSection && fileNameElement && fileSizeElement) {
            uploadSection.classList.remove('d-none');
            fileNameElement.textContent = file.name;
            fileSizeElement.textContent = this.formatFileSize(file.size);
        }
    }
    
    /**
     * Setzt die Dateiauswahl zurück
     */
    resetFileSelection() {
        this.file = null;
        const fileInput = this.container.querySelector('#resumeFileInput');
        const uploadInfo = this.container.querySelector('#uploadedResumeInfo');
        
        if (fileInput) fileInput.value = '';
        if (uploadInfo) uploadInfo.classList.add('d-none');
    }
    
    /**
     * Startet die KI-Analyse
     */
    async startAnalysis() {
        if (!this.file) {
            alert('Bitte wählen Sie zuerst eine Datei aus.');
            return;
        }
        
        try {
            this.showLoadingState();
            
            // KI-Analyse durchführen
            this.analysisResults = await resumeAiService.analyzeResume(this.file);
            
            // Analyseergebnisse anzeigen
            this.displayAnalysisResults();
        } catch (error) {
            console.error('Fehler bei der Lebenslaufanalyse:', error);
            this.showErrorState(error.message || 'Fehler bei der Analyse');
        }
    }
    
    /**
     * Zeigt den Ladezustand an
     */
    showLoadingState() {
        const uploadSection = this.container.querySelector('#resumeUploadSection');
        const loadingSection = this.container.querySelector('#analysisLoadingSection');
        const resultsSection = this.container.querySelector('#analysisResultsSection');
        
        if (uploadSection) uploadSection.classList.add('d-none');
        if (loadingSection) loadingSection.classList.remove('d-none');
        if (resultsSection) resultsSection.classList.add('d-none');
    }
    
    /**
     * Zeigt die Analyseergebnisse an
     */
    displayAnalysisResults() {
        const loadingSection = this.container.querySelector('#analysisLoadingSection');
        const resultsSection = this.container.querySelector('#analysisResultsSection');
        
        if (loadingSection) loadingSection.classList.add('d-none');
        if (resultsSection) {
            resultsSection.classList.remove('d-none');
            
            const results = this.analysisResults;
            if (!results) return;
            
            resultsSection.innerHTML = `
                <h4 class="mb-4">Analyse-Ergebnisse</h4>
                
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <h5 class="card-title mb-3">Gesamtbewertung</h5>
                                <div class="display-4 fw-bold text-${this.getScoreColorClass(results.overallScore)}">${results.overallScore}%</div>
                                <p class="text-muted">Qualität Ihres Lebenslaufs</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-8">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title mb-3">Detailbewertung</h5>
                                
                                <div class="d-flex align-items-center mb-2">
                                    <div style="width: 130px;">Keyword-Score:</div>
                                    <div class="progress flex-grow-1" style="height: 8px;">
                                        <div class="progress-bar ${this.getScoreColorClass(results.keywordScore, 'bg')}" 
                                             role="progressbar" style="width: ${results.keywordScore}%" 
                                             aria-valuenow="${results.keywordScore}" aria-valuemin="0" aria-valuemax="100"></div>
                                    </div>
                                    <div style="width: 40px;" class="ps-2">${results.keywordScore}%</div>
                                </div>
                                
                                <div class="d-flex align-items-center mb-2">
                                    <div style="width: 130px;">Lesbarkeit:</div>
                                    <div class="progress flex-grow-1" style="height: 8px;">
                                        <div class="progress-bar ${this.getScoreColorClass(results.readabilityScore, 'bg')}" 
                                             role="progressbar" style="width: ${results.readabilityScore}%" 
                                             aria-valuenow="${results.readabilityScore}" aria-valuemin="0" aria-valuemax="100"></div>
                                    </div>
                                    <div style="width: 40px;" class="ps-2">${results.readabilityScore}%</div>
                                </div>
                                
                                <div class="mt-3">
                                    <div class="alert alert-warning">
                                        <i class="bi bi-exclamation-triangle me-2"></i>
                                        Es wurden ${results.formattingIssues} Formatierungsprobleme gefunden
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <h5 class="mb-3">Erkannte Fähigkeiten</h5>
                <div class="skills-section mb-4">
                    <div class="row">
                        ${results.skills.map(skill => `
                            <div class="col-md-6 mb-2">
                                <div class="d-flex align-items-center">
                                    <div style="width: 120px;">${skill.name}:</div>
                                    <div class="progress flex-grow-1" style="height: 8px;">
                                        <div class="progress-bar ${this.getScoreColorClass(skill.relevance, 'bg')}" 
                                             role="progressbar" style="width: ${skill.relevance}%" 
                                             aria-valuenow="${skill.relevance}" aria-valuemin="0" aria-valuemax="100"></div>
                                    </div>
                                    <div style="width: 70px;" class="ps-2 small">${skill.level}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <h5 class="mb-3">Verbesserungsvorschläge</h5>
                <div class="improvement-suggestions mb-4">
                    <div class="list-group">
                        ${results.improvementAreas.map(area => `
                            <div class="list-group-item">
                                <div class="d-flex">
                                    <div>
                                        <strong>${area.section}:</strong> ${area.suggestion}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="text-center">
                    <button id="improveResumeBtn" class="btn btn-lg btn-success">
                        <i class="bi bi-magic me-2"></i>
                        Lebenslauf mit KI optimieren
                    </button>
                </div>
            `;
            
            // Event-Listener für den Verbessern-Button
            const improveBtn = resultsSection.querySelector('#improveResumeBtn');
            if (improveBtn) {
                improveBtn.addEventListener('click', () => this.generateImprovements());
            }
        }
    }
    
    /**
     * Zeigt einen Fehlerstatus an
     */
    showErrorState(message) {
        const loadingSection = this.container.querySelector('#analysisLoadingSection');
        const uploadSection = this.container.querySelector('#resumeUploadSection');
        
        if (loadingSection) loadingSection.classList.add('d-none');
        if (uploadSection) uploadSection.classList.remove('d-none');
        
        alert('Fehler: ' + message);
    }
    
    /**
     * Formatiert die Dateigröße menschenlesbar
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' Bytes';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
    
    /**
     * Gibt eine Farbklasse basierend auf dem Score zurück
     */
    getScoreColorClass(score, prefix = '') {
        prefix = prefix ? prefix + '-' : '';
        if (score >= 80) return prefix + 'success';
        if (score >= 60) return prefix + 'warning';
        return prefix + 'danger';
    }
    
    /**
     * Generiert Verbesserungen mit KI
     */
    async generateImprovements() {
        if (!this.analysisResults) return;
        
        try {
            // UI-Status aktualisieren
            const improveBtn = this.container.querySelector('#improveResumeBtn');
            if (improveBtn) {
                improveBtn.disabled = true;
                improveBtn.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Optimiere Lebenslauf...
                `;
            }
            
            // Dateiinhalt extrahieren
            const resumeText = await resumeAiService.extractTextFromFile(this.file);
            
            // Verbesserungen generieren
            this.improvedResume = await resumeAiService.improveResume(resumeText, this.analysisResults);
            
            // Verbesserten Lebenslauf anzeigen
            this.displayImprovedResume();
        } catch (error) {
            console.error('Fehler bei der Lebenslaufverbesserung:', error);
            alert('Fehler bei der Verbesserung: ' + (error.message || 'Unbekannter Fehler'));
            
            // Button zurücksetzen
            const improveBtn = this.container.querySelector('#improveResumeBtn');
            if (improveBtn) {
                improveBtn.disabled = false;
                improveBtn.innerHTML = '<i class="bi bi-magic me-2"></i>Lebenslauf mit KI optimieren';
            }
        }
    }
    
    /**
     * Zeigt den verbesserten Lebenslauf an
     */
    displayImprovedResume() {
        const improvedSection = this.container.querySelector('#improvedResumeSection');
        if (!improvedSection) return;
        
        improvedSection.classList.remove('d-none');
        const cardBody = improvedSection.querySelector('.card-body');
        
        if (cardBody && this.improvedResume) {
            cardBody.innerHTML = `
                <div class="row">
                    <div class="col-md-8">
                        <div class="improved-resume-preview mb-3">
                            <h5 class="mb-3">Optimierter Lebenslauf</h5>
                            <div class="preview-box p-4 border rounded bg-light">
                                ${this.improvedResume.htmlVersion || 
                                  `<pre>${this.improvedResume.improvedText}</pre>`}
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="improvements-list mb-3">
                            <h5 class="mb-3">Vorgenommene Verbesserungen</h5>
                            <div class="list-group">
                                ${this.improvedResume.improvements.map(improvement => `
                                    <div class="list-group-item">
                                        <i class="bi bi-check-circle-fill text-success me-2"></i>
                                        ${improvement}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="export-options mt-4">
                            <h5 class="mb-3">Exportieren als</h5>
                            <div class="d-grid gap-2">
                                <button class="btn btn-primary" id="exportDocxBtn">
                                    <i class="bi bi-file-earmark-word me-2"></i>Word-Dokument
                                </button>
                                <button class="btn btn-primary" id="exportPdfBtn">
                                    <i class="bi bi-file-earmark-pdf me-2"></i>PDF-Dokument
                                </button>
                                <button class="btn btn-outline-secondary" id="copyTextBtn">
                                    <i class="bi bi-clipboard me-2"></i>Text kopieren
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Event-Listener für Export-Buttons
            const exportDocxBtn = cardBody.querySelector('#exportDocxBtn');
            const exportPdfBtn = cardBody.querySelector('#exportPdfBtn');
            const copyTextBtn = cardBody.querySelector('#copyTextBtn');
            
            if (exportDocxBtn) {
                exportDocxBtn.addEventListener('click', () => resumeAiService.exportImprovedResume('docx'));
            }
            
            if (exportPdfBtn) {
                exportPdfBtn.addEventListener('click', () => resumeAiService.exportImprovedResume('pdf'));
            }
            
            if (copyTextBtn && this.improvedResume.improvedText) {
                copyTextBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(this.improvedResume.improvedText)
                        .then(() => {
                            copyTextBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Kopiert!';
                            setTimeout(() => {
                                copyTextBtn.innerHTML = '<i class="bi bi-clipboard me-2"></i>Text kopieren';
                            }, 2000);
                        })
                        .catch(err => {
                            console.error('Fehler beim Kopieren:', err);
                            alert('Fehler beim Kopieren in die Zwischenablage');
                        });
                });
            }
            
            // Zum verbesserten Lebenslauf scrollen
            improvedSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Reset Button
        const improveBtn = this.container.querySelector('#improveResumeBtn');
        if (improveBtn) {
            improveBtn.disabled = false;
            improveBtn.innerHTML = '<i class="bi bi-magic me-2"></i>Lebenslauf mit KI optimieren';
        }
    }
}

export default ResumeAnalyzerComponent; 