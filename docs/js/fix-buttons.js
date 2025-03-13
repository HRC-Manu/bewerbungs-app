// Sofort verfügbare globale Funktionen
window.checkAuth = window.checkAuth || function() {
    console.log("checkAuth aufgerufen");
    
    // Modal anzeigen, wenn Bootstrap verfügbar ist
    if (typeof bootstrap !== 'undefined') {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            try {
                const modal = new bootstrap.Modal(loginModal);
                modal.show();
            } catch (error) {
                console.error("Fehler beim Öffnen des Login-Modals:", error);
                alert("Bitte anmelden");
            }
        } else {
            alert("Bitte anmelden");
        }
    } else {
        alert("Bitte anmelden");
    }
    
    return false;
};

// Diese Funktion wird direkt nach dem Laden ausgeführt
function fixButtons() {
    console.log("Fix-Buttons-Skript wird ausgeführt...");
    
    // Direktes Aktivieren aller Buttons
    document.querySelectorAll('button').forEach(btn => {
        btn.onclick = function(event) {
            console.log(`Button geklickt: ${btn.id || btn.textContent.trim()}`);
            
            // Spezielle Button-Behandlung
            if (btn.id === 'loginBtn') {
                const loginModal = document.getElementById('loginModal');
                if (loginModal && typeof bootstrap !== 'undefined') {
                    try {
                        const modal = new bootstrap.Modal(loginModal);
                        modal.show();
                    } catch (e) {
                        console.error("Modal-Fehler:", e);
                        alert("Login-Funktion nicht verfügbar");
                    }
                }
                event.preventDefault();
                return false;
            }
            else if (btn.id === 'uploadResumeBtn') {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.doc,.docx';
                input.click();
                event.preventDefault();
                return false;
            }
            else if (btn.id === 'createCoverLetterBtn') {
                btn.textContent = "KI Anschreiben erstellen lassen";
                alert("KI Anschreiben-Generator wird gestartet...");
                event.preventDefault();
                return false;
            }
        };
    });
    
    console.log("Fix-Buttons-Skript abgeschlossen");
}

// Die Funktion ausführen, sobald das DOM geladen ist
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixButtons);
} else {
    fixButtons();
}

// Auch nach einem kurzen Delay ausführen, für den Fall, dass DOM bereits geladen ist
setTimeout(fixButtons, 500); 