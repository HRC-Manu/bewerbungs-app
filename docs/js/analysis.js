import { ANALYSIS_SETTINGS } from './state.js';

/**
 * Analysiert eine Stellenanzeige
 * @param {string} jobPosting - Der Text der Stellenanzeige
 * @returns {Promise<Object>} Analyseergebnisse
 */
export async function analyzeJobPosting(jobPosting) {
    try {
        if (!jobPosting || typeof jobPosting !== 'string') {
            throw new Error('Ungültige Stellenanzeige');
        }
        const text = jobPosting.toLowerCase();

        const positionInfo = analyzePosition(text);
        const levelInfo = analyzeLevel(text);
        const departmentInfo = analyzeDepartment(text);
        const companyInfo = analyzeCompany(text);
        const requirements = analyzeRequirements(text);

        return {
            jobTitle: {
                position: positionInfo.title,
                level: levelInfo.level,
                department: departmentInfo.name,
                context: {
                    isRemote: checkRemoteWork(text),
                    location: extractLocation(text),
                    teamSize: extractTeamSize(text)
                }
            },
            company: {
                name: companyInfo.name,
                industry: companyInfo.industry,
                culture: companyInfo.culture,
                benefits: extractBenefits(text),
                technologies: extractTechnologies(text)
            },
            requirements: {
                essential: requirements.essential,
                preferred: requirements.preferred,
                experience: requirements.experience,
                education: requirements.education,
                skills: {
                    technical: requirements.technical,
                    soft: requirements.soft
                }
            }
        };
    } catch (error) {
        console.error('Error in analyzeJobPosting:', error);
        throw error;
    }
}

/**
 * Analysiert einen Lebenslauf
 * @param {string} resumeText - Der Text des Lebenslaufs
 * @returns {Promise<Object>} Analyseergebnisse
 */
export async function analyzeResume(resumeText, options = {}) {
    const analysis = {
        personalInfo: {
            name: extractPersonName(resumeText),
            email: extractEmail(resumeText),
            phone: extractPhoneNumber(resumeText),
            currentPosition: extractCurrentPosition(resumeText)
        },
        skills: {
            technical: extractDetailedTechnicalSkills(resumeText),
            soft: extractDetailedSoftSkills(resumeText),
            languages: extractLanguageSkills(resumeText)
        },
        experience: extractDetailedExperience(resumeText),
        education: extractDetailedEducation(resumeText),
        certifications: extractCertifications(resumeText),
        achievements: extractKeyAchievements(resumeText)
    };

    return analysis;
}

function analyzePosition(text) {
    let title = '';
    let category = '';
    
    for (const [cat, keywords] of Object.entries(ANALYSIS_SETTINGS.positions)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            category = cat;
            // Extrahiere den genauen Titel aus dem Text
            const titleMatch = text.match(new RegExp(`(${keywords.join('|')})\\s*(?:als|in|für)?\\s*([\\w\\s]+)`, 'i'));
            if (titleMatch) {
                title = titleMatch[0].trim();
            }
            break;
        }
    }
    
    return { title, category };
}

function analyzeLevel(text) {
    for (const [level, keywords] of Object.entries(ANALYSIS_SETTINGS.levels)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            return { level };
        }
    }
    return { level: 'mid' }; // Default
}

function analyzeDepartment(text) {
    for (const [dept, keywords] of Object.entries(ANALYSIS_SETTINGS.departments)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            return { name: dept };
        }
    }
    return { name: 'other' };
}

function analyzeCompany(text) {
    return {
        name: extractCompanyName(text),
        industry: determineIndustry(text),
        size: determineCompanySize(text),
        culture: analyzeCultureDetails(text)
    };
}

function analyzeCultureDetails(text) {
    const cultureIndicators = {};
    for (const [style, keywords] of Object.entries(ANALYSIS_SETTINGS.culture)) {
        cultureIndicators[style] = keywords.filter(keyword => text.includes(keyword)).length;
    }
    return cultureIndicators;
}

function analyzeRequirements(text) {
    return {
        essential: extractEssentialRequirements(text),
        preferred: extractPreferredRequirements(text),
        experience: extractExperienceRequirements(text),
        education: extractEducationRequirements(text),
        technical: extractTechnicalSkills(text),
        soft: extractSoftSkills(text)
    };
}

function extractEssentialRequirements(text) {
    return extractRequirementsWithIndicators(text, ANALYSIS_SETTINGS.requirements.mustHave);
}

function extractPreferredRequirements(text) {
    return extractRequirementsWithIndicators(text, ANALYSIS_SETTINGS.requirements.niceToHave);
}

function extractRequirementsWithIndicators(text, indicators) {
    const requirements = [];
    const sentences = text.split(/[.!?]+/);
    
    sentences.forEach(sentence => {
        if (indicators.some(indicator => sentence.toLowerCase().includes(indicator))) {
            const requirement = sentence.trim();
            if (requirement) requirements.push(requirement);
        }
    });
    
    return requirements;
}

