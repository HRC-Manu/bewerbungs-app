/**
 * Text-Verbesserer
 * Basierend auf den Funktionen generate_alternative_sentences und regenerate_section aus Core_Code.md
 */

import advancedAIService from './advanced-ai-service.js';

class TextEnhancer {
    constructor() {
        this.lastEnhancement = null;
        this.enhancementHistory = [];
    }
    
    /**
     * Generiert alternative Formulierungen für einen Satz
     * @param {string} sentence - Der umzuformulierende Satz
     * @param {number} numAlternatives - Die Anzahl der zu generierenden Alternativen
     * @returns {Promise<string[]>} Die alternativen Formulierungen
     */
    async generateAlternatives(sentence, numAlternatives = 3) {
        if (!sentence || sentence.trim().length === 0) {
            return [];
        }
        
        const prompt = `
        Generiere ${numAlternatives} alternative Formulierungen für den folgenden Satz. 
        Die Alternativen sollten den gleichen Inhalt vermitteln, aber unterschiedliche Formulierungen verwenden.
        Variiere Wortschatz, Satzstruktur und Stil. Behalte den Ton (formell/informell) bei.
        
        Satz: "${sentence}"
        
        Gib nur die Alternativen zurück, nummeriert von 1 bis ${numAlternatives}, ohne zusätzliche Erklärungen.
        `;
        
        try {
            const result = await advancedAIService.generateText(prompt, {
                temperature: 0.7,
                maxTokens: 1000,
                context: 'Du bist ein Sprachexperte, der kreative und überzeugende Umformulierungen erstellt.'
            });
            
            // Extrahiere die nummerierten Alternativen
            const alternatives = [];
            const lines = result.split('\n');
            
            for (const line of lines) {
                // Suche nach nummerierten Zeilen (1. Alternative, 2. Alternative, usw.)
                const match = line.match(/^\s*(\d+)[.):]\s*(.+)$/i);
                if (match && match[2]) {
                    alternatives.push(match[2].trim());
                }
            }
            
            // Wenn keine klaren Alternativen gefunden wurden, versuche es mit dem gesamten Text
            if (alternatives.length === 0) {
                // Teile den Text nach Zeilenumbrüchen und entferne leere Zeilen
                return result.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .slice(0, numAlternatives);
            }
            
            // Speichere die Verbesserung in der Historie
            this.lastEnhancement = {
                type: 'alternatives',
                original: sentence,
                result: alternatives,
                timestamp: new Date()
            };
            this.enhancementHistory.push(this.lastEnhancement);
            
            return alternatives;
        } catch (error) {
            console.error('Fehler bei der Generierung von Alternativen:', error);
            
            // Fallback für den Fall eines Fehlers
            return this._generateLocalAlternatives(sentence, numAlternatives);
        }
    }
    
    /**
     * Verbessert einen Textabschnitt
     * @param {string} text - Der zu verbessernde Text
     * @param {Object} options - Optionen für die Verbesserung
     * @returns {Promise<string>} Der verbesserte Text
     */
    async improveText(text, options = {}) {
        if (!text || text.trim().length === 0) {
            return '';
        }
        
        const defaultOptions = {
            goal: 'clarity', // clarity, persuasiveness, conciseness, formality
            context: '',
            region: 'Deutschland',
            preserveKeyInfo: true
        };
        
        const settings = { ...defaultOptions, ...options };
        
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
            
        const prompt = `
        Verbessere den folgenden Text. ${goalDescription}. ${keyInfoPart}
        Berücksichtige die üblichen Konventionen für Bewerbungstexte in ${settings.region}.${contextPart}
        
        TEXT:
        ${text}
        
        Gib nur den verbesserten Text zurück, ohne zusätzliche Erklärungen.
        `;
        
        try {
            const result = await advancedAIService.generateText(prompt, {
                temperature: 0.4,
                maxTokens: Math.max(text.length * 1.5, 1000),
                context: 'Du bist ein professioneller Texter und Lektor, der Texte verbessert ohne ihren Kerninhalt zu verändern.'
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
            
            return result;
        } catch (error) {
            console.error('Fehler bei der Textverbesserung:', error);
            return text; // Im Fehlerfall den Originaltext zurückgeben
        }
    }
    
    /**
     * Analysiert die sprachliche Qualität eines Textes
     * @param {string} text - Der zu analysierende Text
     * @returns {Promise<Object>} Die Analyse-Ergebnisse
     */
    async analyzeTextQuality(text) {
        if (!text || text.trim().length === 0) {
            return {
                score: 0,
                feedback: [],
                grammar: { issues: [] },
                style: { issues: [] },
                readability: { score: 0, level: 'Nicht ausreichend Text' }
            };
        }
        
        const prompt = `
        Analysiere die sprachliche Qualität des folgenden Textes. Bewerte Grammatik, Stil, Wortwahl und Lesbarkeit.
        
        TEXT:
        ${text}
        
        Gib deine Analyse in folgendem JSON-Format zurück:
        {
          "score": 85, // Gesamtbewertung von 0-100
          "feedback": [
            "Positiver Aspekt 1",
            "Verbesserungsvorschlag 1"
          ],
          "grammar": {
            "score": 90, // Bewertung von 0-100
            "issues": ["Grammatikfehler 1", "Grammatikfehler 2"]
          },
          "style": {
            "score": 80, // Bewertung von 0-100
            "strengths": ["Stärke 1"],
            "issues": ["Stilproblem 1"]
          },
          "readability": {
            "score": 85, // Bewertung von 0-100
            "level": "Mittel", // "Einfach", "Mittel", "Anspruchsvoll", "Sehr anspruchsvoll"
            "comments": "Kommentar zur Lesbarkeit"
          }
        }
        
        Sei präzise und konstruktiv in deiner Bewertung. Gib NUR das JSON ohne zusätzliche Erklärungen zurück.
        `;
        
        try {
            const result = await advancedAIService.generateText(prompt, {
                temperature: 0.2,
                maxTokens: 1500,
                context: 'Du bist ein erfahrener Lektor und Sprachexperte, der Texte präzise analysiert und konstruktives Feedback gibt.'
            });
            
            // Extrahiere das JSON aus der Antwort
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch (e) {
                    console.error('Fehler beim Parsen des JSON:', e);
                    return this._createEmptyQualityAnalysis();
                }
            }
            
            // Versuche, den gesamten Text als JSON zu parsen
            try {
                return JSON.parse(result);
            } catch (e) {
                console.error('Fehler beim Parsen des gesamten Textes als JSON:', e);
                return this._createEmptyQualityAnalysis();
            }
        } catch (error) {
            console.error('Fehler bei der Textqualitätsanalyse:', error);
            return this._createEmptyQualityAnalysis();
        }
    }
    
    /**
     * Finde Stellen im Text, die verbessert werden könnten
     * @param {string} text - Der zu analysierende Text
     * @returns {Promise<Array>} Array mit verbesserungswürdigen Stellen
     */
    async findImprovementOpportunities(text) {
        if (!text || text.trim().length === 0) {
            return [];
        }
        
        const prompt = `
        Analysiere den folgenden Text und identifiziere konkrete Stellen, die verbessert werden könnten.
        Finde maximal 5 Stellen, die am wichtigsten für die Gesamtqualität sind.
        
        TEXT:
        ${text}
        
        Gib deine Analyse in folgendem JSON-Format zurück:
        [
          {
            "originalText": "Originaler Textausschnitt mit Problem",
            "issue": "Beschreibung des Problems",
            "suggestion": "Vorschlag zur Verbesserung",
            "priority": 1 // Priorität 1 (hoch) bis 3 (niedrig)
          }
        ]
        
        Gib NUR das JSON ohne zusätzliche Erklärungen zurück.
        `;
        
        try {
            const result = await advancedAIService.generateText(prompt, {
                temperature: 0.3,
                maxTokens: 1500,
                context: 'Du bist ein Experte für Bewerbungsunterlagen und findest präzise Verbesserungsmöglichkeiten.'
            });
            
            // Extrahiere das JSON aus der Antwort
            const jsonMatch = result.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch (e) {
                    console.error('Fehler beim Parsen des JSON:', e);
                    return [];
                }
            }
            
            // Versuche, den gesamten Text als JSON zu parsen
            try {
                return JSON.parse(result);
            } catch (e) {
                console.error('Fehler beim Parsen des gesamten Textes als JSON:', e);
                return [];
            }
        } catch (error) {
            console.error('Fehler bei der Suche nach Verbesserungsmöglichkeiten:', error);
            return [];
        }
    }
    
    /**
     * Verbessert das Vokabular in einem Text
     * @param {string} text - Der zu verbessernde Text
     * @param {string} level - Das gewünschte Niveau (basic, professional, advanced, academic)
     * @returns {Promise<string>} Der verbesserte Text
     */
    async enhanceVocabulary(text, level = 'professional') {
        if (!text || text.trim().length === 0) {
            return '';
        }
        
        let levelDescription;
        
        switch (level) {
            case 'basic':
                levelDescription = "einfacher, aber präziser Sprache. Vermeide komplexe Fachbegriffe.";
                break;
            case 'advanced':
                levelDescription = "fortgeschrittener Sprache mit präzisen Fachbegriffen, wo angemessen. Wähle ausdrucksstarke und differenzierte Begriffe.";
                break;
            case 'academic':
                levelDescription = "akademischer, fachspezifischer Sprache mit präzisen Termini und elaboriertem Vokabular. Nutze fachsprachliche Ausdrücke.";
                break;
            default: // professional
                levelDescription = "professioneller, geschäftlicher Sprache. Nutze Fachbegriffe, wo es sinnvoll ist, und wähle präzise Formulierungen.";
                break;
        }
        
        const prompt = `
        Verbessere das Vokabular im folgenden Text. Ersetze gewöhnliche Wörter und Wendungen durch präzisere und wirkungsvollere Alternativen.
        
        Verwende dabei ${levelDescription}
        
        Die Struktur und der Inhalt des Textes sollen erhalten bleiben, nur das Vokabular soll verbessert werden.
        
        TEXT:
        ${text}
        
        Gib nur den verbesserten Text zurück, ohne zusätzliche Erklärungen.
        `;
        
        try {
            const result = await advancedAIService.generateText(prompt, {
                temperature: 0.4,
                maxTokens: Math.max(text.length * 1.5, 1000),
                context: 'Du bist ein Sprachexperte mit umfangreichem Vokabular und einem sicheren Gespür für Register und Stilebenen.'
            });
            
            // Speichere die Verbesserung in der Historie
            this.lastEnhancement = {
                type: 'vocabulary',
                original: text,
                result: result,
                level: level,
                timestamp: new Date()
            };
            this.enhancementHistory.push(this.lastEnhancement);
            
            return result;
        } catch (error) {
            console.error('Fehler bei der Vokabularverbesserung:', error);
            return text; // Im Fehlerfall den Originaltext zurückgeben
        }
    }
    
    /**
     * Lokale Alternativen ohne API generieren
     * @private
     */
    _generateLocalAlternatives(sentence, numAlternatives = 3) {
        // Muster für Umformulierungen aus Core_Code.md
        const patterns = [
            "In anderen Worten, {}",
            "Anders ausgedrückt: {}",
            "Das bedeutet, {}",
            "Mit anderen Worten: {}",
            "Um es anders zu sagen: {}",
            "Konkret heißt das: {}"
        ];
        
        const alternatives = [];
        for (let i = 0; i < numAlternatives; i++) {
            const pattern = patterns[i % patterns.length];
            alternatives.push(pattern.replace('{}', sentence));
        }
        
        return alternatives;
    }
    
    /**
     * Erstellt eine leere Datenstruktur für Qualitätsanalyse
     * @private
     */
    _createEmptyQualityAnalysis() {
        return {
            score: 50,
            feedback: [
                "Keine detaillierte Analyse verfügbar - lokaler Fallback."
            ],
            grammar: {
                score: 50,
                issues: []
            },
            style: {
                score: 50,
                strengths: [],
                issues: []
            },
            readability: {
                score: 50,
                level: "Unbekannt",
                comments: "Keine Analyse verfügbar"
            }
        };
    }
    
    /**
     * Gibt die Verbesserungshistorie zurück
     * @returns {Array} Die Historie der Verbesserungen
     */
    getHistory() {
        return this.enhancementHistory;
    }
    
    /**
     * Löscht die Verbesserungshistorie
     */
    clearHistory() {
        this.enhancementHistory = [];
        this.lastEnhancement = null;
    }
}

// Globale Instanz erstellen
const textEnhancer = new TextEnhancer();
export default textEnhancer; 