/**
 * Erweiterter KI-Service mit Multi-Modell-Unterstützung
 * Basierend auf den Funktionen aus Core_Code.md
 */

class AdvancedAIService {
    constructor() {
        this.apiKeys = {
            openai: localStorage.getItem('openai_api_key') || '',
            gemini: localStorage.getItem('gemini_api_key') || ''
        };
        
        this.preferredProvider = localStorage.getItem('preferred_ai_provider') || 'openai';
        this.fallbackEnabled = true;
        this.retryCount = 2;
    }
    
    /**
     * Text mit KI generieren lassen
     * @param {string} prompt - Die Anfrage an die KI
     * @param {Object} options - Optionen für die Anfrage
     * @returns {Promise<string>} - Die generierte Antwort
     */
    async generateText(prompt, options = {}) {
        const defaultOptions = {
            provider: this.preferredProvider,
            temperature: 0.7,
            maxTokens: 2000,
            context: 'Du bist ein Experte für Bewerbungsschreiben in Deutschland und anderen deutschsprachigen Ländern.',
            fallback: true
        };
        
        const settings = { ...defaultOptions, ...options };
        
        console.log(`Texgenerierungsanfrage mit ${settings.provider} (Fallback: ${settings.fallback ? 'aktiviert' : 'deaktiviert'})`);
        
        try {
            // Versuche zuerst mit dem bevorzugten Anbieter
            let response = await this._callAIProvider(settings.provider, prompt, settings);
            
            if (response && response.trim()) {
                return response;
            } else if (settings.fallback && settings.provider !== 'all') {
                // Wenn kein Ergebnis und Fallback aktiviert, versuche anderen Anbieter
                console.log('Bevorzugter Anbieter fehlgeschlagen, versuche Fallback...');
                const fallbackProvider = settings.provider === 'openai' ? 'gemini' : 'openai';
                response = await this._callAIProvider(fallbackProvider, prompt, settings);
                
                if (response && response.trim()) {
                    return response;
                }
            }
            
            // Wenn alle Versuche fehlschlagen, verwende lokalen Fallback
            return this._generateLocalFallback(prompt, settings);
        } catch (error) {
            console.error('Fehler bei der Textgenerierung:', error);
            return this._generateLocalFallback(prompt, settings);
        }
    }
    
