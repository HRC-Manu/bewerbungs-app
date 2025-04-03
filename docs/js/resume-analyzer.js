/**
 * KI-Lebenslaufanalyse für die Bewerbungs-App
 * Diese Datei bietet Funktionen zur Analyse und Verbesserung von Lebensläufen mit KI.
 */

// Modul für Lebenslaufanalyse und -verbesserung
const ResumeAnalyzer = (function() {
    // Private Variablen
    let currentFile = null;
    let analysisResults = null;
    let improvedContent = null;
    
    // DOM-Container
    let containerElement = null;
    
    // Öffentliche Methoden
    return {
        /**
         * Initialisiert den Lebenslauf-Analyzer
         * @param {string} containerId - ID des Container-Elements
         */
        init: function(containerId) {
            console.log('Initialisiere KI-Lebenslaufanalyse...');
            containerElement = document.getElementById(containerId);
            
            if (!containerElement) {
                console.error(`Containerelement mit ID "${containerId}" nicht gefunden`);
                return false;
            }
            
            this.renderUI();
            this.attachEventListeners();
            return true;
        },
        
        /**
         * Rendert die Benutzeroberfläche
         */
        renderUI: function() {
            containerElement.innerHTML = `
                <div class="card shadow-sm mb-4">
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h4 class="mb-0"><i class="bi bi-magic me-2"></i>KI-Lebenslaufanalyse</h4>
                    </div>
                    <div class="card-body">
                        <!-- Upload-Bereich -->
                        <div id="upload-section">
                            <p class="lead mb-4">Laden Sie Ihren Lebenslauf hoch, um ihn mit KI zu analysieren und zu verbessern</p>
                            
                            <div class="upload-area text-center p-5 mb-4 border border-2 border-dashed rounded bg-light">
                                <i class="bi bi-cloud-upload display-1 text-muted mb-3"></i>
                                <p>Ziehen Sie Ihre Datei hierher oder klicken Sie zum Auswählen</p>
                                <input type="file" id="resume-file-input" class="d-none" accept=".pdf,.doc,.docx,.txt">
                                <button id="resume-browse-btn" class="btn btn-primary mt-2">
                                    <i class="bi bi-file-earmark-plus me-2"></i>Datei auswählen
                                </button>
                            </div>
                            
                            <div id="file-info" class="alert alert-success d-none">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-file-earmark-check fs-4 me-3"></i>
                                    <div class="flex-grow-1">
                                        <strong>Lebenslauf hochgeladen:</strong> <span id="file-name"></span>
                                        <div class="small text-muted" id="file-size"></div>
                                    </div>
                                    <button id="analyze-btn" class="btn btn-primary">
                                        <i class="bi bi-lightning me-1"></i>Analysieren
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Lade-Animation -->
                        <div id="loading-section" class="text-center py-5 d-none">
                            <div class="spinner-border text-primary mb-3" role="status"></div>
                            <h5>KI analysiert Ihren Lebenslauf...</h5>
                            <p class="text-muted">Dies kann bis zu einer Minute dauern</p>
                            <div class="progress mt-3">
                                <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%"></div>
                            </div>
                        </div>
                        
                        <!-- Analyse-Ergebnisse -->
                        <div id="results-section" class="d-none"></div>
                    </div>
                </div>
                
                <!-- Verbesserter Lebenslauf -->
                <div id="improved-resume-section" class="card shadow-sm d-none">
                    <div class="card-header bg-success text-white">
                        <h4 class="mb-0"><i class="bi bi-stars me-2"></i>Optimierter Lebenslauf</h4>
                    </div>
                    <div class="card-body"></div>
                </div>
            `;
        },
        
        /**
         * Fügt Event-Listener hinzu
         */
        attachEventListeners: function() {
            const uploadArea = containerElement.querySelector('.upload-area');
            const fileInput = containerElement.querySelector('#resume-file-input');
            const browseBtn = containerElement.querySelector('#resume-browse-btn');
            const analyzeBtn = containerElement.querySelector('#analyze-btn');
            
            // Drag & Drop
            if (uploadArea) {
                ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                    uploadArea.addEventListener(eventName, preventDefaults);
                });
                
                uploadArea.addEventListener('dragenter', () => uploadArea.classList.add('border-primary'));
                uploadArea.addEventListener('dragover', () => uploadArea.classList.add('border-primary'));
                uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('border-primary'));
                uploadArea.addEventListener('drop', (e) => {
                    uploadArea.classList.remove('border-primary');
                    const dt = e.dataTransfer;
                    if (dt.files && dt.files.length) {
                        this.handleFileSelection(dt.files[0]);
                    }
                });
            }
            
            // Datei-Button
            if (browseBtn && fileInput) {
                browseBtn.addEventListener('click', () => fileInput.click());
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files.length) {
                        this.handleFileSelection(e.target.files[0]);
                    }
                });
            }
            
            // Analyse-Button
            if (analyzeBtn) {
                analyzeBtn.addEventListener('click', () => this.analyzeResume());
            }
            
            // Helper-Funktion für Drag & Drop
            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }
        },
        
        /**
         * Verarbeitet die Dateiauswahl
         */
        handleFileSelection: function(file) {
            // Validierung des Dateityps
            const allowedTypes = ['application/pdf', 'application/msword', 
                                 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                                 'text/plain'];
            
            if (!allowedTypes.includes(file.type)) {
                alert('Bitte laden Sie eine PDF-, Word- oder Textdatei hoch.');
                return;
            }
            
            // Datei speichern
            currentFile = file;
            
            // UI aktualisieren
            const fileInfo = containerElement.querySelector('#file-info');
            const fileName = containerElement.querySelector('#file-name');
            const fileSize = containerElement.querySelector('#file-size');
            
            if (fileInfo && fileName && fileSize) {
                fileInfo.classList.remove('d-none');
                fileName.textContent = file.name;
                fileSize.textContent = this.formatFileSize(file.size);
            }
        },
        
        /**
         * Startet die Lebenslaufanalyse
         */
        analyzeResume: function() {
            if (!currentFile) {
                alert('Bitte wählen Sie zuerst einen Lebenslauf aus.');
                return;
            }
            
            // UI-Status ändern
            const uploadSection = containerElement.querySelector('#upload-section');
            const loadingSection = containerElement.querySelector('#loading-section');
            const resultsSection = containerElement.querySelector('#results-section');
            
            if (uploadSection) uploadSection.classList.add('d-none');
            if (loadingSection) loadingSection.classList.remove('d-none');
            if (resultsSection) resultsSection.classList.add('d-none');
            
            // Fortschrittsbalken animieren
            const progressBar = loadingSection.querySelector('.progress-bar');
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 5;
                if (progress > 90) clearInterval(progressInterval);
                if (progressBar) progressBar.style.width = `${progress}%`;
            }, 500);
            
            // Analyse durchführen (simuliert)
            setTimeout(() => {
                clearInterval(progressInterval);
                if (progressBar) progressBar.style.width = '100%';
                
                // Simulierte Ergebnisse
                analysisResults = this.getSimulatedAnalysisResults();
                
                // Ergebnisse anzeigen
                setTimeout(() => {
                    this.displayResults(analysisResults);
                }, 500);
            }, 3000);
            
            // Nach der Analyse:
            this.dispatchEvents('resumeAnalysisComplete', {
                results: analysisResults,
                file: currentFile
            });
        },
        
        /**
         * Zeigt die Analyseergebnisse an
         */
        displayResults: function(results) {
            const loadingSection = containerElement.querySelector('#loading-section');
            const resultsSection = containerElement.querySelector('#results-section');
            
            if (loadingSection) loadingSection.classList.add('d-none');
            if (resultsSection) {
                resultsSection.classList.remove('d-none');
                
                resultsSection.innerHTML = `
                    <h4 class="mb-4">Analyseergebnisse Ihres Lebenslaufs</h4>
                    
                    <div class="row mb-4">
                        <div class="col-md-4">
                            <div class="card h-100">
                                <div class="card-body text-center">
                                    <h5 class="card-title mb-3">Gesamtbewertung</h5>
                                    <div class="display-4 fw-bold text-${this.getScoreColorClass(results.overallScore)}">
                                        ${results.overallScore}%
                                    </div>
                                    <p class="text-muted">Qualität Ihres Lebenslaufs</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-8">
                            <div class="card h-100">
                                <div class="card-body">
                                    <h5 class="card-title mb-3">Detailbewertung</h5>
                                    
                                    <div class="mb-3">
                                        <label class="form-label d-flex justify-content-between">
                                            <span>Relevanz zu Stellenanzeigen</span>
                                            <span>${results.relevanceScore}%</span>
                                        </label>
                                        <div class="progress" style="height: 10px;">
                                            <div class="progress-bar bg-${this.getScoreColorClass(results.relevanceScore)}" 
                                                role="progressbar" style="width: ${results.relevanceScore}%"></div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label d-flex justify-content-between">
                                            <span>Lesbarkeit</span>
                                            <span>${results.readabilityScore}%</span>
                                        </label>
                                        <div class="progress" style="height: 10px;">
                                            <div class="progress-bar bg-${this.getScoreColorClass(results.readabilityScore)}" 
                                                role="progressbar" style="width: ${results.readabilityScore}%"></div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label d-flex justify-content-between">
                                            <span>Formatierung</span>
                                            <span>${results.formattingScore}%</span>
                                        </label>
                                        <div class="progress" style="height: 10px;">
                                            <div class="progress-bar bg-${this.getScoreColorClass(results.formattingScore)}" 
                                                role="progressbar" style="width: ${results.formattingScore}%"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-header">
                                    <h5 class="mb-0">Erkannte Fähigkeiten</h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        ${results.skills.map(skill => `
                                            <div class="col-md-6 mb-2">
                                                <div class="d-flex align-items-center">
                                                    <div style="width: 120px;">${skill.name}:</div>
                                                    <div class="progress flex-grow-1" style="height: 8px;">
                                                        <div class="progress-bar bg-${this.getScoreColorClass(skill.relevance)}" 
                                                            role="progressbar" style="width: ${skill.relevance}%"></div>
                                                    </div>
                                                    <div style="width: 50px;" class="ps-2 small">${skill.level}</div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <div class="card h-100">
                                <div class="card-header">
                                    <h5 class="mb-0">Verbesserungsvorschläge</h5>
                                </div>
                                <div class="card-body">
                                    <ul class="list-group">
                                        ${results.improvementAreas.map(area => `
                                            <li class="list-group-item">
                                                <div class="d-flex">
                                                    <i class="bi bi-lightbulb text-warning me-2"></i>
                                                    <div>
                                                        <strong>${area.section}:</strong> ${area.suggestion}
                                                    </div>
                                                </div>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-center mt-4">
                        <button id="improve-resume-btn" class="btn btn-success btn-lg">
                            <i class="bi bi-magic me-2"></i>
                            Lebenslauf mit KI optimieren
                        </button>
                    </div>
                `;
                
                // Event-Listener für den Verbessern-Button
                const improveBtn = resultsSection.querySelector('#improve-resume-btn');
                if (improveBtn) {
                    improveBtn.addEventListener('click', () => this.improveResume());
                }
            }
        },
        
        /**
         * Startet die Verbesserung des Lebenslaufs
         */
        improveResume: function() {
            if (!analysisResults) {
                alert('Bitte analysieren Sie zuerst Ihren Lebenslauf.');
                return;
            }
            
            const improveBtn = containerElement.querySelector('#improve-resume-btn');
            if (improveBtn) {
                improveBtn.disabled = true;
                improveBtn.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Optimiere Lebenslauf...
                `;
            }
            
            // Simulierte Verbesserung
            setTimeout(() => {
                // Simuliertes Ergebnis
                improvedContent = this.getSimulatedImprovement();
                
                // Ergebnis anzeigen
                this.displayImprovedResume(improvedContent);
                
                // Button zurücksetzen
                if (improveBtn) {
                    improveBtn.disabled = false;
                    improveBtn.innerHTML = '<i class="bi bi-magic me-2"></i>Lebenslauf mit KI optimieren';
                }
            }, 3000);
            
            // Nach der Verbesserung:
            this.dispatchEvents('resumeImproved', {
                improvedResume: improvedContent,
                originalFile: currentFile
            });
        },
        
        /**
         * Zeigt den verbesserten Lebenslauf an
         */
        displayImprovedResume: function(improvement) {
            const improvedSection = containerElement.querySelector('#improved-resume-section');
            if (!improvedSection) return;
            
            improvedSection.classList.remove('d-none');
            const cardBody = improvedSection.querySelector('.card-body');
            
            if (cardBody) {
                cardBody.innerHTML = `
                    <div class="row">
                        <div class="col-md-8">
                            <h5 class="mb-3">Optimierter Lebenslauf</h5>
                            <div class="border rounded bg-light p-3">
                                ${improvement.htmlVersion}
                            </div>
                        </div>
                        
                        <div class="col-md-4">
                            <h5 class="mb-3">Vorgenommene Verbesserungen</h5>
                            <ul class="list-group mb-4">
                                ${improvement.improvements.map(item => `
                                    <li class="list-group-item">
                                        <i class="bi bi-check-circle-fill text-success me-2"></i>${item}
                                    </li>
                                `).join('')}
                            </ul>
                            
                            <h5 class="mb-3">Exportieren als</h5>
                            <div class="d-grid gap-2">
                                <button class="btn btn-primary" id="export-docx-btn">
                                    <i class="bi bi-file-earmark-word me-2"></i>Word-Dokument
                                </button>
                                <button class="btn btn-primary" id="export-pdf-btn">
                                    <i class="bi bi-file-earmark-pdf me-2"></i>PDF-Dokument
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Event-Listener für Export-Buttons
                const exportDocxBtn = cardBody.querySelector('#export-docx-btn');
                const exportPdfBtn = cardBody.querySelector('#export-pdf-btn');
                
                if (exportDocxBtn) {
                    exportDocxBtn.addEventListener('click', () => this.exportResume('docx'));
                }
                
                if (exportPdfBtn) {
                    exportPdfBtn.addEventListener('click', () => this.exportResume('pdf'));
                }
                
                // Zum verbesserten Lebenslauf scrollen
                improvedSection.scrollIntoView({ behavior: 'smooth' });
            }
        },
        
        /**
         * Exportiert den verbesserten Lebenslauf
         * @param {string} format - 'docx' oder 'pdf'
         */
        exportResume: function(format) {
            if (!improvedContent || !improvedContent.htmlVersion) {
                alert('Es ist kein verbesserter Lebenslauf zum Exportieren vorhanden.');
                return;
            }
            
            if (format === 'docx') {
                // Verwende eine Bibliothek wie docx.js für den Export
                this.exportToWord(improvedContent.htmlVersion);
            } else if (format === 'pdf') {
                // Verwende eine Bibliothek wie jsPDF für den Export
                this.exportToPDF(improvedContent.htmlVersion);
            } else {
                alert(`Export im Format ${format} wird nicht unterstützt.`);
            }
        },
        
        /**
         * Exportiert als Word-Dokument
         */
        exportToWord: function(htmlContent) {
            // In einer echten Implementierung würde hier docx.js oder ein Server-Endpunkt verwendet
            
            // Beispiel für vorübergehende Lösung:
            // Erstelle HTML-Blob mit Word-Kompatibilitäts-Stil
            const wordCompatibleHTML = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                      xmlns:w="urn:schemas-microsoft-com:office:word" 
                      xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <meta charset="utf-8">
                    <title>Optimierter Lebenslauf</title>
                    <style>
                        body { font-family: Calibri, Arial, sans-serif; }
                        h1, h2, h3 { color: #0066cc; }
                        blockquote { border-left: 3px solid #0066cc; padding-left: 10px; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                </body>
                </html>
            `;
            
            const blob = new Blob([wordCompatibleHTML], { type: 'application/msword' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'Optimierter_Lebenslauf.doc';
            link.click();
            URL.revokeObjectURL(link.href);
        },
        
        /**
         * Exportiert als PDF-Dokument
         */
        exportToPDF: function(htmlContent) {
            // In einer echten Implementierung würde hier jsPDF oder ein Server-Endpunkt verwendet
            
            // Hier würde normalerweise der PDF-Export-Code stehen
            // Da dies komplex ist, zeigen wir eine Nachricht an
            alert('PDF-Export würde im echten System eine PDF-Bibliothek verwenden oder über einen Server-Dienst exportieren.');
            
            // In einer vollständigen Implementierung:
            // 1. Rendere HTML in ein verstecktes div
            // 2. Verwende html2canvas für die Konvertierung
            // 3. Füge die Bilder in das PDF ein
            // 4. Biete es zum Download an
        },
        
        /**
         * Hilfsfunktion zum Formatieren der Dateigröße
         */
        formatFileSize: function(bytes) {
            if (bytes < 1024) return bytes + ' Bytes';
            if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / 1048576).toFixed(1) + ' MB';
        },
        
        /**
         * Gibt eine CSS-Klasse basierend auf dem Score zurück
         */
        getScoreColorClass: function(score) {
            if (score >= 80) return 'success';
            if (score >= 60) return 'warning';
            return 'danger';
        },
        
        /**
         * Liefert simulierte Analyseergebnisse (Beispieldaten)
         */
        getSimulatedAnalysisResults: function() {
            return {
                overallScore: 72,
                relevanceScore: 68,
                readabilityScore: 85,
                formattingScore: 65,
                skills: [
                    { name: "JavaScript", level: "Fortgeschritten", relevance: 85 },
                    { name: "React", level: "Fortgeschritten", relevance: 80 },
                    { name: "Node.js", level: "Mittel", relevance: 75 },
                    { name: "Python", level: "Fortgeschritten", relevance: 90 },
                    { name: "SQL", level: "Grundlagen", relevance: 60 },
                    { name: "Git", level: "Fortgeschritten", relevance: 85 }
                ],
                improvementAreas: [
                    {
                        section: "Fähigkeiten",
                        suggestion: "Fügen Sie mehr Details zu Ihren Projekterfolgen hinzu"
                    },
                    {
                        section: "Berufserfahrung",
                        suggestion: "Quantifizieren Sie Ihre Leistungen mit Zahlen und Ergebnissen"
                    },
                    {
                        section: "Allgemein",
                        suggestion: "Passen Sie Keywords an die Stelle an"
                    },
                    {
                        section: "Formatierung",
                        suggestion: "Verbessern Sie die Konsistenz der Formatierung"
                    }
                ]
            };
        },
        
        /**
         * Liefert simulierte Verbesserungsvorschläge (Beispieldaten)
         */
        getSimulatedImprovement: function() {
            return {
                improvements: [
                    "Professionelles Profil hinzugefügt",
                    "Berufserfahrung mit messbaren Erfolgen ergänzt",
                    "Fähigkeiten kategorisiert und erweitert",
                    "Übersichtlichere Formatierung verwendet",
                    "Action Verben für stärkere Beschreibungen eingesetzt"
                ],
                htmlVersion: `
                    <div class="improved-resume">
                        <h1 style="color: #0d6efd; margin-bottom: 0.5rem;">Max Mustermann</h1>
                        <h2 style="color: #6c757d; font-size: 1.4rem; margin-bottom: 1rem;">Senior Fullstack-Entwickler</h2>
                        
                        <blockquote class="border-start border-primary border-3 ps-3 my-3">
                            <p>Erfahrener Entwickler mit nachweisbarem Erfolg in der Leitung agiler Teams und der Entwicklung skalierbarer Webapplikationen.</p>
                        </blockquote>
                        
                        <h3 style="color: #0d6efd; font-size: 1.25rem; margin: 1.5rem 0 1rem 0; border-bottom: 1px solid #dee2e6; padding-bottom: 0.5rem;">Berufserfahrung</h3>
                        
                        <div class="job mb-3">
                            <h4 style="font-size: 1.1rem; font-weight: 600;">Lead Developer | TechSolutions GmbH | 2019 - heute</h4>
                            <ul>
                                <li>Leitete ein Team von 5 Entwicklern bei der Neugestaltung einer E-Commerce-Plattform mit React und Node.js</li>
                                <li>Steigerte die Seitengeschwindigkeit um 45% durch Implementierung moderner Frontend-Techniken</li>
                                <li>Reduzierte Serverkosten um 30% durch Optimierung der Backend-Architektur</li>
                            </ul>
                        </div>
                        
                        <div class="job mb-3">
                            <h4 style="font-size: 1.1rem; font-weight: 600;">Fullstack-Entwickler | WebInnovate AG | 2016 - 2019</h4>
                            <ul>
                                <li>Entwickelte und wartete mehrere kundenspezifische Webanwendungen mit JavaScript und PHP</li>
                                <li>Implementierte eine neue Datenbankstruktur, die Abfragen um 65% beschleunigte</li>
                                <li>Automatisierte Deployments, was zu 40% weniger Rollout-Fehlern führte</li>
                            </ul>
                        </div>
                        
                        <h3 style="color: #0d6efd; font-size: 1.25rem; margin: 1.5rem 0 1rem 0; border-bottom: 1px solid #dee2e6; padding-bottom: 0.5rem;">Fähigkeiten</h3>
                        
                        <div class="skills">
                            <p><strong>Frontend:</strong> JavaScript/TypeScript, React, Vue.js, HTML5, CSS3, SASS</p>
                            <p><strong>Backend:</strong> Node.js, Express, PHP, RESTful APIs, GraphQL</p>
                            <p><strong>Datenbanken:</strong> MongoDB, MySQL, PostgreSQL</p>
                            <p><strong>Tools & Methoden:</strong> Git, CI/CD, Docker, Agile/Scrum, TDD</p>
                        </div>
                        
                        <h3 style="color: #0d6efd; font-size: 1.25rem; margin: 1.5rem 0 1rem 0; border-bottom: 1px solid #dee2e6; padding-bottom: 0.5rem;">Ausbildung</h3>
                        
                        <div class="education">
                            <p><strong>Bachelor of Science Informatik</strong><br>
                            Technische Universität München | 2012 - 2016</p>
                        </div>
                    </div>
                `
            };
        },
        
        /**
         * Löst Events für externe Komponenten aus
         */
        dispatchEvents: function(eventName, data) {
            const event = new CustomEvent(eventName, {
                detail: data,
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(event);
            console.log(`Event "${eventName}" ausgelöst:`, data);
        }
    };
})();

// Export für Verwendung in anderen Modulen
export default ResumeAnalyzer; 