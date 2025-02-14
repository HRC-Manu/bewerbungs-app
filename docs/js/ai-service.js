"use strict";

/**
 * AI Service für die Generierung und Verarbeitung von KI-basierten Inhalten
 */
export class AIService {
    static API_ENDPOINT = '/api/ai';

    /**
     * Generiert Abschnitte für das Anschreiben basierend auf Job- und Lebenslaufdaten
     * @param {Object} jobData - Analysierte Jobdaten
     * @param {Object} resumeData - Analysierte Lebenslaufdaten
     * @param {Object} config - Konfiguration (provider, style)
     * @returns {Promise<Array>} Array von Abschnittsvorschlägen
     */
    static async generateCoverLetterSections(jobData, resumeData, config) {
        console.debug('[AIService] Generiere Anschreiben mit config:', config);
        const prompt = this.createPrompt(jobData, resumeData, config);
        
        try {
            const response = await fetch(`${this.API_ENDPOINT}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': localStorage.getItem('myEncryptedApiKey')
                },
                body: JSON.stringify({
                    prompt,
                    jobData,
                    resumeData,
                    config
                })
            });

            if (!response.ok) {
                throw new Error('Fehler bei der KI-Generierung');
            }

            const data = await response.json();
            return this.formatAIResponse(data.sections);
        } catch (error) {
            console.error('Error in generateCoverLetterSections:', error);
            throw error;
        }
    }

    /**
     * Erstellt den Prompt für die KI
     * @private
     */
    static createPrompt(jobData, resumeData, config) {
        const { style = 'formal' } = config;
        return `
            Erstelle ein professionelles Bewerbungsanschreiben im perfekten Deutsch.
            
            Stellenanzeige:
            - Position: ${jobData.jobTitle.position}
            - Unternehmen: ${jobData.company.name}
            - Branche: ${jobData.company.industry}
            - Anforderungen: ${JSON.stringify(jobData.requirements)}
            
            Bewerber:
            - Fähigkeiten: ${JSON.stringify(resumeData.skills)}
            - Erfahrung: ${JSON.stringify(resumeData.experience)}
            - Ausbildung: ${JSON.stringify(resumeData.education)}
            
            Stil: ${style}
            
            Bitte erstelle ein überzeugendes Anschreiben mit:
            1. Passender Anrede
            2. Einleitung mit Bezug zur Stelle
            3. Hauptteil mit relevanten Qualifikationen
            4. Motivation für die Bewerbung
            5. Professioneller Abschluss
            
            Wichtig:
            - Natürlicher, flüssiger Schreibstil
            - Konkrete Beispiele aus dem Lebenslauf
            - Bezug zu den Anforderungen
            - ${style === 'formal' ? 'Formelle Sprache' : 'Moderne, direkte Ansprache'}
        `;
    }

    /**
     * Formatiert die KI-Antwort in Abschnitte
     * @private
     */
    static formatAIResponse(sections) {
        return sections.map(section => ({
            section: section.type,
            text: section.content.trim()
        }));
    }

    /**
     * Verbessert ein bestehendes Anschreiben basierend auf Feedback
     * @param {Object} coverLetter - Das bestehende Anschreiben
     * @param {Object} feedback - Feedback-Objekt
     * @returns {Promise<Object>} Verbessertes Anschreiben
     */
    static async refineCoverLetter(coverLetter, feedback) {
        try {
            const response = await fetch(`${this.API_ENDPOINT}/refine`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': localStorage.getItem('myEncryptedApiKey')
                },
                body: JSON.stringify({
                    coverLetter,
                    feedback
                })
            });

            if (!response.ok) {
                throw new Error('Fehler bei der Verbesserung');
            }

            const data = await response.json();
            return data.improvedLetter;
        } catch (error) {
            console.error('Error in refineCoverLetter:', error);
            throw error;
        }
    }

    /**
     * Generiert den Hauptinhalt des Anschreibens
     * @private
     */
    static generateMainContent(jobData, resumeData, config) {
        const { style = 'formal' } = config;
        const intro = this.generateIntroduction(jobData, style);
        const skills = this.matchSkills(jobData, resumeData);
        const experience = this.highlightExperience(jobData, resumeData);
        const motivation = this.generateMotivation(jobData);
        const closing = this.generateClosing(style);

        return `${intro}\n\n${skills}\n\n${experience}\n\n${motivation}\n\n${closing}`;
    }

    /**
     * Generiert die Einleitung
     * @private
     */
    static generateIntroduction(jobData, style) {
        if (style === 'formal') {
            return `mit großem Interesse habe ich Ihre Stellenanzeige als ${jobData.jobTitle.position} bei ${jobData.company.name} gelesen.`;
        } else {
            return `ich bin begeistert von der Möglichkeit, als ${jobData.jobTitle.position} bei ${jobData.company.name} zu arbeiten.`;
        }
    }

    /**
     * Matched und beschreibt relevante Fähigkeiten
     * @private
     */
    static matchSkills(jobData, resumeData) {
        const requiredSkills = jobData.requirements.skills.technical;
        const candidateSkills = resumeData.skills.technical;
        
        const matchingSkills = requiredSkills.filter(skill => 
            candidateSkills.some(candSkill => 
                candSkill.toLowerCase().includes(skill.toLowerCase())
            )
        );

        return `Meine Expertise in ${matchingSkills.join(', ')} entspricht genau Ihren Anforderungen.`;
    }

    /**
     * Hebt relevante Erfahrungen hervor
     * @private
     */
    static highlightExperience(jobData, resumeData) {
        const relevantExperience = resumeData.experience
            .filter(exp => this.isRelevantExperience(exp, jobData))
            .map(exp => exp.description)
            .join('\n');

        return relevantExperience || 'Ich bringe relevante Erfahrung in diesem Bereich mit.';
    }

    /**
     * Prüft ob eine Erfahrung relevant ist
     * @private
     */
    static isRelevantExperience(experience, jobData) {
        const jobKeywords = [
            jobData.jobTitle.position,
            ...jobData.requirements.skills.technical,
            ...jobData.requirements.skills.soft
        ].map(kw => kw.toLowerCase());

        return jobKeywords.some(keyword => 
            experience.description.toLowerCase().includes(keyword)
        );
    }

    /**
     * Generiert die Motivation
     * @private
     */
    static generateMotivation(jobData) {
        return `Besonders begeistert mich an ${jobData.company.name} die ${jobData.company.culture.innovative ? 'innovative Ausrichtung' : 'spannende Unternehmenskultur'}.`;
    }

    /**
     * Generiert den Abschluss
     * @private
     */
    static generateClosing(style) {
        return style === 'formal' 
            ? 'Ich freue mich auf die Möglichkeit eines persönlichen Gesprächs.'
            : 'Ich würde mich sehr über die Gelegenheit freuen, mich persönlich vorzustellen.';
    }
} 
