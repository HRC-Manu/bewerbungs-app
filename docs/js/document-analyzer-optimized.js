/**
 * Löscht den Cache
 */
_clearCache() {
    this.cache.extractedTexts.clear();
    this.cache.structuredData.clear();
    this.cache.matchingResults.clear();
    
    localStorage.removeItem('document_analyzer_cache');
}

/**
 * Extrahiert Text aus einer Datei mit Caching
 * @private
 */
async _extractText(file) {
    try {
        // Cache-Schlüssel generieren
        const fileIdentifier = await this._getFileIdentifier(file);
        const cacheKey = `text_${fileIdentifier}`;
        
        // Cache-Prüfung
        if (this.cacheEnabled && this.cache.extractedTexts.has(cacheKey)) {
            const cachedResult = this.cache.extractedTexts.get(cacheKey);
            
            // Prüfe, ob der Cache-Eintrag noch gültig ist
            if (Date.now() - cachedResult.timestamp < this.cacheMaxAge) {
                console.log('Extrahierter Text aus Cache geladen');
                return {
                    success: true,
                    text: cachedResult.text,
                    format: cachedResult.format,
                    fromCache: true
                };
            } else {
                // Cache-Eintrag ist zu alt, entferne ihn
                this.cache.extractedTexts.delete(cacheKey);
            }
        }
        
        // Text extrahieren mit dem DocumentExtractor
        const extractionResult = await documentExtractor.extractText(file);
        
        // Im Erfolgsfall im Cache speichern
        if (extractionResult.success && this.cacheEnabled) {
            // Cache-Management: Wenn zu viele Einträge, entferne die ältesten
            while (this.cache.extractedTexts.size >= this.cacheMaxSize) {
                const oldestKey = this._getOldestCacheKey(this.cache.extractedTexts);
                if (oldestKey) this.cache.extractedTexts.delete(oldestKey);
            }
            
            this.cache.extractedTexts.set(cacheKey, {
                text: extractionResult.text,
                format: extractionResult.format,
                timestamp: Date.now()
            });
            
            // Speichere in localStorage
            this._saveCache();
        }
        
        // Speichere auch in der Klasseninstanz
        this.extractionResults[file.name] = extractionResult;
        
        return extractionResult;
    } catch (error) {
        console.error('Fehler bei der Textextraktion:', error);
        return {
            success: false,
            error: error.message || 'Unbekannter Fehler bei der Textextraktion',
            text: ''
        };
    }
}

/**
 * Klassifiziert das Dokument automatisch
 * @param {string} text - Der zu analysierende Text
 * @returns {Promise<string|null>} Der erkannte Dokumenttyp oder null
 * @private
 */
async _classifyDocument(text) {
    try {
        // Starte mit einem einfachen regelbasierten Ansatz
        const scores = {};
        const textLower = text.toLowerCase();
        
        // 1. Bewerte anhand von Keywords
        for (const [docType, config] of Object.entries(this.domainExtractors)) {
            scores[docType] = 0;
            
            // Keyword-Analyse
            for (const keyword of config.keywords) {
                // Exakte Übereinstimmung gibt mehr Punkte als teilweise Übereinstimmung
                const exactRegex = new RegExp(`\\b${keyword}\\b`, 'i');
                if (exactRegex.test(textLower)) {
                    scores[docType] += 2;
                } else if (textLower.includes(keyword)) {
                    scores[docType] += 1;
                }
            }
        }
        
        // 2. Zusätzliche Heuristiken basierend auf Textstruktur
        
        // Lebenslauf-Heuristiken
        if (
            /berufserfahrung|work experience|ausbildung|education/i.test(textLower) &&
            /kenntnisse|skills|fähigkeiten|qualifikationen|qualifications/i.test(textLower)
        ) {
            scores['resume'] += 3;
        }
        
        // Anschreiben-Heuristiken
        if (
            /sehr geehrte|dear sir|dear madam|to whom it may concern/i.test(textLower) &&
            /bewerbung|application|bewerbe mich|applying/i.test(textLower) &&
            /mit freundlichen grüßen|sincerely|best regards/i.test(textLower)
        ) {
            scores['coverLetter'] += 3;
        }
        
        // Stellenanzeigen-Heuristiken
        if (
            /wir suchen|we are looking for|stellenangebot|job offer/i.test(textLower) &&
            /ihre aufgaben|your responsibilities|anforderungen|requirements/i.test(textLower) &&
            /wir bieten|we offer|benefits|vorteile/i.test(textLower)
        ) {
            scores['jobPosting'] += 3;
        }
        
        // 3. Ermittle den Gewinner
        let maxScore = 0;
        let bestDocType = null;
        
        for (const [docType, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                bestDocType = docType;
            }
        }
        
        // 4. Nur zurückgeben, wenn der Score über dem Schwellenwert liegt
        // Normalisiere den Score auf den Bereich 0-1
        const normalizedScore = maxScore / (10 + Object.keys(this.domainExtractors).length);
        
        console.log(`Dokument-Klassifizierungs-Scores:`, scores, 
                    `Normalisierter bester Score: ${normalizedScore}`);
        
        if (normalizedScore >= this.classificationThreshold) {
            return bestDocType;
        }
        
        // 5. Fallback: KI-gestützte Klassifizierung bei unklaren Fällen
        // Wenn die regelbasierte Klassifizierung keine klaren Ergebnisse liefert
        return await this._classifyDocumentWithAI(text);
    } catch (error) {
        console.error('Fehler bei der Dokumentklassifizierung:', error);
        return null;
    }
}

