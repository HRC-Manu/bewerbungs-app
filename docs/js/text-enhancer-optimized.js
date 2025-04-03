/**
 * Optimierter Text-Verbesserer mit Caching, Branchen-Templates und Kontext-Awareness
 */

import advancedAIService from './advanced-ai-service.js';

class TextEnhancer {
    constructor() {
        this.lastEnhancement = null;
        this.enhancementHistory = [];
        
        // 1. OPTIMIERUNG: Caching-Mechanismus für Textverbesserungen
        this.cache = {
            alternatives: new Map(), // Speichert generierte Alternativen
            improvements: new Map(), // Speichert Textverbesserungen
            analysis: new Map()      // Speichert Textanalysen
        };
        this.cacheEnabled = true;
        this.cacheMaxSize = 50; // Maximale Anzahl an Cache-Einträgen pro Kategorie
        
        // 2. OPTIMIERUNG: Branchen-Templates für spezifische Verbesserungen
        this.industryTemplates = {
            'it': {
                keywords: ['Programmierung', 'Entwicklung', 'Software', 'Technologie', 'Datenbank'],
                phrases: ['Implementierung von', 'Entwicklung von', 'Optimierung der', 'technische Betreuung'],
                context: 'Du bist ein Experte für IT und Softwareentwicklung.'
            },
            'finance': {
                keywords: ['Finanzanalyse', 'Controlling', 'Buchhaltung', 'Finanzen', 'Wirtschaft'],
                phrases: ['Analyse von', 'Optimierung der Prozesse', 'Effizienzsteigerung', 'Kostenreduktion'],
                context: 'Du bist ein Experte für Finanzen, Controlling und Wirtschaft.'
            },
            'marketing': {
                keywords: ['Marketing', 'Vertrieb', 'Kommunikation', 'Social Media', 'Kampagne'],
                phrases: ['Entwicklung von Strategien', 'Umsetzung von Kampagnen', 'Steigerung der Reichweite'],
                context: 'Du bist ein Experte für Marketing, Vertrieb und Kommunikation.'
            },
            'engineering': {
                keywords: ['Konstruktion', 'Entwicklung', 'Fertigung', 'Qualitätssicherung', 'Prozessoptimierung'],
                phrases: ['Technische Planung', 'Konstruktion von', 'Qualitätsprüfung', 'Fertigungsoptimierung'],
                context: 'Du bist ein Experte für Ingenieurwesen und technische Entwicklung.'
            },
            'healthcare': {
                keywords: ['Pflege', 'Medizin', 'Patient', 'Behandlung', 'Therapie'],
                phrases: ['Betreuung von Patienten', 'Durchführung von Behandlungen', 'medizinische Versorgung'],
                context: 'Du bist ein Experte für Gesundheitswesen und medizinische Fachsprache.'
            }
        };
        
        // 3. OPTIMIERUNG: Kontext-Awareness für kohärente Dokumentverbesserungen
        this.documentContext = {
            entireDocument: '',       // Vollständiges Dokument für Kontext
            sectionMap: new Map(),    // Speichert Abschnitte und ihre Positionen
            tone: 'professional',     // Grundton des Dokuments (professional, casual, academic)
            analyzedKeywords: [],     // Wichtige erkannte Keywords im Dokument
            industryDetected: null    // Erkannte Branche basierend auf dem Inhalt
        };
        
        this._loadCacheFromStorage();
    }
    
