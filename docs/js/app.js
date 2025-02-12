// Hauptanwendungslogik
document.addEventListener('DOMContentLoaded', function() {
    // ===== DOM Elemente =====
    const elements = {
        // Eingabefelder
        jobPosting: document.getElementById('jobPosting'),
        resumeUpload: document.getElementById('resumeUpload'),
        coverLetterUpload: document.getElementById('coverLetterUpload'),
        
        // Buttons
        generateBtn: document.getElementById('generateBtn'),
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
        suggestionsModal: new bootstrap.Modal(document.getElementById('suggestionsModal')),
        messageToast: new bootstrap.Toast(document.getElementById('messageToast'))
    };

    // ===== Event Listener =====
    function initializeEventListeners() {
        // Generate Button
        elements.generateBtn.addEventListener('click', handleGenerate);
        
        // Suggestions Button
        elements.generateSuggestionsBtn.addEventListener('click', async () => {
            showLoading(elements.generateSuggestionsBtn, 'Generiere...');
            try {
                await generateSuggestionsForSection('all');
            } catch (error) {
                showError('Fehler bei der Generierung: ' + error.message);
            } finally {
                hideLoading(elements.generateSuggestionsBtn, 'KI-Vorschläge');
            }
        });

        // Einzelne Abschnitts-Buttons
        document.querySelectorAll('.suggest-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const section = e.target.dataset.section;
                showLoading(e.target, 'Generiere...');
                try {
                    await generateSuggestionsForSection(section);
                } catch (error) {
                    showError('Fehler bei der Generierung: ' + error.message);
                } finally {
                    hideLoading(e.target, 'Vorschläge');
                }
            });
        });

        // Datei-Uploads
        elements.resumeUpload.addEventListener('change', handleFileUpload);
        elements.coverLetterUpload.addEventListener('change', handleFileUpload);
    }

    // ===== Hauptfunktionen =====
    async function handleGenerate() {
        if (!validateInputs()) return;

        showLoading(elements.generateBtn, 'Generiere...');
        try {
            const jobPosting = elements.jobPosting.value.trim();
            const resumeText = elements.resumeUpload.files[0] ? 
                await extractTextFromPDF(elements.resumeUpload.files[0]) : '';

            const analysis = await analyzeJobPosting(jobPosting);
            const coverLetter = await generateFullCoverLetter(analysis, resumeText);
            
            applySectionsToForm(coverLetter);
            showSuccess('Anschreiben erfolgreich generiert!');
        } catch (error) {
            showError('Fehler bei der Generierung: ' + error.message);
        } finally {
            hideLoading(elements.generateBtn, 'Generieren');
        }
    }

    async function generateSuggestionsForSection(section) {
        try {
            const jobPosting = elements.jobPosting.value.trim();
            if (!jobPosting) {
                showError('Bitte fügen Sie eine Stellenanzeige ein');
                return;
            }

            const analysis = await analyzeJobPosting(jobPosting);
            const suggestions = await generateSectionSuggestions(section, analysis);
            displaySuggestions(suggestions);
            
        } catch (error) {
            showError('Fehler bei der Generierung: ' + error.message);
        }
    }

    // ===== KI-Integration =====
    async function analyzeJobPosting(jobPosting) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [{
                        role: "system",
                        content: "Du bist ein Experte für Bewerbungen und Karriereberatung."
                    }, {
                        role: "user",
                        content: `Analysiere diese Stellenanzeige und extrahiere die wichtigsten Informationen:
                        
                        ${jobPosting}
                        
                        Liefere die Analyse in folgendem JSON-Format:
                        {
                            "jobTitle": "Titel der Position",
                            "company": "Firmenname",
                            "requirements": ["Anforderung 1", "Anforderung 2", ...],
                            "responsibilities": ["Aufgabe 1", "Aufgabe 2", ...],
                            "skills": ["Skill 1", "Skill 2", ...],
                            "culture": "Unternehmenskultur",
                            "benefits": ["Benefit 1", "Benefit 2", ...],
                            "tone": "formal/casual"
                        }`
                    }],
                    temperature: 0.7
                })
            });

            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            console.error('Fehler bei der Analyse:', error);
            throw new Error('Analyse fehlgeschlagen');
        }
    }

    async function generateSectionSuggestions(section, analysis) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [{
                        role: "system",
                        content: "Du bist ein Experte für das Schreiben überzeugender Bewerbungsanschreiben."
                    }, {
                        role: "user",
                        content: `Generiere 3 verschiedene Vorschläge für den ${section}-Abschnitt eines Bewerbungsanschreibens.
                        
                        Stellendetails:
                        Position: ${analysis.jobTitle}
                        Firma: ${analysis.company}
                        Anforderungen: ${analysis.requirements.join(', ')}
                        Aufgaben: ${analysis.responsibilities.join(', ')}
                        Ton: ${analysis.tone}
                        
                        Die Vorschläge sollen:
                        - Überzeugend und professionell sein
                        - Auf die Anforderungen eingehen
                        - Den passenden Ton treffen
                        - Authentisch und nicht standardmäßig klingen
                        
                        Liefere die Vorschläge im JSON-Format:
                        {
                            "suggestions": [
                                {"text": "Vorschlag 1", "style": "Standard"},
                                {"text": "Vorschlag 2", "style": "Kreativ"},
                                {"text": "Vorschlag 3", "style": "Direkt"}
                            ]
                        }`
                    }],
                    temperature: 0.8
                })
            });

            const data = await response.json();
            const suggestions = JSON.parse(data.choices[0].message.content).suggestions;
            return suggestions.map(s => ({ ...s, section }));
        } catch (error) {
            console.error('Fehler bei der Generierung:', error);
            throw new Error('Generierung fehlgeschlagen');
        }
    }

    async function generateFullCoverLetter(analysis, resumeText = '') {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [{
                        role: "system",
                        content: "Du bist ein Experte für das Schreiben überzeugender Bewerbungsanschreiben."
                    }, {
                        role: "user",
                        content: `Erstelle ein vollständiges Anschreiben basierend auf folgenden Informationen:
                        
                        Stellendetails:
                        Position: ${analysis.jobTitle}
                        Firma: ${analysis.company}
                        Anforderungen: ${analysis.requirements.join(', ')}
                        Aufgaben: ${analysis.responsibilities.join(', ')}
                        Skills: ${analysis.skills.join(', ')}
                        Ton: ${analysis.tone}
                        
                        ${resumeText ? `Lebenslauf:\n${resumeText}` : ''}
                        
                        Das Anschreiben soll:
                        - Die wichtigsten Anforderungen adressieren
                        - Relevante Erfahrungen hervorheben
                        - Motivation zeigen
                        - Den richtigen Ton treffen
                        - Authentisch und überzeugend sein
                        
                        Liefere das Anschreiben in Abschnitten im JSON-Format:
                        {
                            "recipient": "Anrede",
                            "subject": "Betreff",
                            "introduction": "Einleitung",
                            "main": "Hauptteil",
                            "closing": "Abschluss"
                        }`
                    }],
                    temperature: 0.7
                })
            });

            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            console.error('Fehler bei der Generierung:', error);
            throw new Error('Generierung fehlgeschlagen');
        }
    }

    // ===== Erweiterte Hilfsfunktionen =====
    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            showError('Bitte laden Sie eine PDF-Datei hoch');
            event.target.value = '';
            return;
        }

        showLoading(event.target, 'Verarbeite...');
        try {
            const text = await extractTextFromPDF(file);
            if (event.target === elements.resumeUpload) {
                elements.resumePreview.innerHTML = `<pre>${text}</pre>`;
            } else if (event.target === elements.coverLetterUpload) {
                const sections = analyzeCoverLetter(text);
                applySectionsToForm(sections);
            }
            showSuccess('Datei erfolgreich verarbeitet');
        } catch (error) {
            showError('Fehler beim Verarbeiten der Datei');
            console.error(error);
        } finally {
            hideLoading(event.target, 'Datei auswählen');
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

    function analyzeCoverLetter(text) {
        // Einfache Analyse des bestehenden Anschreibens
        const sections = {
            recipient: '',
            subject: '',
            introduction: '',
            main: '',
            closing: ''
        };

        // Versuche, die Abschnitte zu identifizieren
        const lines = text.split('\n');
        let currentSection = '';

        lines.forEach(line => {
            line = line.trim();
            if (!line) return;

            if (line.toLowerCase().includes('sehr geehrte')) {
                currentSection = 'recipient';
                sections.recipient = line;
            } else if (line.toLowerCase().includes('betreff') || line.toLowerCase().includes('bewerbung')) {
                currentSection = 'subject';
                sections.subject = line;
            } else if (currentSection === 'recipient' && !sections.introduction) {
                currentSection = 'introduction';
                sections.introduction = line;
            } else if (line.toLowerCase().includes('freue') || line.toLowerCase().includes('grüß')) {
                currentSection = 'closing';
                sections.closing = line;
            } else if (currentSection === 'introduction' || currentSection === 'main') {
                currentSection = 'main';
                sections.main += line + '\n';
            }
        });

        return sections;
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
    function showLoading(button, text) {
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${text}`;
    }

    function hideLoading(button, text) {
        button.disabled = false;
        button.innerHTML = text;
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

    // ===== Initialisierung =====
    initializeEventListeners();
}); 
