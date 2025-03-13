/**
 * Workflow-Manager für die Bewerbungsapp
 * Verwaltet die mehrstufigen Workflows und ermöglicht Gastnutzung
 */

class WorkflowManager {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 5;
        this.guestMode = true;
        this.guestUsageCount = 0;
        this.maxGuestUsage = 2; // Anzahl erlaubte Nutzungen ohne Anmeldung
        this.uploadedFiles = {
            resume: null,
            coverLetter: null,
            jobPosting: null
        };
        
        // Status-Tracking
        this.stepStatus = {
            1: { completed: false, data: null },
            2: { completed: false, data: null },
            3: { completed: false, data: null },
            4: { completed: false, data: null },
            5: { completed: false, data: null }
        };
    }
    
    // Initialisierung
    initialize() {
        console.log("WorkflowManager wird initialisiert");
        this.attachEventListeners();
        this.restoreState();
        this.updateUI();
    }
    
    // Event-Listener anbinden
    attachEventListeners() {
        // Buttons für Schrittnavigation
        const nextBtn = document.getElementById('nextStepBtn');
        const prevBtn = document.getElementById('prevStepBtn');
        
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevStep());
        
        // Lebenslauf-Upload-Button
        const uploadResumeBtn = document.getElementById('uploadResumeBtn');
        if (uploadResumeBtn) {
            uploadResumeBtn.addEventListener('click', () => this.handleResumeUpload());
        }
        
        // Analyse-Button
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.startAnalysis());
        }
        
        // Jobtext-Bereich
        const jobPosting = document.getElementById('jobPosting');
        if (jobPosting) {
            jobPosting.addEventListener('input', () => this.updateAnalyzeButtonState());
        }
    }
    
    // Zustand wiederherstellen (z.B. bei Seitenneuladung)
    restoreState() {
        try {
            const savedState = localStorage.getItem('workflowState');
            if (savedState) {
                const state = JSON.parse(savedState);
                this.currentStep = state.currentStep || 1;
                this.stepStatus = state.stepStatus || this.stepStatus;
                this.guestUsageCount = state.guestUsageCount || 0;
                
                // Wenn Dateien gespeichert wurden, stellen wir ihre Metadaten wieder her
                if (state.uploadedFiles?.resume) {
                    this.uploadedFiles.resume = {
                        name: state.uploadedFiles.resume.name,
                        size: state.uploadedFiles.resume.size,
                        type: state.uploadedFiles.resume.type,
                        lastModified: state.uploadedFiles.resume.lastModified
                    };
                }
                
                console.log("Workflow-Zustand wiederhergestellt:", this.currentStep);
            }
        } catch (error) {
            console.error("Fehler beim Wiederherstellen des Workflow-Zustands:", error);
            // Fallback: Mit leerem Zustand beginnen
            this.resetState();
        }
    }
    
    // Zustand speichern
    saveState() {
        try {
            const stateToSave = {
                currentStep: this.currentStep,
                stepStatus: this.stepStatus,
                guestUsageCount: this.guestUsageCount,
                uploadedFiles: {
                    resume: this.uploadedFiles.resume ? {
                        name: this.uploadedFiles.resume.name,
                        size: this.uploadedFiles.resume.size,
                        type: this.uploadedFiles.resume.type,
                        lastModified: this.uploadedFiles.resume.lastModified
                    } : null
                }
            };
            
            localStorage.setItem('workflowState', JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Fehler beim Speichern des Workflow-Zustands:", error);
        }
    }
    
    // Zustand zurücksetzen
    resetState() {
        this.currentStep = 1;
        this.stepStatus = {
            1: { completed: false, data: null },
            2: { completed: false, data: null },
            3: { completed: false, data: null },
            4: { completed: false, data: null },
            5: { completed: false, data: null }
        };
        this.uploadedFiles = {
            resume: null,
            coverLetter: null,
            jobPosting: null
        };
        
        localStorage.removeItem('workflowState');
        this.updateUI();
    }
    
    // Zum nächsten Schritt gehen
    nextStep() {
        if (this.currentStep < this.maxSteps) {
            // Prüfen, ob der aktuelle Schritt abgeschlossen ist
            if (!this.stepStatus[this.currentStep].completed) {
                if (!this.validateCurrentStep()) {
                    // Bei fehlgeschlagener Validierung nicht weitergehen
                    return;
                }
            }
            
            this.currentStep++;
            this.saveState();
            this.updateUI();
            return true;
        }
        return false;
    }
    
    // Zum vorherigen Schritt gehen
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.saveState();
            this.updateUI();
            return true;
        }
        return false;
    }
    
    // Zu einem bestimmten Schritt gehen
    goToStep(step) {
        if (step >= 1 && step <= this.maxSteps) {
            this.currentStep = step;
            this.saveState();
            this.updateUI();
            return true;
        }
        return false;
    }
    
    // Validiert den aktuellen Schritt
    validateCurrentStep() {
        switch (this.currentStep) {
            case 1: // Lebenslauf
                if (!this.uploadedFiles.resume) {
                    window.appHelpers?.showToast("Bitte laden Sie zuerst einen Lebenslauf hoch", "warning");
                    return false;
                }
                this.stepStatus[1].completed = true;
                return true;
                
            case 2: // Stellenbeschreibung
                const jobPosting = document.getElementById('jobPosting');
                if (!jobPosting || jobPosting.value.trim().length < 50) {
                    window.appHelpers?.showToast("Bitte geben Sie eine ausreichend detaillierte Stellenbeschreibung ein", "warning");
                    return false;
                }
                this.stepStatus[2].completed = true;
                this.uploadedFiles.jobPosting = jobPosting.value;
                return true;
                
            default:
                return true;
        }
    }
    
    // UI aktualisieren basierend auf aktuellem Schritt
    updateUI() {
        console.log(`Aktualisiere UI für Schritt ${this.currentStep}`);
        
        // Alle Schritte ausblenden
        for (let i = 1; i <= this.maxSteps; i++) {
            const stepElement = document.getElementById(`step${i}`);
            if (stepElement) {
                stepElement.classList.add('d-none');
            }
        }
        
        // Aktuellen Schritt anzeigen
        const currentStepElement = document.getElementById(`step${this.currentStep}`);
        if (currentStepElement) {
            currentStepElement.classList.remove('d-none');
        }
        
        // Navigation aktualisieren
        const prevBtn = document.getElementById('prevStepBtn');
        const nextBtn = document.getElementById('nextStepBtn');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentStep === 1;
        }
        
        if (nextBtn) {
            // Zeige "Abschließen" statt "Weiter" im letzten Schritt
            if (this.currentStep === this.maxSteps) {
                nextBtn.textContent = 'Abschließen';
            } else {
                nextBtn.textContent = 'Weiter';
            }
        }
        
        // Analyse-Button-Status aktualisieren
        this.updateAnalyzeButtonState();
        
        // Zeige hochgeladenen Lebenslauf an, falls vorhanden
        this.updateFileDisplay();
    }
    
    // Aktiviert oder deaktiviert den Analyse-Button basierend auf dem Status
    updateAnalyzeButtonState() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        const jobPosting = document.getElementById('jobPosting');
        
        if (analyzeBtn && jobPosting) {
            // Button aktivieren, wenn Text mindestens 50 Zeichen lang ist
            analyzeBtn.disabled = jobPosting.value.trim().length < 50 || !this.uploadedFiles.resume;
            
            // Tooltip oder Hinweis hinzufügen
            if (analyzeBtn.disabled) {
                analyzeBtn.title = "Bitte geben Sie eine Stellenbeschreibung ein und laden Sie einen Lebenslauf hoch";
            } else {
                analyzeBtn.title = "Klicken Sie, um die Analyse zu starten";
            }
        }
    }
    
    // Anzeige für hochgeladene Dateien aktualisieren
    updateFileDisplay() {
        // Für Lebenslauf
        const resumeDisplay = document.getElementById('resumeFileDisplay');
        if (resumeDisplay && this.uploadedFiles.resume) {
            resumeDisplay.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-file-earmark-check me-2"></i>
                    <strong>Lebenslauf hochgeladen:</strong> ${this.uploadedFiles.resume.name} 
                    (${Math.round(this.uploadedFiles.resume.size / 1024)} KB)
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="workflowManager.removeFile('resume')">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            `;
            resumeDisplay.classList.remove('d-none');
        } else if (resumeDisplay) {
            resumeDisplay.classList.add('d-none');
        }
    }
    
    // Lebenslauf hochladen
    handleResumeUpload() {
        // Prüfen, ob Gast-Nutzung erlaubt ist
        if (this.guestMode && this.guestUsageCount >= this.maxGuestUsage) {
            window.appHelpers?.showToast("Bitte melden Sie sich an, um weitere Analysen durchzuführen", "warning");
            window.checkAuth(); // Login-Dialog öffnen
            return;
        }
        
        // Dateiauswahl-Dialog öffnen
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.txt';
        
        input.onchange = (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                
                // Datei speichern und Feedback anzeigen
                this.uploadedFiles.resume = file;
                this.stepStatus[1].completed = true;
                this.saveState();
                
                // UI aktualisieren
                this.updateFileDisplay();
                this.updateAnalyzeButtonState();
                
                // Erfolgsmeldung anzeigen
                window.appHelpers?.showToast(`Lebenslauf "${file.name}" erfolgreich hochgeladen`, "success");
                
                // Optional: In den nächsten Schritt wechseln
                if (this.currentStep === 1) {
                    setTimeout(() => this.nextStep(), 800);
                }
            }
        };
        
        input.click();
    }
    
    // Datei entfernen
    removeFile(fileType) {
        this.uploadedFiles[fileType] = null;
        
        if (fileType === 'resume') {
            this.stepStatus[1].completed = false;
        } else if (fileType === 'jobPosting') {
            this.stepStatus[2].completed = false;
        }
        
        this.saveState();
        this.updateFileDisplay();
        this.updateAnalyzeButtonState();
    }
    
    // Analyse starten
    startAnalysis() {
        console.log("Analyse wird gestartet...");
        
        // Gast-Nutzung zählen
        if (this.guestMode) {
            this.guestUsageCount++;
            this.saveState();
            
            if (this.guestUsageCount >= this.maxGuestUsage) {
                console.log("Gast-Nutzungslimit erreicht:", this.guestUsageCount);
            }
        }
        
        // Analyse-Button deaktivieren und Lade-Animation anzeigen
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Analysiere...
            `;
        }
        
        // Daten sammeln
        const jobPosting = document.getElementById('jobPosting')?.value || '';
        const resumeFile = this.uploadedFiles.resume;
        
        // Dateiinhalt extrahieren (für Demo nur simuliert)
        this.extractFileContent(resumeFile)
            .then(resumeText => {
                // Hier würde die tatsächliche Analyse stattfinden
                setTimeout(() => {
                    // Simulierte Analyseergebnisse
                    const results = this.simulateAnalysis(resumeText, jobPosting);
                    
                    // Ergebnisse anzeigen
                    this.displayAnalysisResults(results);
                    
                    // Analyse-Button zurücksetzen
                    if (analyzeBtn) {
                        analyzeBtn.disabled = false;
                        analyzeBtn.innerHTML = 'Analysieren';
                    }
                    
                    // Status aktualisieren
                    this.stepStatus[2].completed = true;
                    this.saveState();
                    
                    // Optional: In den nächsten Schritt wechseln
                    setTimeout(() => this.nextStep(), 1000);
                    
                }, 2000); // Simulierte Analysezeit
            })
            .catch(error => {
                console.error("Fehler bei der Analyse:", error);
                window.appHelpers?.showToast("Fehler bei der Analyse: " + error.message, "danger");
                
                // Analyse-Button zurücksetzen
                if (analyzeBtn) {
                    analyzeBtn.disabled = false;
                    analyzeBtn.innerHTML = 'Analysieren';
                }
            });
    }
    
    // Dateiinhalt extrahieren (vereinfacht für die Demo)
    async extractFileContent(file) {
        if (!file) return "";
        
        return new Promise((resolve) => {
            // In einer realen Anwendung würden wir den tatsächlichen Inhalt extrahieren
            // Hier simulieren wir nur für die Demo
            setTimeout(() => {
                resolve(`Simulierter Inhalt der Datei ${file.name}`);
            }, 500);
        });
    }
    
    // Simulierte Analyse für Demo-Zwecke
    simulateAnalysis(resumeText, jobPosting) {
        // In einer realen Anwendung würde hier die KI-Analyse stattfinden
        const skillMatches = [
            { skill: "JavaScript", match: 90 },
            { skill: "React", match: 85 },
            { skill: "TypeScript", match: 70 },
            { skill: "Node.js", match: 85 },
            { skill: "SQL", match: 60 }
        ];
        
        const keyPoints = [
            "Ihre Erfahrung mit React passt gut zur Stellenanforderung",
            "Sie sollten Ihre SQL-Kenntnisse in der Bewerbung stärker hervorheben",
            "Ihre JavaScript-Expertise ist ein starker Pluspunkt"
        ];
        
        return {
            overallMatch: 78,
            skillMatches,
            keyPoints,
            recommendations: [
                "Heben Sie Ihre React-Projekte in der Bewerbung besonders hervor",
                "Erwähnen Sie Ihre Erfahrung mit Node.js im Anschreiben",
                "Fügen Sie weitere Details zu Ihren SQL-Kenntnissen hinzu"
            ]
        };
    }
    
    // Analyseergebnisse anzeigen
    displayAnalysisResults(results) {
        const jobAnalysis = document.getElementById('jobAnalysis');
        const matchingResults = document.getElementById('matchingResults');
        
        if (jobAnalysis) {
            jobAnalysis.innerHTML = `
                <h5>Analyse der Stellenanzeige</h5>
                <div class="mb-3">
                    <div class="d-flex align-items-center mb-2">
                        <div class="me-3">Übereinstimmung:</div>
                        <div class="progress flex-grow-1">
                            <div class="progress-bar bg-${results.overallMatch > 70 ? 'success' : results.overallMatch > 50 ? 'warning' : 'danger'}" 
                                role="progressbar" style="width: ${results.overallMatch}%" 
                                aria-valuenow="${results.overallMatch}" aria-valuemin="0" aria-valuemax="100">
                                ${results.overallMatch}%
                            </div>
                        </div>
                    </div>
                    <div class="mt-3">
                        <h6>Schlüsselqualifikationen:</h6>
                        <div class="skill-matches">
                            ${results.skillMatches.map(skill => `
                                <div class="skill-match mb-1">
                                    <div class="d-flex align-items-center">
                                        <div style="width: 120px;">${skill.skill}:</div>
                                        <div class="progress flex-grow-1" style="height: 8px;">
                                            <div class="progress-bar bg-${skill.match > 70 ? 'success' : skill.match > 50 ? 'warning' : 'danger'}" 
                                                role="progressbar" style="width: ${skill.match}%" 
                                                aria-valuenow="${skill.match}" aria-valuemin="0" aria-valuemax="100">
                                            </div>
                                        </div>
                                        <div class="ms-2" style="width: 40px;">${skill.match}%</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            jobAnalysis.classList.remove('d-none');
        }
        
        if (matchingResults) {
            matchingResults.innerHTML = `
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">Wichtige Erkenntnisse</h5>
                    </div>
                    <div class="card-body">
                        <ul class="mb-0">
                            ${results.keyPoints.map(point => `<li>${point}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Empfehlungen</h5>
                    </div>
                    <div class="card-body">
                        <ul class="mb-0">
                            ${results.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
            
            // Generiere-Button für Anschreiben hinzufügen
            matchingResults.innerHTML += `
                <div class="mt-4 text-center">
                    <button id="generateCoverLetterBtn" class="btn btn-primary">
                        <i class="bi bi-magic me-2"></i>
                        KI Anschreiben erstellen lassen
                    </button>
                </div>
            `;
            
            // Event-Listener für den Generieren-Button
            setTimeout(() => {
                const generateBtn = document.getElementById('generateCoverLetterBtn');
                if (generateBtn) {
                    generateBtn.addEventListener('click', () => {
                        this.stepStatus[3].completed = true;
                        this.goToStep(4);
                        
                        // Simuliertes Anschreiben erzeugen
                        setTimeout(() => {
                            this.generateCoverLetter();
                        }, 1000);
                    });
                }
            }, 0);
        }
    }
    
    // Anschreiben generieren (simuliert)
    generateCoverLetter() {
        const coverLetterEditor = document.getElementById('coverLetterEditor');
        if (!coverLetterEditor) return;
        
        // Lade-Animation anzeigen
        coverLetterEditor.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Generiere Anschreiben...</span>
                </div>
                <div class="mt-3">KI generiert Ihr personalisiertes Anschreiben...</div>
            </div>
        `;
        
        // Nach kurzer Verzögerung das Anschreiben anzeigen
        setTimeout(() => {
            // Simuliertes Anschreiben
            coverLetterEditor.innerHTML = `
                <div class="cover-letter-sections">
                    <div class="mb-3">
                        <label class="form-label">Empfänger</label>
                        <textarea id="coverLetterRecipient" class="form-control" rows="2">Max Mustermann
Muster GmbH
Musterstraße 123
12345 Musterstadt</textarea>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Betreff</label>
                        <textarea id="coverLetterSubject" class="form-control" rows="1">Bewerbung als Senior Fullstack-Entwickler (m/w/d)</textarea>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Einleitung</label>
                        <textarea id="coverLetterIntro" class="form-control" rows="3">Sehr geehrte Damen und Herren,

mit großem Interesse habe ich Ihre Stellenausschreibung als Senior Fullstack-Entwickler gelesen und bewerbe mich hiermit um diese Position. Als erfahrener Entwickler mit über 5 Jahren Praxis in der Webentwicklung bin ich überzeugt, dass meine Qualifikationen und mein Enthusiasmus für innovative Technologien perfekt zu Ihrem Team passen.</textarea>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Hauptteil</label>
                        <textarea id="coverLetterMain" class="form-control" rows="6">Während meiner bisherigen Laufbahn habe ich umfangreiche Erfahrungen mit React und Node.js gesammelt, die exakt zu Ihren Anforderungen passen. In meiner aktuellen Position bei TechSolutions GmbH bin ich verantwortlich für die Entwicklung und Wartung mehrerer Microservices sowie die Implementierung moderner Frontends mit React und TypeScript.

Besonders stolz bin ich auf ein kürzlich abgeschlossenes Projekt, bei dem ich ein Legacy-System erfolgreich modernisiert und in eine effiziente Microservice-Architektur überführt habe. Dies führte zu einer Verbesserung der Performance um 40% und einer deutlich gesteigerten Entwicklungsgeschwindigkeit im Team.

Neben meinen technischen Fähigkeiten bringe ich Erfahrung im Mentoring und in der Durchführung von Code Reviews mit. Als zertifizierter Scrum Master bin ich mit agilen Entwicklungsmethoden bestens vertraut und lege großen Wert auf eine enge Zusammenarbeit mit Product Ownern und UX-Designern.</textarea>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Abschluss</label>
                        <textarea id="coverLetterClosing" class="form-control" rows="3">Ich freue mich auf die Möglichkeit, mein Wissen und meine Erfahrung in Ihr Team einzubringen und gemeinsam innovative Lösungen zu entwickeln. Gerne stelle ich Ihnen meine Fähigkeiten in einem persönlichen Gespräch vor.

Mit freundlichen Grüßen,
[Ihr Name]</textarea>
                    </div>
                </div>
                
                <div class="mt-4 text-center">
                    <button id="exportCoverLetterBtn" class="btn btn-primary">
                        <i class="bi bi-file-earmark-word me-2"></i>
                        Als Word-Dokument exportieren
                    </button>
                </div>
            `;
            
            // Status aktualisieren
            this.stepStatus[4].completed = true;
            this.saveState();
            
            // Vorschau aktualisieren
            if (typeof updatePreview === 'function') {
                setTimeout(updatePreview, 100);
            }
            
            // Event-Listener für Export-Button
            setTimeout(() => {
                const exportBtn = document.getElementById('exportCoverLetterBtn');
                if (exportBtn) {
                    exportBtn.addEventListener('click', () => {
                        alert("Export-Funktion würde hier Ihr Anschreiben als Word-Dokument speichern");
                    });
                }
            }, 0);
        }, 2000);
    }
}

// Globale Instanz erstellen und exportieren
window.workflowManager = new WorkflowManager();

// Bei Dokumentladung initialisieren
document.addEventListener('DOMContentLoaded', () => {
    window.workflowManager.initialize();
});

export default window.workflowManager; 