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

    // Handle generate button click
    async function handleGenerate() {
        if (!validateInputs()) {
            return;
        }

        showLoading(generateBtn, 'Generiere Dokumente...');
        console.log('Generiere Dokumente...');

        try {
            // Für den Test generieren wir direkt die Vorschau
            let coverLetterContent = '';
            if (coverLetterText.value.trim()) {
                coverLetterContent = coverLetterText.value;
            } else if (coverLetterUpload.files[0]) {
                coverLetterContent = 'PDF Anschreiben hochgeladen: ' + coverLetterUpload.files[0].name;
            } else {
                coverLetterContent = generateExampleCoverLetter();
            }

            let resumeContent = '';
            if (resumeUpload.files[0]) {
                resumeContent = 'PDF Lebenslauf hochgeladen: ' + resumeUpload.files[0].name + '\n\n' + generateExampleResume();
            } else {
                resumeContent = generateExampleResume();
            }

            // Aktualisiere die Vorschau
            updatePreviews({
                coverLetter: coverLetterContent,
                resume: resumeContent
            });

            showSuccess('Dokumente erfolgreich generiert!');
            console.log('Dokumente erfolgreich generiert');

        } catch (error) {
            showError('Fehler bei der Dokumentengenerierung: ' + error.message);
            console.error('Generation error:', error);
        } finally {
            hideLoading(generateBtn, 'Generieren');
        }
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

        // Validate resume
        if (!resumeUpload.files[0]) {
            errors.push('Bitte lade deinen Lebenslauf hoch');
        } else if (resumeUpload.files[0].size > 10 * 1024 * 1024) { // 10MB limit
            errors.push('Die Lebenslauf-Datei ist zu groß (maximal 10MB)');
        }

        // Validate cover letter
        if (!coverLetterUpload.files[0] && !coverLetterText.value.trim()) {
            errors.push('Bitte lade ein Anschreiben hoch oder gib eines ein');
        } else if (coverLetterText.value.trim().length < 100 && !coverLetterUpload.files[0]) {
            errors.push('Das Anschreiben scheint zu kurz zu sein. Bitte füge mehr Inhalt hinzu');
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
        currentSection = section;
        showLoading(generateSuggestionsBtn, 'Generiere...');
        
        try {
            const jobPosting = jobPostingTextarea.value.trim();
            if (!jobPosting) {
                showError('Bitte füge zuerst eine Stellenanzeige ein');
                return;
            }

            const suggestions = await generateCoverLetterSuggestions(section, jobPosting);
            displaySuggestions(suggestions);
            
        } catch (error) {
            showError('Fehler bei der Generierung der Vorschläge: ' + error.message);
            console.error('Suggestion generation error:', error);
        } finally {
            hideLoading(generateSuggestionsBtn, 'KI-Vorschläge');
        }
    }

    // Generate suggestions using ChatGPT
    async function generateCoverLetterSuggestions(section, jobPosting) {
        // Simuliere API-Aufruf (später durch echte ChatGPT-Integration ersetzen)
        const suggestions = [];
        
        const prompts = {
            recipient: [
                "Sehr geehrte Damen und Herren,",
                "Sehr geehrte Frau [Name],",
                "Sehr geehrter Herr [Name],",
            ],
            subject: [
                "Bewerbung als [Position] - Referenz: [Jobcode]",
                "Ihre Stellenanzeige: [Position] vom [Datum]",
                "Bewerbung für die Position als [Position]",
            ],
            introduction: [
                "mit großem Interesse habe ich Ihre Stellenanzeige gelesen und bewerbe mich um die ausgeschriebene Position.",
                "Ihre ausgeschriebene Stelle als [Position] hat sofort mein Interesse geweckt.",
                "auf der Suche nach einer neuen beruflichen Herausforderung bin ich auf Ihre Stellenanzeige gestoßen.",
            ],
            main: [
                "Durch meine bisherige Tätigkeit als [Position] bei [Unternehmen] bringe ich bereits umfangreiche Erfahrung in [Bereich] mit.",
                "Meine Stärken liegen besonders in [Kompetenz 1] und [Kompetenz 2]. Diese konnte ich in meiner aktuellen Position bei [Unternehmen] erfolgreich einsetzen.",
                "Was mich besonders an der Position reizt, ist die Möglichkeit [Aspekt der Stelle]. Hier kann ich meine Erfahrungen in [Bereich] optimal einbringen.",
            ],
            closing: [
                "Über die Möglichkeit eines persönlichen Gesprächs freue ich mich sehr.",
                "Gerne stelle ich Ihnen meine Qualifikationen in einem persönlichen Gespräch vor.",
                "Ich freue mich darauf, Sie in einem persönlichen Gespräch von meiner Eignung zu überzeugen.",
            ],
        };

        if (section === 'all') {
            // Generate complete cover letter
            Object.keys(prompts).forEach(key => {
                suggestions.push({
                    section: key,
                    text: prompts[key][Math.floor(Math.random() * prompts[key].length)]
                });
            });
        } else {
            // Generate suggestions for specific section
            for (let i = 0; i < 3; i++) {
                suggestions.push({
                    section: section,
                    text: prompts[section][i % prompts[section].length]
                });
            }
        }

        return suggestions;
    }

    // Display suggestions in modal
    function displaySuggestions(suggestions) {
        currentSuggestions = suggestions;
        suggestionsList.innerHTML = '';
        
        suggestions.forEach((suggestion, index) => {
            const button = document.createElement('button');
            button.className = 'list-group-item list-group-item-action';
            button.innerHTML = suggestion.text;
            button.onclick = () => applySuggestion(index);
            suggestionsList.appendChild(button);
        });
        
        suggestionsModal.show();
    }

    // Apply selected suggestion
    function applySuggestion(index) {
        const suggestion = currentSuggestions[index];
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
            coverLetterSections[suggestion.section].value = suggestion.text;
        }
        
        updateCoverLetterPreview();
        suggestionsModal.hide();
    }

    // Update cover letter preview
    function updateCoverLetterPreview() {
        const coverLetter = [
            coverLetterSections.recipient.value,
            '',
            coverLetterSections.subject.value,
            '',
            coverLetterSections.introduction.value,
            '',
            coverLetterSections.main.value,
            '',
            coverLetterSections.closing.value,
            '',
            'Mit freundlichen Grüßen',
            '[Ihr Name]'
        ].join('\n');

        coverLetterPreview.innerHTML = `<p>${formatText(coverLetter)}</p>`;
    }

    // Generate more suggestions
    function generateMoreSuggestions() {
        // Implement logic to generate more suggestions
        showError('Feature not implemented yet');
    }
}); 
