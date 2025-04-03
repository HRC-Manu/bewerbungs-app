/**
 * API-Schlüssel-Manager
 * Verwaltet die sicheren API-Schlüssel für die KI-Dienste
 */

class ApiKeyManager {
    constructor() {
        this.keys = {
            openai: localStorage.getItem('openai_api_key') || '',
            gemini: localStorage.getItem('gemini_api_key') || ''
        };
        
        this.activeProvider = localStorage.getItem('preferred_ai_provider') || 'openai';
        this.initialized = false;
    }
    
    /**
     * Initialisiert den API-Schlüssel-Manager und die UI-Elemente
     */
    initialize() {
        if (this.initialized) return;
        
        // Finde UI-Elemente
        this.openaiKeyInput = document.getElementById('openaiApiKey');
        this.geminiKeyInput = document.getElementById('geminiApiKey');
        this.toggleOpenAIKeyBtn = document.getElementById('toggleOpenAIKey');
        this.toggleGeminiKeyBtn = document.getElementById('toggleGeminiKey');
        this.saveApiKeysBtn = document.getElementById('saveApiKeysBtn');
        this.aiToggle = document.getElementById('aiToggle');
        
        // Setze Anfangswerte, wenn die Elemente existieren
        if (this.openaiKeyInput) {
            this.openaiKeyInput.value = this.keys.openai || '';
            this.openaiKeyInput.addEventListener('input', () => this.validateKeyFormat(this.openaiKeyInput, 'openai'));
        }
        
        if (this.geminiKeyInput) {
            this.geminiKeyInput.value = this.keys.gemini || '';
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
                
                // API-Schlüssel-Sektion ein-/ausblenden
                const apiKeySection = document.getElementById('apiKeySection');
                if (apiKeySection) {
                    apiKeySection.style.display = this.aiToggle.checked ? 'block' : 'none';
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
        }
        
        this.initialized = true;
        
        // Zeige Toast, wenn KI aktiviert ist aber Schlüssel fehlen
        if (this.isAiEnabled() && !this.hasAnyApiKey()) {
            this.showToastIfMissingKeys();
        }
    }
    
    /**
     * Validiert das Format eines API-Schlüssels
     * @private
     */
    validateKeyFormat(inputElement, provider) {
        if (!inputElement) return;
        
        const value = inputElement.value.trim();
        let isValid = true;
        
        // Grundlegende Formatvalidierung
        if (provider === 'openai' && value && !value.startsWith('sk-')) {
            isValid = false;
        } else if (provider === 'gemini' && value && value.length < 10) {
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
     * @private
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
     * Speichert die API-Schlüssel im localStorage
     */
    saveApiKeys() {
        if (!this.openaiKeyInput || !this.geminiKeyInput) return;
        
        const openaiKey = this.openaiKeyInput.value.trim();
        const geminiKey = this.geminiKeyInput.value.trim();
        
        // Speichere die Schlüssel
        if (openaiKey || this.keys.openai) {
            localStorage.setItem('openai_api_key', openaiKey);
            this.keys.openai = openaiKey;
        }
        
        if (geminiKey || this.keys.gemini) {
            localStorage.setItem('gemini_api_key', geminiKey);
            this.keys.gemini = geminiKey;
        }
        
        // Setze den bevorzugten Anbieter basierend auf den verfügbaren Schlüsseln
        if (openaiKey && !geminiKey) {
            localStorage.setItem('preferred_ai_provider', 'openai');
            this.activeProvider = 'openai';
        } else if (!openaiKey && geminiKey) {
            localStorage.setItem('preferred_ai_provider', 'gemini');
            this.activeProvider = 'gemini';
        }
        
        // Zeige Erfolgsbenachrichtigung
        if (window.showToast) {
            window.showToast('API-Schlüssel erfolgreich gespeichert', 'success');
        }
    }
    
    /**
     * Prüft, ob die KI-Funktionalität aktiviert ist
     * @returns {boolean} Ob die KI-Funktionalität aktiviert ist
     */
    isAiEnabled() {
        return localStorage.getItem('ai_enabled') !== 'false';
    }
    
    /**
     * Prüft, ob mindestens ein API-Schlüssel gesetzt ist
     * @returns {boolean} Ob mindestens ein API-Schlüssel gesetzt ist
     */
    hasAnyApiKey() {
        return Boolean(this.keys.openai || this.keys.gemini);
    }
    
    /**
     * Zeigt einen Toast, wenn KI aktiviert ist aber Schlüssel fehlen
     * @private
     */
    showToastIfMissingKeys() {
        if (this.isAiEnabled() && !this.hasAnyApiKey() && window.showToast) {
            window.showToast('Bitte geben Sie mindestens einen API-Schlüssel ein, um die KI-Funktionen zu nutzen', 'warning');
        }
    }
    
    /**
     * Gibt den API-Schlüssel für einen bestimmten Anbieter zurück
     * @param {string} provider - Der Anbieter (openai oder gemini)
     * @returns {string} Der API-Schlüssel
     */
    getApiKey(provider = null) {
        if (!provider) {
            provider = this.activeProvider;
        }
        
        return this.keys[provider] || '';
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