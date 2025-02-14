/**
 * AI Service für die Generierung und Verarbeitung von KI-basierten Inhalten
 */
export class AIService {
    /**
     * Generiert Abschnitte für das Anschreiben basierend auf Job- und Lebenslaufdaten
     * @param {Object} jobData - Analysierte Jobdaten
     * @param {Object} resumeData - Analysierte Lebenslaufdaten
     * @param {Object} config - Konfiguration (provider, style)
     * @returns {Promise<Array>} Array von Abschnittsvorschlägen
     */
    static async generateCoverLetterSections(jobData, resumeData, config) {
        const bestPracticePrompt = `
            Erstelle ein professionelles Bewerbungsschreiben im perfekten Deutsch,
            beachte gängige Best Practices: 
            - Höfliche Anrede, 
            - Klare Motivation, 
            - Relevante Fähigkeiten,
            - Abschließende Grußformel.
            Tone: ${config.style || 'formal'}.
        `;

        try {
            // Hier würde die tatsächliche API-Anfrage erfolgen
            return [
                {
                    section: 'recipient',
                    text: 'Sehr geehrte Damen und Herren,'
                },
                {
                    section: 'subject',
                    text: `Bewerbung als ${jobData.jobTitle.position}`
                },
                {
                    section: 'main',
                    text: this.generateMainContent(jobData, resumeData, config)
                }
            ];
        } catch (error) {
            console.error('Error in generateCoverLetterSections:', error);
            throw error;
        }
    }

    /**
     * Verbessert ein bestehendes Anschreiben basierend auf Feedback
     * @param {Object} coverLetter - Das bestehende Anschreiben
     * @param {Object} feedback - Feedback-Objekt
     * @returns {Promise<Object>} Verbessertes Anschreiben
     */
    static async refineCoverLetter(coverLetter, feedback) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const updatedLetter = {
                    ...coverLetter,
                    text: coverLetter.text
                        .replace(/too_long/gi, '')
                        .replace(/too_passive/gi, '')
                };
                resolve(updatedLetter);
            }, 1000);
        });
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
