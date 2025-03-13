// Globale Funktionen für HTML-Elemente

// Direkt ins Window-Objekt schreiben
window.checkAuth = async function() {
    console.log("checkAuth wurde aufgerufen");
    try {
        // Fallback wenn AuthService nicht verfügbar ist
        if (typeof AuthService === 'undefined') {
            console.warn('AuthService ist nicht definiert, verwende Fallback');
            return true; // Einfacher Fallback für Tests
        }
        
        await AuthService.checkAuth();
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        alert('Anmeldung erforderlich');
        return false;
    }
};

// Diese Funktionen sollen über HTML onclick direkt aufrufbar sein
window.functions = {
    login: function() {
        const modal = document.getElementById('loginModal');
        if (modal && bootstrap) {
            new bootstrap.Modal(modal).show();
        } else {
            alert('Login-Modal konnte nicht geöffnet werden');
        }
    },
    
    register: function() {
        const modal = document.getElementById('registerModal');
        if (modal && bootstrap) {
            new bootstrap.Modal(modal).show();
        } else {
            alert('Registrierungs-Modal konnte nicht geöffnet werden');
        }
    },
    
    uploadResume: function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx';
        input.onchange = function(e) {
            if (e.target.files.length > 0) {
                alert(`Datei "${e.target.files[0].name}" ausgewählt`);
            }
        };
        input.click();
    },
    
    startWorkflow: function() {
        const modal = document.getElementById('workflowModal');
        if (modal && bootstrap) {
            new bootstrap.Modal(modal).show();
        } else {
            alert('Workflow-Modal konnte nicht geöffnet werden');
        }
    }
};

// Initialisiere auch alle onclick-Attribute bei Seitenlade
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initialisiere globale Funktionen...");
    
    // Für alle Buttons mit onclick, die checkAuth aufrufen
    document.querySelectorAll('button[onclick*="checkAuth"]').forEach(button => {
        console.log("Ersetze onclick mit addEventListener für:", button.textContent.trim());
        const onclickContent = button.getAttribute('onclick');
        button.removeAttribute('onclick');
        
        button.addEventListener('click', function() {
            console.log("Button klick mit checkAuth:", onclickContent);
            window.checkAuth();
        });
    });
});

console.log("Globale Funktionen geladen"); 