    /**
     * Einen Lebenslauf mit KI analysieren
     * @param {string} resumeText - Der Text des Lebenslaufs
     * @param {string} jobPostingText - Der Text der Stellenausschreibung (optional)
     * @returns {Promise<Object>} - Die Analyseergebnisse
     */
    async analyzeResume(resumeText, jobPostingText = '') {
        const prompt = `
        Bitte analysiere den folgenden Lebenslauf und gib eine strukturierte Analyse zurück.
        
        ${jobPostingText ? 'Berücksichtige auch diese Stellenanzeige für die Analyse:\n' + jobPostingText + '\n\n' : ''}
        
        LEBENSLAUF:
        ${resumeText}
        
        Gib die Analyse in folgendem JSON-Format zurück:
        {
            "overview": {
                "skills": [], 
                "experience_years": 0,
                "education_level": "",
                "languages": [],
                "strengths": [],
                "weaknesses": []
            },
            "match_score": ${jobPostingText ? '0 bis 100' : 'null'},
            "improvement_suggestions": []
        }
        
        Analysiere nur den Inhalt, ohne zusätzliche Kommentare.
        `;
        
        try {
            const response = await this.generateText(prompt, { 
                temperature: 0.2, 
                maxTokens: 1500,
                context: 'Du bist ein Experte für Personalwesen und Lebenslaufanalyse.'
            });
            
            // Extrahiere JSON aus der Antwort
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch (e) {
                    console.error('Fehler beim Parsen der JSON-Antwort:', e);
                    // Fallback: Strukturierte Antwort manuell extrahieren
                    return this._extractStructuredResults(response);
                }
            } else {
                return this._extractStructuredResults(response);
            }
        } catch (error) {
            console.error('Fehler bei der Lebenslaufanalyse:', error);
            return {
                overview: {
                    skills: [],
                    experience_years: 0,
                    education_level: "",
                    languages: [],
                    strengths: [],
                    weaknesses: []
                },
                match_score: null,
                improvement_suggestions: [
                    "Aufgrund eines technischen Problems konnte die Analyse nicht vollständig durchgeführt werden."
                ]
            };
        }
    }
    
    /**
     * Einen Lebenslauf für eine bestimmte Stelle optimieren
     * @param {string} resumeText - Der Text des Lebenslaufs
     * @param {string} jobPostingText - Der Text der Stellenausschreibung
     * @returns {Promise<string>} - Der optimierte Lebenslauf
     */
    async improveResume(resumeText, jobPostingText) {
        const prompt = `
        Verbessere den folgenden Lebenslauf für die angegebene Stellenanzeige:

        LEBENSLAUF:
        ${resumeText}

        STELLENANZEIGE:
        ${jobPostingText}

        Optimiere den Lebenslauf, indem du:
        1. Die Qualifikationen und Erfahrungen an die Stellenanzeige anpasst
        2. Messbare Erfolge und Ergebnisse hervorhebst
        3. Relevante Schlüsselwörter einbaust
        4. Die Formatierung und Struktur verbesserst
        
        Gib den vollständigen verbesserten Lebenslauf zurück.
        `;

        return this.generateText(prompt, {
            temperature: 0.3,
            maxTokens: 2500,
            context: 'Du bist ein Experte für Personalwesen und Lebensläufe.'
        });
    }
    
    /**
     * Alternative Formulierungen für einen Satz generieren
     * @param {string} sentence - Der zu reformulierende Satz
     * @param {number} numAlternatives - Anzahl der gewünschten Alternativen
     * @returns {Promise<string[]>} - Liste mit alternativen Formulierungen
     */
    async generateAlternatives(sentence, numAlternatives = 3) {
        const prompt = `
        Bitte generiere ${numAlternatives} verschiedene alternative Formulierungen für den folgenden Satz,
        die den gleichen Inhalt vermitteln, aber unterschiedliche Ausdrucksweisen nutzen.
        
        Satz: "${sentence}"
        
        Gib nur die alternativen Formulierungen zurück, ohne zusätzliche Erklärungen oder Kommentare.
        `;
        
        try {
            const response = await this.generateText(prompt, {
                temperature: 0.8,
                maxTokens: 500,
                context: 'Du bist ein Experte für deutsche Sprache und Formulierungen.'
            });
            
            // Teile die Antwort in separate Alternativen auf
            const alternatives = response
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('Alternative') && !line.match(/^\d+[\.\)]/));
            
            // Wenn genügend Alternativen vorhanden sind
            if (alternatives.length >= numAlternatives) {
                return alternatives.slice(0, numAlternatives);
            }
            
            // Sonst mit lokalen Fallbacks auffüllen
            return [
                ...alternatives,
                ...this._generateLocalAlternatives(sentence, numAlternatives - alternatives.length)
            ];
        } catch (error) {
            console.error('Fehler bei der Generierung von Alternativen:', error);
            return this._generateLocalAlternatives(sentence, numAlternatives);
        }
    }
    
    /**
     * Ein Anschreiben basierend auf Lebenslauf und Stellenanzeige erstellen
     * @param {string} resumeText - Der Text des Lebenslaufs
     * @param {string} jobPostingText - Der Text der Stellenausschreibung
     * @param {Object} options - Zusätzliche Optionen
     * @returns {Promise<string>} - Das generierte Anschreiben
     */
    async generateCoverLetter(resumeText, jobPostingText, options = {}) {
        const defaultOptions = {
            style: 'formal', // formal, casual, creative
            toneOfVoice: 'professional', // professional, enthusiastic, confident
            emphasisOn: [], // Liste der hervorzuhebenden Fähigkeiten/Erfahrungen
            region: 'Deutschland',
            includeIntroduction: true,
            includeQualifications: true,
            includeMotivation: true,
        };
        
        const settings = { ...defaultOptions, ...options };
        
        // Erstelle einen angepassten Prompt basierend auf den Optionen
        let styleDescription;
        switch (settings.style) {
            case 'casual':
                styleDescription = "freundlich und persönlich, aber dennoch professionell";
                break;
            case 'creative':
                styleDescription = "kreativ und auffällig, zeigt Persönlichkeit";
                break;
            default: // formal
                styleDescription = "formell und professionell";
                break;
        }
        
        let toneDescription;
        switch (settings.toneOfVoice) {
            case 'enthusiastic':
                toneDescription = "begeistert und motiviert";
                break;
            case 'confident':
                toneDescription = "selbstbewusst und bestimmt";
                break;
            default: // professional
                toneDescription = "professionell und sachlich";
                break;
        }
        
        const emphasisPart = settings.emphasisOn.length > 0 
            ? `\nBitte hebe besonders folgende Aspekte hervor: ${settings.emphasisOn.join(', ')}.` 
            : '';
            
        const structureParts = [];
        if (settings.includeIntroduction) structureParts.push("eine persönliche Einleitung");
        if (settings.includeQualifications) structureParts.push("relevante Qualifikationen und Erfahrungen");
        if (settings.includeMotivation) structureParts.push("Motivation für die Bewerbung");
        
        const structurePart = structureParts.length > 0
            ? `\nDas Anschreiben sollte folgende Elemente enthalten: ${structureParts.join(', ')}.`
            : '';
            
        const prompt = `
        Erstelle ein überzeugendes Anschreiben für eine Bewerbung basierend auf dem Lebenslauf und der Stellenanzeige.
        Der Stil sollte ${styleDescription} sein, mit einem ${toneDescription} Ton.${emphasisPart}${structurePart}
        Beachte die üblichen Konventionen für Bewerbungsschreiben in ${settings.region}.
        
        LEBENSLAUF:
        ${resumeText}
        
        STELLENANZEIGE:
        ${jobPostingText}
        
        Gib nur das fertige Anschreiben zurück, ohne zusätzliche Kommentare.
        `;
        
        return this.generateText(prompt, {
            temperature: 0.7,
            maxTokens: 2000,
            context: 'Du bist ein Experte für Bewerbungsschreiben mit langjähriger Erfahrung als Personalberater.',
            fallback: true
        });
    }
    
    /**
     * Prüfen, ob die API-Schlüssel vorhanden und gültig sind
     * @returns {Object} Status der API-Schlüssel
     */
    checkAPIKeys() {
        return {
            openai: !!this.apiKeys.openai && this.apiKeys.openai.startsWith('sk-'),
            gemini: !!this.apiKeys.gemini && this.apiKeys.gemini.length > 20
        };
    }
    
    /**
     * API-Schlüssel speichern
     * @param {string} provider - Der Anbieter ('openai' oder 'gemini')
     * @param {string} key - Der API-Schlüssel
     */
    setAPIKey(provider, key) {
        if (provider === 'openai' || provider === 'gemini') {
            this.apiKeys[provider] = key;
            localStorage.setItem(`${provider}_api_key`, key);
            return true;
        }
        return false;
    }
    
    /**
     * Bevorzugten KI-Anbieter festlegen
     * @param {string} provider - Der Anbieter ('openai', 'gemini' oder 'all')
     */
    setPreferredProvider(provider) {
        if (['openai', 'gemini', 'all'].includes(provider)) {
            this.preferredProvider = provider;
            localStorage.setItem('preferred_ai_provider', provider);
            return true;
        }
        return false;
    }
    
    // Private Hilfsmethoden
    
    /**
     * Den ausgewählten KI-Anbieter aufrufen
     * @private
     */
    async _callAIProvider(provider, prompt, settings) {
        if (provider === 'openai') {
            return this._callOpenAI(prompt, settings);
        } else if (provider === 'gemini') {
            return this._callGemini(prompt, settings);
        } else if (provider === 'all') {
            // Versuche beide Anbieter parallel
            const [openaiResult, geminiResult] = await Promise.allSettled([
                this._callOpenAI(prompt, settings),
                this._callGemini(prompt, settings)
            ]);
            
            // Verwende das erste erfolgreiche Ergebnis
            if (openaiResult.status === 'fulfilled' && openaiResult.value) {
                return openaiResult.value;
            } else if (geminiResult.status === 'fulfilled' && geminiResult.value) {
                return geminiResult.value;
            }
        }
        
        return null;
    }
    
    /**
     * OpenAI API aufrufen
     * @private
     */
    async _callOpenAI(prompt, settings) {
        if (!this.apiKeys.openai) {
            console.warn('Kein OpenAI API-Schlüssel gefunden');
            return null;
        }
        
        try {
            const models = [
                'gpt-4o',
                'gpt-4-turbo',
                'gpt-4',
                'gpt-3.5-turbo'
            ];
            
            // Versuche nacheinander verschiedene Modelle
            for (const model of models) {
                try {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.apiKeys.openai}`
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [
                                {
                                    role: 'system',
                                    content: settings.context
                                },
                                {
                                    role: 'user',
                                    content: prompt
                                }
                            ],
                            temperature: settings.temperature,
                            max_tokens: settings.maxTokens
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok && data.choices && data.choices.length > 0) {
                        return data.choices[0].message.content;
                    }
                } catch (error) {
                    console.warn(`Fehler bei OpenAI mit Modell ${model}:`, error);
                    // Versuche nächstes Modell
                    continue;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Fehler bei der OpenAI-Anfrage:', error);
            return null;
        }
    }
    
    /**
     * Google Gemini API aufrufen
     * @private
     */
    async _callGemini(prompt, settings) {
        if (!this.apiKeys.gemini) {
            console.warn('Kein Gemini API-Schlüssel gefunden');
            return null;
        }
        
        try {
            // Die Gemini API-Modelle und Versionen
            const models = [
                "gemini-1.5-pro",
                "gemini-1.5-flash",
                "gemini-1.0-pro", 
                "gemini-pro"
            ];
            
            const apiVersions = ["v1beta", "v1"];
            
            // Versuche verschiedene Modelle und Versionen
            for (const model of models) {
                for (const apiVersion of apiVersions) {
                    try {
                        const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${this.apiKeys.gemini}`;
                        
                        const data = {
                            contents: [
                                {
                                    parts: [
                                        {
                                            text: `${settings.context} ${prompt}`
                                        }
                                    ]
                                }
                            ],
                            generationConfig: {
                                temperature: settings.temperature,
                                maxOutputTokens: settings.maxTokens,
                                topP: 0.8,
                                topK: 40
                            }
                        };
                        
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(data)
                        });
                        
                        const responseData = await response.json();
                        
                        if (response.ok && responseData.candidates && responseData.candidates.length > 0) {
                            if (responseData.candidates[0].content && responseData.candidates[0].content.parts) {
                                const parts = responseData.candidates[0].content.parts;
                                if (parts.length > 0 && parts[0].text) {
                                    return parts[0].text;
                                }
                            }
                        }
                    } catch (error) {
                        console.warn(`Fehler bei Gemini mit Modell ${model}, API-Version ${apiVersion}:`, error);
                        // Versuche nächstes Modell/API-Version
                        continue;
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('Fehler bei der Gemini-Anfrage:', error);
            return null;
        }
    }
    
    /**
     * Lokalen Fallback-Text ohne API erstellen
     * @private
     */
    _generateLocalFallback(prompt, settings) {
        console.log('Verwende lokalen Fallback für Textgenerierung');
        
        // Einfache Keyword-basierte Textgenerierung als Fallback
        if (prompt.toLowerCase().includes('lebenslauf')) {
            return "Leider konnte ich keine Verbindung zum KI-Dienst herstellen. Bitte versuchen Sie es später erneut oder prüfen Sie Ihre API-Schlüssel in den Einstellungen.";
        } else if (prompt.toLowerCase().includes('anschreiben')) {
            return "Leider konnte ich keine Verbindung zum KI-Dienst herstellen. Für ein gutes Anschreiben empfehle ich, dass Sie Ihre Motivation, relevante Erfahrungen und Qualifikationen klar herausstellen und Bezug auf die Stellenanzeige nehmen.";
        } else if (prompt.toLowerCase().includes('alternative')) {
            return "Leider konnte ich keine Verbindung zum KI-Dienst herstellen. Sie können den Text selbst umformulieren oder es später erneut versuchen.";
        } else {
            return "Leider konnte keine Verbindung zum KI-Dienst hergestellt werden. Bitte überprüfen Sie Ihre Internetverbindung und die API-Schlüssel in den Einstellungen.";
        }
    }
    
    /**
     * Lokale Alternativen generieren ohne API
     * @private
     */
    _generateLocalAlternatives(sentence, numAlternatives) {
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
     * Strukturierte Ergebnisse aus Text extrahieren
     * @private
     */
    _extractStructuredResults(text) {
        const result = {
            overview: {
                skills: [],
                experience_years: 0,
                education_level: "",
                languages: [],
                strengths: [],
                weaknesses: []
            },
            match_score: null,
            improvement_suggestions: []
        };
        
        // Einfache Extraktionslogik basierend auf Schlüsselwörtern
        const lines = text.split('\n');
        
        let currentSection = '';
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('Fähigkeiten') || trimmedLine.startsWith('Skills')) {
                currentSection = 'skills';
                continue;
            } else if (trimmedLine.startsWith('Berufserfahrung') || trimmedLine.startsWith('Experience')) {
                currentSection = 'experience';
                continue;
            } else if (trimmedLine.startsWith('Sprachen') || trimmedLine.startsWith('Languages')) {
                currentSection = 'languages';
                continue;
            } else if (trimmedLine.startsWith('Stärken') || trimmedLine.startsWith('Strengths')) {
                currentSection = 'strengths';
                continue;
            } else if (trimmedLine.startsWith('Schwächen') || trimmedLine.startsWith('Weaknesses')) {
                currentSection = 'weaknesses';
                continue;
            } else if (trimmedLine.startsWith('Verbesserungsvorschläge') || 
                       trimmedLine.startsWith('Improvement') || 
                       trimmedLine.startsWith('Empfehlungen')) {
                currentSection = 'suggestions';
                continue;
            } else if (trimmedLine.includes('Match') || trimmedLine.includes('Übereinstimmung')) {
                const scoreMatch = trimmedLine.match(/\d+/);
                if (scoreMatch) {
                    const score = parseInt(scoreMatch[0]);
                    if (score >= 0 && score <= 100) {
                        result.match_score = score;
                    }
                }
                continue;
            }
            
            // Einträge nach Sektion extrahieren
            if (currentSection && trimmedLine) {
                // Listen-Einträge erkennen und säubern
                const listItemMatch = trimmedLine.match(/^[-•*]\s*(.+)$/);
                const content = listItemMatch ? listItemMatch[1] : trimmedLine;
                
                if (!content) continue;
                
                switch (currentSection) {
                    case 'skills':
                        result.overview.skills.push(content);
                        break;
                    case 'languages':
                        result.overview.languages.push(content);
                        break;
                    case 'strengths':
                        result.overview.strengths.push(content);
                        break;
                    case 'weaknesses':
                        result.overview.weaknesses.push(content);
                        break;
                    case 'suggestions':
                        result.improvement_suggestions.push(content);
                        break;
                    case 'experience':
                        // Versuche, Jahre der Berufserfahrung zu extrahieren
                        const yearsMatch = content.match(/(\d+)[\s-]*Jahr/i);
                        if (yearsMatch) {
                            result.overview.experience_years = parseInt(yearsMatch[1]);
                        }
                        break;
                }
            }
        }
        
        return result;
    }
}

// Globale Instanz erstellen
const advancedAIService = new AdvancedAIService();
export default advancedAIService; 