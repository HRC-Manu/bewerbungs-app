/**
 * Optimierter API-Schlüssel-Manager mit Verschlüsselung, Quota-Management und Multi-API-Unterstützung
 */

class ApiKeyManager {
    constructor() {
        // Basis-Konfiguration
        this.initialized = false;
        
        // 1. OPTIMIERUNG: Support für zusätzliche KI-Anbieter
        this.providers = {
            openai: {
                name: 'OpenAI',
                keyPrefix: 'sk-',
                minKeyLength: 20,
                quotaInfo: { used: 0, limit: null, lastUpdated: null },
                endpointUrl: 'https://api.openai.com/v1/chat/completions',
                keyValidationEndpoint: 'https://api.openai.com/v1/models',
                description: 'OpenAI API für ChatGPT und GPT-4'
            },
            gemini: {
                name: 'Google Gemini',
                keyPrefix: 'AI',
                minKeyLength: 10,
                quotaInfo: { used: 0, limit: null, lastUpdated: null },
                endpointUrl: 'https://generativelanguage.googleapis.com/v1/models',
                keyValidationEndpoint: null,
                description: 'Google Gemini (ehemals PaLM)'
            },
            claude: {
                name: 'Anthropic Claude',
                keyPrefix: 'sk-ant-',
                minKeyLength: 16,
                quotaInfo: { used: 0, limit: null, lastUpdated: null },
                endpointUrl: 'https://api.anthropic.com/v1/messages',
                keyValidationEndpoint: 'https://api.anthropic.com/v1/models',
                description: 'Anthropic Claude API'
            },
            cohere: {
                name: 'Cohere',
                keyPrefix: '',
                minKeyLength: 10,
                quotaInfo: { used: 0, limit: null, lastUpdated: null },
                endpointUrl: 'https://api.cohere.ai/v1/generate',
                keyValidationEndpoint: 'https://api.cohere.ai/v1/models',
                description: 'Cohere Command und Generate'
            }
        };
        
        // 2. OPTIMIERUNG: Basisdaten für Quota-Management
        this.quotaTracking = {
            enabled: true,
            alertThreshold: 0.8, // Warnung bei 80% der Nutzung
            trackingMethod: 'local', // 'local' oder 'server'
            resetPeriod: 'monthly', // 'daily', 'monthly'
            lastAlertShown: null
        };
        
        // 3. OPTIMIERUNG: Verschlüsselungsoption vorbereiten
        this.encryption = {
            enabled: true,
            method: 'AES',
            salt: this._generateSalt(),
            iv: this._generateIV()
        };
        
        // Lade gespeicherte Schlüssel
        this.keys = this._loadKeys();
        this.activeProvider = localStorage.getItem('preferred_ai_provider') || 'openai';
    }
    
    /**
     * Initialisiert den API-Schlüssel-Manager und die UI-Elemente
     */
    initialize() {
        if (this.initialized) return;
        
        // Standard-UI-Elemente finden
        this._findUIElements();
        
        // Erweiterte Provider-Unterstützung in UI integrieren
        this._setupProviderUI();
        
        // Event-Listener einrichten
        this._setupEventListeners();
        
        // Quota-Info laden und anzeigen
        if (this.quotaTracking.enabled) {
            this._loadQuotaInfo();
            this._displayQuotaInfo();
        }
        
        this.initialized = true;
        
        // Zeige Toast, wenn KI aktiviert ist aber Schlüssel fehlen
        if (this.isAiEnabled() && !this.hasAnyApiKey()) {
            this.showToastIfMissingKeys();
        }
    }
    
    /**
     * Findet die UI-Elemente im DOM
     * @private
     */
    _findUIElements() {
        // Basis-UI-Elemente
        this.openaiKeyInput = document.getElementById('openaiApiKey');
        this.geminiKeyInput = document.getElementById('geminiApiKey');
        this.toggleOpenAIKeyBtn = document.getElementById('toggleOpenAIKey');
        this.toggleGeminiKeyBtn = document.getElementById('toggleGeminiKey');
        this.saveApiKeysBtn = document.getElementById('saveApiKeysBtn');
        this.aiToggle = document.getElementById('aiToggle');
        
        // Container für erweiterte Provider
        this.providerContainer = document.getElementById('apiProviderContainer');
        
        // Quota-Anzeige-Elemente
        this.quotaDisplayElement = document.getElementById('apiQuotaDisplay');
    }
    
