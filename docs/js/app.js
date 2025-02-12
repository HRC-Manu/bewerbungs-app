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

    // ===== Event Listener =====
    function initializeEventListeners() {
        // Help Button
        document.getElementById('helpBtn').addEventListener('click', () => {
            elements.helpModal.show();
        });

        // Analyze Button
        elements.analyzeBtn.addEventListener('click', handleAnalyze);

        // Datei-Uploads
        if (elements.resumeUpload) {
            elements.resumeUpload.addEventListener('change', handleFileUpload);
        }
        if (elements.coverLetterUpload) {
            elements.coverLetterUpload.addEventListener('change', handleFileUpload);
        }

        // Entfernen-Buttons für Datei-Vorschau
        document.querySelectorAll('.file-preview .btn-close').forEach(btn => {
            btn.addEventListener('click', handleFileRemove);
        });

        // Initialisiere Textbereich-Listener
        initializeTextareaListeners();
    }

    // ===== Analyse-Einstellungen =====
    const ANALYSIS_SETTINGS = {
        // Schlüsselwörter für Positionen
        positions: {
            developer: ['entwickler', 'programmierer', 'software engineer', 'full-stack', 'frontend', 'backend'],
            manager: ['manager', 'leiter', 'führungskraft', 'teamleiter', 'projektleiter'],
            consultant: ['berater', 'consultant', 'architekt'],
            analyst: ['analyst', 'data scientist', 'business intelligence']
        },
        // Schlüsselwörter für Level
        levels: {
            junior: ['junior', 'entry level', 'berufseinsteiger'],
            senior: ['senior', 'erfahren', 'expert'],
            lead: ['lead', 'principal', 'head of', 'leitung']
        },
        // Schlüsselwörter für Abteilungen
        departments: {
            it: ['it', 'edv', 'software', 'entwicklung', 'tech'],
            hr: ['hr', 'personal', 'recruiting'],
            finance: ['finance', 'finanzen', 'controlling'],
            sales: ['sales', 'vertrieb', 'marketing']
        },
        // Unternehmenskultur-Indikatoren
        culture: {
            formal: ['etabliert', 'traditionell', 'strukturiert', 'corporate'],
            casual: ['startup', 'dynamisch', 'agil', 'modern', 'jung'],
            innovative: ['innovativ', 'zukunftsorientiert', 'digital']
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

    async function analyzeJobPosting(jobPosting) {
        try {
            if (!jobPosting || typeof jobPosting !== 'string') {
                throw new Error('Ungültige Stellenanzeige');
            }

            const text = jobPosting.toLowerCase();
            
            // Position analysieren
            const position = findBestMatch(text, ANALYSIS_SETTINGS.positions) || { name: 'Nicht spezifiziert', score: 0 };
            const level = findBestMatch(text, ANALYSIS_SETTINGS.levels) || { name: 'Nicht spezifiziert', score: 0 };
            const department = findBestMatch(text, ANALYSIS_SETTINGS.departments) || { name: 'Nicht spezifiziert', score: 0 };
            
            // Unternehmensdetails extrahieren
            const companyInfo = extractCompanyInfo(text) || { name: 'Nicht angegeben', industry: 'Nicht spezifiziert', culture: 'Klassisch' };
            
            // Anforderungen analysieren
            const requirements = analyzeRequirements(text) || { hardSkills: [], softSkills: [] };
            
            return {
                jobTitle: {
                    position: position.name || 'Nicht spezifiziert',
                    level: level.name || 'Nicht spezifiziert',
                    department: department.name || 'Nicht spezifiziert'
                },
                company: {
                    name: companyInfo.name || 'Nicht angegeben',
                    industry: companyInfo.industry || 'Nicht spezifiziert',
                    culture: companyInfo.culture || 'Klassisch'
                },
                requirements: {
                    hardSkills: requirements.hardSkills || [],
                    softSkills: requirements.softSkills || []
                }
            };
        } catch (error) {
            console.error('Job posting analysis error:', error);
            throw new Error(`Analyse der Stellenanzeige fehlgeschlagen: ${error.message}`);
        }
    }

    function findBestMatch(text, categories) {
        let bestMatch = { name: 'Nicht spezifiziert', score: 0 };
        
        for (const [category, keywords] of Object.entries(categories)) {
            const score = keywords.reduce((count, keyword) => {
                return count + (text.includes(keyword) ? 1 : 0);
            }, 0);
            
            if (score > bestMatch.score) {
                bestMatch = { name: category, score };
            }
        }
        
        return bestMatch;
    }

    function extractCompanyInfo(text) {
        // Firmenname aus Text extrahieren (vereinfachte Version)
        const nameMatch = text.match(/(?:firma|unternehmen|arbeitgeber):\s*([^\n.]+)/i);
        const name = nameMatch ? nameMatch[1].trim() : 'Nicht angegeben';
        
        // Branche identifizieren
        const industries = {
            it: ['software', 'it-dienstleistung', 'technologie'],
            automotive: ['automobil', 'fahrzeug', 'automotive'],
            finance: ['bank', 'versicherung', 'finanz'],
            health: ['gesundheit', 'pharma', 'medizin']
        };
        
        const industry = findBestMatch(text, industries).name;
        
        // Unternehmenskultur analysieren
        const culture = analyzeCulture(text);
        
        return { name, industry, culture };
    }

    function analyzeCulture(text) {
        const culturalAspects = [];
        
        for (const [type, indicators] of Object.entries(ANALYSIS_SETTINGS.culture)) {
            if (indicators.some(indicator => text.includes(indicator))) {
                culturalAspects.push(type);
            }
        }
        
        if (culturalAspects.length === 0) {
            return 'Klassisch';
        }
        
        return culturalAspects.join(', ');
    }

    function analyzeRequirements(text) {
        const requirements = {
            hardSkills: [],
            softSkills: []
        };
        
        // Typische Einleitungen für Anforderungen
        const requirementSections = text.split(/(?:ihre qualifikationen|anforderungsprofil|wir erwarten|sie bringen mit):/i);
        
        if (requirementSections.length > 1) {
            const requirementText = requirementSections[1];
            
            // Aufzählungen extrahieren
            const bulletPoints = requirementText.split(/[•\-\*]\s+/);
            
            bulletPoints.forEach(point => {
                if (point.trim()) {
                    // Hard Skills erkennen (technische und fachliche Anforderungen)
                    if (isHardSkill(point)) {
                        requirements.hardSkills.push(point.trim());
                    } else {
                        // Soft Skills (alle anderen Anforderungen)
                        requirements.softSkills.push(point.trim());
                    }
                }
            });
        }
        
        return requirements;
    }

    function isHardSkill(text) {
        const hardSkillIndicators = [
            'kenntnisse', 'erfahrung', 'studium', 'ausbildung',
            'abschluss', 'technisch', 'software', 'programmierung',
            'entwicklung', 'tools', 'technologien', 'stack'
        ];
        
        return hardSkillIndicators.some(indicator => text.toLowerCase().includes(indicator));
    }

    async function analyzeResume(resumeText) {
        try {
            const text = resumeText.toLowerCase();
            
            // Persönliche Informationen extrahieren
            const personalInfo = extractPersonalInfo(text);
            
            // Skills analysieren
            const skills = extractSkills(text);
            
            // Berufserfahrung analysieren
            const experience = extractExperience(text);
            
            // Ausbildung analysieren
            const education = extractEducation(text);
            
            return {
                personalInfo,
                skills,
                experience,
                education
            };
        } catch (error) {
            throw new Error(`Analyse fehlgeschlagen: ${error.message}`);
        }
    }

    function extractPersonalInfo(text) {
        // Name extrahieren (erste Zeile oder nach "Name:")
        const nameMatch = text.match(/^([^\n]+)|name:\s*([^\n]+)/i);
        const name = nameMatch ? (nameMatch[1] || nameMatch[2]).trim() : 'Nicht angegeben';
        
        // Aktuelle Position aus Erfahrungsbereich
        const positionMatch = text.match(/(?:aktuelle position|position|rolle):\s*([^\n]+)/i);
        const title = positionMatch ? positionMatch[1].trim() : 'Nicht angegeben';
        
        // Berufserfahrung berechnen
        const yearsMatch = text.match(/(\d+)\s*(?:jahre\s+(?:berufs)?erfahrung|years?\s+(?:of\s+)?experience)/i);
        const yearsOfExperience = yearsMatch ? parseInt(yearsMatch[1]) : calculateExperienceYears(text);
        
        return {
            name,
            title,
            yearsOfExperience
        };
    }

    function calculateExperienceYears(text) {
        // Suche nach Datumsbereichen im Format MM/YYYY oder YYYY
        const dateRanges = text.match(/\d{2}\/\d{4}|\d{4}/g);
        if (!dateRanges) return 0;
        
        let totalYears = 0;
        let dates = dateRanges.map(d => {
            if (d.includes('/')) {
                const [month, year] = d.split('/');
                return new Date(year, month - 1);
            }
            return new Date(d, 0);
        });
        
        // Paare von Daten durchgehen und Jahre berechnen
        for (let i = 0; i < dates.length - 1; i += 2) {
            const start = dates[i];
            const end = dates[i + 1] || new Date();
            totalYears += (end - start) / (1000 * 60 * 60 * 24 * 365);
        }
        
        return Math.round(totalYears);
    }

    function extractSkills(text) {
        const skills = {
            technical: [],
            soft: []
        };
        
        // Skill-Bereiche identifizieren
        const skillSections = text.split(/(?:kenntnisse|skills|fähigkeiten|kompetenzen):/i);
        
        if (skillSections.length > 1) {
            const skillText = skillSections[1];
            
            // Skills nach Kategorien aufteilen
            const technicalSkills = extractTechnicalSkills(skillText);
            const softSkills = extractSoftSkills(skillText);
            
            skills.technical = technicalSkills;
            skills.soft = softSkills;
        }
        
        return skills;
    }

    function extractTechnicalSkills(text) {
        const technicalIndicators = [
            'programmiersprachen', 'frameworks', 'datenbanken',
            'tools', 'software', 'technologien', 'entwicklung',
            'sprachen', 'systeme', 'methodiken'
        ];
        
        const skills = [];
        const lines = text.split('\n');
        
        let isInTechnicalSection = false;
        
        lines.forEach(line => {
            line = line.trim().toLowerCase();
            
            // Prüfe, ob wir in einem technischen Abschnitt sind
            if (technicalIndicators.some(indicator => line.includes(indicator))) {
                isInTechnicalSection = true;
            } else if (line.length > 0 && isInTechnicalSection) {
                // Extrahiere einzelne Skills (durch Kommas oder Bullets getrennt)
                const lineSkills = line.split(/[,•\-]/).map(s => s.trim()).filter(s => s.length > 0);
                skills.push(...lineSkills);
            }
        });
        
        return [...new Set(skills)]; // Duplikate entfernen
    }

    function extractSoftSkills(text) {
        const softSkillIndicators = [
            'teamfähigkeit', 'kommunikation', 'führung',
            'organisation', 'motivation', 'flexibilität',
            'kreativität', 'analytisch', 'selbstständig'
        ];
        
        const skills = [];
        const lines = text.split('\n');
        
        lines.forEach(line => {
            line = line.trim().toLowerCase();
            softSkillIndicators.forEach(indicator => {
                if (line.includes(indicator)) {
                    skills.push(line);
                }
            });
        });
        
        return [...new Set(skills)]; // Duplikate entfernen
    }

    function extractExperience(text) {
        const experience = [];
        
        // Berufserfahrungsbereich identifizieren
        const experienceSections = text.split(/(?:berufserfahrung|beruflicher werdegang|work experience):/i);
        
        if (experienceSections.length > 1) {
            const experienceText = experienceSections[1];
            const entries = experienceText.split(/\n(?=\d{2}\/\d{4}|\d{4})/);
            
            entries.forEach(entry => {
                const position = extractPositionFromEntry(entry);
                if (position.company) {
                    experience.push(position);
                }
            });
        }
        
        return experience;
    }

    function extractPositionFromEntry(entry) {
        const lines = entry.split('\n').map(l => l.trim());
        
        // Position und Firma aus der ersten Zeile extrahieren
        const firstLine = lines[0];
        const positionMatch = firstLine.match(/(?:als\s+)?([^@\n]+)(?:\s+@\s+|bei\s+|für\s+)([^\n]+)/i);
        
        if (!positionMatch) return {};
        
        const position = positionMatch[1].trim();
        const company = positionMatch[2].trim();
        
        // Zeitraum extrahieren
        const durationMatch = firstLine.match(/(\d{2}\/\d{4}|\d{4})\s*-\s*(\d{2}\/\d{4}|\d{4}|heute|present)/i);
        const duration = durationMatch ? `${durationMatch[1]} - ${durationMatch[2]}` : '';
        
        // Achievements aus den folgenden Zeilen extrahieren
        const achievements = lines.slice(1)
            .filter(line => line.startsWith('-') || line.startsWith('•'))
            .map(line => line.replace(/^[-•]\s*/, '').trim());
        
        return {
            position,
            company,
            duration,
            achievements
        };
    }

    function extractEducation(text) {
        const education = [];
        
        // Ausbildungsbereich identifizieren
        const educationSections = text.split(/(?:ausbildung|bildung|education):/i);
        
        if (educationSections.length > 1) {
            const educationText = educationSections[1];
            const entries = educationText.split(/\n(?=\d{2}\/\d{4}|\d{4})/);
            
            entries.forEach(entry => {
                const degree = extractDegreeFromEntry(entry);
                if (degree.institution) {
                    education.push(degree);
                }
            });
        }
        
        return education;
    }

    function extractDegreeFromEntry(entry) {
        const lines = entry.split('\n').map(l => l.trim());
        
        // Abschluss und Institution aus der ersten Zeile extrahieren
        const firstLine = lines[0];
        const degreeMatch = firstLine.match(/([^@\n]+)(?:\s+@\s+|an\s+der\s+|in\s+)([^\n]+)/i);
        
        if (!degreeMatch) return {};
        
        const degree = degreeMatch[1].trim();
        const institution = degreeMatch[2].trim();
        
        // Jahr extrahieren
        const yearMatch = firstLine.match(/(\d{4})/);
        const year = yearMatch ? yearMatch[1] : '';
        
        return {
            degree,
            institution,
            year
        };
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
                    ${jobAnalysis.company.culture}
                </div>
            `;
        }

        // Anforderungen anzeigen
        const mustHaveList = document.getElementById('mustHaveList');
        const niceToHaveList = document.getElementById('niceToHaveList');

        if (mustHaveList) {
            mustHaveList.innerHTML = jobAnalysis.requirements.hardSkills
                .map(skill => `<li>${skill}</li>`).join('');
        }

        if (niceToHaveList) {
            niceToHaveList.innerHTML = jobAnalysis.requirements.softSkills
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

    async function generateSectionSuggestions(section, analysisData) {
        try {
            const { job, resume } = analysisData;
            
            // Wenn 'all' ausgewählt ist, generiere alle Abschnitte
            if (section === 'all') {
                const sections = ['recipient', 'subject', 'introduction', 'main', 'closing'];
                const allSuggestions = [];
                
                for (const sec of sections) {
                    const suggestion = generateSingleSection(sec, analysisData);
                    allSuggestions.push({
                        section: sec,
                        text: suggestion.text,
                        alternatives: suggestion.alternatives || []
                    });
                }
                
                return allSuggestions;
            }
            
            // Für einzelne Abschnitte
            const suggestion = generateSingleSection(section, analysisData);
            return [{
                section: section,
                text: suggestion.text,
                alternatives: suggestion.alternatives || []
            }];
        } catch (error) {
            console.error('Suggestion generation error:', error);
            throw new Error('Generierung fehlgeschlagen: ' + error.message);
        }
    }

    function generateSingleSection(section, analysisData) {
        const { job, resume } = analysisData;
        
        // Unternehmenskultur bestimmt den Stil
        const isFormal = job.company.culture.includes('formal');
        
        // Generiere Vorschläge basierend auf dem Abschnitt
        switch (section) {
            case 'recipient':
                return generateRecipient(job, isFormal);
            case 'subject':
                return generateSubject(job, resume);
            case 'introduction':
                return generateIntroduction(job, resume);
            case 'main':
                return generateMain(job, resume);
            case 'closing':
                return generateClosing(job);
            default:
                throw new Error('Unbekannter Abschnitt');
        }
    }

    function generateRecipient(job, isFormal) {
        const templates = LETTER_TEMPLATES.recipient;
        const style = isFormal ? templates.formal : templates.casual;
        
        // Suche nach Ansprechpartner in der Stellenanzeige
        const hasContactPerson = false; // TODO: Implementiere Ansprechpartnersuche
        
        return {
            text: hasContactPerson ? style.known('NAME') : style.unknown,
            alternatives: [
                style.unknown,
                templates.formal.unknown,
                templates.casual.unknown
            ]
        };
    }

    function generateSubject(job, resume) {
        const templates = LETTER_TEMPLATES.subject;
        const position = job.jobTitle.position;
        const years = resume.personalInfo.yearsOfExperience;
        
        return {
            text: templates.standard(position),
            alternatives: [
                templates.experienced(position, years),
                templates.standard(position, 'REF12345'),
                `Bewerbung: ${position} - ${years} Jahre Erfahrung`
            ]
        };
    }

    function generateIntroduction(job, resume) {
        const templates = LETTER_TEMPLATES.introduction;
        const position = job.jobTitle.position;
        const company = job.company.name;
        
        return {
            text: templates.jobPortal(position, company),
            alternatives: [
                templates.initiative(company),
                templates.recommendation(position, 'Ihrem Mitarbeiter Herrn Mustermann'),
                `Ihre ausgeschriebene Stelle als ${position} hat mein großes Interesse geweckt.`
            ]
        };
    }

    function generateMain(job, resume) {
        // Matching-Score zwischen Anforderungen und Skills berechnen
        const matchingSkills = findMatchingSkills(job.requirements.hardSkills, resume.skills.technical);
        const matchingSoftSkills = findMatchingSkills(job.requirements.softSkills, resume.skills.soft);
        
        // Relevante Erfahrungen identifizieren
        const relevantExperience = findRelevantExperience(job, resume.experience);
        
        // Text generieren
        const text = `
Mit ${resume.personalInfo.yearsOfExperience} Jahren Erfahrung in der ${job.jobTitle.department}-Branche 
bringe ich genau die Fähigkeiten mit, die Sie suchen. ${generateSkillsText(matchingSkills)}

${generateExperienceText(relevantExperience)}

${generateSoftSkillsText(matchingSoftSkills)}
        `.trim();
        
        return {
            text,
            alternatives: [
                generateAlternativeMain(job, resume, 1),
                generateAlternativeMain(job, resume, 2)
            ]
        };
    }

    function findMatchingSkills(required, available) {
        return required.filter(req => 
            available.some(skill => 
                skill.toLowerCase().includes(req.toLowerCase()) ||
                req.toLowerCase().includes(skill.toLowerCase())
            )
        );
    }

    function findRelevantExperience(job, experience) {
        return experience
            .filter(exp => 
                exp.position.toLowerCase().includes(job.jobTitle.position.toLowerCase()) ||
                job.requirements.hardSkills.some(skill => 
                    exp.achievements.some(achievement => 
                        achievement.toLowerCase().includes(skill.toLowerCase())
                    )
                )
            )
            .sort((a, b) => {
                // Neuere Erfahrungen zuerst
                const aYear = parseInt(a.duration.split('-')[0]);
                const bYear = parseInt(b.duration.split('-')[0]);
                return bYear - aYear;
            })
            .slice(0, 2); // Maximal 2 relevante Erfahrungen
    }

    function generateSkillsText(matchingSkills) {
        if (matchingSkills.length === 0) return '';
        
        return `Meine Kernkompetenzen liegen in den Bereichen ${matchingSkills.join(', ')}.`;
    }

    function generateExperienceText(relevantExperience) {
        if (relevantExperience.length === 0) return '';
        
        return relevantExperience.map(exp => 
            `Bei ${exp.company} habe ich als ${exp.position} ${exp.achievements[0] || 'wertvolle Erfahrungen gesammelt'}.`
        ).join('\n\n');
    }

    function generateSoftSkillsText(matchingSoftSkills) {
        if (matchingSoftSkills.length === 0) return '';
        
        return `Darüber hinaus zeichne ich mich durch ${matchingSoftSkills.join(', ')} aus.`;
    }

    function generateAlternativeMain(job, resume, version) {
        // Verschiedene Versionen des Hauptteils
        const templates = [
            // Version 1: Fokus auf Projekterfolge
            (job, resume) => {
                const exp = resume.experience[0] || {};
                return `
In meiner aktuellen Position als ${exp.position} bei ${exp.company} 
konnte ich bereits erfolgreich ${exp.achievements[0] || 'verschiedene Projekte umsetzen'}. 
Meine Expertise in ${resume.skills.technical.slice(0, 3).join(', ')} 
macht mich zu einem idealen Kandidaten für die Position als ${job.jobTitle.position}.
                `.trim();
            },
            // Version 2: Fokus auf Entwicklung
            (job, resume) => {
                return `
Meine bisherige Laufbahn im ${job.jobTitle.department}-Bereich hat mir ein tiefes Verständnis 
für ${job.requirements.hardSkills[0] || 'die relevanten Technologien'} vermittelt. 
Besonders reizt mich bei Ihrem Unternehmen die Möglichkeit, ${job.company.culture} zu arbeiten.
                `.trim();
            }
        ];
        
        return templates[version - 1](job, resume);
    }

    function generateClosing(job) {
        const templates = LETTER_TEMPLATES.closing;
        
        return {
            text: templates.standard,
            alternatives: [
                templates.flexible,
                templates.availability('nächsten Monat'),
                'Gerne stelle ich Ihnen meine Erfahrungen in einem persönlichen Gespräch vor.'
            ]
        };
    }

    function applySuggestions(suggestions) {
        suggestions.forEach(suggestion => {
            if (suggestion.section && elements.coverLetterSections[suggestion.section]) {
                elements.coverLetterSections[suggestion.section].value = suggestion.text;
                
                // Speichere Alternativen für späteren Zugriff
                if (suggestion.alternatives && suggestion.alternatives.length > 0) {
                    elements.coverLetterSections[suggestion.section].dataset.alternatives = 
                        JSON.stringify(suggestion.alternatives);
                }
            }
        });
        
        // Aktiviere Buttons für alternative Vorschläge
        document.querySelectorAll('.suggest-btn').forEach(btn => {
            const section = btn.dataset.section;
            const textarea = elements.coverLetterSections[section];
            
            if (textarea && textarea.dataset.alternatives) {
                btn.disabled = false;
                btn.title = 'Alternative Vorschläge verfügbar';
            }
        });
    }

    function displaySuggestions(suggestions) {
        const suggestionsList = document.getElementById('suggestionsList');
        suggestionsList.innerHTML = '';
        
        suggestions.forEach((suggestion, index) => {
            // Verbessere den Vorschlag mit dem Schreibassistenten
            const improved = improveText(suggestion.text);
            const alternatives = generateAlternatives(suggestion.text);
            
            const card = document.createElement('div');
            card.className = 'suggestion-card';
            card.innerHTML = `
                <div class="card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">Vorschlag ${index + 1}</h6>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary apply-suggestion">
                                <i class="bi bi-check-lg"></i> Übernehmen
                            </button>
                            <button class="btn btn-sm btn-outline-secondary show-alternatives">
                                <i class="bi bi-lightning"></i> Alternativen
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="suggestion-text">${improved.text.replace(/\n/g, '<br>')}</div>
                        ${improved.improvements.length > 0 ? `
                            <div class="mt-3 border-top pt-3">
                                <small class="text-muted">Verbesserungsvorschläge:</small>
                                <ul class="list-unstyled small">
                                    ${improved.improvements.map(imp => `
                                        <li><i class="bi bi-arrow-right-short"></i> ${imp}</li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            // Event-Handler für Buttons
            card.querySelector('.apply-suggestion').onclick = () => {
                applySuggestion({
                    ...suggestion,
                    text: improved.text
                });
            };
            
            card.querySelector('.show-alternatives').onclick = () => {
                showAlternatives({
                    ...suggestion,
                    text: improved.text,
                    alternatives: alternatives
                });
            };
            
            suggestionsList.appendChild(card);
        });
        
        elements.suggestionsModal.show();
    }

    function showAlternatives(suggestion) {
        const modalHtml = `
            <div class="modal fade" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-lightning me-2"></i>
                                Alternative Formulierungen
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alternatives-list">
                                ${suggestion.alternatives.map((alt, i) => `
                                    <div class="alternative-item p-3 ${i < suggestion.alternatives.length - 1 ? 'border-bottom' : ''}">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <div>
                                                <span class="badge bg-primary me-2">Variante ${i + 1}</span>
                                                <span class="badge bg-light text-dark">
                                                    ${i === 0 ? 'Formell' : i === 1 ? 'Selbstbewusst' : 'Modern'}
                                                </span>
                                            </div>
                                            <button class="btn btn-sm btn-outline-primary use-alternative">
                                                <i class="bi bi-check-lg me-1"></i>
                                                Verwenden
                                            </button>
                                        </div>
                                        <div>${alt.replace(/\n/g, '<br>')}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Schließen</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHtml;
        document.body.appendChild(modalElement);
        
        const modal = new bootstrap.Modal(modalElement.querySelector('.modal'));
        
        // Event-Handler für "Verwenden" Buttons
        modalElement.querySelectorAll('.use-alternative').forEach((btn, index) => {
            btn.onclick = () => {
                applySuggestion({
                    ...suggestion,
                    text: suggestion.alternatives[index]
                });
                modal.hide();
            };
        });
        
        // Modal anzeigen
        modal.show();
        
        // Aufräumen nach dem Schließen
        modalElement.querySelector('.modal').addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modalElement);
        });
    }

    function applySuggestion(suggestion) {
        if (suggestion.section && elements.coverLetterSections[suggestion.section]) {
            elements.coverLetterSections[suggestion.section].value = suggestion.text;
            updatePreview();
            
            // Erfolgsanimation
            const btn = document.querySelector(`.suggest-btn[data-section="${suggestion.section}"]`);
            if (btn) {
                btn.classList.add('btn-success');
                btn.classList.remove('btn-outline-primary');
                setTimeout(() => {
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-outline-primary');
                }, 1000);
            }
        }
        elements.suggestionsModal.hide();
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
            const text = await extractTextFromPDF(file);
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
            
        } catch (error) {
            console.error('Error processing file:', error);
            showError(error.message || 'Fehler beim Verarbeiten der Datei');
            
            // Input und UI zurücksetzen
            input.value = '';
            uploadArea.style.display = 'block';
            preview.style.display = 'none';
            preview.classList.add('d-none');
            
            // Gespeicherten Text löschen
            if (input.id === 'resumeUpload') {
                window.resumeText = null;
            }
            
            // Button-Status aktualisieren
            checkRequiredUploads();
        } finally {
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
        const resumeUploaded = window.resumeText && window.resumeText.trim().length > 0;
        
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
            
            // Drag & Drop Events
            area.addEventListener('dragenter', handleDragEnter);
            area.addEventListener('dragover', handleDragOver);
            area.addEventListener('dragleave', handleDragLeave);
            area.addEventListener('drop', handleDrop);
            
            // Click Events
            area.addEventListener('click', () => input.click());
            
            // File Input Change Event
            input.addEventListener('change', (e) => {
                e.stopPropagation();
                handleFileUpload(e);
            });
            
            // Remove Button in Preview
            const removeBtn = preview.querySelector('.btn-close');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => handleFileRemove(input.id));
            }
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

    // ===== Hauptfunktion für die Analyse =====
    async function handleAnalyze() {
        try {
            // Eingaben validieren
            if (!validateInputs()) {
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
            const suggestions = await generateSectionSuggestions('all', {
                job: jobAnalysis,
                resume: resumeAnalysis
            });

            // Vorschläge anwenden
            applySuggestions(suggestions);

            // Vorschau aktualisieren
            updatePreview();

            // Fortschritt aktualisieren
            updateProgressStep(3);

            // Erfolgsmeldung anzeigen
            showSuccess('Analyse erfolgreich abgeschlossen');

        } catch (error) {
            console.error('Analysis error:', error);
            showError(error.message || 'Fehler bei der Analyse');
        } finally {
            // Analyse-Button wieder aktivieren und Ladeanimation entfernen
            hideLoading(elements.analyzeBtn, 'Analysieren und Anschreiben erstellen');
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

    // ===== Initialisierung =====
    initializeEventListeners();
    initializeTextareaListeners();
    initializeFileUpload();
}); 
