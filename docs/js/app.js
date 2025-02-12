// Main application logic

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const jobPostingTextarea = document.getElementById('jobPosting');
    const resumeUpload = document.getElementById('resumeUpload');
    const coverLetterUpload = document.getElementById('coverLetterUpload');
    const coverLetterText = document.getElementById('coverLetterText');
    const generateBtn = document.getElementById('generateBtn');
    const exportWordBtn = document.getElementById('exportWordBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const coverLetterPreview = document.getElementById('coverLetterPreview');
    const resumePreview = document.getElementById('resumePreview');
    const loadExampleJobBtn = document.getElementById('loadExampleJobBtn');
    const loadExampleResumeBtn = document.getElementById('loadExampleResumeBtn');
    const loadExampleCoverLetterBtn = document.getElementById('loadExampleCoverLetterBtn');
    const messageToast = document.getElementById('messageToast');
    const bsToast = new bootstrap.Toast(messageToast);
    const coverLetterFilePreview = document.getElementById('coverLetterFilePreview');
    const resumeFilePreview = document.getElementById('resumeFilePreview');

    // DOM Elements for Cover Letter Builder
    const coverLetterBuilder = document.getElementById('coverLetterBuilder');
    const suggestionsModal = new bootstrap.Modal(document.getElementById('suggestionsModal'));
    const suggestionsList = document.getElementById('suggestionsList');
    const generateMoreBtn = document.getElementById('generateMoreBtn');
    const generateSuggestionsBtn = document.getElementById('generateSuggestionsBtn');
    const suggestButtons = document.querySelectorAll('.suggest-btn');

    // Cover Letter Sections
    const coverLetterSections = {
        recipient: document.getElementById('coverLetterRecipient'),
        subject: document.getElementById('coverLetterSubject'),
        introduction: document.getElementById('coverLetterIntro'),
        main: document.getElementById('coverLetterMain'),
        closing: document.getElementById('coverLetterClosing')
    };

    // Example job posting (Microsoft HR position)
    const exampleJobPosting = `Microsoft is on a mission to empower every person and every organization on the planet to achieve more. Our culture is centered on embracing a growth mindset, a theme of inspiring excellence, and encouraging teams and leaders to bring their best each day. In doing so, we create life-changing innovations that impact billions of lives around the world. You will help us achieve our mission based on our culture and values.

An exciting role has come up within the German HR Consulting team, primarily supporting Germany. This role is an individual contributor position and will report to the German HR Consulting Lead. You will work with many great leaders and managers to enable the success and further growth of Microsoft and actively nurture a Microsoft culture where all managers and employees can thrive. Your drive and focus will be centred on management capability.

Responsibilities:
- HR Solutions Consulting
- Employee Relations
- Capability Building
- HR Projects and Programs
- Queue Management

Qualifications:
- Extensive experience with Human Resources or Business programs/processes
- Bachelor's Degree
- Project and Change Management skills
- Excellent Influencing & Negotiating Skills
- German language skills are a plus`;

    // GitHub repository information
    const owner = 'hrc-manu';  // Dein GitHub Benutzername
    const repo = 'bewerbungs-app';
    const token = '';  // Token wird später über die GitHub Secrets eingebunden

    // Event Listeners
    generateBtn.addEventListener('click', handleGenerate);
    exportWordBtn.addEventListener('click', () => handleExport('word'));
    exportPdfBtn.addEventListener('click', () => handleExport('pdf'));
    resumeUpload.addEventListener('change', handleResumeUpload);
    coverLetterUpload.addEventListener('change', handleCoverLetterUpload);
    loadExampleJobBtn.addEventListener('click', loadExampleJob);
    loadExampleResumeBtn.addEventListener('click', loadExampleResume);
    loadExampleCoverLetterBtn.addEventListener('click', loadExampleCoverLetter);

    // Event Listeners for Cover Letter Builder
    generateSuggestionsBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        showLoading(generateSuggestionsBtn, 'Generiere Vorschläge...');
        try {
            await generateSuggestionsForSection('all');
        } catch (error) {
            showError('Fehler bei der Generierung der Vorschläge: ' + error.message);
        } finally {
            hideLoading(generateSuggestionsBtn, 'KI-Vorschläge generieren');
        }
    });

    generateMoreBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        showLoading(generateMoreBtn, 'Generiere weitere...');
        try {
            await generateMoreSuggestions();
        } catch (error) {
            showError('Fehler bei der Generierung weiterer Vorschläge: ' + error.message);
        } finally {
            hideLoading(generateMoreBtn, 'Weitere Vorschläge');
        }
    });

    suggestButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const section = e.target.dataset.section;
            const button = e.target;
            
            showLoading(button, 'Generiere...');
            try {
                await generateSuggestionsForSection(section);
            } catch (error) {
                showError('Fehler bei der Generierung der Vorschläge: ' + error.message);
            } finally {
                hideLoading(button, `Vorschläge für ${section}`);
            }
        });
    });

    // File preview delete buttons
    coverLetterFilePreview.querySelector('.btn-close').addEventListener('click', () => {
        coverLetterUpload.value = '';
        coverLetterFilePreview.classList.add('d-none');
        coverLetterText.disabled = false;
    });

    resumeFilePreview.querySelector('.btn-close').addEventListener('click', () => {
        resumeUpload.value = '';
        resumeFilePreview.classList.add('d-none');
    });

    // Load example job posting
    function loadExampleJob() {
        jobPostingTextarea.value = exampleJobPosting;
        showSuccess('Beispiel-Stellenanzeige geladen');
    }

    // Load example cover letter
    function loadExampleCoverLetter() {
        coverLetterSections.recipient.value = 'Sehr geehrte Damen und Herren,';
        coverLetterSections.subject.value = 'Bewerbung als HR Consultant';
        coverLetterSections.introduction.value = 'ich bewerbe mich mit großem Interesse auf die ausgeschriebene Position als HR Consultant bei Microsoft Deutschland.';
        coverLetterSections.main.value = 'Ihre Stellenanzeige hat mich sofort angesprochen, da sie perfekt zu meinem Profil und meinen Karrierezielen passt. Mit meiner umfangreichen Erfahrung im HR-Bereich und meinem Fokus auf Personalentwicklung und Change Management bin ich überzeugt, einen wertvollen Beitrag zu Ihrem Team leisten zu können.';
        coverLetterSections.closing.value = 'Über die Möglichkeit eines persönlichen Gesprächs freue ich mich sehr.';
        
        updateCoverLetterPreview();
        showSuccess('Beispiel-Anschreiben geladen');
    }

    // Load example resume
    async function loadExampleResume() {
        try {
            // Simuliere einen Datei-Upload
            const file = new File(['Beispiel Lebenslauf'], 'example_resume.pdf', { type: 'application/pdf' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            resumeUpload.files = dataTransfer.files;
            
            showSuccess('Beispiel-Lebenslauf geladen');
        } catch (error) {
            showError('Fehler beim Laden des Beispiel-Lebenslaufs');
            console.error('Error loading example resume:', error);
        }
    }

    // Analyze documents and generate cover letter with ChatGPT
    async function analyzeDocumentsAndGenerate() {
        showLoading(generateBtn, 'Analysiere Dokumente...');
        
        try {
            // Extract text from uploaded PDF resume
            let resumeText = '';
            if (resumeUpload.files[0]) {
                resumeText = await extractTextFromPDF(resumeUpload.files[0]);
            }

            // Extract text from uploaded PDF cover letter if exists
            let existingCoverLetter = '';
            if (coverLetterUpload.files[0]) {
                existingCoverLetter = await extractTextFromPDF(coverLetterUpload.files[0]);
            }

            // Get job posting text
            const jobPosting = jobPostingTextarea.value.trim();
            
            // Analyze documents with ChatGPT
            const analysis = await analyzeWithChatGPT(jobPosting, resumeText, existingCoverLetter);
            
            // Generate suggestions based on analysis
            const suggestions = await generateCoverLetterSuggestions('all', jobPosting, analysis);
            
            // Display suggestions in modal
            displaySuggestions(suggestions);
            
            showSuccess('Dokumente erfolgreich analysiert!');
            
        } catch (error) {
            showError('Fehler bei der Analyse: ' + error.message);
            console.error('Analysis error:', error);
        } finally {
            hideLoading(generateBtn, 'Generieren');
        }
    }

    // Extract text from PDF using pdf.js
    async function extractTextFromPDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
            let fullText = '';
            
            // Extract text from all pages
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
            }
            
            return fullText;
            
        } catch (error) {
            console.error('Error extracting PDF text:', error);
            throw new Error('PDF-Text konnte nicht extrahiert werden');
        }
    }

    // Analyze documents with ChatGPT
    async function analyzeWithChatGPT(jobPosting, resumeText = '', existingCoverLetter = '') {
        try {
            // Detaillierte Analyse der Stellenanzeige
            const jobAnalysis = {
                jobTitle: extractJobTitle(jobPosting),
                keyRequirements: extractKeyRequirements(jobPosting),
                responsibilities: extractResponsibilities(jobPosting),
                companyInfo: extractCompanyInfo(jobPosting),
                suggestedTone: determineTone(jobPosting),
                workEnvironment: extractWorkEnvironment(jobPosting),
                projectDetails: extractProjectInfo(jobPosting),
                teamStructure: extractTeamInfo(jobPosting)
            };

            // Analyse des Lebenslaufs, falls vorhanden
            let resumeAnalysis = {};
            if (resumeText) {
                resumeAnalysis = {
                    matchingSkills: findMatchingSkills(jobPosting, resumeText),
                    relevantExperience: findRelevantExperience(jobPosting, resumeText),
                    educationMatch: analyzeEducationMatch(jobPosting, resumeText),
                    industryExperience: analyzeIndustryExperience(jobPosting, resumeText),
                    achievements: extractAchievements(resumeText)
                };
            }

            // Analyse des bestehenden Anschreibens, falls vorhanden
            let coverLetterAnalysis = {};
            if (existingCoverLetter) {
                coverLetterAnalysis = {
                    structure: analyzeCoverLetterStructure(existingCoverLetter),
                    keyPhrases: extractKeyPhrases(existingCoverLetter),
                    tone: analyzeCoverLetterTone(existingCoverLetter),
                    style: analyzeCoverLetterStyle(existingCoverLetter)
                };
            }

            return {
                jobAnalysis,
                resumeAnalysis,
                coverLetterAnalysis
            };
        } catch (error) {
            console.error('Error in analyzeWithChatGPT:', error);
            throw error;
        }
    }

    // Helper functions for analysis
    function extractJobTitle(jobPosting) {
        // Erweiterte Suche nach Jobtitel mit mehr Kontexten
        const titlePatterns = [
            /(?:position|stelle|role)\s+(?:als|as)\s+([^.\n]+)/i,
            /^([^.\n]+)\s*(?:gesucht|wanted|position)/i,
            /job:\s*([^.\n]+)/i,
            /title:\s*([^.\n]+)/i
        ];

        for (const pattern of titlePatterns) {
            const match = jobPosting.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return 'die ausgeschriebene Position';
    }

    function extractKeyRequirements(jobPosting) {
        const requirementSections = [
            /(?:requirements|qualifications|anforderungen)[:]\s*((?:[^]*?)(?=\n\n|\n[A-Z]|$))/i,
            /(?:we\s+expect|wir\s+erwarten)[:]\s*((?:[^]*?)(?=\n\n|\n[A-Z]|$))/i,
            /(?:skills|fähigkeiten)[:]\s*((?:[^]*?)(?=\n\n|\n[A-Z]|$))/i
        ];

        const requirements = [];
        for (const pattern of requirementSections) {
            const reqSection = jobPosting.match(pattern);
            if (reqSection) {
                const reqText = reqSection[1];
                const bulletPoints = reqText.match(/[•\-*]\s*([^\n]+)/g) || 
                                     reqText.match(/\d+\.\s*([^\n]+)/g);
                
                if (bulletPoints) {
                    requirements.push(...bulletPoints.map(point => 
                        point.replace(/[•\-*\d.]\s*/, '').trim()
                    ));
                }
            }
        }

        // Fallback: Extrahiere wichtige Schlüsselwörter
        if (requirements.length === 0) {
            const keywords = jobPosting.match(/\b(erfahrung|skills?|qualifikation|kenntnisse?|fähigkeiten?)\b/gi);
            if (keywords) {
                requirements.push(...keywords);
            }
        }

        return requirements.slice(0, 5); // Begrenze auf 5 Anforderungen
    }

    function findMatchingSkills(jobPosting, resumeText) {
        const requirements = extractKeyRequirements(jobPosting);
        const skills = new Set();

        // Extrahiere Fachbegriffe und Schlüsselkompetenzen
        const skillPatterns = [
            /\b(management|consulting|project|entwicklung|strategie|kommunikation|analyse)\b/gi,
            /\b(erfahrung|expertise|spezialisiert|kenntnisse)\s+in\s+([^\n.]+)/gi
        ];

        requirements.forEach(req => {
            const skillWords = req.toLowerCase().match(/\b\w+\b/g) || [];
            skillWords.forEach(skill => {
                if (resumeText.toLowerCase().includes(skill)) {
                    skills.add(skill);
                }
            });
        });

        // Zusätzliche Skill-Extraktion aus der Stellenanzeige
        skillPatterns.forEach(pattern => {
            const matches = jobPosting.matchAll(pattern);
            for (const match of matches) {
                const skill = match[1] || match[2];
                if (skill) {
                    skills.add(skill.toLowerCase().trim());
                }
            }
        });

        return Array.from(skills).slice(0, 4); // Begrenze auf 4 Skills
    }

    function determineTone(jobPosting) {
        const formalIndicators = ['formal', 'professional', 'qualified', 'experienced'];
        const casualIndicators = ['creative', 'dynamic', 'innovative', 'startup'];
        
        let formalCount = 0;
        let casualCount = 0;
        
        const text = jobPosting.toLowerCase();
        formalIndicators.forEach(word => {
            if (text.includes(word)) formalCount++;
        });
        casualIndicators.forEach(word => {
            if (text.includes(word)) casualCount++;
        });
        
        return formalCount >= casualCount ? 'formal' : 'casual';
    }

    function extractCompanyInfo(jobPosting) {
        const companyInfo = {
            name: '',
            culture: '',
            values: []
        };
        
        // Verbesserte Extraktion des Unternehmensnamens
        const namePatterns = [
            /(?:at|bei)\s+([A-Z][A-Za-z\s]+)/,
            /company:\s*([A-Z][A-Za-z\s]+)/i,
            /unternehmen:\s*([A-Z][A-Za-z\s]+)/i
        ];

        for (const pattern of namePatterns) {
            const nameMatch = jobPosting.match(pattern);
            if (nameMatch) {
                companyInfo.name = nameMatch[1].trim();
                break;
            }
        }

        // Fallback: Verwende das erste Wort der Stellenanzeige, wenn es großgeschrieben ist
        if (!companyInfo.name) {
            const fallbackMatch = jobPosting.match(/^([A-Z][a-zA-Z0-9]+)/);
            if (fallbackMatch) {
                companyInfo.name = fallbackMatch[1].trim();
            }
        }

        // Extraktion von Unternehmenskultur und Werten
        const culturePatterns = [
            /(?:culture|kultur)[:]\s*([^.]+)/i,
            /(?:values|werte)[:]\s*([^.]+)/i,
            /unsere\s+kultur\s*[:]\s*([^.]+)/i
        ];

        for (const pattern of culturePatterns) {
            const cultureMatch = jobPosting.match(pattern);
            if (cultureMatch) {
                companyInfo.culture = cultureMatch[1].trim();
                break;
            }
        }

        // Fallback: Extrahiere Schlüsselwörter zur Unternehmenskultur
        if (!companyInfo.culture) {
            const cultureKeywords = jobPosting.match(/\b(innovativ|dynamisch|kreativ|modern|teamorientiert)\b/gi);
            if (cultureKeywords) {
                companyInfo.culture = cultureKeywords.join(', ');
            }
        }

        return companyInfo;
    }

    // Generate suggestions using ChatGPT with analysis
    async function generateCoverLetterSuggestions(section, jobPosting, analysis) {
        try {
            console.log('Generating suggestions - Input:', { section, jobPosting, analysis });

            // Ensure analysis object has all required properties
            const safeAnalysis = {
                jobTitle: analysis.jobAnalysis.jobTitle || 'die ausgeschriebene Position',
                companyInfo: analysis.jobAnalysis.companyInfo || { name: 'das Unternehmen', culture: '' },
                matchingSkills: analysis.jobAnalysis.resumeAnalysis.matchingSkills || [],
                keyRequirements: analysis.jobAnalysis.keyRequirements || [],
                responsibilities: analysis.jobAnalysis.responsibilities || [],
                workEnvironment: analysis.jobAnalysis.workEnvironment || '',
                projectDetails: analysis.jobAnalysis.projectDetails || '',
                teamStructure: analysis.jobAnalysis.teamStructure || ''
            };

            console.log('Safe Analysis:', safeAnalysis);

            // Customize prompts based on analysis
            const prompts = {
                recipient: [
                    { section: 'recipient', text: "Sehr geehrte Damen und Herren," },
                    { section: 'recipient', text: `Sehr geehrte Frau ${safeAnalysis.companyInfo.name},` },
                    { section: 'recipient', text: `Sehr geehrter Herr ${safeAnalysis.companyInfo.name},` }
                ],
                subject: [
                    { section: 'subject', text: `Bewerbung als ${safeAnalysis.jobTitle} - Referenz: [Jobcode]` },
                    { section: 'subject', text: `Ihre Stellenanzeige: ${safeAnalysis.jobTitle} vom [Datum]` },
                    { section: 'subject', text: `Bewerbung für die Position als ${safeAnalysis.jobTitle}` }
                ],
                introduction: [
                    { section: 'introduction', text: `mit großem Interesse habe ich Ihre Stellenanzeige für die Position als ${safeAnalysis.jobTitle} gelesen und bewerbe mich um diese spannende Aufgabe.` },
                    { section: 'introduction', text: `Ihre ausgeschriebene Stelle als ${safeAnalysis.jobTitle} hat sofort mein Interesse geweckt, da sie perfekt zu meinem Profil passt.` },
                    { section: 'introduction', text: `auf der Suche nach einer neuen beruflichen Herausforderung bin ich auf Ihre Stellenanzeige als ${safeAnalysis.jobTitle} gestoßen und möchte mich hiermit bewerben.` }
                ],
                main: [
                    { 
                        section: 'main', 
                        text: `Durch meine Erfahrung in ${safeAnalysis.matchingSkills.length > 0 ? safeAnalysis.matchingSkills.join(', ') : 'relevanten Bereichen'} bringe ich ideale Voraussetzungen mit. ${safeAnalysis.companyInfo.culture || ''}`
                    },
                    { 
                        section: 'main', 
                        text: `Meine Stärken liegen besonders in ${safeAnalysis.matchingSkills.slice(0, 2).length > 0 ? safeAnalysis.matchingSkills.slice(0, 2).join(' und ') : 'meinen Kompetenzen'}. Diese konnte ich in meinen bisherigen Positionen erfolgreich einsetzen und weiterentwickeln.`
                    },
                    { 
                        section: 'main', 
                        text: `Was mich besonders an der Position reizt, ist die Möglichkeit, meine Erfahrungen in ${safeAnalysis.matchingSkills[0] || 'meinem Fachgebiet'} einzubringen und dabei in einem innovativen Umfeld zu arbeiten.`
                    }
                ],
                closing: [
                    { section: 'closing', text: "Über die Möglichkeit eines persönlichen Gesprächs freue ich mich sehr." },
                    { section: 'closing', text: "Gerne stelle ich Ihnen meine Qualifikationen in einem persönlichen Gespräch vor." },
                    { section: 'closing', text: "Ich freue mich darauf, Sie in einem persönlichen Gespräch von meiner Eignung zu überzeugen." }
                ]
            };

            console.log('Prompts:', prompts);

            // Handle 'all' section generation
            if (section === 'all') {
                const allSections = ['recipient', 'subject', 'introduction', 'main', 'closing'];
                const allSuggestions = allSections
                    .map(sec => {
                        const sectionPrompts = prompts[sec];
                        console.log(`Suggestions for ${sec}:`, sectionPrompts);
                        return sectionPrompts && sectionPrompts.length > 0 
                            ? sectionPrompts[0] 
                            : null;
                    })
                    .filter(suggestion => suggestion !== null);
                
                console.log('All Suggestions:', allSuggestions);
                return allSuggestions;
            } 
            
            // Return section-specific suggestions
            const sectionSuggestions = prompts[section] || [];
            console.log(`Suggestions for ${section}:`, sectionSuggestions);
            return sectionSuggestions;
            
        } catch (error) {
            console.error('Error generating suggestions:', error);
            return [];
        }
    }

    // Handle generate click
    async function handleGenerate() {
        if (!validateInputs()) {
            return;
        }

        showLoading(generateBtn, 'Generiere...');
        
        try {
            // Get job posting text
            const jobPosting = jobPostingTextarea.value.trim();
            
            // Extract text from uploaded PDFs if available
            let resumeText = '';
            if (resumeUpload.files[0]) {
                resumeText = await extractTextFromPDF(resumeUpload.files[0]);
            }
            
            // Analyze with ChatGPT
            const analysis = await analyzeWithChatGPT(jobPosting, resumeText);
            console.log('Analysis Result:', analysis);
            
            // Generate suggestions for all sections
            const suggestions = await generateCoverLetterSuggestions('all', jobPosting, analysis);
            console.log('Generated Suggestions:', suggestions);
            
            // Apply suggestions to create a complete cover letter
            let completeCoverLetter = '';
            suggestions.forEach(suggestion => {
                console.log('Processing Suggestion:', suggestion);
                if (suggestion && suggestion.section && suggestion.text) {
                    completeCoverLetter += suggestion.text + '\n\n';
                }
            });
            
            completeCoverLetter += 'Mit freundlichen Grüßen\n[Ihr Name]';

            // Update the preview with the complete document
            coverLetterPreview.innerHTML = `<div class="generated-content">
                <h2 class="mb-4">Anschreiben</h2>
                ${formatText(completeCoverLetter)}
            </div>`;

            // Only show resume preview if a resume was uploaded
            if (resumeText) {
                resumePreview.innerHTML = `<div class="generated-content">
                    <h2 class="mb-4">Lebenslauf</h2>
                    ${formatText(resumeText)}
                </div>`;
            }
            
            showSuccess('Anschreiben erfolgreich generiert!');
            
            // Automatically fill the form sections with the generated content
            const sections = completeCoverLetter.split('\n\n');
            if (sections.length >= 5) {
                coverLetterSections.recipient.value = sections[0];
                coverLetterSections.subject.value = sections[1];
                coverLetterSections.introduction.value = sections[2];
                coverLetterSections.main.value = sections[3];
                coverLetterSections.closing.value = sections[4];
            }
            
        } catch (error) {
            showError('Fehler bei der Generierung: ' + error.message);
            console.error('Generation error:', error);
        } finally {
            hideLoading(generateBtn, 'Generieren');
        }
    }

    // Format text with proper HTML structure
    function formatText(text) {
        return text
            .split('\n\n')
            .map(paragraph => `<p class="mb-3">${paragraph.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    // Validate user inputs with detailed feedback
    function validateInputs() {
        const errors = [];

        // Validate job posting
        if (!jobPostingTextarea.value.trim()) {
            errors.push('Bitte füge eine Stellenanzeige ein');
        } else if (jobPostingTextarea.value.trim().length < 50) {
            errors.push('Die Stellenanzeige scheint zu kurz zu sein. Bitte füge mehr Details ein');
        }

        // Only validate resume if we're not just generating a cover letter
        if (resumeUpload.files[0] && resumeUpload.files[0].size > 10 * 1024 * 1024) { // 10MB limit
            errors.push('Die Lebenslauf-Datei ist zu groß (maximal 10MB)');
        }

        if (errors.length > 0) {
            errors.forEach(error => showError(error));
            return false;
        }

        return true;
    }

    // Handle file validation
    function validateFile(file, type) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['application/pdf'];
        
        if (!file) {
            return { valid: false, error: `Bitte wähle eine ${type}-Datei aus` };
        }
        
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: `Bitte lade eine PDF-Datei als ${type} hoch` };
        }
        
        if (file.size > maxSize) {
            return { valid: false, error: `Die ${type}-Datei ist zu groß (maximal 10MB)` };
        }
        
        return { valid: true };
    }

    // Handle resume file upload with improved validation
    function handleResumeUpload(event) {
        const file = event.target.files[0];
        const validation = validateFile(file, 'Lebenslauf');
        
        if (!validation.valid) {
            showError(validation.error);
            event.target.value = '';
            resumeFilePreview.classList.add('d-none');
            return;
        }

        showSuccess('Lebenslauf erfolgreich hochgeladen');
        resumeFilePreview.querySelector('.file-name').textContent = file.name;
        resumeFilePreview.classList.remove('d-none');
        
        // Optional: Preview first page of PDF
        previewPDF(file, 'resumePreview');
    }

    // Handle cover letter file upload with improved validation
    function handleCoverLetterUpload(event) {
        const file = event.target.files[0];
        const validation = validateFile(file, 'Anschreiben');
        
        if (!validation.valid) {
            showError(validation.error);
            event.target.value = '';
            coverLetterFilePreview.classList.add('d-none');
            coverLetterText.disabled = false;
            return;
        }

        showSuccess('Anschreiben erfolgreich hochgeladen');
        coverLetterFilePreview.querySelector('.file-name').textContent = file.name;
        coverLetterFilePreview.classList.remove('d-none');
        coverLetterText.value = '';
        coverLetterText.disabled = true;
        
        // Optional: Preview first page of PDF
        previewPDF(file, 'coverLetterPreview');
    }

    // Preview PDF file (first page)
    async function previewPDF(file, previewElementId) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({scale: 1.5});
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            const previewElement = document.getElementById(previewElementId);
            previewElement.innerHTML = '';
            previewElement.appendChild(canvas);
        } catch (error) {
            console.error('Error previewing PDF:', error);
            // Fallback to text preview
            showError('PDF-Vorschau konnte nicht geladen werden');
        }
    }

    // Improved export function with progress tracking
    async function handleExport(format) {
        const exportBtn = format === 'word' ? exportWordBtn : exportPdfBtn;
        
        if (!validateInputs()) {
            return;
        }

        showLoading(exportBtn, 'Exportiere...');
        
        try {
            // Create a more structured document
            const documentData = {
                coverLetter: {
                    content: coverLetterPreview.innerHTML,
                    metadata: {
                        type: coverLetterUpload.files[0] ? 'pdf' : 'text',
                        filename: coverLetterUpload.files[0]?.name
                    }
                },
                resume: {
                    content: resumePreview.innerHTML,
                    metadata: {
                        filename: resumeUpload.files[0]?.name
                    }
                },
                jobPosting: {
                    content: jobPostingTextarea.value,
                    metadata: {
                        timestamp: new Date().toISOString()
                    }
                }
            };

            // Create export options
            const exportOptions = {
                format: format,
                styling: {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '11pt',
                    lineHeight: '1.5',
                    margins: {
                        top: '2.5cm',
                        bottom: '2cm',
                        left: '2.5cm',
                        right: '2cm'
                    }
                }
            };

            const blob = await generateDocument(documentData, exportOptions);
            await downloadDocument(blob, `bewerbung.${format === 'word' ? 'doc' : 'pdf'}`);

            showSuccess(`Dokument als ${format.toUpperCase()} exportiert!`);
            
            // Optional: Save export history
            saveExportHistory(documentData, format);
            
        } catch (error) {
            showError('Fehler beim Export: ' + error.message);
            console.error('Export error:', error);
        } finally {
            hideLoading(exportBtn, format === 'word' ? 'Als Word exportieren' : 'Als PDF exportieren');
        }
    }

    // Generate document with proper styling
    async function generateDocument(data, options) {
        const { format, styling } = options;
        
        if (format === 'word') {
            const htmlContent = `
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body {
                                font-family: ${styling.fontFamily};
                                font-size: ${styling.fontSize};
                                line-height: ${styling.lineHeight};
                                margin: ${styling.margins.top} ${styling.margins.right} ${styling.margins.bottom} ${styling.margins.left};
                            }
                            .section { margin-bottom: 20px; }
                            .page-break { page-break-before: always; }
                            .header { margin-bottom: 30px; }
                            .footer { margin-top: 30px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Bewerbungsunterlagen</h1>
                            <p>Erstellt am ${new Date().toLocaleDateString()}</p>
                        </div>
                        
                        <div class="section">
                            <h2>Anschreiben</h2>
                            ${data.coverLetter.content}
                        </div>
                        
                        <div class="page-break"></div>
                        
                        <div class="section">
                            <h2>Lebenslauf</h2>
                            ${data.resume.content}
                        </div>
                        
                        <div class="footer">
                            <p>Generiert mit Job Application Assistant</p>
                        </div>
                    </body>
                </html>
            `;
            return new Blob([htmlContent], { type: 'application/msword' });
        } else {
            // For PDF, we'll use the same HTML but return it as text/html
            // The actual PDF conversion will happen server-side
            return new Blob([data.coverLetter.content + '\n\n' + data.resume.content], 
                          { type: 'text/plain' });
        }
    }

    // Download the generated document
    async function downloadDocument(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    // Save export history to localStorage
    function saveExportHistory(data, format) {
        try {
            const history = JSON.parse(localStorage.getItem('exportHistory') || '[]');
            history.push({
                timestamp: new Date().toISOString(),
                format: format,
                metadata: {
                    coverLetterType: data.coverLetter.metadata.type,
                    resumeFilename: data.resume.metadata.filename,
                    jobPostingLength: data.jobPosting.content.length
                }
            });
            localStorage.setItem('exportHistory', JSON.stringify(history.slice(-10))); // Keep last 10 exports
        } catch (error) {
            console.error('Error saving export history:', error);
        }
    }

    // Update preview sections with generated content
    function updatePreviews(data) {
        console.log('Aktualisiere Vorschau:', data);
        
        // Formatiere den Text mit HTML-Zeilenumbrüchen
        const formatText = (text) => {
            return text
                .replace(/\n\n/g, '</p><p>')  // Doppelte Zeilenumbrüche als neue Absätze
                .replace(/\n/g, '<br>')       // Einzelne Zeilenumbrüche als <br>
                .replace(/•/g, '&#8226;');    // Aufzählungspunkte korrekt darstellen
        };

        // Aktualisiere die Vorschau-Bereiche
        coverLetterPreview.innerHTML = `<p>${formatText(data.coverLetter)}</p>`;
        resumePreview.innerHTML = `<p>${formatText(data.resume)}</p>`;
    }

    // Generate example cover letter
    function generateExampleCoverLetter() {
        return `Sehr geehrte Damen und Herren,

ich bewerbe mich mit großem Interesse auf die ausgeschriebene Position als HR Consultant bei Microsoft Deutschland.

Ihre Stellenanzeige hat mich sofort angesprochen, da sie perfekt zu meinem Profil und meinen Karrierezielen passt. Mit meiner umfangreichen Erfahrung im HR-Bereich und meinem Fokus auf Personalentwicklung und Change Management bin ich überzeugt, einen wertvollen Beitrag zu Ihrem Team leisten zu können.

Mit freundlichen Grüßen
Max Mustermann`;
    }

    // Generate example resume
    function generateExampleResume() {
        return `BERUFSERFAHRUNG

Senior HR Business Partner | SAP SE
2018 - heute
• Beratung von Führungskräften in HR-Prozessen
• Entwicklung und Implementierung von HR-Strategien
• Leitung von Change Management Projekten

HR Consultant | Accenture GmbH
2015 - 2018
• Betreuung internationaler HR-Projekte
• Training und Coaching von Führungskräften`;
    }

    // Show loading state
    function showLoading(button, text) {
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${text}`;
    }

    // Hide loading state
    function hideLoading(button, text) {
        button.disabled = false;
        button.innerHTML = text;
    }

    // Show success message
    function showSuccess(message) {
        document.getElementById('toastTitle').textContent = 'Erfolg';
        document.getElementById('toastMessage').textContent = message;
        messageToast.classList.remove('bg-danger');
        messageToast.classList.add('bg-success');
        bsToast.show();
    }

    // Show error message
    function showError(message) {
        document.getElementById('toastTitle').textContent = 'Fehler';
        document.getElementById('toastMessage').textContent = message;
        messageToast.classList.remove('bg-success');
        messageToast.classList.add('bg-danger');
        bsToast.show();
        console.error(message);
    }

    // Track current section and suggestions
    let currentSection = '';
    let currentSuggestions = [];

    // Generate suggestions for a specific section
    async function generateSuggestionsForSection(section) {
        try {
            const jobPosting = jobPostingTextarea.value.trim();
            if (!jobPosting) {
                showError('Bitte füge zuerst eine Stellenanzeige ein');
                return [];
            }

            // Extract text from resume and cover letter if available
            let resumeText = '';
            let existingCoverLetter = '';
            
            if (resumeUpload.files[0]) {
                resumeText = await extractTextFromPDF(resumeUpload.files[0]);
            }
            
            if (coverLetterUpload.files[0]) {
                existingCoverLetter = await extractTextFromPDF(coverLetterUpload.files[0]);
            }

            // Analyze with ChatGPT
            const analysis = await analyzeWithChatGPT(jobPosting, resumeText, existingCoverLetter);
            
            // Generate suggestions based on analysis
            const suggestions = [];
            const jobTitle = analysis.jobAnalysis.jobTitle;
            const companyName = analysis.jobAnalysis.companyInfo.name || 'das Unternehmen';
            const skills = analysis.resumeAnalysis.matchingSkills || [];
            const requirements = analysis.jobAnalysis.keyRequirements || [];
            const responsibilities = analysis.jobAnalysis.responsibilities || [];
            const workEnvironment = analysis.jobAnalysis.workEnvironment || '';
            const teamInfo = analysis.jobAnalysis.teamStructure || '';
            
            // Verwende Struktur und Phrasen aus bestehendem Anschreiben, falls vorhanden
            const existingStyle = analysis.coverLetterAnalysis.style || {};
            const existingTone = analysis.coverLetterAnalysis.tone || 'formal';
            const existingPhrases = analysis.coverLetterAnalysis.keyPhrases || [];
            
            if (section === 'all') {
                const allSections = ['recipient', 'subject', 'introduction', 'main', 'closing'];
                const allSuggestions = [];
                
                for (const sec of allSections) {
                    const secSuggestions = await generateSuggestionsForSection(sec);
                    if (secSuggestions && secSuggestions.length > 0) {
                        allSuggestions.push(secSuggestions[0]);
                    }
                }
                
                displaySuggestions(allSuggestions);
                return allSuggestions;
            }
            
            // Generate section-specific suggestions
            switch(section) {
                case 'recipient':
                    suggestions.push({
                        section: 'recipient',
                        text: `Sehr geehrte Damen und Herren,`
                    });
                    if (companyName !== 'das Unternehmen') {
                        suggestions.push({
                            section: 'recipient',
                            text: `Sehr geehrte Frau [Name],\nSehr geehrter Herr [Name],`
                        });
                    }
                    break;
                    
                case 'subject':
                    suggestions.push({
                        section: 'subject',
                        text: `Bewerbung als ${jobTitle}`
                    });
                    suggestions.push({
                        section: 'subject',
                        text: `Bewerbung für die Position als ${jobTitle} - Referenz: [Jobcode]`
                    });
                    suggestions.push({
                        section: 'subject',
                        text: `Ihre Stellenanzeige: ${jobTitle} vom [Datum]`
                    });
                    break;
                    
                case 'introduction':
                    const introTemplates = [
                        `mit großem Interesse habe ich Ihre Stellenanzeige für die Position als ${jobTitle} bei ${companyName} gelesen und bewerbe mich hiermit um diese spannende Aufgabe.`,
                        `Ihre ausgeschriebene Stelle als ${jobTitle} hat sofort mein Interesse geweckt, da sie perfekt zu meinem Profil passt.`,
                        `auf der Suche nach einer neuen beruflichen Herausforderung bin ich auf Ihre Stellenanzeige als ${jobTitle} gestoßen und möchte mich hiermit bewerben.`
                    ];
                    
                    introTemplates.forEach(template => {
                        suggestions.push({
                            section: 'introduction',
                            text: template
                        });
                    });
                    break;
                    
                case 'main':
                    const skillsText = skills.length > 0 ? 
                        `Meine Erfahrungen in ${skills.join(', ')} passen optimal zu Ihren Anforderungen.` :
                        'Meine bisherigen Erfahrungen passen optimal zu Ihren Anforderungen.';
                    
                    const requirementsText = requirements.length > 0 ?
                        `Die von Ihnen gewünschten Qualifikationen wie ${requirements.slice(0, 3).join(', ')} bringe ich bereits mit.` :
                        'Die gewünschten Qualifikationen bringe ich bereits mit.';
                    
                    const responsibilitiesText = responsibilities.length > 0 ?
                        `Besonders reizen mich die Aufgaben ${responsibilities.slice(0, 2).join(' und ')}.` :
                        '';
                    
                    const environmentText = workEnvironment ?
                        `Das ${workEnvironment} spricht mich besonders an.` :
                        '';
                    
                    const teamText = teamInfo ?
                        `Die Aussicht, mit ${teamInfo} zusammenzuarbeiten, motiviert mich sehr.` :
                        '';
                    
                    suggestions.push({
                        section: 'main',
                        text: `${skillsText} ${requirementsText} ${responsibilitiesText}`
                    });
                    
                    suggestions.push({
                        section: 'main',
                        text: `Was mich besonders an der Position reizt, ist die Möglichkeit ${skills[0] || 'meine Fähigkeiten'} bei ${companyName} einzubringen und weiterzuentwickeln. ${environmentText} ${teamText}`
                    });
                    
                    suggestions.push({
                        section: 'main',
                        text: `In meiner bisherigen Laufbahn konnte ich bereits umfangreiche Erfahrungen in ${skills.slice(0, 2).join(' und ') || 'relevanten Bereichen'} sammeln. Diese Expertise möchte ich nun gerne bei ${companyName} einbringen.`
                    });
                    break;
                    
                case 'closing':
                    suggestions.push({
                        section: 'closing',
                        text: `Über die Möglichkeit eines persönlichen Gesprächs freue ich mich sehr.`
                    });
                    suggestions.push({
                        section: 'closing',
                        text: `Gerne stelle ich Ihnen meine Qualifikationen in einem persönlichen Gespräch vor.`
                    });
                    suggestions.push({
                        section: 'closing',
                        text: `Ich freue mich darauf, Sie in einem persönlichen Gespräch von meiner Eignung zu überzeugen.`
                    });
                    break;
            }
            
            if (section !== 'all') {
                displaySuggestions(suggestions);
            }
            
            return suggestions;
            
        } catch (error) {
            showError('Fehler bei der Generierung der Vorschläge: ' + error.message);
            console.error('Suggestion generation error:', error);
            return [];
        }
    }

    // Generate more suggestions
    function generateMoreSuggestions() {
        // Implement logic to generate more suggestions
        showError('Feature not implemented yet');
    }

    // Display suggestions in modal
    function displaySuggestions(suggestions) {
        currentSuggestions = suggestions;
        suggestionsList.innerHTML = '';
        
        suggestions.forEach((suggestion, index) => {
            const button = document.createElement('button');
            button.className = 'list-group-item list-group-item-action';
            button.innerHTML = suggestion.text.replace(/\n/g, '<br>');
            button.onclick = () => applySuggestion(index);
            suggestionsList.appendChild(button);
        });
        
        suggestionsModal.show();
    }

    // Apply selected suggestion
    function applySuggestion(index) {
        const suggestion = currentSuggestions[index];
        if (!suggestion) return;

        if (suggestion.section === 'all') {
            // Apply complete cover letter
            Object.keys(coverLetterSections).forEach(section => {
                const sectionSuggestion = currentSuggestions.find(s => s.section === section);
                if (sectionSuggestion) {
                    coverLetterSections[section].value = sectionSuggestion.text;
                }
            });
        } else {
            // Apply specific section
            const targetSection = coverLetterSections[suggestion.section];
            if (targetSection) {
                targetSection.value = suggestion.text;
            }
        }
        
        updateCoverLetterPreview();
        suggestionsModal.hide();
    }

    // Update cover letter preview
    function updateCoverLetterPreview() {
        const sections = {
            recipient: coverLetterSections.recipient.value,
            subject: coverLetterSections.subject.value,
            introduction: coverLetterSections.introduction.value,
            main: coverLetterSections.main.value,
            closing: coverLetterSections.closing.value
        };

        let preview = '';
        if (sections.recipient) preview += `<p class="mb-4">${sections.recipient}</p>`;
        if (sections.subject) preview += `<p class="mb-4"><strong>${sections.subject}</strong></p>`;
        if (sections.introduction) preview += `<p class="mb-3">${sections.introduction}</p>`;
        if (sections.main) preview += `<p class="mb-3">${sections.main}</p>`;
        if (sections.closing) preview += `<p class="mb-3">${sections.closing}</p>`;
        if (preview) preview += `<p class="mt-4">Mit freundlichen Grüßen<br>[Ihr Name]</p>`;

        coverLetterPreview.innerHTML = preview || 'Hier erscheint die Vorschau des Anschreibens...';
    }

    // DOM Elements
    const filePreviewModal = new bootstrap.Modal(document.getElementById('filePreviewModal'));
    const filePreviewContent = document.getElementById('filePreviewContent');

    // Add click handlers for file previews
    coverLetterFilePreview.querySelector('.alert').addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-close')) {
            showFilePreview(coverLetterUpload.files[0], 'Anschreiben');
        }
    });

    resumeFilePreview.querySelector('.alert').addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn-close')) {
            showFilePreview(resumeUpload.files[0], 'Lebenslauf');
        }
    });

    // Show file preview in modal
    async function showFilePreview(file, title) {
        if (!file) return;
        
        filePreviewModal._element.querySelector('.modal-title').textContent = title;
        filePreviewContent.innerHTML = '<div class="text-center"><div class="spinner-border"></div></div>';
        filePreviewModal.show();
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
            filePreviewContent.innerHTML = '';
            
            // Render all pages
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({scale: 1.5});
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                
                filePreviewContent.appendChild(canvas);
                if (i < pdf.numPages) {
                    filePreviewContent.appendChild(document.createElement('hr'));
                }
            }
        } catch (error) {
            console.error('Error previewing PDF:', error);
            filePreviewContent.innerHTML = '<div class="alert alert-danger">Fehler beim Laden der Vorschau</div>';
        }
    }

    // Update preview when any section changes
    Object.values(coverLetterSections).forEach(section => {
        section.addEventListener('input', updateCoverLetterPreview);
    });

    // Neue Analysefunktionen
    function extractResponsibilities(jobPosting) {
        const responsibilities = [];
        const sections = jobPosting.match(/(?:responsibilities|aufgaben|tätigkeiten)[:]\s*((?:[^]*?)(?=\n\n|\n[A-Z]|$))/i);
        
        if (sections) {
            const bulletPoints = sections[1].match(/[•\-*]\s*([^\n]+)/g);
            if (bulletPoints) {
                responsibilities.push(...bulletPoints.map(point => point.replace(/[•\-*]\s*/, '').trim()));
            }
        }
        
        return responsibilities;
    }

    function extractWorkEnvironment(jobPosting) {
        const environmentPatterns = [
            /(?:environment|arbeitsumgebung|umfeld)[:]\s*([^.]+)/i,
            /(?:we offer|wir bieten)[:]\s*([^.]+)/i,
            /(?:benefits|vorteile)[:]\s*([^.]+)/i
        ];

        for (const pattern of environmentPatterns) {
            const match = jobPosting.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return '';
    }

    function extractProjectInfo(jobPosting) {
        const projectPatterns = [
            /(?:projects?|projekte?)[:]\s*([^.]+)/i,
            /(?:initiatives?|initiativen?)[:]\s*([^.]+)/i
        ];

        for (const pattern of projectPatterns) {
            const match = jobPosting.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return '';
    }

    function extractTeamInfo(jobPosting) {
        const teamPatterns = [
            /(?:team|gruppe|abteilung)[:]\s*([^.]+)/i,
            /(?:you will work with|du arbeitest mit|sie arbeiten mit)[:]\s*([^.]+)/i
        ];

        for (const pattern of teamPatterns) {
            const match = jobPosting.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return '';
    }

    function findRelevantExperience(jobPosting, resumeText) {
        const relevantExperience = [];
        const requirements = extractKeyRequirements(jobPosting);
        
        // Suche nach Erfahrungen im Lebenslauf, die zu den Anforderungen passen
        const experienceBlocks = resumeText.split(/\n{2,}/);
        
        experienceBlocks.forEach(block => {
            requirements.forEach(req => {
                if (block.toLowerCase().includes(req.toLowerCase())) {
                    relevantExperience.push({
                        requirement: req,
                        experience: block.trim()
                    });
                }
            });
        });
        
        return relevantExperience;
    }

    function analyzeEducationMatch(jobPosting, resumeText) {
        const requiredEducation = jobPosting.match(/(?:education|ausbildung|studium)[:]\s*([^.]+)/i);
        const educationSection = resumeText.match(/(?:education|ausbildung|studium)[\s\S]*?(?=\n\n|\n[A-Z]|$)/i);
        
        return {
            required: requiredEducation ? requiredEducation[1].trim() : '',
            actual: educationSection ? educationSection[0].trim() : '',
            matches: educationSection && requiredEducation ? 
                     educationSection[0].toLowerCase().includes(requiredEducation[1].toLowerCase()) : 
                     false
        };
    }

    function analyzeIndustryExperience(jobPosting, resumeText) {
        const industries = new Set();
        const industryPatterns = [
            /(?:industry|branche|sektor)[:]\s*([^.]+)/i,
            /(?:experience in|erfahrung in)[:]\s*([^.]+)/i
        ];

        industryPatterns.forEach(pattern => {
            const matches = jobPosting.match(pattern);
            if (matches) {
                industries.add(matches[1].trim());
            }
        });

        return Array.from(industries);
    }

    function extractAchievements(resumeText) {
        const achievements = [];
        const achievementPatterns = [
            /(?:achievements?|erfolge?|leistungen?)[:]\s*([^.]+)/i,
            /(?:accomplished|erreicht|umgesetzt)[:]\s*([^.]+)/i
        ];

        achievementPatterns.forEach(pattern => {
            const matches = resumeText.match(pattern);
            if (matches) {
                achievements.push(matches[1].trim());
            }
        });

        return achievements;
    }

    function analyzeCoverLetterStructure(coverLetter) {
        const structure = {
            hasRecipient: /sehr geehrte/i.test(coverLetter),
            hasSubject: /betreff|bewerbung als/i.test(coverLetter),
            hasIntroduction: /interesse|bewerbe/i.test(coverLetter),
            hasMainBody: /.{200,}/i.test(coverLetter),
            hasClosing: /freue|grüße/i.test(coverLetter)
        };

        return structure;
    }

    function extractKeyPhrases(coverLetter) {
        const phrases = [];
        const paragraphs = coverLetter.split(/\n{2,}/);
        
        paragraphs.forEach(paragraph => {
            if (paragraph.length > 50) {
                phrases.push(paragraph.trim());
            }
        });

        return phrases;
    }

    function analyzeCoverLetterTone(coverLetter) {
        const formalIndicators = ['sehr geehrte', 'hochachtungsvoll', 'freundlichen grüßen'];
        const casualIndicators = ['hallo', 'hi', 'beste grüße'];
        
        let formalCount = 0;
        let casualCount = 0;
        
        formalIndicators.forEach(indicator => {
            if (coverLetter.toLowerCase().includes(indicator)) formalCount++;
        });
        
        casualIndicators.forEach(indicator => {
            if (coverLetter.toLowerCase().includes(indicator)) casualCount++;
        });
        
        return formalCount > casualCount ? 'formal' : 'casual';
    }

    function analyzeCoverLetterStyle(coverLetter) {
        return {
            length: coverLetter.length,
            paragraphs: coverLetter.split(/\n{2,}/).length,
            hasGreeting: /^sehr|^hallo|^liebe/im.test(coverLetter),
            hasSignature: /grüße|hochachtungsvoll/i.test(coverLetter)
        };
    }
}); 
