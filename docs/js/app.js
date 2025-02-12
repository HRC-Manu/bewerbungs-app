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

    async function analyzeJobPosting(jobPosting) {
        try {
            if (!jobPosting || typeof jobPosting !== 'string') {
                throw new Error('Ungültige Stellenanzeige');
            }

            const text = jobPosting.toLowerCase();
            
            // Erweiterte Positionsanalyse
            const positionInfo = analyzePosition(text);
            const levelInfo = analyzeLevel(text);
            const departmentInfo = analyzeDepartment(text);
            
            // Detaillierte Unternehmensanalyse
            const companyInfo = analyzeCompany(text);
            
            // Strukturierte Anforderungsanalyse
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
            let score = 0;
            const totalCriteria = 3;
            
            // Vergleiche Position
            if (resume.personalInfo.position.toLowerCase().includes(job.jobTitle.position.toLowerCase())) {
                score += 1;
            }
            
            // Vergleiche Skills
            const requiredSkills = [...job.requirements.skills.technical, ...job.requirements.skills.soft];
            const candidateSkills = [...resume.skills.technical, ...resume.skills.soft];
            const skillMatch = requiredSkills.filter(skill => 
                candidateSkills.some(candidateSkill => 
                    candidateSkill.toLowerCase().includes(skill.toLowerCase())
                )
            ).length;
            
            if (skillMatch / requiredSkills.length > 0.5) {
                score += 1;
            }
            
            // Vergleiche Erfahrung
            if (resume.experience && resume.experience.length > 0) {
                score += 1;
            }
            
            return score / totalCriteria;
        } catch (error) {
            console.error('Error calculating match score:', error);
            return 0;
        }
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
            let content = '';
            
            switch (section) {
                case 'recipient':
                    content = LETTER_TEMPLATES.recipient[style].unknown;
                    break;
                    
                case 'subject':
                    const position = job.jobTitle.position;
                    content = LETTER_TEMPLATES.subject.standard(position);
                    break;
                    
                case 'introduction':
                    const company = job.company.name;
                    content = LETTER_TEMPLATES.introduction.jobPortal(job.jobTitle.position, company);
                    break;
                    
                case 'main':
                    content = generateMainContent(job, resume, context);
                    break;
                    
                case 'closing':
                    content = LETTER_TEMPLATES.closing.standard;
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

    function generateMainContent(job, resume, context) {
        try {
            const { matchScore, relevantExperience, keySkills } = context;
            let content = '';
            
            // Erfahrung und Qualifikation
            if (relevantExperience) {
                content += `Mit meiner Erfahrung als ${relevantExperience.title} bringe ich genau die Qualifikationen mit, die Sie suchen. `;
            }
            
            // Matching Skills
            if (keySkills.matching.length > 0) {
                content += `Meine Kernkompetenzen in ${keySkills.matching.join(', ')} entsprechen Ihren Anforderungen. `;
            }
            
            // Zusätzliche Skills
            if (keySkills.additional.length > 0) {
                content += `Darüber hinaus verfüge ich über Expertise in ${keySkills.additional.slice(0, 3).join(', ')}. `;
            }
            
            // Motivation
            content += `Die Position als ${job.jobTitle.position} bei ${job.company.name} reizt mich besonders, da sie meinem Wunsch nach ${job.company.culture.innovative ? 'innovativer Arbeit' : 'spannenden Herausforderungen'} entspricht.`;
            
            return content;
        } catch (error) {
            console.error('Error generating main content:', error);
            return '';
        }
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

    async function handleAnalyze() {
        try {
            // Eingaben validieren
            if (!validateInputs()) {
                return;
            }

            // Prüfen ob der Lebenslauf bereits hochgeladen wurde
            if (!window.resumeText) {
                showError('Bitte laden Sie zuerst Ihren Lebenslauf hoch');
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
            }).finally(() => {
                hideLoading(preview);
            });
            
        } catch (error) {
            console.error('Error handling file:', error);
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
            const removeBtn = preview.querySelector('.btn-close');
            
            // Click Event nur für das Label, nicht den gesamten Bereich
            const uploadLabel = area.querySelector('.upload-label');
            uploadLabel.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
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

    async function analyzeResume(resumeText) {
        try {
            if (!resumeText || typeof resumeText !== 'string') {
                throw new Error('Ungültiger Lebenslauf');
            }

            // Basis-Analyse des Lebenslaufs
            return {
                personalInfo: {
                    name: 'Bewerber',
                    position: 'Nicht spezifiziert',
                    experience: '0 Jahre'
                },
                skills: {
                    technical: [],
                    soft: []
                },
                experience: [],
                education: []
            };
        } catch (error) {
            console.error('Resume analysis error:', error);
            throw new Error('Lebenslauf-Analyse fehlgeschlagen');
        }
    }

    // ===== Initialisierung =====
    initializeEventListeners();
    initializeTextareaListeners();
    initializeFileUpload();
}); 