/**
 * Klassifiziert ein Dokument mit Hilfe der KI
 * @param {string} text - Der zu klassifizierende Text
 * @returns {Promise<string|null>} Der erkannte Dokumenttyp oder null
 * @private
 */
async _classifyDocumentWithAI(text) {
    try {
        // Beschränke den Text auf eine vernünftige Länge für die KI
        const truncatedText = text.slice(0, 2500);
        
        const prompt = `
        Klassifiziere den folgenden Text als eine der folgenden Dokumenttypen:
        1. "resume" - Wenn es sich um einen Lebenslauf handelt
        2. "coverLetter" - Wenn es sich um ein Bewerbungsanschreiben handelt
        3. "jobPosting" - Wenn es sich um eine Stellenanzeige handelt
        
        Antworte NUR mit "resume", "coverLetter", "jobPosting" oder "unknown", wenn du dir unsicher bist.
        
        TEXT:
        ${truncatedText}
        `;
        
        const result = await advancedAIService.generateText(prompt, {
            temperature: 0.1,
            maxTokens: 10,
            context: 'Du bist ein Experte für die Analyse von Bewerbungsdokumenten.'
        });
        
        // Extrahiere den Dokumenttyp
        const cleanResult = result.trim().toLowerCase();
        
        if (['resume', 'coverletter', 'jobposting'].includes(cleanResult)) {
            return cleanResult === 'coverletter' ? 'coverLetter' : cleanResult;
        }
        
        return null;
    } catch (error) {
        console.error('Fehler bei der KI-Klassifizierung:', error);
        return null;
    }
}

/**
 * Spezifischer Extraktor für Lebensläufe
 * @private
 */
async _extractResumeFields(text) {
    try {
        // Verwende die spezifische Prompt-Vorlage
        let prompt = this.domainExtractors.resume.promptTemplate;
        prompt = prompt.replace('{text}', text);
        
        const result = await advancedAIService.generateText(prompt, {
            temperature: 0.2,
            maxTokens: 2000,
            context: 'Du bist ein Experte für die Analyse von Lebensläufen und die Extraktion strukturierter Daten daraus.'
        });
        
        // Extrahiere das JSON aus der Antwort
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsedData = JSON.parse(jsonMatch[0]);
                
                // Führe eine Nachbearbeitung durch, um Qualität zu verbessern
                return this._postProcessResumeData(parsedData);
            } catch (e) {
                console.error('Fehler beim Parsen des JSON aus der Lebenslaufanalyse:', e);
                return this._analyzeWithAI(text);
            }
        }
        
        // Versuche, den gesamten Text als JSON zu parsen
        try {
            const parsedData = JSON.parse(result);
            return this._postProcessResumeData(parsedData);
        } catch (e) {
            console.error('Fehler beim Parsen des gesamten Textes als JSON:', e);
            return this._analyzeWithAI(text);
        }
    } catch (error) {
        console.error('Fehler bei der Lebenslaufdatenextraktion:', error);
        return this._analyzeWithAI(text);
    }
}

/**
 * Spezifischer Extraktor für Stellenanzeigen
 * @private
 */
