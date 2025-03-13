/**
 * Bewerbungs-App Core Module
 * Zentrales Modul für grundlegende App-Funktionalitäten
 */

// Sofort ausgeführter Code für globale Funktionen
(function() {
    // Globale checkAuth Funktion
    window.checkAuth = function() {
        console.log("Core checkAuth aufgerufen");
        try {
            const loginModal = document.getElementById('loginModal');
            if (loginModal && typeof bootstrap !== 'undefined') {
                const modal = new bootstrap.Modal(loginModal);
                modal.show();
            } else {
                console.warn("Login-Modal oder Bootstrap nicht verfügbar");
                alert("Bitte melden Sie sich an");
            }
        } catch (error) {
            console.error("Modal-Fehler:", error);
            alert("Bitte melden Sie sich an");
        }
        return false;
    };

    // Weitere globale Funktionen
    window.appHelpers = {
        // Datei-Upload-Handler
        handleFileUpload: function(acceptTypes = '.pdf,.doc,.docx', callback) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = acceptTypes;
            input.onchange = function(e) {
                if (e.target.files.length > 0) {
                    console.log("Datei ausgewählt:", e.target.files[0].name);
                    if (typeof callback === 'function') {
                        callback(e.target.files[0]);
                    } else {
                        alert(`Datei "${e.target.files[0].name}" ausgewählt`);
                    }
                }
            };
            input.click();
        },

        // Modal-Öffner
        openModal: function(modalId) {
            try {
                const modal = document.getElementById(modalId);
                if (modal && typeof bootstrap !== 'undefined') {
                    const bsModal = new bootstrap.Modal(modal);
                    bsModal.show();
                    return true;
                }
            } catch (error) {
                console.error(`Fehler beim Öffnen des Modals ${modalId}:`, error);
            }
            return false;
        },

        // Toast-Nachricht anzeigen
        showToast: function(message, type = 'success') {
            console.log(`${type.toUpperCase()}: ${message}`);
            
            try {
                const toastContainer = document.querySelector('.toast-container') || document.body;
                const toast = document.createElement('div');
                
                toast.className = `toast align-items-center text-white bg-${type} border-0`;
                toast.setAttribute('role', 'alert');
                toast.setAttribute('aria-live', 'assertive');
                toast.setAttribute('aria-atomic', 'true');
                
                toast.innerHTML = `
                    <div class="d-flex">
                        <div class="toast-body">${message}</div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                `;
                
                toastContainer.appendChild(toast);
                
                const bsToast = new bootstrap.Toast(toast, {
                    delay: 3000
                });
                
                bsToast.show();
                
                // Entferne Toast nach Animation
                toast.addEventListener('hidden.bs.toast', () => {
                    toast.remove();
                });
            } catch (e) {
                // Fallback alert
                alert(message);
            }
        }
    };
    
    console.log("App-Core-Modul initialisiert");
})();

// Export des Haupt-App-Objekts für modulare Verwendung
export const AppCore = {
    initialize: function() {
        console.log("AppCore.initialize() aufgerufen");
        this.attachEventHandlers();
        return true;
    },
    
    attachEventHandlers: function() {
        console.log("Event-Handler werden angehängt...");
        
        // Bei jedem DOMContentLoaded Buttons neu initialisieren
        document.addEventListener('DOMContentLoaded', function() {
            AppCore.initializeButtons();
        });
        
        // Auch jetzt sofort ausführen für den Fall, dass DOM bereits geladen ist
        if (document.readyState !== 'loading') {
            AppCore.initializeButtons();
        }
    },
    
    initializeButtons: function() {
        console.log("Buttons werden initialisiert...");
        
        // Anschreiben-Button umbennen
        const coverLetterBtn = document.getElementById('createCoverLetterBtn');
        if (coverLetterBtn) {
            coverLetterBtn.textContent = "KI Anschreiben erstellen lassen";
            coverLetterBtn.title = "Lassen Sie die KI ein passendes Anschreiben auf Basis des hochgeladenen Lebenslaufs und der Stellenanzeige erstellen";
            
            coverLetterBtn.addEventListener('click', function() {
                alert("KI Anschreiben-Generator wird gestartet...");
            });
            
            console.log("Anschreiben-Button umbenannt");
        }
        
        // Login-Button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', function() {
                window.appHelpers.openModal('loginModal');
            });
        }
        
        // Upload-Button
        const uploadResumeBtn = document.getElementById('uploadResumeBtn');
        if (uploadResumeBtn) {
            uploadResumeBtn.addEventListener('click', function() {
                window.appHelpers.handleFileUpload();
            });
        }
        
        // Sonstige Buttons mit onclick-Attributen
        document.querySelectorAll('button[onclick], a[onclick]').forEach(element => {
            const onclickContent = element.getAttribute('onclick');
            if (onclickContent) {
                console.log(`Element mit onclick="${onclickContent}" gefunden`);
                
                element.removeAttribute('onclick');
                
                element.addEventListener('click', function(event) {
                    console.log(`Element geklickt: ${element.textContent.trim()}`);
                    
                    if (element.tagName === 'A') {
                        event.preventDefault();
                    }
                    
                    if (onclickContent.includes('checkAuth')) {
                        window.checkAuth();
                    } else {
                        try {
                            // Vorsicht mit eval! In einer Produktionsumgebung nicht empfohlen.
                            // Besser: Verwende ein Mapping von Funktionsnamen zu tatsächlichen Funktionen
                            (new Function(onclickContent))();
                        } catch (e) {
                            console.error(`Fehler bei Ausführung von ${onclickContent}:`, e);
                            alert("Diese Funktion ist momentan nicht verfügbar");
                        }
                    }
                });
            }
        });
        
        console.log("Button-Initialisierung abgeschlossen");
    }
};

// Bootstrap automatisch beim Laden
AppCore.initialize(); 