    /**
     * Generiert alternative Formulierungen für einen Satz mit Caching
     */
    async generateAlternatives(sentence, numAlternatives = 3, options = {}) {
        if (!sentence || sentence.trim().length === 0) {
            return [];
        }
        
        // Cache-Schlüssel generieren
        const cacheKey = `${sentence}_${numAlternatives}_${JSON.stringify(options)}`;
        
        // Cache-Prüfung, wenn aktiviert
        if (this.cacheEnabled && this.cache.alternatives.has(cacheKey)) {
            console.log('Alternativen aus Cache geladen');
            const cachedResult = this.cache.alternatives.get(cacheKey);
            
            // Aktualisiere den Zeitstempel für LRU-Cache-Strategie
            cachedResult.timestamp = Date.now();
            
            return cachedResult.alternatives;
        }
        
        // Branchenspezifischen Kontext hinzufügen, wenn verfügbar
        const industry = options.industry || this.documentContext.industryDetected;
        let industryContext = '';
        
        if (industry && this.industryTemplates[industry]) {
            industryContext = this.industryTemplates[industry].context;
        }
        
        const prompt = `
        Generiere ${numAlternatives} alternative Formulierungen für den folgenden Satz. 
        Die Alternativen sollten den gleichen Inhalt vermitteln, aber unterschiedliche Formulierungen verwenden.
        Variiere Wortschatz, Satzstruktur und Stil. Behalte den Ton (formell/informell) bei.
        
        ${industryContext ? 'Wichtiger Kontext: ' + industryContext : ''}
        
        Satz: "${sentence}"
        
        ${this.documentContext.entireDocument ? 'Dieser Satz stammt aus folgendem Kontext: "' + this._getRelevantContext(sentence) + '"' : ''}
        
        Gib nur die Alternativen zurück, nummeriert von 1 bis ${numAlternatives}, ohne zusätzliche Erklärungen.
        `;
        
        try {
            const result = await advancedAIService.generateText(prompt, {
                temperature: 0.7,
                maxTokens: 1000,
                context: industryContext || 'Du bist ein Sprachexperte, der kreative und überzeugende Umformulierungen erstellt.'
            });
            
            // Extrahiere die nummerierten Alternativen
            const alternatives = [];
            const lines = result.split('\n');
            
            for (const line of lines) {
                // Suche nach nummerierten Zeilen
                const match = line.match(/^\s*(\d+)[.):]\s*(.+)$/i);
                if (match && match[2]) {
                    alternatives.push(match[2].trim());
                }
            }
            
            // Fallback, wenn keine klaren Alternativen gefunden wurden
            const resultAlternatives = alternatives.length > 0 ? 
                alternatives : 
                result.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .slice(0, numAlternatives);
            
            // Speichere die Verbesserung in der Historie
            this.lastEnhancement = {
                type: 'alternatives',
                original: sentence,
                result: resultAlternatives,
                timestamp: new Date()
            };
            this.enhancementHistory.push(this.lastEnhancement);
            
            // Cache-Speicherung, wenn aktiviert
            if (this.cacheEnabled) {
                this._manageCache('alternatives', cacheKey, {
                    alternatives: resultAlternatives,
                    timestamp: Date.now()
                });
            }
            
            return resultAlternatives;
        } catch (error) {
            console.error('Fehler bei der Generierung von Alternativen:', error);
            
            // Fallback für den Fall eines Fehlers
            return this._generateLocalAlternatives(sentence, numAlternatives, industry);
        }
    }
    
    /**
     * Verbessert einen Textabschnitt mit berücksichtigtem Dokumentkontext
     */
    async improveText(text, options = {}) {
        if (!text || text.trim().length === 0) {
            return '';
        }
        
        const defaultOptions = {
            goal: 'clarity',
            context: '',
            region: 'Deutschland',
            preserveKeyInfo: true,
            industry: null
        };
        
        const settings = { ...defaultOptions, ...options };
        
        // Cache-Schlüssel generieren
        const cacheKey = `${text}_${JSON.stringify(settings)}`;
        
        // Cache-Prüfung, wenn aktiviert
        if (this.cacheEnabled && this.cache.improvements.has(cacheKey)) {
            console.log('Textverbesserung aus Cache geladen');
            const cachedResult = this.cache.improvements.get(cacheKey);
            
            // Aktualisiere den Zeitstempel für LRU-Cache-Strategie
            cachedResult.timestamp = Date.now();
            
            return cachedResult.improvedText;
        }
        
        // Dokumentkontext berücksichtigen
        const contextualHints = this._generateContextualHints(text, settings);
        
        // Branchenspezifischen Kontext hinzufügen, wenn verfügbar
        const industry = settings.industry || this.documentContext.industryDetected;
        let industryContext = '';
        
        if (industry && this.industryTemplates[industry]) {
            industryContext = `\nDies ist ein Text für die ${industry}-Branche. 
            Wichtige Branchenbegriffe: ${this.industryTemplates[industry].keywords.join(', ')}.
            Typische Formulierungen: ${this.industryTemplates[industry].phrases.join(', ')}.`;
        }
        
        // Erstelle einen angepassten Prompt basierend auf den Optionen
        let goalDescription;
        switch (settings.goal) {
            case 'persuasiveness':
                goalDescription = "Der Text soll überzeugender wirken, mit starken Argumenten und überzeugendem Ton";
                break;
            case 'conciseness':
                goalDescription = "Der Text soll kürzer und prägnanter werden, ohne wichtige Informationen zu verlieren";
                break;
            case 'formality':
                goalDescription = "Der Text soll formeller und professioneller klingen, geeignet für geschäftliche Kommunikation";
                break;
            default: // clarity
                goalDescription = "Der Text soll klarer und leichter verständlich werden, mit verbesserter Struktur und Lesbarkeit";
                break;
        }
        
        const keyInfoPart = settings.preserveKeyInfo 
            ? "Wichtig: Alle spezifischen Informationen wie Namen, Daten, Fakten und Zahlen müssen erhalten bleiben." 
            : "";
            
        const contextPart = settings.context 
            ? `\nKontext für den Text: ${settings.context}` 
            : "";
            
        const documentContextPart = this.documentContext.entireDocument 
            ? `\nDieser Text ist Teil eines größeren Dokuments mit dem Ton: ${this.documentContext.tone}`
            : "";
            
        const prompt = `
        Verbessere den folgenden Text. ${goalDescription}. ${keyInfoPart}
        Berücksichtige die üblichen Konventionen für Bewerbungstexte in ${settings.region}.${contextPart}${documentContextPart}${industryContext}
        
        ${contextualHints ? '\nWichtige kontextbezogene Hinweise:\n' + contextualHints : ''}
        
        TEXT:
        ${text}
        
        Gib nur den verbesserten Text zurück, ohne zusätzliche Erklärungen.
        `;
        
        try {
            // Wähle den passenden Kontext basierend auf der Branche
            let contextPrompt = 'Du bist ein professioneller Texter und Lektor, der Texte verbessert ohne ihren Kerninhalt zu verändern.';
            if (industry && this.industryTemplates[industry]) {
                contextPrompt = this.industryTemplates[industry].context;
            }
            
            const result = await advancedAIService.generateText(prompt, {
                temperature: 0.4,
                maxTokens: Math.max(text.length * 1.5, 1000),
                context: contextPrompt
            });
            
            // Speichere die Verbesserung in der Historie
            this.lastEnhancement = {
                type: 'improvement',
                original: text,
                result: result,
                settings: settings,
                timestamp: new Date()
            };
            this.enhancementHistory.push(this.lastEnhancement);
            
            // Cache-Speicherung, wenn aktiviert
            if (this.cacheEnabled) {
                this._manageCache('improvements', cacheKey, {
                    improvedText: result,
                    timestamp: Date.now()
                });
            }
            
            return result;
        } catch (error) {
            console.error('Fehler bei der Textverbesserung:', error);
            return text; // Im Fehlerfall den Originaltext zurückgeben
        }
    }
    
    /**
     * Setzt den Kontext für das gesamte Dokument
     * @param {string} documentText - Der vollständige Dokumenttext
     */
    setDocumentContext(documentText) {
        if (!documentText) return;
        
        this.documentContext.entireDocument = documentText;
        
        // Dokument in Abschnitte aufteilen und speichern
        const sections = this._splitIntoSections(documentText);
        this.documentContext.sectionMap.clear();
        
        sections.forEach((section, index) => {
            this.documentContext.sectionMap.set(section, {
                index,
                position: documentText.indexOf(section)
            });
        });
        
        // Automatische Branchenerkennung durchführen
        this._detectIndustry(documentText);
        
        // Ton des Dokuments analysieren
        this._analyzeTone(documentText);
        
        console.log(`Dokumentkontext gesetzt: ${sections.length} Abschnitte, Branche: ${this.documentContext.industryDetected}, Ton: ${this.documentContext.tone}`);
    }
    
    /**
     * Verwaltet den Cache und verhindert übermäßiges Wachstum
     * @private
     */
    _manageCache(cacheType, key, value) {
        const cache = this.cache[cacheType];
        
        // Wenn Cache-Limit erreicht, entferne den ältesten Eintrag (LRU-Strategie)
        if (cache.size >= this.cacheMaxSize) {
            let oldestKey = null;
            let oldestTimestamp = Infinity;
            
            for (const [entryKey, entry] of cache.entries()) {
                if (entry.timestamp < oldestTimestamp) {
                    oldestTimestamp = entry.timestamp;
                    oldestKey = entryKey;
                }
            }
            
            if (oldestKey) {
                cache.delete(oldestKey);
            }
        }
        
        // Neuen Eintrag hinzufügen
        cache.set(key, value);
        
        // Cache in localStorage speichern
        this._saveCacheToStorage();
    }
    
    /**
     * Speichert den Cache im localStorage
     * @private
     */
    _saveCacheToStorage() {
        try {
            // Konvertiere Maps in serialisierbare Objekte
            const serializableCache = {};
            
            for (const cacheType in this.cache) {
                serializableCache[cacheType] = Array.from(this.cache[cacheType].entries());
            }
            
            localStorage.setItem('textEnhancerCache', JSON.stringify(serializableCache));
        } catch (error) {
            console.error('Fehler beim Speichern des Caches:', error);
        }
    }
    
    /**
     * Lädt den Cache aus dem localStorage
     * @private
     */
    _loadCacheFromStorage() {
        try {
            const cachedData = localStorage.getItem('textEnhancerCache');
            
            if (cachedData) {
                const parsedCache = JSON.parse(cachedData);
                
                // Konvertiere zurück in Maps
                for (const cacheType in parsedCache) {
                    this.cache[cacheType] = new Map(parsedCache[cacheType]);
                }
                
                console.log('Cache geladen: ', {
                    alternatives: this.cache.alternatives.size,
                    improvements: this.cache.improvements.size,
                    analysis: this.cache.analysis.size
                });
            }
        } catch (error) {
            console.error('Fehler beim Laden des Caches:', error);
        }
    }
    
    /**
     * Generiert kontextuelle Hinweise für die Textverbesserung
     * @private
     */
    _generateContextualHints(text, settings) {
        if (!this.documentContext.entireDocument) return '';
        
        let hints = [];
        
        // Finde die Position des Textes im Gesamtdokument
        const position = this.documentContext.entireDocument.indexOf(text);
        
        if (position !== -1) {
            // Bestimme, ob der Text am Anfang, in der Mitte oder am Ende steht
            const relativePosition = position / this.documentContext.entireDocument.length;
            
            if (relativePosition < 0.2) {
                hints.push("Dieser Text steht am Anfang des Dokuments und sollte einleitend wirken.");
            } else if (relativePosition > 0.8) {
                hints.push("Dieser Text steht am Ende des Dokuments und sollte zusammenfassend oder abschließend wirken.");
            } else {
                hints.push("Dieser Text steht in der Mitte des Dokuments und sollte sich gut in den Gesamtfluss eingliedern.");
            }
            
            // Umgebenden Kontext ermitteln
            const contextBefore = this._getTextBefore(position, 200);
            const contextAfter = this._getTextAfter(position + text.length, 200);
            
            if (contextBefore) {
                hints.push(`Vorheriger Text: "${contextBefore}"`);
            }
            
            if (contextAfter) {
                hints.push(`Nachfolgender Text: "${contextAfter}"`);
            }
        }
        
        // Hinzufügen von Konsistenz-Hinweisen basierend auf dem Dokumentton
        hints.push(`Das gesamte Dokument verwendet einen ${this.documentContext.tone} Ton, der beibehalten werden sollte.`);
        
        return hints.join('\n');
    }
    
    /**
     * Ermittelt den Text vor einer bestimmten Position
     * @private
     */
    _getTextBefore(position, length = 100) {
        if (position <= 0 || !this.documentContext.entireDocument) return '';
        
        const start = Math.max(0, position - length);
        return this.documentContext.entireDocument.substring(start, position);
    }
    
    /**
     * Ermittelt den Text nach einer bestimmten Position
     * @private
     */
    _getTextAfter(position, length = 100) {
        if (position >= this.documentContext.entireDocument.length || !this.documentContext.entireDocument) return '';
        
        const end = Math.min(this.documentContext.entireDocument.length, position + length);
        return this.documentContext.entireDocument.substring(position, end);
    }
    
    /**
     * Teilt den Text in logische Abschnitte auf
     * @private
     */
    _splitIntoSections(text) {
        // Einfache Aufteilung nach Absätzen
        const paragraphs = text.split(/\n\s*\n/);
        
        // Filtere leere Absätze
        return paragraphs.filter(p => p.trim().length > 0);
    }
    
    /**
     * Erkennt automatisch die Branche basierend auf dem Textinhalt
     * @private
     */
    _detectIndustry(text) {
        // Einfache keyword-basierte Erkennung
        const textLower = text.toLowerCase();
        let highestScore = 0;
        let detectedIndustry = null;
        
        for (const [industry, template] of Object.entries(this.industryTemplates)) {
            let score = 0;
            
            // Prüfe Keywords
            template.keywords.forEach(keyword => {
                const regex = new RegExp('\\b' + keyword.toLowerCase() + '\\b', 'g');
                const matches = textLower.match(regex);
                if (matches) {
                    score += matches.length;
                }
            });
            
            // Prüfe Phrasen
            template.phrases.forEach(phrase => {
                const regex = new RegExp(phrase.toLowerCase(), 'g');
                const matches = textLower.match(regex);
                if (matches) {
                    score += matches.length * 2; // Phrasen sind stärkere Indikatoren
                }
            });
            
            if (score > highestScore) {
                highestScore = score;
                detectedIndustry = industry;
            }
        }
        
        // Setze nur, wenn ein klarer Gewinner vorhanden ist
        if (highestScore > 3) {
            this.documentContext.industryDetected = detectedIndustry;
        } else {
            this.documentContext.industryDetected = null;
        }
    }
    
    /**
     * Analysiert den Ton des Dokuments
     * @private
     */
    _analyzeTone(text) {
        const textLower = text.toLowerCase();
        
        // Einfache Regel-basierte Tonanalyse
        const formalIndicators = [
            'sehr geehrte', 'hochachtungsvoll', 'mit freundlichen grüßen', 
            'bezugnehmend auf', 'ich bewerbe mich hiermit'
        ];
        
        const casualIndicators = [
            'hallo', 'hi', 'hey', 'beste grüße', 'viele grüße', 'cheers',
            'cool', 'super', 'toll'
        ];
        
        const academicIndicators = [
            'studie', 'forschung', 'analyse', 'dissertation', 'these', 
            'wissenschaftlich', 'akademisch', 'methodik'
        ];
        
        let formalScore = 0;
        let casualScore = 0;
        let academicScore = 0;
        
        formalIndicators.forEach(indicator => {
            if (textLower.includes(indicator)) formalScore++;
        });
        
        casualIndicators.forEach(indicator => {
            if (textLower.includes(indicator)) casualScore++;
        });
        
        academicIndicators.forEach(indicator => {
            if (textLower.includes(indicator)) academicScore++;
        });
        
        // Bestimme den Ton basierend auf dem höchsten Score
        if (academicScore > formalScore && academicScore > casualScore) {
            this.documentContext.tone = 'academic';
        } else if (formalScore > casualScore) {
            this.documentContext.tone = 'formal';
        } else if (casualScore > formalScore) {
            this.documentContext.tone = 'casual';
        } else {
            // Standardmäßig professionell für Bewerbungen
            this.documentContext.tone = 'professional';
        }
    }
    
    /**
     * Ermittelt den relevanten Kontext für einen Satz
     * @private
     */
    _getRelevantContext(sentence) {
        if (!this.documentContext.entireDocument) return '';
        
        const position = this.documentContext.entireDocument.indexOf(sentence);
        if (position === -1) return '';
        
        // Finde den Abschnitt, der den Satz enthält
        for (const [section, metadata] of this.documentContext.sectionMap.entries()) {
            if (section.includes(sentence)) {
                return section;
            }
        }
        
        // Fallback: Nehme einfach einen Teil des umgebenden Textes
        return this._getTextBefore(position, 100) + sentence + this._getTextAfter(position + sentence.length, 100);
    }
    
    /**
     * Generiert lokale Alternativen für einen Satz, mit Branchen-Berücksichtigung
     * @private
     */
    _generateLocalAlternatives(sentence, numAlternatives = 3, industry = null) {
        // Basis-Muster für Umformulierungen
        const basePatterns = [
            "In anderen Worten, {}",
            "Anders ausgedrückt: {}",
            "Das bedeutet, {}",
            "Mit anderen Worten: {}",
            "Um es anders zu sagen: {}",
            "Konkret heißt das: {}"
        ];
        
        // Branchenspezifische Muster, falls verfügbar
        let patterns = [...basePatterns];
        
        if (industry && this.industryTemplates[industry]) {
            const template = this.industryTemplates[industry];
            
            // Füge branchenspezifische Formulierungen hinzu
            template.phrases.forEach(phrase => {
                if (phrase.includes('{}')) {
                    patterns.push(phrase);
                } else {
                    patterns.push(phrase + " {}");
                }
            });
        }
        
        // Generiere die Alternativen
        const alternatives = [];
        for (let i = 0; i < numAlternatives; i++) {
            const pattern = patterns[i % patterns.length];
            alternatives.push(pattern.replace('{}', sentence));
        }
        
        return alternatives;
    }
}

// Globale Instanz erstellen
const textEnhancer = new TextEnhancer();
export default textEnhancer; 