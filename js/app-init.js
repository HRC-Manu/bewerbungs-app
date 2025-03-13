/**
 * Bewerbungs-App Initialisierungs-Skript
 * Dieses Skript initialisiert und verbindet alle App-Komponenten
 */

// Importiere Module
import { performanceMonitor } from './performance-monitor.js';
import authManager from './auth-manager.js';
import workflowManager from './workflow-manager.js';

// Globale App-Konfiguration
const APP_CONFIG = {
    // Erlaubt 2 Testdurchläufe ohne Anmeldung
    maxGuestUsage: 2,
    
    // Anwendungsmodule
    modules: {
        auth: true,
        workflow: true,
        performance: true,
        errorHandler: true
    },
    
    // Debug-Modus
    debug: true
};

// App-Initialisierung
class AppInitializer {
    constructor(config) {
        this.config = config;
        console.log("Bewerbungs-App wird initialisiert...");
    }
    
    async initialize() {
        try {
            console.time('App-Initialisierung');
            
            // Debug-Modus einstellen
            if (this.config.debug) {
                console.log("Debug-Modus aktiviert");
                this.setupDebugTools();
            }
            
            // Event-Listener für DOM-Ready-Event
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
            } else {
                // DOM ist bereits geladen
                this.onDOMReady();
            }
            
            // Globale Error-Handler aktivieren
            if (this.config.modules.errorHandler && window.ErrorHandler) {
                console.log("Error-Handler aktiviert");
            }
            
            console.timeEnd('App-Initialisierung');
            return true;
        } catch (error) {
            console.error("Fehler bei der App-Initialisierung:", error);
            return false;
        }
    }
    
    onDOMReady() {
        console.log("DOM geladen, initialisiere UI-Komponenten...");
        
        // Workflow-Manager konfigurieren
        if (this.config.modules.workflow && window.workflowManager) {
            // Gastnutzungslimit setzen
            window.workflowManager.maxGuestUsage = this.config.maxGuestUsage;
            
            // Workflow-Manager starten
            window.workflowManager.initialize();
            console.log("Workflow-Manager initialisiert");
        }
        
        // Analyse-Button aktivieren
        this.initializeAnalyzeButton();
        
        // Lebenslauf-Upload-Button optimieren
        this.enhanceResumeUploadButton();
        
        // Buttons umbenennen
        this.renameCoverLetterButton();
        
        console.log("UI-Initialisierung abgeschlossen");
    }
    
    // Analyse-Button aktivieren
    initializeAnalyzeButton() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        const jobPosting = document.getElementById('jobPosting');
        
        if (analyzeBtn && jobPosting) {
            // Anfangs deaktivieren
            analyzeBtn.disabled = true;
            
            // Aktivieren, wenn Text eingegeben wird
            jobPosting.addEventListener('input', () => {
                const hasContent = jobPosting.value.trim().length >= 50;
                analyzeBtn.disabled = !hasContent;
                
                if (hasContent) {
                    analyzeBtn.classList.add('active');
                    analyzeBtn.title = "Stellenbeschreibung analysieren";
                } else {
                    analyzeBtn.classList.remove('active');
                    analyzeBtn.title = "Bitte geben Sie mindestens 50 Zeichen ein";
                }
            });
            
            // Beispieltext einfügen (für einfacheres Testen)
            const exampleJobText = `Stellenbezeichnung: Senior Fullstack-Entwickler (m/w/d)

Wir suchen zum nächstmöglichen Zeitpunkt einen erfahrenen Fullstack-Entwickler für unser agiles Entwicklungsteam.

Ihre Aufgaben:
- Entwicklung moderner Webanwendungen mit React und Node.js
- Konzeption und Implementierung von Microservices
- Code Reviews und Mentoring von Junioren
- Enge Zusammenarbeit mit Product Ownern und UX-Designern

Ihr Profil:
- Mind. 3 Jahre Berufserfahrung in der Webentwicklung
- Sehr gute Kenntnisse in JavaScript/TypeScript, React und Node.js
- Erfahrung mit Datenbanken (SQL und NoSQL)
- Agile Entwicklungsmethoden (Scrum/Kanban)

Wir bieten:
- Flexible Arbeitszeiten und Remote-Möglichkeiten
- Moderne Technologie-Stack und innovative Projekte
- Regelmäßige Weiterbildungen
- Attraktives Gehalt und zusätzliche Benefits`;
            
            // Beispieltext-Button
            const loadExampleBtn = document.getElementById('loadExampleBtn');
            if (loadExampleBtn) {
                loadExampleBtn.addEventListener('click', () => {
                    jobPosting.value = exampleJobText;
                    analyzeBtn.disabled = false;
                    analyzeBtn.classList.add('active');
                    // Event zum Auslösen der input-Handler
                    jobPosting.dispatchEvent(new Event('input'));
                });
            }
            
            console.log("Analyse-Button initialisiert");
        } else {
            console.warn("Analyse-Button oder Jobtext-Feld nicht gefunden");
        }
    }
    
    // Lebenslauf-Upload-Button verbessern
    enhanceResumeUploadButton() {
        const uploadResumeBtn = document.getElementById('uploadResumeBtn');
        if (!uploadResumeBtn) return;
        
        uploadResumeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Dateiauswahl-Dialog erstellen und öffnen
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf,.doc,.docx,.txt';
            
            // Feedback-Element für Datei-Uploads
            let resumeFileDisplay = document.getElementById('resumeFileDisplay');
            if (!resumeFileDisplay) {
                resumeFileDisplay = document.createElement('div');
                resumeFileDisplay.id = 'resumeFileDisplay';
                resumeFileDisplay.className = 'mt-3';
                // Füge das Element nach dem Upload-Button ein
                uploadResumeBtn.parentNode.appendChild(resumeFileDisplay);
            }
            
            input.onchange = (event) => {
                if (event.target.files.length > 0) {
                    const file = event.target.files[0];
                    console.log("Datei ausgewählt:", file.name);
                    
                    // Dateivorschau anzeigen
                    resumeFileDisplay.innerHTML = `
                        <div class="alert alert-success">
                            <i class="bi bi-file-earmark-check me-2"></i>
                            <strong>Lebenslauf hochgeladen:</strong> ${file.name} 
                            (${Math.round(file.size / 1024)} KB)
                            <button class="btn btn-sm btn-outline-danger ms-2" id="removeResumeBtn">
                                <i class="bi bi-x"></i>
                            </button>
                        </div>
                    `;
                    resumeFileDisplay.classList.remove('d-none');
                    
                    // Analysebutton aktivieren, wenn auch Stellenanzeige vorhanden
                    const analyzeBtn = document.getElementById('analyzeBtn');
                    const jobPosting = document.getElementById('jobPosting');
                    if (analyzeBtn && jobPosting && jobPosting.value.trim().length >= 50) {
                        analyzeBtn.disabled = false;
                    }
                    
                    // Event-Handler für "Entfernen"-Button
                    const removeBtn = document.getElementById('removeResumeBtn');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', () => {
                            resumeFileDisplay.innerHTML = '';
                            resumeFileDisplay.classList.add('d-none');
                            // Analysebutton deaktivieren
                            if (analyzeBtn) analyzeBtn.disabled = true;
                        });
                    }
                    
                    // Wenn wir im Workflow-Manager sind, Datei dort speichern
                    if (window.workflowManager) {
                        window.workflowManager.uploadedFiles.resume = file;
                        window.workflowManager.stepStatus[1].completed = true;
                        window.workflowManager.saveState();
                        window.workflowManager.updateAnalyzeButtonState();
                    }
                    
                    // Erfolgsmeldung
                    if (window.appHelpers?.showToast) {
                        window.appHelpers.showToast(`Lebenslauf "${file.name}" erfolgreich hochgeladen`, "success");
                    }
                }
            };
            
            input.click();
        });
        
        console.log("Lebenslauf-Upload-Button optimiert");
    }
    
    // Anschreiben-Button umbenennen
    renameCoverLetterButton() {
        const coverLetterBtn = document.getElementById('createCoverLetterBtn');
        if (coverLetterBtn) {
            coverLetterBtn.innerHTML = '<i class="bi bi-magic me-2"></i>KI Anschreiben erstellen lassen';
            coverLetterBtn.title = "Lassen Sie die KI ein passendes Anschreiben auf Basis des hochgeladenen Lebenslaufs und der Stellenanzeige erstellen";
        }
    }
    
    // Debug-Tools einrichten
    setupDebugTools() {
        window.debugApp = window.debugApp || {};
        
        // Testfunktion für Gastnutzung
        window.debugApp.resetGuestUsage = function() {
            if (window.workflowManager) {
                window.workflowManager.guestUsageCount = 0;
                window.workflowManager.saveState();
                console.log("Gast-Nutzungszähler zurückgesetzt");
                return true;
            }
            return false;
        };
        
        // Testfunktion für Button-Test
        window.debugApp.testAnalyzeButton = function() {
            const analyzeBtn = document.getElementById('analyzeBtn');
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                console.log("Analyse-Button aktiviert");
                return true;
            }
            return false;
        };
        
        console.log("Debug-Tools verfügbar über window.debugApp");
    }
}

// App initialisieren
const appInitializer = new AppInitializer(APP_CONFIG);
appInitializer.initialize();

// Globalen Zugriff ermöglichen
window.appInitializer = appInitializer; 