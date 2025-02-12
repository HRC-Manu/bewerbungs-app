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
            const suggestions = await generateSectionSuggestions('all', analysis);
            
            // Vorschläge in die Formularfelder einfügen
            suggestions.forEach(suggestion => {
                if (suggestion.section && elements.coverLetterSections[suggestion.section]) {
                    elements.coverLetterSections[suggestion.section].value = suggestion.text;
                }
            });
            
            // Vorschau aktualisieren
            updatePreview();
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
                            "company": {
                                "name": "Firmenname",
                                "industry": "Branche",
                                "size": "Unternehmensgröße",
                                "culture": "Unternehmenskultur"
                            },
                            "requirements": {
                                "mustHave": ["Pflicht-Anforderung 1", "Pflicht-Anforderung 2"],
                                "niceToHave": ["Optional 1", "Optional 2"]
                            },
                            "responsibilities": ["Aufgabe 1", "Aufgabe 2"],
                            "skills": {
                                "technical": ["Skill 1", "Skill 2"],
                                "soft": ["Soft Skill 1", "Soft Skill 2"]
                            },
                            "benefits": ["Benefit 1", "Benefit 2"],
                            "workingModel": {
                                "type": "remote/hybrid/office",
                                "location": "Arbeitsort",
                                "hours": "Arbeitszeit"
                            },
                            "tone": "formal/casual",
                            "teamInfo": {
                                "size": "Teamgröße",
                                "structure": "Teamstruktur"
                            }
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
            // Wenn 'all' ausgewählt ist, generiere alle Abschnitte
            if (section === 'all') {
                const sections = ['recipient', 'subject', 'introduction', 'main', 'closing'];
                const allSuggestions = [];

                for (const sec of sections) {
                    const suggestion = await generateSingleSection(sec, analysis);
                    allSuggestions.push({
                        section: sec,
                        text: suggestion.text,
                        style: suggestion.style
                    });
                }

                return allSuggestions;
            }

            // Für einzelne Abschnitte
            const suggestion = await generateSingleSection(section, analysis);
            return [{
                section: section,
                text: suggestion.text,
                style: suggestion.style
            }];
        } catch (error) {
            console.error('Fehler bei der Generierung:', error);
            throw new Error('Generierung fehlgeschlagen');
        }
    }

    async function generateSingleSection(section, analysis) {
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
                    content: generatePromptForSection(section, analysis)
                }],
                temperature: 0.8
            })
        });

        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        return result.suggestion;
    }

    function generatePromptForSection(section, analysis) {
        const basePrompt = `
        Stellendetails:
        Position: ${analysis.jobTitle}
        Firma: ${analysis.company.name}
        Branche: ${analysis.company.industry}
        Größe: ${analysis.company.size}
        Unternehmenskultur: ${analysis.company.culture}
        Anforderungen: ${analysis.requirements.mustHave.join(', ')} und ${analysis.requirements.niceToHave.join(', ')}
        Aufgaben: ${analysis.responsibilities.join(', ')}
        Skills: ${analysis.skills.technical.join(', ')} und ${analysis.skills.soft.join(', ')}
        Ton: ${analysis.tone}
        
        Generiere einen überzeugenden ${section}-Abschnitt für das Anschreiben.
        
        Liefere das Ergebnis im JSON-Format:
        {
            "suggestion": {
                "text": "Der generierte Text",
                "style": "Standard"
            }
        }
        `;

        const sectionPrompts = {
            recipient: `${basePrompt}
            Der Text soll eine formelle Anrede sein.
            - Bei unbekanntem Empfänger: "Sehr geehrte Damen und Herren,"
            - Sonst personalisiert mit [Name]`,

            subject: `${basePrompt}
            Der Text soll ein prägnanter Betreff sein.
            - Erwähne die Position
            - Optional: Referenznummer oder Datum
            - Kurz und professionell`,

            introduction: `${basePrompt}
            Der Text soll eine überzeugende Einleitung sein.
            - Zeige Interesse an der Position
            - Erwähne, wie du auf die Stelle aufmerksam geworden bist
            - Maximal 2-3 Sätze`,

            main: `${basePrompt}
            Der Text soll ein überzeugender Hauptteil sein.
            - Stelle Bezug zwischen deinen Fähigkeiten und den Anforderungen her
            - Erkläre deine Motivation
            - Hebe 2-3 relevante Erfahrungen hervor
            - Zeige, dass du zur Unternehmenskultur passt
            - 2-3 Absätze`,

            closing: `${basePrompt}
            Der Text soll ein professioneller Abschluss sein.
            - Drücke Interesse an einem persönlichen Gespräch aus
            - Erwähne deine Verfügbarkeit
            - Maximal 2 Sätze`
        };

        return sectionPrompts[section] || basePrompt;
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
                        Firma: ${analysis.company.name}
                        Branche: ${analysis.company.industry}
                        Größe: ${analysis.company.size}
                        Unternehmenskultur: ${analysis.company.culture}
                        Anforderungen: ${analysis.requirements.mustHave.join(', ')} und ${analysis.requirements.niceToHave.join(', ')}
                        Aufgaben: ${analysis.responsibilities.join(', ')}
                        Skills: ${analysis.skills.technical.join(', ')} und ${analysis.skills.soft.join(', ')}
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

    async function analyzeCoverLetter(text) {
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
                        content: "Analysiere den Stil und die Struktur von Anschreiben."
                    }, {
                        role: "user",
                        content: `Analysiere dieses Anschreiben und extrahiere die wichtigsten Merkmale:
                        
                        ${text}
                        
                        Liefere die Analyse in folgendem JSON-Format:
                        {
                            "style": {
                                "tone": "formell/informell",
                                "complexity": "einfach/mittel/komplex",
                                "personality": "zurückhaltend/ausgewogen/selbstbewusst"
                            },
                            "structure": {
                                "sections": ["vorhandene Abschnitte"],
                                "length": "kurz/mittel/lang",
                                "formatting": "minimal/standard/aufwendig"
                            },
                            "content": {
                                "keyPhrases": ["wichtige Phrasen"],
                                "uniquePoints": ["Alleinstellungsmerkmale"],
                                "achievements": ["genannte Erfolge"]
                            },
                            "improvement": {
                                "suggestions": ["Verbesserungsvorschläge"],
                                "missingElements": ["fehlende Elemente"]
                            }
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

    // ===== Validierung =====
    function validateInputs() {
        const jobPosting = elements.jobPosting.value.trim();
        
        // Validiere Stellenanzeige
        if (!jobPosting) {
            showError('Bitte fügen Sie eine Stellenanzeige ein');
            return false;
        }
        
        if (jobPosting.length < 100) {
            showError('Die Stellenanzeige scheint zu kurz zu sein. Bitte fügen Sie den vollständigen Text ein.');
            return false;
        }
        
        // Validiere PDF-Dateien
        if (elements.resumeUpload.files[0]) {
            const resumeFile = elements.resumeUpload.files[0];
            if (resumeFile.size === 0) {
                showError('Die hochgeladene Lebenslauf-Datei scheint leer zu sein');
                return false;
            }
            if (resumeFile.size > 10 * 1024 * 1024) {
                showError('Die Lebenslauf-Datei ist zu groß (max. 10 MB)');
                return false;
            }
        }
        
        if (elements.coverLetterUpload.files[0]) {
            const coverLetterFile = elements.coverLetterUpload.files[0];
            if (coverLetterFile.size === 0) {
                showError('Die hochgeladene Anschreiben-Datei scheint leer zu sein');
                return false;
            }
            if (coverLetterFile.size > 10 * 1024 * 1024) {
                showError('Die Anschreiben-Datei ist zu groß (max. 10 MB)');
                return false;
            }
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

    function displaySuggestions(suggestions) {
        const suggestionsList = document.getElementById('suggestionsList');
        suggestionsList.innerHTML = '';
        
        suggestions.forEach((suggestion, index) => {
            const button = document.createElement('button');
            button.className = 'list-group-item list-group-item-action';
            button.innerHTML = suggestion.text.replace(/\n/g, '<br>');
            button.onclick = () => applySuggestion(suggestion);
            suggestionsList.appendChild(button);
        });
        
        elements.suggestionsModal.show();
    }

    function applySuggestion(suggestion) {
        if (suggestion.section && elements.coverLetterSections[suggestion.section]) {
            elements.coverLetterSections[suggestion.section].value = suggestion.text;
            updatePreview();
        }
        elements.suggestionsModal.hide();
    }

    // ===== Event Listener für Textänderungen =====
    function initializeTextareaListeners() {
        Object.values(elements.coverLetterSections).forEach(textarea => {
            textarea.addEventListener('input', updatePreview);
        });
    }

    // ===== Initialisierung =====
    initializeEventListeners();
    initializeTextareaListeners();
}); 
