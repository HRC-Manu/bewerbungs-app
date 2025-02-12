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
        coverLetterText.value = generateExampleCoverLetter();
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

    // Handle export button click
    async function handleExport(format) {
        const exportBtn = format === 'word' ? exportWordBtn : exportPdfBtn;
        showLoading(exportBtn, 'Exportiere...');

        try {
            // Erstelle einen Blob mit dem Inhalt
            const content = `${coverLetterPreview.innerText}\n\n${resumePreview.innerText}`;
            let blob;
            let filename;

            if (format === 'word') {
                // Erstelle einen Word-Dokument Blob
                const htmlContent = `
                    <html>
                        <head>
                            <meta charset="UTF-8">
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; }
                                .section { margin-bottom: 20px; }
                            </style>
                        </head>
                        <body>
                            ${coverLetterPreview.innerHTML}
                            <div style="page-break-before: always;"></div>
                            ${resumePreview.innerHTML}
                        </body>
                    </html>
                `;
                blob = new Blob([htmlContent], { type: 'application/msword' });
                filename = 'bewerbung.doc';
            } else {
                // Erstelle einen Text-Blob für PDF (später durch echte PDF-Generierung ersetzen)
                blob = new Blob([content], { type: 'text/plain' });
                filename = 'bewerbung.txt'; // Temporär als .txt, später .pdf
            }

            // Erstelle einen Download-Link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showSuccess(`Dokument als ${format.toUpperCase()} exportiert!`);
        } catch (error) {
            showError('Fehler beim Export: ' + error.message);
            console.error('Export error:', error);
        } finally {
            hideLoading(exportBtn, format === 'word' ? 'Als Word exportieren' : 'Als PDF exportieren');
        }
    }

    // Handle resume file upload
    function handleResumeUpload(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                showError('Bitte lade eine PDF-Datei hoch');
                event.target.value = '';
                resumeFilePreview.classList.add('d-none');
            } else {
                showSuccess('Lebenslauf erfolgreich hochgeladen');
                resumeFilePreview.querySelector('.file-name').textContent = file.name;
                resumeFilePreview.classList.remove('d-none');
            }
        }
    }

    // Handle cover letter file upload
    function handleCoverLetterUpload(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                showError('Bitte lade eine PDF-Datei hoch');
                event.target.value = '';
                coverLetterFilePreview.classList.add('d-none');
                coverLetterText.disabled = false;
            } else {
                showSuccess('Anschreiben erfolgreich hochgeladen');
                coverLetterFilePreview.querySelector('.file-name').textContent = file.name;
                coverLetterFilePreview.classList.remove('d-none');
                coverLetterText.value = '';
                coverLetterText.disabled = true;
            }
        }
    }

    // Validate user inputs
    function validateInputs() {
        if (!jobPostingTextarea.value.trim()) {
            showError('Bitte füge eine Stellenanzeige ein');
            return false;
        }

        if (!resumeUpload.files[0]) {
            showError('Bitte lade deinen Lebenslauf hoch');
            return false;
        }

        if (!coverLetterUpload.files[0] && !coverLetterText.value.trim()) {
            showError('Bitte lade ein Anschreiben hoch oder gib eines ein');
            return false;
        }

        return true;
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
}); 
