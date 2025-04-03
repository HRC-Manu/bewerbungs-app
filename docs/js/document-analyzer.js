/**
 * Dokumenten-Analysierer
 * Basierend auf der _analyze_resume_with_ai Funktion aus main_Core_Code.md
 */

import advancedAIService from './advanced-ai-service.js';
import documentExtractor from './document-extractor.js';

class DocumentAnalyzer {
    constructor() {
        this.extractionResults = {};
        this.analysisResults = {};
    }
    
    /**
     * Extrahiert strukturierte Daten aus einem Dokument
     * @param {File} file - Die zu analysierende Datei
     * @returns {Promise<Object>} Die extrahierten strukturierten Daten
     */
    async extractStructuredData(file) {
        try {
            // Extrahiere zunächst den Text aus der Datei
            const extractionResult = await documentExtractor.extractText(file);
            
            if (!extractionResult.success) {
                console.error('Fehler bei der Textextraktion:', extractionResult.error);
                return {
                    success: false,
                    error: extractionResult.error
                };
            }
            
            // Speichere das Ergebnis für spätere Referenz
            this.extractionResults[file.name] = extractionResult;
            
            // Jetzt können wir den Text analysieren und strukturierte Daten extrahieren
            const structuredData = await this._analyzeWithAI(extractionResult.text);
            
            // Speichere die Analyse für spätere Referenz
            this.analysisResults[file.name] = structuredData;
            
            return {
                success: true,
                data: structuredData,
                fileName: file.name,
                fileType: extractionResult.format
            };
        } catch (error) {
            console.error('Fehler bei der strukturierten Datenextraktion:', error);
            return {
                success: false,
                error: error.message || 'Unbekannter Fehler bei der Analyse'
            };
        }
    }
    
    /**
     * Analysiert Dokumente, um Übereinstimmungen zu finden
     * @param {File} resumeFile - Der Lebenslauf
     * @param {File} jobPostingFile - Die Stellenanzeige
     * @returns {Promise<Object>} Die Matching-Analyse
     */
    async analyzeMatching(resumeFile, jobPostingFile) {
        try {
            // Extrahiere Text aus beiden Dateien
            const resumeResult = resumeFile instanceof File ? 
                await documentExtractor.extractText(resumeFile) : 
                { success: true, text: resumeFile };
                
            const jobPostingResult = jobPostingFile instanceof File ? 
                await documentExtractor.extractText(jobPostingFile) : 
                { success: true, text: jobPostingFile };
            
            if (!resumeResult.success || !jobPostingResult.success) {
                return {
                    success: false,
                    error: 'Fehler bei der Textextraktion aus den Dokumenten'
                };
            }
            
            // Führe die Matching-Analyse mit der KI durch
            const matchingResults = await this._matchWithAI(resumeResult.text, jobPostingResult.text);
            
            return {
                success: true,
                data: matchingResults
            };
        } catch (error) {
            console.error('Fehler bei der Matching-Analyse:', error);
            return {
                success: false,
                error: error.message || 'Unbekannter Fehler bei der Matching-Analyse'
            };
        }
    }
    
    /**
     * Benutzt die KI, um strukturierte Daten aus Dokumenten zu extrahieren
     * @private
     */
    async _analyzeWithAI(documentsText) {
        // Prompt für die strukturierte Datenextraktion, basierend auf main_Core_Code.md
        const extractionPrompt = `
        Analysiere das folgende Dokument und extrahiere alle relevanten Informationen in strukturiertem JSON-Format.
        
        DOKUMENT:
        ${documentsText}
        
        Extrahiere exakt folgende Informationen im spezifizierten Format:
        {
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
              "level": "CEFR-Niveau (A1-C2)",
              "certificates": "Zertifikate (falls vorhanden)"
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
            // Verwende den AI-Service für die Analyse
            const result = await advancedAIService.generateText(extractionPrompt, {
                temperature: 0.1,
                maxTokens: 2000,
                context: 'Du bist ein präziser Datenextraktions-Assistent, der Informationen aus Dokumenten in ein strukturiertes Format umwandelt.'
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
                maxTokens: 1500,
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
}

// Globale Instanz erstellen
const documentAnalyzer = new DocumentAnalyzer();
export default documentAnalyzer; 