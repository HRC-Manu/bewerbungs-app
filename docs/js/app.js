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
        apiKey: window.OPENAI_API_KEY || '' // API Key aus GitHub wird beim Build injiziert
    };

    function getApiKey() {
        const apiKey = API_SETTINGS.apiKey;
        
        if (!apiKey) {
            throw new Error('API-Schlüssel nicht gefunden. Bitte überprüfen Sie die GitHub Repository-Einstellungen und stellen Sie sicher, dass der API-Key korrekt injiziert wurde.');
        }
        
        return apiKey;
    }

    // ===== Analyse-Funktionen =====
    async function handleAnalyze() {
        try {
            if (!validateInputs()) return;

            showLoading(elements.analyzeBtn, 'Analysiere...');
            
            const jobPosting = elements.jobPosting.value.trim();
            const resumeText = window.resumeText;

            console.log('Starting analysis with job posting length:', jobPosting.length);
            console.log('Resume text available:', !!resumeText);

            // Fortschrittsanzeige aktualisieren
            updateProgressStep(2);

            try {
                // Analyse der Stellenanzeige
                const jobAnalysis = await analyzeJobPosting(jobPosting);
                console.log('Job analysis completed:', jobAnalysis);
                
                // Analyse des Lebenslaufs
                const resumeAnalysis = await analyzeResume(resumeText);

                // Analyse-Ergebnisse anzeigen
                displayAnalysis(jobAnalysis);
                
                // Vorschläge generieren
                const suggestions = await generateSectionSuggestions('all', {
                    job: jobAnalysis,
                    resume: resumeAnalysis
                });
                
                // Vorschläge in die Formularfelder einfügen
                applySuggestions(suggestions);
                
                // Vorschau aktualisieren
                updatePreview();
                
                // Fortschrittsanzeige aktualisieren
                updateProgressStep(3);
                
                showSuccess('Analyse und Vorschläge erfolgreich erstellt!');
            } catch (error) {
                console.error('Analysis error:', error);
                throw new Error(`Analyse fehlgeschlagen: ${error.message}`);
            }
            
        } catch (error) {
            console.error('Handle analyze error:', error);
            showError(error.message || 'Ein unerwarteter Fehler ist aufgetreten');
        } finally {
            hideLoading(elements.analyzeBtn, 'Analysieren und Anschreiben erstellen');
        }
    }

    async function makeApiRequest(endpoint, payload) {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000;
        
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`API Request attempt ${attempt}/${MAX_RETRIES}`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 Sekunden Timeout
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getApiKey()}`
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`API Error (Attempt ${attempt}):`, errorText);
                    
                    if (response.status === 401) {
                        throw new Error('API-Schlüssel ist ungültig oder abgelaufen');
                    }
                    
                    if (response.status === 429 && attempt < MAX_RETRIES) {
                        console.log('Rate limit reached, retrying after delay...');
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
                        continue;
                    }
                    
                    if (response.status === 500 && attempt < MAX_RETRIES) {
                        console.log('Server error, retrying...');
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                        continue;
                    }
                    
                    throw new Error(`API Fehler: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('API Response received successfully');
                return data;
                
            } catch (error) {
                console.error(`API Request error (Attempt ${attempt}):`, error);
                
                if (error.name === 'AbortError') {
                    throw new Error('Die Anfrage wurde wegen Zeitüberschreitung abgebrochen');
                }
                
                if (attempt === MAX_RETRIES) {
                    throw error;
                }
                
                if (error.message.includes('network') || error.message.includes('timeout')) {
                    console.log('Network error, retrying...');
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    continue;
                }
                
                throw error;
            }
        }
    }

    async function analyzeJobPosting(jobPosting) {
        try {
            console.log('Starting job posting analysis with text length:', jobPosting.length);
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getApiKey()}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [{
                        role: "system",
                        content: "Du bist ein Experte für Bewerbungsanalyse. Analysiere die Stellenanzeige und gib die Informationen im folgenden JSON-Format zurück: { jobTitle: { position, level, department }, company: { name, industry, culture }, requirements: { hardSkills: [], softSkills: [] } }"
                    }, {
                        role: "user",
                        content: `Analysiere diese Stellenanzeige und gib die Informationen im spezifizierten JSON-Format zurück:\n\n${jobPosting}`
                    }],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`API Fehler: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response received:', data);

            if (!data.choices?.[0]?.message?.content) {
                console.error('Invalid API response structure:', data);
                throw new Error('Ungültige API-Antwort: Fehlende Daten');
            }

            try {
                // Parse the content as JSON
                const parsedContent = JSON.parse(data.choices[0].message.content);
                console.log('Parsed content:', parsedContent);
                return parsedContent;
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                throw new Error('Fehler bei der Verarbeitung der API-Antwort');
            }
        } catch (error) {
            console.error('Job posting analysis error:', error);
            throw new Error(`Analyse fehlgeschlagen: ${error.message}`);
        }
    }

    async function analyzeResume(resumeText) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getApiKey()}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [{
                        role: "system",
                        content: "Du bist ein Experte für Lebenslaufanalyse. Analysiere den Lebenslauf und gib die Informationen im spezifizierten JSON-Format zurück."
                    }, {
                        role: "user",
                        content: `Analysiere diesen Lebenslauf und gib die Informationen im folgenden JSON-Format zurück:
                        {
                            "personalInfo": {
                                "name": "Name des Bewerbers",
                                "title": "Aktuelle Position",
                                "yearsOfExperience": "Anzahl Jahre"
                            },
                            "skills": {
                                "technical": ["Skill 1", "Skill 2"],
                                "soft": ["Soft Skill 1", "Soft Skill 2"]
                            },
                            "experience": [
                                {
                                    "position": "Position",
                                    "company": "Firma",
                                    "duration": "Zeitraum",
                                    "achievements": ["Achievement 1", "Achievement 2"]
                                }
                            ],
                            "education": [
                                {
                                    "degree": "Abschluss",
                                    "institution": "Institution",
                                    "year": "Jahr"
                                }
                            ]
                        }

                        Lebenslauf zum Analysieren:
                        ${resumeText}`
                    }],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`API Fehler: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response received:', data);

            if (!data.choices?.[0]?.message?.content) {
                console.error('Invalid API response structure:', data);
                throw new Error('Ungültige API-Antwort: Fehlende Daten');
            }

            try {
                // Parse the content as JSON
                const parsedContent = JSON.parse(data.choices[0].message.content);
                console.log('Parsed content:', parsedContent);
                return parsedContent;
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                throw new Error('Fehler beim Parsen der API-Antwort');
            }
        } catch (error) {
            console.error('Resume analysis error:', error);
            throw new Error(`Analyse fehlgeschlagen: ${error.message}`);
        }
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
                    const suggestion = await generateSingleSection(sec, analysisData);
                    allSuggestions.push({
                        section: sec,
                        text: suggestion.text,
                        alternatives: suggestion.alternatives || []
                    });
                }

                return allSuggestions;
            }

            // Für einzelne Abschnitte
            const suggestion = await generateSingleSection(section, analysisData);
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

    async function generateSingleSection(section, analysisData) {
        const { job, resume } = analysisData;
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getApiKey()}`
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
            text: suggestions[0].suggestion,
            alternatives: suggestions.slice(1).map(s => s.suggestion)
        };
    }

    function generatePromptForSection(section, analysisData) {
        const { job, resume } = analysisData;
        
        const basePrompt = `
        Stelle: ${job.jobTitle.position} (${job.jobTitle.level})
        Firma: ${job.company.name}
        Branche: ${job.company.industry}
        Unternehmenskultur: ${job.company.culture}
        
        Bewerber:
        - Name: ${resume.personalInfo.name}
        - Aktuelle Position: ${resume.personalInfo.title}
        - Erfahrung: ${resume.personalInfo.yearsOfExperience} Jahre
        
        Anforderungen:
        - Must-Have: ${job.requirements.hardSkills.join(', ')}
        - Nice-to-Have: ${job.requirements.softSkills.join(', ')}
        
        Bewerber Skills:
        - Expert: ${resume.skills.technical.join(', ')}
        - Advanced: ${resume.skills.technical.join(', ')}
        
        Generiere einen überzeugenden ${section}-Abschnitt für das Anschreiben.
        
        Liefere das Ergebnis als Text ohne JSON-Formatierung.`;

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
            - Max. 3-4 Sätze`,

            main: `${basePrompt}
            Erstelle einen überzeugenden Hauptteil.
            - Verbinde Anforderungen mit konkreten Erfahrungen
            - Strukturiere in 2-3 Absätze
            - Verwende Beispiele aus dem Lebenslauf
            - Zeige Alignment mit Unternehmenskultur
            - Hebe Erfolge und messbare Ergebnisse hervor`,

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

        try {
            // Validierung
            if (file.type !== 'application/pdf') {
                throw new Error('Bitte laden Sie nur PDF-Dateien hoch');
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
            if (event.target.id === 'resumeUpload') {
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
                
                // Analyse-Button Status sofort aktualisieren
                const jobPostingFilled = elements.jobPosting.value.trim().length > 0;
                elements.analyzeBtn.disabled = !jobPostingFilled;
                
                if (!elements.analyzeBtn.disabled) {
                    elements.analyzeBtn.classList.add('btn-primary');
                    elements.analyzeBtn.classList.remove('btn-secondary');
                }
            }
            
        } catch (error) {
            console.error('Error processing file:', error);
            showError(error.message || 'Fehler beim Verarbeiten der Datei');
            event.target.value = '';
            
            // UI zurücksetzen
            uploadArea.style.display = 'block';
            preview.style.display = 'none';
            preview.classList.add('d-none');
            
            // Gespeicherten Text löschen bei Fehler
            if (event.target.id === 'resumeUpload') {
                window.resumeText = null;
            }
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

            // Click-Handler nur für Label, nicht für den gesamten Bereich
            const label = area.querySelector('.upload-label');
            if (label) {
                label.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const input = area.querySelector('input[type="file"]');
                    if (input) {
                        input.click();
                    }
                });
            }
        });

        // Datei-Input Event-Handler
        fileInputs.forEach(input => {
            input.addEventListener('change', handleFileUpload);
            // Verhindere Klick-Propagation
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
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