// Hilfsfunktionen für die Analyse
function extractCompanyName(text) {
    const patterns = [
        /(?:firma|unternehmen|arbeitgeber):\s*([^\n.]+)/i,
        /(?:wir sind|als|bei)\s+(?:die|der)?\s*([A-Z][^\n.]+?(?=\s+(?:suchen|bieten|ist|sind|GmbH|AG|SE)))/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1].trim();
    }
    
    return 'Unbekanntes Unternehmen';
}

function determineIndustry(text) {
    const industries = {
        it: ['software', 'it', 'tech', 'digital'],
        finance: ['bank', 'finanz', 'versicherung'],
        manufacturing: ['produktion', 'fertigung', 'industrie'],
        healthcare: ['gesundheit', 'pharma', 'medizin'],
        consulting: ['beratung', 'consulting']
    };
    
    for (const [industry, keywords] of Object.entries(industries)) {
        if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
            return industry;
        }
    }
    
    return 'other';
}

function determineCompanySize(text) {
    const sizeIndicators = {
        startup: ['startup', 'gründer', 'jung'],
        small: ['klein', 'familiär', '<50'],
        medium: ['mittelstand', 'mittelständisch', '50-250'],
        large: ['konzern', 'international', '>250']
    };
    
    for (const [size, indicators] of Object.entries(sizeIndicators)) {
        if (indicators.some(indicator => text.toLowerCase().includes(indicator))) {
            return size;
        }
    }
    
    return 'unknown';
}

function checkRemoteWork(text) {
    const remoteIndicators = [
        'remote', 'homeoffice', 'home office', 'remote-arbeit',
        'telearbeit', 'von zuhause', 'hybrid'
    ];
    
    return remoteIndicators.some(indicator => text.toLowerCase().includes(indicator));
}

function extractLocation(text) {
    const locationPattern = /(?:standort|ort|location|sitz):\s*([^\n.]+)/i;
    const match = text.match(locationPattern);
    return match ? match[1].trim() : null;
}

function extractTeamSize(text) {
    const patterns = [
        /team\s+von\s+(\d+)/i,
        /(\d+)[\s-]+personen/i,
        /(\d+)[\s-]+mitarbeiter/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return parseInt(match[1]);
    }
    
    return null;
}

function extractBenefits(text) {
    const benefitIndicators = [
        'benefits', 'vorteile', 'leistungen', 'bieten',
        'gehalt', 'urlaub', 'weiterbildung', 'flexible'
    ];
    
    const benefits = [];
    const sentences = text.split(/[.!?]+/);
    
    sentences.forEach(sentence => {
        if (benefitIndicators.some(indicator => sentence.toLowerCase().includes(indicator))) {
            benefits.push(sentence.trim());
        }
    });
    
    return benefits;
}

function extractTechnologies(text) {
    const techPatterns = [
        /(?:technologien|tools|stack):\s*([^\n.]+)/i,
        /(?:entwickeln\smit|arbeiten\smit|einsetzen\svon)\s+([^.]+)/i
    ];
    
    for (const pattern of techPatterns) {
        const match = text.match(pattern);
        if (match) {
            return match[1].split(/[,\/&]/).map(tech => tech.trim());
        }
    }
    
    return [];
}

function extractExperienceRequirements(text) {
    const patterns = [
        /(\d+)[\s-]+jahr[e]?\s+(?:berufs)?erfahrung/i,
        /erfahrung\s+von\s+(\d+)/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return parseInt(match[1]);
    }
    
    return null;
}

function extractEducationRequirements(text) {
    const educationKeywords = [
        'studium', 'ausbildung', 'bachelor', 'master',
        'diplom', 'promotion', 'abschluss'
    ];
    
    const requirements = [];
    const sentences = text.split(/[.!?]+/);
    
    sentences.forEach(sentence => {
        if (educationKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
            requirements.push(sentence.trim());
        }
    });
    
    return requirements;
}

function extractTechnicalSkills(text) {
    const commonTechSkills = [
        'java', 'python', 'javascript', 'html', 'css', 'sql',
        'react', 'angular', 'vue', 'node', 'docker', 'kubernetes',
        'aws', 'azure', 'git', 'agile', 'scrum'
    ];
    
    return commonTechSkills.filter(skill => 
        new RegExp(`\\b${skill}\\b`, 'i').test(text)
    );
}

function extractSoftSkills(text) {
    const softSkills = [
        'kommunikation', 'teamfähigkeit', 'führung', 'projektmanagement',
        'selbstständig', 'analytisch', 'kreativ', 'flexibel'
    ];
    
    return softSkills.filter(skill =>
        text.toLowerCase().includes(skill)
    );
}

// Zusätzliche Extraktionsfunktionen für die Lebenslaufanalyse
function extractEmail(text) {
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0] : null;
}

function extractPhoneNumber(text) {
    const match = text.match(/(?:\+|0)[0-9\s-()]{6,}/);
    return match ? match[0] : null;
}