    /**
     * Erstellt die UI für die erweiterten Provider
     * @private
     */
    _setupProviderUI() {
        // Wenn kein Container verfügbar ist, erstelle einen
        if (!this.providerContainer && this.saveApiKeysBtn) {
            // Erstelle Container nach dem Speichern-Button
            this.providerContainer = document.createElement('div');
            this.providerContainer.id = 'apiProviderContainer';
            this.providerContainer.className = 'mt-4 pt-3 border-top';
            
            const heading = document.createElement('h5');
            heading.className = 'mb-3';
            heading.textContent = 'Erweiterte API-Anbieter';
            this.providerContainer.appendChild(heading);
            
            const description = document.createElement('p');
            description.className = 'text-muted small mb-3';
            description.textContent = 'Sie können auch API-Schlüssel für zusätzliche KI-Anbieter einrichten:';
            this.providerContainer.appendChild(description);
            
            // Container für zusätzliche Anbieter
            const additionalProvidersRow = document.createElement('div');
            additionalProvidersRow.className = 'row g-3';
            this.providerContainer.appendChild(additionalProvidersRow);
            
            // Füge für jeden zusätzlichen Anbieter ein Eingabefeld hinzu
            for (const [provider, config] of Object.entries(this.providers)) {
                // Überspringe die Standard-Anbieter, die bereits separate Eingabefelder haben
                if (provider === 'openai' || provider === 'gemini') continue;
                
                const col = document.createElement('div');
                col.className = 'col-md-6';
                
                const label = document.createElement('label');
                label.className = 'form-label';
                label.htmlFor = `${provider}ApiKey`;
                label.textContent = `${config.name} API-Schlüssel`;
                
                const inputGroup = document.createElement('div');
                inputGroup.className = 'input-group';
                
                const input = document.createElement('input');
                input.type = 'password';
                input.className = 'form-control';
                input.id = `${provider}ApiKey`;
                input.placeholder = config.keyPrefix ? config.keyPrefix + '...' : 'API-Schlüssel';
                input.value = this.keys[provider] || '';
                input.addEventListener('input', () => this.validateKeyFormat(input, provider));
                
                const toggleButton = document.createElement('button');
                toggleButton.className = 'btn btn-outline-secondary';
                toggleButton.type = 'button';
                toggleButton.id = `toggle${provider.charAt(0).toUpperCase() + provider.slice(1)}Key`;
                toggleButton.innerHTML = '<i class="bi bi-eye"></i>';
                toggleButton.addEventListener('click', () => this.togglePasswordVisibility(input, toggleButton));
                
                inputGroup.appendChild(input);
                inputGroup.appendChild(toggleButton);
                
                const helpText = document.createElement('div');
                helpText.className = 'form-text small mt-1';
                helpText.textContent = config.description;
                
                col.appendChild(label);
                col.appendChild(inputGroup);
                col.appendChild(helpText);
                
                additionalProvidersRow.appendChild(col);
            }
            
            // Quota-Anzeige erstellen
            if (this.quotaTracking.enabled) {
                const quotaSection = document.createElement('div');
                quotaSection.className = 'mt-4 pt-2 border-top';
                
                const quotaHeading = document.createElement('h6');
                quotaHeading.className = 'mb-2';
                quotaHeading.textContent = 'API-Nutzung';
                
                this.quotaDisplayElement = document.createElement('div');
                this.quotaDisplayElement.id = 'apiQuotaDisplay';
                this.quotaDisplayElement.className = 'api-quota-display';
                
                quotaSection.appendChild(quotaHeading);
                quotaSection.appendChild(this.quotaDisplayElement);
                
                this.providerContainer.appendChild(quotaSection);
            }
            
            // Füge den Container nach dem Speichern-Button ein
            if (this.saveApiKeysBtn && this.saveApiKeysBtn.parentNode) {
                this.saveApiKeysBtn.parentNode.insertBefore(
                    this.providerContainer, 
                    this.saveApiKeysBtn.nextSibling
                );
            }
        }
    }
    
