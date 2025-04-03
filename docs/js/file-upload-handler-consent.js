/**
 * Erweiterter Upload-Handler mit Datenschutz-Einwilligung
 */

(function() {
    // Sofort ausführbare Funktion für Isolation
    const PrivacyAwareUploadHandler = {
        consentGiven: false,
        
        init: function() {
            console.log('PrivacyAwareUploadHandler initialisiert');
            this.attachEventListeners();
            this.checkForStoredConsent();
        },
        
        checkForStoredConsent: function() {
            // Prüfen, ob bereits eine Einwilligung erteilt wurde
            const storedConsent = localStorage.getItem('privacyConsent');
            if (storedConsent === 'true') {
                this.consentGiven = true;
                console.log('Datenschutzeinwilligung bereits vorhanden');
            }
        },
        
        attachEventListeners: function() {
            // Finde alle Upload-Bereiche
            const uploadAreas = document.querySelectorAll('.upload-area, [data-upload="true"]');
            
            uploadAreas.forEach(area => {
                area.addEventListener('click', (e) => {
                    // Prüfe, ob Datenschutzeinwilligung bereits erteilt wurde
                    if (!this.consentGiven) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showPrivacyConsentModal();
                    }
                    // Sonst normal fortfahren - der ursprüngliche Upload-Handler übernimmt
                });
                
                // Auch für Drag & Drop
                area.addEventListener('dragover', (e) => {
                    if (!this.consentGiven) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showPrivacyConsentModal();
                    }
                }, false);
            });
            
            // Ereignis-Listener für explizite Upload-Buttons
            const uploadButtons = document.querySelectorAll('[data-action="upload"], #browseFilesBtn, #resumeUploadBtn');
            
            uploadButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    if (!this.consentGiven) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.showPrivacyConsentModal();
                    }
                });
            });
        },
        
        showPrivacyConsentModal: function() {
            // Prüfe, ob das Modal bereits existiert
            let modal = document.getElementById('privacyConsentModal');
            
            // Falls nicht, erstelle es
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'privacyConsentModal';
                modal.className = 'modal fade';
                modal.setAttribute('tabindex', '-1');
                modal.setAttribute('aria-labelledby', 'privacyConsentModalLabel');
                modal.setAttribute('aria-hidden', 'true');
                
                modal.innerHTML = `
                    <div class="modal-dialog modal-dialog-centered modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="privacyConsentModalLabel">
                                    <i class="bi bi-shield-lock me-2"></i>Datenschutzhinweis
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-info mb-4">
                                    <p><strong>Bevor Sie Dokumente hochladen können, benötigen wir Ihre Einwilligung:</strong></p>
                                </div>
                                
                                <p>Wenn Sie Dokumente hochladen oder die KI-Analyse verwenden, werden Ihre Daten verarbeitet. Insbesondere werden:</p>
                                
                                <ul class="mb-4">
                                    <li>Hochgeladene Dokumente lokal auf Ihrem Gerät gespeichert</li>
                                    <li>Textinhalte zur Analyse an OpenAI-Server übermittelt</li>
                                    <li>Analytische Ergebnisse für 30 Tage für Qualitätssicherungszwecke gespeichert</li>
                                </ul>
                                
                                <p>Wir empfehlen, keine sensiblen persönlichen Daten wie Sozialversicherungsnummern, Bankdaten oder Gesundheitsinformationen in den hochgeladenen Dokumenten zu belassen.</p>
                                
                                <div class="form-check mb-4">
                                    <input class="form-check-input" type="checkbox" id="privacyConsent" required>
                                    <label class="form-check-label" for="privacyConsent">
                                        Ich habe die <a href="privacy-policy.html" target="_blank">Datenschutzerklärung</a> gelesen und stimme der Verarbeitung meiner Daten gemäß dieser Erklärung zu.
                                    </label>
                                </div>
                                
                                <p class="small text-muted">Sie können Ihre Einwilligung jederzeit widerrufen, indem Sie Ihre Browserdaten löschen oder uns kontaktieren.</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Abbrechen</button>
                                <button type="button" class="btn btn-primary" id="confirmPrivacyConsent" disabled>
                                    <i class="bi bi-check-lg me-2"></i>Einwilligung bestätigen
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Event-Listener für Checkbox
                const checkbox = document.getElementById('privacyConsent');
                const confirmBtn = document.getElementById('confirmPrivacyConsent');
                
                checkbox.addEventListener('change', function() {
                    confirmBtn.disabled = !checkbox.checked;
                });
                
                // Event-Listener für Bestätigungsbutton
                confirmBtn.addEventListener('click', () => {
                    this.giveConsent();
                    const bsModal = bootstrap.Modal.getInstance(modal);
                    bsModal.hide();
                });
            }
            
            // Zeige das Modal an
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        },
        
        giveConsent: function() {
            this.consentGiven = true;
            localStorage.setItem('privacyConsent', 'true');
            console.log('Datenschutzeinwilligung erteilt');
            
            // Zeige Bestätigung
            if (window.showToast) {
                window.showToast('Datenschutzeinwilligung erteilt. Sie können nun Dateien hochladen.', 'success');
            } else if (window.alert) {
                window.alert('Datenschutzeinwilligung erteilt. Sie können nun Dateien hochladen.');
            }
            
            // Löse Event aus - andere Komponenten können darauf reagieren
            document.dispatchEvent(new CustomEvent('privacyConsentGiven'));
        }
    };
    
    // Initialisieren nach dem DOM-Laden
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PrivacyAwareUploadHandler.init());
    } else {
        PrivacyAwareUploadHandler.init();
    }
    
    // Global verfügbar machen
    window.PrivacyAwareUploadHandler = PrivacyAwareUploadHandler;
})(); 