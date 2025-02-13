/* Globaler Kontext vor DOMContentLoaded */
var globalElements = null;

window.applySuggestions = function(suggestions) {
    if (!globalElements) {
        console.warn('globalElements ist noch nicht initialisiert, wende applySuggestions später an.');
        document.addEventListener('DOMContentLoaded', function() {
            window.applySuggestions(suggestions);
        });
        return;
    }
    if (!suggestions || !Array.isArray(suggestions)) return;
    suggestions.forEach(suggestion => {
        if (globalElements.coverLetterSections && globalElements.coverLetterSections[suggestion.section]) {
            globalElements.coverLetterSections[suggestion.section].value = suggestion.text;
        }
    });
    if (typeof window.updatePreview === 'function') {
        window.updatePreview();
    }
};


/* Bestehender Code */
if (typeof window.applySuggestions === 'undefined') {
    window.applySuggestions = function() {
        console.warn('applySuggestions wurde noch nicht initialisiert.');
    };
}

document.addEventListener('DOMContentLoaded', function() {
    // ===== Bootstrap Modals =====
    const modals = {
        suggestions: new bootstrap.Modal(document.getElementById('suggestionsModal')),
        help: new bootstrap.Modal(document.getElementById('helpModal'))
    };

    // ===== Schreibassistent Konstanten =====
    const WRITING_STYLES = {
        formal: {
            name: 'Formell',
            description: 'Professionell und geschäftlich',
            examples: {
                greetings: ['Sehr geehrte Damen und Herren,', 'Sehr geehrte Frau [Name],', 'Sehr geehrter Herr [Name],'],
                closings: ['Mit freundlichen Grüßen', 'Beste Grüße', 'Freundliche Grüße']
            }
        },
        casual: {
            name: 'Modern',
            description: 'Professionell aber persönlich',
            examples: {
                greetings: ['Guten Tag,', 'Hallo Frau [Name],', 'Hallo Herr [Name],'],
                closings: ['Viele Grüße', 'Beste Grüße', 'Mit besten Grüßen']
            }
        }
    };

    const IMPROVEMENT_PATTERNS = {
        passive: {
            pattern: /wurde|werden|worden/g,
            suggestion: 'Verwenden Sie aktive Formulierungen für mehr Wirkung'
        },
        filler: {
            pattern: /eigentlich|quasi|sozusagen|gewissermaßen/g,
            suggestion: 'Vermeiden Sie Füllwörter für präzisere Aussagen'
        },
        weak: {
            pattern: /vielleicht|eventuell|möglicherweise|könnte|würde/g,
            suggestion: 'Nutzen Sie stärkere Formulierungen für mehr Überzeugungskraft'
        }
    };

    // ===== DOM Elemente =====
    const elements = {
        // Eingabefelder
        jobPosting: document.getElementById('jobPosting'),
        resumeUpload: document.getElementById('resumeUpload'),
        coverLetterUpload: document.getElementById('coverLetterUpload'),
        
        // Buttons
        analyzeBtn: document.getElementById('analyzeBtn'),
        generateSuggestionsBtn: document.getElementById('generateSuggestionsBtn'),
        
        // Vorschau
        coverLetterPreview: document.getElementById('coverLetterPreview'),
        resumePreview: document.getElementById('resumePreview'),
        
        // Anschreiben-Abschnitte
        coverLetterSections: {
            recipient: document.getElementById('coverLetterRecipient'),
            subject: document.getElementById('coverLetterSubject'),
            introduction: document.getElementById('coverLetterIntro'),
            main: document.getElementById('coverLetterMain'),
            closing: document.getElementById('coverLetterClosing')
        },
        
        // Modals und Toasts
        suggestionsModal: modals.suggestions,
        helpModal: modals.help,
        messageToast: new bootstrap.Toast(document.getElementById('messageToast'))
    };

    // Übergabe der DOM Elemente in den globalen Kontext
    globalElements = elements;

    // ===== Event Listener =====
    function initializeEventListeners() {
        // Help Button
        document.getElementById('helpBtn').addEventListener('click', () => {
            elements.helpModal.show();
        });

        // Analyze Button
        elements.analyzeBtn.addEventListener('click', handleAnalyze);

        // Datei-Uploads
        initializeFileUpload();

        // Initialisiere Textbereich-Listener
        initializeTextareaListeners();
    }

    // ===== Analyse-Einstellungen =====
    const ANALYSIS_SETTINGS = {
        positions: {
            developer: ['entwickler', 'programmierer', 'software engineer', 'full-stack', 'frontend', 'backend', 'web developer', 'app developer'],
            manager: ['manager', 'leiter', 'führungskraft', 'teamleiter', 'projektleiter', 'gruppenleiter', 'abteilungsleiter'],
            consultant: ['berater', 'consultant', 'architekt', 'spezialist', 'experte'],
            analyst: ['analyst', 'data scientist', 'business intelligence', 'datenanalyst', 'market researcher']
        },
        levels: {
            junior: ['junior', 'entry level', 'berufseinsteiger', 'trainee', 'praktikant'],
            senior: ['senior', 'erfahren', 'expert', 'professional', 'spezialist'],
            lead: ['lead', 'principal', 'head of', 'leitung', 'chief', 'direktor']
        },
        departments: {
            it: ['it', 'edv', 'software', 'entwicklung', 'tech', 'digital', 'system', 'application'],
            hr: ['hr', 'personal', 'recruiting', 'talent', 'human resources', 'personalabteilung'],
            finance: ['finance', 'finanzen', 'controlling', 'buchhaltung', 'rechnungswesen'],
            sales: ['sales', 'vertrieb', 'marketing', 'business development', 'account management']
        },
        culture: {
            formal: ['etabliert', 'traditionell', 'strukturiert', 'corporate', 'konzern', 'bank', 'versicherung'],
            casual: ['startup', 'dynamisch', 'agil', 'modern', 'jung', 'kreativ', 'flexibel'],
            innovative: ['innovativ', 'zukunftsorientiert', 'digital', 'technologieführer', 'vorreiter']
        },
        requirements: {
            mustHave: ['muss', 'zwingend', 'notwendig', 'erforderlich', 'vorausgesetzt'],
            niceToHave: ['wünschenswert', 'von vorteil', 'plus', 'ideal', 'gerne']
        }
    };

    // Textbausteine für Anschreiben
    const LETTER_TEMPLATES = {
        recipient: {
            formal: {
                known: (name) => `Sehr geehrte/r Frau/Herr ${name},`,
                unknown: 'Sehr geehrte Damen und Herren,'
            },
            casual: {
                known: (name) => `Hallo ${name},`,
                unknown: 'Hallo,'
            }
        },
        subject: {
            standard: (position, refNumber = '') => 
                `Bewerbung als ${position}${refNumber ? ` (Referenz: ${refNumber})` : ''}`,
            experienced: (position, years) => 
                `Erfahrene/r ${position} (${years} Jahre Berufserfahrung) sucht neue Herausforderung`
        },
        introduction: {
            jobPortal: (position, company) => 
                `mit großem Interesse habe ich Ihre Stellenanzeige als ${position} bei ${company} gelesen.`,
            recommendation: (position, referrer) => 
                `auf Empfehlung von ${referrer} bewerbe ich mich auf die Position als ${position} in Ihrem Unternehmen.`,
            initiative: (company) => 
                `Ihr Unternehmen ${company} hat mich durch seine innovative Ausrichtung und spannenden Projekte überzeugt.`
        },
        closing: {
            standard: 'Ich freue mich auf ein persönliches Gespräch.',
            availability: (date) => 
                `Ich könnte zum ${date} bei Ihnen anfangen und freue mich auf Ihre Einladung zu einem persönlichen Gespräch.`,
            flexible: 'Ich bin zeitlich flexibel und freue mich auf Ihre Einladung zu einem persönlichen Gespräch.'
        }
    };

    /**
     * Führt grundlegende Textanalysen (z.B. Position, Level, Abteilung) durch.
     * @function basicTextAnalysis
     * @param {string} text - Der zu analysierende Text 
     * @returns {Object} Enthält Felder wie positionInfo, levelInfo, departmentInfo
     */
    function basicTextAnalysis(text) {
        // Hier bündeln wir Logik aus z.B. analyzePosition, analyzeLevel, analyzeDepartment
        // anstatt sie dreimal zu wiederholen.
        const positionInfo = analyzePosition(text);
        const levelInfo = analyzeLevel(text);
        const departmentInfo = analyzeDepartment(text);

        return {
            positionInfo,
            levelInfo,
            departmentInfo
        };
    }

    /**
     * Analysiert den Text einer Stellenanzeige.
     * @async
     * @function analyzeJobPosting
     * @param {string} jobPosting - Der Text der Stellenanzeige
     * @returns {Promise<Object>} - Liefert ein Objekt mit Analyseinformationen (z.B. Position, Anforderungen)
     */
    async function analyzeJobPosting(jobPosting) {
        try {
            if (!jobPosting || typeof jobPosting !== 'string') {
                throw new Error('Ungültige Stellenanzeige');
            }
            const text = jobPosting.toLowerCase();

            // Gemeinsame Basisanalyse
            const { positionInfo, levelInfo, departmentInfo } = basicTextAnalysis(text);

            // Dann kann man hier Details wie companyInfo, requirements usw. ergänzen
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
            console.error('Analyse Fehler:', error);
            throw new Error(`Analyse fehlgeschlagen: ${error.message}`);
        }
    }

    function analyzePosition(text) {
        const positions = {
            development: ['entwickler', 'programmierer', 'software engineer', 'full-stack', 'frontend', 'backend'],
            management: ['manager', 'leiter', 'führungskraft', 'teamleiter', 'projektleiter'],
            consulting: ['berater', 'consultant', 'architekt'],
            analysis: ['analyst', 'data scientist', 'business intelligence']
        };
        
        let bestMatch = { title: 'Nicht spezifiziert', confidence: 0 };
        
        for (const [category, keywords] of Object.entries(positions)) {
            const matches = keywords.filter(keyword => text.includes(keyword));
            const confidence = matches.length / keywords.length;
            
            if (confidence > bestMatch.confidence) {
                bestMatch = {
                    title: category,
                    confidence: confidence,
                    matches: matches
                };
            }
        }
        
        return bestMatch;
    }

    function analyzeLevel(text) {
        const levels = {
            junior: {
                keywords: ['junior', 'entry level', 'berufseinsteiger'],
                experience: '0-3 Jahre'
            },
            middle: {
                keywords: ['erfahren', 'professional'],
                experience: '3-5 Jahre'
            },
            senior: {
                keywords: ['senior', 'expert', 'lead'],
                experience: '5+ Jahre'
            }
        };
        
        let bestMatch = { level: 'Nicht spezifiziert', confidence: 0 };
        
        for (const [level, info] of Object.entries(levels)) {
            const matches = info.keywords.filter(keyword => text.includes(keyword));
            const confidence = matches.length / info.keywords.length;
            
            if (confidence > bestMatch.confidence) {
                bestMatch = {
                    level: level,
                    experience: info.experience,
                    confidence: confidence
                };
            }
        }
        
        return bestMatch;
    }

    function analyzeDepartment(text) {
        const departments = {
            it: ['it', 'edv', 'software', 'entwicklung', 'tech'],
            hr: ['hr', 'personal', 'recruiting'],
            finance: ['finance', 'finanzen', 'controlling'],
            sales: ['sales', 'vertrieb', 'marketing']
        };
        
        let bestMatch = { name: 'Nicht spezifiziert', confidence: 0 };
        
        for (const [dept, keywords] of Object.entries(departments)) {
            const matches = keywords.filter(keyword => text.includes(keyword));
            const confidence = matches.length / keywords.length;
            
            if (confidence > bestMatch.confidence) {
                bestMatch = {
                    name: dept,
                    confidence: confidence,
                    matches: matches
                };
            }
        }
        
        return bestMatch;
    }

    function analyzeCompany(text) {
        return {
            name: extractCompanyName(text),
            industry: determineIndustry(text),
            culture: analyzeCultureDetails(text),
            size: determineCompanySize(text)
        };
    }

    function analyzeCultureDetails(text) {
        const culturalAspects = {
            formal: ['etabliert', 'traditionell', 'strukturiert', 'corporate'],
            casual: ['startup', 'dynamisch', 'agil', 'modern'],
            innovative: ['innovativ', 'zukunftsorientiert', 'digital']
        };
        
        const matchedAspects = {};
        
        for (const [aspect, indicators] of Object.entries(culturalAspects)) {
            const matches = indicators.filter(indicator => text.includes(indicator));
            if (matches.length > 0) {
                matchedAspects[aspect] = {
                    score: matches.length / indicators.length,
                    matches: matches
                };
            }
        }
        
        return matchedAspects;
    }

    function analyzeRequirements(text) {
        const sections = text.split(/(?:anforderungen|qualifikationen|ihr profil|wir erwarten|sie bringen mit):/i);
        
        if (sections.length < 2) return {
            essential: [],
            preferred: [],
            experience: [],
            education: [],
            technical: [],
            soft: []
        };
        
        const requirementsText = sections[1];
        const requirements = {
            essential: extractEssentialRequirements(requirementsText),
            preferred: extractPreferredRequirements(requirementsText),
            experience: extractExperienceRequirements(requirementsText),
            education: extractEducationRequirements(requirementsText),
            technical: extractTechnicalSkills(requirementsText),
            soft: extractSoftSkills(requirementsText)
        };
        
        return requirements;
    }

    function extractEssentialRequirements(text) {
        const mustHaveIndicators = ['muss', 'zwingend', 'notwendig', 'erforderlich'];
        return extractRequirementsWithIndicators(text, mustHaveIndicators);
    }

    function extractPreferredRequirements(text) {
        const niceToHaveIndicators = ['wünschenswert', 'von vorteil', 'plus', 'ideal'];
        return extractRequirementsWithIndicators(text, niceToHaveIndicators);
    }

    function extractRequirementsWithIndicators(text, indicators) {
        const requirements = [];
        const lines = text.split('\n');
        
        lines.forEach(line => {
            if (indicators.some(indicator => line.includes(indicator))) {
                const requirement = line.trim()
                    .replace(/^[-•*]\s*/, '')
                    .replace(new RegExp(`(${indicators.join('|')})`, 'i'), '')
                    .trim();
                if (requirement) {
                    requirements.push(requirement);
                }
            }
        });
        
        return requirements;
    }

    // ===== Analyse-Hilfsfunktionen =====
    function calculateMatchScore(job, resume) {
        try {
            const scoringCriteria = {
                position: {
                    weight: 0.25,
                    score: calculatePositionMatch(job, resume)
                },
                skills: {
                    weight: 0.3,
                    score: calculateSkillsMatch(job, resume)
                },
                experience: {
                    weight: 0.2,
                    score: calculateExperienceMatch(job, resume)
                },
                education: {
                    weight: 0.1,
                    score: calculateEducationMatch(job, resume)
                },
                softSkills: {
                    weight: 0.15,
                    score: calculateSoftSkillsMatch(job, resume)
                }
            };
            
            let totalScore = 0;
            let totalWeight = 0;
            
            for (const [criterion, details] of Object.entries(scoringCriteria)) {
                totalScore += details.score * details.weight;
                totalWeight += details.weight;
            }
            
            // Normalisiere den Score
            const normalizedScore = totalScore / totalWeight;
            
            return {
                overallScore: normalizedScore,
                detailedScores: scoringCriteria
            };
        } catch (error) {
            console.error('Error calculating match score:', error);
            return {
                overallScore: 0,
                detailedScores: {}
            };
        }
    }

    function calculatePositionMatch(job, resume) {
        const jobPosition = job.jobTitle.position.toLowerCase();
        const resumePosition = resume.personalInfo.position.toLowerCase();
        
        const positionSimilarityMap = {
            'entwickler': ['software engineer', 'programmierer', 'web developer'],
            'manager': ['teamleiter', 'projektleiter', 'abteilungsleiter'],
            'berater': ['consultant', 'spezialist', 'architekt']
        };
        
        // Exakte Übereinstimmung
        if (resumePosition === jobPosition) return 1;
        
        // Ähnliche Positionen
        for (const [basePosition, similarPositions] of Object.entries(positionSimilarityMap)) {
            if (jobPosition.includes(basePosition) && 
                similarPositions.some(pos => resumePosition.includes(pos))) {
                return 0.8;
            }
        }
        
        // Teilweise Übereinstimmung
        const commonWords = jobPosition.split(' ').filter(word => 
            resumePosition.includes(word)
        );
        
        return commonWords.length / jobPosition.split(' ').length;
    }

    function calculateSkillsMatch(job, resume) {
        const requiredTechnicalSkills = job.requirements.skills.technical;
        const requiredSoftSkills = job.requirements.skills.soft;
        
        const resumeTechnicalSkills = resume.skills.technical.flatMap(skill => 
            skill.skills || [skill]
        );
        const resumeSoftSkills = resume.skills.soft.flatMap(skill => 
            skill.skills || [skill]
        );
        
        const technicalSkillScore = calculateSkillCategoryMatch(
            requiredTechnicalSkills, 
            resumeTechnicalSkills
        );
        
        const softSkillScore = calculateSkillCategoryMatch(
            requiredSoftSkills, 
            resumeSoftSkills
        );
        
        // Gewichtete Bewertung von technischen und Soft Skills
        return (technicalSkillScore * 0.7) + (softSkillScore * 0.3);
    }

    function calculateSkillCategoryMatch(requiredSkills, candidateSkills) {
        if (requiredSkills.length === 0) return 1;
        
        const matchedSkills = requiredSkills.filter(requiredSkill => 
            candidateSkills.some(candidateSkill => 
                candidateSkill.toLowerCase().includes(requiredSkill.toLowerCase())
            )
        );
        
        return matchedSkills.length / requiredSkills.length;
    }

    function calculateExperienceMatch(job, resume) {
        const jobExperienceRequirement = extractExperienceYears(job.requirements.experience);
        const candidateExperience = resume.experience;
        
        if (!candidateExperience || candidateExperience.length === 0) return 0;
        
        const totalExperience = candidateExperience.reduce(
            (total, exp) => total + exp.duration, 
            0
        );
        
        // Vergleiche Gesamterfahrung mit Anforderungen
        if (totalExperience >= jobExperienceRequirement.min) {
            return Math.min(1, totalExperience / jobExperienceRequirement.max);
        }
        
        return 0;
    }

    function extractExperienceYears(experienceText) {
        const yearPattern = /(\d+)\s*-?\s*(\d+)?\s*(?:jahre?)?/i;
        const match = experienceText.match(yearPattern);
        
        if (match) {
            return {
                min: parseInt(match[1]),
                max: match[2] ? parseInt(match[2]) : parseInt(match[1]) + 2
            };
        }
        
        return { min: 0, max: 5 };
    }

    function calculateEducationMatch(job, resume) {
        const jobEducationRequirement = job.requirements.education;
        const candidateEducation = resume.education;
        
        if (!candidateEducation || candidateEducation.length === 0) return 0;
        
        const educationLevels = {
            university: ['bachelor', 'master', 'diplom', 'magister'],
            vocational: ['ausbildung', 'berufsausbildung'],
            school: ['abitur', 'fachabitur']
        };
        
        const candidateDegrees = candidateEducation.map(edu => 
            edu.degree.toLowerCase()
        );
        
        // Prüfe Übereinstimmung mit Bildungsanforderungen
        for (const [level, degrees] of Object.entries(educationLevels)) {
            if (level === jobEducationRequirement && 
                candidateDegrees.some(degree => 
                    degrees.some(requiredDegree => 
                        degree.includes(requiredDegree)
                    )
                )) {
                return 1;
            }
        }
        
        return 0;
    }

    function calculateSoftSkillsMatch(job, resume) {
        const requiredSoftSkills = job.requirements.skills.soft;
        const resumeSoftSkills = resume.skills.soft.flatMap(skill => 
            skill.skills || [skill]
        );
        
        const softSkillCategories = {
            communication: ['kommunikation', 'präsentation'],
            teamwork: ['teamfähigkeit', 'zusammenarbeit'],
            leadership: ['führung', 'mentoring'],
            problemSolving: ['analytisch', 'problemlösung'],
            adaptability: ['flexibilität', 'lernbereitschaft']
        };
        
        let categoryScore = 0;
        
        for (const [category, keywords] of Object.entries(softSkillCategories)) {
            const categoryMatch = keywords.some(keyword => 
                requiredSoftSkills.some(skill => 
                    skill.toLowerCase().includes(keyword)
                )
            );
            
            if (categoryMatch) {
                const resumeCategoryMatch = keywords.some(keyword => 
                    resumeSoftSkills.some(skill => 
                        skill.toLowerCase().includes(keyword)
                    )
                );
                
                categoryScore += resumeCategoryMatch ? 1 : 0.5;
            }
        }
        
        return categoryScore / Object.keys(softSkillCategories).length;
    }

    function findMostRelevantExperience(job, resume) {
        try {
            if (!resume.experience || resume.experience.length === 0) {
                return null;
            }
            
            const relevantExperience = resume.experience
                .filter(exp => {
                    const positionMatch = exp.title.toLowerCase().includes(job.jobTitle.position.toLowerCase());
                    const skillsMatch = job.requirements.skills.technical.some(skill =>
                        exp.description.toLowerCase().includes(skill.toLowerCase())
                    );
                    return positionMatch || skillsMatch;
                })
                .sort((a, b) => b.duration - a.duration);
            
            return relevantExperience[0] || null;
        } catch (error) {
            console.error('Error finding relevant experience:', error);
            return null;
        }
    }

    function identifyKeySkills(job, resume) {
        try {
            const requiredSkills = new Set([
                ...job.requirements.skills.technical,
                ...job.requirements.skills.soft
            ].map(skill => skill.toLowerCase()));
            
            const candidateSkills = new Set([
                ...resume.skills.technical,
                ...resume.skills.soft
            ].map(skill => skill.toLowerCase()));
            
            const matchingSkills = [...requiredSkills].filter(skill => candidateSkills.has(skill));
            const missingSkills = [...requiredSkills].filter(skill => !candidateSkills.has(skill));
            const additionalSkills = [...candidateSkills].filter(skill => !requiredSkills.has(skill));
            
            return {
                matching: matchingSkills,
                missing: missingSkills,
                additional: additionalSkills
            };
        } catch (error) {
            console.error('Error identifying key skills:', error);
            return {
                matching: [],
                missing: [],
                additional: []
            };
        }
    }

    function analyzeCultureFit(job, resume) {
        try {
            const culturalAspects = {
                formal: ['strukturiert', 'professionell', 'methodisch'],
                innovative: ['kreativ', 'innovativ', 'agil'],
                teamOriented: ['team', 'zusammenarbeit', 'kommunikativ']
            };
            
            const companyValues = Object.values(job.company.culture).flat();
            const candidateValues = resume.experience
                .map(exp => exp.description.toLowerCase())
                .join(' ');
            
            const fitScore = {};
            
            for (const [aspect, keywords] of Object.entries(culturalAspects)) {
                const matchCount = keywords.filter(keyword =>
                    companyValues.includes(keyword) && candidateValues.includes(keyword)
                ).length;
                
                fitScore[aspect] = matchCount / keywords.length;
            }
            
            return fitScore;
        } catch (error) {
            console.error('Error analyzing culture fit:', error);
            return {};
        }
    }

    function generatePersonalizedContent(section, analysisData, style, context) {
        try {
            const { job, resume } = analysisData;
            const { matchScore, relevantExperience, keySkills, cultureFit } = context;
            let content = '';
            
            // Dynamische Stilanpassung basierend auf Unternehmenskultur
            const dynamicStyle = determineDynamicStyle(job, matchScore);
            
            switch (section) {
                case 'recipient':
                    content = generateRecipientSection(job, resume, dynamicStyle);
                    break;
                    
                case 'subject':
                    content = generateSubjectSection(job, resume, matchScore);
                    break;
                    
                case 'introduction':
                    content = generateIntroductionSection(job, resume, relevantExperience, dynamicStyle);
                    break;
                    
                case 'main':
                    content = generateMainSection(job, resume, keySkills, relevantExperience, cultureFit);
                    break;
                
                case 'closing':
                    content = generateClosingSection(job, resume, matchScore, dynamicStyle);
                    break;
                
                default:
                    content = '';
            }
            
            return content;
        } catch (error) {
            console.error('Error generating personalized content:', error);
            return '';
        }
    }

    function determineDynamicStyle(job, matchScore) {
        const { culture } = job.company;
        
        if (culture.formal && culture.formal.score > 0.5) {
            return 'formal';
        } else if (matchScore > 0.8) {
            return 'confident';
        } else {
            return 'casual';
        }
    }

    function generateRecipientSection(job, resume, style) {
        const companyName = job.company.name;
        const recipientTemplates = {
            formal: {
                known: (name) => `Sehr geehrte/r Frau/Herr ${name},`,
                unknown: 'Sehr geehrte Damen und Herren,'
            },
            casual: {
                known: (name) => `Hallo ${name},`,
                unknown: 'Hallo zusammen,'
            }
        };
        
        // Versuche, den Namen des Ansprechpartners zu extrahieren
        const recipientName = extractRecipientName(job.jobPosting);
        
        return recipientName 
            ? recipientTemplates[style].known(recipientName)
            : recipientTemplates[style].unknown;
    }

    function extractRecipientName(jobPosting) {
        const namePatterns = [
            /(?:ansprechpartner|kontakt):\s*([A-ZÄÖÜa-zäöüß\s-]+)/i,
            /(?:herr|frau)\s+([A-ZÄÖÜa-zäöüß\s-]+)/i
        ];
        
        for (const pattern of namePatterns) {
            const match = jobPosting.match(pattern);
            if (match) return match[1].trim();
        }
        
        return null;
    }

    function generateSubjectSection(job, resume, matchScore) {
        const position = job.jobTitle.position;
        const refNumber = extractReferenceNumber(job.jobPosting);
        
        const subjectTemplates = [
            () => `Bewerbung als ${position}${refNumber ? ` (Referenz: ${refNumber})` : ''}`,
            () => `Motivierte Bewerbung für die Position ${position}`,
            () => `${position} mit ${Math.round(matchScore * 100)}% Übereinstimmung`
        ];
        
        return subjectTemplates[Math.floor(Math.random() * subjectTemplates.length)]();
    }

    function extractReferenceNumber(jobPosting) {
        const refPatterns = [
            /(?:referenz|ref\.?)[\s:]+(\w+)/i,
            /stellenausschreibung\s+(\w+)/i
        ];
        
        for (const pattern of refPatterns) {
            const match = jobPosting.match(pattern);
            if (match) return match[1].trim();
        }
        
        return null;
    }

    function generateIntroductionSection(job, resume, relevantExperience, style) {
        const company = job.company.name;
        const position = job.jobTitle.position;
        
        const introTemplates = {
            formal: [
                () => `Mit großem Interesse habe ich Ihre Stellenanzeige für die Position ${position} bei ${company} gelesen.`,
                () => `Die Ausschreibung der Stelle als ${position} bei ${company} hat meine volle Aufmerksamkeit geweckt.`
            ],
            casual: [
                () => `Ihre Stellenausschreibung für ${position} bei ${company} hat mich sofort begeistert.`,
                () => `Als ich die Stellenanzeige für ${position} bei ${company} sah, war ich elektrisiert.`
            ]
        };
        
        const sourceTemplates = [
            () => 'auf Ihrer Unternehmenswebsite',
            () => 'auf einem Jobportal',
            () => 'über mein berufliches Netzwerk'
        ];
        
        const source = sourceTemplates[Math.floor(Math.random() * sourceTemplates.length)]();
        
        const templateSet = introTemplates[style];
        return templateSet[Math.floor(Math.random() * templateSet.length)]();
    }

    function generateMainSection(job, resume, keySkills, relevantExperience, cultureFit) {
        const mainSectionParts = [];
        
        // Relevante Erfahrung hervorheben
        if (relevantExperience) {
            mainSectionParts.push(
                `Mit meiner Erfahrung als ${relevantExperience.title} bei ${relevantExperience.company} bringe ich genau die Qualifikationen mit, die Sie suchen.`
            );
        }
        
        // Matching Skills betonen
        if (keySkills.matching.length > 0) {
            mainSectionParts.push(
                `Meine Kernkompetenzen in ${keySkills.matching.join(', ')} entsprechen präzise Ihren Anforderungen.`
            );
        }
        
        // Zusätzliche Skills hervorheben
        if (keySkills.additional.length > 0) {
            mainSectionParts.push(
                `Darüber hinaus verfüge ich über zusätzliche Expertise in ${keySkills.additional.slice(0, 3).join(', ')}, die einen Mehrwert für Ihr Team bieten kann.`
            );
        }
        
        // Neue Einbindung: Falls im Lebenslauf Erfolge (achievements) vorhanden sind, diese einfließen lassen
        if (resume.achievements && resume.achievements.length > 0) {
            mainSectionParts.push(
                `Meine herausragenden Erfolge, wie ${resume.achievements.slice(0, 3).join(', ')}, unterstreichen meine Eignung für diese Position.`
            );
        }
        
        // Kulturelle Passung betonen
        const culturalAspects = Object.entries(cultureFit)
            .filter(([_, score]) => score > 0.5)
            .map(([aspect, _]) => aspect);
        
        if (culturalAspects.length > 0) {
            mainSectionParts.push(
                `Meine ${culturalAspects.join(', ')}-Fähigkeiten passen hervorragend zur Unternehmenskultur von ${job.company.name}.`
            );
        }
        
        // Motivation und Ziel
        mainSectionParts.push(
            `Die Position als ${job.jobTitle.position} bei ${job.company.name} reizt mich besonders, da sie meinem Wunsch nach ${job.company.culture.innovative ? 'innovativer Arbeit' : 'spannenden Herausforderungen'} entspricht.`
        );
        
        return mainSectionParts.join(' ');
    }

    function generateClosingSection(job, resume, matchScore, style) {
        const closingTemplates = {
            formal: [
                () => 'Ich freue mich darauf, in einem persönlichen Gespräch meine Eignung für diese Position zu erläutern.',
                () => 'Gerne stelle ich Ihnen in einem Vorstellungsgespräch meine Qualifikationen und Motivation detailliert vor.'
            ],
            casual: [
                () => 'Ich würde mich sehr freuen, meine Ideen und Fähigkeiten in einem persönlichen Gespräch zu diskutieren.',
                () => 'Lassen Sie uns in einem Gespräch herausfinden, wie ich Ihr Team unterstützen kann.'
            ]
        };
        
        const availabilityTemplates = [
            () => 'Ich bin ab sofort verfügbar.',
            () => `Ich könnte bereits zum ${formatStartDate()} bei Ihnen beginnen.`
        ];
        
        const templateSet = closingTemplates[style];
        const closing = templateSet[Math.floor(Math.random() * templateSet.length)]();
        const availability = availabilityTemplates[Math.floor(Math.random() * availabilityTemplates.length)]();
        
        return `${closing} ${availability}`;
    }

    function formatStartDate() {
        const possibleDates = [
            '01.07.2024',
            '01.08.2024',
            '15.07.2024',
            'nächsten Monat',
            'nach Absprache'
        ];
        
        return possibleDates[Math.floor(Math.random() * possibleDates.length)];
    }

    function generateContextualAlternatives(suggestion, style, context) {
        try {
            const alternatives = [];
            const { matchScore } = context;
            
            // Formelle Alternative
            alternatives.push(improveText(suggestion, 'formal').text);
            
            // Selbstbewusste Alternative (bei hohem Match-Score)
            if (matchScore > 0.7) {
                alternatives.push(improveText(suggestion, 'confident').text);
            }
            
            // Moderne Alternative
            alternatives.push(improveText(suggestion, 'casual').text);
            
            return alternatives.filter(alt => alt !== suggestion);
        } catch (error) {
            console.error('Error generating alternatives:', error);
            return [];
        }
    }

    function extractKeyPoints(text) {
        try {
            const sentences = text.split(/[.!?]+/).filter(s => s.trim());
            return sentences.map(sentence => ({
                text: sentence.trim(),
                type: determineStatementType(sentence)
            }));
        } catch (error) {
            console.error('Error extracting key points:', error);
            return [];
        }
    }

    function determineStatementType(sentence) {
        const types = {
            experience: ['erfahrung', 'gearbeitet', 'tätig'],
            skills: ['kenntnisse', 'fähigkeiten', 'kompetenzen'],
            motivation: ['interessiert', 'reizt', 'begeistert'],
            education: ['studium', 'ausbildung', 'abschluss']
        };
        
        for (const [type, keywords] of Object.entries(types)) {
            if (keywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
                return type;
            }
        }
        
        return 'other';
    }

    /**
     * Lädt die Job-Posting- und Resume-Inhalte, validiert die Eingaben und leitet die Analyse ein.
     * @async
     * @function handleAnalyze
     * @returns {Promise<void>}
     */
    async function handleAnalyze() {
        try {
            if (!validateInputs()) {
                return;
            }

            // Prüfen ob der Lebenslauf bereits hochgeladen wurde
            if (!window.resumeText || window.resumeText.trim().length < 10) {
                showError('Ihr Lebenslauf scheint leer oder unzureichend zu sein.');
                return;
            }

            // Analyse-Button deaktivieren und Ladeanimation anzeigen
            const analyzeBtn = elements.analyzeBtn;
            showLoading(analyzeBtn, 'Analysiere...');

            // Stellenanzeige analysieren
            const jobPosting = elements.jobPosting.value;
            const jobAnalysis = await analyzeJobPosting(jobPosting);

            // Lebenslauf analysieren
            const resumeAnalysis = await analyzeResume(window.resumeText);

            // Analyseergebnisse anzeigen
            displayAnalysis(jobAnalysis);

            // Vorschläge generieren
            const suggestions = await AIService.generateCoverLetterSections(jobAnalysis, resumeAnalysis);

            // Vorschläge anwenden
            if (suggestions && suggestions.length > 0) {
                applySuggestions(suggestions);

                // Vorschau aktualisieren
                updatePreview();

                // Fortschritt aktualisieren
                updateProgressStep(3);

                // Erfolgsmeldung anzeigen
                showSuccess('Analyse erfolgreich abgeschlossen');
            } else {
                throw new Error('Keine Vorschläge generiert');
            }

        } catch (error) {
            console.error('Analysis error:', error);
            showError(error.message || 'Fehler bei der Analyse');
        } finally {
            // Analyse-Button wieder aktivieren und Ladeanimation entfernen
            hideLoading(elements.analyzeBtn, 'Analysieren und Anschreiben erstellen');
        }
    }

    // ===== Erweiterte Hilfsfunktionen =====
    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const input = event.target;
        const container = input.closest('.upload-container');
        const uploadArea = container.querySelector('.upload-area');
        const preview = container.querySelector('.file-preview');
        const fileName = preview.querySelector('.file-name');

        try {
            // Validierung
            if (file.type !== 'application/pdf') {
                throw new Error('Bitte nur PDF-Dateien hochladen');
            }

            if (file.size > 10 * 1024 * 1024) {
                throw new Error('Die Datei ist zu groß (maximal 10MB)');
            }

            // Lade-Animation anzeigen
            showLoading(preview, 'Verarbeite Datei...');
            
            // Text aus PDF extrahieren
            extractTextFromPDF(file).then(text => {
                if (!text.trim()) {
                    throw new Error('Keine Textinhalte in der PDF-Datei gefunden');
                }
                
                // Speichere extrahierten Text
                if (input.id === 'resumeUpload') {
                    window.resumeText = text;
                    
                    // UI aktualisieren
                    uploadArea.style.display = 'none';
                    preview.classList.remove('d-none');
                    preview.style.display = 'block';
                    
                    // Dateinamen anzeigen
                    fileName.innerHTML = `
                        <div class="d-flex align-items-center">
                            <i class="bi bi-file-pdf me-2"></i>
                            <div>
                                <div class="fw-bold">${file.name}</div>
                                <small class="text-muted">${formatFileSize(file.size)}</small>
                            </div>
                        </div>
                    `;
                    
                    showSuccess('Lebenslauf erfolgreich verarbeitet');
                    
                    // Analyse-Button Status aktualisieren
                    checkRequiredUploads();
                }
            }).catch(error => {
                console.error('Error processing file:', error);
                showError(error.message || 'Fehler beim Verarbeiten der Datei');
                
                // Input und UI zurücksetzen
                resetFileUpload(input);
            }).finally(() => {
                hideLoading(preview);
            });
            
        } catch (error) {
            console.error('Error handling file:', error);
            showError(error.message || 'Fehler beim Verarbeiten der Datei');
            
            // Input und UI zurücksetzen
            resetFileUpload(input);
            hideLoading(preview);
        }
    }

    async function extractTextFromPDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        let text = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n';
        }
        
        return text;
    }

    function applySectionsToForm(sections) {
        Object.entries(sections).forEach(([section, text]) => {
            if (elements.coverLetterSections[section]) {
                elements.coverLetterSections[section].value = text.trim();
            }
        });
        updatePreview();
    }

    // ===== UI Hilfsfunktionen =====
    function showLoading(element, text) {
        if (element instanceof HTMLButtonElement) {
            element.disabled = true;
            element.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${text}`;
        } else {
            const loadingEl = document.createElement('div');
            loadingEl.className = 'text-center';
            loadingEl.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Lädt...</span>
                </div>
                <div class="mt-2">${text}</div>
            `;
            element.appendChild(loadingEl);
        }
    }

    function hideLoading(element, text) {
        if (element instanceof HTMLButtonElement) {
            element.disabled = false;
            element.innerHTML = text;
        } else {
            const loadingEl = element.querySelector('.text-center');
            if (loadingEl) {
                loadingEl.remove();
            }
        }
    }

    function showSuccess(message) {
        const toast = elements.messageToast;
        document.getElementById('toastTitle').textContent = 'Erfolg';
        document.getElementById('toastMessage').textContent = message;
        toast._element.classList.remove('bg-danger');
        toast._element.classList.add('bg-success');
        toast.show();
    }

    function showError(message) {
        const toast = elements.messageToast;
        document.getElementById('toastTitle').textContent = 'Fehler';
        document.getElementById('toastMessage').textContent = message;
        toast._element.classList.remove('bg-success');
        toast._element.classList.add('bg-danger');
        toast.show();
    }

    // ===== Validierung =====
    function validateInputs() {
        const jobPosting = elements.jobPosting.value.trim();
        const resumeUploaded = window.resumeText !== undefined && window.resumeText !== null;
        
        // Aktiviere/Deaktiviere den Analyse-Button basierend auf den Eingaben
        elements.analyzeBtn.disabled = !jobPosting || !resumeUploaded;
        
        if (!jobPosting) {
            showError('Bitte fügen Sie eine Stellenanzeige ein');
            return false;
        }
        
        if (jobPosting.length < 50) {
            showError('Die Stellenanzeige scheint zu kurz zu sein. Bitte fügen Sie den vollständigen Text ein.');
            return false;
        }
        
        if (!resumeUploaded) {
            showError('Bitte laden Sie Ihren Lebenslauf hoch');
            return false;
        }
        
        return true;
    }

    // ===== Vorschau-Funktionen =====
    function updatePreview() {
        const sections = elements.coverLetterSections;
        let preview = '';
        
        // Anrede
        if (sections.recipient.value) {
            preview += `<p>${sections.recipient.value}</p>`;
        }
        
        // Betreff
        if (sections.subject.value) {
            preview += `<p><strong>${sections.subject.value}</strong></p>`;
        }
        
        // Einleitung
        if (sections.introduction.value) {
            preview += `<p>${sections.introduction.value}</p>`;
        }
        
        // Hauptteil
        if (sections.main.value) {
            const paragraphs = sections.main.value.split('\n').filter(p => p.trim());
            paragraphs.forEach(paragraph => {
                preview += `<p>${paragraph}</p>`;
            });
        }
        
        // Abschluss
        if (sections.closing.value) {
            preview += `<p>${sections.closing.value}</p>`;
        }
        
        // Grußformel
        preview += `<p class="mt-4">Mit freundlichen Grüßen<br>[Ihr Name]</p>`;
        
        elements.coverLetterPreview.innerHTML = preview || 'Hier erscheint die Vorschau...';
    }

    // ===== Event Listener für Textänderungen =====
    function initializeTextareaListeners() {
        // Füge Event Listener für jobPosting textarea hinzu
        elements.jobPosting.addEventListener('input', function() {
            const jobPosting = this.value.trim();
            const resumeUploaded = window.resumeText !== undefined && window.resumeText !== null;
            
            // Aktiviere/Deaktiviere den Analyse-Button
            elements.analyzeBtn.disabled = !jobPosting || !resumeUploaded;
            
            if (elements.analyzeBtn.disabled) {
                elements.analyzeBtn.classList.add('btn-secondary');
                elements.analyzeBtn.classList.remove('btn-primary');
            } else {
                elements.analyzeBtn.classList.add('btn-primary');
                elements.analyzeBtn.classList.remove('btn-secondary');
            }
        });

        // Event Listener für Anschreiben-Abschnitte
        Object.values(elements.coverLetterSections).forEach(textarea => {
            textarea.addEventListener('input', updatePreview);
        });
    }

    // ===== Datei-Upload-Funktionen =====
    function initializeFileUpload() {
        const uploadAreas = document.querySelectorAll('.upload-area');
        
        uploadAreas.forEach(area => {
            const input = area.querySelector('input[type="file"]');
            const container = area.closest('.upload-container');
            const preview = container.querySelector('.file-preview');
            const removeBtn = preview.querySelector('.btn-close');
            
            // Click Event nur für das Label, nicht den gesamten Bereich
            const uploadLabel = area.querySelector('.upload-label');
            uploadLabel.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Falls es sich um den Lebenslauf-Upload handelt und bereits ein File verarbeitet wurde, nicht erneut öffnen
                if(input.id === 'resumeUpload' && window.resumeText) {
                    return;
                }
                input.click();
            });
            
            // File Input Change Event
            input.addEventListener('change', handleFileUpload);
            
            // Remove Button Event
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Animation für das Entfernen
                    preview.style.opacity = '0';
                    setTimeout(() => {
                        // Datei-Input zurücksetzen
                        input.value = '';
                        
                        // Gespeicherten Text löschen
                        if (input.id === 'resumeUpload') {
                            window.resumeText = null;
                        }
                        
                        // UI zurücksetzen
                        preview.style.opacity = '1';
                        preview.classList.add('d-none');
                        area.style.display = 'block';
                        
                        // Button-Status aktualisieren
                        checkRequiredUploads();
                    }, 300);
                });
            }
            
            // Drag & Drop Events
            area.addEventListener('dragenter', handleDragEnter);
            area.addEventListener('dragover', handleDragOver);
            area.addEventListener('dragleave', handleDragLeave);
            area.addEventListener('drop', handleDrop);
        });
    }

    function handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('drag-over');
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('drag-over');
        
        const input = this.querySelector('input[type="file"]');
        const files = e.dataTransfer.files;
        
        if (files.length > 0) {
            input.files = files;
            handleFileUpload({ target: input });
        }
    }

    function handleFileRemove(inputId) {
        const input = document.getElementById(inputId);
        const container = input.closest('.upload-container');
        const uploadArea = container.querySelector('.upload-area');
        const preview = container.querySelector('.file-preview');
        
        // Animation für das Entfernen
        preview.style.opacity = '0';
        setTimeout(() => {
            // Datei-Input zurücksetzen
            input.value = '';
            
            // Gespeicherten Text löschen
            if (input.id === 'resumeUpload') {
                window.resumeText = null;
            }
            
            // UI zurücksetzen
            preview.style.opacity = '1';
            preview.classList.add('d-none');
            uploadArea.style.display = 'block';
            
            // Button-Status aktualisieren
            checkRequiredUploads();
        }, 300);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function checkRequiredUploads() {
        const resumeUploaded = window.resumeText !== null;
        const jobPostingFilled = elements.jobPosting.value.trim().length > 0;
        
        // Analyse-Button aktivieren/deaktivieren
        elements.analyzeBtn.disabled = !(resumeUploaded && jobPostingFilled);
        
        // Visuelles Feedback
        if (elements.analyzeBtn.disabled) {
            elements.analyzeBtn.classList.add('btn-secondary');
            elements.analyzeBtn.classList.remove('btn-primary');
        } else {
            elements.analyzeBtn.classList.add('btn-primary');
            elements.analyzeBtn.classList.remove('btn-secondary');
        }
    }

    // ===== Schreibassistent Funktionen =====
    function improveText(text, style = 'formal') {
        let improvements = [];
        let improvedText = text;

        // Stil-spezifische Verbesserungen
        if (style === 'formal') {
            improvedText = improvedText.replace(/hallo/gi, 'Sehr geehrte Damen und Herren');
            improvedText = improvedText.replace(/hi/gi, 'Sehr geehrte Damen und Herren');
        }

        // Allgemeine Textverbesserungen
        for (const [type, check] of Object.entries(IMPROVEMENT_PATTERNS)) {
            if (check.pattern.test(text)) {
                improvements.push(check.suggestion);
            }
        }

        return {
            text: improvedText,
            improvements: improvements
        };
    }

    function generateAlternatives(text, count = 3) {
        const alternatives = [];
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());

        for (let i = 0; i < count; i++) {
            let alternative = sentences.map(sentence => {
                return rephraseSentence(sentence, i === 0 ? 'formal' : i === 1 ? 'confident' : 'casual');
            }).join('. ');

            if (alternative.trim()) {
                alternatives.push(alternative.trim() + '.');
            }
        }

        return alternatives;
    }

    function rephraseSentence(sentence, style) {
        const stylePatterns = {
            formal: [
                [/ich kann/gi, 'es ist mir möglich'],
                [/ich habe/gi, 'ich verfüge über'],
                [/ich möchte/gi, 'ich beabsichtige'],
                [/ich bin/gi, 'als [Position] bin ich']
            ],
            confident: [
                [/ich kann/gi, 'ich werde'],
                [/ich könnte/gi, 'ich kann'],
                [/ich würde/gi, 'ich werde'],
                [/ich denke/gi, 'ich bin überzeugt']
            ],
            casual: [
                [/aufgrund/gi, 'wegen'],
                [/des Weiteren/gi, 'außerdem'],
                [/darüber hinaus/gi, 'zusätzlich'],
                [/demzufolge/gi, 'daher']
            ]
        };

        let rephrased = sentence.trim();
        
        if (stylePatterns[style]) {
            stylePatterns[style].forEach(([pattern, replacement]) => {
                rephrased = rephrased.replace(pattern, replacement);
            });
        }

        return rephrased;
    }

    /**
     * Analysiert den Text eines Lebenslaufes.
     * @async
     * @function analyzeResume
     * @param {string} resumeText - Vollständiger Text aus dem hochgeladenen PDF
     * @returns {Promise<Object>} - Enthält extrahierte Fähigkeiten, Erfahrungen etc.
     */
    async function analyzeResume(resumeText) {
        try {
            // Erweiterte Lebenslauf-Analyse mit detaillierten Extraktionsmethoden
            return {
                personalInfo: {
                    name: extractPersonName(resumeText),
                    email: extractEmail(resumeText),
                    phone: extractPhoneNumber(resumeText),
                    position: extractCurrentPosition(resumeText)
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
        } catch (error) {
            console.error('Resume analysis error:', error);
            throw new Error('Lebenslauf-Analyse fehlgeschlagen');
        }
    }

    function extractPersonName(text) {
        const namePatterns = [
            /(?:name|vorname|nachname):\s*([A-ZÄÖÜa-zäöüß\s-]+)/i,
            /^([A-ZÄÖÜa-zäöüß\s-]+)\n/
        ];
        
        for (const pattern of namePatterns) {
            const match = text.match(pattern);
            if (match) return match[1].trim();
        }
        return 'Bewerber';
    }

    function extractEmail(text) {
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
        const match = text.match(emailPattern);
        return match ? match[0] : '';
    }

    function extractPhoneNumber(text) {
        const phonePatterns = [
            /\+?49\s?\(?\d{3}\)?[-\s]?\d{3,4}[-\s]?\d{4,5}/,
            /\d{3}[-\s]?\d{3,4}[-\s]?\d{4,5}/
        ];
        
        for (const pattern of phonePatterns) {
            const match = text.match(pattern);
            if (match) return match[0];
        }
        return '';
    }

    function extractCurrentPosition(text) {
        const positionPatterns = [
            /aktuelle position:\s*([^\n]+)/i,
            /zuletzt tätig als\s*([^\n]+)/i,
            /berufliche position:\s*([^\n]+)/i
        ];
        
        for (const pattern of positionPatterns) {
            const match = text.match(pattern);
            if (match) return match[1].trim();
        }
        return 'Nicht spezifiziert';
    }

    function extractDetailedTechnicalSkills(text) {
        const technicalSkillSections = [
            'technische fähigkeiten',
            'it-kenntnisse',
            'programmiersprachen',
            'technologien'
        ];
        
        const skills = [];
        const lowercaseText = text.toLowerCase();
        
        const skillCategories = {
            programmingLanguages: ['python', 'java', 'javascript', 'c++', 'typescript', 'ruby', 'php', 'swift'],
            frameworks: ['react', 'angular', 'vue', 'django', 'spring', 'flask', 'node.js'],
            databases: ['mysql', 'postgresql', 'mongodb', 'sqlite', 'oracle', 'redis'],
            cloudPlatforms: ['aws', 'azure', 'google cloud', 'heroku'],
            tools: ['git', 'docker', 'kubernetes', 'jenkins', 'ansible', 'terraform']
        };
        
        for (const [category, keywords] of Object.entries(skillCategories)) {
            const matchedSkills = keywords.filter(skill => 
                lowercaseText.includes(skill.toLowerCase())
            );
            
            if (matchedSkills.length > 0) {
                skills.push({
                    category,
                    skills: matchedSkills
                });
            }
        }
        
        return skills;
    }

    function extractDetailedSoftSkills(text) {
        const softSkillCategories = {
            communication: ['kommunikation', 'präsentation', 'verhandlung', 'kundenbeziehung'],
            teamwork: ['teamfähigkeit', 'zusammenarbeit', 'konfliktlösung', 'kooperation'],
            leadership: ['führung', 'mentoring', 'coaching', 'projektleitung'],
            problemSolving: ['analytisch', 'problemlösung', 'strategisch', 'kreativität'],
            adaptability: ['flexibilität', 'lernbereitschaft', 'anpassungsfähigkeit']
        };
        
        const skills = [];
        const lowercaseText = text.toLowerCase();
        
        for (const [category, keywords] of Object.entries(softSkillCategories)) {
            const matchedSkills = keywords.filter(skill => 
                lowercaseText.includes(skill.toLowerCase())
            );
            
            if (matchedSkills.length > 0) {
                skills.push({
                    category,
                    skills: matchedSkills
                });
            }
        }
        
        return skills;
    }

    function extractLanguageSkills(text) {
        const languageLevels = {
            native: ['muttersprache', 'native', 'verhandlungssicher'],
            fluent: ['fließend', 'sehr gut', 'professional working proficiency'],
            intermediate: ['gut', 'verhandlungsfähig', 'professional working proficiency'],
            basic: ['grundkenntnisse', 'basic']
        };
        
        const languages = [];
        const languagePatterns = [
            /([A-ZÄÖÜa-zäöüß]+)\s*(?:sprache)?:\s*([^\n]+)/gi
        ];
        
        let match;
        while ((match = languagePatterns[0].exec(text)) !== null) {
            const language = match[1];
            const levelText = match[2].toLowerCase();
            
            let level = 'basic';
            for (const [key, indicators] of Object.entries(languageLevels)) {
                if (indicators.some(indicator => levelText.includes(indicator))) {
                    level = key;
                    break;
                }
            }
            
            languages.push({ language, level });
        }
        
        return languages;
    }

    function extractDetailedExperience(text) {
        const experiencePatterns = [
            /([A-ZÄÖÜa-zäöüß\s-]+)\s*(?:bei|in)\s*([A-ZÄÖÜa-zäöüß\s-]+)\s*(?:von|zwischen)\s*(\d{4})\s*(?:bis|-)?\s*(\d{4}|heute)/gi
        ];
        
        const experiences = [];
        let match;
        
        while ((match = experiencePatterns[0].exec(text)) !== null) {
            experiences.push({
                title: match[1].trim(),
                company: match[2].trim(),
                startYear: match[3],
                endYear: match[4] === 'heute' ? 'Aktuell' : match[4],
                duration: match[4] === 'heute' 
                    ? (new Date().getFullYear() - parseInt(match[3])) 
                    : (parseInt(match[4]) - parseInt(match[3]))
            });
        }
        
        return experiences.sort((a, b) => b.startYear - a.startYear);
    }

    function extractDetailedEducation(text) {
        const educationPatterns = [
            /([A-ZÄÖÜa-zäöüß\s-]+)\s*(?:an|bei)\s*([A-ZÄÖÜa-zäöüß\s-]+)\s*(?:von|zwischen)\s*(\d{4})\s*(?:bis|-)?\s*(\d{4}|heute)/gi
        ];
        
        const education = [];
        let match;
        
        while ((match = educationPatterns[0].exec(text)) !== null) {
            education.push({
                degree: match[1].trim(),
                institution: match[2].trim(),
                startYear: match[3],
                endYear: match[4] === 'heute' ? 'Aktuell' : match[4],
                duration: match[4] === 'heute' 
                    ? (new Date().getFullYear() - parseInt(match[3])) 
                    : (parseInt(match[4]) - parseInt(match[3]))
            });
        }
        
        return education.sort((a, b) => b.startYear - a.startYear);
    }

    function extractCertifications(text) {
        const certificationPatterns = [
            /zertifikat(?:e)?\s*(?:in)?\s*([^\n]+)/gi,
            /(?:qualifikation|fortbildung)(?:en)?\s*(?:in)?\s*([^\n]+)/gi
        ];
        
        const certifications = [];
        
        certificationPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                certifications.push(match[1].trim());
            }
        });
        
        return certifications;
    }

    function extractKeyAchievements(text) {
        const achievementPatterns = [
            /erfolg(?:e)?:\s*([^\n]+)/gi,
            /leistung(?:en)?\s*(?:von)?\s*([^\n]+)/gi,
            /projekt(?:e)?\s*(?:mit)?\s*([^\n]+)/gi
        ];
        
        const achievements = [];
        
        achievementPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                achievements.push(match[1].trim());
            }
        });
        
        return achievements;
    }

    // ===== Vorschlagsgenerierung =====
    async function generateSectionSuggestions(section, analysisData) {
        try {
            const { job, resume } = analysisData;
            
            // Kontext-basierte Vorschlagsgenerierung
            const context = {
                matchScore: calculateMatchScore(job, resume),
                relevantExperience: findMostRelevantExperience(job, resume),
                keySkills: identifyKeySkills(job, resume),
                cultureFit: analyzeCultureFit(job, resume)
            };
            
            if (section === 'all') {
                const sections = ['recipient', 'subject', 'introduction', 'main', 'closing'];
                return Promise.all(sections.map(async (sec) => {
                    const suggestion = await generateEnhancedSection(sec, analysisData, context);
                    return {
                        section: sec,
                        text: suggestion.text,
                        alternatives: suggestion.alternatives,
                        context: suggestion.context
                    };
                }));
            }
            
            const suggestion = await generateEnhancedSection(section, analysisData, context);
            return [{
                section,
                text: suggestion.text,
                alternatives: suggestion.alternatives,
                context: suggestion.context
            }];
        } catch (error) {
            console.error('Suggestion generation error:', error);
            throw new Error('Generierung fehlgeschlagen: ' + error.message);
        }
    }

    async function generateEnhancedSection(section, analysisData, context) {
        const { job, resume } = analysisData;
        
        // Wähle den besten Stil basierend auf Unternehmenskultur und Position
        const style = determineOptimalStyle(job, context);
        
        // Generiere personalisierte Vorschläge
        const suggestion = generatePersonalizedContent(section, analysisData, style, context);
        
        // Generiere kontextbezogene Alternativen
        const alternatives = generateContextualAlternatives(suggestion, style, context);
        
        return {
            text: suggestion,
            alternatives: alternatives,
            context: {
                style,
                matchScore: context.matchScore,
                keyPoints: extractKeyPoints(suggestion)
            }
        };
    }

    function determineOptimalStyle(job, context) {
        const { culture } = job.company;
        const { matchScore } = context;
        
        if (culture.formal && culture.formal.score > 0.5) {
            return 'formal';
        } else if (matchScore > 0.8) {
            return 'confident';
        } else {
            return 'casual';
        }
    }

    function displayAnalysis(jobAnalysis) {
        // Position anzeigen
        const jobTitleAnalysis = document.getElementById('jobTitleAnalysis');
        if (jobTitleAnalysis) {
            jobTitleAnalysis.innerHTML = `
                <div><strong>${jobAnalysis.jobTitle.position}</strong></div>
                <div class="text-muted">${jobAnalysis.jobTitle.level} - ${jobAnalysis.jobTitle.department}</div>
            `;
        }

        // Unternehmen anzeigen
        const companyAnalysis = document.getElementById('companyAnalysis');
        if (companyAnalysis) {
            companyAnalysis.innerHTML = `
                <div><strong>${jobAnalysis.company.name}</strong></div>
                <div class="text-muted">${jobAnalysis.company.industry}</div>
                <div class="mt-2">
                    <small class="text-muted">Unternehmenskultur:</small><br>
                    ${Object.entries(jobAnalysis.company.culture)
                        .map(([key, value]) => `${key}: ${Math.round(value.score * 100)}%`)
                        .join('<br>')}
                </div>
            `;
        }

        // Anforderungen anzeigen
        const mustHaveList = document.getElementById('mustHaveList');
        const niceToHaveList = document.getElementById('niceToHaveList');

        if (mustHaveList) {
            mustHaveList.innerHTML = jobAnalysis.requirements.essential
                .map(skill => `<li>${skill}</li>`).join('');
        }

        if (niceToHaveList) {
            niceToHaveList.innerHTML = jobAnalysis.requirements.preferred
                .map(skill => `<li>${skill}</li>`).join('');
        }

        // Analyse-Sektion anzeigen
        const jobAnalysisSection = document.getElementById('jobAnalysis');
        if (jobAnalysisSection) {
            jobAnalysisSection.classList.remove('d-none');
        }
    }

    function updateProgressStep(step) {
        // Alle Steps zurücksetzen
        document.querySelectorAll('.progress-stepper .step').forEach(el => {
            el.classList.remove('active');
        });

        // Aktiven Step setzen
        const activeStep = document.getElementById(`step${step}`);
        if (activeStep) {
            activeStep.classList.add('active');
        }
    }

    function extractCompanyName(text) {
        try {
            // Suche nach typischen Firmenbezeichnungen
            const companyPatterns = [
                /(?:firma|unternehmen|arbeitgeber|gesellschaft|gmbh|ag|kg):\s*([^\n.]+)/i,
                /(?:wir sind|über uns)(?:[^.]*?)(?:die|der)\s+([^\n.]+?)(?:\s+(?:gmbh|ag|kg|group|holding))/i,
                /([^\n.]+?)(?:\s+(?:gmbh|ag|kg|group|holding))/i
            ];

            for (const pattern of companyPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }

            return 'Unbekanntes Unternehmen';
        } catch (error) {
            console.error('Error extracting company name:', error);
            return 'Unbekanntes Unternehmen';
        }
    }

    function determineIndustry(text) {
        try {
            const industries = {
                it: ['software', 'it', 'technologie', 'digital', 'computer', 'internet'],
                finance: ['bank', 'finanz', 'versicherung', 'investment'],
                manufacturing: ['produktion', 'fertigung', 'industrie', 'maschinenbau'],
                healthcare: ['gesundheit', 'medizin', 'pharma', 'krankenhaus'],
                retail: ['handel', 'einzelhandel', 'verkauf', 'shopping'],
                consulting: ['beratung', 'consulting', 'dienstleistung']
            };

            let bestMatch = { industry: 'Sonstige', score: 0 };

            for (const [industry, keywords] of Object.entries(industries)) {
                const matches = keywords.filter(keyword => text.toLowerCase().includes(keyword));
                const score = matches.length / keywords.length;

                if (score > bestMatch.score) {
                    bestMatch = { industry, score };
                }
            }

            return bestMatch.industry;
        } catch (error) {
            console.error('Error determining industry:', error);
            return 'Sonstige';
        }
    }

    function determineCompanySize(text) {
        try {
            const sizePatterns = {
                small: ['startup', 'klein', 'bis 50 mitarbeiter'],
                medium: ['mittelständisch', '50-250 mitarbeiter', 'mittelstand'],
                large: ['großunternehmen', 'über 250 mitarbeiter', 'konzern']
            };

            for (const [size, patterns] of Object.entries(sizePatterns)) {
                if (patterns.some(pattern => text.toLowerCase().includes(pattern))) {
                    return size;
                }
            }

            return 'unknown';
        } catch (error) {
            console.error('Error determining company size:', error);
            return 'unknown';
        }
    }

    function checkRemoteWork(text) {
        try {
            const remoteIndicators = [
                'remote', 'homeoffice', 'home office', 'remote-arbeit',
                'telearbeit', 'von zuhause', 'hybrid', 'flexibel'
            ];

            return remoteIndicators.some(indicator => 
                text.toLowerCase().includes(indicator)
            );
        } catch (error) {
            console.error('Error checking remote work:', error);
            return false;
        }
    }

    function extractLocation(text) {
        try {
            // Suche nach Postleitzahl und Ort
            const locationPattern = /(?:\b\d{5}\s+)?(?:in\s+)?([A-ZÄÖÜa-zäöüß-]+(?:\s+[A-ZÄÖÜa-zäöüß-]+)*)/;
            const match = text.match(locationPattern);

            return match ? match[1].trim() : 'Nicht angegeben';
        } catch (error) {
            console.error('Error extracting location:', error);
            return 'Nicht angegeben';
        }
    }

    function extractTeamSize(text) {
        try {
            const teamPatterns = [
                /team\s+von\s+(\d+)(?:\s*-\s*(\d+))?\s+mitarbeiter/i,
                /(\d+)(?:\s*-\s*(\d+))?\s+kollegen/i
            ];

            for (const pattern of teamPatterns) {
                const match = text.match(pattern);
                if (match) {
                    if (match[2]) {
                        return `${match[1]}-${match[2]} Mitarbeiter`;
                    }
                    return `${match[1]} Mitarbeiter`;
                }
            }

            return 'Nicht spezifiziert';
        } catch (error) {
            console.error('Error extracting team size:', error);
            return 'Nicht spezifiziert';
        }
    }

    function extractBenefits(text) {
        try {
            const benefitPatterns = [
                'flexible arbeitszeiten', 'homeoffice', 'weiterbildung',
                'betriebliche altersvorsorge', 'firmenwagen', 'fitness',
                'kantine', 'obstkorb', 'kinderbetreuung', 'urlaubstage'
            ];

            return benefitPatterns
                .filter(benefit => text.toLowerCase().includes(benefit))
                .map(benefit => benefit.charAt(0).toUpperCase() + benefit.slice(1));
        } catch (error) {
            console.error('Error extracting benefits:', error);
            return [];
        }
    }

    function extractTechnologies(text) {
        try {
            const techPatterns = [
                'java', 'python', 'javascript', 'typescript', 'react', 'angular',
                'vue', 'node.js', 'sql', 'nosql', 'aws', 'azure', 'docker',
                'kubernetes', 'git', 'ci/cd', 'agile', 'scrum'
            ];

            return techPatterns
                .filter(tech => text.toLowerCase().includes(tech))
                .map(tech => tech.toUpperCase());
        } catch (error) {
            console.error('Error extracting technologies:', error);
            return [];
        }
    }

    function extractExperienceRequirements(text) {
        try {
            const experiencePattern = /(\d+)(?:\s*-\s*(\d+))?\s+jahr(?:e)?\s+(?:berufs)?erfahrung/i;
            const match = text.match(experiencePattern);

            if (match) {
                if (match[2]) {
                    return `${match[1]}-${match[2]} Jahre`;
                }
                return `${match[1]} Jahre`;
            }

            return 'Nicht spezifiziert';
        } catch (error) {
            console.error('Error extracting experience requirements:', error);
            return 'Nicht spezifiziert';
        }
    }

    function extractEducationRequirements(text) {
        try {
            const educationPatterns = {
                university: ['studium', 'master', 'bachelor', 'diplom'],
                vocational: ['ausbildung', 'berufsausbildung', 'lehre'],
                school: ['abitur', 'fachabitur', 'hochschulreife']
            };

            for (const [level, patterns] of Object.entries(educationPatterns)) {
                if (patterns.some(pattern => text.toLowerCase().includes(pattern))) {
                    return level;
                }
            }

            return 'Nicht spezifiziert';
        } catch (error) {
            console.error('Error extracting education requirements:', error);
            return 'Nicht spezifiziert';
        }
    }

    function extractTechnicalSkills(text) {
        try {
            const technicalPatterns = [
                'programmierung', 'entwicklung', 'software', 'datenbank',
                'netzwerk', 'security', 'cloud', 'architektur', 'testing',
                'devops', 'frontend', 'backend'
            ];

            return technicalPatterns
                .filter(skill => text.toLowerCase().includes(skill))
                .map(skill => skill.charAt(0).toUpperCase() + skill.slice(1));
        } catch (error) {
            console.error('Error extracting technical skills:', error);
            return [];
        }
    }

    function extractSoftSkills(text) {
        try {
            const softSkillPatterns = [
                'kommunikation', 'teamfähigkeit', 'selbstständig',
                'analytisch', 'kreativ', 'flexibel', 'belastbar',
                'organisiert', 'motiviert', 'lernbereit'
            ];

            return softSkillPatterns
                .filter(skill => text.toLowerCase().includes(skill))
                .map(skill => skill.charAt(0).toUpperCase() + skill.slice(1));
        } catch (error) {
            console.error('Error extracting soft skills:', error);
            return [];
        }
    }

    // ===== Initialisierung =====
    initializeEventListeners();
    initializeTextareaListeners();
    initializeFileUpload();

    // Hinzufügen der Hilfsfunktion resetFileUpload
    function resetFileUpload(input) {
        const container = input.closest('.upload-container');
        const uploadArea = container.querySelector('.upload-area');
        const preview = container.querySelector('.file-preview');
        input.value = '';
        if (input.id === 'resumeUpload') {
            window.resumeText = null;
        }
        uploadArea.style.display = 'block';
        preview.style.display = 'none';
        preview.classList.add('d-none');
        checkRequiredUploads();
    }

    // Am Ende DOMContentLoaded: updatePreview global verfügbar machen
    window.updatePreview = updatePreview;

    // Am Ende des DOMContentLoaded Handlers, vor der abschließenden Klammer
    window.applySuggestions = applySuggestions;

    // Aktuelle Position

    // 1. Event Listener für 'createCoverLetterBtn' hinzufügen
    // Füge folgenden Code im DOMContentLoaded Handler, z.B. am Ende der Initialisierung, hinzu:

    document.getElementById('createCoverLetterBtn').addEventListener('click', async function(){
        if (!elements.jobPosting.value.trim() || !window.resumeText) {
            showError('Bitte fügen Sie eine Stellenanzeige ein und laden Sie Ihren Lebenslauf hoch.');
            return;
        }
        try {
            showLoading(elements.analyzeBtn, 'Erstelle Anschreiben...');
            const jobAnalysis = await analyzeJobPosting(elements.jobPosting.value);
            const resumeAnalysis = await analyzeResume(window.resumeText);
            const analysisData = { job: jobAnalysis, resume: resumeAnalysis };
            const suggestions = await generateSectionSuggestions('all', analysisData);
            if (suggestions && suggestions.length > 0) {
                applySuggestions(suggestions);
                updatePreview();
                showSuccess('Anschreiben wurde erstellt und aktualisiert.');
            } else {
                showError('Keine Vorschläge generiert.');
            }
        } catch (e) {
            showError(e.message || 'Fehler beim Erstellen des Anschreibens.');
        } finally {
            hideLoading(elements.analyzeBtn, 'Analysieren und Anschreiben erstellen');
        }
    });

    // 2. Event Listener für API-Button hinzufügen
    const apiModalElement = document.getElementById('apiModal');
    const apiModal = apiModalElement ? new bootstrap.Modal(apiModalElement) : null;
    document.getElementById('apiBtn').addEventListener('click', function(){
        if(apiModal) { apiModal.show(); }
    });

    // 3. Suggest-Buttons - neue Formulierung bei jedem Klick
    document.querySelectorAll('.suggest-btn').forEach(btn => {
        btn.addEventListener('click', async function(){
             const section = this.getAttribute('data-section');
             if(!elements.jobPosting.value.trim()) {
                 showError('Bitte fügen Sie eine Stellenanzeige ein.');
                 return;
             }
             try {
                  showLoading(this, 'Generiere...');
                  const jobAnalysis = await analyzeJobPosting(elements.jobPosting.value);
                  const resumeAnalysis = await analyzeResume(window.resumeText || '');
                  const analysisData = { job: jobAnalysis, resume: resumeAnalysis };
                  const suggestion = await generateSectionSuggestions(section, analysisData);
                  if(suggestion && suggestion.length > 0) {
                      applySuggestions(suggestion);
                      updatePreview();
                      showSuccess('Neue Formulierung generiert.');
                  } else {
                      showError('Keine neue Formulierung generiert.');
                  }
             } catch(e){
                  showError(e.message || 'Fehler bei der Generierung.');
             } finally {
                  hideLoading(this, '<i class="bi bi-magic"></i>');
             }
        });
    });

    // 4. extractPersonName Funktion modifizieren
    function extractPersonName(text) {
        const namePatterns = [
            /(?:name|vorname|nachname):\s*([A-ZÄÖÜa-zäöüß\s-]+)/i,
            /^([A-ZÄÖÜa-zäöüß\s-]+)\n/
        ];
        for (const pattern of namePatterns) {
            const match = text.match(pattern);
            if (match) {
                let name = match[1].trim();
                // Jeder Wortbeginn groß schreiben
                name = name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                return name;
            }
        }
        return 'Bewerber';
    }

    // 5. In handleFileUpload: Falls Lebenslauf bereits vorhanden, nicht erneut verarbeiten
    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const input = event.target;
        // Wenn es sich um den Lebenslauf handelt und bereits ein Text vorhanden ist, abbrechen
        if(input.id === 'resumeUpload' && window.resumeText) { return; }
        const container = input.closest('.upload-container');
        const uploadArea = container.querySelector('.upload-area');
        const preview = container.querySelector('.file-preview');
        const fileName = preview.querySelector('.file-name');

        try {
            if (file.type !== 'application/pdf') {
                throw new Error('Bitte nur PDF-Dateien hochladen');
            }
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('Die Datei ist zu groß (maximal 10MB)');
            }
            showLoading(preview, 'Verarbeite Datei...');
            extractTextFromPDF(file).then(text => {
                if (!text.trim()) {
                    throw new Error('Keine Textinhalte in der PDF-Datei gefunden');
                }
                if (input.id === 'resumeUpload') {
                    window.resumeText = text;
                    uploadArea.style.display = 'none';
                    preview.classList.remove('d-none');
                    preview.style.display = 'block';
                    fileName.innerHTML = `
                        <div class="d-flex align-items-center">
                            <i class="bi bi-file-pdf me-2"></i>
                            <div>
                                <div class="fw-bold">${file.name}</div>
                                <small class="text-muted">${formatFileSize(file.size)}</small>
                            </div>
                        </div>
                    `;
                    showSuccess('Lebenslauf erfolgreich verarbeitet');
                    checkRequiredUploads();
                }
            }).catch(error => {
                console.error('Error processing file:', error);
                showError(error.message || 'Fehler beim Verarbeiten der Datei');
                resetFileUpload(input);
            }).finally(() => {
                hideLoading(preview);
            });
        } catch (error) {
            console.error('Error handling file:', error);
            showError(error.message || 'Fehler beim Verarbeiten der Datei');
            resetFileUpload(input);
            hideLoading(preview);
        }
    }

    // 6. In generateMainSection: Erfolge aus dem Lebenslauf einfließen lassen
    function generateMainSection(job, resume, keySkills, relevantExperience, cultureFit) {
        const mainSectionParts = [];

        if (relevantExperience) {
            mainSectionParts.push(
                `Mit meiner Erfahrung als ${relevantExperience.title} bei ${relevantExperience.company} bringe ich genau die Qualifikationen mit, die Sie suchen.`
            );
        }

        if (keySkills.matching && keySkills.matching.length > 0) {
            mainSectionParts.push(
                `Meine Kernkompetenzen in ${keySkills.matching.join(', ')} entsprechen präzise Ihren Anforderungen.`
            );
        }

        if (keySkills.additional && keySkills.additional.length > 0) {
            mainSectionParts.push(
                `Darüber hinaus verfüge ich über zusätzliche Expertise in ${keySkills.additional.slice(0, 3).join(', ')}, die einen Mehrwert für Ihr Team bieten kann.`
            );
        }

        // Neue Einbindung: Falls im Lebenslauf Erfolge (achievements) vorhanden sind, diese einfließen lassen
        if (resume.achievements && resume.achievements.length > 0) {
            mainSectionParts.push(
                `Meine herausragenden Erfolge, wie ${resume.achievements.slice(0, 3).join(', ')}, unterstreichen meine Eignung für diese Position.`
            );
        }

        const culturalAspects = Object.entries(cultureFit)
                .filter(([_, score]) => score > 0.5)
                .map(([aspect, _]) => aspect);

        if (culturalAspects.length > 0) {
            mainSectionParts.push(
                `Meine ${culturalAspects.join(', ')}-Fähigkeiten passen hervorragend zur Unternehmenskultur von ${job.company.name}.`
            );
        }

        mainSectionParts.push(
            `Die Position als ${job.jobTitle.position} bei ${job.company.name} reizt mich besonders, da sie meinem Wunsch nach ${job.company.culture.innovative ? 'innovativer Arbeit' : 'spannenden Herausforderungen'} entspricht.`
        );

        return mainSectionParts.join(' ');
    }

    /** 
     * Namespace mit sämtlichen Analysefunktionen 
     */
    const AnalysisModule = {
        analyzeJobPosting,
        analyzeResume,
        analyzeRequirements,
        // ... weitere Analysefunktionen
    };

    /** 
     * Namespace für UI-bezogene Funktionen 
     */
    const UIModule = {
        showLoading,
        hideLoading,
        showSuccess,
        showError,
        updatePreview,
        // ... weitere UI-Funktionen
    };

    // Beispiel für Verwendung: 
    // statt analyzeJobPosting(...) -> AnalysisModule.analyzeJobPosting(...)

    /**
     * Exemplarische globale AIService-Injektion 
     * (damit wir KI-Funktionalitäten wie "generateSectionSuggestions" auslagern könnten).
     */
    const AIService = {
        async generateCoverLetterSections(jobData, resumeData) {
            // Hier könnte ein externer API-Call stattfinden statt direkter Lokallogik
            // z.B. via fetch("https://example.com/ai-endpoint", { ... })
            // In "Loop 1" war das lokal in generateSectionSuggestions etc. 
            // => Hier verlagern wir es.
            return [];
        }
    };

    async function handleAnalyze() {
        try {
            if (!validateInputs()) {
                return;
            }
            // existing code...

            // Statt localer "generateSectionSuggestions" -> 
            const suggestions = await AIService.generateCoverLetterSections(jobAnalysis, resumeAnalysis);

            if (suggestions && suggestions.length > 0) {
                applySuggestions(suggestions);
                updatePreview();
                updateProgressStep(3);
                showSuccess('Analyse erfolgreich abgeschlossen');
            } else {
                throw new Error('Keine Vorschläge generiert');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            showError(error.message || 'Fehler bei der Analyse');
        } finally {
            hideLoading(elements.analyzeBtn, 'Analysieren und Anschreiben erstellen');
        }
    }
});