    /**
     * Richtet Event-Listener für die UI-Elemente ein
     * @private
     */
    _setupEventListeners() {
        // Setze Anfangswerte, wenn die Elemente existieren
        if (this.openaiKeyInput) {
            this.openaiKeyInput.value = this.getDecryptedKey('openai');
            this.openaiKeyInput.addEventListener('input', () => this.validateKeyFormat(this.openaiKeyInput, 'openai'));
        }
        
        if (this.geminiKeyInput) {
            this.geminiKeyInput.value = this.getDecryptedKey('gemini');
            this.geminiKeyInput.addEventListener('input', () => this.validateKeyFormat(this.geminiKeyInput, 'gemini'));
        }
        
        // Passwortanzeige ein-/ausschalten
        if (this.toggleOpenAIKeyBtn) {
            this.toggleOpenAIKeyBtn.addEventListener('click', () => this.togglePasswordVisibility(this.openaiKeyInput, this.toggleOpenAIKeyBtn));
        }
        
        if (this.toggleGeminiKeyBtn) {
            this.toggleGeminiKeyBtn.addEventListener('click', () => this.togglePasswordVisibility(this.geminiKeyInput, this.toggleGeminiKeyBtn));
        }
        
        // Schlüssel speichern
        if (this.saveApiKeysBtn) {
            this.saveApiKeysBtn.addEventListener('click', () => this.saveApiKeys());
        }
        
        // KI-Toggle
        if (this.aiToggle) {
            const aiEnabled = localStorage.getItem('ai_enabled') !== 'false';
            this.aiToggle.checked = aiEnabled;
            this.aiToggle.addEventListener('change', () => {
                localStorage.setItem('ai_enabled', this.aiToggle.checked);
                
                // API-Schlüssel-Sektion und Provider-Container ein-/ausblenden
                const apiKeySection = document.getElementById('apiKeySection');
                if (apiKeySection) {
                    apiKeySection.style.display = this.aiToggle.checked ? 'block' : 'none';
                }
                
                if (this.providerContainer) {
                    this.providerContainer.style.display = this.aiToggle.checked ? 'block' : 'none';
                }
                
                if (this.aiToggle.checked) {
                    this.showToastIfMissingKeys();
                }
            });
            
            // Anfangszustand setzen
            const apiKeySection = document.getElementById('apiKeySection');
            if (apiKeySection) {
                apiKeySection.style.display = this.aiToggle.checked ? 'block' : 'none';
            }
            
            if (this.providerContainer) {
                this.providerContainer.style.display = this.aiToggle.checked ? 'block' : 'none';
            }
        }
    }
    
    /**
     * Validiert das Format eines API-Schlüssels
     */
    validateKeyFormat(inputElement, provider) {
        if (!inputElement || !this.providers[provider]) return;
        
        const value = inputElement.value.trim();
        let isValid = true;
        
        const config = this.providers[provider];
        
        // Grundlegende Formatvalidierung
        if (value && config.keyPrefix && !value.startsWith(config.keyPrefix)) {
            isValid = false;
        } else if (value && value.length < config.minKeyLength) {
            isValid = false;
        }
        
        // Visuelles Feedback
        if (value && !isValid) {
            inputElement.classList.add('is-invalid');
            inputElement.classList.remove('is-valid');
        } else if (value) {
            inputElement.classList.remove('is-invalid');
            inputElement.classList.add('is-valid');
        } else {
            inputElement.classList.remove('is-invalid');
            inputElement.classList.remove('is-valid');
        }
    }
    
