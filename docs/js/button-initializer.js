/**
 * Button-Initialisierer für die Bewerbungs-App
 * Diese Datei initialisiert alle Buttons unabhängig von der normalen Event-Listener-Logik
 */

document.addEventListener('DOMContentLoaded', function() {
    // Starte Initialisierung nach kurzem Delay, um sicherzustellen, dass alle DOM-Elemente geladen sind
    setTimeout(initializeAllButtons, 500);
    
    function initializeAllButtons() {
        console.log("★ Initialisiere Buttons neu...");
        try {
            // 1. Anschreiben erstellen Button umbenennen
            const coverLetterBtn = document.querySelector('[data-action="create-cover-letter"], #createCoverLetterBtn');
            if (coverLetterBtn) {
                coverLetterBtn.textContent = "KI Anschreiben erstellen lassen";
                coverLetterBtn.title = "Lassen Sie die KI ein passendes Anschreiben auf Basis des hochgeladenen Lebenslaufs und der Stellenanzeige erstellen";
                coverLetterBtn.addEventListener('click', function() {
                    console.log("KI Anschreiben Button geklickt");
                    if (typeof handleCreateCoverLetter === 'function') {
                        handleCreateCoverLetter();
                    } else {
                        console.error("handleCreateCoverLetter ist nicht definiert");
                        alert("Funktion zum Erstellen des Anschreibens nicht verfügbar");
                    }
                });
                console.log("✓ Anschreiben-Button umbenannt und neu initialisiert");
            }
            
            // 2. Alle Buttons mit onclick-Attributen initialisieren
            document.querySelectorAll('button[onclick]').forEach(button => {
                const onclickContent = button.getAttribute('onclick');
                console.log(`Button mit onclick="${onclickContent}" gefunden`);
                
                // Extrahiere Funktionsname aus onclick
                const funcName = onclickContent.split('(')[0];
                button.removeAttribute('onclick'); // Entferne inline handler
                
                button.addEventListener('click', function(e) {
                    console.log(`Button ${button.textContent.trim()} geklickt, versuche ${funcName} auszuführen...`);
                    try {
                        if (window[funcName]) {
                            window[funcName]();
                        } else if (window.globalState && window.globalState[funcName]) {
                            window.globalState[funcName]();
                        } else {
                            console.error(`Funktion ${funcName} nicht gefunden`);
                        }
                    } catch (err) {
                        console.error(`Fehler beim Ausführen von ${funcName}:`, err);
                    }
                });
            });
            
            // 3. Spezifische Kernbuttons initialisieren
            initializeSpecificButtons();
            
        } catch (error) {
            console.error("Fehler bei Button-Initialisierung:", error);
        }
    }
    
    function initializeSpecificButtons() {
        const buttonHandlers = {
            'analyzeBtn': handleAnalyze,
            'pasteBtn': handlePaste,
            'loadExampleBtn': handleLoadExample,
            'loginBtn': showLogin,
            'registerBtn': showRegister,
            'saveSettingsBtn': saveSettings,
            'uploadResumeBtn': handleResumeUpload,
            'startBtn': startWorkflow
        };
        
        // Initialisiere jeden Button einzeln
        Object.entries(buttonHandlers).forEach(([id, handler]) => {
            const button = document.getElementById(id);
            if (button) {
                // Entferne alle bestehenden Event-Listener
                button.replaceWith(button.cloneNode(true));
                const newButton = document.getElementById(id);
                
                if (newButton) {
                    newButton.addEventListener('click', function(e) {
                        console.log(`Button ${id} geklickt`);
                        if (typeof handler === 'function') {
                            handler();
                        } else {
                            console.error(`Handler für ${id} ist keine Funktion`);
                        }
                    });
                    console.log(`✓ Button ${id} initialisiert`);
                }
            } else {
                console.log(`Button ${id} nicht gefunden`);
            }
        });
    }
    
    // Globale Hilfsfunktionen für Buttons
    window.showLogin = function() {
        const loginModal = document.getElementById('loginModal');
        if (loginModal && bootstrap) {
            const modal = new bootstrap.Modal(loginModal);
            modal.show();
        } else {
            console.error("Login Modal oder Bootstrap nicht verfügbar");
        }
    };
    
    window.showRegister = function() {
        const registerModal = document.getElementById('registerModal');
        if (registerModal && bootstrap) {
            const modal = new bootstrap.Modal(registerModal);
            modal.show();
        } else {
            console.error("Register Modal oder Bootstrap nicht verfügbar");
        }
    };
    
    window.saveSettings = function() {
        // Führe Einstellungsspeicherung durch
        const apiKeyInput = document.getElementById('apiKeyInput');
        if (apiKeyInput?.value.trim()) {
            localStorage.setItem('myEncryptedApiKey', btoa(apiKeyInput.value.trim()));
            alert('Einstellungen gespeichert');
        }
    };
    
    window.handleAnalyze = async function() {
        console.log("Analyse starten...");
        try {
            const jobPosting = document.getElementById('jobPosting')?.value;
            if (!jobPosting) {
                alert("Bitte fügen Sie eine Stellenanzeige ein");
                return;
            }
            
            const analyzeBtn = document.getElementById('analyzeBtn');
            if (analyzeBtn) {
                analyzeBtn.disabled = true;
                analyzeBtn.innerHTML = `
                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Analysiere...
                `;
            }
            
            // Simulierte Analyse für Test
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = 'Analysieren';
            }
            
            alert("Analyse abgeschlossen!");
        } catch (error) {
            console.error("Analyse-Fehler:", error);
            alert("Fehler bei der Analyse: " + error.message);
        }
    };
    
    window.handlePaste = async function() {
        try {
            const text = await navigator.clipboard.readText();
            const jobPosting = document.getElementById('jobPosting');
            if (jobPosting) {
                jobPosting.value = text;
                alert("Text aus Zwischenablage eingefügt");
            }
        } catch (error) {
            console.error("Einfügen fehlgeschlagen:", error);
            alert("Fehler beim Einfügen: " + error.message);
        }
    };
    
    window.handleLoadExample = function() {
        const jobPosting = document.getElementById('jobPosting');
        if (jobPosting) {
            jobPosting.value = `
Stellenbezeichnung: Senior Fullstack-Entwickler (m/w/d)

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
- Attraktives Gehalt und zusätzliche Benefits
            `;
            alert("Beispiel-Stellenanzeige wurde eingefügt");
        }
    };
    
    window.handleResumeUpload = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx';
        input.click();
        
        input.onchange = function(e) {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                alert(`Datei "${file.name}" ausgewählt. Upload wird simuliert.`);
                // Hier würde der tatsächliche Upload-Code stehen
            }
        };
    };
    
    window.startWorkflow = function() {
        const workflowModal = document.getElementById('workflowModal');
        if (workflowModal && bootstrap) {
            const modal = new bootstrap.Modal(workflowModal);
            modal.show();
            alert("Workflow wurde gestartet");
        } else {
            alert("Workflow-Modal nicht gefunden oder Bootstrap nicht verfügbar");
        }
    };

    window.handleCreateCoverLetter = function() {
        alert("KI Anschreiben-Generator wird gestartet...");
        // Hier würde der tatsächliche Code zum Erstellen des Anschreibens stehen
    };
    
    console.log("★ Button-Initialisierer geladen und bereit");
}); 