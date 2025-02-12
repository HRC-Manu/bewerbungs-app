// Hauptanwendungslogik
document.addEventListener('DOMContentLoaded', function() {
    // ===== Bootstrap Modals =====
    const modals = {
        suggestions: new bootstrap.Modal(document.getElementById('suggestionsModal')),
        help: new bootstrap.Modal(document.getElementById('helpModal'))
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

    // ===== API Key Management =====
    const API_SETTINGS = {
        currentService: 'openai',
        apiKey: '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' // GitHub API Key
    };

    function getApiKey() {
        return API_SETTINGS.apiKey;
    }

    // ===== Analyse-Funktionen =====
    async function handleAnalyze() {
        try {
            if (!validateInputs()) return;

            showLoading(elements.analyzeBtn, 'Analysiere...');
            
            // API Key prüfen
            const apiKey = getApiKey();
            if (!apiKey) {
                throw new Error('API Key nicht gefunden');
            }
            
            const jobPosting = elements.jobPosting.value.trim();
            const resumeText = window.resumeText;

            // Fortschrittsanzeige aktualisieren
            updateProgressStep(2);

            // Parallele Analyse von Lebenslauf und Stellenanzeige
            const [jobAnalysis, resumeAnalysis] = await Promise.all([
                analyzeJobPosting(jobPosting, apiKey),
                analyzeResume(resumeText, apiKey)
            ]);

            // Matching-Score berechnen
            const matchingScore = calculateMatchingScore(jobAnalysis, resumeAnalysis);
            
            // Analyse-Ergebnisse anzeigen
            displayAnalysis(jobAnalysis, resumeAnalysis, matchingScore);
            
            // Vorschläge generieren
            const suggestions = await generateSectionSuggestions('all', {
                job: jobAnalysis,
                resume: resumeAnalysis,
                matching: matchingScore
            }, apiKey);
            
            // Vorschläge in die Formularfelder einfügen
            applySuggestions(suggestions);
            
            // Vorschau aktualisieren
            updatePreview();
            
            // Fortschrittsanzeige aktualisieren
            updateProgressStep(3);
            
            showSuccess('Analyse und Vorschläge erfolgreich erstellt!');
            
        } catch (error) {
            console.error('Analysis error:', error);
            showError('Analyse fehlgeschlagen: ' + error.message);
        } finally {
            hideLoading(elements.analyzeBtn, 'Analysieren und Anschreiben erstellen');
        }
    }

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
                        content: "Du bist ein Experte für Bewerbungsanalyse und Karriereberatung."
                    }, {
                        role: "user",
                        content: `Analysiere diese Stellenanzeige detailliert und extrahiere alle relevanten Informationen:
                        
                        ${jobPosting}
                        
                        Liefere eine strukturierte Analyse im folgenden JSON-Format:
                        {
                            "jobTitle": {
                                "position": "Titel der Position",
                                "level": "Junior/Senior/Lead",
                                "department": "Abteilung"
                            },
                            "company": {
                                "name": "Firmenname",
                                "industry": "Branche",
                                "size": "Unternehmensgröße",
                                "culture": "Unternehmenskultur",
                                "values": ["Wert 1", "Wert 2"],
                                "benefits": ["Benefit 1", "Benefit 2"]
                            },
                            "requirements": {
                                "mustHave": {
                                    "hardSkills": ["Skill 1", "Skill 2"],
                                    "softSkills": ["Skill 1", "Skill 2"],
                                    "experience": ["Erfahrung 1", "Erfahrung 2"],
                                    "education": ["Ausbildung 1", "Ausbildung 2"]
                                },
                                "niceToHave": {
                                    "hardSkills": ["Skill 1", "Skill 2"],
                                    "softSkills": ["Skill 1", "Skill 2"],
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

    async function generateSectionSuggestions(section, analysisData, apiKey) {
        try {
            // Wenn 'all' ausgewählt ist, generiere alle Abschnitte
            if (section === 'all') {
                const sections = ['recipient', 'subject', 'introduction', 'main', 'closing'];
                const allSuggestions = [];

                for (const sec of sections) {
                    const suggestion = await generateSingleSection(sec, analysisData, apiKey);
                    allSuggestions.push({
                        section: sec,
                        text: suggestion.text,
                        alternatives: suggestion.alternatives || []
                    });
                }

                return allSuggestions;
            }

            // Für einzelne Abschnitte
            const suggestion = await generateSingleSection(section, analysisData, apiKey);
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

    async function generateSingleSection(section, analysisData, apiKey) {
        const { job, resume, matching } = analysisData;
        
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
                    content: `Du bist ein Experte für das Schreiben überzeugender Bewerbungsanschreiben.
                             Dein Ziel ist es, personalisierte und überzeugende Textbausteine zu erstellen,
                             die die Stärken des Bewerbers optimal mit den Anforderungen der Stelle verbinden.`
                }, {
                    role: "user",
                    content: generatePromptForSection(section, analysisData)
                }],
                temperature: 0.8,
                n: 3 // Generiere 3 alternative Vorschläge
            })
        });

        if (!response.ok) {
            throw new Error('API Anfrage fehlgeschlagen');
        }

        const data = await response.json();
        const suggestions = data.choices.map(choice => JSON.parse(choice.message.content));
        
        return {
            text: suggestions[0].suggestion.text,
            alternatives: suggestions.slice(1).map(s => s.suggestion.text)
        };
    }

    function generatePromptForSection(section, analysisData) {
        const { job, resume, matching } = analysisData;
        
        const basePrompt = `
        Stelle: ${job.jobTitle.position} (${job.jobTitle.level})
        Firma: ${job.company.name}
        Branche: ${job.company.industry}
        Unternehmenskultur: ${job.company.culture}
        
        Bewerber:
        - Name: ${resume.personalInfo.name}
        - Aktuelle Position: ${resume.personalInfo.title}
        - Erfahrung: ${resume.personalInfo.yearsOfExperience} Jahre
        
        Matching-Score: ${Math.round(matching.total)}%
        - Technical Skills: ${Math.round(matching.skills.technical * 100)}%
        - Soft Skills: ${Math.round(matching.skills.soft * 100)}%
        
        Anforderungen:
        - Must-Have: ${job.requirements.mustHave.hardSkills.join(', ')}
        - Nice-to-Have: ${job.requirements.niceToHave.hardSkills.join(', ')}
        
        Bewerber Skills:
        - Expert: ${resume.skills.technical.expert.join(', ')}
        - Advanced: ${resume.skills.technical.advanced.join(', ')}
        
        Generiere einen überzeugenden ${section}-Abschnitt für das Anschreiben.
        
        Liefere das Ergebnis im JSON-Format:
        {
            "suggestion": {
                "text": "Der generierte Text",
                "tone": "formal/casual",
                "focus": "experience/skills/culture"
            }
        }`;

        const sectionPrompts = {
            recipient: `${basePrompt}
            Erstelle eine professionelle Anrede.
            - Bei bekanntem Empfänger: Personalisiert
            - Bei unbekanntem Empfänger: "Sehr geehrte Damen und Herren,"
            - Berücksichtige die Unternehmenskultur (formal/casual)`,

            subject: `${basePrompt}
            Erstelle einen aussagekräftigen Betreff.
            - Erwähne die Position und ggf. Referenznummer
            - Hebe relevante Erfahrung hervor
            - Kurz und prägnant
            - Wecke Interesse`,

            introduction: `${basePrompt}
            Erstelle eine packende Einleitung.
            - Zeige Begeisterung für die Position
            - Erwähne, wie du auf die Stelle aufmerksam geworden bist
            - Hebe die wichtigste Qualifikation hervor
            - Stelle Bezug zur Firma her
            - Max. 3-4 Sätze
            - Matching-Score berücksichtigen`,

            main: `${basePrompt}
            Erstelle einen überzeugenden Hauptteil.
            - Fokussiere auf die besten Matches (${Math.round(matching.total)}% Gesamt)
            - Verbinde Anforderungen mit konkreten Erfahrungen
            - Strukturiere in 2-3 Absätze
            - Verwende Beispiele aus dem Lebenslauf
            - Zeige Alignment mit Unternehmenskultur
            - Hebe Erfolge und messbare Ergebnisse hervor
            - Berücksichtige Technical (${Math.round(matching.skills.technical * 100)}%) und Soft Skills (${Math.round(matching.skills.soft * 100)}%)`,

            closing: `${basePrompt}
            Erstelle einen starken Abschluss.
            - Bekräftige dein Interesse
            - Erwähne Verfügbarkeit
            - Bitte um persönliches Gespräch
            - Selbstbewusst aber nicht arrogant
            - Max. 2-3 Sätze`
        };

        return sectionPrompts[section] || basePrompt;
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
            const card = document.createElement('div');
            card.className = 'suggestion-card';
            card.innerHTML = `
                <div class="card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">Vorschlag ${index + 1}</h6>
                        <button class="btn btn-sm btn-outline-primary apply-suggestion">
                            <i class="bi bi-check-lg"></i> Übernehmen
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="suggestion-text">${suggestion.text.replace(/\n/g, '<br>')}</div>
                    </div>
                </div>
            `;
            
            card.querySelector('.apply-suggestion').onclick = () => {
                applySuggestion(suggestion);
            };
            
            suggestionsList.appendChild(card);
        });
        
        elements.suggestionsModal.show();
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

        const uploadArea = event.target.closest('.upload-area');
        const container = uploadArea.closest('.upload-container');
        const preview = container.querySelector('.file-preview');
        const fileName = preview.querySelector('.file-name');
        const fileType = file.type;
        const fileSize = file.size;

        // Validierung
        if (fileType !== 'application/pdf') {
            showError('Bitte laden Sie nur PDF-Dateien hoch');
            event.target.value = '';
            return;
        }

        if (fileSize > 10 * 1024 * 1024) { // 10MB limit
            showError('Die Datei ist zu groß (maximal 10MB)');
            event.target.value = '';
            return;
        }

        try {
            // Lade-Animation anzeigen
            showLoading(preview, 'Verarbeite Datei...');
            
            // Text aus PDF extrahieren
            const text = await extractTextFromPDF(file);
            
            // Speichere extrahierten Text
            if (event.target.id === 'resumeUpload') {
                window.resumeText = text;
                showSuccess('Lebenslauf erfolgreich verarbeitet');
            } else if (event.target.id === 'coverLetterUpload') {
                window.coverLetterText = text;
                showSuccess('Anschreiben erfolgreich verarbeitet');
            }

            // Dateinamen und Größe anzeigen
            fileName.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="bi bi-file-pdf me-2"></i>
                    <div>
                        <div class="fw-bold">${file.name}</div>
                        <small class="text-muted">${formatFileSize(fileSize)}</small>
                    </div>
                </div>
            `;

            // UI aktualisieren
            uploadArea.style.display = 'none';
            preview.classList.remove('d-none');
            preview.style.display = 'block';

            // Aktiviere den Analyse-Button wenn beide Dateien hochgeladen sind
            checkRequiredUploads();

        } catch (error) {
            console.error('Error processing file:', error);
            showError('Fehler beim Verarbeiten der Datei');
            event.target.value = '';
            uploadArea.style.display = 'block';
            preview.style.display = 'none';
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
        
        // Validiere Stellenanzeige
        if (!jobPosting) {
            showError('Bitte fügen Sie eine Stellenanzeige ein');
            return false;
        }
        
        if (jobPosting.length < 50) { // Reduzierte Mindestlänge
            showError('Die Stellenanzeige scheint zu kurz zu sein. Bitte fügen Sie den vollständigen Text ein.');
            return false;
        }
        
        // Validiere Lebenslauf
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
        const fileInputs = document.querySelectorAll('input[type="file"]');
        
        uploadAreas.forEach(area => {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            // Visuelles Feedback während Drag
            ['dragenter', 'dragover'].forEach(eventName => {
                area.addEventListener(eventName, () => {
                    area.classList.add('drag-over');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, () => {
                    area.classList.remove('drag-over');
                });
            });

            // Handle Drop
            area.addEventListener('drop', (e) => {
                const input = area.querySelector('input[type="file"]');
                const dt = e.dataTransfer;
                const files = dt.files;

                if (files.length > 0) {
                    input.files = files;
                    handleFileUpload({ target: input });
                }
            });

            // Click-Handler
            area.addEventListener('click', () => {
                const input = area.querySelector('input[type="file"]');
                input.click();
            });
        });

        // Datei-Input Event-Handler
        fileInputs.forEach(input => {
            input.addEventListener('change', handleFileUpload);
        });
    }

    function handleFileRemove(event) {
        const preview = event.target.closest('.file-preview');
        const container = preview.closest('.upload-container');
        const uploadArea = container.querySelector('.upload-area');
        const input = uploadArea.querySelector('input[type="file"]');
        
        // Animation für das Entfernen
        preview.style.opacity = '0';
        setTimeout(() => {
            // Datei-Input zurücksetzen
            input.value = '';
            
            // Gespeicherten Text löschen
            if (input.id === 'resumeUpload') {
                window.resumeText = null;
            } else if (input.id === 'coverLetterUpload') {
                window.coverLetterText = null;
            }
            
            // UI zurücksetzen
            preview.style.opacity = '1';
            preview.classList.add('d-none');
            uploadArea.classList.remove('d-none');
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

    // ===== Initialisierung =====
    initializeEventListeners();
    initializeTextareaListeners();
    initializeFileUpload();
}); 