    /**
     * Schaltet die Sichtbarkeit des Passworts um
     */
    togglePasswordVisibility(inputElement, buttonElement) {
        if (!inputElement || !buttonElement) return;
        
        if (inputElement.type === 'password') {
            inputElement.type = 'text';
            buttonElement.innerHTML = '<i class="bi bi-eye-slash"></i>';
        } else {
            inputElement.type = 'password';
            buttonElement.innerHTML = '<i class="bi bi-eye"></i>';
        }
    }
    
    /**
     * Speichert die API-Schlüssel im localStorage mit optionaler Verschlüsselung
     */
    saveApiKeys() {
        // Sammle alle Schlüssel aus den Eingabefeldern
        const newKeys = {};
        
        // Standard-Anbieter
        if (this.openaiKeyInput) {
            newKeys.openai = this.openaiKeyInput.value.trim();
        }
        
        if (this.geminiKeyInput) {
            newKeys.gemini = this.geminiKeyInput.value.trim();
        }
        
        // Zusätzliche Anbieter
        for (const provider of Object.keys(this.providers)) {
            if (provider !== 'openai' && provider !== 'gemini') {
                const input = document.getElementById(`${provider}ApiKey`);
                if (input) {
                    newKeys[provider] = input.value.trim();
                }
            }
        }
        
        // Speichere die Schlüssel (verschlüsselt, wenn aktiviert)
        for (const [provider, key] of Object.entries(newKeys)) {
            if (key || this.keys[provider]) {
                this.keys[provider] = key;
                
                if (this.encryption.enabled && key) {
                    const encryptedKey = this._encryptKey(key);
                    localStorage.setItem(`${provider}_api_key`, encryptedKey);
                } else {
                    localStorage.setItem(`${provider}_api_key`, key);
                }
            }
        }
        
        // Setze den bevorzugten Anbieter basierend auf den verfügbaren Schlüsseln
        this._updatePreferredProvider();
        
        // Quota-Info zurücksetzen, wenn sich die Schlüssel geändert haben
        if (this.quotaTracking.enabled) {
            this._resetQuotaInfo();
            this._displayQuotaInfo();
        }
        
        // Zeige Erfolgsbenachrichtigung
        if (window.showToast) {
            window.showToast('API-Schlüssel erfolgreich gespeichert', 'success');
        }
    }
    
    /**
     * Aktualisiert den bevorzugten Anbieter basierend auf den verfügbaren Schlüsseln
     * @private
     */
    _updatePreferredProvider() {
        let preferredProvider = this.activeProvider;
        
        // Wenn der aktuelle Anbieter keinen Schlüssel hat, wähle einen anderen
        if (!this.keys[preferredProvider]) {
            for (const provider of Object.keys(this.providers)) {
                if (this.keys[provider]) {
                    preferredProvider = provider;
                    break;
                }
            }
        }
        
        localStorage.setItem('preferred_ai_provider', preferredProvider);
        this.activeProvider = preferredProvider;
    }
    
    /**
     * Lädt die API-Schlüssel aus dem localStorage
     * @private
     */
    _loadKeys() {
        const keys = {};
        
        for (const provider of Object.keys(this.providers)) {
            const storedKey = localStorage.getItem(`${provider}_api_key`);
            
            if (storedKey) {
                if (this.encryption.enabled && this._isEncrypted(storedKey)) {
                    // Der Schlüssel ist verschlüsselt, speichere ihn so
                    keys[provider] = storedKey;
                } else {
                    // Der Schlüssel ist nicht verschlüsselt
                    keys[provider] = storedKey;
                }
            } else {
                keys[provider] = '';
            }
        }
        
        return keys;
    }
    
    /**
     * Gibt den entschlüsselten API-Schlüssel für einen bestimmten Anbieter zurück
     */
    getDecryptedKey(provider) {
        if (!provider) {
            provider = this.activeProvider;
        }
        
        const storedKey = this.keys[provider] || '';
        
        if (this.encryption.enabled && this._isEncrypted(storedKey)) {
            return this._decryptKey(storedKey);
        }
        
        return storedKey;
    }
    
