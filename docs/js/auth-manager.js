/**
 * Prüft, ob der aktuelle Benutzer Zugriff auf Premium-Funktionen hat
 * @returns {boolean} True wenn der Benutzer Premium-Zugriff hat
 */
hasResumeAnalysisAccess: function() {
    // Prüfe, ob der Benutzer angemeldet ist
    if (!this.currentUser) {
        return false;
    }
    
    // Prüfe auf Premium-Abonnement (Beispiel)
    // In einer echten Anwendung würde dies mit der Datenbank oder einem Abrechnungssystem kommunizieren
    const userClaims = this.currentUser.getIdTokenResult?.() || {};
    const premiumUntil = localStorage.getItem('premiumUntil');
    
    // Entweder Premium-Claim oder lokaler Premium-Status
    return userClaims.premium === true || 
           (premiumUntil && new Date(premiumUntil) > new Date());
}

/**
 * Verbesserte Fehlerbehandlung für Anmeldeversuche
 */
handleLoginError: function(error) {
    let errorMessage = "Anmeldung fehlgeschlagen";
    let additionalHelp = "";
    
    // Spezifische Fehlermeldungen basierend auf Firebase-Fehlercodes
    switch(error.code) {
        case 'auth/user-not-found':
            errorMessage = "Benutzer nicht gefunden";
            additionalHelp = `
                <div class="mt-3 text-center">
                    <p>Sie haben noch kein Konto?</p>
                    <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#registrationModal">
                        Jetzt registrieren
                    </button>
                </div>
            `;
            break;
            
        case 'auth/wrong-password':
            errorMessage = "Falsches Passwort";
            additionalHelp = `
                <div class="mt-3 text-center">
                    <p>Passwort vergessen?</p>
                    <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#passwordResetModal">
                        Passwort zurücksetzen
                    </button>
                </div>
            `;
            break;
            
        case 'auth/too-many-requests':
            errorMessage = "Zu viele Anmeldeversuche";
            additionalHelp = `
                <div class="mt-3 alert alert-info">
                    <p class="mb-0">Bitte versuchen Sie es später erneut oder setzen Sie Ihr Passwort zurück.</p>
                </div>
            `;
            break;
            
        case 'auth/invalid-email':
            errorMessage = "Ungültige E-Mail-Adresse";
            break;
            
        case 'auth/user-disabled':
            errorMessage = "Dieses Konto wurde deaktiviert";
            additionalHelp = `
                <div class="mt-3 alert alert-warning">
                    <p class="mb-0">Bitte kontaktieren Sie den Support für weitere Hilfe.</p>
                </div>
            `;
            break;
            
        case 'auth/network-request-failed':
            errorMessage = "Netzwerkfehler";
            additionalHelp = `
                <div class="mt-3 alert alert-warning">
                    <p class="mb-0">Bitte überprüfen Sie Ihre Internetverbindung.</p>
                </div>
            `;
            break;
    }
    
    // Fehler anzeigen
    const loginErrorElement = document.getElementById('loginError');
    const loginHelpElement = document.getElementById('loginHelp');
    
    if (loginErrorElement) {
        loginErrorElement.textContent = errorMessage;
        loginErrorElement.classList.remove('d-none');
    }
    
    if (loginHelpElement && additionalHelp) {
        loginHelpElement.innerHTML = additionalHelp;
        loginHelpElement.classList.remove('d-none');
    }
    
    console.error('Login error:', error);
} 