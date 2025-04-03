/**
 * Zentrales Modul, das alle optimierten Dienste integriert
 */

import textEnhancer from './text-enhancer-optimized.js';
import apiKeyManager from './api-key-manager-optimized.js';
import documentAnalyzer from './document-analyzer-optimized.js';
import advancedAIService from './advanced-ai-service.js';
import profileManager from './profile-manager.js';
import documentExtractor from './document-extractor-optimized.js';

/**
 * App-spezifische Einstellungen und Konfigurationen
 */
const appConfig = {
    debug: false,
    enabledFeatures: {
        textEnhancement: true,
        documentAnalysis: true,
        profileManagement: true,
        aiServices: true
    },
    cachingEnabled: true,
    defaultLanguage: 'de',
    supportedLanguages: ['de', 'en', 'fr', 'es'],
    maxUploadSize: 10 * 1024 * 1024, // 10 MB
    supportedFileTypes: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
    ]
};

/**
 * Initialisiert alle Services
 */
function initializeServices() {
    console.log('Initialisiere optimierte Services...');
    
    // Setze gegenseitige Abhängigkeiten zwischen Services
    textEnhancer.aiService = advancedAIService;
    documentAnalyzer.aiService = advancedAIService;
    
    // Synchronisiere Konfigurationen
    if (!appConfig.cachingEnabled) {
        textEnhancer.cacheEnabled = false;
        documentAnalyzer.cacheEnabled = false;
    }
    
    // Aktiviere API-Schlüssel-Manager
    apiKeyManager.initialize();
    
    // Aktiviere Debug-Modus falls konfiguriert
    if (appConfig.debug) {
        window.debugServices = {
            textEnhancer,
            apiKeyManager,
            documentAnalyzer,
            advancedAIService,
            profileManager,
            appConfig
        };
        console.log('Debug-Modus aktiviert, Services über window.debugServices verfügbar');
    }
    
    console.log('Optimierte Services initialisiert');
    
    return {
        textEnhancer,
        apiKeyManager,
        documentAnalyzer,
        documentExtractor,
        aiService: advancedAIService,
        profileManager,
        appConfig
    };
}

// Initialisiere die Services beim Laden der Seite
const optimizedServices = initializeServices();

// Exportiere alle Services
export default optimizedServices; 