    /**
     * Lädt Quota-Informationen aus dem localStorage
     * @private
     */
    _loadQuotaInfo() {
        for (const provider in this.providers) {
            const quotaInfo = localStorage.getItem(`${provider}_quota_info`);
            
            if (quotaInfo) {
                try {
                    this.providers[provider].quotaInfo = JSON.parse(quotaInfo);
                } catch (e) {
                    console.error(`Fehler beim Parsen der Quota-Info für ${provider}:`, e);
                }
            }
            
            // Prüfe, ob ein Reset nötig ist
            if (this._isQuotaResetNeeded(this.providers[provider].quotaInfo)) {
                this.providers[provider].quotaInfo = { 
                    used: 0, 
                    limit: this.providers[provider].quotaInfo.limit,
                    lastUpdated: new Date().toISOString() 
                };
                
                this._saveQuotaInfo(provider);
            }
        }
    }
    
    /**
     * Speichert Quota-Informationen im localStorage
     * @private
     */
    _saveQuotaInfo(provider) {
        if (!provider || !this.providers[provider]) return;
        
        localStorage.setItem(
            `${provider}_quota_info`, 
            JSON.stringify(this.providers[provider].quotaInfo)
        );
    }
    
    /**
     * Zeigt Quota-Informationen in der UI an
     * @private
     */
    _displayQuotaInfo() {
        if (!this.quotaDisplayElement) return;
        
        // Leere den Container
        this.quotaDisplayElement.innerHTML = '';
        
        // Erstelle für jeden Anbieter mit Quota-Info ein Display
        for (const [provider, config] of Object.entries(this.providers)) {
            if (!this.keys[provider] || !config.quotaInfo) continue;
            
            const quotaInfo = config.quotaInfo;
            
            if (quotaInfo.limit) {
                const usagePercent = Math.min(100, Math.round((quotaInfo.used / quotaInfo.limit) * 100));
                
                // Container für diesen Anbieter
                const providerQuotaDiv = document.createElement('div');
                providerQuotaDiv.className = 'provider-quota mb-2';
                
                // Anbieter-Label mit Nutzung
                const label = document.createElement('div');
                label.className = 'd-flex justify-content-between align-items-center mb-1';
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = config.name;
                
                const usageSpan = document.createElement('span');
                usageSpan.className = 'small';
                usageSpan.textContent = `${quotaInfo.used} / ${quotaInfo.limit} (${usagePercent}%)`;
                
                label.appendChild(nameSpan);
                label.appendChild(usageSpan);
                
                // Fortschrittsbalken
                const progressDiv = document.createElement('div');
                progressDiv.className = 'progress';
                progressDiv.style.height = '8px';
                
                const progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';
                
                // Farbe je nach Nutzung
                if (usagePercent >= 90) {
                    progressBar.classList.add('bg-danger');
                } else if (usagePercent >= 75) {
                    progressBar.classList.add('bg-warning');
                } else {
                    progressBar.classList.add('bg-success');
                }
                
                progressBar.style.width = `${usagePercent}%`;
                progressBar.setAttribute('aria-valuenow', usagePercent);
                progressBar.setAttribute('aria-valuemin', '0');
                progressBar.setAttribute('aria-valuemax', '100');
                
                progressDiv.appendChild(progressBar);
                
                // Alles zusammenfügen
                providerQuotaDiv.appendChild(label);
                providerQuotaDiv.appendChild(progressDiv);
                
                // Zum Hauptcontainer hinzufügen
                this.quotaDisplayElement.appendChild(providerQuotaDiv);
            }
        }
        
        // Wenn keine Quota-Informationen vorhanden sind
        if (this.quotaDisplayElement.children.length === 0) {
            const noInfoDiv = document.createElement('div');
            noInfoDiv.className = 'text-muted small';
            noInfoDiv.textContent = 'Keine Quota-Informationen verfügbar';
            this.quotaDisplayElement.appendChild(noInfoDiv);
            
            // Info-Link
            const infoLink = document.createElement('a');
            infoLink.href = '#';
            infoLink.className = 'small d-block mt-1';
            infoLink.textContent = 'Wie funktioniert Quota-Tracking?';
            infoLink.addEventListener('click', (e) => {
                e.preventDefault();
                this._showQuotaInfoModal();
            });
            
            this.quotaDisplayElement.appendChild(infoLink);
        }
    }
    