async _extractJobPostingFields(text) {
    try {
        // Verwende die spezifische Prompt-Vorlage
        let prompt = this.domainExtractors.jobPosting.promptTemplate;
        prompt = prompt.replace('{text}', text);
        
        const result = await advancedAIService.generateText(prompt, {
            temperature: 0.2,
            maxTokens: 2000,
            context: 'Du bist ein Experte für die Analyse von Stellenanzeigen und die Extraktion strukturierter Daten daraus.'
        });
        
        // Extrahiere das JSON aus der Antwort
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsedData = JSON.parse(jsonMatch[0]);
                
                // Führe eine Nachbearbeitung durch, um Qualität zu verbessern
                return this._postProcessJobPostingData(parsedData);
            } catch (e) {
                console.error('Fehler beim Parsen des JSON aus der Stellenanzeigenanalyse:', e);
                return this._analyzeWithAI(text);
            }
        }
        
        // Versuche, den gesamten Text als JSON zu parsen
        try {
            const parsedData = JSON.parse(result);
            return this._postProcessJobPostingData(parsedData);
        } catch (e) {
            console.error('Fehler beim Parsen des gesamten Textes als JSON:', e);
            return this._analyzeWithAI(text);
        }
    } catch (error) {
        console.error('Fehler bei der Stellenanzeigendatenextraktion:', error);
        return this._analyzeWithAI(text);
    }
}

/**
 * Spezifischer Extraktor für Anschreiben
 * @private
 */
async _extractCoverLetterFields(text) {
    try {
        // Verwende die spezifische Prompt-Vorlage
        let prompt = this.domainExtractors.coverLetter.promptTemplate;
        prompt = prompt.replace('{text}', text);
        
        const result = await advancedAIService.generateText(prompt, {
            temperature: 0.2,
            maxTokens: 2000,
            context: 'Du bist ein Experte für die Analyse von Bewerbungsanschreiben und die Extraktion strukturierter Daten daraus.'
        });
        
        // Extrahiere das JSON aus der Antwort
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsedData = JSON.parse(jsonMatch[0]);
                
                // Führe eine Nachbearbeitung durch, um Qualität zu verbessern
                return this._postProcessCoverLetterData(parsedData);
            } catch (e) {
                console.error('Fehler beim Parsen des JSON aus der Anschreibenanalyse:', e);
                return this._analyzeWithAI(text);
            }
        }
        
        // Versuche, den gesamten Text als JSON zu parsen
        try {
            const parsedData = JSON.parse(result);
            return this._postProcessCoverLetterData(parsedData);
        } catch (e) {
            console.error('Fehler beim Parsen des gesamten Textes als JSON:', e);
            return this._analyzeWithAI(text);
        }
    } catch (error) {
        console.error('Fehler bei der Anschreibendatenextraktion:', error);
        return this._analyzeWithAI(text);
    }
}

/**
 * Nachbearbeitung für extrahierte Lebenslaufdaten
 * @private
 */
_postProcessResumeData(data) {
    if (!data) return this._createEmptyStructuredData();
    
    // Fehlende Felder mit Standardwerten füllen
    if (!data.personalData) data.personalData = {};
    if (!data.workExperience) data.workExperience = [];
    if (!data.education) data.education = [];
    if (!data.skills) data.skills = {};
    
    // Array-Felder sicherstellen
    if (!Array.isArray(data.workExperience)) data.workExperience = [];
    if (!Array.isArray(data.education)) data.education = [];
    
    // Skills-Objekt sicherstellen
    if (typeof data.skills !== 'object') data.skills = {};
    if (!data.skills.technical) data.skills.technical = [];
    if (!data.skills.methodical) data.skills.methodical = [];
    if (!data.skills.social) data.skills.social = [];
    
    // Arrays für Skills sicherstellen
    if (!Array.isArray(data.skills.technical)) data.skills.technical = [];
    if (!Array.isArray(data.skills.methodical)) data.skills.methodical = [];
    if (!Array.isArray(data.skills.social)) data.skills.social = [];
    
    // Sicherstellen, dass alle Skills-Arrays Strings enthalten
    data.skills.technical = data.skills.technical.map(skill => typeof skill === 'string' ? skill : String(skill));
    data.skills.methodical = data.skills.methodical.map(skill => typeof skill === 'string' ? skill : String(skill));
    data.skills.social = data.skills.social.map(skill => typeof skill === 'string' ? skill : String(skill));
    
    return data;
}

