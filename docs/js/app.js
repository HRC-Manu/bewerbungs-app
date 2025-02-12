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
    generateSuggestionsBtn.addEventListener('click', () => generateSuggestionsForSection('all'));
    generateMoreBtn.addEventListener('click', () => generateMoreSuggestions());
    suggestButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            generateSuggestionsForSection(section);
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
    async function analyzeWithChatGPT(jobPosting, resumeText, existingCoverLetter = '') {
        // Simuliere ChatGPT API-Aufruf (später durch echte Integration ersetzen)
        return {
            jobTitle: extractJobTitle(jobPosting),
            keyRequirements: extractKeyRequirements(jobPosting),
            matchingSkills: findMatchingSkills(jobPosting, resumeText),
            suggestedTone: determineTone(jobPosting),
            companyInfo: extractCompanyInfo(jobPosting)
        };
    }

    // Helper functions for analysis
    function extractJobTitle(jobPosting) {
        const titleMatch = jobPosting.match(/(?:position|stelle|role)\s+(?:als|as)\s+([^.\n]+)/i);
        return titleMatch ? titleMatch[1].trim() : 'die ausgeschriebene Position';
    }

    function extractKeyRequirements(jobPosting) {
        const requirements = [];
        const reqSection = jobPosting.match(/(?:requirements|qualifications|anforderungen)[:]\s*((?:[^]*?)(?=\n\n|\n[A-Z]|$))/i);
        
        if (reqSection) {
            const reqText = reqSection[1];
            const bulletPoints = reqText.match(/[•-]\s*([^\n]+)/g);
            if (bulletPoints) {
                requirements.push(...bulletPoints.map(point => point.replace(/[•-]\s*/, '').trim()));
            }
        }
        
        return requirements;
    }

    function findMatchingSkills(jobPosting, resumeText) {
        const skills = new Set();
        const requirements = extractKeyRequirements(jobPosting);
        
        requirements.forEach(req => {
            const skillWords = req.toLowerCase().match(/\b\w+\b/g) || [];
            skillWords.forEach(skill => {
                if (resumeText.toLowerCase().includes(skill)) {
                    skills.add(skill);
                }
            });
        });
        
        return Array.from(skills);
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
        
        // Extract company name
        const nameMatch = jobPosting.match(/(?:at|bei)\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*)/);
        if (nameMatch) {
            companyInfo.name = nameMatch[1];
        }
        
        // Extract culture and values
        const cultureSection = jobPosting.match(/(?:culture|kultur|values|werte)[^.]*\./i);
        if (cultureSection) {
            companyInfo.culture = cultureSection[0];
        }
        
        return companyInfo;
    }

    // Generate suggestions using ChatGPT with analysis
    async function generateCoverLetterSuggestions(section, jobPosting, analysis) {
        try {
            // Ensure analysis object has all required properties
            const safeAnalysis = {
                jobTitle: analysis.jobTitle || 'die ausgeschriebene Position',
                companyInfo: analysis.companyInfo || { name: 'das Unternehmen', culture: '' },
                matchingSkills: analysis.matchingSkills || [],
                keyRequirements: analysis.keyRequirements || []
            };

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

            // Handle 'all' section generation
            if (section === 'all') {
                const allSections = ['recipient', 'subject', 'introduction', 'main', 'closing'];
                const allSuggestions = allSections
                    .map(sec => {
                        const sectionPrompts = prompts[sec];
                        return sectionPrompts && sectionPrompts.length > 0 
                            ? sectionPrompts[0] 
                            : null;
                    })
                    .filter(suggestion => suggestion !== null);
                
                return allSuggestions;
            } 
            
            // Return section-specific suggestions
            return prompts[section] || [];
            
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
            
            // Generate suggestions for all sections
            const suggestions = await generateCoverLetterSuggestions('all', jobPosting, analysis);
            
            // Apply suggestions to create a complete cover letter
            let completeCoverLetter = '';
            suggestions.forEach(suggestion => {
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

            // Extract text from resume if available
            let resumeText = '';
            if (resumeUpload.files[0]) {
                resumeText = await extractTextFromPDF(resumeUpload.files[0]);
            }

            // Analyze with ChatGPT
            const analysis = await analyzeWithChatGPT(jobPosting, resumeText);
            
            // Generate suggestions based on analysis
            const suggestions = [];
            const jobTitle = analysis.jobTitle;
            const companyName = analysis.companyInfo.name || 'das Unternehmen';
            const skills = analysis.matchingSkills || [];
            const requirements = analysis.keyRequirements || [];
            
            if (section === 'all') {
                // Generate suggestions for each section
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
                    if (analysis.companyInfo.name) {
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
                    suggestions.push({
                        section: 'introduction',
                        text: `mit großem Interesse habe ich Ihre Stellenanzeige für die Position als ${jobTitle} bei ${companyName} gelesen und bewerbe mich hiermit um diese spannende Aufgabe.`
                    });
                    suggestions.push({
                        section: 'introduction',
                        text: `Ihre ausgeschriebene Stelle als ${jobTitle} hat sofort mein Interesse geweckt, da sie perfekt zu meinem Profil passt.`
                    });
                    suggestions.push({
                        section: 'introduction',
                        text: `auf der Suche nach einer neuen beruflichen Herausforderung bin ich auf Ihre Stellenanzeige als ${jobTitle} gestoßen und möchte mich hiermit bewerben.`
                    });
                    break;
                    
                case 'main':
                    const skillsText = skills.length > 0 ? 
                        `Meine Erfahrungen in ${skills.join(', ')} passen optimal zu Ihren Anforderungen.` :
                        'Meine bisherigen Erfahrungen passen optimal zu Ihren Anforderungen.';
                    
                    const requirementsText = requirements.length > 0 ?
                        `Die von Ihnen gewünschten Qualifikationen wie ${requirements.slice(0, 3).join(', ')} bringe ich bereits mit.` :
                        'Die gewünschten Qualifikationen bringe ich bereits mit.';
                    
                    suggestions.push({
                        section: 'main',
                        text: `${skillsText} ${requirementsText} ${analysis.companyInfo.culture || ''}`
                    });
                    suggestions.push({
                        section: 'main',
                        text: `Was mich besonders an der Position reizt, ist die Möglichkeit ${skills[0] || 'meine Fähigkeiten'} bei ${companyName} einzubringen und weiterzuentwickeln. ${requirementsText}`
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
}); 