    /**
     * Prüft, ob ein Quota-Reset nötig ist
     * @private
     */
    _isQuotaResetNeeded(quotaInfo) {
        if (!quotaInfo || !quotaInfo.lastUpdated) return true;
        
        const lastUpdated = new Date(quotaInfo.lastUpdated);
        const now = new Date();
        
        if (this.quotaTracking.resetPeriod === 'daily') {
            // Täglicher Reset - prüfe, ob es ein neuer Tag ist
            return lastUpdated.getDate() !== now.getDate() || 
                   lastUpdated.getMonth() !== now.getMonth() ||
                   lastUpdated.getFullYear() !== now.getFullYear();
        } else {
            // Monatlicher Reset - prüfe, ob es ein neuer Monat ist
            return lastUpdated.getMonth() !== now.getMonth() ||
                   lastUpdated.getFullYear() !== now.getFullYear();
        }
    }
    
    /**
     * Setzt die Quota-Informationen zurück
     * @private
     */
    _resetQuotaInfo() {
        for (const provider in this.providers) {
            const currentLimit = this.providers[provider].quotaInfo.limit;
            
            this.providers[provider].quotaInfo = {
                used: 0,
                limit: currentLimit,
                lastUpdated: new Date().toISOString()
            };
            
            this._saveQuotaInfo(provider);
        }
    }
    
    /**
     * Aktualisiert die Quota-Nutzung für einen Anbieter
     * @param {string} provider - Der Anbieter
     * @param {number} tokensUsed - Die Anzahl der verwendeten Tokens
     */
    updateQuotaUsage(provider, tokensUsed) {
        if (!provider || !this.providers[provider] || !this.quotaTracking.enabled) return;
        
        // Quota-Info abrufen
        let quotaInfo = this.providers[provider].quotaInfo;
        
        // Aktualisieren
        quotaInfo.used += tokensUsed;
        quotaInfo.lastUpdated = new Date().toISOString();
        
        // Speichern
        this._saveQuotaInfo(provider);
        
        // UI aktualisieren
        this._displayQuotaInfo();
        
        // Prüfen, ob ein Alarm notwendig ist
        this._checkQuotaAlert(provider);
    }
    
    /**
     * Prüft, ob eine Quota-Warnung angezeigt werden soll
     * @private
     */
    _checkQuotaAlert(provider) {
        if (!provider || !this.providers[provider]) return;
        
        const quotaInfo = this.providers[provider].quotaInfo;
        
        if (!quotaInfo.limit) return;
        
        const usagePercent = (quotaInfo.used / quotaInfo.limit);
        
        // Wenn die Nutzung über dem Schwellenwert liegt und noch keine Warnung angezeigt wurde
        if (usagePercent >= this.quotaTracking.alertThreshold && 
            (!this.quotaTracking.lastAlertShown || 
             (new Date() - new Date(this.quotaTracking.lastAlertShown)) > 24 * 60 * 60 * 1000)) {
            
            this.quotaTracking.lastAlertShown = new Date().toISOString();
            localStorage.setItem('quota_last_alert', this.quotaTracking.lastAlertShown);
            
            if (window.showToast) {
                window.showToast(
                    `Hinweis: Die API-Nutzung für ${this.providers[provider].name} hat ${Math.round(usagePercent * 100)}% des Limits erreicht.`,
                    'warning'
                );
            }
        }
    }
    
    /**
     * Generiert ein zufälliges Salt für die Verschlüsselung
     * @private
     */
    _generateSalt() {
        const storedSalt = localStorage.getItem('api_key_encryption_salt');
        if (storedSalt) return storedSalt;
        
        // Erzeuge ein zufälliges Salt
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        const salt = Array.from(array, byte => ('0' + byte.toString(16)).slice(-2)).join('');
        
        localStorage.setItem('api_key_encryption_salt', salt);
        return salt;
    }
    