function extractCurrentPosition(text) {
    const patterns = [
        /(?:position|stelle|beruf):\s*([^\n.]+)/i,
        /(?:als|position)\s+([^\n.]+?(?=\s+(?:bei|seit)))/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1].trim();
    }
    
    return null;
}

function extractDetailedTechnicalSkills(text) {
    const skillCategories = {
        programmingLanguages: ['java', 'python', 'javascript', 'c++', 'c#'],
        frameworks: ['react', 'angular', 'vue', 'spring', 'django'],
        databases: ['sql', 'mongodb', 'postgresql', 'mysql'],
        tools: ['git', 'docker', 'kubernetes', 'jenkins'],
        cloud: ['aws', 'azure', 'gcp']
    };
    
    const foundSkills = {};
    
    for (const [category, skills] of Object.entries(skillCategories)) {
        foundSkills[category] = skills.filter(skill => 
            new RegExp(`\\b${skill}\\b`, 'i').test(text)
        );
    }
    
    return foundSkills;
}

function extractDetailedSoftSkills(text) {
    const softSkillCategories = {
        leadership: ['führung', 'leitung', 'management'],
        communication: ['kommunikation', 'präsentation', 'moderation'],
        teamwork: ['teamfähigkeit', 'zusammenarbeit', 'kooperation'],
        methodology: ['agile', 'scrum', 'kanban']
    };
    
    const foundSkills = {};
    
    for (const [category, skills] of Object.entries(softSkillCategories)) {
        foundSkills[category] = skills.filter(skill =>
            text.toLowerCase().includes(skill)
        );
    }
    
    return foundSkills;
}

function extractLanguageSkills(text) {
    const languages = {
        deutsch: ['deutsch', 'muttersprache', 'german'],
        englisch: ['englisch', 'english'],
        französisch: ['französisch', 'french'],
        spanisch: ['spanisch', 'spanish']
    };
    
    const levels = {
        native: ['muttersprache', 'native'],
        fluent: ['fließend', 'fluent', 'c2', 'c1'],
        advanced: ['fortgeschritten', 'advanced', 'b2'],
        intermediate: ['mittel', 'intermediate', 'b1'],
        basic: ['grundkenntnisse', 'basic', 'a2', 'a1']
    };
    
    const foundLanguages = {};
    
    for (const [language, keywords] of Object.entries(languages)) {
        if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
            // Bestimme das Niveau
            let foundLevel = 'unknown';
            for (const [level, levelKeywords] of Object.entries(levels)) {
                const languageContext = text.toLowerCase().split(/[.!?]+/).find(
                    sentence => keywords.some(keyword => sentence.includes(keyword))
                );
                if (languageContext && levelKeywords.some(
                    keyword => languageContext.includes(keyword)
                )) {
                    foundLevel = level;
                    break;
                }
            }
            foundLanguages[language] = foundLevel;
        }
    }
    
    return foundLanguages;
}

function extractDetailedExperience(text) {
    const experiences = [];
    const experienceBlocks = text.split(/\n{2,}/);
    
    experienceBlocks.forEach(block => {
        const datePattern = /(\d{2}\/\d{4}|\d{4})\s*-\s*(\d{2}\/\d{4}|\d{4}|heute|present)/i;
        const dateMatch = block.match(datePattern);
        
        if (dateMatch) {
            experiences.push({
                period: {
                    from: dateMatch[1],
                    to: dateMatch[2]
                },
                description: block.replace(datePattern, '').trim()
            });
        }
    });
    
    return experiences;
}

function extractDetailedEducation(text) {
    const education = [];
    const educationBlocks = text.split(/\n{2,}/);
    
    educationBlocks.forEach(block => {
        if (block.toLowerCase().includes('studium') || 
            block.toLowerCase().includes('ausbildung') ||
            block.toLowerCase().includes('schule')) {
            
            const datePattern = /(\d{2}\/\d{4}|\d{4})\s*-\s*(\d{2}\/\d{4}|\d{4}|heute|present)/i;
            const dateMatch = block.match(datePattern);
            
            education.push({
                period: dateMatch ? {
                    from: dateMatch[1],
                    to: dateMatch[2]
                } : null,
                description: block.replace(datePattern, '').trim()
            });
        }
    });
    
    return education;
}

function extractCertifications(text) {
    const certifications = [];
    const certKeywords = ['zertifikat', 'zertifizierung', 'certificate'];
    
    const sentences = text.split(/[.!?]+/);
    sentences.forEach(sentence => {
        if (certKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
            certifications.push(sentence.trim());
        }
    });
    
    return certifications;
}

function extractKeyAchievements(text) {
    const achievements = [];
    const achievementKeywords = [
        'erfolg', 'achievement', 'auszeichnung', 'preis',
        'gewonnen', 'entwickelt', 'implementiert', 'optimiert'
    ];
    
    const sentences = text.split(/[.!?]+/);
    sentences.forEach(sentence => {
        if (achievementKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
            achievements.push(sentence.trim());
        }
    });
    
    return achievements;
} 