/**
 * Nachbearbeitung für extrahierte Stellenanzeigendaten
 * @private
 */
_postProcessJobPostingData(data) {
    if (!data) return {};
    
    // Fehlende Felder mit Standardwerten füllen
    if (!data.company) data.company = {};
    if (!data.requirements) data.requirements = {};
    
    // Array-Felder sicherstellen
    if (!Array.isArray(data.responsibilities)) data.responsibilities = [];
    if (!Array.isArray(data.benefits)) data.benefits = [];
    if (!Array.isArray(data.skills)) data.skills = [];
    
    // Requirement-Arrays sicherstellen
    if (!data.requirements.mustHave) data.requirements.mustHave = [];
    if (!data.requirements.niceToHave) data.requirements.niceToHave = [];
    
    if (!Array.isArray(data.requirements.mustHave)) data.requirements.mustHave = [];
    if (!Array.isArray(data.requirements.niceToHave)) data.requirements.niceToHave = [];
    
    return data;
}

/**
 * Nachbearbeitung für extrahierte Anschreibendaten
 * @private
 */
_postProcessCoverLetterData(data) {
    if (!data) return {};
    
    // Fehlende Felder mit Standardwerten füllen
    if (!data.sender) data.sender = {};
    if (!data.recipient) data.recipient = {};
    
    // Array-Felder sicherstellen
    if (!Array.isArray(data.keyQualifications)) data.keyQualifications = [];
    if (!Array.isArray(data.motivationHighlights)) data.motivationHighlights = [];
    
    // Wenn mainBody ein String ist, konvertiere ihn zu einem Array
    if (typeof data.mainBody === 'string') {
        data.mainBody = data.mainBody.split('\n\n').filter(p => p.trim().length > 0);
    }
    
    if (!Array.isArray(data.mainBody)) data.mainBody = [];
    
    return data;
}

/**
 * Benutzt die KI, um strukturierte Daten aus Dokumenten zu extrahieren (generische Methode)
 * @private
 */
async _analyzeWithAI(documentsText) {
    // Angepasst von der _analyze_resume_with_ai Funktion aus main_Core_Code.md
    const extractionPrompt = `
    Analysiere das folgende Dokument und extrahiere alle relevanten Informationen in strukturiertem JSON-Format.
    
    DOKUMENT:
    ${documentsText}
    
    Extrahiere exakt folgende Informationen im spezifizierten Format:
    {
      "documentType": "resume|coverLetter|jobPosting",
      "personalData": {
        "name": "Vollständiger Name",
        "address": "Vollständige Adresse",
        "phone": "Telefonnummer",
        "email": "E-Mail",
        "birthDate": "TT.MM.YYYY",
        "birthPlace": "Geburtsort",
        "nationality": "Nationalität"
      },
      "workExperience": [
        {
          "period": "MM/YYYY - MM/YYYY",
          "position": "Jobtitel",
          "company": "Firmenname",
          "location": "Ort",
          "responsibilities": ["Verantwortung 1", "Verantwortung 2"],
          "achievements": ["Erfolg 1", "Erfolg 2"]
        }
      ],
      "education": [
        {
          "period": "MM/YYYY - MM/YYYY",
          "degree": "Abschluss",
          "institution": "Bildungseinrichtung",
          "location": "Ort",
          "focus": "Schwerpunkte",
          "grade": "Note (falls angegeben)"
        }
      ],
      "skills": {
        "technical": ["Skill 1", "Skill 2"],
        "methodical": ["Methode 1", "Methode 2"],
        "social": ["Soziale Kompetenz 1", "Soziale Kompetenz 2"]
      },
      "languages": [
        {
          "language": "Sprache",
          "level": "CEFR-Niveau (A1-C2)"
        }
      ],
      "certifications": [
        {
          "date": "MM/YYYY",
          "title": "Zertifikatsname",
          "issuer": "Ausstellende Organisation"
        }
      ],
      "interests": ["Interesse 1", "Interesse 2"]
    }
    
    Fülle so viele Felder wie möglich basierend auf dem Dokument aus. Bei fehlenden Informationen setze leere Strings oder leere Arrays.
    Gib NUR das JSON ohne jegliche zusätzliche Erklärungen zurück.
    `;
    
    try {
        const result = await advancedAIService.generateText(extractionPrompt, {
            temperature: 0.2,
            maxTokens: 2000,
            context: 'Du bist ein Experte für die Analyse von Dokumenten und die Extraktion strukturierter Daten.'
        });
        
        // Extrahiere das JSON aus der Antwort
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.error('Fehler beim Parsen des JSON:', e);
                return this._createEmptyStructuredData();
            }
        }
        
        // Versuche, den gesamten Text als JSON zu parsen
        try {
            return JSON.parse(result);
        } catch (e) {
            console.error('Fehler beim Parsen des gesamten Textes als JSON:', e);
            return this._createEmptyStructuredData();
        }
    } catch (error) {
        console.error('Fehler bei der KI-Analyse:', error);
        return this._createEmptyStructuredData();
    }
}