    /**
     * Generiert einen zufälligen Initialisierungsvektor für die Verschlüsselung
     * @private
     */
    _generateIV() {
        const storedIV = localStorage.getItem('api_key_encryption_iv');
        if (storedIV) return storedIV;
        
        // Erzeuge einen zufälligen IV
        const array = new Uint8Array(12);
        window.crypto.getRandomValues(array);
        const iv = Array.from(array, byte => ('0' + byte.toString(16)).slice(-2)).join('');
        
        localStorage.setItem('api_key_encryption_iv', iv);
        return iv;
    }
    
    /**
     * Verschlüsselt einen API-Schlüssel
     * @private
     */
    _encryptKey(key) {
        if (!key) return '';
        
        try {
            // Einfache XOR-Verschlüsselung mit Salt (für Client-Side-Schutz)
            // In der Praxis würde man Web Crypto API oder eine dedizierte Bibliothek verwenden
            const encryptedChars = [];
            const saltChars = this.encryption.salt.split('');
            
            for (let i = 0; i < key.length; i++) {
                const keyChar = key.charCodeAt(i);
                const saltChar = saltChars[i % saltChars.length].charCodeAt(0);
                encryptedChars.push(String.fromCharCode(keyChar ^ saltChar));
            }
            
            // Base64-Kodierung für bessere Speicherung
            return btoa(encryptedChars.join('')) + '_encrypted';
        } catch (e) {
            console.error('Fehler bei der Verschlüsselung:', e);
            return key;
        }
    }
    
    /**
     * Entschlüsselt einen API-Schlüssel
     * @private
     */
    _decryptKey(encryptedKey) {
        if (!encryptedKey || !this._isEncrypted(encryptedKey)) return encryptedKey;
        
        try {
            // Entferne den Marker und dekodiere Base64
            const ciphertext = atob(encryptedKey.replace('_encrypted', ''));
            const saltChars = this.encryption.salt.split('');
            const decryptedChars = [];
            
            for (let i = 0; i < ciphertext.length; i++) {
                const encryptedChar = ciphertext.charCodeAt(i);
                const saltChar = saltChars[i % saltChars.length].charCodeAt(0);
                decryptedChars.push(String.fromCharCode(encryptedChar ^ saltChar));
            }
            
            return decryptedChars.join('');
        } catch (e) {
            console.error('Fehler bei der Entschlüsselung:', e);
            return encryptedKey;
        }
    }
    
    /**
     * Prüft, ob ein Schlüssel verschlüsselt ist
     * @private
     */
    _isEncrypted(key) {
        return key && key.endsWith('_encrypted');
    }
    
    /**
     * Prüft, ob die KI-Funktionalität aktiviert ist
     */
    isAiEnabled() {
        return localStorage.getItem('ai_enabled') !== 'false';
    }
    
    /**
     * Prüft, ob mindestens ein API-Schlüssel gesetzt ist
     */
    hasAnyApiKey() {
        for (const provider in this.providers) {
            if (this.keys[provider]) return true;
        }
        return false;
    }
    
    /**
     * Zeigt einen Toast, wenn KI aktiviert ist aber Schlüssel fehlen
     */
    showToastIfMissingKeys() {
        if (this.isAiEnabled() && !this.hasAnyApiKey() && window.showToast) {
            window.showToast('Bitte geben Sie mindestens einen API-Schlüssel ein, um die KI-Funktionen zu nutzen', 'warning');
        }
    }
    
    /**
     * Gibt den API-Schlüssel für einen bestimmten Anbieter zurück
     * @param {string} provider - Der Anbieter (openai, gemini, etc.)
     */
    getApiKey(provider = null) {
        if (!provider) {
            provider = this.activeProvider;
        }
        
        return this.getDecryptedKey(provider);
    }
}

// Globale Instanz erstellen
const apiKeyManager = new ApiKeyManager();

// Initialisiere nach dem DOM-Laden
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => apiKeyManager.initialize());
} else {
    apiKeyManager.initialize();
}

export default apiKeyManager; 