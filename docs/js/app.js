// Hauptanwendungslogik
document.addEventListener('DOMContentLoaded', function() {
    // ===== DOM Elemente =====
    const elements = {
        // Eingabefelder
        jobPosting: document.getElementById('jobPosting'),
        resumeUpload: document.getElementById('resumeUpload'),
        coverLetterUpload: document.getElementById('coverLetterUpload'),
        apiKey: document.getElementById('apiKey'),
        
        // Buttons
        analyzeBtn: document.getElementById('analyzeBtn'),
        generateSuggestionsBtn: document.getElementById('generateSuggestionsBtn'),
        saveSettingsBtn: document.getElementById('saveSettingsBtn'),
        
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
        settingsModal: new bootstrap.Modal(document.getElementById('settingsModal')),
        suggestionsModal: new bootstrap.Modal(document.getElementById('suggestionsModal')),
        messageToast: new bootstrap.Toast(document.getElementById('messageToast'))
    };

    // ===== Event Listener =====
    function initializeEventListeners() {
        // Analyze Button
        elements.analyzeBtn.addEventListener('click', handleAnalyze);
        
        // Settings Button
        elements.saveSettingsBtn.addEventListener('click', saveSettings);
        
        // API Key aus localStorage laden
        const savedApiKey = localStorage.getItem('openai_api_key');
        if (savedApiKey) {
            elements.apiKey.value = savedApiKey;
        }
        
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

    // ===== API Key Management =====
    function saveSettings() {
        const apiKey = elements.apiKey.value.trim();
        if (!apiKey) {
            showError('Bitte geben Sie einen API Key ein');
            return;
        }
        
        localStorage.setItem('openai_api_key', apiKey);
        elements.settingsModal.hide();
        showSuccess('Einstellungen gespeichert');
    }

    function getApiKey() {
        const apiKey = localStorage.getItem('openai_api_key');
        if (!apiKey) {
            elements.settingsModal.show();
            throw new Error('Bitte geben Sie zuerst Ihren OpenAI API Key ein');
        }
        return apiKey;
    }

    // ===== Hauptfunktionen =====
    async function handleAnalyze() {
        try {
            if (!validateInputs()) return;

            showLoading(elements.analyzeBtn, 'Analysiere...');
            
            // API Key prüfen
            const apiKey = getApiKey();
            
            const jobPosting = elements.jobPosting.value.trim();
            const resumeText = elements.resumeUpload.files[0] ? 
                await extractTextFromPDF(elements.resumeUpload.files[0]) : '';

            // Stellenanzeige analysieren
            const analysis = await analyzeJobPosting(jobPosting, apiKey);
            
            // Analyse-Ergebnisse anzeigen
            displayAnalysis(analysis);
            
            // Vorschläge generieren
            const suggestions = await generateSectionSuggestions('all', analysis, apiKey);
            
            // Vorschläge in die Formularfelder einfügen
            applySuggestions(suggestions);
            
            // Vorschau aktualisieren
            updatePreview();
            
            showSuccess('Analyse und Vorschläge erfolgreich erstellt!');
            
        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading(elements.analyzeBtn, 'Analysieren und Anschreiben erstellen');
        }
    }

    function displayAnalysis(analysis) {
        // Job-Titel
        document.getElementById('jobTitleAnalysis').textContent = analysis.jobTitle;
        
        // Unternehmensinfo
        document.getElementById('companyAnalysis').innerHTML = `
            <div><strong>Name:</strong> ${analysis.company.name}</div>
            <div><strong>Branche:</strong> ${analysis.company.industry}</div>
            <div><strong>Größe:</strong> ${analysis.company.size}</div>
            <div><strong>Kultur:</strong> ${analysis.company.culture}</div>
        `;
        
        // Anforderungen
        const mustHaveList = document.getElementById('mustHaveList');
        const niceToHaveList = document.getElementById('niceToHaveList');
        
        mustHaveList.innerHTML = analysis.requirements.mustHave
            .map(req => `<li>${req}</li>`).join('');
        niceToHaveList.innerHTML = analysis.requirements.niceToHave
            .map(req => `<li>${req}</li>`).join('');
        
        // Analyse-Bereich einblenden
        document.getElementById('jobAnalysis').classList.remove('d-none');
    }

    function applySuggestions(suggestions) {
        suggestions.forEach(suggestion => {
            if (suggestion.section && elements.coverLetterSections[suggestion.section]) {
                elements.coverLetterSections[suggestion.section].value = suggestion.text;
            }
        });
    }

    // ===== API Funktionen =====
    async function analyzeJobPosting(jobPosting, apiKey) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
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

            if (!response.ok) {
                throw new Error('API Anfrage fehlgeschlagen');
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.message);
            }

            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            console.error('Fehler bei der Analyse:', error);
            throw new Error('Analyse fehlgeschlagen: ' + error.message);
        }
    }

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

    // ===== Datei-Upload-Funktionen =====
    function initializeFileUpload() {
        const uploadAreas = document.querySelectorAll('.upload-area');
        const fileInputs = document.querySelectorAll('input[type="file"]');
        
        // Drag & Drop für Upload-Bereiche
        uploadAreas.forEach(area => {
            area.addEventListener('dragover', (e) => {
                e.preventDefault();
                area.classList.add('drag-over');
            });
            
            area.addEventListener('dragleave', (e) => {
                e.preventDefault();
                area.classList.remove('drag-over');
            });
            
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('drag-over');
                const input = area.querySelector('input[type="file"]');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    input.files = files;
                    handleFileUpload({ target: input });
                }
            });
        });
        
        // Datei-Input Event-Handler
        fileInputs.forEach(input => {
            input.addEventListener('change', handleFileUpload);
        });
        
        // Entfernen-Buttons
        document.querySelectorAll('.file-preview .btn-close').forEach(btn => {
            btn.addEventListener('click', handleFileRemove);
        });
    }

    function handleFileRemove(event) {
        const preview = event.target.closest('.file-preview');
        const container = preview.closest('.upload-container');
        const area = container.querySelector('.upload-area');
        const input = area.querySelector('input[type="file"]');
        
        // Datei-Input zurücksetzen
        input.value = '';
        
        // Vorschau ausblenden und Upload-Bereich wieder einblenden
        preview.classList.add('d-none');
        area.classList.remove('d-none');
    }

    async function processResume(file) {
        try {
            const text = await extractTextFromPDF(file);
            // Hier können wir den extrahierten Text weiterverarbeiten
            console.log('Extracted Resume Text:', text);
        } catch (error) {
            console.error('Error processing resume:', error);
            showError('Fehler beim Verarbeiten des Lebenslaufs');
        }
    }

    async function processCoverLetter(file) {
        try {
            const text = await extractTextFromPDF(file);
            // Hier können wir den extrahierten Text weiterverarbeiten
            console.log('Extracted Cover Letter Text:', text);
        } catch (error) {
            console.error('Error processing cover letter:', error);
            showError('Fehler beim Verarbeiten des Anschreibens');
        }
    }

    // ===== Initialisierung =====
    initializeEventListeners();
    initializeTextareaListeners();
    initializeFileUpload();
}); 
