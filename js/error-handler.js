/**
 * Globales Error-Handling für die Bewerbungs-App
 */

// Globale Error-Handler
window.ErrorHandler = {
    // Fehler in der Konsole protokollieren und dem Benutzer anzeigen
    handleError: function(error, source = 'Anwendung') {
        console.error(`[${source} Fehler]`, error);
        
        const message = error.message || String(error);
        
        // Benutzerfreundliche Fehlermeldung
        try {
            // Toast-Benachrichtigung, wenn verfügbar
            if (window.appHelpers && window.appHelpers.showToast) {
                window.appHelpers.showToast(`Fehler: ${message}`, 'danger');
            } else {
                // Fallback auf Alert
                alert(`Ein Fehler ist aufgetreten: ${message}`);
            }
        } catch (e) {
            // Ultra-Fallback
            alert(`Fehler: ${message}`);
        }
        
        // Fehler für Telemetrie erfassen
        this.logError(error, source);
    },
    
    // Fehler für spätere Analyse erfassen
    logError: function(error, source) {
        try {
            // Timestamp hinzufügen
            const errorData = {
                timestamp: new Date().toISOString(),
                source: source,
                message: error.message || String(error),
                stack: error.stack,
                userAgent: navigator.userAgent
            };
            
            // In localStorage speichern (könnte später gesendet werden)
            let errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
            errorLog.push(errorData);
            
            // Maximale Anzahl von Fehler-Logs begrenzen
            if (errorLog.length > 50) {
                errorLog = errorLog.slice(-50);
            }
            
            localStorage.setItem('errorLog', JSON.stringify(errorLog));
            
            // Optional: Senden an Server-Telemetrie
            // this.sendErrorToServer(errorData);
        } catch (e) {
            console.error('Fehler beim Logging:', e);
        }
    },
    
    // Sammeln aller Fehler-Logs für Debugging
    getErrorLogs: function() {
        try {
            return JSON.parse(localStorage.getItem('errorLog') || '[]');
        } catch (e) {
            console.error('Fehler beim Abrufen von Error-Logs:', e);
            return [];
        }
    },
    
    // Alle Fehler-Logs löschen
    clearErrorLogs: function() {
        localStorage.removeItem('errorLog');
        return true;
    }
};

// Globalen Unhandled Exception Handler hinzufügen
window.addEventListener('error', function(event) {
    window.ErrorHandler.handleError(event.error || new Error(event.message), 'Unhandled');
    // event.preventDefault(); // Wenn Sie den Standard-Error-Handler überschreiben möchten
});

// Unhandled Promise Rejection Handler
window.addEventListener('unhandledrejection', function(event) {
    window.ErrorHandler.handleError(event.reason || new Error('Unhandled Promise Rejection'), 'Promise');
    // event.preventDefault(); // Wenn Sie den Standard-Error-Handler überschreiben möchten
});

console.log('Error-Handler initialisiert'); 