/**
 * Benutzt die KI, um eine Matching-Analyse durchzuführen
 * @private
 */
async _matchWithAI(resumeText, jobPostingText) {
    const matchingPrompt = `
    Analysiere den folgenden Lebenslauf und die Stellenanzeige, um die Übereinstimmung zu bewerten:
    
    LEBENSLAUF:
    ${resumeText}
    
    STELLENANZEIGE:
    ${jobPostingText}
    
    Gib deine Analyse in folgendem JSON-Format zurück:
    {
      "overallMatch": 75, // Prozentuale Gesamtübereinstimmung (0-100)
      "skills": {
        "matching": ["Skill 1", "Skill 2"], // Übereinstimmende Fähigkeiten
        "missing": ["Skill 3", "Skill 4"] // Im Lebenslauf fehlende, aber in der Stellenanzeige geforderte Fähigkeiten
      },
      "experience": {
        "match": 70, // Prozentuale Übereinstimmung der Berufserfahrung (0-100)
        "comments": "Kurzer Kommentar zur Berufserfahrung"
      },
      "education": {
        "match": 80, // Prozentuale Übereinstimmung der Ausbildung (0-100)
        "comments": "Kurzer Kommentar zur Ausbildung"
      },
      "recommendations": [
        "Empfehlung 1 zur Verbesserung des Lebenslaufs",
        "Empfehlung 2 zur Verbesserung des Lebenslaufs"
      ]
    }
    
    Sei präzise und objektiv in deiner Bewertung. Gib NUR das JSON ohne zusätzliche Erklärungen zurück.
    `;
    
    try {
        // Verwende den AI-Service für die Analyse
        const result = await advancedAIService.generateText(matchingPrompt, {
            temperature: 0.3,
            maxTokens: 2000,
            context: 'Du bist ein erfahrener Personalberater, der Lebensläufe mit Stellenanzeigen vergleicht und die Übereinstimmung bewertet.'
        });
        
        // Extrahiere das JSON aus der Antwort
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.error('Fehler beim Parsen des JSON:', e);
                return this._createEmptyMatchingResults();
            }
        }
        
        // Versuche, den gesamten Text als JSON zu parsen
        try {
            return JSON.parse(result);
        } catch (e) {
            console.error('Fehler beim Parsen des gesamten Textes als JSON:', e);
            return this._createEmptyMatchingResults();
        }
    } catch (error) {
        console.error('Fehler bei der Matching-Analyse:', error);
        return this._createEmptyMatchingResults();
    }
}

/**
 * Erstellt eine leere Datenstruktur für strukturierte Daten
 * @private
 */
_createEmptyStructuredData() {
    return {
        documentType: "unknown",
        personalData: {
            name: "",
            address: "",
            phone: "",
            email: "",
            birthDate: "",
            birthPlace: "",
            nationality: ""
        },
        workExperience: [],
        education: [],
        skills: {
            technical: [],
            methodical: [],
            social: []
        },
        languages: [],
        certifications: [],
        interests: []
    };
}

/**
 * Erstellt eine leere Datenstruktur für Matching-Ergebnisse
 * @private
 */
_createEmptyMatchingResults() {
    return {
        overallMatch: 0,
        skills: {
            matching: [],
            missing: []
        },
        experience: {
            match: 0,
            comments: "Keine Analyse verfügbar"
        },
        education: {
            match: 0,
            comments: "Keine Analyse verfügbar"
        },
        recommendations: [
            "Keine Empfehlungen verfügbar"
        ]
    };
}

// Globale Instanz erstellen
const documentAnalyzer = new DocumentAnalyzer();
export default documentAnalyzer; 